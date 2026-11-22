import { WHEEL_BY_ID } from "@/data/wheels";
import type { CompleteRoll } from "@/data/types";
import { advance, createGame, currentWheel, DEFAULT_GAME_CONFIG, land, spinResult } from "@/features/game/engine";
import type { Rng } from "@/lib/random";

/** Plays a full solo game through the real engine (fortune, power count, everything). */
export function playSolo(rng: Rng): CompleteRoll {
  let g = createGame(DEFAULT_GAME_CONFIG);
  while (g.phase !== "done") {
    g = land(g, spinResult(currentWheel(g)!, rng).id);
    g = advance(g);
  }
  return g.players[0].roll as CompleteRoll;
}

export const topOf = (id: keyof typeof WHEEL_BY_ID) => {
  const segs = WHEEL_BY_ID[id].segments;
  return segs[segs.length - 1].id;
};
