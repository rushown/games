import type { Wheel } from "@/data/types";
import { TIER_NAMES, sliceColor } from "@/data/wheels";
import s from "./wheel.module.css";

export const pct = (w: number) => {
  if (w >= 10 || w % 1 === 0) return `${Math.round(w * 10) / 10}%`;
  return `${w < 1 ? w.toFixed(2).replace(/0$/, "") : w.toFixed(1)}%`;
};

/** Every slice with its chance. With `base`, the un-boosted odds are shown faded alongside. */
export default function OddsList({ wheel, highlight, base }: { wheel: Wheel; highlight?: string | null; base?: Wheel }) {
  return (
    <ul className={s.odds}>
      {wheel.segments.map((seg, i) => (
        <li key={seg.id} className={`${s.oddsRow} ${seg.id === highlight ? s.on : ""}`}>
          <span className={s.sw} style={{ background: sliceColor(seg, i) }} />
          <span className={s.oddsName}>{seg.label}</span>
          <span className={s.oddsTier}>
            {base ? <s className={s.base}>{pct(base.segments[i].weight)}</s> : seg.tier >= 0 ? TIER_NAMES[seg.tier] : ""}
          </span>
          <span className={s.oddsPct}>{pct(seg.weight)}</span>
        </li>
      ))}
    </ul>
  );
}
