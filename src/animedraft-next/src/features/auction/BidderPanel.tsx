"use client";
import { useEffect, useState } from "react";
import CharacterCard from "@/components/CharacterCard";
import { canBid, canSkip, hasRoom, type AuctionState, type PlayerId } from "./engine";
import s from "./auction.module.css";

interface Props {
  state: AuctionState;
  player: PlayerId;
  flipped: boolean;
  /** Show +$ buttons (false when only the host may bid). */
  showBids: boolean;
  onRaise: (by: number) => void;
  onAllIn: () => void;
  onSkip: () => void;
}

const STEPS = [1, 2, 5];

export default function BidderPanel({ state, player, flipped, showBids, onRaise, onAllIn, onSkip }: Props) {
  const p = state.players[player];
  const lot = state.lot;
  const leading = state.phase === "auction" && lot?.leader === player;
  const [armed, setArmed] = useState(false);
  const skipOk = canSkip(state, player);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 2500);
    return () => window.clearTimeout(t);
  }, [armed]);
  useEffect(() => setArmed(false), [lot?.key]);

  const status =
    state.phase === "auction"
      ? leading
        ? "Leading"
        : !hasRoom(state, player)
          ? "Team full"
          : null
      : !hasRoom(state, player)
        ? "Team full"
        : p.budget === 0
          ? "Out of money"
          : state.chooser === player
            ? "Choosing"
            : null;

  return (
    <section
      className={`${s.bidder} p${player} ${flipped ? s.flipped : ""} ${leading ? s.leading : ""}`}
      aria-label={`${p.name}'s controls`}
    >
      <header className={s.bHead}>
        <span className="dot" />
        <b className={s.bName}>{p.name}</b>
        {status && <span className={s.status}>{status}</span>}
        <span className={s.budget}>
          <small>$</small>
          {p.budget}
        </span>
      </header>

      <div className={s.team} aria-label="Team">
        {Array.from({ length: state.config.teamSize }, (_, i) => {
          const o = p.team[i];
          return o ? (
            <div key={i} className={s.slot}>
              <CharacterCard character={o.key} compact badge={<span className={s.price}>{o.via === "won" ? `$${o.price}` : o.via === "kept" ? "KEPT" : "PASS"}</span>} />
            </div>
          ) : (
            <div key={i} className={`${s.slot} ${s.empty}`} />
          );
        })}
      </div>

      <div className={s.actions}>
        {showBids && state.phase === "auction" && lot && (
          <>
            {STEPS.map((by) => {
              const amount = lot.bid + by;
              return (
                <button key={by} className={s.bidBtn} disabled={!canBid(state, player, amount)} onClick={() => onRaise(by)}>
                  <small>+{by}</small>${amount}
                </button>
              );
            })}
            <button
              className={`${s.bidBtn} ${s.allIn}`}
              disabled={!canBid(state, player, p.budget) || p.budget <= lot.bid + 5}
              onClick={onAllIn}
            >
              <small>ALL IN</small>${p.budget}
            </button>
          </>
        )}
        <button
          className={`${s.skipBtn} ${armed ? s.armed : ""}`}
          disabled={!skipOk}
          onClick={() => (armed ? (setArmed(false), onSkip()) : setArmed(true))}
          aria-label={p.skipUsed ? "Skip used" : "Use your one skip to veto this character"}
        >
          {p.skipUsed ? "Skip used" : armed ? "Tap to veto" : "Skip ×1"}
        </button>
      </div>
    </section>
  );
}
