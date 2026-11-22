"use client";
import Link from "next/link";
import { WHEEL_BY_ID, WHEELS } from "@/data/wheels";
import SpinWheel from "@/features/wheel/SpinWheel";
import { MAX_SCORE, formatOneIn, rarityOf } from "@/lib/rating";
import s from "./home.module.css";

const LADDER: [string, string][] = [
  ["Mortal", "Top 100%"],
  ["Awakened", "Top 50%"],
  ["Hero", "Top 20%"],
  ["Legend", "Top 5%"],
  ["Mythic", "Top 1%"],
  ["Demigod", "Top 0.1%"],
  ["Divine", "Top 0.01%"],
  ["Transcendent", "Top 0.0001%"],
  ["Boundless One", "a perfect roll"],
];

export default function HomeView() {
  return (
    <>
      <section className={s.hero}>
        <div className={s.copy}>
          <div className="kicker">
            {WHEELS.length} wheels · odds from 20% to 0.5% · perfect roll {formatOneIn(rarityOf(MAX_SCORE))}
          </div>
          <h1 className={s.title}>
            <span>Spin a</span>
            <span>
              <em className={s.mark}>legend.</em>
            </span>
          </h1>
          <p className={s.lead}>
            Every trait is a wheel where rarer tiers get thinner slices. A rare race tilts every wheel after it in your favour,
            and your power count decides how many powers you spin for. Then meet the one character those spins could make.
          </p>
          <div className={s.cta}>
            <Link className="btn" href="/play">
              Start spinning
            </Link>
            <Link className="btn ghost" href="/legends">
              Hall of Legends
            </Link>
          </div>
        </div>
        <Link href="/play" className={s.demo} aria-label="Start spinning" tabIndex={-1}>
          <SpinWheel wheel={WHEEL_BY_ID.strength} request={null} onLanded={() => {}} />
        </Link>
      </section>

      <div className={s.features}>
        <div className={s.feature}>
          <b>Fortune</b>
          <p>Roll a rare race and every later wheel tilts your way. A god race makes the top slices up to 33× bigger.</p>
        </div>
        <div className={s.feature}>
          <b>Up to six powers</b>
          <p>Spin how many powers you hold, then spin each one from 24. Land the same power twice and it awakens.</p>
        </div>
        <div className={s.feature}>
          <b>One of a kind</b>
          <p>Change a single spin and you get a different character: new Legend ID, name, portrait, story and exact rarity.</p>
        </div>
      </div>

      <h2 className={s.h2}>Rank ladder</h2>
      <ol className={s.ladder}>
        {LADDER.map(([t, r]) => (
          <li key={t}>
            <span>{t}</span>
            <span className={s.lr}>{r}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
