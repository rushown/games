# AnimeDraft for Roblox

**Draft Duel**, the auction from `animedraft-next`, rebuilt as a multiplayer Roblox game.

- Two seats (players or bots) and any number of spectators. Each seat gets a budget and builds a team of 3 or 5.
- Characters come up one at a time. Raise by $1/$2/$5 or go all in. Every bid resets the hammer timer (5/8/12s or manual).
- Each seat has **one skip** (veto). When a seat runs out of money, the other seat **keeps or passes** each character.
- Full teams fight strongest-vs-strongest 1v1 bouts, decided by the same power-scaling profiles as the website.
- Wins and losses go on the leaderboard and are saved with DataStores. Saving needs *Game Settings → Security → Enable Studio Access to API Services* to work in Studio.
- If a player leaves mid-draft, a bot takes over their seat.
- **Energy:** starting a draft (or a rematch) costs each human player 1 ⚡. Every UTC day each player is topped back up
  to **10** for free, and energy bought above that never expires. Players buy more in the shop with Robux
  (5 / 15 / 40 packs). The pill in the bottom-left shows energy and the time until the next top-up; tap it to open the shop.

## Turning on Robux energy packs

1. Publish the place (**File → Publish to Roblox**).
2. On the Creator Dashboard open the experience, then **Monetization → Developer Products**, and create three products
   (for example *Snack Pack* 5 ⚡ for R$25, *Bento Box* 15 ⚡ for R$60, *Feast* 40 ⚡ for R$140).
3. Paste each product ID into `id = …` in `src/shared/Config.luau` and rebuild or re-sync.
   Packs left at `id = 0` show as "Coming soon".
4. In Studio, enable **Game Settings → Security → Enable Studio Access to API Services** so energy, records and
   purchases save. Purchases made in Studio are free test purchases.

Energy is granted in `MarketplaceService.ProcessReceipt` (`src/server/Energy.luau`). Each receipt id is stored in
the player's record, so a retried receipt is never granted twice.

The world (hall, stage, podiums and a big screen that shows the current lot) is built by `Arena.luau` when the server starts, so the place file needs no hand-placed parts.

## Layout

```
default.project.json   Rojo project
scripts/export-data.ts generates src/shared/Data.luau from ../animedraft-next/src/data
src/shared/            ReplicatedStorage.Shared: Data (generated), Auction engine, Battle
src/server/            ServerScriptService.Server: Main (match flow, remotes), Bot, Arena
src/client/            StarterPlayerScripts.Client: UI (lobby, auction HUD, results)
```

After changing characters in the web app, regenerate the data:

```bash
cd ../animedraft-next && npx tsx --tsconfig tsconfig.json ../animedraft-roblox/scripts/export-data.ts
```

## Getting it into Roblox Studio (Studio running in a Windows VM)

The VM reaches this Linux host at **192.168.122.1** (libvirt bridge `virbr0`).

### Quickest: open the ready-made place file

```bash
python3 scripts/build-place.py     # writes build/AnimeDraft.rbxlx
```

Drag `build/AnimeDraft.rbxlx` from the Linux file manager onto the Boxes window (it lands in the VM's Downloads
folder), then double-click it or open it from Studio's **File → Open**. Press **Play**.

### Option A: live sync with Rojo (best while editing)

1. On Linux, install Rojo 7 from https://github.com/rojo-rbx/rojo/releases (the `linux-x86_64` zip) and put `rojo` on your PATH.
2. Let the VM reach Rojo's port: `sudo firewall-cmd --zone=libvirt --add-port=34872/tcp`. Add `--permanent` to keep it after a reboot.
3. Start it here: `rojo serve` (the project listens on 0.0.0.0:34872).
4. In Windows Studio, install the **Rojo** plugin (Toolbox → Plugins, by *Rojo*, or run `rojo plugin install` on Windows).
5. Open a new **Baseplate** place, click **Rojo → Connect**, set the address to `192.168.122.1` and the port to `34872`, then connect.
6. Press **Play**. To test with two players, use *Test → Clients and Servers → 2 Players*. Playing solo, sit in a seat and **Add bot** to the other one.

Every saved edit on Linux syncs into Studio straight away.

### Option B: build the place file with Rojo

```bash
rojo build -o AnimeDraft.rbxlx
```

Copy `AnimeDraft.rbxlx` into the VM (drag it into the Boxes window, or use a shared folder) and open it in Studio.

## Publishing

In Studio: **File → Publish to Roblox**. Then turn on API services in Game Settings so records save.
Character names are used as text only. The game includes no artwork from the series.

## Character portraits

Cards show a portrait for any character with an image id in `Config.CHARACTER_IMAGES` (others show a
series-coloured emblem). Use art you own or are licensed to use:

1. Put one image per character in `portraits/raw/`, named by key (`gojo.png`, `luffy.jpg`; keys are in `src/shared/Data.luau`).
2. `python3 scripts/prepare-portraits.py` shrinks them to 256x256 JPEGs in `portraits/upload/` (small = fast on phones).
3. In Studio: Asset Manager → Bulk Import the files, copy each asset id into `Config.CHARACTER_IMAGES`.

The loading screen preloads every portrait, so drafts never pop in.

## Updating the live game

Overwriting the published place from a local file ("Publish As") hangs, so update the live place instead:
`python3 scripts/build-place.py` also writes `build/{Loading,Shared,Server,Client}.rbxmx`; open the live
place in Studio, replace those four folders with the models, then File → Publish.
