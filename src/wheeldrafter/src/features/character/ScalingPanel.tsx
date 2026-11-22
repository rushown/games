"use client";
import { HAX, INTELLECT, MAX_HAX, MAX_IQ, MAX_LEVEL, MAX_SPEED, SPEEDS, levelName } from "@/lib/scaling";
import type { CharacterSummary } from "@/lib/summary";
import s from "./character.module.css";

/** How strong the legend really is: attack level, durability, speed, intellect and hax on shared ladders. */
export default function ScalingPanel({ sum }: { sum: CharacterSummary }) {
  const p = sum.scaling;
  const beyond = sum.tier === "BEYOND";
  const rows: [string, string, number][] = [
    ["Attack", levelName(p.ap), p.ap / MAX_LEVEL],
    ["Durability", levelName(p.dur), p.dur / MAX_LEVEL],
    ["Speed", SPEEDS[p.spd], p.spd / MAX_SPEED],
    ["Intellect", INTELLECT[p.iq], p.iq / MAX_IQ],
    ["Hax", HAX[p.hax], p.hax / MAX_HAX],
  ];
  return (
    <div className={s.scaling} data-ui="scaling">
      <div className={s.scalingHead}>
        <div className="kicker">Power scaling</div>
        <span className={`${s.tierBadge} ${beyond ? s.tierBeyond : ""}`}>{beyond ? "∞ BEYOND" : `${sum.tier} TIER`}</span>
      </div>
      <div className={s.scaleLine}>{levelName(p.ap)}</div>
      <div className={s.powerRow}>
        <span>Combat</span>
        <div className={s.powerBar}>
          <i style={{ width: `${sum.combat}%` }} />
        </div>
        <b>{sum.combat}</b>
      </div>
      <div className={s.ladder}>
        {rows.map(([k, v, f]) => (
          <div className={s.lRow} key={k}>
            <span className={s.lKey}>{k}</span>
            <span className={s.lVal}>{v}</span>
            <div className={s.lBar} aria-hidden>
              <i style={{ width: `${Math.max(3, f * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {p.notes.length > 0 && (
        <ul className={s.notes}>
          {p.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <p className="note" style={{ marginBottom: 0 }}>
        {beyond
          ? "Outerversal: beats any legend below this level, whatever their luck."
          : "Duels are decided by scaling: attack level weighs most, then hax, durability, speed and intellect."}
      </p>
    </div>
  );
}
