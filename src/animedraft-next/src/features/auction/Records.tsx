"use client";
import { useEffect, useState } from "react";
import CharacterCard from "@/components/CharacterCard";
import { clearRecords, loadRecords, standings, type DraftRecord } from "@/lib/records";
import s from "./auction.module.css";

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Saved Draft Duel results on this device: a standings table plus every past draft. */
export default function Records() {
  const [records, setRecords] = useState<DraftRecord[]>([]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setRecords(loadRecords()), []);

  if (!records.length)
    return (
      <div className="panel">
        <div className="kicker">Records</div>
        <p className="note" style={{ marginBottom: 0 }}>
          Finished drafts are saved here with both teams, prices and the winner.
        </p>
      </div>
    );

  const table = standings(records);
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="kicker">Records · {records.length} drafts</div>
        {confirm ? (
          <span className="row" style={{ gap: 6 }}>
            <button
              className="btn sm"
              onClick={() => {
                clearRecords();
                setRecords([]);
                setConfirm(false);
              }}
            >
              Delete all
            </button>
            <button className="btn sm ghost" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button className="btn sm ghost" onClick={() => setConfirm(true)}>
            Clear
          </button>
        )}
      </div>

      <table className={s.standings}>
        <thead>
          <tr>
            <th>Player</th>
            <th>W</th>
            <th>L</th>
            <th>D</th>
            <th>Spent</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r) => (
            <tr key={r.name.toLowerCase()}>
              <td>{r.name}</td>
              <td>{r.wins}</td>
              <td>{r.losses}</td>
              <td>{r.draws}</td>
              <td>${r.spent}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={s.history}>
        {records.slice(0, 15).map((r) => (
          <details key={r.id} className={s.histItem}>
            <summary>
              <span className={s.histDate}>{when(r.at)}</span>
              <span className={s.histLine}>
                <b className="p0">{r.names[0]}</b> {r.boutWins[0]}–{r.boutWins[1]} <b className="p1">{r.names[1]}</b>
              </span>
              <span className={s.histWin}>{r.winner === null ? "Draw" : `🏆 ${r.names[r.winner]}`}</span>
            </summary>
            {r.teams.map((team, i) => (
              <div key={i} className={`${s.histTeam} p${i}`}>
                <span className="dot" />
                <div className={s.histCards}>
                  {team.map((o) => (
                    <CharacterCard
                      key={o.key}
                      character={o.key}
                      compact
                      badge={<span className={s.price}>{o.via === "won" ? `$${o.price}` : o.via === "kept" ? "KEPT" : "PASS"}</span>}
                    />
                  ))}
                </div>
              </div>
            ))}
          </details>
        ))}
      </div>
    </div>
  );
}
