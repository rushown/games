"use client";
import CharacterCard from "@/components/CharacterCard";
import { SeriesBanner } from "@/components/SeriesArt";
import { ScalingProfile, Sheet, StatBars } from "@/components/ui";
import { CHARACTER_BY_KEY, SERIES_BY_KEY } from "@/data";
import s from "./roster.module.css";

export default function CharacterSheet({
  characterKey,
  onClose,
  onOpen,
}: {
  characterKey: string | null;
  onClose: () => void;
  onOpen: (key: string) => void;
}) {
  const c = characterKey ? CHARACTER_BY_KEY[characterKey] : null;
  return (
    <Sheet open={!!c} onClose={onClose}>
      {c && (
        <>
          <div className={s.sheetHead}>
            <CharacterCard character={c} />
            <div style={{ minWidth: 0 }}>
              <div className="kicker">{SERIES_BY_KEY[c.series].name}</div>
              <h2 className={s.sheetName}>{c.name}</h2>
              <div className="muted" style={{ fontSize: 14 }}>
                {c.title}
              </div>
              <div className="money" style={{ marginTop: 8, fontSize: 13 }}>
                Rating <b style={{ color: "var(--gold)" }}>{c.rating}</b> · {c.tier === "BEYOND" ? "∞ Beyond every rating" : `Tier ${c.tier}`}
              </div>
            </div>
          </div>
          <div className="kicker" style={{ marginTop: 16, marginBottom: 8 }}>
            Power scaling
          </div>
          <ScalingProfile c={c} />
          <div className="kicker" style={{ marginTop: 16, marginBottom: 4 }}>
            Draft stats
          </div>
          <div>
            <StatBars c={c} />
          </div>
          <div style={{ marginTop: 12 }}>
            <SeriesBanner seriesKey={c.series} small />
          </div>
          <div className="kicker" style={{ marginTop: 14 }}>
            Imposter clues
          </div>
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            {c.clues.map((w) => (
              <span key={w} className="chip">
                {w}
              </span>
            ))}
          </div>
          <div className="kicker" style={{ marginTop: 14 }}>
            Similar characters
          </div>
          <div className={s.similar}>
            {c.similar.map((k) => (
              <CharacterCard key={k} character={k} onClick={() => onOpen(k)} />
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
