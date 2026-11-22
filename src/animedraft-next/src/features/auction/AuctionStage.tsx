"use client";
import { useEffect, useRef, useState } from "react";
import CharacterCard from "@/components/CharacterCard";
import { CHARACTER_BY_KEY, SERIES_BY_KEY, scalingLine } from "@/data";
import { buzz } from "@/lib/fx";
import BidderPanel from "./BidderPanel";
import HostEntry from "./HostEntry";
import { useHammerTimer } from "./useHammerTimer";
import { canBid, choiceOptions, hasRoom, type AuctionAction, type AuctionState, type Outcome, type PlayerId } from "./engine";
import s from "./auction.module.css";

interface Props {
  state: AuctionState;
  dispatch: (a: AuctionAction) => void;
  onExit: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
}

const FLASH_MS = 1300;

export default function AuctionStage({ state, dispatch, onExit, canUndo = false, onUndo = () => {} }: Props) {
  const { config, lot, phase } = state;
  const entry = config.control === "entry";
  const host = config.control === "host" || config.control === "both";
  const playersBid = config.control === "players" || config.control === "both";
  const seconds = entry ? 0 : config.timer;
  const seen = useRef(state.last?.id ?? 0);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<Outcome | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  // outcome flash ("SOLD to … for $7")
  useEffect(() => {
    // only flash new outcomes (an undo restores an older one: no replay)
    if (!state.last || state.last.id <= seen.current) {
      setFlash(null);
      return;
    }
    seen.current = state.last.id;
    setFlash(state.last);
    buzz(state.last.kind === "sold" ? [30, 40, 30] : 20);
    const t = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state.last]);

  // lock page scroll while the full-screen stage is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const timer = useHammerTimer({
    rev: lot?.rev ?? 0,
    seconds,
    active: phase === "auction" && !!lot,
    paused,
    grace: lot && lot.history.length === 0 ? FLASH_MS : 0,
    onExpire: () => dispatch({ type: "hammer" }),
  });

  const flipTop = config.faceToFace && !entry;
  const panel = (p: PlayerId, flipped: boolean) => (
    <BidderPanel
      state={state}
      player={p}
      flipped={flipped}
      showBids={playersBid}
      onRaise={(by) => {
        buzz(10);
        dispatch({ type: "raise", player: p, by });
      }}
      onAllIn={() => dispatch({ type: "allIn", player: p })}
      onSkip={() => dispatch({ type: "skip", player: p })}
    />
  );

  const secs = Math.ceil(timer.left / 1000);
  const callout =
    phase !== "auction" || !lot
      ? ""
      : paused
        ? "Paused"
        : seconds === 0
          ? lot.leader === null
            ? "Open the bidding"
            : "Bidding…"
          : lot.leader === null
            ? `Opening… ${secs}s`
            : secs <= 1
              ? "Going twice…"
              : secs <= 3
                ? "Going once…"
                : `${secs}s`;

  return (
    <div className={`${s.stage} ${entry ? s.entryStage : ""}`} data-ui="stage" aria-label="Auction">
      <div className={s.top}>{panel(1, flipTop)}</div>

      <div className={`${s.center} ${entry ? s.centerEntry : ""}`} data-ui="stage-center">
        <div className={s.centerBar}>
          {confirmExit ? (
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={onExit}>
                Quit draft
              </button>
              <button className="btn sm ghost" onClick={() => setConfirmExit(false)}>
                Keep playing
              </button>
            </span>
          ) : (
            <button className={s.exit} onClick={() => setConfirmExit(true)} aria-label="Exit draft">
              ✕
            </button>
          )}
          <span className={s.lotNo}>LOT {state.lotNo}</span>
          <span className={s.lotNo}>{phase !== "auction" ? "KEEP / PASS" : entry ? "HOST ENTRY" : "AUCTION"}</span>
        </div>

        {lot && (
          <div className={s.lotRow} key={lot.key}>
            <div className={`${s.lotCard} pop`}>
              <CharacterCard character={lot.key} />
            </div>
            <div className={s.lotInfo}>
              {phase === "auction" && entry ? (
                <EntryInfo state={state} />
              ) : phase === "auction" ? (
                <AuctionInfo state={state} callout={callout} fraction={seconds ? timer.fraction : 1} />
              ) : (
                <ChoiceInfo state={state} />
              )}
            </div>
          </div>
        )}

        {phase === "auction" && lot && entry && <HostEntry state={state} dispatch={dispatch} canUndo={canUndo} onUndo={onUndo} />}

        {phase === "auction" && lot && !entry && (host || seconds === 0) && (
          <div className={s.hostBar}>
            {host &&
              ([0, 1] as PlayerId[]).map((p) => (
                <button
                  key={p}
                  className={`${s.hostBump} p${p}`}
                  disabled={!canBid(state, p, lot.bid + 1)}
                  onClick={() => dispatch({ type: "raise", player: p, by: 1 })}
                  aria-label={`Raise for ${state.players[p].name}`}
                >
                  <span className="dot" />
                  {state.players[p].name} +$1
                </button>
              ))}
            {host && (
              <>
                <button className={s.hostTool} disabled={!lot.history.length} onClick={() => dispatch({ type: "undo" })}>
                  ↶ Undo
                </button>
                {seconds > 0 && (
                  <button className={s.hostTool} onClick={() => setPaused((v) => !v)}>
                    {paused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                )}
              </>
            )}
            <button className={`btn gold sm ${s.hammer}`} onClick={() => dispatch({ type: "hammer" })}>
              {lot.leader === null ? "No sale" : "🔨 Sold!"}
            </button>
          </div>
        )}

        {phase === "choose" && <ChoiceButtons state={state} dispatch={dispatch} />}
        {phase === "choose" && entry && (
          <div className={s.entryTools}>
            <button type="button" className={s.hostTool} disabled={!canUndo} onClick={onUndo}>
              ↶ Undo last
            </button>
          </div>
        )}

        {flash && <Flash outcome={flash} state={state} />}
      </div>

      <div className={s.bottom}>{panel(0, false)}</div>
    </div>
  );
}

function EntryInfo({ state }: { state: AuctionState }) {
  const c = CHARACTER_BY_KEY[state.lot!.key];
  return (
    <>
      <div className={s.label}>{SERIES_BY_KEY[c.series].name}</div>
      <div className={s.charName}>{c.name}</div>
      <div className={s.label} style={{ marginTop: 6 }}>
        {c.title}
      </div>
      <div className={s.scale}>
        {c.tier === "BEYOND" ? "∞ BEYOND" : `Tier ${c.tier}`} · {scalingLine(c.scaling)}
      </div>
    </>
  );
}

function AuctionInfo({ state, callout, fraction }: { state: AuctionState; callout: string; fraction: number }) {
  const lot = state.lot!;
  const c = CHARACTER_BY_KEY[lot.key];
  return (
    <>
      <div className={s.label}>{SERIES_BY_KEY[c.series].name}</div>
      <div className={s.charName}>{c.name}</div>
      <div className={s.label} style={{ marginTop: 8 }}>
        Current bid
      </div>
      <div className={`${s.bigBid} ${lot.leader !== null ? `p${lot.leader}` : ""}`} key={lot.bid}>
        ${lot.bid}
      </div>
      <div className={s.leader}>
        {lot.leader === null ? (
          <span className="muted">No bids yet</span>
        ) : (
          <span className={`p${lot.leader}`}>
            <span className="dot" /> {state.players[lot.leader].name}
          </span>
        )}
      </div>
      <div className={s.timerBar} aria-hidden>
        <i style={{ width: `${fraction * 100}%` }} />
      </div>
      <div className={s.callout} aria-live="polite">
        {callout}
      </div>
    </>
  );
}

function ChoiceInfo({ state }: { state: AuctionState }) {
  const opt = choiceOptions(state)!;
  const c = CHARACTER_BY_KEY[state.lot!.key];
  const chooser = state.players[opt.chooser].name;
  const receiver = state.players[opt.receiver];
  const why = !hasRoom(state, opt.receiver)
    ? `${receiver.name}'s team is full`
    : receiver.budget === 0
      ? `${receiver.name} is out of money`
      : "Bidding is over";
  return (
    <>
      <div className={s.label}>{SERIES_BY_KEY[c.series].name}</div>
      <div className={s.charName}>{c.name}</div>
      <p className={s.choiceWhy}>
        {why}.{" "}
        {state.pending === "incoming" ? (
          <>
            <b className={`p${opt.chooser}`}>{chooser}</b> is passing this to <b className={`p${opt.receiver}`}>{receiver.name}</b>.
          </>
        ) : (
          <>
            <b className={`p${opt.chooser}`}>{chooser}</b> decides: keep or pass?
          </>
        )}
      </p>
    </>
  );
}

function ChoiceButtons({ state, dispatch }: { state: AuctionState; dispatch: (a: AuctionAction) => void }) {
  const opt = choiceOptions(state);
  if (!opt) return null;
  const chooser = state.players[opt.chooser].name;
  const receiver = state.players[opt.receiver];
  if (state.pending === "incoming")
    return (
      <div className={`${s.choiceBar} ${s.single}`}>
        <button className="btn jade block" onClick={() => dispatch({ type: "accept" })}>
          {receiver.name}: accept
        </button>
        <p className="note center">
          {receiver.skipUsed ? `${receiver.name} has no skip left.` : `${receiver.name} can refuse with their skip instead.`}
        </p>
      </div>
    );
  return (
    <div className={s.choiceBar}>
      <button className="btn gold" disabled={!opt.canKeep} onClick={() => dispatch({ type: "keep" })}>
        Keep for {chooser}
      </button>
      <button className="btn ghost" disabled={!opt.canPass} onClick={() => dispatch({ type: "pass" })}>
        Pass to {receiver.name}
      </button>
    </div>
  );
}

function Flash({ outcome, state }: { outcome: Outcome; state: AuctionState }) {
  const c = CHARACTER_BY_KEY[outcome.key];
  const who = outcome.player !== undefined ? state.players[outcome.player].name : "";
  const text = {
    sold: (
      <>
        SOLD to <span className={`p${outcome.player}`}>{who}</span> for ${outcome.price}
      </>
    ),
    unsold: <>No bids, {c.name} walks away</>,
    vetoed: (
      <>
        <span className={`p${outcome.player}`}>{who}</span> vetoed {c.name}
      </>
    ),
    kept: (
      <>
        <span className={`p${outcome.player}`}>{who}</span> keeps {c.name}
      </>
    ),
    passed: (
      <>
        {c.name} joins <span className={`p${outcome.player}`}>{who}</span>
      </>
    ),
  }[outcome.kind];
  return (
    <div className={s.flash} role="status">
      <div className={s.flashCard}>
        <CharacterCard character={c} compact />
      </div>
      <div className={s.flashText}>{text}</div>
    </div>
  );
}
