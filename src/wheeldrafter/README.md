# WheelDrafter

Spin the wheels of fate and build a one-of-a-kind legend. Every slice is its exact chance (rarer tiers get thinner
slices), a rare race tilts every later wheel in your favour, and your power count decides how many powers you spin for.
At the end you meet the character those spins create, with an exact rarity rating.

**Next.js (App Router) · React · TypeScript.** Mobile-first, fully static, no backend, no external requests.

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # rules, exact rarity, uniqueness, game flow (vitest)
npm run typecheck
npm run build && npm start
npm run build:preview  # the whole game as one offline HTML file → preview/dist/index.html
```

## Deploying

The production build is fully static (every route is prerendered), so it runs on any host:

- **Vercel:** import the repo, no configuration needed.
- **Netlify / Cloudflare Pages / any Node host:** `npm run build`, then `npm start` (or deploy the Next.js output with
  the platform's Next.js adapter).
- **No server at all:** `npm run build:preview` and upload `preview/dist/index.html` anywhere (works offline too).

CI (`.github/workflows/ci.yml`) runs typecheck, tests and the production build on every push and PR.

Production details already in place: security headers (`nosniff`, frame/referrer/permissions policies, no
`x-powered-by`), error page, 404 page, app icon and web-app manifest, reduced-motion support, and all storage access is
guarded (private browsing works; legends just aren't saved).

## How a game plays

1. **Race** (14, Human 18% → Abstract Entity 1.5%)
2. **Strength · Durability · Speed** (Average Human → Boundless, 12 tiers, base top slice 0.5%)
3. **Intelligence** (Average → Omniscient)
4. **Power Count** (1–6): how many times you spin the next wheel
5. **Power × count** (24 powers, Enhanced Senses 12% → Narrative Immunity 0.3%). The same power twice = **Awakened**.
6. **Weapon** (Bare Fists → Pen of Creation)
7. **Path** (Hero, Villain, Anti-Hero… equal odds, flavour only)

**Flow:** tap to spin (or turn on auto-spin). Each result stays on screen for 2.6s with a draining timer bar; you can
use your one **re-spin** during that window, or tap Continue. Then the next wheel transitions in on its own. No list of
collected traits is shown during play: the full character is revealed at the end.

**Duel:** players alternate one spin at a time; whoever has more powers keeps spinning at the end. Between turns a
"next turn" card shows for 1.5s and, in face-to-face seating, the whole screen rotates 180° to face the other player.
Highest power score wins.

## Fortune (race shapes everything after it)

Each race has a fortune `f = (raceTier / 11)^1.4` (0 for humans, 1 for an Abstract Entity). On every later wheel each
slice is re-weighted by `e^(3.5 · f · tier/11)` and renormalised, so top-tier slices grow by up to **×33** for a god
race while common slices shrink. The wheel is redrawn with the new slice sizes and the odds sheet shows base vs
boosted chances.

## Score & exact rarity

`score = race + 3·strength + 2·durability + 2·speed + intelligence + weapon + Σ power tiers` (tiers 0–11, max 176).

Because fortune makes every wheel depend on the race, and the power count decides how many power draws happen, the
exact distribution is a mixture:

```
P(score) = Σ_race P(race) · [ race ⊗ str ⊗ dur ⊗ spd ⊗ int ⊗ weapon ⊗ Σ_k P(k | race) · power^{⊗k} ]
```

(⊗ = convolution, each wheel using that race's tilted odds). "Top X%" is P(a random character scores at least yours).
Computed lazily on first use (~8ms). Tests confirm it against 150,000 simulated games run through the real engine,
and that a perfect roll equals the product of every top-tier slice: **1 in 16.5 quadrillion**.

Ranks: Mortal → Awakened → Hero → Legend → Mythic → Demigod → Divine → Transcendent → Boundless One.

## Every character is unique

- **Legend ID:** a mixed-radix number built from every result (each wheel's slice index + how many times each power
  was rolled). It's a bijection: two characters share an ID only if every spin matches. Tests check that changing any
  single spin changes the ID, and that 300,000 random characters produce no collisions.
- **Name, epithet, backstory and portrait** are seeded from a hash of all results, so any single change produces a
  different character.

## Portraits

`src/features/character/Portrait.tsx` draws an SVG from the spins: ink line work on race-tinted paper, aura rings from
the **superformula** (shape from the strongest power, spikiness from strength), a **rose-curve** sigil from the second
power, race features (wings, horns, halo, ears, visor, crown, tendrils, shards), weapon silhouette, and more rings for
more powers. Only Divine-and-up characters get the lime accent. Each reveal also includes an **AI image prompt**.

## Structure

```
src/
  app/                 routes (/, /play, /legends), layout, error, 404, icon, manifest
  data/wheels.ts       all wheels, odds, tiers, fortune tilt
  lib/
    roll.ts            spin order, wheel-for-player, Legend ID, seed
    rating.ts          score, exact mixture distribution, Top % / 1-in-N, ranks
    generator.ts       names, epithets, backstory, AI prompt
    curves.ts          superformula + rose curve paths
    summary.ts         character summary + Hall of Legends storage
  features/
    game/              engine.ts (pure turn logic), SpinStage (auto flow, duel flip), Setup
    wheel/             SpinWheel (GPU-composited 60fps spin), geometry, OddsList
    character/         Portrait, CharacterReveal, DuelReveal
    legends/, home/
tests/                 rating, game flow, uniqueness, wheel landing accuracy
preview/               esbuild single-file build
```

To change odds, edit `src/data/wheels.ts`; `npm test` checks every wheel still totals 100%.
