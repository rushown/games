# Games

Small games, big arguments. A little arcade of free browser games by [Roshan Adhikari](https://www.roshana.name.np/):
party games for one phone passed around a room, a physics puzzle, and a classic. No sign-up, no install, works on phones.

| Game | Players | In one line |
| --- | --- | --- |
| [AnimeDraft](#animedraft) | 2–15 | Auction-draft anime's strongest, settle who-wins debates, or find the imposter |
| [WheelDrafter](#wheeldrafter) | 1–2 | Spin wheels of fate to build a one-of-a-kind legend, then duel a friend |
| [Momo Drop](#momo-drop) | 1 | Draw lines so a falling momo lands in its bowl of jhol |
| [Tic Tac Toe](#tic-tac-toe) | 1–2 | The classic, against a friend or a computer that never loses |

---

## The games

### AnimeDraft
`/games/animedraft/` · Next.js app in `src/animedraft-next/`

Three party games built on a roster of 110 anime characters, each with a power-scaling profile synthesised from their
strongest canon feats (attack level, durability, speed, intellect, hax).

- **Draft Duel (auction):** each player starts with $25 and builds a team of 5. Characters go up for auction; raise by
  $1/$2/$5 or go all in. The timer resets on every bid. Each player has one veto skip. When someone runs out of money,
  the other player decides which characters to keep and which to pass. Then the teams fight five 1v1 bouts, strongest
  against strongest. Power scaling decides each bout, never dice.
- **Choose Duel:** call who wins, solo (keep a streak) or against a friend (race to 7). There's also a 16-character
  favourites bracket.
- **Imposter (3–15 players):** pass the phone round. Everyone sees the secret character or series except the imposter,
  who gets a similar one, a one-word clue, or nothing. Give one-word clues in turn, then vote. A caught imposter gets one
  guess at the secret to steal the win.

Full rules are in [`src/animedraft-next/README.md`](src/animedraft-next/README.md).

### WheelDrafter
`/games/wheeldrafter/` · Next.js app in `src/wheeldrafter/`

Spin a series of wheels to build a character: **race → strength, durability, speed → intelligence → power count →
powers → weapon.** Each slice's size is its exact chance, so rarer results get thinner slices. A rare race tilts every
later wheel in your favour. Spinning the same power twice **Awakens** it. At the end you meet your legend, with an exact
rarity rating, and can duel a friend's. Details are in [`src/wheeldrafter/README.md`](src/wheeldrafter/README.md).

### Momo Drop
`site/games/momodrop/` · a single HTML file

A physics puzzle with a Nepali twist. You get a fixed amount of **ink**. Draw lines, press **Drop!**, and the momo
rolls along them under real physics ([Matter.js](https://brm.io/matter-js/)). Land it in the bowl to win.

- **15 levels**, each unlocked by clearing the one before. They add shelves, chilies (touch one and you lose), spinning
  spoons, sliding shelves, yellow launch pads and a moving bowl.
- **Stars** depend on how little ink you used: under 60% earns 3 stars, under 85% earns 2.
- If it fails, **Fix my lines** keeps your drawing so you can adjust it; **Start over** wipes it.
- **Controls:** drag to draw · `Space`/`Enter` to drop or reset · `Ctrl+Z` undo · `Esc` levels menu.
- Progress is saved in the browser (`localStorage`).

### Tic Tac Toe
`site/games/tictactoe/` · a single HTML file

Three in a row wins. X (lime) against O (orange), styled to match the rest of the site.

- **vs Computer:** you're X. **Easy** takes a win when it sees one and blocks you only half the time. **Unbeatable**
  uses a full minimax search, so the best you can do is a draw. It breaks ties between equally good moves at random,
  so games don't repeat.
- **2 Players:** pass and play on one device.
- Who goes first alternates every round. The score and your chosen mode are saved in the browser.
- **Keys:** `1`–`9` play a square (top-left is `1`), arrow keys move around the board, `N` starts a new round.

---

## How the site is put together

One Vercel project, deployed as three **[services](https://vercel.com/docs/services)** behind one domain:

| Service | Folder | Serves | What it is |
| --- | --- | --- | --- |
| `animedraft` | `src/animedraft-next/` | `/games/animedraft/…` | Next.js app (pages plus a read-only `/api/characters` endpoint) |
| `wheeldrafter` | `src/wheeldrafter/` | `/games/wheeldrafter/…` | Next.js app (fully static pages) |
| `site` | `site/` | everything else | Plain HTML: the home page, Momo Drop, Tic Tac Toe |

```
site/
  index.html             the arcade home page (hero, game cards)
  assets/hero/           images for the home page hero
  games/momodrop/        hand-written single-file game
  games/tictactoe/       hand-written single-file game
src/
  animedraft-next/       Next.js app, basePath /games/animedraft
  wheeldrafter/          Next.js app, basePath /games/wheeldrafter
vercel.json              services, routing, redirects, headers, caching
.vercelignore            keeps zips, build output and old files out of the upload
```

Vercel passes the full path to a service without stripping `/games/<name>`, so each Next app sets a matching
`basePath` and `trailingSlash: true` in its `next.config.ts`. The apps don't call each other, so they don't need
service bindings.

### Run it locally

Run all three services together, with the same routing as production:

```bash
vercel dev                     # needs `vercel login` and `vercel link` once
```

Or run one game on its own:

```bash
cd src/animedraft-next         # or src/wheeldrafter
npm install
npm run dev                    # http://localhost:3000/games/animedraft/
npm test && npm run typecheck
```

The plain-HTML games need no build. Serve `site/` with any static server (`npx serve site`), or open the files directly.

Each Next app can also build itself into a single offline HTML file (`npm run build:preview` →
`preview/dist/index.html`). That's handy for sharing, but the site doesn't use it.

### Adding a new game

- **Plain HTML game:**
  1. Put it in `site/games/<name>/index.html`.
  2. Add an "← All games" link back to `../../`.
  3. Add a card to the `.list` in `site/index.html`. The grid fits any number of cards.
- **New framework app:**
  1. Put it in `src/<name>/` and set its base path to `/games/<name>`.
  2. Add it under `services` in `vercel.json`.
  3. Add a rewrite for `/games/<name>(/.*)?` that points to it. Rewrites go above the catch-all `/(.*)` rewrite, which must stay last.

In both cases you can add a short link (for example `/ttt`) under `redirects` in `vercel.json`.

### Deploying (Vercel)

`vercel.json` sets up the three services and their routing. It also sets clean URLs with trailing slashes, security
headers, no caching for pages (updates show up straight away), one-day caching for `assets/`, and these redirects:

| Short link | Goes to |
| --- | --- |
| `/anime`, `/animedraft` | `/games/animedraft/` |
| `/wheel`, `/wheeldrafter` | `/games/wheeldrafter/` |
| `/momo`, `/momodrop`, `/momo-drop` | `/games/momodrop/` |
| `/ttt`, `/tictactoe`, `/tic-tac-toe` | `/games/tictactoe/` |
| `/games` | `/` |

To deploy, run `vercel --prod` from the repo root, or connect the GitHub repo in Vercel. Services are a Vercel beta
feature, available on all plans.

---

© Roshan Adhikari · [roshana.name.np](https://www.roshana.name.np/)
