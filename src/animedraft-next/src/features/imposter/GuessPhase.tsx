"use client";
import CharacterCard from "@/components/CharacterCard";
import { SeriesPoster } from "@/components/SeriesArt";
import type { ImposterState } from "./engine";
import s from "./imposter.module.css";

export default function GuessPhase({ state, onGuess }: { state: ImposterState; onGuess: (key: string) => void }) {
  const isChar = state.secret.kind === "character";
  return (
    <div className="narrow">
      <div className="center">
        <div className="kicker">Last chance</div>
        <h2 className={s.discussTitle}>
          {state.players[state.lastOut!]}, which {state.secret.kind} was it?
        </h2>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          Guess right and the imposters steal the win.
        </p>
      </div>
      <div className={isChar ? s.guessGrid : s.guessSeries}>
        {state.guessOptions.map((k) =>
          isChar ? (
            <CharacterCard key={k} character={k} onClick={() => onGuess(k)} />
          ) : (
            <SeriesPoster key={k} seriesKey={k} onClick={() => onGuess(k)} />
          ),
        )}
      </div>
    </div>
  );
}
