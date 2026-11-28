# Updating the live game (no Claude needed)

## Add character portraits
1. Put one image per character in `portraits/raw/`, named by id from `list.md` (`gojo.png`, `goku.png`, ...).
   Only use images you have the rights to.
2. Create an Open Cloud API key: create.roblox.com → Open Cloud → API Keys → Create API Key.
   Add the **Assets** API with **Read + Write**, accepted IP `0.0.0.0/0`. Copy the key.
3. Find your numeric Roblox user id (the number in your profile URL).
4. Run, from this folder:
   ```bash
   ROBLOX_API_KEY=paste-key-here ROBLOX_USER_ID=your-id ./portraits.sh
   ```
   It shrinks, uploads (resumable: re-run if it stops), writes the ids into the game and rebuilds `build/`.

## Push a new build to the live game
1. Copy the four files `build/Loading.rbxmx`, `Shared.rbxmx`, `Server.rbxmx`, `Client.rbxmx` into
   `C:\Users\<you>\AppData\Local\Roblox\Versions\<version-…>\content\AnimeDraft\` on the Windows machine
   (make the `AnimeDraft` folder if it's missing; after a Studio update the version folder name changes).
2. In Studio: File → Open from Roblox → **Anime Draft: Auction Battles**.
3. Paste this into the command bar at the bottom and press **Ctrl+Enter**:
   ```lua
   for _,x in {{"Loading",game.ReplicatedFirst},{"Shared",game.ReplicatedStorage},{"Server",game.ServerScriptService},{"Client",game.StarterPlayer.StarterPlayerScripts}} do local o=x[2]:FindFirstChild(x[1]) if o then o:Destroy() end game:GetObjects("rbxasset://AnimeDraft/"..x[1]..".rbxmx")[1].Parent=x[2] end print("AD OK")
   ```
   The Output window should say `AD OK`.
4. Press **F5** to test, then **Shift+F5**, then **File → Publish**.

(Only portraits changed? Steps are the same; only `Shared.rbxmx` actually differs.)
