"use client";
import { useEffect, type ReactNode } from "react";
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
