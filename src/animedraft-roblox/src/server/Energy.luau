--!nonstrict
-- Energy: 10 free per day (a top-up), spent to start drafts, more bought with Robux.
-- The live value sits on each Player as attributes, which replicate to every client:
--   Energy (number), EnergyRefillAt (server time of the next daily top-up), EnergyReady (bool)
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

local Energy = {}
Energy.changed = Instance.new("BindableEvent")

local DAILY = Config.ENERGY.daily

local store = nil
pcall(function()
	store = DataStoreService:GetDataStore("AnimeDraftEnergy_v1")
end)

-- [player] = { energy, day, canSave }
local cache: { [Player]: any } = {}

local function now(): number
	return workspace:GetServerTimeNow()
end

-- Applies the daily top-up to a saved record (mutates and returns it).
local function refill(rec, day: number)
	rec.energy = rec.energy or DAILY
	if (rec.day or -1) < day then
		rec.day = day
		rec.energy = math.max(rec.energy, DAILY)
	end
	rec.receipts = rec.receipts or {}
	return rec
end

local function publish(player: Player)
	local c = cache[player]
	if not c then
		return
	end
	player:SetAttribute("Energy", c.energy)
	player:SetAttribute("EnergyRefillAt", Config.nextRefill(now()))
	player:SetAttribute("EnergyReady", true)
	Energy.changed:Fire(player)
end

local function key(userId: number): string
	return "u" .. userId
end

local function save(player: Player)
	local c = cache[player]
	if not (store and c and c.canSave) then
		return
	end
	local energy, day = c.energy, c.day
	pcall(function()
		store:UpdateAsync(key(player.UserId), function(old)
			local rec = refill(old or {}, day)
			rec.energy = energy
			rec.day = day
			return rec
		end)
	end)
end

local function load(player: Player)
	local day = Config.today(now())
	local rec, ok = nil, false
	if store then
		ok = pcall(function()
			rec = store:UpdateAsync(key(player.UserId), function(old)
				return refill(old or {}, day)
			end)
		end)
	end
	if not player.Parent then
		return
	end
	-- Without DataStore access (e.g. Studio with API services off) energy still works for the session;
	-- it just isn't saved, so a failed load can never overwrite a real record.
	cache[player] = {
		energy = if ok and rec then rec.energy else DAILY,
		day = day,
		canSave = ok,
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

function Energy.spend(player: Player, n: number): boolean
	local c = cache[player]
	if not c or c.energy < n then
		return false
	end
	c.energy -= n
	publish(player)
	task.spawn(save, player)
	return true
end

-- Robux purchases. Receipts are recorded inside the same record so a retry can't grant twice.
MarketplaceService.ProcessReceipt = function(info)
	local pack = Config.packById(info.ProductId)
	if not pack then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local player = Players:GetPlayerByUserId(info.PlayerId)
	local day = Config.today(now())

	if not store or (player and cache[player] and not cache[player].canSave) then
		-- No DataStore (Studio test without API access): grant for this session only.
		if player and cache[player] then
			cache[player].energy += pack.amount
			publish(player)
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local granted, total = false, nil
	local ok = pcall(function()
		store:UpdateAsync(key(info.PlayerId), function(old)
			local rec = refill(old or {}, day)
			if table.find(rec.receipts, info.PurchaseId) then
				granted = true
				total = rec.energy
				return nil -- already granted earlier: leave the record as it is
			end
			-- If the player is here, their in-memory value is the latest one.
			if player and cache[player] then
				rec.energy = cache[player].energy
			end
			rec.energy += pack.amount
			table.insert(rec.receipts, info.PurchaseId)
			while #rec.receipts > 50 do
				table.remove(rec.receipts, 1)
			end
			granted = true
			total = rec.energy
			return rec
		end)
	end)
	if not (ok and granted) then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	if player and cache[player] and total then
		cache[player].energy = total
		cache[player].day = day
		publish(player)
	end
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

Players.PlayerAdded:Connect(load)
for _, p in Players:GetPlayers() do
	task.spawn(load, p)
end
Players.PlayerRemoving:Connect(function(player)
	save(player)
	cache[player] = nil
end)

game:BindToClose(function()
	if RunService:IsStudio() and not store then
		return
	end
	for player in cache do
		save(player)
	end
end)

-- Daily top-up for players who stay in the server past midnight UTC.
task.spawn(function()
	while true do
		task.wait(20)
		local day = Config.today(now())
		for player, c in cache do
			if c.day < day then
				c.day = day
				c.energy = math.max(c.energy, DAILY)
				publish(player)
				task.spawn(save, player)
			end
		end
	end
end)

return Energy
