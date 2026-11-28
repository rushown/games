--!strict
-- Game-wide settings. After publishing, create the Developer Products on the Creator Dashboard
-- (Monetization → Developer Products) and paste each product ID below. A pack with id = 0 shows in
-- the shop as "coming soon" and can't be bought.
local Config = {}

Config.ENERGY = {
	-- Each new UTC day, energy is topped up to this amount (bought energy above it is kept).
	daily = 10,
	-- Energy a human player spends to start a draft (bots are free; spectating is free).
	draftCost = 1,
}

-- `robux` is only the label shown in the shop: the real price is whatever you set on the dashboard.
Config.ENERGY_PACKS = {
	{ id = 0, amount = 5, robux = 25, name = "Snack Pack" },
	{ id = 0, amount = 15, robux = 60, name = "Bento Box", tag = "POPULAR" },
	{ id = 0, amount = 40, robux = 140, name = "Feast", tag = "BEST VALUE" },
}

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
