"use client";
import { useState } from "react";
import { buzz } from "@/lib/fx";
import { makePair, pairWinner } from "./engine";
import { FightBreakdown, Matchup } from "./FightReveal";
import s from "./choose.module.css";

interface Props {
  best: number;
  onBest: (n: number) => void;
  onExit: () => void;
  onAgain: () => void;
}

export default function SoloStreak({ best, onBest, onExit, onAgain }: Props) {
  const [pair, setPair] = useState(() => makePair());
  const [pick, setPick] = useState<0 | 1 | null>(null);
  const [streak, setStreak] = useState(0);
  const winner = pairWinner(pair);
  const revealed = pick !== null;
  const correct = pick === winner;

  const choose = (i: 0 | 1) => {
    if (revealed) return;
    setPick(i);
    if (i === winner) {
      const n = streak + 1;
      setStreak(n);
      buzz(20);
      if (n > best) onBest(n);
    } else buzz([40, 40, 40]);
  };
  const next = () => {
    setPair((p) => makePair(p));
    setPick(null);
  };

  return (
    <div className="narrow">
      <button className="backlink" onClick={onExit}>
        ← Exit
      </button>
      <div className={s.score}>
        <span>
          STREAK <b>{streak}</b>
        </span>
        <span className="muted">
          BEST <b>{Math.max(best, streak)}</b>
        </span>
      </div>
      <h2 className={s.ask}>{revealed ? (correct ? "Correct!" : "Wrong call") : "Who wins?"}</h2>
      <Matchup pair={pair} winner={revealed ? winner : undefined} onPick={choose} />
      {revealed ? (
        <>
          <FightBreakdown pair={pair} winner={winner} />
          <div style={{ marginTop: 14 }}>
            {correct ? (
              <button className="btn gold block" onClick={next}>
                Next fight →
              </button>
            ) : (
              <>
                <p className="center" style={{ fontWeight: 900 }}>
                  Run over at {streak}
                  {streak > 0 && streak >= best ? " · new best!" : ""}
                </p>
                <button className="btn block" onClick={onAgain}>
                  Try again
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="note center">Tap the character you think wins.</p>
      )}
    </div>
  );
}
