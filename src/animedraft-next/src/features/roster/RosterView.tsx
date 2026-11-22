"use client";
import { useMemo, useState } from "react";
import CharacterCard from "@/components/CharacterCard";
import { Segmented } from "@/components/ui";
import { ACTIVE_SERIES, CHARACTERS, SERIES_BY_KEY } from "@/data";
import { SeriesPoster } from "@/components/SeriesArt";
import CharacterSheet from "./CharacterSheet";
import SeriesSheet from "./SeriesSheet";
import s from "./roster.module.css";

type Sort = "rating" | "pow" | "iq" | "spd";

export default function RosterView() {
  const [series, setSeries] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("rating");
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"characters" | "series">("characters");
  const [openSeries, setOpenSeries] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHARACTERS.filter(
      (c) =>
        (series === "all" || c.series === series) &&
        (!q || c.name.toLowerCase().includes(q) || SERIES_BY_KEY[c.series].name.toLowerCase().includes(q)),
    ).sort((a, b) => (sort === "rating" ? b.rating - a.rating : b.stats[sort] - a.stats[sort]));
  }, [series, query, sort]);

  return (
    <>
      <div className="kicker">The roster · {CHARACTERS.length} characters</div>
      <h1 className="page-title" style={{ marginBottom: 14 }}>
        Who&apos;s who
      </h1>
      <div style={{ maxWidth: 320, marginBottom: 12 }}>
        <Segmented<"characters" | "series">
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "characters", label: "Characters" },
            { value: "series", label: `Series (${ACTIVE_SERIES.length})` },
          ]}
        />
      </div>
      {view === "series" ? (
        <div className={s.posterGrid}>
          {ACTIVE_SERIES.map((sr) => (
            <SeriesPoster key={sr.key} seriesKey={sr.key} showCount onClick={() => setOpenSeries(sr.key)} />
          ))}
        </div>
      ) : (
        <>
      <input
        className="input"
        placeholder="Search a character or series…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search"
        style={{ marginBottom: 12 }}
      />
      <div className={s.filters} data-ui="hscroll">
        <button className={`chip ${series === "all" ? "on" : ""}`} onClick={() => setSeries("all")}>
          All
        </button>
        {ACTIVE_SERIES.map((sr) => (
          <button key={sr.key} className={`chip ${series === sr.key ? "on" : ""}`} onClick={() => setSeries(sr.key)}>
            {sr.name}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 420, marginBottom: 14 }}>
        <Segmented<Sort>
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "rating", label: "Rating" },
            { value: "pow", label: "Power" },
            { value: "iq", label: "IQ" },
            { value: "spd", label: "Speed" },
          ]}
        />
      </div>
      <div className={s.grid}>
        {list.map((c) => (
          <CharacterCard key={c.key} character={c} onClick={() => setOpen(c.key)} />
        ))}
      </div>
      {!list.length && <p className="muted">Nobody by that name.</p>}
        </>
      )}
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
