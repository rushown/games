--!nonstrict
-- Energy: spent to start drafts, refilled over time, and bought with Robux.
--
-- * Free energy refills 1 point every Config.ENERGY.regenSeconds up to Config.ENERGY.max.
-- * While a player is in the game the refill runs 1.5x faster at night (see DayNight).
-- * While offline it keeps refilling at the normal rate (worked out when they come back).
-- * Bought energy can go above the max and never expires (refill just pauses while above it).
--
-- Live values sit on each Player as attributes, which replicate to every client:
--   Energy, EnergyProgress (0..1 toward the next point), EnergyRate (1 or 1.5)
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared.Config)
local DayNight = require(Shared.DayNight)

local Energy = {}

local E = Config.ENERGY
local MAX, REGEN = E.max, E.regenSeconds

local store = nil
pcall(function()
	store = DataStoreService:GetDataStore("AnimeDraftEnergy_v2")
end)

------------------------------------------------------------------ energy packs (developer products)

-- Match the game's developer products to Config.ENERGY_PACKS by name and share ids/prices with clients.
local function publishPacks()
	local list = {}
	for _, p in Config.ENERGY_PACKS do
		table.insert(list, { id = p.id, amount = p.amount, robux = p.robux, name = p.name, tag = p.tag })
	end
	ReplicatedStorage:SetAttribute("EnergyPacks", HttpService:JSONEncode(list))
	local T = Config.TANK
	ReplicatedStorage:SetAttribute("TankProduct", HttpService:JSONEncode({ id = T.id, robux = T.robux, name = T.name, step = T.step, cap = T.cap }))
end
local function resolvePacks()
	local ok, pages = pcall(function()
		return MarketplaceService:GetDeveloperProductsAsync()
	end)
	if not ok then
		return
	end
	while true do
		for _, prod in pages:GetCurrentPage() do
			for _, p in { Config.TANK, Config.AD_REWARD, table.unpack(Config.ENERGY_PACKS) } do
				if string.lower(prod.Name or "") == string.lower(p.name) then
					p.id = prod.ProductId or prod.DeveloperProductId or p.id
					p.robux = prod.PriceInRobux or p.robux
				end
			end
		end
		if pages.IsFinished or not pcall(function()
			pages:AdvanceToNextPageAsync()
		end) then
			break
		end
	end
end
publishPacks()
task.spawn(function()
	resolvePacks()
	publishPacks()
end)

------------------------------------------------------------------ records

-- [player] = { energy, progress (0..1), bonus (extra cap from tanks), canSave, dirty }
local cache: { [Player]: any } = {}

local function key(userId: number): string
	return "u" .. userId
end

local function capOf(bonus: number?): number
	return MAX + (bonus or 0)
end

-- Refill earned while offline, at the normal rate.
local function catchUp(rec, now: number)
	rec.bonus = rec.bonus or 0
	local cap = capOf(rec.bonus)
	rec.energy = rec.energy or cap
	rec.progress = rec.progress or 0
	rec.receipts = rec.receipts or {}
	local last = rec.updated or now
	if rec.energy < cap then
		local gained = rec.progress + math.max(0, now - last) / REGEN
		local whole = math.floor(gained)
		rec.energy = math.min(cap, rec.energy + whole)
		rec.progress = if rec.energy >= cap then 0 else gained - whole
	else
		rec.progress = 0
	end
	rec.updated = now
	return rec
end

local function publish(player: Player)
	local c = cache[player]
	if not c then
		return
	end
	player:SetAttribute("Energy", c.energy)
	player:SetAttribute("EnergyMax", capOf(c.bonus))
	player:SetAttribute("EnergyProgress", c.progress)
	player:SetAttribute("EnergyRate", if DayNight.isNight(workspace:GetServerTimeNow()) then E.nightMultiplier else 1)
end

local function save(player: Player)
	local c = cache[player]
	if not (store and c and c.canSave) then
		return
	end
	c.dirty = false
	local energy, progress, bonus, ad = c.energy, c.progress, c.bonus, c.ad
	pcall(function()
		store:UpdateAsync(key(player.UserId), function(old)
			local rec = old or {}
			rec.energy = energy
			rec.progress = progress
			rec.bonus = math.max(rec.bonus or 0, bonus)
			rec.ad = ad
			rec.updated = os.time()
			rec.receipts = rec.receipts or {}
			return rec
		end)
	end)
end

local function load(player: Player)
	local rec, ok = nil, false
	if store then
		ok = pcall(function()
			rec = store:UpdateAsync(key(player.UserId), function(old)
				return catchUp(old or {}, os.time())
			end)
		end)
	end
	if not player.Parent then
		return
	end
	-- Without DataStore access energy still works for the session, but a failed load is never saved
	-- over a real record.
	cache[player] = {
		energy = if ok and rec then rec.energy else MAX,
		progress = if ok and rec then rec.progress else 0,
		bonus = if ok and rec then rec.bonus or 0 else 0,
		ad = if ok and rec and type(rec.ad) == "table" then rec.ad else { last = 0, day = 0, count = 0 },
		canSave = ok,
		dirty = false,
	}
	publish(player)
end

function Energy.get(player: Player): number
	local c = cache[player]
	return if c then c.energy else 0
end

function Energy.ready(player: Player): boolean
	return cache[player] ~= nil
end

-- Rewarded-ad limits, kept in the saved record (server clock), so rejoining can't reset them.
-- Returns nil when an ad may be shown, otherwise a message for the player.
function Energy.adBlocked(player: Player): string?
	local c = cache[player]
	if not c then
		return "Loading your energy…"
	end
	local A = Config.AD_REWARD
	local now = os.time()
	local day = now // 86400
	if c.ad.day ~= day then
		c.ad.day, c.ad.count = day, 0
	end
	if c.ad.count >= A.dailyLimit then
		return "That's all the free ads for today. More tomorrow!"
	end
	local wait = A.cooldown - (now - c.ad.last)
	if wait > 0 then
		return `Next free ad energy in {math.ceil(wait)}s`
	end
	return nil
end

function Energy.adWatched(player: Player)
	local c = cache[player]
	if c then
		c.ad.last = os.time()
		c.ad.count += 1
		c.dirty = true
	end
end

function Energy.spend(player: Player, n: number): boolean
	local c = cache[player]
	if not c or c.energy < n then
		return false
	end
	c.energy -= n
	c.dirty = true
	publish(player)
	task.spawn(save, player)
	return true
end

------------------------------------------------------------------ purchases

-- Receipts are stored in the player's record, so a retried receipt is never granted twice.
-- What a product does to a record: energy packs add energy; a tank raises the cap and fills the new space.
local function applyProduct(rec, productId: number): boolean
	local A = Config.AD_REWARD
	if A.id ~= 0 and productId == A.id then
		rec.energy += A.amount
		return true
	end
	local T = Config.TANK
	if T.id ~= 0 and productId == T.id then
		local before = rec.bonus or 0
		rec.bonus = math.min(T.cap - MAX, before + T.step)
		rec.energy += math.max(rec.bonus - before, 0) + (if rec.bonus == before then T.step else 0)
		return true
	end
	local pack = Config.packById(productId)
	if pack then
		rec.energy += pack.amount
		return true
	end
	return false
end

MarketplaceService.ProcessReceipt = function(info)
	local id = info.ProductId
	if not (Config.packById(id) or (Config.TANK.id ~= 0 and id == Config.TANK.id) or (Config.AD_REWARD.id ~= 0 and id == Config.AD_REWARD.id)) then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local player = Players:GetPlayerByUserId(info.PlayerId)
	local c = player and cache[player]

	if not store then
		-- No DataStore at all (Studio without API access): grant for this session only.
		if c then
			applyProduct(c, info.ProductId)
			publish(player)
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local total, progress, bonus = nil, nil, nil
	local ok = pcall(function()
		store:UpdateAsync(key(info.PlayerId), function(old)
			local rec = catchUp(old or {}, os.time())
			if table.find(rec.receipts, info.PurchaseId) then
				total, progress, bonus = rec.energy, rec.progress, rec.bonus
				return nil -- already granted
			end
			if c and c.canSave then -- the in-memory value is the latest while they're here
				rec.energy, rec.progress, rec.bonus = c.energy, c.progress, math.max(rec.bonus or 0, c.bonus)
			end
			applyProduct(rec, info.ProductId)
			table.insert(rec.receipts, info.PurchaseId)
			while #rec.receipts > 50 do
				table.remove(rec.receipts, 1)
			end
			total, progress, bonus = rec.energy, rec.progress, rec.bonus
			return rec
		end)
	end)
	if not (ok and total) then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	-- The player's data may have finished loading while this receipt was being written: sync it so a
	-- later save can't overwrite the purchase.
	local now = player and cache[player]
	if now then
		if now.canSave then
			now.energy, now.progress, now.bonus = total, progress, bonus or now.bonus
		else
			applyProduct(now, info.ProductId) -- session copy only; the saved record already has it
		end
		publish(player)
	end
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

------------------------------------------------------------------ lifecycle

Players.PlayerAdded:Connect(load)
for _, p in Players:GetPlayers() do
	task.spawn(load, p)
end
Players.PlayerRemoving:Connect(function(player)
	save(player)
	cache[player] = nil
end)
game:BindToClose(function()
	local threads = {}
	for player in cache do
		table.insert(threads, task.spawn(save, player))
	end
	task.wait(2)
end)

-- Online refill: 1 point per REGEN seconds, x1.5 at night. Saved every minute while it changes.
task.spawn(function()
	local lastSave = os.clock()
	while true do
		local dt = task.wait(1)
		local rate = if DayNight.isNight(workspace:GetServerTimeNow()) then E.nightMultiplier else 1
		for player, c in cache do
			local cap = capOf(c.bonus)
			if c.energy < cap then
				c.progress += dt * rate / REGEN
				if c.progress >= 1 then
					c.energy += 1
					c.progress = if c.energy >= cap then 0 else c.progress - 1
				end
				c.dirty = true
			else
				c.progress = 0
			end
			publish(player)
		end
		if os.clock() - lastSave > 60 then
			lastSave = os.clock()
			for player, c in cache do
				if c.dirty then
					task.spawn(save, player)
				end
			end
		end
	end
end)

return Energy
