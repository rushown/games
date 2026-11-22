"use client";
import CharacterCard from "@/components/CharacterCard";
import { ScalingProfile } from "@/components/ui";
import { duelReason } from "@/lib/battle";
import type { Pair } from "./engine";
import s from "./choose.module.css";

/** The two fighters side by side; optionally tappable, optionally showing the result. */
export function Matchup({
  pair,
  winner,
  onPick,
}: {
  pair: Pair;
  winner?: 0 | 1 | null;
  onPick?: (i: 0 | 1) => void;
}) {
  const shown = winner !== undefined && winner !== null;
  return (
    <div className={s.duel}>
      {pair.map((c, i) => (
        <div key={c.key} className={s.fighter} data-ui={`fighter-${i}`} style={{ order: i === 0 ? 0 : 2 }}>
          <CharacterCard
            character={c}
            state={shown ? (i === winner ? "win" : "lose") : undefined}
            onClick={onPick && !shown ? () => onPick(i as 0 | 1) : undefined}
          />
        </div>
      ))}
      <div className={s.vs} style={{ order: 1 }}>
        VS
      </div>
    </div>
  );
}

export function FightBreakdown({ pair, winner }: { pair: Pair; winner: 0 | 1 }) {
  return (
    <div className="panel">
      <div className={s.verdict}>{pair[winner].name} wins</div>
      <p className="center" style={{ margin: "0 0 4px", fontSize: 14 }}>
        {duelReason(pair[winner], pair[1 - winner])}
      </p>
      <p className="note center" style={{ margin: "0 0 12px" }}>
        Combat rating {pair[0].rating} vs {pair[1].rating}
      </p>
      <div className={s.profiles}>
        {pair.map((c, i) => (
          <div key={c.key} className={i === winner ? s.pWin : undefined}>
            <div className={s.pName}>{c.name}</div>
            <ScalingProfile c={c} />
          </div>
        ))}
      </div>
    </div>
  );
}
