/**
 * A player's roll: which wheel comes next, odds after fortune, and a unique identity.
 *
 * Spin order: Race → Strength → Durability → Speed → Intelligence → Power Count →
 *             Power × (count) → Weapon → Path
 */
import { WHEEL_BY_ID, fortuneOf, segmentOf, tiltedWheel } from "@/data/wheels";
import type { CompleteRoll, Roll, SingleWheelId, Wheel, WheelId } from "@/data/types";

export const BASE_ORDER: SingleWheelId[] = ["race", "strength", "durability", "speed", "intelligence", "powerCount"];
export const TAIL_ORDER: SingleWheelId[] = ["weapon", "alignment"];

export const emptyRoll = (): Roll => ({ powers: [] });
export const powerCountOf = (r: Roll) => (r.powerCount ? Number(r.powerCount) : 0);

/** The next wheel this player must spin, or null when the character is complete. */
export function nextWheel(r: Roll): WheelId | null {
  for (const id of BASE_ORDER) if (!r[id]) return id;
  if (r.powers.length < powerCountOf(r)) return "power";
  for (const id of TAIL_ORDER) if (!r[id]) return id;
  return null;
}

export const isComplete = (r: Roll): r is CompleteRoll => nextWheel(r) === null;

/** Total spins this roll will need (exact once the power count is known). */
export const totalSpins = (r: Roll) => BASE_ORDER.length + (powerCountOf(r) || 1) + TAIL_ORDER.length;
export const spinsDone = (r: Roll) =>
  BASE_ORDER.filter((id) => r[id]).length + r.powers.length + TAIL_ORDER.filter((id) => r[id]).length;

/** The wheel exactly as this player sees it: fortune from their race enlarges higher tiers. */
export const wheelFor = (r: Roll, id: WheelId): Wheel => tiltedWheel(WHEEL_BY_ID[id], fortuneOf(r.race));

export function applySpin(r: Roll, id: WheelId, segmentId: string): Roll {
  if (id === "power") return { ...r, powers: [...r.powers, segmentId] };
  return { ...r, [id]: segmentId };
}

/** Undo the most recent spin of wheel `id` (used by re-spin). */
export function undoSpin(r: Roll, id: WheelId): Roll {
  if (id === "power") return { ...r, powers: r.powers.slice(0, -1) };
  const next = { ...r };
  delete next[id];
  return next;
}

/** Power list grouped: [{ id, count }] in first-seen order. count ≥ 2 = Awakened. */
export function groupedPowers(powers: string[]): { id: string; count: number }[] {
  const out: { id: string; count: number }[] = [];
  for (const p of powers) {
    const g = out.find((x) => x.id === p);
    if (g) g.count++;
    else out.push({ id: p, count: 1 });
  }
  return out;
}

/* ---------------- identity ---------------- */

const ID_WHEELS: SingleWheelId[] = ["race", "strength", "durability", "speed", "intelligence", "weapon", "alignment"];
const MAX_POWERS = 6;

/**
 * Legend ID: a mixed-radix number built from every result (each wheel's slice index, plus how many
 * times each power was rolled). It's a bijection: two characters share an ID only if every spin
 * matches (power order aside). Shown in base-36, e.g. "4K2Q-9ZB1-77XR".
 */
export function legendId(r: CompleteRoll): string {
  let n = 0n;
  const push = (digit: number, radix: number) => {
    n = n * BigInt(radix) + BigInt(digit);
  };
  for (const id of ID_WHEELS) {
    const segs = WHEEL_BY_ID[id].segments;
    push(segs.findIndex((x) => x.id === r[id]), segs.length);
  }
  for (const seg of WHEEL_BY_ID.power.segments) push(r.powers.filter((p) => p === seg.id).length, MAX_POWERS + 1);
  const raw = n.toString(36).toUpperCase().padStart(16, "0");
  return raw.match(/.{1,4}/g)!.join("-");
}

/** Deterministic 32-bit seed from every result: change any spin and the whole character changes. */
export function seedOf(r: CompleteRoll): number {
  const key = [...ID_WHEELS.map((id) => r[id]), [...r.powers].sort().join("+")].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Chance the slice had when it was rolled (after this player's fortune). */
export function chanceOf(r: Roll, id: WheelId, segmentId: string): number {
  return wheelFor(r, id).segments.find((x) => x.id === segmentId)?.weight ?? 0;
}

export const tierOf = (id: WheelId, segmentId: string) => segmentOf(id, segmentId).tier;
