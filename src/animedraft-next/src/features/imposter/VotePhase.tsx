"use client";
import { useEffect, useState } from "react";
import { confetti } from "@/lib/fx";
import { canGuess, secretName, winCheck, type ImposterState } from "./engine";
import s from "./imposter.module.css";

const AVATAR = ["#ff3d2e", "#ffc233", "#2ee6a6", "#ff5fa2", "#ff8a00", "#c77dff", "#f3ead8", "#8fbf6a"];

export function VotePhase({
  state,
  onEliminate,
  onSkip,
}: {
  state: ImposterState;
  onEliminate: (i: number) => void;
  onSkip: () => void;
}) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="narrow">
      <div className="center">
        <div className="kicker">Round {state.round}</div>
        <h2 className={s.discussTitle}>Who&apos;s the imposter?</h2>
        <p className="muted" style={{ margin: "0 0 16px" }}>
          Agree as a group, then tap them.
        </p>
      </div>
      <div className={s.plist}>
        {state.players.map((name, i) => (
          <button
            key={i}
            type="button"
            className={`${s.pbtn} ${sel === i ? s.on : ""}`}
            data-ui="vote-player"
            disabled={!state.alive[i]}
            onClick={() => setSel(i)}
            aria-pressed={sel === i}
          >
            <span className={s.av} style={{ background: AVATAR[i % AVATAR.length] }}>
              {(name[0] ?? "?").toUpperCase()}
            </span>
            <span className={s.pn}>{name}</span>
          </button>
        ))}
      </div>
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="btn block" disabled={sel === null} onClick={() => sel !== null && onEliminate(sel)}>
          {sel === null ? "Select a player" : `Eliminate ${state.players[sel]}`}
        </button>
        <button className="btn ghost block" onClick={onSkip}>
          Skip vote (nobody out)
        </button>
      </div>
    </div>
  );
}

export function VotedPhase({ state, onContinue }: { state: ImposterState; onContinue: () => void }) {
  const i = state.lastOut!;
  const was = state.imposters.includes(i);
  const guessing = canGuess(state);
  const ends = !guessing && winCheck(state) !== null;
  useEffect(() => {
    if (was) confetti(40);
  }, [was]);

  return (
    <div className="narrow center" style={{ paddingTop: 10 }}>
      <div className="kicker">The vote is in</div>
      <h2 className={s.outName}>{state.players[i]}</h2>
      <div className={`${s.verdict} ${was ? s.good : s.bad}`}>
        {was ? (state.config.hint === "undercover" ? "WAS UNDERCOVER" : "WAS THE IMPOSTER") : "WAS INNOCENT"}
      </div>
      <p className="muted" style={{ margin: "18px 0" }}>
        {was
          ? state.config.hint === "undercover"
            ? `They had ${secretName(state.decoy!)} instead.`
            : "But they get one last shot to steal the win…"
          : "Oof. The imposter is still among you."}
      </p>
      <button className={`btn block ${guessing ? "gold" : ""}`} style={{ maxWidth: 360 }} onClick={onContinue}>
        {guessing ? `${state.players[i]}: guess the ${state.secret.kind}` : ends ? "See results" : "Next round"}
      </button>
    </div>
  );
}
