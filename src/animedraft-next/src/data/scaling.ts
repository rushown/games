/**
 * Power scaling: the single source of truth for how strong a character is.
 *
 * Every character gets a profile built from fan power-scaling conventions (attack potency,
 * durability, speed, intellect and "hax", i.e. abilities that skip raw power), backed by a key feat.
 * Display stats (0–100), the battle rating and the tier are all DERIVED from this profile,
 * so nothing is hand-tuned and every fight result can be explained in plain words.
 */

/** Attack potency / durability ladder. Index = level. */
export const LEVELS = [
  "Street",
  "Wall",
  "Building",
  "City Block",
  "Town",
  "City",
  "Mountain",
  "Island",
  "Country",
  "Continent",
  "Planet",
  "Star",
  "Solar System",
  "Galaxy",
  "Universe",
  "Multiverse",
  "Outerverse",
  "Boundless",
] as const;
export const MAX_LEVEL = LEVELS.length - 1; // 17
/** Outerversal and up: beyond every rating scale. */
export const BEYOND_LEVEL = 16;

export const SPEEDS = [
  "Peak Human",
  "Superhuman",
  "Subsonic",
  "Supersonic",
  "Hypersonic",
  "Massively Hypersonic",
  "Relativistic",
  "Lightspeed",
  "FTL",
  "Massively FTL",
  "Infinite",
  "Immeasurable",
  "Irrelevant",
] as const;
export const MAX_SPEED = SPEEDS.length - 1; // 12

export const INTELLECT = ["Simple", "Average", "Sharp", "Gifted", "Genius", "Supergenius", "Nigh-Omniscient", "Omniscient"] as const;
export const MAX_IQ = INTELLECT.length - 1; // 7

/** Abilities that can bypass raw power (time stop, erasure, reality warping…). */
export const HAX = ["None", "Minor", "Notable", "Dangerous", "Reality-Bending", "Absolute"] as const;
export const MAX_HAX = HAX.length - 1; // 5

/** [attack level, durability level, speed, intellect, hax, key feat] */
export type Profile = [ap: number, dur: number, spd: number, iq: number, hax: number, feat: string];

export interface Scaling {
  ap: number;
  dur: number;
  spd: number;
  iq: number;
  hax: number;
  feat: string;
}

/** How much each part of the profile is worth in a fight. Attack level dominates, as in real power-scaling debates. */
export const WEIGHT = { ap: 4, dur: 2, spd: 1.5, iq: 0.8, hax: 3 } as const;
const MAX_RAW = MAX_LEVEL * WEIGHT.ap + MAX_LEVEL * WEIGHT.dur + MAX_SPEED * WEIGHT.spd + MAX_IQ * WEIGHT.iq + MAX_HAX * WEIGHT.hax;

/** Combat rating 0–100 (one decimal). */
export function combatRating(s: Scaling): number {
  const raw = s.ap * WEIGHT.ap + s.dur * WEIGHT.dur + s.spd * WEIGHT.spd + s.iq * WEIGHT.iq + s.hax * WEIGHT.hax;
  return Math.round((raw / MAX_RAW) * 1000) / 10;
}

export type Tier = "BEYOND" | "SSS" | "SS" | "S" | "A" | "B";
export const TIERS: Tier[] = ["BEYOND", "SSS", "SS", "S", "A", "B"];

export function tierFor(s: Scaling, rating = combatRating(s)): Tier {
  if (s.ap >= BEYOND_LEVEL) return "BEYOND";
  return rating >= 70 ? "SSS" : rating >= 52 ? "SS" : rating >= 38 ? "S" : rating >= 25 ? "A" : "B";
}

export const tierRank = (t: Tier) => TIERS.length - TIERS.indexOf(t);
export const tierLabel = (t: Tier) => (t === "BEYOND" ? "∞" : t);

/** 0–100 display stats derived from the profile. */
export function displayStats(s: Scaling) {
  return {
    pow: Math.min(100, Math.round((s.ap / MAX_LEVEL) * 85 + s.hax * 3)),
    spd: Math.round((s.spd / MAX_SPEED) * 100),
    iq: Math.round((s.iq / MAX_IQ) * 100),
    dur: Math.round((s.dur / MAX_LEVEL) * 100),
  };
}

export const levelName = (n: number) => `${LEVELS[n]}${n >= BEYOND_LEVEL ? "" : " level"}`;

/** Short scaling summary, e.g. "Universe level · Massively FTL". */
export const scalingLine = (s: Scaling) => `${levelName(s.ap)} · ${SPEEDS[s.spd]}`;
