"use client";
import { useId, useMemo, type ReactNode } from "react";
import { WHEEL_BY_ID, segmentOf } from "@/data/wheels";
import type { CompleteRoll, SingleWheelId } from "@/data/types";
import { rosePath, superformulaPath } from "@/lib/curves";
import { seeded, type Rng } from "@/lib/random";

/**
 * Procedural character portrait (SVG). Nothing is hand-drawn per character:
 * - aura rings: superformula curves in ink (shape from ability, spikiness from strength, smoothness from speed)
 * - sigil: rose curve (petals from the hidden technique)
 * - silhouette features from race, eyes from ability, weapon from the weapon wheel,
 *   star density from the overall rank; only rare characters (Divine and up) get the accent colour.
 *   Seeded, so a character always looks the same.
 */

interface Props {
  roll: CompleteRoll;
  seed: number;
  /** 0–8 rank level from the rating. */
  level: number;
  className?: string;
}

/** Pale paper tint per race (minimal: the silhouette and line work do the talking). */
const RACE_TINT: Record<string, [string, string]> = {
  human: ["#1a1a19", "#121211"],
  beastkin: ["#1c1a16", "#13110e"],
  elf: ["#181b16", "#10130e"],
  android: ["#181a1b", "#0f1112"],
  vampire: ["#1d1717", "#140e0f"],
  demon: ["#1d1815", "#140f0c"],
  dragonborn: ["#1d1915", "#14100c"],
  spirit: ["#181a1a", "#0f1111"],
  angel: ["#1d1c17", "#14130e"],
  titan: ["#1b1a17", "#12110e"],
  eldritch: ["#181a16", "#0f110d"],
  celestial: ["#19181c", "#100f13"],
  primordial: ["#1d1b15", "#14120c"],
  abstract: ["#1a1a1a", "#111111"],
};

const INK = "#ece9e0";
const PAPER = "#0d0d0d";
const ACCENT = "#e8ff47";
const BODY = INK;

export default function Portrait({ roll, seed, level, className }: Props) {
  const uid = useId().replace(/[:]/g, "");
  const art = useMemo(() => build(roll, seed, level, uid), [roll, seed, level, uid]);
  return (
    <svg viewBox="0 0 400 500" className={className} role="img" aria-label="Generated character portrait" preserveAspectRatio="xMidYMid slice">
      {art}
    </svg>
  );
}

function build(p: CompleteRoll, seed: number, level: number, uid: string): ReactNode {
  const rng = seeded(seed * 7 + 3);
  const id = (n: string) => `${n}-${uid}`;
  const tier = (w: SingleWheelId) => segmentOf(w, p[w] as string).tier;
  const powerIdx = (id: string | undefined) => WHEEL_BY_ID.power.segments.findIndex((s) => s.id === id);
  // strongest power shapes the aura, the second strongest the sigil
  const ranked = [...new Set(p.powers)].sort((a, b) => powerIdx(b) - powerIdx(a));

  // line work is ink; eyes light up, and only the rarest characters get the accent colour
  const glow = INK;
  const rare = level >= 6;
  const eye = rare ? ACCENT : PAPER;
  const [bg1, bg2] = RACE_TINT[p.race] ?? RACE_TINT.human;
  const strT = tier("strength");
  const spdT = tier("speed");
  const durT = tier("durability");
  const race = p.race;
  const villain = p.alignment === "villain" || p.alignment === "fallen";

  /* ---------- aura (superformula) ---------- */
  const rings = Math.min(6, 1 + Math.ceil(level / 2) + Math.floor((p.powers.length - 1) / 2));
  const sf = {
    m: 4 + Math.round((powerIdx(ranked[0]) / 23) * 16),
    n1: 0.7 + strT * 0.07,
    n2: 1.2 + spdT * 0.22,
    n3: 1.2 + durT * 0.18,
  };
  const aura = Array.from({ length: rings }, (_, i) => (
    <path
      key={i}
      d={superformulaPath(200, 235, 120 + i * 34, sf, (i * Math.PI) / (sf.m * 2) + rng() * 0.3)}
      fill="none"
      stroke={rare && i === rings - 1 ? "#e8ff47" : INK}
      strokeWidth={1.1}
      opacity={(0.32 + level * 0.05) * (1 - i * 0.12)}
    />
  ));

  /* ---------- sigil (rose curve) ---------- */
  const k = ranked[1] ? [2, 3, 4, 5, 6, 7, 2.5, 3.5, 4.5, 8][powerIdx(ranked[1]) % 10] : p.powers.length + 1;
  const sigil = (level >= 2 || p.powers.length >= 2) && (
    <path d={rosePath(200, 235, 105 + level * 6, k, rng() * Math.PI)} fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={0.8} />
  );

  /* ---------- background ---------- */
  const starCount = 18 + level * 14;
  const stars = Array.from({ length: starCount }, (_, i) => (
    <circle key={i} cx={rng() * 400} cy={rng() * 380} r={rng() * 1.2 + 0.3} fill={INK} opacity={0.12 + rng() * 0.3} />
  ));
  const rays =
    strT >= 6 &&
    Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={200}
          y1={235}
          x2={200 + Math.cos(a) * 420}
          y2={235 + Math.sin(a) * 420}
          stroke={glow}
          strokeOpacity={0.04 + (strT - 6) * 0.01}
          strokeWidth={i % 2 ? 0.6 : 0.3}
        />
      );
    });

  /* ---------- silhouette pieces ---------- */
  const features: ReactNode[] = [];
  const behind: ReactNode[] = [];

  const wings = race === "angel" || race === "dragonborn" || race === "celestial" || (race === "demon" && rng() < 0.5);
  if (wings) {
    const feather = race === "angel" || race === "celestial";
    const wingFill = feather ? PAPER : INK;
    const half = feather
      ? "M182 350 C 120 300, 60 230, 22 120 C 70 160, 92 170, 112 172 C 72 190, 52 215, 38 240 C 82 240, 104 250, 124 262 C 90 278, 72 300, 62 322 C 104 314, 140 320, 168 336 Z"
      : "M182 350 C 140 300, 90 220, 30 110 L 70 210 L 40 205 L 92 262 L 52 266 L 120 310 L 88 322 L 168 344 Z";
    behind.push(
      <g key="wings" opacity={0.95}>
        <path d={half} fill={wingFill} stroke={INK} strokeWidth={1.2} />
        <path d={half} fill={wingFill} stroke={INK} strokeWidth={1.2} transform="translate(400 0) scale(-1 1)" />
      </g>,
    );
  }

  if (race === "eldritch") {
    for (let i = 0; i < 9; i++) {
      const sx = 120 + rng() * 160;
      const dir = rng() < 0.5 ? -1 : 1;
      const len = 120 + rng() * 120;
      const d = `M${sx} 420 C ${sx + dir * len * 0.5} ${380 - rng() * 120}, ${sx - dir * len * 0.3} ${260 - rng() * 80}, ${sx + dir * len} ${200 - rng() * 140}`;
      behind.push(<path key={`t${i}`} d={d} fill="none" stroke={INK} strokeWidth={8 - i * 0.6} strokeLinecap="round" />);
      behind.push(<path key={`tg${i}`} d={d} fill="none" stroke={PAPER} strokeOpacity={0.5} strokeWidth={0.8} />);
    }
  }

  if (race === "abstract") {
    for (let i = 0; i < 14; i++) {
      const x = 60 + rng() * 280;
      const y = 60 + rng() * 380;
      const s = 6 + rng() * 18;
      behind.push(
        <rect
          key={`s${i}`}
          x={x - s / 2}
          y={y - s / 2}
          width={s}
          height={s}
          fill="none"
          stroke={INK}
          strokeOpacity={0.6}
          transform={`rotate(${rng() * 90} ${x} ${y})`}
        />,
      );
    }
  }

  /* weapon */
  const weapon = p.weapon;
  const wColor = INK;
  const wGlow = tier("weapon") >= 10 ? "#e8ff47" : INK;
  const W: Record<string, ReactNode> = {
    katana: (
      <g>
        <path d="M300 470 L 352 120 L 358 122 L 308 472 Z" fill={INK} />
        <rect x="296" y="420" width="26" height="6" rx="2" fill={wColor} transform="rotate(8 309 423)" />
      </g>
    ),
    spear: (
      <g>
        <line x1="310" y1="490" x2="350" y2="110" stroke={INK} strokeWidth="6" />
        <path d="M350 70 L 362 118 L 338 116 Z" fill={wGlow} />
      </g>
    ),
    daggers: (
      <g fill={INK}>
        <path d="M70 470 L 96 330 L 102 331 L 80 472 Z" />
        <path d="M330 470 L 304 330 L 298 331 L 320 472 Z" />
      </g>
    ),
    bow: (
      <g fill="none">
        <path d="M330 130 C 400 230, 400 330, 330 440" stroke={wColor} strokeWidth="6" />
        <line x1="330" y1="130" x2="330" y2="440" stroke={wGlow} strokeWidth="1.5" />
      </g>
    ),
    gauntlets: (
      <g>
        <circle cx="78" cy="455" r="30" fill={wColor} stroke={wGlow} strokeWidth="3" />
        <circle cx="322" cy="455" r="30" fill={wColor} stroke={wGlow} strokeWidth="3" />
      </g>
    ),
    scythe: (
      <g>
        <line x1="300" y1="495" x2="340" y2="90" stroke={INK} strokeWidth="7" />
        <path d="M340 92 C 290 70, 220 90, 190 140 C 240 110, 290 108, 338 120 Z" fill={PAPER} stroke={wGlow} strokeWidth="1.5" />
      </g>
    ),
    cursed: (
      <g>
        <path d="M300 470 L 330 300 L 318 296 L 345 210 L 333 206 L 356 118 L 362 120 L 352 210 L 364 214 L 340 300 L 352 304 L 308 472 Z" fill={INK} stroke={INK} strokeWidth="2" />
      </g>
    ),
    mech: (
      <g fill={INK} stroke={wGlow} strokeWidth="2">
        <path d="M40 420 L 120 372 L 150 400 L 90 470 L 40 470 Z" />
        <path d="M360 420 L 280 372 L 250 400 L 310 470 L 360 470 Z" />
      </g>
    ),
    relic: (
      <g>
        <line x1="340" y1="470" x2="340" y2="160" stroke={wColor} strokeWidth="7" />
        <circle cx="340" cy="140" r="22" fill="none" stroke={wGlow} strokeWidth="5" />
        <circle cx="340" cy="140" r="7" fill={wGlow} />
      </g>
    ),
    hammer: (
      <g>
        <line x1="320" y1="495" x2="345" y2="200" stroke={INK} strokeWidth="9" />
        <rect x="300" y="150" width="96" height="58" rx="8" fill={wColor} stroke={wGlow} strokeWidth="3" transform="rotate(5 348 179)" />
      </g>
    ),
    pen: (
      <g>
        <path d="M290 480 C 320 360, 350 230, 370 100 C 380 180, 360 300, 300 482 Z" fill={PAPER} stroke={INK} strokeWidth="2" />
        <line x1="296" y1="478" x2="366" y2="110" stroke={wGlow} strokeWidth="1" />
      </g>
    ),
  };
  if (W[weapon]) behind.push(<g key="weapon">{W[weapon]}</g>);

  /* hair spikes (anime flair) for humanoid races */
  const hairy = !["android", "abstract", "eldritch", "titan", "spirit"].includes(race);
  if (hairy) {
    const n = 6 + Math.floor(rng() * 5);
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const base = 72;
      const spike = i % 2 ? base + 18 + rng() * 34 : base - 4;
      pts.push(`${(200 + Math.cos(a) * spike * 1.05).toFixed(1)} ${(232 + Math.sin(a) * spike).toFixed(1)}`);
    }
    const long = rng() < 0.4 && race !== "beastkin";
    if (long)
      behind.push(
        <path
          key="locks"
          d="M146 220 C 120 280, 118 340, 132 392 L 170 380 C 160 330, 158 280, 166 236 Z M254 220 C 280 280, 282 340, 268 392 L 230 380 C 240 330, 242 280, 234 236 Z"
          fill={BODY}
        />,
      );
    features.push(<polygon key="hair" points={`142 252 ${pts.join(" ")} 258 252`} fill={BODY} />);
  }

  if (race === "demon" || race === "dragonborn" || race === "primordial") {
    const horn = "M168 196 C 140 160, 132 120, 150 86 C 154 126, 168 158, 186 186 Z";
    features.push(
      <g key="horns" fill={INK}>
        <path d={horn} />
        <path d={horn} transform="translate(400 0) scale(-1 1)" />
      </g>,
    );
  }
  if (race === "elf") {
    features.push(
      <g key="ears" fill={BODY}>
        <path d="M146 240 L 78 192 L 148 274 Z" />
        <path d="M254 240 L 322 192 L 252 274 Z" />
      </g>,
    );
  }
  if (race === "beastkin") {
    features.push(
      <g key="aears" fill={BODY}>
        <path d="M150 200 L 132 128 L 184 176 Z" />
        <path d="M250 200 L 268 128 L 216 176 Z" />
      </g>,
    );
  }
  if (race === "titan" || race === "primordial") {
    features.push(
      <path key="crown" d="M150 186 L 158 140 L 178 168 L 200 126 L 222 168 L 242 140 L 250 186 Z" fill={rare ? ACCENT : PAPER} stroke={INK} strokeWidth={1.4} />,
    );
  }
  const halo = race === "angel" || race === "celestial" || p.alignment === "rogue";
  if (halo) {
    features.push(
      <ellipse key="halo" cx="200" cy="150" rx="58" ry="13" fill="none" stroke={rare ? "#e8ff47" : INK} strokeWidth="2.4" opacity={p.alignment === "fallen" ? 0.35 : 1} />,
    );
  }

  /* eyes */
  const slant = villain ? 6 : 0;
  const eyes =
    race === "android" ? (
      <rect key="visor" x="148" y="238" width="104" height="18" rx="9" fill={eye} />
    ) : race === "eldritch" ? (
      <g key="eyes" fill={eye}>
        {[
          [176, 248],
          [224, 248],
          [200, 226],
          [160, 272],
          [240, 272],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i < 2 ? 7 : 4.5} />
        ))}
      </g>
    ) : (
      <g key="eyes" fill={eye}>
        <ellipse cx="177" cy="252" rx="11" ry="4.6" transform={`rotate(${slant} 177 252)`} />
        <ellipse cx="223" cy="252" rx="11" ry="4.6" transform={`rotate(${-slant} 223 252)`} />
        {tier("intelligence") >= 9 && <ellipse cx="200" cy="222" rx="4" ry="7" />}
      </g>
    );

  const ghostly = race === "spirit" || race === "abstract";
  const bodyFill = race === "celestial" ? `url(#${id("starBody")})` : ghostly ? `url(#${id("ghost")})` : BODY;
  const circuits = race === "android" && (
    <g stroke={PAPER} strokeOpacity={0.4} strokeWidth={1} fill="none">
      <path d="M200 380 L 200 430 L 160 460" />
      <path d="M150 400 L 120 430 L 120 480" />
      <path d="M250 400 L 280 430 L 280 480" />
    </g>
  );
  const vampCollar = race === "vampire" && (
    <g fill={INK} stroke={PAPER} strokeOpacity={0.3}>
      <path d="M120 400 L 150 300 L 178 352 Z" />
      <path d="M280 400 L 250 300 L 222 352 Z" />
    </g>
  );

  return (
    <>
      <defs>
        <radialGradient id={id("bg")} cx="50%" cy="42%" r="70%">
          <stop offset="0" stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </radialGradient>
        <radialGradient id={id("core")} cx="50%" cy="47%" r="40%">
          <stop offset="0" stopColor={ACCENT} stopOpacity={rare ? 0.12 + (level - 6) * 0.08 : 0} />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("ghost")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity="0.5" />
          <stop offset="1" stopColor={INK} stopOpacity="0.02" />
        </linearGradient>
        <pattern id={id("starBody")} width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill={INK} />
          <circle cx="5" cy="7" r="1.1" fill={PAPER} />
          <circle cx="18" cy="16" r="0.8" fill={rare ? ACCENT : PAPER} />
          <circle cx="11" cy="22" r="0.5" fill={PAPER} />
        </pattern>
      </defs>

      <rect width="400" height="500" fill={`url(#${id("bg")})`} />
      {rays}
      {stars}
      <rect width="400" height="500" fill={`url(#${id("core")})`} />
      {sigil}
      {aura}
      {behind}

      {/* body + head */}
      <g fill={bodyFill} stroke={ghostly ? INK : "none"} strokeWidth={1.2} strokeDasharray={race === "abstract" ? "6 5" : undefined}>
        <path d="M30 500 C 40 420, 108 382, 168 362 L 232 362 C 292 382, 360 420, 370 500 Z" />
        <path d="M176 300 L 224 300 L 232 370 L 168 370 Z" />
        <ellipse cx="200" cy="248" rx="58" ry="70" />
      </g>
      {circuits}
      {vampCollar}
      {features}
      {eyes}
    </>
  );
}
