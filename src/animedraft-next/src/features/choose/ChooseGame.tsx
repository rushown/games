"use client";
import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Field, Segmented } from "@/components/ui";
import { DEFAULT_CHOOSE_CONFIG, type ChooseConfig, type ChooseMode } from "./engine";
import SoloStreak from "./SoloStreak";
import DuoBattle from "./DuoBattle";
import BracketGame from "./BracketGame";

export default function ChooseGame() {
  const [config, setConfig] = usePersistentState("choose-config", DEFAULT_CHOOSE_CONFIG);
  const [best, setBest] = usePersistentState("choose-best", { streak: 0 });
  const [playing, setPlaying] = useState<ChooseMode | null>(null);
  const [round, setRound] = useState(0); // remount key for "play again"

  const exit = () => setPlaying(null);
  const again = () => setRound((r) => r + 1);

  if (playing === "solo")
    return <SoloStreak key={round} best={best.streak} onBest={(n) => setBest({ streak: n })} onExit={exit} onAgain={again} />;
  if (playing === "duo") return <DuoBattle key={round} config={config} onExit={exit} onAgain={again} />;
  if (playing === "bracket") return <BracketGame key={round} onExit={exit} onAgain={again} />;

  const set = <K extends keyof ChooseConfig>(k: K, v: ChooseConfig[K]) => setConfig({ ...config, [k]: v });
  const c = config;
  return (
    <div className="two">
      <div>
        <div className="kicker">Game 02</div>
        <h1 className="page-title">Choose Duel</h1>
        <p className="lead">Settle the who-beats-who debate.</p>
        <div className="panel stack">
          <Field
            label="Mode"
            hint={
              {
                solo: `Call the winner of each matchup. One wrong call ends your run. Best streak: ${best.streak}`,
                duo: "Both players lock in a secret pick, then the fight resolves. First to the target wins.",
                bracket: "16 random characters. Tap your favourite in each matchup until one champion remains.",
              }[c.mode]
            }
          >
            <Segmented<ChooseMode>
              label="Mode"
              value={c.mode}
              onChange={(v) => set("mode", v)}
              options={[
                { value: "solo", label: "Solo streak" },
                { value: "duo", label: "2 players" },
                { value: "bracket", label: "Bracket" },
              ]}
            />
          </Field>
          {c.mode === "duo" && (
            <>
              <div className="row" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                {([0, 1] as const).map((i) => (
                  <div key={i}>
                    <label className="field" htmlFor={`cn${i}`}>
                      Player {i + 1}
                    </label>
                    <input
                      id={`cn${i}`}
                      className="input"
                      maxLength={14}
                      value={c.names[i]}
                      onChange={(e) => {
                        const names = [...c.names] as [string, string];
                        names[i] = e.target.value;
                        set("names", names);
                      }}
                    />
                  </div>
                ))}
              </div>
              <Field label="First to">
                <Segmented<number> label="Target" value={c.target} onChange={(v) => set("target", v)} options={[5, 7, 10].map((n) => ({ value: n, label: String(n) }))} />
              </Field>
              <Field label="Seating" hint="Face-to-face flips Player 2's buttons.">
                <Segmented<string>
                  label="Seating"
                  value={c.faceToFace ? "f" : "s"}
                  onChange={(v) => set("faceToFace", v === "f")}
                  options={[
                    { value: "f", label: "Face-to-face" },
                    { value: "s", label: "Side by side" },
                  ]}
                />
              </Field>
            </>
          )}
          <button className="btn gold block" onClick={() => setPlaying(c.mode)}>
            Fight!
          </button>
        </div>
      </div>
      <div className="panel">
        <div className="kicker" style={{ marginBottom: 10 }}>
          How fights resolve
        </div>
        <ol className="howto">
          <li>
            No dice and no made-up numbers: every character has a power-scaling profile built from their strongest canon
            feats (attack level from Street to Boundless, durability, speed, intellect and hax).
          </li>
          <li>
            <b>∞ BEYOND</b> characters (Featherine, Simon, Anos, Madoka…) are outerversal and beat anyone below that level.
            Otherwise attack level weighs most, then hax, durability, speed and intellect.
          </li>
          <li>Matchups are paired close in power, so most calls are genuinely tough.</li>
          <li>After each fight you&apos;ll see both profiles, the key feats and exactly what decided it.</li>
        </ol>
      </div>
    </div>
  );
}
