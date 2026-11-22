"use client";
import { useEffect, useRef, useState } from "react";
import CharacterCard from "@/components/CharacterCard";
import { buzz, confetti } from "@/lib/fx";
import { bracketPick, bracketProgress, newBracket, roundLabel, type Pair } from "./engine";
import { Matchup } from "./FightReveal";
import s from "./choose.module.css";

export default function BracketGame({ onExit, onAgain }: { onExit: () => void; onAgain: () => void }) {
  const [b, setB] = useState(() => newBracket());
  const lastTap = useRef(0);
  const done = b.round.length === 1;

  useEffect(() => {
    if (done) confetti();
  }, [done]);

  if (done) {
    const champ = b.round[0];
    return (
      <div className="narrow">
        <button className="backlink" onClick={onExit}>
          ← Exit
        </button>
        <div className="banner" style={{ ["--pc" as string]: "var(--gold)" }}>
          <div className="kicker" style={{ color: "var(--ink)" }}>
            Your champion
          </div>
          <h2 style={{ color: "var(--ink)" }}>{champ.name}</h2>
        </div>
        <div style={{ maxWidth: 220, margin: "18px auto" }}>
          <CharacterCard character={champ} state="win" />
        </div>
        <button className="btn block" onClick={onAgain}>
          New bracket
        </button>
      </div>
    );
  }

  const n = b.round.length;
  const pair: Pair = [b.round[b.index], b.round[b.index + 1]];
  return (
    <div className="narrow">
      <button className="backlink" onClick={onExit}>
        ← Exit
      </button>
      <div className="kicker center">
        {roundLabel(n)} · match {b.index / 2 + 1}/{n / 2}
      </div>
      <div className={s.prog}>
        <i style={{ width: `${bracketProgress(b) * 100}%` }} />
      </div>
      <h2 className={s.ask}>Who do you pick?</h2>
      <Matchup
        key={b.round.length * 100 + b.index}
        pair={pair}
        onPick={(i) => {
          if (Date.now() - lastTap.current < 250) return; // ignore double taps
          lastTap.current = Date.now();
          buzz(10);
          setB((x) => bracketPick(x, i));
        }}
      />
      <p className="note center">Your favourite, not necessarily the strongest.</p>
    </div>
  );
}
