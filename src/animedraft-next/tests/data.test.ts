import { describe, expect, it } from "vitest";
import { CHARACTERS, CHARACTER_BY_KEY, SERIES, SERIES_BY_KEY } from "@/data";

describe("character database", () => {
  it("has unique keys", () => {
    expect(new Set(CHARACTERS.map((c) => c.key)).size).toBe(CHARACTERS.length);
  });
  it("every character points to a real series and real similar characters", () => {
    for (const c of CHARACTERS) {
      expect(SERIES_BY_KEY[c.series], c.key).toBeTruthy();
      expect(c.clues.length, c.key).toBeGreaterThanOrEqual(3);
      expect(c.similar.length, c.key).toBeGreaterThanOrEqual(2);
      for (const s of c.similar) {
        expect(CHARACTER_BY_KEY[s], `${c.key} → ${s}`).toBeTruthy();
        expect(s, `${c.key} similar to itself`).not.toBe(c.key);
      }
      for (const v of Object.values(c.stats)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it("every series has clues and valid similar series", () => {
    for (const s of SERIES) {
      expect(s.clues.length).toBeGreaterThanOrEqual(3);
      for (const k of s.similar) expect(SERIES_BY_KEY[k], `${s.key} → ${k}`).toBeTruthy();
      expect(() => new RegExp(s.match, "i")).not.toThrow();
    }
  });
});
