/**
 * WheelDrafter game engine (pure, no React).
 *
 * Solo: one player spins every wheel. Duel: players alternate one spin at a time; if one player
 * has more power spins than the other, they keep spinning until both characters are complete.
 * Each player gets ONE re-spin, usable while a result is on screen.
 */
import type { Roll, Segment, Wheel, WheelId } from "@/data/types";
import { applySpin, emptyRoll, nextWheel, undoSpin, wheelFor } from "@/lib/roll";
import { defaultRng, type Rng } from "@/lib/random";

export type Mode = "solo" | "duel";

export interface GameConfig {
  mode: Mode;
  names: [string, string];
  /** Shorter spin animation. */
  fast: boolean;
  /** Spin automatically after each transition. */
  auto: boolean;
  /** Duel: turn the screen 180° for player 2 (for sitting across from each other). */
  flip: boolean;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mode: "solo",
  names: ["Player 1", "Player 2"],
  fast: false,
  auto: false,
  flip: true,
};

export interface PlayerState {
  name: string;
  roll: Roll;
  respins: number;
}

export interface GameState {
  mode: Mode;
  players: PlayerState[];
  turn: number;
  phase: "ready" | "landed" | "done";
  /** The spin currently on screen. */
  last: { wheel: WheelId; segmentId: string; chance: number } | null;
  /** Counts every spin, so UIs can key transitions. */
  spinNo: number;
}

export function createGame(config: GameConfig): GameState {
  const names = config.mode === "solo" ? [config.names[0].trim() || "You"] : config.names.map((n, i) => n.trim() || `Player ${i + 1}`);
  return {
    mode: config.mode,
    players: names.map((name) => ({ name, roll: emptyRoll(), respins: 1 })),
    turn: 0,
    phase: "ready",
    last: null,
    spinNo: 0,
  };
}

/** Wheel the current player is about to spin (or just spun). */
export function currentWheelId(s: GameState): WheelId | null {
  if (s.phase === "landed" && s.last) return s.last.wheel;
  return s.phase === "done" ? null : nextWheel(s.players[s.turn].roll);
}

/** The wheel with this player's fortune applied, as it should be drawn. */
export function currentWheel(s: GameState): Wheel | null {
  const id = currentWheelId(s);
  if (!id) return null;
  // while a result is shown, draw the wheel with the odds it had *before* this spin
  const roll = s.phase === "landed" && s.last ? undoSpin(s.players[s.turn].roll, s.last.wheel) : s.players[s.turn].roll;
  return wheelFor(roll, id);
}

/** Weighted random pick: a slice's chance is proportional to its size on the (tilted) wheel. */
export function spinResult(wheel: Wheel, rng: Rng = defaultRng): Segment {
  const total = wheel.segments.reduce((t, x) => t + x.weight, 0);
  let r = rng() * total;
  for (const seg of wheel.segments) {
    r -= seg.weight;
    if (r < 0) return seg;
  }
  return wheel.segments[wheel.segments.length - 1];
}

export function land(s: GameState, segmentId: string): GameState {
  if (s.phase !== "ready") return s;
  const id = nextWheel(s.players[s.turn].roll);
  if (!id) return s;
  const wheel = wheelFor(s.players[s.turn].roll, id);
  const chance = wheel.segments.find((x) => x.id === segmentId)?.weight ?? 0;
  const players = s.players.slice();
  players[s.turn] = { ...players[s.turn], roll: applySpin(players[s.turn].roll, id, segmentId) };
  return { ...s, players, phase: "landed", last: { wheel: id, segmentId, chance }, spinNo: s.spinNo + 1 };
}

export const canRespin = (s: GameState) => s.phase === "landed" && s.players[s.turn].respins > 0;

export function respin(s: GameState): GameState {
  if (!canRespin(s) || !s.last) return s;
  const players = s.players.slice();
  const p = players[s.turn];
  players[s.turn] = { ...p, roll: undoSpin(p.roll, s.last.wheel), respins: p.respins - 1 };
  return { ...s, players, phase: "ready", last: null };
}

/** Moves on after a result: next player in a duel (if they still have spins), else the same player, else done. */
export function advance(s: GameState): GameState {
  if (s.phase !== "landed") return s;
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const t = (s.turn + k) % n;
    if (nextWheel(s.players[t].roll)) return { ...s, turn: t, phase: "ready", last: null };
  }
  return { ...s, phase: "done", last: null };
}
