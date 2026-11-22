"use client";
import { useEffect, useState } from "react";
import { buzz, confetti } from "@/lib/fx";
import { makePair, pairWinner, type ChooseConfig, type Pair } from "./engine";
import { FightBreakdown, Matchup } from "./FightReveal";
import s from "./choose.module.css";

interface Props {
  config: ChooseConfig;
  onExit: () => void;
  onAgain: () => void;
}

export default function DuoBattle({ config, onExit, onAgain }: Props) {
  const [pair, setPair] = useState<Pair>(() => makePair());
  const [picks, setPicks] = useState<[0 | 1 | null, 0 | 1 | null]>([null, null]);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState(1);
  const revealed = picks[0] !== null && picks[1] !== null;
  const winner = pairWinner(pair);
  const names = config.names.map((n, i) => n.trim() || `Player ${i + 1}`);
  const over = score.some((x) => x >= config.target) && score[0] !== score[1];

  useEffect(() => {
    if (over) confetti();
  }, [over]);

  const lock = (p: 0 | 1, i: 0 | 1) => {
    if (picks[p] !== null) return;
    buzz(12);
    const next = [...picks] as typeof picks;
    next[p] = i;
    setPicks(next);
    if (next[0] !== null && next[1] !== null)
      setScore(([a, b]) => [a + (next[0] === winner ? 1 : 0), b + (next[1] === winner ? 1 : 0)]);
  };
  const nextRound = () => {
    setPair((p) => makePair(p));
    setPicks([null, null]);
    setRound((r) => r + 1);
  };

  const row = (p: 0 | 1) => (
    <div className={`${s.pickrow} p${p} ${picks[p] !== null ? s.locked : ""} ${p === 1 && config.faceToFace ? s.flip : ""}`}>
      <div className={s.lbl}>
        <span>
          <span className="dot" /> {names[p]}
        </span>
        {picks[p] !== null && <span className={s.lockTag}>LOCKED ✓</span>}
      </div>
      {pair.map((c, i) => (
        <button key={c.key} data-ui={`pick-${p}-${i}`} disabled={picks[p] !== null} onClick={() => lock(p, i as 0 | 1)}>
          {c.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="narrow">
      <button className="backlink" onClick={onExit}>
        ← Exit
      </button>
      {!revealed && row(1)}
      <div className={s.score} style={{ marginTop: 10 }}>
        <span className="p0">
          <span className="dot" /> <b>{score[0]}</b>
        </span>
        <span className="muted">
          Round {round} · first to {config.target}
        </span>
        <span className="p1">
          <b>{score[1]}</b> <span className="dot" />
        </span>
      </div>
      <Matchup pair={pair} winner={revealed ? winner : undefined} />
      {revealed ? (
        <>
          <p className="center" style={{ fontWeight: 700, margin: "0 0 8px" }}>
            {names[0]} {picks[0] === winner ? "✅" : "❌"} · {names[1]} {picks[1] === winner ? "✅" : "❌"}
          </p>
          <FightBreakdown pair={pair} winner={winner} />
          <div style={{ marginTop: 14 }}>
            {over ? (
              <>
                <div className={`banner p${score[0] > score[1] ? 0 : 1}`} style={{ marginBottom: 12 }}>
                  <h2>{names[score[0] > score[1] ? 0 : 1]} wins</h2>
                  <div className="money">
                    {score[0]} – {score[1]}
                  </div>
                </div>
                <button className="btn block" onClick={onAgain}>
                  Play again
                </button>
              </>
            ) : (
              <button className="btn gold block" onClick={nextRound}>
                Next round →
              </button>
            )}
          </div>
        </>
      ) : (
        row(0)
      )}
    </div>
  );
}
