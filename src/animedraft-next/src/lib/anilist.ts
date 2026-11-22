/**
 * AniList GraphQL client (public API, CORS-enabled, no key needed).
 * Used by the browser image loader and by `npm run sync:images`.
 *
 * Several lookups are batched into one request using GraphQL aliases.
 * A hit only counts if it belongs to the right series (regex on its titles), so
 * ambiguous names like "Simon" or "Power" never resolve to the wrong person.
 */
import type { Character, ImageEntry, Series } from "@/data/types";

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export type Lookup =
  | { id: string; kind: "character"; search: string; match: string }
  | { id: string; kind: "series"; search: string; match: string };

export const characterLookup = (c: Pick<Character, "key" | "search">, s: Pick<Series, "match">): Lookup => ({
  id: `c:${c.key}`,
  kind: "character",
  search: c.search,
  match: s.match,
});
export const seriesLookup = (s: Pick<Series, "key" | "search" | "match">): Lookup => ({
  id: `s:${s.key}`,
  kind: "series",
  search: s.search,
  match: s.match,
});

interface Title {
  romaji: string | null;
  english: string | null;
}
interface CharNode {
  id: number;
  image: { large: string | null } | null;
  media: { nodes: { title: Title }[] };
}
interface MediaNode {
  id: number;
  title: Title;
  coverImage: { extraLarge: string | null; large: string | null } | null;
  bannerImage: string | null;
}

const titleText = (t: Title) => `${t.romaji ?? ""} ${t.english ?? ""}`;

function fragment(l: Lookup, alias: string): string {
  const q = JSON.stringify(l.search);
  return l.kind === "character"
    ? `${alias}: Page(perPage: 10) { characters(search: ${q}) { id image { large } media(perPage: 5) { nodes { title { romaji english } } } } }`
    : `${alias}: Page(perPage: 5) { media(search: ${q}, type: ANIME) { id title { romaji english } coverImage { extraLarge large } bannerImage } }`;
}

export function buildQuery(lookups: Lookup[]): string {
  return `query { ${lookups.map((l, i) => fragment(l, `q${i}`)).join(" ")} }`;
}

/** Picks the right result for each lookup from a batched response. */
export function parseResponse(lookups: Lookup[], data: Record<string, unknown>): Record<string, ImageEntry | null> {
  const out: Record<string, ImageEntry | null> = {};
  lookups.forEach((l, i) => {
    const re = new RegExp(l.match, "i");
    const page = data[`q${i}`] as { characters?: CharNode[]; media?: MediaNode[] } | undefined;
    if (l.kind === "character") {
      const hit = page?.characters?.find((ch) => ch.media.nodes.some((m) => re.test(titleText(m.title))));
      out[l.id] = hit?.image?.large ? { anilistId: hit.id, image: hit.image.large } : null;
    } else {
      const hit = page?.media?.find((m) => re.test(titleText(m.title))) ?? page?.media?.[0];
      const img = hit?.coverImage?.extraLarge ?? hit?.coverImage?.large;
      out[l.id] = hit && img ? { anilistId: hit.id, image: img, banner: hit.bannerImage } : null;
    }
  });
  return out;
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`AniList rate limit, retry after ${retryAfter}s`);
  }
}

/** Resolves up to ~6 lookups in a single request. */
export async function fetchImages(lookups: Lookup[], init?: RequestInit): Promise<Record<string, ImageEntry | null>> {
  const res = await fetch(ANILIST_ENDPOINT, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: buildQuery(lookups) }),
  });
  if (res.status === 429) throw new RateLimitError(Number(res.headers.get("retry-after") ?? 60));
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return parseResponse(lookups, json.data ?? {});
}
