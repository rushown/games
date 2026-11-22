import { describe, expect, it } from "vitest";
import { CHARACTERS, CHARACTER_BY_KEY, MAX_HAX, MAX_IQ, MAX_LEVEL, MAX_SPEED } from "@/data";
import { PROFILES } from "@/data/profiles";
import { duelReason, duelWinner, teamBattle } from "@/lib/battle";

const C = (k: string) => CHARACTER_BY_KEY[k];

describe("power-scaling profiles", () => {
  it("every character has exactly one in-range profile with a feat", () => {
    expect(Object.keys(PROFILES).sort()).toEqual(CHARACTERS.map((c) => c.key).sort());
    for (const c of CHARACTERS) {
      const p = c.scaling;
      expect(p.ap, c.key).toBeGreaterThanOrEqual(0);
      expect(p.ap, c.key).toBeLessThanOrEqual(MAX_LEVEL);
      expect(p.dur, c.key).toBeLessThanOrEqual(MAX_LEVEL);
      expect(p.spd, c.key).toBeLessThanOrEqual(MAX_SPEED);
      expect(p.iq, c.key).toBeLessThanOrEqual(MAX_IQ);
      expect(p.hax, c.key).toBeLessThanOrEqual(MAX_HAX);
      expect(p.feat.length, c.key).toBeGreaterThan(20);
      for (const v of Object.values(c.stats)) expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("the goats are beyond ratings", () => {
    for (const k of ["featherine", "simon", "anos", "rimuru", "madoka", "bernkastel", "haruhi", "homura"]) expect(C(k).tier, k).toBe("BEYOND");
    const top = [...CHARACTERS].sort((a, b) => b.rating - a.rating);
    expect(top[0].key).toBe("featherine");
    expect(top.slice(0, 8).every((c) => c.tier === "BEYOND")).toBe(true);
  });

  it("no two BEYOND characters share a rating (no coin-flip ties at the top)", () => {
    const r = CHARACTERS.filter((c) => c.tier === "BEYOND").map((c) => c.rating);
    expect(new Set(r).size).toBe(r.length);
  });
});

describe("duels", () => {
  it("are deterministic and symmetric", () => {
    for (const a of CHARACTERS)
      for (const b of CHARACTERS) {
        if (a === b) continue;
        const w = duelWinner(a, b);
        expect(duelWinner(a, b)).toBe(w);
        if (a.rating !== b.rating) expect(duelWinner(b, a)).toBe(w === 0 ? 1 : 0);
      }
  });

  it("BEYOND beats anyone below it, whatever the matchup", () => {
    for (const g of CHARACTERS.filter((c) => c.tier === "BEYOND"))
      for (const o of CHARACTERS.filter((c) => c.tier !== "BEYOND")) {
        expect(duelWinner(g, o), `${g.key} vs ${o.key}`).toBe(0);
        expect(duelWinner(o, g), `${o.key} vs ${g.key}`).toBe(1);
      }
  });

  it("follows scaling, not popularity", () => {
    expect(duelWinner(C("featherine"), C("zeno"))).toBe(0);
    expect(duelWinner(C("simon"), C("goku"))).toBe(0);
    expect(duelWinner(C("goku"), C("naruto"))).toBe(0);
    expect(duelWinner(C("L"), C("levi"))).toBe(1);
  });

  it("explains every result in words", () => {
    expect(duelReason(C("simon"), C("goku"))).toMatch(/Outerverse/);
    expect(duelReason(C("goku"), C("naruto"))).toMatch(/Universe level/);
  });

  it("team battles fight strongest vs strongest", () => {
    const a = ["featherine", "levi", "L", "anya", "loid"].map(C);
    const b = ["goku", "vegeta", "gohan", "broly", "beerus"].map(C);
    const r = teamBattle(a, b);
    expect(r.bouts).toHaveLength(5);
    expect(r.bouts[0].a.key).toBe("featherine");
    expect(r.bouts[0].winner).toBe(0);
    expect(r.boutWins).toEqual([1, 4]);
    expect(r.winner).toBe(1);
  });
});
