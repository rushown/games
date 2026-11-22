"use client";
import CharacterCard from "@/components/CharacterCard";
import { SeriesBanner, SeriesPoster } from "@/components/SeriesArt";
import { CHARACTER_BY_KEY, SERIES_BY_KEY, charactersOf } from "@/data";
import type { PlayerCard, Secret } from "./engine";
import s from "./imposter.module.css";

/** Big view of a secret (character card, or series tile with a few faces). */
export function SecretDisplay({ secret }: { secret: Secret }) {
  if (secret.kind === "character") {
    const c = CHARACTER_BY_KEY[secret.key];
    return (
      <>
        <div className={s.secretCard}>
          <CharacterCard character={c} />
        </div>
        <b className={s.secretTitle}>{c.name}</b>
        <span className="note" style={{ marginTop: 2 }}>
          {SERIES_BY_KEY[c.series].name}
        </span>
      </>
    );
  }
  const faces = charactersOf(secret.key).slice(0, 3);
  return (
    <>
      <div className={s.secretPoster}>
        <SeriesPoster seriesKey={secret.key} />
      </div>
      <div className={s.faces}>
        {faces.map((c) => (
          <CharacterCard key={c.key} character={c} compact />
        ))}
      </div>
    </>
  );
}

/** What's printed under the swipe cover for one player. */
export function PlayerCardView({ card }: { card: PlayerCard }) {
  if (card.role === "crew" || card.role === "undercover")
    return (
      <>
        <span className={s.youAre}>Your secret {card.secret.kind}</span>
        <SecretDisplay secret={card.secret} />
      </>
    );
  return (
    <>
      <div className={s.impWord}>IMPOSTER</div>
      <p className={s.impSub}>Blend in. Don&apos;t get caught.</p>
      {card.hint?.type === "similar" && (
        <div className={s.hintBox}>
          <span className={s.youAre}>Hint: it&apos;s similar to</span>
          {card.hint.secret.kind === "character" ? (
            <div className={s.hintRow}>
              <div style={{ width: 48 }}>
                <CharacterCard character={card.hint.secret.key} compact />
              </div>
              <b>{CHARACTER_BY_KEY[card.hint.secret.key].name}</b>
            </div>
          ) : (
            <SeriesBanner seriesKey={card.hint.secret.key} small />
          )}
        </div>
      )}
      {card.hint?.type === "clue" && (
        <div className={s.hintBox}>
          <span className={s.youAre}>Your clue</span>
          <b className={s.clue}>{card.hint.text}</b>
        </div>
      )}
      {!card.hint && <p className="note">No hint this time. Listen carefully.</p>}
    </>
  );
}
