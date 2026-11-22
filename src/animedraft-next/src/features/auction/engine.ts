/**
 * Auction Draft Duel: pure game engine (no React).
 *
 * Rules
 * - Two players, each with a budget (default $25) and a team of 5 to fill.
 * - Characters come up one at a time. Highest bid wins and pays that amount.
 * - Bids can come from the players themselves or from a host (the UI decides who may press what).
 * - Host entry: the host reads each character out loud, players shout their bids, and the host
 *   assigns the character to the highest bidder by typing the winning amount (no timer).
 * - Each player has ONE skip (veto): the current character is removed for good and nobody gets it.
 *   It can be used during bidding, by the chooser in the keep/pass phase, or by a player refusing
 *   a character passed to them.
 * - When a player can no longer bid (out of money) the auction stops. The other player becomes the
 *   chooser: for every character they decide to KEEP it or PASS it to the broke player.
 * - The draft ends when both teams are full.
 */
import { CHARACTERS, filterPool, type PoolFilter } from "@/data";
import { shuffle, type Rng, defaultRng } from "@/lib/random";

export type PlayerId = 0 | 1;
export type BidControl = "players" | "host" | "both" | "entry";

export interface AuctionConfig {
  names: [string, string];
  budget: number;
  teamSize: number;
  /** Seconds of silence before the hammer falls. 0 = manual "Sold!" button only. */
  timer: number;
  control: BidControl;
  pool: PoolFilter;
  /** Rotate player 2's panel so two people can sit across the phone. */
  faceToFace: boolean;
}

export const DEFAULT_CONFIG: AuctionConfig = {
  names: ["Player 1", "Player 2"],
  budget: 25,
  teamSize: 5,
  timer: 8,
  control: "both",
  pool: "all",
  faceToFace: true,
};

export interface Owned {
  key: string;
  price: number;
  via: "won" | "kept" | "passed";
}

export interface Bidder {
  name: string;
  budget: number;
  team: Owned[];
  skipUsed: boolean;
}

export interface Bid {
  player: PlayerId;
  amount: number;
}

export interface Lot {
  key: string;
  bid: number;
  leader: PlayerId | null;
  history: Bid[];
  /** Bumped on every change so timers can reset. */
  rev: number;
}

export type Phase = "auction" | "choose" | "done";

export interface Outcome {
  id: number;
  kind: "sold" | "unsold" | "vetoed" | "kept" | "passed";
  key: string;
  player?: PlayerId;
  price?: number;
}

export interface AuctionState {
  /** When the draft started (ms); doubles as the draft's id in saved records. */
  startedAt: number;
  config: AuctionConfig;
  players: [Bidder, Bidder];
  deck: string[];
  /** Unsold characters: may return if the deck runs dry. */
  unsold: string[];
  lot: Lot | null;
  lotNo: number;
  phase: Phase;
  /** Choose phase: who decides keep / pass. */
  chooser: PlayerId | null;
  /** Choose phase: chooser deciding, or the receiver accepting a passed character. */
  pending: "decide" | "incoming";
  last: Outcome | null;
  log: Outcome[];
}

export type AuctionAction =
  | { type: "bid"; player: PlayerId; amount: number }
  | { type: "raise"; player: PlayerId; by: number }
  | { type: "allIn"; player: PlayerId }
  | { type: "undo" }
  | { type: "hammer" }
  /** Host entry: give the current character to `player` for `amount`. */
  | { type: "assign"; player: PlayerId; amount: number }
  | { type: "skip"; player: PlayerId }
  | { type: "keep" }
  | { type: "pass" }
  | { type: "accept" }
  | { type: "restart"; config: AuctionConfig; rng?: Rng };

/* ---------------- selectors ---------------- */

export const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);
export const hasRoom = (s: AuctionState, p: PlayerId) => s.players[p].team.length < s.config.teamSize;
export const canAfford = (s: AuctionState, p: PlayerId) => s.players[p].budget > 0;
export const isBidder = (s: AuctionState, p: PlayerId) => hasRoom(s, p) && canAfford(s, p);

export function bidError(s: AuctionState, p: PlayerId, amount: number): string | null {
  if (s.phase !== "auction" || !s.lot) return "Bidding is closed";
  if (!hasRoom(s, p)) return "Team is full";
  if (!Number.isInteger(amount) || amount < 1) return "Invalid amount";
  if (s.lot.leader === p) return "Already leading";
  if (amount <= s.lot.bid) return `Bid more than $${s.lot.bid}`;
  if (amount > s.players[p].budget) return "Not enough money";
  return null;
}
export const canBid = (s: AuctionState, p: PlayerId, amount: number) => bidError(s, p, amount) === null;

/** Why the host can't assign the current lot to `p` for `amount` (null = allowed). */
export function assignError(s: AuctionState, p: PlayerId, amount: number): string | null {
  if (s.phase !== "auction" || !s.lot) return "Bidding is closed";
  if (!hasRoom(s, p)) return `${s.players[p].name}'s team is full`;
  if (!Number.isInteger(amount) || amount < 1) return "Enter a winning bid of at least $1";
  if (amount > s.players[p].budget) return `${s.players[p].name} only has $${s.players[p].budget}`;
  return null;
}

export function canSkip(s: AuctionState, p: PlayerId): boolean {
  if (s.players[p].skipUsed || !s.lot) return false;
  if (s.phase === "auction") return true;
  if (s.phase === "choose") return s.pending === "decide" ? p === s.chooser : p === other(s.chooser!);
  return false;
}

export function choiceOptions(s: AuctionState) {
  if (s.phase !== "choose" || s.chooser === null) return null;
  const chooser = s.chooser;
  const receiver = other(chooser);
  return {
    chooser,
    receiver,
    canKeep: s.pending === "decide" && hasRoom(s, chooser),
    canPass: s.pending === "decide" && hasRoom(s, receiver),
  };
}

/* ---------------- setup ---------------- */

export function createAuction(config: AuctionConfig, rng: Rng = defaultRng): AuctionState {
  let pool = filterPool(config.pool).map((c) => c.key);
  // Need enough characters for both teams plus vetoes and unsold lots.
  if (pool.length < config.teamSize * 2 + 6) pool = CHARACTERS.map((c) => c.key);
  const player = (name: string): Bidder => ({ name, budget: config.budget, team: [], skipUsed: false });
  const base: AuctionState = {
    startedAt: Date.now(),
    config,
    players: [player(config.names[0] || "Player 1"), player(config.names[1] || "Player 2")],
    deck: shuffle(pool, rng),
    unsold: [],
    lot: null,
    lotNo: 0,
    phase: "auction",
    chooser: null,
    pending: "decide",
    last: null,
    log: [],
  };
  return advance(base, rng);
}

/* ---------------- internals ---------------- */

let outcomeSeq = 0;
function record(s: AuctionState, o: Omit<Outcome, "id">): AuctionState {
  const out = { ...o, id: ++outcomeSeq };
  return { ...s, last: out, log: [...s.log, out] };
}

function givePlayer(s: AuctionState, p: PlayerId, owned: Owned): AuctionState {
  const players = [...s.players] as [Bidder, Bidder];
  players[p] = {
    ...players[p],
    budget: players[p].budget - owned.price,
    team: [...players[p].team, owned],
  };
  return { ...s, players };
}

function useSkip(s: AuctionState, p: PlayerId): AuctionState {
  const players = [...s.players] as [Bidder, Bidder];
  players[p] = { ...players[p], skipUsed: true };
  return { ...s, players };
}

/** Works out the phase after something changed and puts the next character up. */
function advance(s: AuctionState, rng: Rng = defaultRng): AuctionState {
  const full0 = !hasRoom(s, 0);
  const full1 = !hasRoom(s, 1);
  if (full0 && full1) return { ...s, phase: "done", lot: null, chooser: null };

  let phase: Phase;
  let chooser: PlayerId | null = null;
  const b0 = isBidder(s, 0);
  const b1 = isBidder(s, 1);
  if (b0 && b1) phase = "auction";
  else {
    phase = "choose";
    if (b0 !== b1) chooser = b0 ? 0 : 1;
    else {
      const [m0, m1] = [s.players[0].budget, s.players[1].budget];
      chooser = m0 !== m1 ? (m0 > m1 ? 0 : 1) : ((s.lotNo % 2) as PlayerId);
    }
  }

  let deck = s.deck;
  let unsold = s.unsold;
  if (!deck.length) {
    deck = shuffle(unsold, rng);
    unsold = [];
  }
  if (!deck.length) return { ...s, phase: "done", lot: null, chooser: null };

  const [key, ...rest] = deck;
  return {
    ...s,
    phase,
    chooser,
    pending: "decide",
    deck: rest,
    unsold,
    lotNo: s.lotNo + 1,
    lot: { key, bid: 0, leader: null, history: [], rev: (s.lot?.rev ?? 0) + 1 },
  };
}

/* ---------------- reducer ---------------- */

export function auctionReducer(s: AuctionState, a: AuctionAction): AuctionState {
  switch (a.type) {
    case "restart":
      return createAuction(a.config, a.rng);

    case "raise":
      return s.lot ? auctionReducer(s, { type: "bid", player: a.player, amount: s.lot.bid + a.by }) : s;

    case "allIn":
      return auctionReducer(s, { type: "bid", player: a.player, amount: s.players[a.player].budget });

    case "bid": {
      if (!canBid(s, a.player, a.amount) || !s.lot) return s;
      const lot = s.lot;
      return {
        ...s,
        lot: {
          ...lot,
          bid: a.amount,
          leader: a.player,
          history: [...lot.history, { player: a.player, amount: a.amount }],
          rev: lot.rev + 1,
        },
      };
    }

    case "undo": {
      if (s.phase !== "auction" || !s.lot || !s.lot.history.length) return s;
      const history = s.lot.history.slice(0, -1);
      const prev = history[history.length - 1];
      return {
        ...s,
        lot: { ...s.lot, history, bid: prev?.amount ?? 0, leader: prev?.player ?? null, rev: s.lot.rev + 1 },
      };
    }

    case "hammer": {
      if (s.phase !== "auction" || !s.lot) return s;
      const { key, leader, bid } = s.lot;
      if (leader === null) {
        const next = record({ ...s, unsold: [...s.unsold, key] }, { kind: "unsold", key });
        return advance(next);
      }
      const next = givePlayer(s, leader, { key, price: bid, via: "won" });
      return advance(record(next, { kind: "sold", key, player: leader, price: bid }));
    }

    case "assign": {
      if (assignError(s, a.player, a.amount) || !s.lot) return s;
      const sold: AuctionState = {
        ...s,
        lot: {
          ...s.lot,
          bid: a.amount,
          leader: a.player,
          history: [...s.lot.history, { player: a.player, amount: a.amount }],
          rev: s.lot.rev + 1,
        },
      };
      return auctionReducer(sold, { type: "hammer" });
    }

    case "skip": {
      if (!canSkip(s, a.player) || !s.lot) return s;
      const next = useSkip(s, a.player);
      return advance(record(next, { kind: "vetoed", key: s.lot.key, player: a.player }));
    }

    case "keep": {
      const opt = choiceOptions(s);
      if (!opt?.canKeep || !s.lot) return s;
      const next = givePlayer(s, opt.chooser, { key: s.lot.key, price: 0, via: "kept" });
      return advance(record(next, { kind: "kept", key: s.lot.key, player: opt.chooser, price: 0 }));
    }

    case "pass": {
      const opt = choiceOptions(s);
      if (!opt?.canPass) return s;
      return { ...s, pending: "incoming" };
    }

    case "accept": {
      if (s.phase !== "choose" || s.pending !== "incoming" || !s.lot || s.chooser === null) return s;
      const receiver = other(s.chooser);
      const next = givePlayer(s, receiver, { key: s.lot.key, price: 0, via: "passed" });
      return advance(record(next, { kind: "passed", key: s.lot.key, player: receiver, price: 0 }));
    }
  }
}
