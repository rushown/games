"use client";
import { Field, Segmented } from "@/components/ui";
import Records from "./Records";
import type { AuctionConfig, BidControl } from "./engine";
import type { PoolFilter } from "@/data";

interface Props {
  config: AuctionConfig;
  onChange: (c: AuctionConfig) => void;
  onStart: () => void;
}

export default function AuctionSetup({ config: c, onChange, onStart }: Props) {
  const set = <K extends keyof AuctionConfig>(k: K, v: AuctionConfig[K]) => onChange({ ...c, [k]: v });
  const setName = (i: 0 | 1, v: string) => {
    const names = [...c.names] as [string, string];
    names[i] = v;
    set("names", names);
  };

  return (
    <div className="two">
      <div>
        <div className="kicker">Game 01 · Auction draft</div>
        <h1 className="page-title">Draft Duel</h1>
        <p className="lead">
          ${c.budget} each. {c.teamSize} characters per team. Outbid your rival for the strongest squad in anime.
        </p>
        <div className="panel stack">
          <div className="row" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            {([0, 1] as const).map((i) => (
              <div key={i}>
                <label className="field" htmlFor={`n${i}`}>
                  <span className={`dot p${i}`} style={{ marginRight: 6 }} />
                  Player {i + 1}
                </label>
                <input
                  id={`n${i}`}
                  className="input"
                  maxLength={14}
                  value={c.names[i]}
                  onChange={(e) => setName(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          <Field label="Budget per player">
            <Segmented<number>
              label="Budget"
              value={c.budget}
              onChange={(v) => set("budget", v)}
              options={[15, 25, 50, 100].map((v) => ({ value: v, label: `$${v}` }))}
            />
          </Field>

          <Field
            label="Who places bids"
            hint={
              {
                players: "Each player bids from their own side of the phone.",
                host: "A host runs the auction and raises bids for whoever calls out.",
                both: "Players bid from their side and a host can also raise, undo or hammer.",
                entry:
                  "The host reads each character out loud, players shout their bids, and the host types in who won and for how much. No timer; every sale is recorded.",
              }[c.control]
            }
          >
            <Segmented<BidControl>
              label="Bid control"
              value={c.control}
              onChange={(v) => set("control", v)}
              options={[
                { value: "players", label: "Players" },
                { value: "host", label: "Host" },
                { value: "both", label: "Both" },
                { value: "entry", label: "Host entry" },
              ]}
              wrap
            />
          </Field>

          {c.control !== "entry" && (
          <Field
            label="Hammer timer"
            hint={c.timer ? `Sold automatically after ${c.timer}s without a new bid.` : "No timer: tap Sold! when bidding stops."}
          >
            <Segmented<number>
              label="Timer"
              value={c.timer}
              onChange={(v) => set("timer", v)}
              options={[
                { value: 0, label: "Manual" },
                { value: 5, label: "5s" },
                { value: 8, label: "8s" },
                { value: 12, label: "12s" },
              ]}
            />
          </Field>
          )}

          <Field label="Character pool">
            <Segmented<PoolFilter>
              label="Pool"
              value={c.pool}
              onChange={(v) => set("pool", v)}
              options={[
                { value: "all", label: "Everyone" },
                { value: "gods", label: "Gods only" },
                { value: "fair", label: "No ∞ / SSS" },
              ]}
            />
          </Field>

          {c.control !== "entry" && (
          <Field label="Seating" hint="Face-to-face flips Player 2's controls so you can sit across from each other.">
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
          )}

          <button className="btn block" onClick={onStart}>
            Start the auction
          </button>
        </div>
      </div>

      <div className="stack">
      <div className="panel">
        <div className="kicker" style={{ marginBottom: 10 }}>
          Rules
        </div>
        <ol className="howto">
          <li>
            A character goes up for auction. Bid in <b>$1, $2 or $5</b> steps (or go all-in). The highest bid wins and pays.
          </li>
          <li>When nobody raises before the timer runs out (or the host taps Sold!), the hammer falls.</li>
          <li>
            Each player has <b>one skip</b>: veto the current character so nobody gets it. Use it to deny your rival, or to
            refuse something passed to you.
          </li>
          <li>
            When a player runs out of money, bidding stops. The other player sees each character and chooses to{" "}
            <b>keep it</b> or <b>pass it</b> to the broke player.
          </li>
          <li>
            Once both teams have {c.teamSize}, the squads fight five 1v1 bouts: strongest vs strongest, second vs second,
            and so on. Each bout is decided by real power scaling (attack level, hax, durability, speed, intellect), never
            dice. Win the most bouts to win the draft; a 2–2 split goes to total power plus same-series synergy.
          </li>
        </ol>
      </div>
      <Records />
      </div>
    </div>
  );
}
