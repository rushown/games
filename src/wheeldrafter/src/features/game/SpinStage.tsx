"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/ui";
import { TIER_COLORS, TIER_NAMES, WHEEL_BY_ID, formatMultiplier, fortuneOf, segmentOf, textOnTier } from "@/data/wheels";
import { confetti } from "@/lib/fx";
import { powerCountOf, spinsDone, totalSpins } from "@/lib/roll";
import SpinWheel, { type SpinRequest } from "@/features/wheel/SpinWheel";
import OddsList, { pct } from "@/features/wheel/OddsList";
import { advance, canRespin, currentWheel, land, respin, spinResult, type GameConfig, type GameState } from "./engine";
import s from "./game.module.css";

interface Props {
  game: GameState;
  setGame: (fn: (g: GameState | null) => GameState | null) => void;
  config: GameConfig;
  onQuit: () => void;
}

/** How long a result stays on screen before the next wheel (re-spin is possible during it). */
export const RESULT_PAUSE = 2600;
const LEAVE_MS = 280;
const TURN_PAUSE = 1500;
const AUTO_DELAY = 650;

export default function SpinStage({ game, setGame, config, onQuit }: Props) {
  const player = game.players[game.turn];
  const duel = game.mode === "duel";
  const flipped = duel && config.flip && game.turn === 1;

  // the wheel only changes when the turn/step changes, keep the object stable in between
  const wheelKey = `${game.turn}-${spinsDone(player.roll) - (game.phase === "landed" ? 1 : 0)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wheel = useMemo(() => currentWheel(game), [wheelKey, game.phase === "done"]);

  const [request, setRequest] = useState<(SpinRequest & { slot: string }) | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [skip, setSkip] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [turnCard, setTurnCard] = useState<string | null>(duel ? game.players[0].name : null);
  const [odds, setOdds] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);
  const latest = useRef(game);
  latest.current = game;

  /** Transition timers (leave animation, turn card): only cleared on unmount. */
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  /** The auto-continue timer for the result on screen. */
  const autoTimer = useRef<number | null>(null);
  const leavingRef = useRef(false);
  const cancelAuto = () => {
    if (autoTimer.current !== null) window.clearTimeout(autoTimer.current);
    autoTimer.current = null;
  };
  useEffect(
    () => () => {
      cancelAuto();
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  // lock page scroll behind the full-screen stage
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // first duel turn card
  useEffect(() => {
    if (!duel) return;
    later(() => setTurnCard(null), TURN_PAUSE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = useCallback(() => {
    if (spinning || game.phase !== "ready" || !wheel || turnCard || leaving) return;
    const seg = spinResult(wheel);
    setSpinning(true);
    setRequest({ id: ++counter.current, segmentId: seg.id, slot: wheelKey });
  }, [spinning, game.phase, wheel, turnCard, leaving, wheelKey]);

  const onLanded = (id: string) => {
    setSpinning(false);
    setGame((g) => (g ? land(g, id) : g));
  };

  /** Leave the current result and bring in the next wheel (or next player). */
  const goNext = useCallback(() => {
    if (leavingRef.current) return; // never advance twice (auto timer + tap)
    leavingRef.current = true;
    cancelAuto();
    setLeaving(true);
    later(() => {
      const g = latest.current;
      const next = advance(g);
      if (next.mode === "duel" && next.phase !== "done" && next.turn !== g.turn) {
        setTurnCard(next.players[next.turn].name);
        later(() => setTurnCard(null), TURN_PAUSE);
      }
      setGame(() => next);
      leavingRef.current = false;
      setLeaving(false);
    }, LEAVE_MS);
  }, [setGame]);

  // after a result lands: celebrate rare pulls, then auto-continue after the pause
  useEffect(() => {
    if (game.phase !== "landed" || !game.last) return;
    const seg = segmentOf(game.last.wheel, game.last.segmentId);
    if (seg.tier >= 9) confetti(seg.tier >= 11 ? 110 : 50);
    cancelAuto();
    autoTimer.current = window.setTimeout(goNext, RESULT_PAUSE);
    return cancelAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.spinNo, game.phase]);

  // auto-spin mode
  useEffect(() => {
    if (!config.auto || game.phase !== "ready" || turnCard || leaving || spinning) return;
    const t = window.setTimeout(spin, AUTO_DELAY);
    return () => window.clearTimeout(t);
  }, [config.auto, game.phase, turnCard, leaving, spinning, spin]);

  const doRespin = () => {
    if (!canRespin(game) || !wheel || leavingRef.current) return;
    cancelAuto();
    setGame((g) => (g ? respin(g) : g));
    const seg = spinResult(wheel);
    setSpinning(true);
    setRequest({ id: ++counter.current, segmentId: seg.id, slot: wheelKey });
  };

  if (!wheel) return null;

  const landed = game.phase === "landed" && game.last ? game.last : null;
  const landedSeg = landed ? segmentOf(landed.wheel, landed.segmentId) : null;
  const fortune = fortuneOf(player.roll.race);
  const tilted = fortune > 0 && wheel.id !== "race" && wheel.id !== "alignment";
  const powerNo = player.roll.powers.length + (wheel.id === "power" && !landed ? 1 : 0);
  const title = wheel.id === "power" ? `Power ${powerNo} of ${powerCountOf(player.roll)}` : wheel.name;
  const awakened = landed?.wheel === "power" && player.roll.powers.filter((p) => p === landed.segmentId).length >= 2;
  const done = spinsDone(player.roll);
  const total = totalSpins(player.roll);

  return (
    <div className={s.stageLayer} role="application" aria-label="Spin the wheels">
      <div className={`${s.stage} ${flipped ? s.flipped : ""}`}>
        <div className={s.topRow}>
          {confirmQuit ? (
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={onQuit}>
                Quit
              </button>
              <button className="btn sm ghost" onClick={() => setConfirmQuit(false)}>
                Keep spinning
              </button>
            </span>
          ) : (
            <button className={s.quit} onClick={() => setConfirmQuit(true)} aria-label="Quit game">
              ✕
            </button>
          )}
          <div className={s.progress} aria-label={`Spin ${done} of ${total}`}>
            <i style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className={s.stepNo}>
            {Math.min(done + (landed ? 0 : 1), total)}/{total}
          </span>
          <button className={s.oddsTop} onClick={() => setOdds(true)}>
            Odds
          </button>
        </div>

        <div className={s.grid}>
          <div className={`${s.wheelCol} ${leaving ? s.leave : s.enter}`} key={wheelKey}>
            {duel && (
              <div className={`${s.turn} p${game.turn}`}>
                <span className="dot" /> {player.name}
              </div>
            )}
            <h1 className={s.wheelName}>{title}</h1>
            <p className={s.ask}>
              {tilted ? (
                <span className={s.fortune} title="Your race enlarges the rarer slices of every wheel">
                  {segmentOf("race", player.roll.race!).label} fortune · rare slices up to {formatMultiplier(fortune)}
                </span>
              ) : (
                wheel.ask
              )}
            </p>
            <SpinWheel
              wheel={wheel}
              request={request && request.slot === wheelKey ? request : null}
              fast={config.fast}
              landedId={landed?.segmentId ?? null}
              onLanded={onLanded}
              onTap={game.phase === "ready" && !spinning && !turnCard ? spin : undefined}
              skipSignal={skip}
            />
          </div>

          <div className={`${s.sideCol} ${leaving ? s.leave : ""}`}>
            <div className={s.result} aria-live="polite" onClick={landed ? goNext : undefined}>
              {landed && landedSeg ? (
                <div className="pop" key={game.spinNo}>
                  <div
                    className={s.resTier}
                    style={{
                      background: landedSeg.tier >= 0 ? TIER_COLORS[landedSeg.tier] : "var(--bg)",
                      color: landedSeg.tier >= 0 ? textOnTier(landedSeg.tier) : "var(--ink)",
                    }}
                  >
                    {landedSeg.tier >= 0 ? TIER_NAMES[landedSeg.tier] : wheel.name} · {pct(Math.round(landed.chance * 10) / 10)} chance
                  </div>
                  <div className={s.resLabel}>
                    {awakened ? "Awakened " : ""}
                    {landedSeg.label}
                  </div>
                  <div className={s.resDesc}>{awakened ? "Rolled again: this power breaks its limits." : landedSeg.desc}</div>
                  {landed.wheel === "race" && fortuneOf(landed.segmentId) > 0 && (
                    <div className={s.jackpot}>Fortune {formatMultiplier(fortuneOf(landed.segmentId))} on rare slices</div>
                  )}
                  {landed.wheel !== "race" && landedSeg.tier >= 9 && <div className={s.jackpot}>{landedSeg.tier >= 11 ? "Boundless pull" : "Rare pull"}</div>}
                  <div className={s.countdown} key={`c${game.spinNo}`} style={{ animationDuration: `${RESULT_PAUSE}ms` }} aria-hidden />
                </div>
              ) : (
                <div className={s.resIdle}>{spinning ? "Spinning…" : turnCard ? "" : "Tap the wheel to spin"}</div>
              )}
            </div>

            <div className={s.actions}>
              {game.phase === "ready" && !spinning && (
                <button className="btn block" onClick={spin} disabled={!!turnCard || leaving}>
                  Spin
                </button>
              )}
              {spinning && (
                <button className="btn ghost block" onClick={() => setSkip((n) => n + 1)}>
                  Skip animation
                </button>
              )}
              {landed && (
                <div className={s.twoBtn}>
                  <button className="btn ghost" disabled={!canRespin(game) || leaving} onClick={doRespin}>
                    {player.respins > 0 ? "↻ Re-spin (1)" : "No re-spins"}
                  </button>
                  <button className="btn ghost" onClick={goNext} disabled={leaving}>
                    Continue
                  </button>
                </div>
              )}
            </div>

            <div className={s.oddsInline}>
              <div className="kicker" style={{ marginBottom: 6 }}>
                Odds{tilted ? " with your fortune" : ""}
              </div>
              <OddsList wheel={wheel} highlight={landed?.segmentId} base={tilted ? WHEEL_BY_ID[wheel.id] : undefined} />
            </div>
          </div>
        </div>

        {turnCard && (
          <div className={s.turnCard} role="status">
            <div className="kicker">Next turn</div>
            <div className={s.turnName}>{turnCard}</div>
            <p className="muted">{duel && config.flip ? "The screen turns to face you." : "Your spin."}</p>
          </div>
        )}
      </div>

      <Sheet open={odds} onClose={() => setOdds(false)}>
        <div className="kicker">{title}</div>
        <h2 style={{ fontSize: 30, margin: "6px 0 12px" }}>The odds</h2>
        {tilted && <p className="note" style={{ marginTop: -6, marginBottom: 10 }}>Your race&apos;s fortune enlarges rarer slices. Base odds shown faded.</p>}
        <OddsList wheel={wheel} highlight={landed?.segmentId} base={tilted ? WHEEL_BY_ID[wheel.id] : undefined} />
        <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => setOdds(false)}>
          Close
        </button>
      </Sheet>
    </div>
  );
}
