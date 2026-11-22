import { describe, expect, it } from "vitest";
import {
  auctionReducer as R,
  createAuction,
  DEFAULT_CONFIG,
  canSkip,
  choiceOptions,
  type AuctionState,
  type PlayerId,
} from "@/features/auction/engine";
import { seeded } from "@/lib/random";

const start = (seed = 1, over: Partial<typeof DEFAULT_CONFIG> = {}) =>
  createAuction({ ...DEFAULT_CONFIG, ...over }, seeded(seed));
const bid = (s: AuctionState, player: PlayerId, amount: number) => R(s, { type: "bid", player, amount });

describe("auction bidding", () => {
  it("starts with $25 each, empty teams, one lot up", () => {
    const s = start();
    expect(s.phase).toBe("auction");
    expect(s.players.map((p) => p.budget)).toEqual([25, 25]);
    expect(s.lot?.bid).toBe(0);
  });

  it("highest bid wins and pays", () => {
    let s = start();
    const key = s.lot!.key;
    s = bid(s, 0, 3);
    s = bid(s, 1, 5);
    s = R(s, { type: "raise", player: 0, by: 2 }); // 7
    s = R(s, { type: "hammer" });
    expect(s.players[0].team).toEqual([{ key, price: 7, via: "won" }]);
    expect(s.players[0].budget).toBe(18);
    expect(s.players[1].budget).toBe(25);
    expect(s.last?.kind).toBe("sold");
    expect(s.lot?.key).not.toBe(key);
  });

  it("rejects bids that are too low, over budget, or against yourself", () => {
    let s = bid(start(), 0, 5);
    expect(bid(s, 1, 5)).toBe(s);
    expect(bid(s, 1, 26)).toBe(s);
    expect(bid(s, 0, 6)).toBe(s);
    s = bid(s, 1, 25);
    expect(s.lot?.leader).toBe(1);
  });

  it("host undo restores the previous bid", () => {
    let s = bid(bid(start(), 0, 2), 1, 4);
    s = R(s, { type: "undo" });
    expect(s.lot).toMatchObject({ bid: 2, leader: 0 });
    s = R(s, { type: "undo" });
    expect(s.lot).toMatchObject({ bid: 0, leader: null });
  });

  it("no bids → unsold, character can return later", () => {
    let s = start();
    const key = s.lot!.key;
    s = R(s, { type: "hammer" });
    expect(s.last?.kind).toBe("unsold");
    expect(s.unsold).toContain(key);
  });
});

describe("skip (veto)", () => {
  it("removes the character and can only be used once", () => {
    let s = start();
    const key = s.lot!.key;
    s = R(s, { type: "skip", player: 1 });
    expect(s.players[1].skipUsed).toBe(true);
    expect(s.last).toMatchObject({ kind: "vetoed", key, player: 1 });
    expect(s.unsold).not.toContain(key);
    const before = s;
    expect(R(s, { type: "skip", player: 1 })).toBe(before);
  });
});

describe("running out of money → keep / pass", () => {
  it("broke player stops bidding; rich player keeps or passes", () => {
    let s = start(7);
    s = R(bid(s, 0, 25), { type: "hammer" }); // P1 all-in on first lot
    expect(s.players[0].budget).toBe(0);
    expect(s.phase).toBe("choose");
    expect(s.chooser).toBe(1);

    const opt = choiceOptions(s)!;
    expect(opt).toMatchObject({ chooser: 1, receiver: 0, canKeep: true, canPass: true });

    const k1 = s.lot!.key;
    s = R(s, { type: "keep" });
    expect(s.players[1].team.at(-1)).toEqual({ key: k1, price: 0, via: "kept" });

    const k2 = s.lot!.key;
    s = R(s, { type: "pass" });
    expect(s.pending).toBe("incoming");
    expect(canSkip(s, 1)).toBe(false); // chooser can't veto a pass in flight
    expect(canSkip(s, 0)).toBe(true); // receiver can refuse it
    s = R(s, { type: "accept" });
    expect(s.players[0].team.at(-1)).toEqual({ key: k2, price: 0, via: "passed" });
  });

  it("receiver can veto a passed character with their skip", () => {
    let s = R(bid(start(3), 0, 25), { type: "hammer" });
    const k = s.lot!.key;
    s = R(R(s, { type: "pass" }), { type: "skip", player: 0 });
    expect(s.last).toMatchObject({ kind: "vetoed", key: k, player: 0 });
    expect(s.players[0].team).toHaveLength(1);
    expect(s.pending).toBe("decide");
  });

  it("if only one player can still bid, they keep (opponent full)", () => {
    let s = start(5);
    for (let i = 0; i < 5; i++) s = R(bid(s, 1, 1), { type: "hammer" }); // P2 fills team for $5
    expect(s.players[1].team).toHaveLength(5);
    // P2 is full, P1 still has money: P1 is the only bidder → choose phase, P1 keeps everything
    expect(s.phase).toBe("choose");
    expect(s.chooser).toBe(0);
    expect(choiceOptions(s)).toMatchObject({ canKeep: true, canPass: false });
  });
});

describe("full drafts", () => {
  it("random games always finish with two full teams and no duplicates", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = seeded(seed);
      let s = start(seed, { budget: [15, 25, 50][seed % 3] });
      let guard = 0;
      while (s.phase !== "done" && guard++ < 500) {
        const r = rng();
        if (s.phase === "auction") {
          const p = (r < 0.5 ? 0 : 1) as PlayerId;
          if (r < 0.04 && canSkip(s, p)) s = R(s, { type: "skip", player: p });
          else if (r < 0.6) s = R(s, { type: "raise", player: p, by: 1 + Math.floor(rng() * 5) });
          else if (r < 0.65) s = R(s, { type: "allIn", player: p });
          else s = R(s, { type: "hammer" });
        } else {
          const o = choiceOptions(s)!;
          if (s.pending === "incoming") {
            s = r < 0.1 && canSkip(s, o.receiver) ? R(s, { type: "skip", player: o.receiver }) : R(s, { type: "accept" });
          } else if (r < 0.05 && canSkip(s, o.chooser)) s = R(s, { type: "skip", player: o.chooser });
          else if (o.canKeep && (r < 0.5 || !o.canPass)) s = R(s, { type: "keep" });
          else s = R(s, { type: "pass" });
        }
      }
      expect(s.phase, `seed ${seed}`).toBe("done");
      const keys = s.players.flatMap((p) => p.team.map((o) => o.key));
      expect(keys).toHaveLength(10);
      expect(new Set(keys).size).toBe(10);
      for (const p of s.players) {
        expect(p.budget).toBeGreaterThanOrEqual(0);
        expect(p.budget + p.team.reduce((t, o) => t + o.price, 0)).toBe(s.config.budget);
      }
    }
  });
});
