import type { Scaling, Tier } from "./scaling";
export type { Scaling, Tier };

export type StatKey = "pow" | "spd" | "iq" | "dur" | "sup";

export interface Series {
  key: string;
  name: string;
  short: string;
  /** Card gradient colours. */
  colors: [string, string];
  /** Regex (case-insensitive) used to confirm an AniList search hit belongs to this series. */
  match: string;
  /** Vague words an imposter can be given in Series mode. */
  clues: string[];
  /** Series that feel close: used for "similar" imposter hints. */
  similar: string[];
  /** Title used when searching AniList for cover art. */
  search: string;
}

export interface Character {
  key: string;
  name: string;
  /** Name used when searching AniList. */
  search: string;
  series: string;
  title: string;
  /** 0–100 bars derived from `scaling` (SUP is the only hand-set value). */
  stats: Record<StatKey, number>;
  /** Power-scaling profile: attack/durability level, speed, intellect, hax and key feat. */
  scaling: Scaling;
  clues: string[];
  similar: string[];
  /** Combat rating 0–100, derived from `scaling`. */
  rating: number;
  tier: Tier;
  initials: string;
}

/** A resolved AniList image (character portrait or series cover). */
export interface ImageEntry {
  anilistId: number;
  image: string;
  /** Wide banner (series only). */
  banner?: string | null;
}

export interface ImageDatabase {
  characters: Record<string, ImageEntry>;
  series: Record<string, ImageEntry>;
}
