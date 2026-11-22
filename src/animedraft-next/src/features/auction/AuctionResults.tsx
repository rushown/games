"use client";
import { useEffect, useMemo } from "react";
import CharacterCard from "@/components/CharacterCard";
import { CompareBars } from "@/components/ui";
import { CHARACTER_BY_KEY } from "@/data";
import { STAT_LABEL, teamBattle } from "@/lib/battle";
import { confetti } from "@/lib/fx";
import { saveRecord } from "@/lib/records";
import { Ledger } from "./HostEntry";
import type { AuctionState, Owned, PlayerId } from "./engine";
import s from "./auction.module.css";

interface Props {
  state: AuctionState;
  onRematch: () => void;
  onSettings: () => void;
}

export default function AuctionResults({ state, onRematch, onSettings }: Props) {
  const [A, B] = state.players;
  const battle = useMemo(
    () => teamBattle(A.team.map((o) => CHARACTER_BY_KEY[o.key]), B.team.map((o) => CHARACTER_BY_KEY[o.key])),
    [A.team, B.team],
  );
  const awards = useMemo(() => buildAwards(state), [state]);

  useEffect(() => {
    if (battle.winner !== null) confetti();
  }, [battle.winner]);

  // keep a record of every finished draft (same draft saved once)
  useEffect(() => {
    saveRecord({
      id: state.startedAt,
      at: Date.now(),
      names: [A.name, B.name],
      teams: [A.team.map((o) => ({ ...o })), B.team.map((o) => ({ ...o }))],
      left: [A.budget, B.budget],
      boutWins: battle.boutWins,
      winner: battle.winner,
      hostEntry: state.config.control === "entry",
    });
  }, [state, A, B, battle]);

  const winnerName = battle.winner === null ? null : state.players[battle.winner].name;
  const max = Math.max(...battle.categories.flatMap((c) => [c.a, c.b]), 1);

  return (
    <div className="narrow" style={{ maxWidth: 820 }}>
      <div className={`banner ${battle.winner !== null ? `p${battle.winner}` : ""}`}>
        <div className="kicker" style={{ color: "#fff" }}>
          Bouts {battle.boutWins[0]} – {battle.boutWins[1]}
          {battle.decidedBy === "total" ? " · decided on total power" : ""}
        </div>
        <h2>{winnerName ? `${winnerName} wins` : "It's a draw"}</h2>
        <div className="money" style={{ fontSize: 13, marginTop: 6 }}>
          Power {battle.scores[0].total} vs {battle.scores[1].total}
        </div>
      </div>

      <div className={s.teams}>
        {([0, 1] as PlayerId[]).map((p) => {
          const pl = state.players[p];
          const sc = battle.scores[p];
          return (
            <section key={p} className={`${s.teamBox} p${p}`}>
              <h3>
                <span className="row" style={{ gap: 8, minWidth: 0 }}>
                  <span className="dot" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
                </span>
                {battle.winner === p && <span title="Winner">🏆</span>}
              </h3>
              <div className={s.teamGrid}>
                {pl.team.map((o) => (
                  <CharacterCard key={o.key} character={o.key} badge={<span className={s.tag}>{priceLabel(o)}</span>} />
                ))}
              </div>
              <div className={s.teamMeta}>
                <span>
                  Avg rating <b>{sc.avgRating}</b>
                </span>
                <span>
                  Synergy <b>+{sc.synergy}</b>
                </span>
                <span>
                  Left over <b>${pl.budget}</b>
                </span>
              </div>
            </section>
          );
        })}
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="kicker" style={{ marginBottom: 8 }}>
          The fights · strongest vs strongest
        </div>
        <ol className={s.bouts}>
          {battle.bouts.map((b, i) => (
            <li key={i} className={s.bout}>
              <div className={s.boutCards}>
                <div className={b.winner === 0 ? s.bWin : s.bLose}>
                  <CharacterCard character={b.a} compact />
                </div>
                <span className={s.boutVs}>VS</span>
                <div className={b.winner === 1 ? s.bWin : s.bLose}>
                  <CharacterCard character={b.b} compact />
                </div>
              </div>
              <div className={s.boutText}>
                <b className={`p${b.winner}`}>
                  {(b.winner === 0 ? b.a : b.b).name} wins <span className="muted">for {state.players[b.winner].name}</span>
                </b>
                <span>{b.reason}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b className="p0">{A.name}</b>
          <span className="kicker">Team totals</span>
          <b className="p1">{B.name}</b>
        </div>
        <CompareBars rows={battle.categories.map((c) => ({ label: STAT_LABEL[c.stat], a: c.a, b: c.b }))} max={max} />
      </div>

      <div style={{ marginTop: 12 }}>
        <Ledger state={state} />
      </div>

      {awards.length > 0 && (
        <div className={s.awards}>
          {awards.map((a) => (
            <div className={s.award} key={a.title}>
              <div className={s.label}>{a.title}</div>
              <b>{a.name}</b>
              <span>{a.detail}</span>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onRematch}>
          Rematch
        </button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}

function priceLabel(o: Owned) {
  return o.via === "won" ? `$${o.price}` : o.via === "kept" ? "KEPT" : "PASS";
}

function buildAwards(state: AuctionState) {
  const all = state.players.flatMap((p, i) => p.team.map((o) => ({ ...o, owner: i as PlayerId, c: CHARACTER_BY_KEY[o.key] })));
  const bought = all.filter((o) => o.via === "won");
  const out: { title: string; name: string; detail: string }[] = [];
  if (bought.length) {
    const priciest = bought.reduce((a, b) => (b.price > a.price ? b : a));
    out.push({ title: "Biggest buy", name: priciest.c.name, detail: `$${priciest.price} by ${state.players[priciest.owner].name}` });
    const steal = bought.reduce((a, b) => (b.c.rating / b.price > a.c.rating / a.price ? b : a));
    out.push({ title: "Steal of the draft", name: steal.c.name, detail: `Rating ${steal.c.rating} for $${steal.price}` });
  }
  const free = all.filter((o) => o.via !== "won");
  if (free.length) {
    const best = free.reduce((a, b) => (b.c.rating > a.c.rating ? b : a));
    out.push({ title: "Best freebie", name: best.c.name, detail: `${best.via === "kept" ? "Kept" : "Passed"} → ${state.players[best.owner].name}` });
  }
  const vetoes = state.log.filter((l) => l.kind === "vetoed");
  if (vetoes.length) {
    const v = vetoes[0];
    out.push({ title: "Vetoed", name: CHARACTER_BY_KEY[v.key].name, detail: `by ${state.players[v.player!].name}` });
  }
  return out;
}
