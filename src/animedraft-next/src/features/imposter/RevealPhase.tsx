"use client";
import { useState } from "react";
import SwipeReveal from "./SwipeReveal";
import { PlayerCardView } from "./SecretViews";
import { cardFor, type ImposterState } from "./engine";
import s from "./imposter.module.css";

export default function RevealPhase({ state, onNext, onQuit }: { state: ImposterState; onNext: () => void; onQuit: () => void }) {
  const [seen, setSeen] = useState(false);
  const i = state.revealIdx;
  const last = i + 1 >= state.players.length;
  return (
    <div className={`narrow ${s.pass}`}>
      <button className="backlink" onClick={onQuit}>
        ← End game
      </button>
      <div className="kicker">
        Player {i + 1} of {state.players.length}
      </div>
      <h2 className={s.passTo}>
        Pass to <em>{state.players[i]}</em>
      </h2>
      <p className="note">Make sure nobody else can see the screen.</p>
      <SwipeReveal onSeen={() => setSeen(true)}>
        <PlayerCardView card={cardFor(state, i)} />
      </SwipeReveal>
      <button className="btn block" style={{ maxWidth: 340 }} disabled={!seen} onClick={onNext}>
        {last ? "Everyone's seen it. Start!" : "Got it, hide & pass →"}
      </button>
    </div>
  );
}
