/**
 * Imposter: pure game engine.
 *
 * Secret types
 * - character: crew all see the same character (e.g. Satoru Gojo).
 * - series:    crew all see the same anime series (e.g. Jujutsu Kaisen).
 *
 * What imposters get (they know they're the imposter unless "undercover"):
 * - similar:    a related character/series (e.g. Gojo → Accelerator), close enough to bluff with.
 * - clue:       a vague clue word (e.g. "Blindfold").
 * - none:       nothing at all.
 * - undercover: they get a similar secret and DON'T know they're the imposter.
 */
import { CHARACTERS, CHARACTER_BY_KEY, SERIES, SERIES_BY_KEY, ACTIVE_SERIES } from "@/data";
import { pick, sample, shuffle, randInt, type Rng, defaultRng } from "@/lib/random";

export type SecretKind = "character" | "series";
export type HintMode = "similar" | "clue" | "none" | "undercover";

export interface ImposterConfig {
  names: string[];
  imposters: number;
  secret: SecretKind;
  hint: HintMode;
  /** Discussion timer in seconds, 0 = off. */
  timer: number;
  /** Limit to these series keys ([] = everything). */
  series: string[];
}

export const DEFAULT_IMPOSTER_CONFIG: ImposterConfig = {
  names: ["Aki", "Ren", "Yuna", "Kai", "Mei"],
  imposters: 1,
  secret: "character",
  hint: "similar",
  timer: 120,
  series: [],
};

export interface Secret {
  kind: SecretKind;
  key: string;
}

/** What one player sees on their card. */
export type PlayerCard =
  | { role: "crew"; secret: Secret }
  | { role: "imposter"; hint: { type: "similar"; secret: Secret } | { type: "clue"; text: string } | null }
  | { role: "undercover"; secret: Secret };

export type ImposterPhase = "reveal" | "discuss" | "vote" | "voted" | "guess" | "end";

export interface ImposterState {
  config: ImposterConfig;
  players: string[];
  imposters: number[];
  secret: Secret;
  /** The decoy secret (similar hint / undercover), if any. */
  decoy: Secret | null;
  clue: string | null;
  phase: ImposterPhase;
  revealIdx: number;
  alive: boolean[];
  round: number;
  starter: number;
  lastOut: number | null;
  guessOptions: string[];
  guessed: string | null;
  winner: "crew" | "imposters" | null;
  how: "caught" | "outnumbered" | "guessed" | null;
}

export const maxImposters = (players: number) => Math.max(1, Math.min(3, Math.floor((players - 1) / 2)));

/** Removes blanks and makes duplicate names unique ("Ash", "Ash 2"). */
export function cleanNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.map((raw, i) => {
    const base = raw.trim() || `P${i + 1}`;
    let n = base;
    let k = 2;
    while (seen.has(n.toLowerCase())) n = `${base} ${k++}`;
    seen.add(n.toLowerCase());
    return n;
  });
}

export function secretName(s: Secret): string {
  return s.kind === "character" ? CHARACTER_BY_KEY[s.key].name : SERIES_BY_KEY[s.key].name;
}

function similarTo(secret: Secret, rng: Rng): Secret {
  if (secret.kind === "character") {
    const c = CHARACTER_BY_KEY[secret.key];
    const opts = c.similar.filter((k) => CHARACTER_BY_KEY[k]);
    const fallback = CHARACTERS.filter((x) => x.series === c.series && x.key !== c.key).map((x) => x.key);
    return { kind: "character", key: pick(opts.length ? opts : fallback, rng) };
  }
  const s = SERIES_BY_KEY[secret.key];
  const opts = s.similar.filter((k) => ACTIVE_SERIES.some((a) => a.key === k));
  return { kind: "series", key: pick(opts.length ? opts : ACTIVE_SERIES.filter((a) => a.key !== s.key).map((a) => a.key), rng) };
}

export function createImposterGame(
  config: ImposterConfig,
  recent: string[] = [],
  rng: Rng = defaultRng,
): ImposterState {
  const players = cleanNames(config.names);
  const n = players.length;
  if (n < 3) throw new Error("Imposter needs at least 3 players");
  const impCount = Math.min(config.imposters, maxImposters(n));

  // choose the secret, avoiding recent ones
  const seriesPool = ACTIVE_SERIES.filter((s) => !config.series.length || config.series.includes(s.key));
  let candidates: Secret[] =
    config.secret === "character"
      ? CHARACTERS.filter((c) => !config.series.length || config.series.includes(c.series)).map((c) => ({ kind: "character" as const, key: c.key }))
      : (seriesPool.length ? seriesPool : ACTIVE_SERIES).map((s) => ({ kind: "series" as const, key: s.key }));
  if (!candidates.length) candidates = CHARACTERS.map((c) => ({ kind: "character" as const, key: c.key }));
  const fresh = candidates.filter((c) => !recent.includes(c.key));
  const secret = pick(fresh.length ? fresh : candidates, rng);

  let decoy: Secret | null = null;
  let clue: string | null = null;
  if (config.hint === "similar" || config.hint === "undercover") decoy = similarTo(secret, rng);
  if (config.hint === "clue")
    clue = pick(secret.kind === "character" ? CHARACTER_BY_KEY[secret.key].clues : SERIES_BY_KEY[secret.key].clues, rng);

  return {
    config: { ...config, imposters: impCount },
    players,
    imposters: sample([...players.keys()], impCount, rng).sort((a, b) => a - b),
    secret,
    decoy,
    clue,
    phase: "reveal",
    revealIdx: 0,
    alive: players.map(() => true),
    round: 1,
    starter: randInt(n, rng),
    lastOut: null,
    guessOptions: [],
    guessed: null,
    winner: null,
    how: null,
  };
}

/* ---------------- selectors ---------------- */

export function cardFor(s: ImposterState, idx: number): PlayerCard {
  if (!s.imposters.includes(idx)) return { role: "crew", secret: s.secret };
  switch (s.config.hint) {
    case "undercover":
      return { role: "undercover", secret: s.decoy! };
    case "similar":
      return { role: "imposter", hint: { type: "similar", secret: s.decoy! } };
    case "clue":
      return { role: "imposter", hint: { type: "clue", text: s.clue! } };
    default:
      return { role: "imposter", hint: null };
  }
}

export const aliveIndexes = (s: ImposterState) => s.alive.flatMap((a, i) => (a ? [i] : []));

/** Clockwise speaking order for this round, starting from the starter (skipping eliminated). */
export function speakingOrder(s: ImposterState): number[] {
  const n = s.players.length;
  const order: number[] = [];
  for (let k = 0; k < n; k++) {
    const i = (s.starter + k) % n;
    if (s.alive[i]) order.push(i);
  }
  return order;
}

export function winCheck(s: ImposterState): "crew" | "imposters" | null {
  const alive = aliveIndexes(s);
  const imps = alive.filter((i) => s.imposters.includes(i)).length;
  if (imps === 0) return "crew";
  if (imps >= alive.length - imps) return "imposters";
  return null;
}

/** Can the eliminated imposter attempt the steal-the-win guess? */
export const canGuess = (s: ImposterState) =>
  s.phase === "voted" && s.lastOut !== null && s.imposters.includes(s.lastOut) && s.config.hint !== "undercover";

/* ---------------- transitions ---------------- */

export function revealNext(s: ImposterState): ImposterState {
  if (s.phase !== "reveal") return s;
  const next = s.revealIdx + 1;
  return next >= s.players.length ? { ...s, phase: "discuss" } : { ...s, revealIdx: next };
}

export const startVote = (s: ImposterState): ImposterState => (s.phase === "discuss" ? { ...s, phase: "vote" } : s);

function nextRound(s: ImposterState, starterFrom: number): ImposterState {
  const n = s.players.length;
  let starter = (starterFrom + 1) % n;
  for (let k = 0; k < n && !s.alive[starter]; k++) starter = (starter + 1) % n;
  return { ...s, phase: "discuss", round: s.round + 1, starter, lastOut: null, guessed: null };
}

export const skipVote = (s: ImposterState): ImposterState => (s.phase === "vote" ? nextRound(s, s.starter) : s);

export function eliminate(s: ImposterState, idx: number): ImposterState {
  if (s.phase !== "vote" || !s.alive[idx]) return s;
  const alive = s.alive.slice();
  alive[idx] = false;
  return { ...s, alive, lastOut: idx, phase: "voted" };
}

function finish(s: ImposterState, winner: "crew" | "imposters", how: ImposterState["how"]): ImposterState {
  return { ...s, phase: "end", winner, how };
}

/** After a vote result: go to the guess, end the game, or start the next round. */
export function afterVote(s: ImposterState, rng: Rng = defaultRng): ImposterState {
  if (s.phase !== "voted") return s;
  if (canGuess(s)) return { ...s, phase: "guess", guessOptions: buildGuessOptions(s, rng) };
  return continueOrEnd(s);
}

function continueOrEnd(s: ImposterState): ImposterState {
  const w = winCheck(s);
  if (w === "crew") return finish(s, "crew", "caught");
  if (w === "imposters") return finish(s, "imposters", "outnumbered");
  return nextRound(s, s.lastOut ?? s.starter);
}

export function buildGuessOptions(s: ImposterState, rng: Rng = defaultRng): string[] {
  const { secret, decoy } = s;
  if (secret.kind === "character") {
    const c = CHARACTER_BY_KEY[secret.key];
    const near = [...c.similar, ...CHARACTERS.filter((x) => x.series === c.series).map((x) => x.key)];
    const pool = [...new Set([decoy?.key, ...shuffle(near, rng)].filter((k): k is string => !!k && k !== c.key))];
    const filler = shuffle(CHARACTERS.map((x) => x.key).filter((k) => k !== c.key && !pool.includes(k)), rng);
    return shuffle([c.key, ...[...pool.slice(0, 4), ...filler].slice(0, 5)], rng);
  }
  const sr = SERIES_BY_KEY[secret.key];
  const near = [...new Set([decoy?.key, ...sr.similar].filter((k): k is string => !!k && k !== sr.key))];
  const filler = shuffle(ACTIVE_SERIES.map((x) => x.key).filter((k) => k !== sr.key && !near.includes(k)), rng);
  return shuffle([sr.key, ...[...near, ...filler].slice(0, 5)], rng);
}

export function guess(s: ImposterState, key: string): ImposterState {
  if (s.phase !== "guess") return s;
  const next = { ...s, guessed: key };
  if (key === s.secret.key) return finish(next, "imposters", "guessed");
  return continueOrEnd(next);
}

/** Session points: crew winners +1 each, imposter winners +2 each. */
export function pointsFor(s: ImposterState): Record<string, number> {
  const out: Record<string, number> = {};
  s.players.forEach((name, i) => {
    const imp = s.imposters.includes(i);
    out[name] = s.winner === "crew" && !imp ? 1 : s.winner === "imposters" && imp ? 2 : 0;
  });
  return out;
}

export { SERIES };
