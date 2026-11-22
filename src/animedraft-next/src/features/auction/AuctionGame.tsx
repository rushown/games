"use client";
import { useCallback, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { auctionReducer, createAuction, DEFAULT_CONFIG, type AuctionAction, type AuctionState } from "./engine";
import AuctionSetup from "./AuctionSetup";
import AuctionStage from "./AuctionStage";
import AuctionResults from "./AuctionResults";

/** Actions that settle a lot: the host can undo these one at a time. */
const SETTLES = new Set<AuctionAction["type"]>(["assign", "hammer", "skip", "keep", "accept"]);

interface Run {
  game: AuctionState | null;
  /** Earlier states, for "Undo last". */
  past: AuctionState[];
}

/** Draft Duel: switches between setup, the live auction and the results. */
export default function AuctionGame() {
  const [config, setConfig] = usePersistentState("auction-config", DEFAULT_CONFIG);
  const [run, setRun] = useState<Run>({ game: null, past: [] });

  const dispatch = useCallback(
    (a: AuctionAction) =>
      setRun((r) => {
        if (!r.game) return r;
        const next = auctionReducer(r.game, a);
        if (next === r.game) return r;
        return { game: next, past: SETTLES.has(a.type) ? [...r.past, r.game].slice(-40) : r.past };
      }),
    [],
  );
  const undo = useCallback(() => setRun((r) => (r.past.length ? { game: r.past[r.past.length - 1], past: r.past.slice(0, -1) } : r)), []);
  const start = () => setRun({ game: createAuction(config), past: [] });
  const quit = () => setRun({ game: null, past: [] });

  const { game } = run;
  if (!game) return <AuctionSetup config={config} onChange={setConfig} onStart={start} />;
  if (game.phase === "done") return <AuctionResults state={game} onRematch={start} onSettings={quit} />;
  return <AuctionStage state={game} dispatch={dispatch} onExit={quit} canUndo={run.past.length > 0} onUndo={undo} />;
}
