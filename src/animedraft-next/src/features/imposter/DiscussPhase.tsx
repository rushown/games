"use client";
import { useEffect, useRef, useState } from "react";
import { Ring } from "@/components/ui";
import { buzz } from "@/lib/fx";
import { speakingOrder, type ImposterState } from "./engine";
import s from "./imposter.module.css";

export default function DiscussPhase({ state, onVote, onQuit }: { state: ImposterState; onVote: () => void; onQuit: () => void }) {
  const total0 = state.config.timer;
  const [total, setTotal] = useState(total0);
  const [left, setLeft] = useState(total0);
  const [paused, setPaused] = useState(false);
  const [spoken, setSpoken] = useState<number[]>([]);
  const order = speakingOrder(state);
  const done = useRef(false);

  useEffect(() => {
    if (!total0 || paused) return;
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, [total0, paused]);

  useEffect(() => {
    if (total0 && left === 0 && !done.current) {
      done.current = true;
      buzz([200, 100, 200]);
    }
    if (left > 0) done.current = false;
  }, [left, total0]);

  const toggle = (i: number) => setSpoken((sp) => (sp.includes(i) ? sp.filter((x) => x !== i) : [...sp, i]));
  const next = order.find((i) => !spoken.includes(i));

  return (
    <div className="narrow center">
      <div style={{ textAlign: "left" }}>
        <button className="backlink" onClick={onQuit}>
          ← End game
        </button>
      </div>
      <div className="kicker">
        Round {state.round} · {order.length} players left
      </div>
      <h2 className={s.discussTitle}>
        {next !== undefined ? (
          <>
            <em>{state.players[next]}</em>, your word
          </>
        ) : (
          "Everyone's spoken. Discuss!"
        )}
      </h2>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        One word each about the secret. Tap a name once they&apos;ve spoken.
      </p>

      <ol className={s.order}>
        {order.map((i, k) => (
          <li key={i}>
            <button
              type="button"
              className={`${s.orderItem} ${spoken.includes(i) ? s.spoken : ""} ${i === next ? s.current : ""}`}
              onClick={() => toggle(i)}
              aria-pressed={spoken.includes(i)}
            >
              <span className={s.orderNum}>{k + 1}</span>
              <span className={s.orderName}>{state.players[i]}</span>
              {spoken.includes(i) && <span aria-hidden>✓</span>}
            </button>
          </li>
        ))}
      </ol>

      {total0 > 0 && (
        <>
          <Ring fraction={total ? left / total : 0} size={170}>
            <span className={s.timeText}>
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </span>
          </Ring>
          <div className="row" style={{ justifyContent: "center", margin: "10px 0 14px" }}>
            <button
              className="chip"
              onClick={() => {
                setLeft((l) => l + 30);
                setTotal((t) => Math.max(t, left + 30));
              }}
            >
              +30s
            </button>
            <button className="chip" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </>
      )}
      <button className={`btn block ${left === 0 && total0 ? "gold" : ""}`} style={{ maxWidth: 360 }} onClick={onVote}>
        {left === 0 && total0 ? "Time's up! Vote" : "Time to vote"}
      </button>
    </div>
  );
}
