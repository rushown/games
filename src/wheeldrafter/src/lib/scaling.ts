/**
 * Power scaling for spun legends, using the same ladders and formula as AnimeDraft, so a
 * "Universe level · SSS" legend here means the same thing as Goku's profile there.
 *
 * Rarity (rating.ts) measures how LUCKY a roll was. Scaling measures how STRONG the character is
 * in a fight: attack level dominates, abilities that skip raw power (hax) come next, then
 * durability, speed and intellect. Duels are decided by scaling, never dice.
 */
import type { CompleteRoll } from "@/data/types";

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
export const MAX_LEVEL = LEVELS.length - 1;
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
export const MAX_SPEED = SPEEDS.length - 1;

export const INTELLECT = ["Simple", "Average", "Sharp", "Gifted", "Genius", "Supergenius", "Nigh-Omniscient", "Omniscient"] as const;
export const MAX_IQ = INTELLECT.length - 1;

export const HAX = ["None", "Minor", "Notable", "Dangerous", "Reality-Bending", "Absolute"] as const;
export const MAX_HAX = HAX.length - 1;

/* ---------------- wheel results → ladder positions ---------------- */

const STRENGTH_LEVEL: Record<string, number> = {
  average: 0, peak: 0, wall: 1, building: 2, city: 5, continent: 9, planet: 10, solar: 12, galaxy: 13, universe: 14, multiverse: 15, boundless: 17,
};
const DURABILITY_LEVEL: Record<string, number> = {
  average: 0, tough: 0, bulletproof: 1, building: 2, city: 5, continent: 9, planet: 10, solar: 12, galaxy: 13, universe: 14, multiverse: 15, boundless: 17,
};
const SPEED_LEVEL: Record<string, number> = {
  average: 0, athletic: 0, supersonic: 3, hypersonic: 4, mhs: 5, relativistic: 6, light: 7, ftl: 8, mftl: 9, infinite: 10, immeasurable: 11, omnipresent: 12,
};
const IQ_LEVEL: Record<string, number> = {
  average: 1, smart: 2, gifted: 3, genius: 4, tactical: 4, supergenius: 5, cosmic: 6, omniscient: 7,
};

/** How much each power bypasses raw stats (0 none … 5 absolute). */
export const POWER_HAX: Record<string, number> = {
  senses: 1, superstrength: 0, pyro: 1, hydro: 1, electro: 1, regeneration: 2, telekinesis: 2, shapeshifting: 2, invisibility: 2,
  teleport: 2, shadow: 2, gravity: 3, barrier: 3, clones: 2, copying: 3, precognition: 3, space: 4, time: 4, soul: 4,
  immortality: 4, probability: 4, reality: 5, conceptual: 5, narrative: 5,
};
const WEAPON_HAX: Record<string, number> = { scythe: 2, cursed: 2, relic: 3, hammer: 2, pen: 5 };
const RACE_HAX: Record<string, number> = { vampire: 1, spirit: 2, angel: 1, eldritch: 3, celestial: 2, primordial: 3, abstract: 4 };

export interface Scaling {
  ap: number;
  dur: number;
  spd: number;
  iq: number;
  hax: number;
  /** Plain-words notes on what pushed the profile up (e.g. "Super Strength: +1 attack level"). */
  notes: string[];
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

export function scalingOf(r: CompleteRoll): Scaling {
  const notes: string[] = [];
  const count = (id: string) => r.powers.filter((p) => p === id).length;

  let ap = STRENGTH_LEVEL[r.strength] ?? 0;
  const ss = count("superstrength");
  if (ss) {
    ap += ss; // awakened Super Strength pushes two levels
    notes.push(`Super Strength${ss > 1 ? " (awakened)" : ""}: +${ss} attack level`);
  }

  let dur = DURABILITY_LEVEL[r.durability] ?? 0;
  const tough: [string, number, string][] = [
    ["regeneration", 1, "Regeneration"],
    ["barrier", 1, "Absolute Barrier"],
    ["immortality", 2, "True Immortality"],
  ];
  for (const [id, by, label] of tough)
    if (count(id)) {
      dur += by;
      notes.push(`${label}: +${by} durability level`);
    }

  const spd = SPEED_LEVEL[r.speed] ?? 0;
  const iq = IQ_LEVEL[r.intelligence] ?? 0;

  // hax: the single most dangerous ability counts, plus bonuses for awakening it or stacking several
  let hax = Math.max(0, ...r.powers.map((p) => POWER_HAX[p] ?? 0), WEAPON_HAX[r.weapon] ?? 0, RACE_HAX[r.race] ?? 0);
  const top = r.powers.filter((p) => (POWER_HAX[p] ?? 0) === hax && hax >= 3);
  if (top.some((p) => count(p) >= 2)) {
    hax += 1;
    notes.push("Awakened top ability: +1 hax");
  }
  if (new Set(r.powers.filter((p) => (POWER_HAX[p] ?? 0) >= 3)).size >= 3) {
    hax += 1;
    notes.push("Three or more high-tier abilities: +1 hax");
  }
  if ((WEAPON_HAX[r.weapon] ?? 0) >= 5) notes.push("Pen of Creation: absolute hax");

  return { ap: clamp(ap, MAX_LEVEL), dur: clamp(dur, MAX_LEVEL), spd, iq, hax: clamp(hax, MAX_HAX), notes };
}

/* ---------------- rating, tier, duels (identical to AnimeDraft) ---------------- */

export const WEIGHT = { ap: 4, dur: 2, spd: 1.5, iq: 0.8, hax: 3 } as const;
const MAX_RAW = MAX_LEVEL * WEIGHT.ap + MAX_LEVEL * WEIGHT.dur + MAX_SPEED * WEIGHT.spd + MAX_IQ * WEIGHT.iq + MAX_HAX * WEIGHT.hax;

export function combatRating(s: Scaling): number {
  const raw = s.ap * WEIGHT.ap + s.dur * WEIGHT.dur + s.spd * WEIGHT.spd + s.iq * WEIGHT.iq + s.hax * WEIGHT.hax;
  return Math.round((raw / MAX_RAW) * 1000) / 10;
}

export type Tier = "BEYOND" | "SSS" | "SS" | "S" | "A" | "B";

export function tierFor(s: Scaling, rating = combatRating(s)): Tier {
  if (s.ap >= BEYOND_LEVEL) return "BEYOND";
  return rating >= 70 ? "SSS" : rating >= 52 ? "SS" : rating >= 38 ? "S" : rating >= 25 ? "A" : "B";
}
export const tierLabel = (t: Tier) => (t === "BEYOND" ? "∞ Beyond" : `${t} tier`);
export const levelName = (n: number) => `${LEVELS[n]}${n >= BEYOND_LEVEL ? "" : " level"}`;

/** 0 or 1: who wins. BEYOND beats anything below it, then rating, then attack, speed, intellect. */
export function duelWinner(a: Scaling, b: Scaling): 0 | 1 | null {
  const ba = a.ap >= BEYOND_LEVEL;
  const bb = b.ap >= BEYOND_LEVEL;
  if (ba !== bb) return ba ? 0 : 1;
  const ra = combatRating(a);
  const rb = combatRating(b);
  if (ra !== rb) return ra > rb ? 0 : 1;
  for (const k of ["ap", "spd", "iq"] as const) if (a[k] !== b[k]) return a[k] > b[k] ? 0 : 1;
  return null;
}

/** Why `w` (named W) beats `l` (named L), in one or two sentences. */
export function duelReason(W: string, w: Scaling, L: string, l: Scaling): string {
  if (w.ap >= BEYOND_LEVEL && l.ap < BEYOND_LEVEL) return `${W} is ${levelName(w.ap)}: beyond every scale ${L} can reach.`;
  const f = (["ap", "hax", "dur", "spd", "iq"] as const).map((k) => ({ k, d: (w[k] - l[k]) * WEIGHT[k] }));
  const best = f.reduce((a, b) => (b.d > a.d ? b : a));
  const why =
    best.d <= 0
      ? `Dead even on paper; ${W} edges it on attack level and speed.`
      : best.k === "ap"
        ? `${W} hits at ${levelName(w.ap)}, ${L} only at ${levelName(l.ap)}.`
        : best.k === "hax"
          ? `${W}'s ${HAX[w.hax].toLowerCase()} abilities skip past ${L}'s raw power.`
          : best.k === "dur"
            ? `${W} can tank ${levelName(w.dur)} attacks; ${L}'s ${levelName(l.ap)} offence can't break through.`
            : best.k === "spd"
              ? `${W} is ${SPEEDS[w.spd]} against ${L}'s ${SPEEDS[l.spd]}: ${L} never lands a clean hit.`
              : `${W} (${INTELLECT[w.iq]}) out-thinks ${L} (${INTELLECT[l.iq]}).`;
  const word = { ap: "attack power", hax: "hax", dur: "durability", spd: "speed", iq: "intellect" } as const;
  const counter = f.filter((e) => e.d < 0).sort((a, b) => a.d - b.d)[0];
  return counter ? `${why} ${L} has the better ${word[counter.k]}, but it isn't enough.` : why;
}
