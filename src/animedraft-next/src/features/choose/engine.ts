import { CHARACTERS, type Character } from "@/data";
import { pick, shuffle, type Rng, defaultRng } from "@/lib/random";
import { duelWinner } from "@/lib/battle";

export type ChooseMode = "solo" | "duo" | "bracket";

export interface ChooseConfig {
  mode: ChooseMode;
  target: number;
  faceToFace: boolean;
  names: [string, string];
}

export const DEFAULT_CHOOSE_CONFIG: ChooseConfig = {
  mode: "solo",
  target: 7,
  faceToFace: true,
  names: ["Player 1", "Player 2"],
};

export type Pair = [Character, Character];

/** Random matchup between two characters within ~7 rating points (so calls are tough), never repeating the last pair. */
export function makePair(prev?: Pair, rng: Rng = defaultRng): Pair {
  for (let tries = 0; tries < 30; tries++) {
    const a = pick(CHARACTERS, rng);
    const near = CHARACTERS.filter((x) => x !== a && Math.abs(x.rating - a.rating) <= 7 && x.rating !== a.rating);
    const b = pick(near.length ? near : CHARACTERS.filter((x) => x !== a), rng);
    if (prev && (prev.includes(a) || prev.includes(b))) continue;
    return rng() < 0.5 ? [a, b] : [b, a];
  }
  const [a, b] = shuffle(CHARACTERS, rng);
  return [a, b];
}

export const pairWinner = (p: Pair) => duelWinner(p[0], p[1]);

/* ---------------- bracket ---------------- */

export interface Bracket {
  round: Character[];
  next: Character[];
  index: number;
}

export const newBracket = (size = 16, rng: Rng = defaultRng): Bracket => ({
  round: shuffle(CHARACTERS, rng).slice(0, size),
  next: [],
  index: 0,
});

export function bracketPick(b: Bracket, side: 0 | 1): Bracket {
  if (b.round.length < 2) return b;
  const next = [...b.next, b.round[b.index + side]];
  const index = b.index + 2;
  return index >= b.round.length ? { round: next, next: [], index: 0 } : { ...b, next, index };
}

export const roundLabel = (n: number) => ({ 16: "Round of 16", 8: "Quarterfinal", 4: "Semifinal", 2: "The Final" })[n] ?? "Round";

export function bracketProgress(b: Bracket, size = 16): number {
  let played = 0;
  for (let n = size; n > b.round.length; n /= 2) played += n / 2;
  return (played + b.index / 2) / (size - 1);
}
