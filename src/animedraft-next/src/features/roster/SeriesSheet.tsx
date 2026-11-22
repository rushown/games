"use client";
import CharacterCard from "@/components/CharacterCard";
import { SeriesBanner } from "@/components/SeriesArt";
import { Sheet } from "@/components/ui";
import { charactersOf, SERIES_BY_KEY } from "@/data";
import s from "./roster.module.css";

/** A series with its cover art, clues and every character from it in the database. */
export default function SeriesSheet({
  seriesKey,
  onClose,
  onOpenCharacter,
}: {
  seriesKey: string | null;
  onClose: () => void;
  onOpenCharacter: (key: string) => void;
}) {
  const sr = seriesKey ? SERIES_BY_KEY[seriesKey] : null;
  return (
    <Sheet open={!!sr} onClose={onClose}>
      {sr && (
        <>
          <SeriesBanner seriesKey={sr.key} />
          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            {sr.clues.map((w) => (
              <span key={w} className="chip">
                {w}
              </span>
            ))}
          </div>
          <div className="kicker" style={{ marginTop: 14 }}>
            {charactersOf(sr.key).length} characters
          </div>
          <div className={s.similar}>
            {charactersOf(sr.key).map((c) => (
              <CharacterCard key={c.key} character={c} onClick={() => onOpenCharacter(c.key)} />
            ))}
          </div>
          <button className="btn ghost block" style={{ marginTop: 16 }} onClick={onClose}>
            Close
          </button>
        </>
      )}
    </Sheet>
  );
}
