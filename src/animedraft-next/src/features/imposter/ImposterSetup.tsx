"use client";
import { Field, Segmented, Stepper } from "@/components/ui";
import { ACTIVE_SERIES } from "@/data";
import { maxImposters, type HintMode, type ImposterConfig, type SecretKind } from "./engine";
import s from "./imposter.module.css";

interface Props {
  config: ImposterConfig;
  onChange: (c: ImposterConfig) => void;
  onStart: () => void;
  scores: Record<string, number>;
  onResetScores: () => void;
}

const FILLER = ["Aki", "Ren", "Yuna", "Kai", "Mei", "Sora", "Hana", "Jin", "Rio", "Taro", "Nami", "Leo", "Ivy", "Zed", "Uma"];

export default function ImposterSetup({ config: c, onChange, onStart, scores, onResetScores }: Props) {
  const set = <K extends keyof ImposterConfig>(k: K, v: ImposterConfig[K]) => onChange({ ...c, [k]: v });
  const n = c.names.length;
  const maxImp = maxImposters(n);

  const setCount = (count: number) => {
    const names = c.names.slice(0, count);
    while (names.length < count) names.push(FILLER[names.length] ?? `P${names.length + 1}`);
    onChange({ ...c, names, imposters: Math.min(c.imposters, maxImposters(count)) });
  };
  const setName = (i: number, v: string) => {
    const names = c.names.slice();
    names[i] = v;
    set("names", names);
  };
  const toggleSeries = (k: string) =>
    set("series", c.series.includes(k) ? c.series.filter((x) => x !== k) : [...c.series, k]);

  const thing = c.secret === "character" ? "character" : "series";
  const hintHelp: Record<HintMode, string> = {
    similar: `Imposters know they're the imposter and get a similar ${thing} to bluff with.`,
    clue: `Imposters know they're the imposter and get one vague clue word about the ${thing}.`,
    none: "Imposters get nothing. Pure bluffing.",
    undercover: `Imposters secretly get a similar ${thing} and don't know they're the imposter. Chaos.`,
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="two">
      <div>
        <div className="kicker">Game 03 · Pass the phone</div>
        <h1 className="page-title">Imposter</h1>
        <p className="lead">Everyone sees the same secret anime {thing}, except the imposter.</p>
        <div className="panel stack">
          <Stepper label="Players" value={n} min={3} max={15} onChange={setCount} />
          <div className={s.names}>
            {c.names.map((name, i) => (
              <input
                key={i}
                className="input"
                value={name}
                maxLength={12}
                aria-label={`Player ${i + 1} name`}
                onChange={(e) => setName(i, e.target.value)}
              />
            ))}
          </div>
          <Stepper label="Imposters" value={Math.min(c.imposters, maxImp)} min={1} max={maxImp} onChange={(v) => set("imposters", v)} />

          <Field label="Secret is a…">
            <Segmented<SecretKind>
              label="Secret type"
              value={c.secret}
              onChange={(v) => set("secret", v)}
              options={[
                { value: "character", label: "Character" },
                { value: "series", label: "Series" },
              ]}
            />
          </Field>

          <Field label="Imposter gets" hint={hintHelp[c.hint]}>
            <Segmented<HintMode>
              label="Imposter hint"
              wrap
              value={c.hint}
              onChange={(v) => set("hint", v)}
              options={[
                { value: "similar", label: "Similar" },
                { value: "clue", label: "Clue" },
                { value: "none", label: "Nothing" },
                { value: "undercover", label: "Undercover" },
              ]}
            />
          </Field>

          <Field label="Discussion timer">
            <Segmented<number>
              label="Timer"
              value={c.timer}
              onChange={(v) => set("timer", v)}
              options={[0, 60, 120, 180].map((t) => ({ value: t, label: t ? `${t / 60} min` : "Off" }))}
            />
          </Field>

          <Field
            label={`Series pool ${c.series.length ? `(${c.series.length})` : "(all)"}`}
            hint="Pick only the shows your group knows. None selected = everything."
          >
            <div className="row" style={{ gap: 6 }}>
              {ACTIVE_SERIES.map((sr) => (
                <button
                  key={sr.key}
                  type="button"
                  className={`chip ${c.series.includes(sr.key) ? "on" : ""}`}
                  aria-pressed={c.series.includes(sr.key)}
                  title={sr.name}
                  onClick={() => toggleSeries(sr.key)}
                >
                  {sr.short}
                </button>
              ))}
            </div>
          </Field>

          <button className="btn block" onClick={onStart}>
            Deal the cards
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="kicker" style={{ marginBottom: 10 }}>
          How to play
        </div>
        <ol className="howto">
          <li>Pass the phone. Each player swipes the card up to secretly see it, then lets go.</li>
          <li>
            Follow the speaking order: each person says <b>one word</b> about the secret. Not too obvious, or the imposter
            catches on!
          </li>
          <li>Discuss, then vote someone out. Innocent? Play another round.</li>
          <li>
            Crew wins by catching every imposter. Imposters win by surviving until they equal the crew, or by guessing the
            secret after being caught.
          </li>
        </ol>
        {ranked.length > 0 && (
          <>
            <div className="kicker" style={{ margin: "16px 0 4px" }}>
              Session scoreboard
            </div>
            {ranked.map(([name, pts]) => (
              <div className={s.lb} key={name}>
                <span>{name}</span>
                <span>{pts}</span>
              </div>
            ))}
            <button className="chip" style={{ marginTop: 10 }} onClick={onResetScores}>
              Reset scores
            </button>
          </>
        )}
      </div>
    </div>
  );
}
