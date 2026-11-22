import { describe, expect, it } from "vitest";
import { WHEELS } from "@/data/wheels";
import { sliceAtPointer, slicesOf, targetRotation } from "@/features/wheel/geometry";
import { seeded } from "@/lib/random";

describe("wheel geometry", () => {
  it("slices cover the full circle in order", () => {
    for (const w of WHEELS) {
      const sl = slicesOf(w);
      expect(sl[0].start).toBe(0);
      expect(sl[sl.length - 1].end).toBeCloseTo(360, 9);
    }
  });

  it("always lands the pointer inside the chosen slice, even 0.5% slivers, from any starting angle", () => {
    const rng = seeded(7);
    for (const w of WHEELS) {
      const sl = slicesOf(w);
      for (let i = 0; i < sl.length; i++) {
        for (let trial = 0; trial < 50; trial++) {
          const from = (rng() - 0.5) * 100_000;
          const turns = 1 + Math.floor(rng() * 7);
          const to = targetRotation(sl, i, from, turns, rng());
          expect(sliceAtPointer(sl, to), `${w.id}[${i}] from ${from}`).toBe(i);
          // always spins forward, at least the requested number of full turns
          expect(to - from).toBeGreaterThanOrEqual(turns * 360);
          expect(to - from).toBeLessThan((turns + 1) * 360);
        }
      }
    }
  });
});
