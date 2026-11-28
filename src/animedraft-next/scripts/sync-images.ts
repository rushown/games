/**
 * Bakes AniList images into the app: downloads each portrait / cover / banner into public/img/
 * and writes the local paths (e.g. "/img/characters/gojo.jpg") into src/data/images.json,
 * so the live site serves its own copies and never depends on AniList's CDN.
 * (Characters missing from the file are still looked up by the browser at runtime.)
 *
 *   npm run sync:images            # look up missing entries, download any image not yet local
 *   npm run sync:images -- --all   # look everything up again and re-download it
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CHARACTERS } from "../src/data/characters";
import { SERIES, SERIES_BY_KEY } from "../src/data/series";
import { characterLookup, fetchImages, RateLimitError, seriesLookup, type Lookup } from "../src/lib/anilist";
import type { ImageDatabase, ImageEntry } from "../src/data/types";

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "src", "data", "images.json");
const PUBLIC = path.join(ROOT, "public");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRemote = (u: string | null | undefined): u is string => !!u && /^https?:\/\//.test(u);
const save = (db: ImageDatabase) => writeFileSync(FILE, JSON.stringify(db, null, 2) + "\n");

/** Downloads `url` to public/img/<dir>/<name>.<ext> and returns its public path. */
async function download(url: string, dir: string, name: string): Promise<string> {
  const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
  const rel = `/img/${dir}/${name}${ext}`;
  const dest = path.join(PUBLIC, rel);
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return rel;
    }
    if (attempt >= 3) throw new Error(`${res.status} downloading ${url}`);
    await sleep(2000 * attempt);
  }
}

/** Replaces any remote URL in the entry with a downloaded local copy (or re-downloads a missing file). */
async function localize(e: ImageEntry, dir: string, key: string): Promise<boolean> {
  let changed = false;
  if (isRemote(e.image)) (e.image = await download(e.image, dir, key)), (changed = true);
  if (isRemote(e.banner)) (e.banner = await download(e.banner, dir, `${key}-banner`)), (changed = true);
  for (const p of [e.image, e.banner])
    if (p && !isRemote(p) && !existsSync(path.join(PUBLIC, p)))
      console.warn(`! ${p} is missing: run with --all to download it again`);
  return changed;
}

async function lookUp(db: ImageDatabase, all: boolean) {
  const lookups: Lookup[] = [
    ...SERIES.filter((s) => all || !db.series[s.key]).map(seriesLookup),
    ...CHARACTERS.filter((c) => all || !db.characters[c.key]).map((c) => characterLookup(c, SERIES_BY_KEY[c.series])),
  ];
  const missed: string[] = [];
  console.log(`Looking up ${lookups.length} images on AniList…`);

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
      save(db);
      i += batch.length;
      await sleep(2200); // stays under AniList's degraded limit of ~30 requests/minute
    } catch (e) {
      if (e instanceof RateLimitError) {
        console.log(`Rate limited, waiting ${e.retryAfter}s…`);
        await sleep(e.retryAfter * 1000);
      } else throw e;
    }
  }
  if (missed.length) console.log(`No confident match (adjust their search name): ${missed.join(", ")}`);
}

async function main() {
  const all = process.argv.includes("--all");
  const db: ImageDatabase = JSON.parse(readFileSync(FILE, "utf8"));
  await lookUp(db, all);

  let downloaded = 0;
  for (const [dir, entries] of [["series", db.series], ["characters", db.characters]] as const)
    for (const [key, e] of Object.entries(entries))
      if (await localize(e, dir, key)) {
        downloaded++;
        save(db); // resumable: progress is kept if this stops
        console.log(`↓ ${dir}/${key}`);
      }
  console.log(
    `Done: ${Object.keys(db.characters).length} portraits, ${Object.keys(db.series).length} series covers` +
      ` (${downloaded} downloaded into public/img/).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
