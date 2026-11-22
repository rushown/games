/**
 * Power score + exact rarity.
 *
 * Score = race tier + 3×strength + 2×durability + 2×speed + intelligence + weapon + Σ(power tiers)
 * (tiers run 0–11; a power rolled twice counts twice: that's the "awakened" bonus).
 *
 * The race changes the odds of every later wheel (fortune), and the power count decides how many
 * power spins happen. So the exact distribution of the score is a mixture over races:
 *
 *   P(score) = Σ_race P(race) · [ race ⊗ str ⊗ dur ⊗ spd ⊗ int ⊗ weapon ⊗ Σ_k P(k | race) · power^{⊗k} ]
 *
 * where ⊗ is convolution and every wheel after the race uses that race's tilted odds.
 * "Top X%" = P(a random character scores at least as much as yours).
 */
import { WHEEL_BY_ID, fortuneOf, tiltedWheel } from "@/data/wheels";
import type { CompleteRoll, SingleWheelId, Wheel } from "@/data/types";

export const WEIGHTS: Partial<Record<SingleWheelId, number>> = {
  race: 1,
  strength: 3,
  durability: 2,
  speed: 2,
  intelligence: 1,
  weapon: 1,
};
const POWER_WEIGHT = 1;
const MAX_POWER_COUNT = 6;
export const MAX_SCORE = 11 * (Object.values(WEIGHTS).reduce((a, b) => a + b!, 0)! + POWER_WEIGHT * MAX_POWER_COUNT);

export function scoreOf(r: CompleteRoll): number {
  let s = 0;
  for (const [id, w] of Object.entries(WEIGHTS) as [SingleWheelId, number][]) {
    const seg = WHEEL_BY_ID[id].segments.find((x) => x.id === r[id]);
    s += (seg?.tier ?? 0) * w;
  }
  for (const p of r.powers) s += (WHEEL_BY_ID.power.segments.find((x) => x.id === p)?.tier ?? 0) * POWER_WEIGHT;
  return s;
}

/* ---------------- exact distribution ---------------- */

type Dist = number[];

function conv(a: Dist, b: Dist): Dist {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) if (a[i]) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}

function wheelDist(w: Wheel, weight: number): Dist {
  const total = w.segments.reduce((t, x) => t + x.weight, 0);
  const d = new Array(11 * weight + 1).fill(0);
  for (const s of w.segments) d[s.tier * weight] += s.weight / total;
  return d;
}

function addInto(acc: Dist, d: Dist, p: number) {
  while (acc.length < d.length) acc.push(0);
  d.forEach((v, i) => (acc[i] += v * p));
}

function computeDistribution(): Dist {
  const races = WHEEL_BY_ID.race.segments;
  const raceTotal = races.reduce((t, x) => t + x.weight, 0);
  const total: Dist = [0];
  for (const race of races) {
    const f = fortuneOf(race.id);
    const tilt = (id: SingleWheelId | "power") => tiltedWheel(WHEEL_BY_ID[id], f);
    const raceD: Dist = new Array(race.tier * WEIGHTS.race! + 1).fill(0);
    raceD[race.tier * WEIGHTS.race!] = 1;
    let d = raceD;
    for (const id of ["strength", "durability", "speed", "intelligence", "weapon"] as SingleWheelId[]) d = conv(d, wheelDist(tilt(id), WEIGHTS[id]!));

    // powers: mixture over how many power spins happen
    const pw = wheelDist(tilt("power"), POWER_WEIGHT);
    const counts = tilt("powerCount").segments;
    const countTotal = counts.reduce((t, x) => t + x.weight, 0);
    const powersD: Dist = [0];
    let kFold: Dist = [1];
    for (let k = 1; k <= MAX_POWER_COUNT; k++) {
      kFold = conv(kFold, pw);
      const seg = counts.find((x) => Number(x.id) === k)!;
      addInto(powersD, kFold, seg.weight / countTotal);
    }
    addInto(total, conv(d, powersD), race.weight / raceTotal);
  }
  return total;
}

// computed lazily on first use (keeps page start-up instant), then cached
let dist: Dist | null = null;
let tail: number[] | null = null;
export function distribution(): Dist {
  return (dist ??= computeDistribution());
}
function tailTable(): number[] {
  if (tail) return tail;
  const d = distribution();
  const t = new Array(d.length + 1).fill(0);
  for (let s = d.length - 1; s >= 0; s--) t[s] = t[s + 1] + d[s];
  return (tail = t);
}

/** Probability that a random character scores at least `score`. */
export function rarityOf(score: number): number {
  const t = tailTable();
  const p = t[Math.max(0, Math.min(score, t.length - 1))];
  return Math.min(1, Math.max(p, Number.MIN_VALUE));
}

/** 0–100 power rating. */
export const powerRating = (score: number) => Math.round((score / MAX_SCORE) * 1000) / 10;

export interface Rank {
  title: string;
  /** 0 (lowest) … 8 (highest). */
  level: number;
}

const RANKS: [maxShare: number, title: string][] = [
  [1e-9, "Boundless One"],
  [1e-6, "Transcendent"],
  [1e-4, "Divine"],
  [1e-3, "Demigod"],
  [0.01, "Mythic"],
  [0.05, "Legend"],
  [0.2, "Hero"],
  [0.5, "Awakened"],
  [1.01, "Mortal"],
];

export function rankOf(share: number): Rank {
  const i = RANKS.findIndex(([max]) => share <= max);
  return { title: RANKS[i][1], level: RANKS.length - 1 - i };
}

/* ---------------- formatting ---------------- */

export function formatTopPercent(share: number): string {
  const pct = share * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1).replace(/\.0$/, "")}%`;
  const decimals = Math.min(20, Math.ceil(-Math.log10(pct)) + 1);
  return `${pct.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

const BIG = [
  [1e24, "septillion"],
  [1e21, "sextillion"],
  [1e18, "quintillion"],
  [1e15, "quadrillion"],
  [1e12, "trillion"],
  [1e9, "billion"],
  [1e6, "million"],
] as const;

export function formatOneIn(share: number): string {
  const n = 1 / share;
  if (share >= 0.5) return `${Math.round(share * 100)} in 100`;
  if (!isFinite(n) || n > 1e27) return "1 in ∞";
  if (n < 10) return `1 in ${n.toFixed(1).replace(/\.0$/, "")}`;
  for (const [v, word] of BIG) if (n >= v) return `1 in ${(n / v).toFixed(n / v >= 100 ? 0 : 1).replace(/\.0$/, "")} ${word}`;
  return `1 in ${Math.round(n).toLocaleString("en-US")}`;
}
