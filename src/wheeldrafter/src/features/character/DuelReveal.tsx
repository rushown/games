"use client";
import { useMemo, useState } from "react";
import type { CompleteRoll } from "@/data/types";
import { summarize } from "@/lib/summary";
import { duelReason, duelWinner } from "@/lib/scaling";
import type { PlayerState } from "@/features/game/engine";
import CharacterReveal from "./CharacterReveal";
import Portrait from "./Portrait";
import s from "./character.module.css";

export default function DuelReveal({ players, onAgain, onSettings }: { players: PlayerState[]; onAgain: () => void; onSettings: () => void }) {
  const sums = useMemo(() => players.map((p) => summarize(p.roll as CompleteRoll)), [players]);
  const winner = duelWinner(sums[0].scaling, sums[1].scaling);
  const reason =
    winner === null
      ? "Identical power-scaling profiles: nobody can win this one."
      : duelReason(sums[winner].character.name, sums[winner].scaling, sums[1 - winner].character.name, sums[1 - winner].scaling);
  const [tab, setTab] = useState<number>(winner ?? 0);

  return (
    <div>
      <div className={`banner ${winner !== null ? `p${winner}` : ""}`}>
        <div className="kicker" style={{ color: "#fff" }}>
          Combat {sums[0].combat} vs {sums[1].combat}
        </div>
        <h2>{winner === null ? "Dead even!" : `${players[winner].name} wins`}</h2>
        <p className={s.duelWhy}>{reason}</p>
      </div>

      <div className={s.duelCards}>
        {players.map((p, i) => (
          <button key={i} type="button" className={`${s.duelCard} p${i} ${tab === i ? s.sel : ""}`} onClick={() => setTab(i)} aria-pressed={tab === i}>
            <div className={s.duelPortrait}>
              <Portrait roll={p.roll as CompleteRoll} seed={sums[i].character.seed} level={sums[i].rank.level} />
            </div>
            <div className={s.duelInfo}>
              <span className={s.duelOwner}>
                <span className="dot" /> {p.name}
                {winner === i ? " · Winner" : ""}
              </span>
              <b>{sums[i].character.name}</b>
              <span className={s.duelTop}>
                {sums[i].tier === "BEYOND" ? "∞ Beyond" : `${sums[i].tier} tier`} · Top {sums[i].top}
              </span>
            </div>
          </button>
        ))}
      </div>

      <CharacterReveal key={tab} roll={players[tab].roll as CompleteRoll} owner={players[tab].name} />

      <div className={s.actions} style={{ marginTop: 8 }}>
        <button className="btn" onClick={onAgain}>
          Rematch
        </button>
        <button className="btn ghost" onClick={onSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}
