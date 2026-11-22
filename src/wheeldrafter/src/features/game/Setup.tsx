"use client";
import { Field, Segmented } from "@/components/ui";
import type { GameConfig, Mode } from "./engine";
import s from "./game.module.css";

interface Props {
  config: GameConfig;
  onChange: (c: GameConfig) => void;
  onStart: () => void;
}

const FLOW = ["Race", "Strength", "Durability", "Speed", "Intelligence", "Power Count", "Powers ×N", "Weapon", "Path"];

export default function Setup({ config: c, onChange, onStart }: Props) {
  const set = <K extends keyof GameConfig>(k: K, v: GameConfig[K]) => onChange({ ...c, [k]: v });
  const setName = (i: 0 | 1, v: string) => {
    const names = [...c.names] as [string, string];
    names[i] = v;
    set("names", names);
  };
  const duel = c.mode === "duel";

  return (
    <div className="two">
      <div>
        <div className="kicker">New character</div>
        <h1 className="page-title">Spin your legend</h1>
        <p className="lead">
          Tap to spin. Each result holds for a moment, then the next wheel rolls in. Your race shapes your luck on every
          wheel after it.
        </p>
        <div className="panel stack">
          <Field
            label="Mode"
            hint={duel ? "Take turns spin by spin. The screen turns to face whoever's up. Strongest character wins." : "Spin every wheel yourself."}
          >
            <Segmented<Mode>
              label="Mode"
              value={c.mode}
              onChange={(v) => set("mode", v)}
              options={[
                { value: "solo", label: "Solo" },
                { value: "duel", label: "Duel" },
              ]}
            />
          </Field>
          <div className={s.names}>
            {(duel ? [0, 1] : [0]).map((i) => (
              <div key={i}>
                <label className="field" htmlFor={`pn${i}`}>
                  {duel ? `Player ${i + 1}` : "Your name"}
                </label>
                <input id={`pn${i}`} className="input" maxLength={14} value={c.names[i]} onChange={(e) => setName(i as 0 | 1, e.target.value)} />
              </div>
            ))}
          </div>
          {duel && (
            <Field label="Seating" hint="Face-to-face turns the screen 180° on Player 2's turns.">
              <Segmented<string>
                label="Seating"
                value={c.flip ? "f" : "s"}
                onChange={(v) => set("flip", v === "f")}
                options={[
                  { value: "f", label: "Face-to-face" },
                  { value: "s", label: "Side by side" },
                ]}
              />
            </Field>
          )}
          <Field label="Spinning">
            <Segmented<string>
              label="Spinning"
              value={c.auto ? "auto" : "tap"}
              onChange={(v) => set("auto", v === "auto")}
              options={[
                { value: "tap", label: "Tap to spin" },
                { value: "auto", label: "Auto-spin" },
              ]}
            />
          </Field>
          <Field label="Spin speed">
            <Segmented<string>
              label="Spin speed"
              value={c.fast ? "fast" : "full"}
              onChange={(v) => set("fast", v === "fast")}
              options={[
                { value: "full", label: "Dramatic" },
                { value: "fast", label: "Quick" },
              ]}
            />
          </Field>
          <button className="btn block" onClick={onStart}>
            Start spinning
          </button>
        </div>
      </div>
      <div className="panel">
        <div className="kicker" style={{ marginBottom: 10 }}>
          How it works
        </div>
        <ol className="howto">
          <li>Every slice is its exact chance. Rarer tiers get thinner slices: Boundless starts as a 0.5% sliver.</li>
          <li>
            <b>Fortune:</b> rare races enlarge the high-tier slices on every later wheel. An Abstract Entity makes the top
            slices up to 33× bigger.
          </li>
          <li>
            <b>Power Count</b> (1–6) decides how many times you spin the 24-power wheel. Land the same power twice and it{" "}
            <b>awakens</b>.
          </li>
          <li>One re-spin per character, available while a result is on screen.</li>
          <li>Every combination of spins makes a different character, with its own Legend ID, name, portrait and exact rarity.</li>
        </ol>
        <div className={s.wheelList}>
          {FLOW.map((w, i) => (
            <span key={w} className="chip">
              {i + 1}. {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
