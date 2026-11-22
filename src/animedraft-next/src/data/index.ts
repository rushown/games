import { CHARACTERS, CHARACTER_BY_KEY } from "./characters";
import { SERIES, SERIES_BY_KEY } from "./series";
import images from "./images.json";
import type { Character, ImageDatabase, Series } from "./types";

export * from "./types";
export * from "./scaling";
export { CHARACTERS, CHARACTER_BY_KEY, SERIES, SERIES_BY_KEY };

/** Images baked in by `npm run sync:images` (may be empty: the browser then fetches them). */
export const BAKED_IMAGES = images as ImageDatabase;

export const getCharacter = (key: string): Character => {
  const c = CHARACTER_BY_KEY[key];
  if (!c) throw new Error(`Unknown character: ${key}`);
  return c;
};
export const getSeries = (key: string): Series => {
  const s = SERIES_BY_KEY[key];
  if (!s) throw new Error(`Unknown series: ${key}`);
  return s;
};

/** Series that actually have characters in the database. */
export const ACTIVE_SERIES: Series[] = SERIES.filter((s) => CHARACTERS.some((c) => c.series === s.key));

export const charactersOf = (seriesKey: string): Character[] => CHARACTERS.filter((c) => c.series === seriesKey);

export type PoolFilter = "all" | "gods" | "fair";
export function filterPool(filter: PoolFilter, series: string[] = []): Character[] {
  return CHARACTERS.filter(
    (c) =>
      (series.length === 0 || series.includes(c.series)) &&
      (filter === "all" ||
        (filter === "gods" ? c.tier === "BEYOND" || c.tier === "SSS" || c.tier === "SS" : c.tier !== "BEYOND" && c.tier !== "SSS")),
  );
}
