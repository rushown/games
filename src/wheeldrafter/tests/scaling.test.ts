import { describe, expect, it } from "vitest";
import type { CompleteRoll } from "@/data/types";
import { WHEEL_BY_ID } from "@/data/wheels";
import { seeded } from "@/lib/random";
import { combatRating, duelReason, duelWinner, scalingOf, tierFor } from "@/lib/scaling";
import { playSolo } from "./helpers";

const base: CompleteRoll = {
  race: "human",
  strength: "city",
  durability: "city",
  speed: "hypersonic",
  intelligence: "smart",
  powerCount: "1",
  powers: ["senses"],
  weapon: "fists",
  alignment: "hero",
};
const roll = (over: Partial<CompleteRoll>): CompleteRoll => ({ ...base, ...over });

describe("power scaling", () => {
  it("every wheel result maps onto the shared ladders", () => {
    for (const id of ["strength", "durability", "speed", "intelligence"] as const)
      for (const seg of WHEEL_BY_ID[id].segments) {
        const sc = scalingOf(roll({ [id]: seg.id }));
        expect(Number.isFinite(sc.ap + sc.dur + sc.spd + sc.iq), `${id}:${seg.id}`).toBe(true);
      }
  });

  it("strength sets the attack level; Boundless is beyond ratings", () => {
    expect(scalingOf(roll({ strength: "universe" })).ap).toBe(14);
    const b = scalingOf(roll({ strength: "boundless" }));
    expect(tierFor(b)).toBe("BEYOND");
  });

  it("Super Strength pushes a Multiversal legend into the Outerverse", () => {
    const sc = scalingOf(roll({ strength: "multiverse", powers: ["superstrength"] }));
    expect(sc.ap).toBe(16);
    expect(tierFor(sc)).toBe("BEYOND");
    expect(sc.notes[0]).toMatch(/Super Strength/);
  });

  it("hax comes from the most dangerous ability, weapon or race", () => {
    expect(scalingOf(roll({ powers: ["pyro"] })).hax).toBe(1);
    expect(scalingOf(roll({ powers: ["pyro", "time"] })).hax).toBe(4);
    expect(scalingOf(roll({ powers: ["time", "time"] })).hax).toBe(5); // awakened
    expect(scalingOf(roll({ weapon: "pen" })).hax).toBe(5);
    expect(scalingOf(roll({ race: "abstract" })).hax).toBe(4);
  });

  it("uses exactly AnimeDraft's formula (Goku's profile rates 74.8 in both games)", () => {
    expect(combatRating({ ap: 14, dur: 14, spd: 9, iq: 2, hax: 2, notes: [] })).toBe(74.8);
  });
});

describe("duels", () => {
  it("BEYOND beats any non-BEYOND legend, even a luckier one", () => {
    const god = scalingOf(roll({ strength: "boundless" }));
    const stacked = scalingOf(
      roll({ strength: "multiverse", durability: "boundless", speed: "omnipresent", intelligence: "omniscient", powers: ["reality", "conceptual", "narrative"] }),
    );
    expect(duelWinner(god, stacked)).toBe(0);
    expect(duelWinner(stacked, god)).toBe(1);
    expect(duelReason("A", god, "B", stacked)).toMatch(/beyond every scale/);
  });

  it("is deterministic and symmetric over real games", () => {
    const rng = seeded(11);
    const rolls = Array.from({ length: 60 }, () => scalingOf(playSolo(rng)));
    for (const a of rolls)
      for (const b of rolls) {
        const w = duelWinner(a, b);
        expect(duelWinner(a, b)).toBe(w);
        if (w !== null) expect(duelWinner(b, a)).toBe(w === 0 ? 1 : 0);
      }
  });
});
