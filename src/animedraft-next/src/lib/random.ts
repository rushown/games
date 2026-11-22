export type Rng = () => number;

export const defaultRng: Rng = Math.random;

export function randInt(n: number, rng: Rng = defaultRng): number {
  return Math.floor(rng() * n);
}

export function pick<T>(items: readonly T[], rng: Rng = defaultRng): T {
  if (!items.length) throw new Error("pick() from empty list");
  return items[randInt(items.length, rng)];
}

export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(items: readonly T[], n: number, rng: Rng = defaultRng): T[] {
  return shuffle(items, rng).slice(0, n);
}

/** Deterministic RNG for tests and replays. */
export function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
