"use client";
import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import CharacterReveal from "@/features/character/CharacterReveal";
import DuelReveal from "@/features/character/DuelReveal";
import type { CompleteRoll } from "@/data/types";
import { createGame, DEFAULT_GAME_CONFIG, type GameState } from "./engine";
import Setup from "./Setup";
import SpinStage from "./SpinStage";

export default function PlayView() {
  const [config, setConfig] = usePersistentState("wd-config-v2", DEFAULT_GAME_CONFIG);
  const [game, setGame] = useState<GameState | null>(null);
  const [round, setRound] = useState(0);
  const start = () => {
    setGame(createGame(config));
    setRound((r) => r + 1);
  };
  const quit = () => setGame(null);

  if (!game) return <Setup config={config} onChange={setConfig} onStart={start} />;
  if (game.phase !== "done") return <SpinStage key={round} game={game} setGame={setGame} config={config} onQuit={quit} />;
  if (game.mode === "solo") {
    const p = game.players[0];
    return <CharacterReveal key={round} roll={p.roll as CompleteRoll} owner={p.name} onAgain={start} />;
  }
  return <DuelReveal key={round} players={game.players} onAgain={start} onSettings={quit} />;
}
