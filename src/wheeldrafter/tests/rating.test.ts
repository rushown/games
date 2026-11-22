import { describe, expect, it } from "vitest";
import { WHEELS, WHEEL_BY_ID, fortuneOf, tiltedWheel } from "@/data/wheels";
import type { CompleteRoll } from "@/data/types";
import { distribution, MAX_SCORE, formatOneIn, formatTopPercent, rankOf, rarityOf, scoreOf } from "@/lib/rating";
import { seeded } from "@/lib/random";
import { playSolo, topOf } from "./helpers";

const prob = (w: ReturnType<typeof tiltedWheel>, id: string) => w.segments.find((x) => x.id === id)!.weight / 100;
/** Chance of landing any top-tier (11) slice. */
const topTier = (w: ReturnType<typeof tiltedWheel>) => w.segments.filter((x) => x.tier === 11).reduce((t, x) => t + x.weight / 100, 0);

describe("wheel data", () => {
  it("every wheel totals 100% and rarer tiers never get bigger slices", () => {
    for (const w of WHEELS) {
      expect(w.segments.reduce((t, s) => t + s.weight, 0), w.id).toBeCloseTo(100, 6);
      if (w.id !== "alignment")
        for (let i = 1; i < w.segments.length; i++) expect(w.segments[i].weight, `${w.id}[${i}]`).toBeLessThanOrEqual(w.segments[i - 1].weight);
      expect(new Set(w.segments.map((s) => s.id)).size).toBe(w.segments.length);
    }
    expect(WHEEL_BY_ID.power.segments).toHaveLength(24);
  });
});

describe("fortune", () => {
  it("humans get base odds; rarer races enlarge rare slices more and more", () => {
    expect(fortuneOf("human")).toBe(0);
    const races = WHEEL_BY_ID.race.segments.map((r) => r.id);
    let prev = 0;
    for (const r of races) {
      const top = prob(tiltedWheel(WHEEL_BY_ID.strength, fortuneOf(r)), "boundless");
      expect(top).toBeGreaterThanOrEqual(prev);
      prev = top;
    }
    const base = prob(WHEEL_BY_ID.strength, "boundless");
    const god = prob(tiltedWheel(WHEEL_BY_ID.strength, fortuneOf("abstract")), "boundless");
    expect(god / base).toBeGreaterThan(5); // a 0.5% sliver becomes a real slice
    for (const w of WHEELS) expect(tiltedWheel(w, 1).segments.reduce((t, s) => t + s.weight, 0)).toBeCloseTo(100, 6);
  });
});

describe("exact rarity", () => {
  it("distribution sums to 1", () => {
    expect(distribution().reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it("a perfect roll is exactly as rare as every top-tier slice (with fortune) multiplied", () => {
    const f = fortuneOf("abstract");
    const t = (id: Parameters<typeof tiltedWheel>[0]["id"]) => tiltedWheel(WHEEL_BY_ID[id], f);
    const expected =
      prob(WHEEL_BY_ID.race, "abstract") *
      topTier(t("strength")) *
      topTier(t("durability")) *
      topTier(t("speed")) *
      topTier(t("intelligence")) *
      topTier(t("weapon")) *
      prob(t("powerCount"), "6") *
      Math.pow(topTier(t("power")), 6);
    const perfect: CompleteRoll = {
      race: "abstract",
      strength: topOf("strength"),
      durability: topOf("durability"),
      speed: topOf("speed"),
      intelligence: topOf("intelligence"),
      powerCount: "6",
      powers: Array(6).fill(topOf("power")),
      weapon: topOf("weapon"),
      alignment: "hero",
    };
    expect(scoreOf(perfect)).toBe(MAX_SCORE);
    expect(rarityOf(MAX_SCORE) / expected).toBeCloseTo(1, 9);
    expect(rankOf(rarityOf(MAX_SCORE)).title).toBe("Boundless One");
  });

  it("matches a 150,000-game simulation of the real engine", () => {
    const rng = seeded(42);
    const N = 150_000;
    const scores = Array.from({ length: N }, () => scoreOf(playSolo(rng)));
    for (const target of [40, 60, 80, 100]) {
      const sim = scores.filter((x) => x >= target).length / N;
      const exact = rarityOf(target);
      expect(Math.abs(sim - exact), `score ≥ ${target}: sim ${sim} vs exact ${exact}`).toBeLessThan(Math.max(0.004, exact * 0.06));
    }
  });

  it("formats odds without scientific notation", () => {
    expect(formatTopPercent(0.5)).toBe("50%");
    expect(formatTopPercent(0.034)).toBe("3.4%");
    expect(formatTopPercent(0.0000123)).toBe("0.0012%");
    expect(formatTopPercent(1.2e-12)).not.toMatch(/e/);
    expect(formatOneIn(0.25)).toBe("1 in 4");
    expect(formatOneIn(1 / 4200)).toBe("1 in 4,200");
    expect(formatOneIn(1 / 3.7e6)).toBe("1 in 3.7 million");
  });
});
