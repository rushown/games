"use client";
import { useEffect, type ReactNode } from "react";
import type { Character } from "@/data";
import { HAX, INTELLECT, LEVELS, MAX_HAX, MAX_IQ, MAX_LEVEL, MAX_SPEED, SPEEDS, levelName } from "@/data/scaling";
import { STAT_KEYS, STAT_LABEL } from "@/lib/battle";
import s from "./ui.module.css";

/* ---------- Segmented control ---------- */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  wrap,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label?: string;
  /** Allow a 2-column grid on narrow screens (for long labels). */
  wrap?: boolean;
}) {
  return (
    <div className={`${s.seg} ${wrap ? s.wrap : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? s.on : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Field wrapper ---------- */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      {children}
      {hint && <p className="note">{hint}</p>}
    </div>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={s.stepRow}>
      <span className="field-label" style={{ margin: 0 }}>
        {label}
      </span>
      <div className={s.stepper}>
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <b aria-live="polite">{value}</b>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

/* ---------- Bottom sheet modal ---------- */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className={s.sheet}>{children}</div>
    </div>
  );
}

/* ---------- Stat bars ---------- */
export function StatBars({ c }: { c: Character }) {
  return (
    <div>
      {STAT_KEYS.map((k) => (
        <div className={s.stat} key={k}>
          <span>{STAT_LABEL[k]}</span>
          <div className={s.bar}>
            <i style={{ width: `${c.stats[k]}%` }} />
          </div>
          <span className="money">{c.stats[k]}</span>
        </div>
      ))}
    </div>
  );
}

/** Mirrored stat comparison (left vs right). Values are scaled to `max`. */
export function CompareBars({
  rows,
  max = 100,
}: {
  rows: { label: string; a: number; b: number }[];
  max?: number;
}) {
  return (
    <div>
      {rows.map((r) => (
        <div className={s.cmp} key={r.label}>
          <span className={s.v}>{r.a}</span>
          <div className={s.l}>
            <i style={{ width: `${Math.min(100, (r.a / max) * 100)}%` }} />
          </div>
          <span className={s.k}>{r.label}</span>
          <div className={s.r}>
            <i style={{ width: `${Math.min(100, (r.b / max) * 100)}%` }} />
          </div>
          <span className={s.v}>{r.b}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Countdown ring ---------- */
export function Ring({ fraction, size = 200, stroke = 12, children }: { fraction: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div className={s.ring} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="ringGrad">
            <stop offset="0" stopColor="#ff3d2e" />
            <stop offset="1" stopColor="#ffc233" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#2c2522" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - f)}
          style={{ transition: "stroke-dashoffset .25s linear" }}
        />
      </svg>
      <div className={s.ringInner}>{children}</div>
    </div>
  );
}

/* ---------- Toast ---------- */
export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className={s.toast} role="status">
      {text}
    </div>
  );
}

/* ---------- Power-scaling profile ---------- */
/** Attack, durability, speed, intellect and hax on their ladders, plus the feat behind them. */
export function ScalingProfile({ c, feat = true }: { c: Character; feat?: boolean }) {
  const p = c.scaling;
  const rows: [string, string, number][] = [
    ["Attack", levelName(p.ap), p.ap / MAX_LEVEL],
    ["Durability", levelName(p.dur), p.dur / MAX_LEVEL],
    ["Speed", SPEEDS[p.spd], p.spd / MAX_SPEED],
    ["Intellect", INTELLECT[p.iq], p.iq / MAX_IQ],
    ["Hax", HAX[p.hax], p.hax / MAX_HAX],
  ];
  return (
    <div className={s.profile}>
      {rows.map(([k, v, f]) => (
        <div className={s.pRow} key={k}>
          <span className={s.pKey}>{k}</span>
          <span className={s.pVal}>{v}</span>
          <div className={s.pBar} aria-hidden>
            <i style={{ width: `${Math.max(4, f * 100)}%` }} />
          </div>
        </div>
      ))}
      {feat && <p className={s.feat}>“{p.feat}”</p>}
    </div>
  );
}
export const LEVEL_COUNT = LEVELS.length;
