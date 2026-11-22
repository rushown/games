"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TIER_COLORS, TIER_NAMES, formatMultiplier, fortuneOf, segmentOf, textOnTier } from "@/data/wheels";
import type { CompleteRoll, SingleWheelId, WheelId } from "@/data/types";
import { confetti } from "@/lib/fx";
import { chanceOf, groupedPowers } from "@/lib/roll";
import { saveLegend, summarize } from "@/lib/summary";
import { pct } from "@/features/wheel/OddsList";
import Portrait from "./Portrait";
import ScalingPanel from "./ScalingPanel";
import s from "./character.module.css";

interface Props {
  roll: CompleteRoll;
  owner: string;
  onAgain?: () => void;
  /** Browsing a saved legend: no saving, no celebration. */
  archived?: boolean;
}

const SINGLE: [SingleWheelId, string][] = [
  ["race", "Race"],
  ["strength", "Strength"],
  ["durability", "Durability"],
  ["speed", "Speed"],
  ["intelligence", "Intelligence"],
];

export default function CharacterReveal({ roll, owner, onAgain, archived }: Props) {
  const sum = useMemo(() => summarize(roll), [roll]);
  const { character: c, rank } = sum;
  const saved = useRef(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fortune = fortuneOf(roll.race);
  const odds = { ...roll, powers: [] };

  useEffect(() => {
    if (archived || saved.current) return;
    saved.current = true;
    saveLegend({ roll, owner, at: Date.now() });
    if (rank.level >= 3) confetti(30 + rank.level * 12);
  }, [archived, roll, owner, rank.level]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied("select");
    }
    window.setTimeout(() => setCopied(null), 1800);
  };

  const row = (key: string, label: string, wheel: WheelId, id: string, note?: string) => {
    const seg = segmentOf(wheel, id);
    return (
      <li key={key} className={s.trait}>
        <span className={s.tk}>{label}</span>
        <span className={s.tv}>
          {note && <em className={s.awk}>{note} </em>}
          {seg.label}
        </span>
        {seg.tier >= 0 ? (
          <span className={s.tt} style={{ background: TIER_COLORS[seg.tier], color: textOnTier(seg.tier) }}>
            {TIER_NAMES[seg.tier]}
          </span>
        ) : (
          <span className={s.tt} />
        )}
        <span className={s.tp}>{pct(Math.round(chanceOf(odds, wheel, id) * 10) / 10)}</span>
      </li>
    );
  };

  const powers = groupedPowers(roll.powers);
  const shareText = `${c.name}, ${c.epithet}: ${rank.title}, ${sum.tier === "BEYOND" ? "∞ Beyond" : `${sum.tier} tier`} (combat ${sum.combat}), Top ${sum.top} (${sum.oneIn}). Legend ${sum.id} · WheelDrafter`;

  return (
    <div className={s.reveal}>
      <div className={s.hero}>
        <div className={`${s.portraitCol} ${s[`lv${rank.level}`] ?? ""}`}>
          <div className={s.card}>
            <Portrait roll={roll} seed={c.seed} level={rank.level} className={s.portrait} />
            <span className={s.rankChip}>{rank.title}</span>
          </div>
          <div className={s.nameBlock}>
            <h1 className={s.name}>{c.name}</h1>
            <div className={s.epithet}>{c.epithet}</div>
            <div className={s.legendId} title="Unique to this exact combination of spins">
              Legend {sum.id}
            </div>
          </div>
        </div>

        <div className={s.side}>
          <div className={s.rating}>
            <div className="kicker">Rarity</div>
            <div className={s.top}>
              Top <span>{sum.top}</span>
            </div>
            <div className={s.oneIn}>{sum.oneIn} rolls is this lucky</div>
            <div className="note">
              {fortune > 0 ? `${segmentOf("race", roll.race).label} fortune boosted rare slices up to ${formatMultiplier(fortune)}. ` : ""}
              Rolled by {owner}.
            </div>
          </div>

          <ScalingPanel sum={sum} />

          <ul className={s.traits}>
            {SINGLE.map(([id, label]) => row(id, label, id, roll[id]))}
            {row("count", "Powers", "powerCount", roll.powerCount)}
            {powers.map((p, i) => row(`p${p.id}`, `Power ${i + 1}`, "power", p.id, p.count >= 2 ? `Awakened${p.count > 2 ? ` ×${p.count}` : ""}` : undefined))}
            {row("weapon", "Weapon", "weapon", roll.weapon)}
            {row("path", "Path", "alignment", roll.alignment)}
          </ul>
        </div>
      </div>

      <section className={s.block}>
        <h2 className={s.h2}>Backstory</h2>
        {c.backstory.map((para, i) => (
          <p key={i} className={s.para}>
            {para}
          </p>
        ))}
      </section>

      <section className={s.block}>
        <h2 className={s.h2}>Image prompt</h2>
        <p className="note" style={{ marginTop: 0 }}>
          The portrait is drawn from your spins with math. For a fully illustrated version, paste this into any AI image
          generator.
        </p>
        <textarea className={s.prompt} readOnly value={c.prompt} rows={4} onFocus={(e) => e.currentTarget.select()} aria-label="Image prompt" />
        <button className="btn ghost sm" onClick={() => copy(c.prompt, "prompt")}>
          {copied === "prompt" ? "Copied" : copied === "select" ? "Select & copy manually" : "Copy prompt"}
        </button>
      </section>

      <div className={s.actions}>
        {onAgain && (
          <button className="btn" onClick={onAgain}>
            Spin a new character
          </button>
        )}
        <button className="btn ghost" onClick={() => copy(shareText, "share")}>
          {copied === "share" ? "Copied" : "Copy result"}
        </button>
        {!archived && (
          <Link className="btn ghost" href="/legends">
            Hall of Legends
          </Link>
        )}
      </div>
    </div>
  );
}
