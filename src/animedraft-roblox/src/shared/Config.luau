--!strict
-- Game-wide settings. After publishing, create the Developer Products on the Creator Dashboard
-- (Monetization → Developer Products) and paste each product ID below. A pack with id = 0 shows in
-- the shop as "coming soon" and can't be bought.
local Config = {}

-- Draft tables in the hall. Two seats each plus spectators, so a server of N players needs about N/2.
-- Set the server size in Game Settings → Places → Max Players (20 suits 8 tables: 16 drafting + watchers).
Config.TABLES = 8

-- Licensed audio from the Creator Store (Roblox, APM Music, ProSoundEffects and DistroKid releases).
-- Swap any id for another Creator Store sound; an id of 0 turns that sound off.
Config.SOUNDS = {
	lobbyMusic = 87808736665214, -- "Anime Coffee Shop Chill"
	draftMusic = 88274542544631, -- "Tempest Banner | Anime Taiko Festival"
	click = 15675059323, -- Roblox UI Bright Click
	open = 15674975792, -- Roblox UI Whoosh
	bid = 127645268874265, -- Roblox CoinTransfer
	sold = 9114630316, -- ProSoundEffects gong hit
	lot = 12222200, -- swoosh
	notify = 17208361335, -- Roblox GUI notification
	victory = 9046415691, -- APM "Shori" taiko sting
	defeat = 17208372272, -- Roblox GUI notification low
}

Config.ENERGY = {
	-- Free energy refills up to `max`, one point every `regenSeconds` (also while offline).
	max = 10,
	regenSeconds = 600,
	-- While a player is in the game at night, refilling runs this much faster.
	nightMultiplier = 1.5,
	-- Energy a human player spends to start a draft (bots are free; spectating is free).
	draftCost = 1,
}

-- Day/night cycle: 20 minutes, 3/4 day and 1/4 night. Every server shares the same clock.
Config.DAY_NIGHT = {
	cycleSeconds = 1200,
	dayFraction = 0.75,
}

-- Duel requests: how long a challenge waits for an answer.
Config.DUEL_TIMEOUT = 20

-- Energy packs are Developer Products. Create them on the Creator Dashboard (or Studio's Game Settings →
-- Monetization) with exactly these names; the server finds their ids and real prices by name at startup,
-- so no id needs pasting here. `id` can still be set by hand to pin a product. `robux` is only a fallback label.
Config.ENERGY_PACKS = {
	{ id = 3737223369, amount = 5, robux = 25, name = "Snack Pack" },
	{ id = 3737223746, amount = 15, robux = 60, name = "Bento Box", tag = "POPULAR" },
	{ id = 3737224049, amount = 40, robux = 140, name = "Feast", tag = "BEST VALUE" },
}

-- "Bigger Tank": raises a player's free-energy cap by `step` per purchase, up to `cap` (and fills the new space).
Config.TANK = { id = 3737228612, name = "Bigger Tank", step = 5, cap = 30, robux = 75 }

-- Character portraits: Roblox image asset ids by character key (e.g. gojo = 1234567890). Upload only art you
-- own or are licensed to use; characters without an id show a series-coloured emblem instead.
Config.CHARACTER_IMAGES = require(script.Parent.Portraits) :: { [string]: number }

-- Image URL for a portrait id at a given size. rbxthumb works for both image and decal ids and serves a
-- downsized copy, so portraits stay light on phones.
function Config.portraitUrl(id: number, size: number?): string
	return `rbxthumb://type=Asset&id={id}&w={size or 150}&h={size or 150}`
end

-- Rewarded video ads (Roblox AdService): watch an ad, get +`amount` energy. Roblox pays the creator for ad
-- views. The reward is a developer product (players never pay for it; it's only granted through the ad).
Config.AD_REWARD = { id = 3737236795, name = "Free Energy Ad", amount = 1, cooldown = 90, dailyLimit = 20 }

function Config.packById(id: number)
	if id == 0 then
		return nil
	end
	for _, p in Config.ENERGY_PACKS do
		if p.id == id then
			return p
		end
	end
	return nil
end

-- Current UTC day number, and the server time when the next one starts.
function Config.today(t: number): number
	return math.floor(t / 86400)
end
function Config.nextRefill(t: number): number
	return (math.floor(t / 86400) + 1) * 86400
end

return Config
