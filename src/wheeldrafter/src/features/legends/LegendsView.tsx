"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui";
import Portrait from "@/features/character/Portrait";
import CharacterReveal from "@/features/character/CharacterReveal";
import { clearLegends, loadLegends, summarize, type Legend } from "@/lib/summary";
import s from "./legends.module.css";

export default function LegendsView() {
  const [list, setList] = useState<Legend[]>([]);
  const [open, setOpen] = useState<Legend | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setList(loadLegends()), []);
  const rows = useMemo(() => list.map((l) => ({ l, sum: summarize(l.roll) })), [list]);

  return (
    <>
      <div className="kicker">Saved on this device</div>
      <h1 className="page-title">Hall of Legends</h1>
      <p className="lead">Your rarest characters, ranked.</p>

      {rows.length === 0 ? (
        <div className="panel center">
          <p style={{ marginTop: 0 }}>No legends yet. Every character you spin lands here.</p>
          <Link className="btn" href="/play">
            Spin your first character
          </Link>
        </div>
      ) : (
        <>
          <ol className={s.list}>
            {rows.map(({ l, sum }, i) => (
              <li key={sum.id}>
                <button type="button" className={s.row} onClick={() => setOpen(l)}>
                  <span className={s.pos}>{i + 1}</span>
                  <span className={s.thumb}>
                    <Portrait roll={l.roll} seed={sum.character.seed} level={sum.rank.level} />
                  </span>
                  <span className={s.info}>
                    <b>{sum.character.name}</b>
                    <span>
                      {sum.rank.title} · {l.owner}
                    </span>
                  </span>
                  <span className={s.topcol}>
                    <span className={s.topLabel}>TOP</span>
                    <span className={s.topVal}>{sum.top}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="row" style={{ marginTop: 14 }}>
            {confirm ? (
              <>
                <button
                  className="btn sm"
                  onClick={() => {
                    clearLegends();
                    setList([]);
                    setConfirm(false);
                  }}
                >
                  Delete all legends
                </button>
                <button className="btn sm ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="chip" onClick={() => setConfirm(true)}>
                Clear hall
              </button>
            )}
          </div>
        </>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <>
            <CharacterReveal roll={open.roll} owner={open.owner} archived />
            <button className="btn ghost block" style={{ marginTop: 12 }} onClick={() => setOpen(null)}>
              Close
            </button>
          </>
        )}
      </Sheet>
    </>
  );
}
