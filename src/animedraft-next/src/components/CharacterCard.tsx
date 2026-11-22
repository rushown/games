"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { CHARACTER_BY_KEY, SERIES_BY_KEY, type Character } from "@/data";
import { useCharacterImage } from "@/lib/images";
import s from "./CharacterCard.module.css";

function textOn(c1: string, c2: string) {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  };
  return (lum(c1) + lum(c2)) / 2 > 150 ? "#14100d" : "#fff8ec";
}

export interface CharacterCardProps {
  character: Character | string;
  /** Hide name/series/tier (tiny avatars). */
  compact?: boolean;
  /** Replaces the tier badge, e.g. a price tag. */
  badge?: ReactNode;
  selected?: boolean;
  state?: "win" | "lose";
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Character tile showing the character's real AniList portrait. While it loads (or if
 * AniList is unreachable) it shows a series-coloured placeholder with initials.
 */
export default function CharacterCard({ character, compact, badge, selected, state, onClick, className, style }: CharacterCardProps) {
  const c = typeof character === "string" ? CHARACTER_BY_KEY[character] : character;
  const series = SERIES_BY_KEY[c.series];
  const src = useCharacterImage(c.key);
  const [failed, setFailed] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const showImg = !!src && failed !== src;
  const loaded = showImg && loadedSrc === src;
  const vars = {
    "--c1": series.colors[0],
    "--c2": series.colors[1],
    "--tc": textOn(series.colors[0], series.colors[1]),
    ...style,
  } as CSSProperties;
  const cls = [s.card, c.tier === "BEYOND" && s.goat, compact && s.compact, selected && s.selected, state === "win" && s.win, state === "lose" && s.lose, onClick && s.tap, className]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`${s.img} ${loaded ? s.in : ""}`}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailed(src)}
        />
      )}
      {!loaded && (
        <div className={s.ini} aria-hidden>
          {c.initials}
        </div>
      )}
      {!compact && (
        <>
          <span className={s.ser}>{series.short}</span>
          {badge ?? (
            <span className={`${s.tier} ${c.tier === "SSS" ? s.sss : ""} ${c.tier === "BEYOND" ? s.beyond : ""}`} title={c.tier === "BEYOND" ? "Beyond every rating" : `Tier ${c.tier}`}>
              {c.tier === "BEYOND" ? "∞" : c.tier}
            </span>
          )}
          <div className={s.nm}>
            <b>{c.name}</b>
            <i>{c.title}</i>
          </div>
        </>
      )}
      {compact && badge}
    </>
  );

  return onClick ? (
    <button type="button" className={cls} style={vars} onClick={onClick} aria-label={c.name} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={cls} style={vars} role="img" aria-label={c.name}>
      {body}
    </div>
  );
}
