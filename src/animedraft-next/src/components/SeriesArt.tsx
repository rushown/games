"use client";
import { useState, type CSSProperties } from "react";
import { charactersOf, SERIES_BY_KEY } from "@/data";
import { useSeriesImage } from "@/lib/images";
import s from "./SeriesArt.module.css";

function vars(key: string) {
  const sr = SERIES_BY_KEY[key];
  return { "--c1": sr.colors[0], "--c2": sr.colors[1] } as CSSProperties;
}

/** Tall cover-art card for a series (2:3 like a poster). */
export function SeriesPoster({
  seriesKey,
  onClick,
  selected,
  showCount,
}: {
  seriesKey: string;
  onClick?: () => void;
  selected?: boolean;
  showCount?: boolean;
}) {
  const sr = SERIES_BY_KEY[seriesKey];
  const { cover } = useSeriesImage(seriesKey);
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const body = (
    <>
      {cover && ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`${s.img} ${loaded ? s.in : ""}`}
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setOk(false)}
        />
      )}
      <span className={s.short}>{sr.short}</span>
      {showCount && <span className={s.count}>{charactersOf(seriesKey).length}</span>}
      <b className={s.name}>{sr.name}</b>
    </>
  );
  const cls = `${s.poster} ${selected ? s.selected : ""} ${onClick ? s.tap : ""}`;
  return onClick ? (
    <button type="button" className={cls} style={vars(seriesKey)} onClick={onClick} aria-label={sr.name} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={cls} style={vars(seriesKey)} role="img" aria-label={sr.name}>
      {body}
    </div>
  );
}

/** Wide banner for a series (uses AniList's banner art, else the cover). */
export function SeriesBanner({ seriesKey, onClick, small }: { seriesKey: string; onClick?: () => void; small?: boolean }) {
  const sr = SERIES_BY_KEY[seriesKey];
  const { cover, banner } = useSeriesImage(seriesKey);
  const src = banner ?? cover;
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const body = (
    <>
      {src && ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`${s.img} ${s.bannerImg} ${loaded ? s.in : ""}`}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setOk(false)}
        />
      )}
      <span className={s.short}>{sr.short}</span>
      <b className={s.name}>{sr.name}</b>
    </>
  );
  const cls = `${s.banner} ${small ? s.small : ""} ${onClick ? s.tap : ""}`;
  return onClick ? (
    <button type="button" className={cls} style={vars(seriesKey)} onClick={onClick} aria-label={sr.name}>
      {body}
    </button>
  ) : (
    <div className={cls} style={vars(seriesKey)} role="img" aria-label={sr.name}>
      {body}
    </div>
  );
}
