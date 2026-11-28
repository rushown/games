"use client";
/**
 * Image loader for character portraits and series cover art.
 *
 * 1. Baked images (downloaded into public/img/ by `npm run sync:images`, paths in src/data/images.json)
 *    are used instantly.
 * 2. Anything missing is fetched straight from AniList by the browser: requests are batched,
 *    rate-limit aware, and cached in localStorage so each device only asks once.
 *
 * Components call useCharacterImage / useSeriesImage and re-render when the URL arrives.
 * If AniList can't be reached, the hooks return null and cards keep their designed fallback.
 */
import { useEffect, useSyncExternalStore } from "react";
import { BAKED_IMAGES, CHARACTER_BY_KEY, SERIES_BY_KEY, type ImageEntry } from "@/data";
import { characterLookup, fetchImages, RateLimitError, seriesLookup, type Lookup } from "./anilist";

const ENABLED = process.env.NEXT_PUBLIC_IMAGES !== "off";
const STORE_KEY = "animedraft:images:v1";
const BATCH = 6;
const GAP_MS = 700;
// Prefix for files in public/: the Next basePath, or "." in the single-file preview.
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE ?? "";

/** Local paths ("/img/…") from images.json get the asset prefix; remote URLs pass through. */
const resolve = (src: string | null | undefined) => (src ? (src.startsWith("/") ? ASSET_BASE + src : src) : null);

type Cache = Record<string, ImageEntry | null>;

function baked(): Cache {
  const out: Cache = {};
  for (const [k, v] of Object.entries(BAKED_IMAGES.characters)) out[`c:${k}`] = v;
  for (const [k, v] of Object.entries(BAKED_IMAGES.series)) out[`s:${k}`] = v;
  return out;
}

const BAKED = baked();
let cache: Cache = { ...BAKED };
let loaded = false;
const listeners = new Set<() => void>();
const queue: Lookup[] = [];
const queued = new Set<string>();
let running = false;
let offline = false;

function loadStored() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) cache = { ...JSON.parse(raw), ...BAKED };
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    const own: Cache = {};
    for (const [k, v] of Object.entries(cache)) if (!(k in BAKED)) own[k] = v;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(own));
  } catch {
    /* storage may be unavailable */
  }
}

const notify = () => listeners.forEach((l) => l());
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pump() {
  if (running) return;
  running = true;
  await sleep(30); // let a whole screen's worth of cards queue up first
  while (queue.length && !offline) {
    const batch = queue.splice(0, BATCH);
    try {
      const found = await fetchImages(batch);
      cache = { ...cache, ...found };
      batch.forEach((l) => queued.delete(l.id));
      persist();
      notify();
      if (queue.length) await sleep(GAP_MS);
    } catch (e) {
      if (e instanceof RateLimitError) {
        queue.unshift(...batch);
        await sleep(Math.min(e.retryAfter, 60) * 1000);
      } else {
        // network blocked / offline: stop trying for this session, keep fallbacks
        offline = true;
        batch.forEach((l) => queued.delete(l.id));
      }
    }
  }
  running = false;
}

function request(l: Lookup) {
  if (!ENABLED || offline || l.id in cache || queued.has(l.id)) return;
  queued.add(l.id);
  queue.push(l);
  void pump();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function useImage(id: string, lookup: () => Lookup | null): ImageEntry | null {
  const entry = useSyncExternalStore(
    subscribe,
    () => {
      loadStored();
      return cache[id] ?? null;
    },
    () => BAKED[id] ?? null,
  );
  useEffect(() => {
    loadStored();
    if (cache[id] === undefined) {
      const l = lookup();
      if (l) request(l);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return entry;
}

export function useCharacterImage(key: string): string | null {
  return resolve(
    useImage(`c:${key}`, () => {
      const c = CHARACTER_BY_KEY[key];
      return c ? characterLookup(c, SERIES_BY_KEY[c.series]) : null;
    })?.image,
  );
}

export function useSeriesImage(key: string): { cover: string | null; banner: string | null } {
  const e = useImage(`s:${key}`, () => (SERIES_BY_KEY[key] ? seriesLookup(SERIES_BY_KEY[key]) : null));
  return { cover: resolve(e?.image), banner: resolve(e?.banner) };
}
