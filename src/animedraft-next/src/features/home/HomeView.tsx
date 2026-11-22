"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CharacterCard from "@/components/CharacterCard";
import { CHARACTERS, ACTIVE_SERIES } from "@/data";
import CharacterSheet from "@/features/roster/CharacterSheet";
import SeriesSheet from "@/features/roster/SeriesSheet";
import { SeriesPoster } from "@/components/SeriesArt";
import s from "./home.module.css";

const GAMES = [
  {
    href: "/draft",
    cls: s.g1,
    num: "01",
    tag: "2 PLAYERS · HOST",
    title: "Draft Duel",
    text: "$25 each. Bid on anime's strongest, veto once, and when someone's broke, the other decides who gets what.",
  },
  {
    href: "/choose",
    cls: s.g2,
    num: "02",
    tag: "SOLO · 2 PLAYERS",
    title: "Choose Duel",
    text: "Two fighters, one winner. Call who wins, race your friend to 7, or crown your favourite in a 16-character bracket.",
  },
  {
    href: "/imposter",
    cls: s.g3,
    num: "03",
    tag: "3–15 PLAYERS",
    title: "Imposter",
    text: "Pass the phone and swipe to see the secret character or series. Someone got a lookalike. Find them.",
  },
];

export default function HomeView() {
  // top-rated legends (deterministic, so server and client render the same list)
  const featured = useMemo(() => [...CHARACTERS].sort((a, b) => b.rating - a.rating).slice(0, 16), []);
  const [open, setOpen] = useState<string | null>(null);
  const [openSeries, setOpenSeries] = useState<string | null>(null);

  return (
    <>
      <section className={s.hero}>
        <div className={s.burst} aria-hidden />
        <div className="kicker">
          {CHARACTERS.length} legends · {ACTIVE_SERIES.length} series · 3 games
        </div>
        <h1 className={s.title}>
          <span className={s.o}>DRAFT.</span> <span>DUEL.</span> <span className={s.r}>DECEIVE.</span>
        </h1>
        <p className={s.lead}>
          Bid for the strongest squad, settle who-beats-who arguments, or sniff out the imposter in your friend group, all on
          one phone.
        </p>
      </section>

      <div className={s.games}>
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className={`${s.game} ${g.cls}`}>
            <span className={s.tag}>{g.tag}</span>
            <div className={s.num}>{g.num}</div>
            <h2>{g.title}</h2>
            <p>{g.text}</p>
            <span className={s.go} aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>

      <div className={s.sechead}>
        <h3>Top of the power scale</h3>
        <Link href="/roster">Full roster →</Link>
      </div>
      <div className={s.strip} data-ui="hscroll">
        {featured.map((c) => (
          <div key={c.key} className={s.stripItem}>
            <CharacterCard character={c} onClick={() => setOpen(c.key)} />
          </div>
        ))}
      </div>
      <div className={s.sechead}>
        <h3>The series</h3>
        <Link href="/roster">Browse all →</Link>
      </div>
      <div className={s.strip} data-ui="hscroll">
        {ACTIVE_SERIES.map((sr) => (
          <div key={sr.key} className={s.stripItem}>
            <SeriesPoster seriesKey={sr.key} showCount onClick={() => setOpenSeries(sr.key)} />
          </div>
        ))}
      </div>
      <CharacterSheet characterKey={open} onClose={() => setOpen(null)} onOpen={setOpen} />
      <SeriesSheet
        seriesKey={openSeries}
        onClose={() => setOpenSeries(null)}
        onOpenCharacter={(k) => {
          setOpenSeries(null);
          setOpen(k);
        }}
      />
    </>
  );
}
