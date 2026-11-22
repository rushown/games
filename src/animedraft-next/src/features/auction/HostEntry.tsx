"use client";
import { useEffect, useState } from "react";
import { CHARACTER_BY_KEY } from "@/data";
import { buzz } from "@/lib/fx";
import { assignError, hasRoom, type AuctionAction, type AuctionState, type PlayerId } from "./engine";
import s from "./auction.module.css";

const QUICK = [1, 2, 3, 5, 10];

/**
 * Host entry: the host reads the character out, players shout bids, and the host records the
 * winner + winning amount here. Every sale is listed in the ledger below.
 */
export default function HostEntry({
  state,
  dispatch,
  canUndo,
  onUndo,
}: {
  state: AuctionState;
  dispatch: (a: AuctionAction) => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const lot = state.lot!;
  const open = ([0, 1] as PlayerId[]).filter((p) => hasRoom(state, p) && state.players[p].budget > 0);
  const [who, setWho] = useState<PlayerId | null>(open.length === 1 ? open[0] : null);
  const [amount, setAmount] = useState(1);

  // fresh lot: clear the form
  useEffect(() => {
    setWho(open.length === 1 ? open[0] : null);
    setAmount(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot.key, state.lotNo]);

  const max = who === null ? Math.max(...state.players.map((p) => p.budget)) : state.players[who].budget;
  const amt = Math.max(1, Math.min(amount, Math.max(1, max)));
  const error = who === null ? "Pick who won the bidding" : assignError(state, who, amt);

  const assign = () => {
    if (who === null || error) return;
    buzz([20, 30, 20]);
    dispatch({ type: "assign", player: who, amount: amt });
  };

  return (
    <div className={s.entry} data-ui="host-entry">
      <div className={s.entryLabel}>Winning bidder</div>
      <div className={s.entryWho}>
        {([0, 1] as PlayerId[]).map((p) => {
          const pl = state.players[p];
          const ok = open.includes(p);
          return (
            <button
              key={p}
              type="button"
              className={`${s.whoBtn} p${p} ${who === p ? s.whoOn : ""}`}
              disabled={!ok}
              aria-pressed={who === p}
              onClick={() => setWho(p)}
            >
              <span className="dot" />
              <b>{pl.name}</b>
              <small>{!hasRoom(state, p) ? "team full" : `$${pl.budget} left`}</small>
            </button>
          );
        })}
      </div>

      <div className={s.entryLabel}>Winning bid</div>
      <div className={s.amountRow}>
        <button type="button" className={s.amtStep} aria-label="Lower bid" disabled={amt <= 1} onClick={() => setAmount(amt - 1)}>
          −
        </button>
        <label className={s.amtBox}>
          <span>$</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Winning bid amount"
            value={String(amt)}
            onChange={(e) => {
              const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
              setAmount(Number.isFinite(n) ? n : 1);
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === "Enter" && assign()}
          />
        </label>
        <button type="button" className={s.amtStep} aria-label="Raise bid" disabled={amt >= max} onClick={() => setAmount(amt + 1)}>
          +
        </button>
      </div>
      <div className={s.quick}>
        {QUICK.filter((q) => q <= max).map((q) => (
          <button key={q} type="button" className={amt === q ? s.quickOn : ""} onClick={() => setAmount(q)}>
            ${q}
          </button>
        ))}
        {max > 0 && !QUICK.includes(max) && (
          <button type="button" className={amt === max ? s.quickOn : ""} onClick={() => setAmount(max)}>
            All ${max}
          </button>
        )}
      </div>

      <button className="btn gold block" disabled={!!error} onClick={assign} data-ui="assign">
        {who === null ? "Assign" : `Assign to ${state.players[who].name} for $${amt}`}
      </button>
      <p className={`note center ${s.entryErr}`} aria-live="polite">
        {error && who !== null ? error : `Read “${CHARACTER_BY_KEY[lot.key].name}” out loud and take bids.`}
      </p>

      <div className={s.entryTools}>
        <button type="button" className={s.hostTool} onClick={() => dispatch({ type: "hammer" })}>
          No sale
        </button>
        <button type="button" className={s.hostTool} disabled={!canUndo} onClick={onUndo}>
          ↶ Undo last
        </button>
      </div>

      <Ledger state={state} />
    </div>
  );
}

/** Every outcome so far, newest first: the host's record of the draft. */
export function Ledger({ state }: { state: AuctionState }) {
  if (!state.log.length) return null;
  const rows = [...state.log].reverse();
  return (
    <details className={s.ledger} open>
      <summary>
        Draft record <span>({state.log.length})</span>
      </summary>
      <ol>
        {rows.map((o, i) => {
          const c = CHARACTER_BY_KEY[o.key];
          const who = o.player !== undefined ? state.players[o.player].name : "";
          return (
            <li key={o.id}>
              <span className={s.ledgerNo}>{state.log.length - i}</span>
              <b>{c.name}</b>
              <span className={o.player !== undefined ? `p${o.player}` : "muted"}>
                {o.kind === "sold"
                  ? `→ ${who} · $${o.price}`
                  : o.kind === "unsold"
                    ? "no sale"
                    : o.kind === "vetoed"
                      ? `vetoed by ${who}`
                      : o.kind === "kept"
                        ? `kept by ${who}`
                        : `passed to ${who}`}
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
