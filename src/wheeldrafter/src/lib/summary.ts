import type { CompleteRoll } from "@/data/types";
import { generateCharacter, type Character } from "./generator";
import { formatOneIn, formatTopPercent, powerRating, rankOf, rarityOf, scoreOf, type Rank } from "./rating";
import { legendId } from "./roll";
import { combatRating, scalingOf, tierFor, type Scaling, type Tier } from "./scaling";

export interface CharacterSummary {
  character: Character;
  id: string;
  score: number;
  /** Share of all possible characters at least this strong (0–1). */
  share: number;
  power: number;
  rank: Rank;
  /** Power-scaling profile: what actually decides fights. */
  scaling: Scaling;
  /** Combat rating 0–100 (same formula as AnimeDraft). */
  combat: number;
  tier: Tier;
  top: string;
  oneIn: string;
}

export function summarize(roll: CompleteRoll): CharacterSummary {
  const score = scoreOf(roll);
  const share = rarityOf(score);
  const scaling = scalingOf(roll);
  const combat = combatRating(scaling);
  return {
    scaling,
    combat,
    tier: tierFor(scaling, combat),
    character: generateCharacter(roll),
    id: legendId(roll),
    score,
    share,
    power: powerRating(score),
    rank: rankOf(share),
    top: formatTopPercent(share),
    oneIn: formatOneIn(share),
  };
}

/* ---------------- Hall of Legends (saved on this device) ---------------- */

export interface Legend {
  roll: CompleteRoll;
  owner: string;
  at: number;
}

const KEY = "wheeldrafter:legends:v2";
const MAX = 40;

export function loadLegends(): Legend[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Legend[];
    return Array.isArray(list) ? list.filter((l) => l?.roll?.powers) : [];
  } catch {
    return [];
  }
}

export function saveLegend(l: Legend): void {
  try {
    const id = legendId(l.roll);
    const list = loadLegends().filter((x) => legendId(x.roll) !== id);
    list.push(l);
    list.sort((a, b) => scoreOf(b.roll) - scoreOf(a.roll));
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage unavailable: nothing to save */
  }
}

export function clearLegends(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
