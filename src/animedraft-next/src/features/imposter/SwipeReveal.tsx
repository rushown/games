"use client";
import { useRef, useState, type ReactNode } from "react";
import { buzz } from "@/lib/fx";
import s from "./imposter.module.css";

/**
 * A cover the player drags up to peek at what's underneath. Releasing snaps it back,
 * so the secret is only visible while the finger is down. `onSeen` fires once the
 * cover has been lifted far enough to read the card.
 */
export default function SwipeReveal({ children, onSeen }: { children: ReactNode; onSeen: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const seen = useRef(false);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const end = () => {
    start.current = null;
    setDragging(false);
    setDy(0);
  };

  return (
    <div className={s.swipe} ref={box}>
      <div className={s.under} aria-hidden={dy === 0}>
        {children}
      </div>
      <div
        className={s.cover}
        style={{ transform: `translateY(${dy}px)`, transition: dragging ? "none" : undefined }}
        onPointerDown={(e) => {
          start.current = e.clientY;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current === null) return;
          const d = Math.min(0, e.clientY - start.current);
          setDy(d);
          const h = box.current?.clientHeight ?? 400;
          if (!seen.current && -d > h * 0.45) {
            seen.current = true;
            buzz(25);
            onSeen();
          }
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        aria-label="Swipe up and hold to see your secret"
        tabIndex={0}
        onKeyDown={(e) => {
          // keyboard / accessibility fallback: hold Space to peek
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setDy(-(box.current?.clientHeight ?? 400) * 0.8);
            if (!seen.current) {
              seen.current = true;
              onSeen();
            }
          }
        }}
        onKeyUp={() => setDy(0)}
      >
        <div className={s.coverQ}>?</div>
        <div className={s.coverHint}>
          <span className={s.arrow}>⬆</span>
          SWIPE UP &amp; HOLD TO PEEK
        </div>
      </div>
    </div>
  );
}
