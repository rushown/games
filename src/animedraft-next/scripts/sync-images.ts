/**
 * Bakes AniList images into src/data/images.json so the app never has to look them up at runtime.
 * (Without this the browser fetches and caches them itself, so it's optional, but faster.)
 *
 *   npm run sync:images            # only entries missing from the file
 *   npm run sync:images -- --all   # refresh everything
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CHARACTERS } from "../src/data/characters";
import { SERIES, SERIES_BY_KEY } from "../src/data/series";
import { characterLookup, fetchImages, RateLimitError, seriesLookup, type Lookup } from "../src/lib/anilist";
import type { ImageDatabase } from "../src/data/types";

const FILE = path.join(__dirname, "..", "src", "data", "images.json");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const all = process.argv.includes("--all");
  const db: ImageDatabase = JSON.parse(readFileSync(FILE, "utf8"));
  const lookups: Lookup[] = [
    ...SERIES.filter((s) => all || !db.series[s.key]).map(seriesLookup),
    ...CHARACTERS.filter((c) => all || !db.characters[c.key]).map((c) => characterLookup(c, SERIES_BY_KEY[c.series])),
  ];
  const missed: string[] = [];
  console.log(`Fetching ${lookups.length} images from AniList…`);

  for (let i = 0; i < lookups.length; ) {
    const batch = lookups.slice(i, i + 6);
    try {
      const found = await fetchImages(batch);
      for (const l of batch) {
        const [kind, key] = l.id.split(":");
        const hit = found[l.id];
        if (!hit) missed.push(l.id);
        else if (kind === "c") db.characters[key] = hit;
        else db.series[key] = hit;
        console.log(`${hit ? "✓" : "✗"} ${l.search}`);
      }
      writeFileSync(FILE, JSON.stringify(db, null, 2) + "\n");
      i += batch.length;
      await sleep(2200); // stays under AniList's degraded limit of ~30 requests/minute
    } catch (e) {
      if (e instanceof RateLimitError) {
        console.log(`Rate limited, waiting ${e.retryAfter}s…`);
        await sleep(e.retryAfter * 1000);
      } else throw e;
    }
  }
  console.log(`Done: ${Object.keys(db.characters).length} portraits, ${Object.keys(db.series).length} series covers.`);
  if (missed.length) console.log(`No confident match (adjust their search name): ${missed.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
