import { describe, expect, it } from "vitest";
import { WHEEL_BY_ID } from "@/data/wheels";
import type { CompleteRoll } from "@/data/types";
import { advance, canRespin, createGame, currentWheel, currentWheelId, DEFAULT_GAME_CONFIG, land, respin, spinResult, type GameState } from "@/features/game/engine";
import { generateCharacter } from "@/lib/generator";
import { seeded } from "@/lib/random";
import { legendId, seedOf } from "@/lib/roll";
import { playSolo } from "./helpers";

/** Lands a chosen result for the current wheel and moves on. */
const step = (g: GameState, id?: string) => advance(land(g, id ?? currentWheel(g)!.segments[0].id));

describe("spin flow", () => {
  it("solo: race → stats → power count → that many power spins → weapon → path", () => {
    let g = createGame(DEFAULT_GAME_CONFIG);
    const seen: string[] = [];
    while (g.phase !== "done") {
      const id = currentWheelId(g)!;
      seen.push(id);
      g = step(g, id === "powerCount" ? "3" : undefined);
    }
    expect(seen).toEqual(["race", "strength", "durability", "speed", "intelligence", "powerCount", "power", "power", "power", "weapon", "alignment"]);
    expect(g.players[0].roll.powers).toHaveLength(3);
  });

  it("one re-spin per player, only while a result is showing", () => {
    let g = createGame(DEFAULT_GAME_CONFIG);
    expect(canRespin(g)).toBe(false);
    g = land(g, "human");
    expect(canRespin(g)).toBe(true);
    g = respin(g);
    expect(g.players[0].roll.race).toBeUndefined();
    expect(currentWheelId(g)).toBe("race");
    g = land(g, "elf");
    expect(canRespin(g)).toBe(false);
  });

  it("duel: players alternate; the one with more powers keeps spinning at the end", () => {
    let g = createGame({ ...DEFAULT_GAME_CONFIG, mode: "duel" });
    const order: string[] = [];
    while (g.phase !== "done") {
      const id = currentWheelId(g)!;
      order.push(`${g.turn}:${id}`);
      g = step(g, id === "powerCount" ? (g.turn === 0 ? "1" : "4") : undefined);
    }
    expect(order.slice(0, 4)).toEqual(["0:race", "1:race", "0:strength", "1:strength"]);
    expect(order.filter((o) => o.startsWith("0:")).length).toBe(6 + 1 + 2);
    expect(order.filter((o) => o.startsWith("1:")).length).toBe(6 + 4 + 2);
    expect(order.slice(-3)).toEqual(["1:power", "1:weapon", "1:alignment"]);
  });

  it("a rare race reshapes the next wheels for that player only", () => {
    let g = createGame({ ...DEFAULT_GAME_CONFIG, mode: "duel" });
    g = step(g, "abstract"); // P1 god race
    g = step(g, "human"); // P2 human
    const p1 = currentWheel(g)!; // P1 strength
    expect(p1.segments.at(-1)!.weight).toBeGreaterThan(WHEEL_BY_ID.strength.segments.at(-1)!.weight * 5);
    g = step(g);
    expect(currentWheel(g)!.segments.at(-1)!.weight).toBeCloseTo(WHEEL_BY_ID.strength.segments.at(-1)!.weight, 9); // P2 base odds
  });

  it("spins follow the (tilted) slice sizes", () => {
    const rng = seeded(9);
    let g = createGame(DEFAULT_GAME_CONFIG);
    g = step(g, "abstract");
    const wheel = currentWheel(g)!;
    const N = 100_000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const id = spinResult(wheel, rng).id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    for (const seg of wheel.segments) expect((counts[seg.id] ?? 0) / N).toBeCloseTo(seg.weight / 100, 2);
  });
});

describe("unique characters", () => {
  it("changing any single spin changes the Legend ID, the seed and the character", () => {
    const rng = seeded(5);
    for (let n = 0; n < 200; n++) {
      const r = playSolo(rng);
      const base = generateCharacter(r);
      const variants: CompleteRoll[] = [];
      for (const id of ["race", "strength", "durability", "speed", "intelligence", "weapon", "alignment"] as const) {
        const other = WHEEL_BY_ID[id].segments.find((s) => s.id !== r[id])!.id;
        variants.push({ ...r, [id]: other });
      }
      const p = WHEEL_BY_ID.power.segments.find((s) => s.id !== r.powers[0])!.id;
      variants.push({ ...r, powers: [p, ...r.powers.slice(1)] });
      for (const v of variants) {
        expect(legendId(v)).not.toBe(legendId(r));
        expect(seedOf(v)).not.toBe(seedOf(r));
        const c = generateCharacter(v);
        expect(c.seed === base.seed && c.prompt === base.prompt).toBe(false);
      }
    }
  });

  it("no two different rolls share a Legend ID (300,000 random characters)", () => {
    const rng = seeded(11);
    const seen = new Map<string, string>();
    for (let i = 0; i < 300_000; i++) {
      const r = playSolo(rng);
      const canonical = JSON.stringify({ ...r, powers: [...r.powers].sort(), powerCount: undefined });
      const id = legendId(r);
      const prev = seen.get(id);
      if (prev !== undefined) expect(prev).toBe(canonical);
      seen.set(id, canonical);
    }
  });

  it("generator is deterministic and complete", () => {
    const rng = seeded(3);
    for (let i = 0; i < 300; i++) {
      const r = playSolo(rng);
      const a = generateCharacter(r);
      expect(generateCharacter(r)).toEqual(a);
      expect(a.name.length).toBeGreaterThan(1);
      expect(a.epithet).toMatch(/^The /);
      for (const p of a.backstory) expect(p).not.toMatch(/undefined|NaN/);
      expect(a.prompt).not.toMatch(/undefined/);
    }
  });
});
