# Games

Small games, big arguments. A little arcade of free browser games by [Roshan Adhikari](https://www.roshana.name.np/):
party games for one phone passed around a room, a physics puzzle, a quiz ladder, and a classic. No sign-up, no install, works on phones.

| Game | Players | In one line |
| --- | --- | --- |
| [AnimeDraft](#animedraft) | 2–15 | Auction-draft anime's strongest, settle who-wins debates, or find the imposter |
| [WheelDrafter](#wheeldrafter) | 1–2 | Spin wheels of fate to build a one-of-a-kind legend, then duel a friend |
| [Momo Drop](#momo-drop) | 1 | Draw lines so a falling momo lands in its bowl of jhol |
| [Trench Dive](#trench-dive) | 1–2 | Name anything that fits; the rarer your answer, the deeper you sink |
| [PokeDraft](#pokedraft) | 1–2 | Six stat reels roll random Pokémon; lock one per spin to out-stat Arceus or sink under Magikarp |
| [Quiz Duel](#quiz-duel) | 2–6 groups | A timed classroom quiz: 900 easy questions across 9 subjects, turn by turn |
| [Bubble Blower](#bubble-blower) | 1 | 3D undersea timing: hold to blow, let go when the bubble fills the shape; combos, Fever, jellyfish |
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

### Trench Dive
`site/games/trench/` · one HTML file plus the prompt bank in `prompts.js`

An open-answer word game. Each prompt is a category ("Name an animal that lives in Africa"), and you type any one
answer that fits. Correct answers are ranked by how rare they are, from five ocean zones:

| Zone | Points | Depth |
|---|---|---|
| Rushallow (the obvious answers) | 10 | 100 m |
| Rushtide | 25 | 250 m |
| Rushgloom | 50 | 500 m |
| Rushownland | 75 | 750 m |
| Rushllion (the rare, satisfying finds) | 100 | 1,000 m |

- **A dive is 7 prompts.** Every point is 10 m, so a perfect dive reaches 7,000 m. An answer that isn't on the chart,
  a skip or running out of time scores 0.
- **Matching:** case, accents, punctuation, a leading "the", plurals and listed alternative names are ignored, and a
  small typo is forgiven on longer answers (1 letter from 5 letters, 2 from 9). A fuzzy tie goes to the shallower
  answer. After each prompt you can open the full chart of answers.
- **Daily dive:** the same 7 prompts for everyone on a date (seeded by the date, at most 2 per category). Only the
  first try counts; replays are marked unscored. **Copy result** shares a coloured grid of your zones.
- **Free dive:** 7 random prompts from the categories you pick. Prompts don't repeat until a category runs out.
- **Duel:** pass-and-play. Both players answer the same prompt in secret, then both answers sink side by side. If
  you both give the same answer, each gets half points.
- **Prompts:** 47 prompts across Animals, General knowledge, Geography, Food, Science and Sports, each with
  roughly 30 to 120 accepted answers. To add one, append a line to `prompts.js`:
  `[category, prompt, sunlight, twilight, midnight, abyss, hadal]`, with answers separated by `|` and alternative
  spellings by `/`.
- The 25-second timer is optional and pauses when the tab is hidden. Stats, settings and daily results are saved in
  the browser (`localStorage`).

### PokeDraft
`site/games/pokedraft/` · one HTML file, base stats for all 1,025 Pokémon embedded (from PokeAPI)

Choose generations (and legendaries on or off), then pick a mode. Before the first spin the game fetches every image it
will show from the PokeAPI sprite repo, with a progress bar, so the reels run smoothly.

Each spin, all six stat slots (HP, Atk, Def, SpA, SpD, Spe) roll like slot-machine reels and each lands on its own
random Pokémon, stats hidden. Tap one slot to lock it: you score that Pokémon's base stat for that slot. The unlocked
slots roll again, one lock per spin, until all six are locked (the last locks itself). The reveal shows your total,
every spin with its stats, and the best possible locks on the same spins (all 720 lock orders tried).

- **Out-stat Arceus:** finish with a base stat total over 720. Arceus sits in the header as the boss and faces your creature on the result.
- **Under Magikarp:** finish under 200, with Magikarp as the boss.
- **Bullseye:** a random target from 300 to 650; land within 10.
- **Duel:** both players get the same spins in the same order. P1 locks and passes the phone, then P2; highest (or lowest) total wins.
- **Rerolls:** 0–3 per game (solo modes) to re-roll the open slots without locking. Settings and personal bests are kept in `localStorage`.
- **Keys:** `Space` spin · `1`–`6` lock HP…Spe · `R` reroll.
- **Loading:** the first two spins' images (and the boss) load before play; the rest load in the background, 4 at a time.

### Quiz Duel
`site/games/quizduel/` · one HTML file plus a question bank in `questions/`

A group quiz in the style of a Nepali school quiz contest, for a classroom, a projector or friends round one screen.

- **Groups:** 2 to 6, each with its own name and colour.
- **Subjects:** tick any of Mathematics, Science, Astronomy, Geography, Animals, Plants, Chemistry, Human Body and
  Nepal. Each has **100 questions**. Maths is class 5–7 level with Nepali context (rupees, Bikram Sambat); the rest
  are simple general knowledge.
- **Timer:** maths gives the group **20 s**, other subjects **18 s**. A pass, a wrong answer or running out of time sends
  the question to the next group with **10 s**. A direct answer scores **10**, a passed one **5**.
- **Turns, not rounds:** questions go to the groups in order (A, B, C, A, B…), each from a random ticked subject,
  and keep coming until the quizmaster presses *End quiz*. The final scores show how many questions each group got.
- **Answer styles:** *Pick from 4 choices* (groups tap an answer; a wrong pick is crossed out before the pass, and a
  question passes at most twice) or *Quizmaster checks* (groups answer out loud, the host reveals and marks it, and a
  question can pass round every group).
- **No repeats:** every question shown is remembered in the browser (`localStorage`), so later games draw new ones
  until a subject's 100 are used up. Then that subject starts over. *Reset used questions* clears the history.
- **Keys:** `1`–`4`/`A`–`D` answer · `P` pass · `Space` pause · `Enter` next. Quizmaster mode: `S` show, `C` correct, `W` wrong.

Each file in `questions/` holds one subject as `[question, answer, wrong, wrong, wrong]`. The game shuffles the options.

### Bubble Blower
`site/games/bubbleblower/` · a single HTML file, 3D with [three.js](https://threejs.org/) (loaded from jsDelivr)

A one-button timing game on a toon-shaded sea floor. Pick a buddy, then hold (mouse, touch, `Space` or `Enter`) to blow
a bubble out of the wand and let go when it fills the glowing yellow shape. The faint orange shape is where it pops.

- **Endless, with 3 lives.** A pop, or a bubble more than 22% off, costs a life. Shapes are Round, Heart, Star, Fish,
  Cube and Donut at random sizes. Every bubble blows a little faster, and holding longer speeds it up. A level is 5 bubbles.
- **Grades:** Perfect (100), Great within 8% (60), Good within 14% (35), Okay within 22% (15).
- **Combo:** each Perfect or Great adds to the combo. Every 2 in a row raises the multiplier, up to ×5.
- **Fever:** 3 Perfects in a row gives 5 bubbles at double points and a bonus life (up to 5).
- **Twists that start later in a run:** golden bubbles (×3, from bubble 4), a jellyfish that patrols across and pops
  any bubble it touches (from bubble 6), and shapes that breathe in and out (from bubble 9).
- **Buddies** (original characters, built from three.js shapes): **Puff** the pufferfish blows 25% faster, ×1.3 points;
  **Shellby** the hermit crab is the baseline; **Tide** the sea turtle blows 22% slower with a wider Perfect window, ×0.8.
- **Your buddy:** the fourth slot takes any picture from the player's device and shows it as a sticker cut-out that
  bounces, spins and holds the wand. It's shrunk to 512px and kept only in that browser; nothing is uploaded.
- Best score per buddy, the chosen buddy, the picture and the sound setting are saved in the browser (`localStorage`). `←`/`→` change buddy on the picker.

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
| `site` | `site/` | everything else | Plain HTML: the home page, Momo Drop, Tic Tac Toe, Trench Dive, Quiz Duel, PokeDraft, Bubble Blower |

```
site/
  index.html             the arcade home page (hero, game cards)
  assets/hero/           images for the home page hero
  games/momodrop/        hand-written single-file game
  games/tictactoe/       hand-written single-file game
  games/quizduel/        hand-written game + questions/ (one file per round)
  games/trench/          hand-written game + prompts.js (the answer charts)
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
| `/quiz`, `/quizduel`, `/quiz-duel` | `/games/quizduel/` |
| `/trench`, `/dive`, `/krillion`, `/kr` | `/games/trench/` |
| `/bubble`, `/bubbleblower`, `/bubble-blower` | `/games/bubbleblower/` |
| `/games` | `/` |

To deploy, run `vercel --prod` from the repo root, or connect the GitHub repo in Vercel. Services are a Vercel beta
feature, available on all plans.

---

© Roshan Adhikari · [roshana.name.np](https://www.roshana.name.np/)
