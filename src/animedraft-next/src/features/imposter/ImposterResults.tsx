"use client";
import { useEffect } from "react";
import { confetti } from "@/lib/fx";
import { SecretDisplay } from "./SecretViews";
import { secretName, type ImposterState } from "./engine";
import s from "./imposter.module.css";

interface Props {
  state: ImposterState;
  scores: Record<string, number>;
  onAgain: () => void;
  onSettings: () => void;
}

export default function ImposterResults({ state, scores, onAgain, onSettings }: Props) {
  const crew = state.winner === "crew";
  useEffect(() => {
    confetti();
  }, []);
  const imps = state.imposters.map((i) => state.players[i]);
  const ranked = state.players.map((n) => [n, scores[n] ?? 0] as const).sort((a, b) => b[1] - a[1]);

  return (
    <div className="narrow">
      <div className="banner" style={{ ["--pc" as string]: crew ? "#1c9e72" : "#ff3d2e" }}>
        <div className="kicker" style={{ color: "#fff" }}>
          {state.how === "guessed" ? "Correct guess. Win stolen!" : state.how === "outnumbered" ? "Imposters took over" : "All imposters caught"}
        </div>
        <h2>{crew ? "Crew wins" : "Imposters win"}</h2>
        <div style={{ marginTop: 6, fontWeight: 700 }}>
          {imps.length > 1 ? "Imposters" : "Imposter"}: {imps.join(", ")}
        </div>
      </div>

      <div className={s.endReveal}>
        <div className={s.endCol}>
          <span className={s.youAre}>The secret {state.secret.kind}</span>
          <SecretDisplay secret={state.secret} />
        </div>
        {state.decoy && (
          <div className={s.endCol}>
            <span className={s.youAre}>{state.config.hint === "undercover" ? "Undercover had" : "Imposter's hint"}</span>
            <SecretDisplay secret={state.decoy} />
          </div>
        )}
        {state.clue && (
          <div className={s.endCol}>
            <span className={s.youAre}>Imposter&apos;s clue</span>
            <b className={s.clue}>{state.clue}</b>
          </div>
        )}
      </div>
      {state.guessed && state.guessed !== state.secret.key && (
        <p className="note center">
          Final guess was {secretName({ kind: state.secret.kind, key: state.guessed })}.
        </p>
      )}

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="kicker">Session scoreboard</div>
        {ranked.map(([name, pts]) => (
          <div className={s.lb} key={name}>
            <span>{name}</span>
            <span>{pts}</span>
          </div>
        ))}
        <p className="note">Crew win +1 each · imposter win +2 each</p>
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onAgain}>
          Play again
        </button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}
