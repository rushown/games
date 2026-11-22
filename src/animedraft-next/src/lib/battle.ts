import type { Character, StatKey } from "@/data/types";
import { BEYOND_LEVEL, HAX, INTELLECT, SPEEDS, WEIGHT, levelName } from "@/data/scaling";

export const STAT_KEYS: StatKey[] = ["pow", "spd", "iq", "dur", "sup"];
export const STAT_LABEL: Record<StatKey, string> = { pow: "POW", spd: "SPD", iq: "IQ", dur: "DUR", sup: "SUP" };
export const STAT_WORD: Record<StatKey, string> = {
  pow: "raw power",
  spd: "speed",
  iq: "intellect",
  dur: "durability",
  sup: "support",
};

/**
 * 1v1, fully deterministic (no dice, no hand-typed stats): decided by each fighter's power-scaling profile.
 * 1. An Outerversal (BEYOND) fighter always beats anyone below that level.
 * 2. Otherwise the combat rating decides (attack level weighs most, then hax, durability, speed, intellect).
 * 3. Exact ties: higher attack level, then speed, then intellect, then the first fighter.
 */
export function duelWinner(a: Character, b: Character): 0 | 1 {
  const ba = a.scaling.ap >= BEYOND_LEVEL;
  const bb = b.scaling.ap >= BEYOND_LEVEL;
  if (ba !== bb) return ba ? 0 : 1;
  if (a.rating !== b.rating) return a.rating > b.rating ? 0 : 1;
  for (const k of ["ap", "spd", "iq"] as const) if (a.scaling[k] !== b.scaling[k]) return a.scaling[k] > b.scaling[k] ? 0 : 1;
  return 0;
}

type Factor = "ap" | "dur" | "spd" | "iq" | "hax";
const FACTORS: Factor[] = ["ap", "hax", "dur", "spd", "iq"];
const FACTOR_WORD: Record<Factor, string> = { ap: "attack power", dur: "durability", spd: "speed", iq: "intellect", hax: "hax" };

/** Weighted advantage of `w` over `l` per factor. */
function edges(w: Character, l: Character) {
  return FACTORS.map((f) => ({ f, d: (w.scaling[f] - l.scaling[f]) * WEIGHT[f] }));
}

/** Plain-words explanation of why the winner wins. */
export function duelReason(winner: Character, loser: Character): string {
  const W = winner.name;
  const L = loser.name;
  const w = winner.scaling;
  const l = loser.scaling;
  if (w.ap >= BEYOND_LEVEL && l.ap < BEYOND_LEVEL)
    return `${W} is ${levelName(w.ap)}: beyond every scale ${L} can even reach. ${L}'s ${levelName(l.ap)} power doesn't register.`;

  const all = edges(winner, loser);
  const best = all.reduce((a, b) => (b.d > a.d ? b : a));
  let why: string;
  switch (best.d > 0 ? best.f : "none") {
    case "ap":
      why = `${W} hits at ${levelName(w.ap)}, ${L} only at ${levelName(l.ap)}.`;
      break;
    case "hax":
      why = `${W}'s ${HAX[w.hax].toLowerCase()} abilities skip past ${L}'s raw power.`;
      break;
    case "dur":
      why = `${W} can tank ${levelName(w.dur)} attacks; ${L}'s ${levelName(l.ap)} offence can't break through.`;
      break;
    case "spd":
      why = `${W} is ${SPEEDS[w.spd]} against ${L}'s ${SPEEDS[l.spd]}: ${L} never lands a clean hit.`;
      break;
    case "iq":
      why = `${W} (${INTELLECT[w.iq]}) out-thinks ${L} (${INTELLECT[l.iq]}).`;
      break;
    default:
      why = `Dead even on paper; ${W} edges it on attack level and speed.`;
  }
  const counter = all.filter((e) => e.d < 0).sort((a, b) => a.d - b.d)[0];
  return counter ? `${why} ${L} has the better ${FACTOR_WORD[counter.f]}, but it isn't enough.` : why;
}

/* ---------------- Team battles (auction draft) ---------------- */

export interface TeamScore {
  /** Sum of each stat across the team. */
  stats: Record<StatKey, number>;
  /** Average battle rating. */
  avgRating: number;
  /** +3 per pair of teammates from the same series. */
  synergy: number;
  total: number;
}

export function scoreTeam(team: Character[]): TeamScore {
  const stats = { pow: 0, spd: 0, iq: 0, dur: 0, sup: 0 } as Record<StatKey, number>;
  for (const c of team) for (const k of STAT_KEYS) stats[k] += c.stats[k];
  let synergy = 0;
  for (let i = 0; i < team.length; i++)
    for (let j = i + 1; j < team.length; j++) if (team[i].series === team[j].series) synergy += 3;
  const ratingSum = team.reduce((s, c) => s + c.rating, 0);
  return {
    stats,
    avgRating: team.length ? Math.round((ratingSum / team.length) * 10) / 10 : 0,
    synergy,
    total: Math.round((ratingSum + synergy) * 10) / 10,
  };
}

export interface Bout {
  a: Character;
  b: Character;
  winner: 0 | 1;
  reason: string;
}

export interface TeamBattle {
  scores: [TeamScore, TeamScore];
  /** Team stat totals (shown for comparison; bouts decide the result). */
  categories: { stat: StatKey; a: number; b: number; winner: 0 | 1 | null }[];
  /** Strongest vs strongest, second vs second… each decided by duelWinner. */
  bouts: Bout[];
  boutWins: [number, number];
  winner: 0 | 1 | null;
  decidedBy: "bouts" | "total" | "draw";
}

const byStrength = (x: Character, y: Character) => (duelWinner(x, y) === 0 ? -1 : 1);

/**
 * Team vs team, decided by real 1v1 fights (no dice): each squad is lined up strongest first and
 * fighter i meets fighter i. Most bouts won takes the draft; level bouts go to total power
 * (combat ratings + a +3 synergy bonus per same-series pair).
 */
export function teamBattle(a: Character[], b: Character[]): TeamBattle {
  const scores: [TeamScore, TeamScore] = [scoreTeam(a), scoreTeam(b)];
  const categories = STAT_KEYS.map((stat) => {
    const va = scores[0].stats[stat];
    const vb = scores[1].stats[stat];
    return { stat, a: va, b: vb, winner: (va === vb ? null : va > vb ? 0 : 1) as 0 | 1 | null };
  });
  const la = [...a].sort(byStrength);
  const lb = [...b].sort(byStrength);
  const bouts: Bout[] = [];
  const boutWins: [number, number] = [0, 0];
  for (let i = 0; i < Math.min(la.length, lb.length); i++) {
    const winner = duelWinner(la[i], lb[i]);
    const [w, l] = winner === 0 ? [la[i], lb[i]] : [lb[i], la[i]];
    boutWins[winner]++;
    bouts.push({ a: la[i], b: lb[i], winner, reason: duelReason(w, l) });
  }
  const base = { scores, categories, bouts, boutWins };
  if (boutWins[0] !== boutWins[1]) return { ...base, winner: boutWins[0] > boutWins[1] ? 0 : 1, decidedBy: "bouts" };
  if (scores[0].total !== scores[1].total) return { ...base, winner: scores[0].total > scores[1].total ? 0 : 1, decidedBy: "total" };
  return { ...base, winner: null, decidedBy: "draw" };
}
