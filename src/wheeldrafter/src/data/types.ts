export type WheelId =
  | "race"
  | "strength"
  | "durability"
  | "speed"
  | "intelligence"
  | "powerCount"
  | "power"
  | "weapon"
  | "alignment";

export interface Segment {
  id: string;
  /** Full name shown in results. */
  label: string;
  /** Short name printed on the wheel slice. */
  short: string;
  /** Relative chance (each wheel's weights add up to 100). */
  weight: number;
  /** Power tier 0 (lowest) … 11 (boundless). Drives colour, rating and the portrait. */
  tier: number;
  desc: string;
}

export interface Wheel {
  id: WheelId;
  name: string;
  /** Short prompt shown above the wheel. */
  ask: string;
  /** How much this wheel counts toward the power rating (0 = flavour only). */
  scoreWeight: number;
  segments: Segment[];
}

/** Everything one player has rolled. `powers` is in spin order (duplicates = awakened). */
export interface Roll {
  race?: string;
  strength?: string;
  durability?: string;
  speed?: string;
  intelligence?: string;
  powerCount?: string;
  powers: string[];
  weapon?: string;
  alignment?: string;
}

export type CompleteRoll = Required<Roll>;

/** Single-choice wheels stored directly on the roll. */
export type SingleWheelId = Exclude<WheelId, "power">;
