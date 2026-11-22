"use client";
import { useEffect, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import ImposterSetup from "./ImposterSetup";
import RevealPhase from "./RevealPhase";
import DiscussPhase from "./DiscussPhase";
import { VotePhase, VotedPhase } from "./VotePhase";
import GuessPhase from "./GuessPhase";
import ImposterResults from "./ImposterResults";
import {
  afterVote,
  createImposterGame,
  DEFAULT_IMPOSTER_CONFIG,
  eliminate,
  guess,
  pointsFor,
  revealNext,
  skipVote,
  startVote,
  type ImposterState,
} from "./engine";

export default function ImposterGame() {
  const [config, setConfig] = usePersistentState("imposter-config", DEFAULT_IMPOSTER_CONFIG);
  const [board, setBoard] = usePersistentState<{ scores: Record<string, number>; recent: string[] }>("imposter-board", {
    scores: {},
    recent: [],
  });
  const [game, setGame] = useState<ImposterState | null>(null);

  const start = () => {
    const g = createImposterGame(config, board.recent);
    setBoard((b) => ({ ...b, recent: [g.secret.key, ...b.recent].slice(0, 15) }));
    setGame(g);
  };
  const update = (fn: (g: ImposterState) => ImposterState) => setGame((g) => (g ? fn(g) : g));

  // award session points once per finished game
  const scored = useRef<ImposterState | null>(null);
  useEffect(() => {
    if (game?.phase !== "end" || scored.current === game) return;
    scored.current = game;
    const pts = pointsFor(game);
    setBoard((b) => {
      const scores = { ...b.scores };
      for (const [n, p] of Object.entries(pts)) scores[n] = (scores[n] ?? 0) + p;
      return { ...b, scores };
    });
  }, [game, setBoard]);
  const quit = () => setGame(null);

  if (!game)
    return (
      <ImposterSetup
        config={config}
        onChange={setConfig}
        onStart={start}
        scores={board.scores}
        onResetScores={() => setBoard((b) => ({ ...b, scores: {} }))}
      />
    );

  switch (game.phase) {
    case "reveal":
      return <RevealPhase key={game.revealIdx} state={game} onNext={() => update(revealNext)} onQuit={quit} />;
    case "discuss":
      return <DiscussPhase key={game.round} state={game} onVote={() => update(startVote)} onQuit={quit} />;
    case "vote":
      return (
        <VotePhase
          state={game}
          onEliminate={(i) => update((g) => eliminate(g, i))}
          onSkip={() => update(skipVote)}
        />
      );
    case "voted":
      return <VotedPhase state={game} onContinue={() => update((g) => afterVote(g))} />;
    case "guess":
      return <GuessPhase state={game} onGuess={(k) => update((g) => guess(g, k))} />;
    case "end":
      return <ImposterResults state={game} scores={board.scores} onAgain={start} onSettings={quit} />;
  }
}
