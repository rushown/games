# AnimeDraft

Party games built from anime's most powerful characters, made for one phone passed around a room.
Built with **Next.js (App Router) + React + TypeScript**, mobile-first.

| Game | Players | What happens |
| --- | --- | --- |
| **Draft Duel** | 2 (+ optional host) | Auction draft: $25 each, teams of 5, one veto skip each, keep/pass when someone's broke |
| **Choose Duel** | 1–2 | Who-wins calls (solo streak or race to 7) and a 16-character favourites bracket |
| **Imposter** | 3–15 | Pass-the-phone social deduction with a secret *character* or *series* |

## Quick start

```bash
npm install
npm run dev           # http://localhost:3000  (portraits + series covers load from AniList automatically)
npm run sync:images   # optional: bake all image URLs into src/data/images.json so nothing is looked up at runtime
```

Other scripts:

```bash
npm test              # engine + database tests (vitest)
npm run typecheck
npm run build && npm start
npm run build:preview # single-file offline build → preview/dist/index.html (no server, no portraits)
```

Deploy anywhere Next.js runs (Vercel works with zero config).

## Game rules

### Draft Duel (auction)
1. A character goes up for auction. Raise by $1/$2/$5 or go all-in. Highest bid wins and pays.
2. The hammer falls when the timer (5/8/12s, resets on every bid) runs out, or when someone taps **Sold!** (Manual mode).
3. **Bid control:** *Players* (each bids from their side, face-to-face layout), *Host* (a host raises bids for whoever calls out and can undo/pause), *Both*, or *Host entry* (the host reads each character aloud, players shout bids, and the host types in the winner and winning amount; no timer, undo last, live draft record).
4. **Skip (×1 each):** veto the current character so nobody gets it, during bidding, as the chooser, or to refuse a character passed to you.
5. When a player runs out of money, bidding stops. The other player decides for each character: **keep it** or **pass it** to the broke player.
6. With both teams of 5 full, squads fight five 1v1 bouts, strongest vs strongest. Each bout is decided by power scaling (below), never dice. Most bouts wins; a split goes to total power (ratings + a +3 synergy bonus per same-series pair).
7. Every finished draft is saved on the device: teams, prices, winner, and a W/L standings table per player name.

### Power scaling
Every character has a profile in `src/data/profiles.ts`, synthesised from their strongest canon feats: attack level and
durability on an 18-step ladder (Street → City → Planet → Universe → Multiverse → Outerverse → Boundless), speed
(Peak Human → Irrelevant), intellect, hax (abilities that skip raw power) and the key feat. Stats, rating and tier are
derived from it (`src/data/scaling.ts`). Outerversal characters (Featherine, Simon, Anos, Rimuru, Madoka, Homura,
Bernkastel, Haruhi) are **∞ BEYOND** and beat anyone below that level; otherwise attack level weighs most, then hax,
durability, speed and intellect.

### Imposter
- **Secret:** a character (e.g. *Satoru Gojo*) or a whole series (e.g. *Jujutsu Kaisen*).
- **What imposters get:** *Similar* (a related character/series to bluff with, e.g. Gojo → Accelerator), *Clue* (one vague word, e.g. "Blindfold"), *Nothing*, or *Undercover* (a similar secret, and they don't know they're the imposter).
- Swipe up and hold to peek → one-word clues in the shown speaking order → vote. A caught imposter gets one guess at the secret to steal the win.

## Project structure

```
src/
  app/                     Next.js routes (thin: each page renders a feature)
    page.tsx               Home
    draft/ choose/ imposter/ roster/
    api/characters/        GET → whole database as JSON
    layout.tsx, globals.css
  data/                    The character database
    characters.ts          110 characters: stats, imposter clues, similar characters
    series.ts              33 series: colours, clues, similar series
    images.json            baked AniList portraits + series covers (written by sync:images)
    index.ts               lookups, pool filters
  features/
    auction/               engine.ts (pure rules) + Setup / Stage / BidderPanel / Results + timer hook
    imposter/              engine.ts + Setup / SwipeReveal / Discuss / Vote / Guess / Results
    choose/                engine.ts + SoloStreak / DuoBattle / BracketGame
    roster/, home/
  components/              AppShell (nav), CharacterCard, SeriesArt (poster/banner), ui (Segmented, Stepper, Sheet, Ring…)
  lib/                     images.ts (batched, cached AniList loader), anilist.ts, battle math, RNG, storage, fx
  hooks/                   usePersistentState
scripts/sync-images.ts     AniList portrait sync
tests/                     vitest: auction, imposter, database integrity
preview/                   esbuild single-file build (shims next/link + next/navigation)
```

Game rules live in pure `engine.ts` reducers with no React, so they're unit-tested (300 random auction drafts and
every imposter size/mode/hint combination run in the test suite).

## Adding characters

Add a row to `SEEDS` in `src/data/characters.ts`:

```ts
["kakashi", "Kakashi Hatake", "na", "Copy Ninja", [82, 88, 90, 72, 72], "Mask|Copy|Book", "gojo|levi|yami"],
//  key       name             series title        POW SPD IQ DUR SUP   imposter clues    similar characters
```

Then `npm run sync:images` to fetch the portrait and `npm test` to validate links. If the sync can't find a confident
match, add an AniList-friendly search name as the 8th field (e.g. `"Satoru Gojo"`).

Stats are fan power-scaling estimates; tune them freely.

## Images

Character portraits and series cover art are the real artwork from [AniList](https://anilist.co)'s public API:

- **At runtime:** the browser batches lookups (6 per request), respects rate limits and caches results in
  `localStorage`, so each device only fetches once. This works on any host, even the single-file build.
- **Baked (optional):** `npm run sync:images` writes every URL into `src/data/images.json`, so images appear instantly.

A match only counts if it belongs to the right series (regex on its titles), which avoids wrong people for names
like "Simon" or "Power". While an image loads, or if AniList is unreachable, cards show a series-coloured placeholder.
Character art belongs to its respective creators and studios.

## Single-file build (no Node needed to host)

`npm run build:preview` produces `preview/dist/index.html`, the whole app in one file with real images loaded from
AniList. Drag it onto [Netlify Drop](https://app.netlify.com/drop) (or any static host) for a shareable link.
