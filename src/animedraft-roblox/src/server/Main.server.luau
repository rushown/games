--!nonstrict
-- AnimeDraft server: a hall of draft tables so a full server can play at once.
-- Each player can be at one table (seated or watching). The server owns every auction; clients
-- only send intents.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared.Config)
local Table = require(script.Parent.Table)
local Arena = require(script.Parent.Arena)
local Energy = require(script.Parent.Energy)
local Records = require(script.Parent.Records)

local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
local function remote(class: string, name: string)
	local r = Instance.new(class)
	r.Name = name
	r.Parent = remotes
	return r
end
local ActionEvent = remote("RemoteEvent", "Action") -- client → server intents
local StateEvent = remote("RemoteEvent", "State") -- server → members: full table state (nil = not at a table)
local TablesEvent = remote("RemoteEvent", "Tables") -- server → everyone: table browser summaries
local ToastEvent = remote("RemoteEvent", "Toast")
local GetState = remote("RemoteFunction", "GetState")
local DuelEvent = remote("RemoteEvent", "Duel") -- server → target: { from = userId, name, expires }
remotes.Parent = ReplicatedStorage

local tables: { any } = {}
local watchAd -- rewarded ads, defined below
local playerTable: { [Player]: any } = {}

local function toast(list: { Player }?, text: string, kind: string?)
	if list then
		for _, p in list do
			ToastEvent:FireClient(p, text, kind)
		end
	else
		ToastEvent:FireAllClients(text, kind)
	end
end

local function summaries()
	local list = {}
	for _, t in tables do
		table.insert(list, t:summary())
	end
	return list
end

-- Coalesce bursts of changes into one send per frame.
local dirty: { [any]: boolean } = {}
local function markChanged(t)
	dirty[t] = true
end
RunService.Heartbeat:Connect(function()
	if next(dirty) then
		for t in dirty do
			local snap = t:snapshot()
			for p in t.members do
				StateEvent:FireClient(p, snap)
			end
			Arena.show(t.id, snap)
		end
		dirty = {}
		TablesEvent:FireAllClients(summaries())
	end
	for _, t in tables do
		t:step()
	end
end)

-- Every human in a seat pays the draft cost; nobody pays unless everyone can.
local function pay(t): boolean
	local cost = Config.ENERGY.draftCost
	local humans = t:humans()
	for _, p in humans do
		if not Energy.ready(p) then
			toast(humans, `Loading {p.DisplayName}'s energy… try again in a moment`)
			return false
		end
		if Energy.get(p) < cost then
			toast({ p }, `You need {cost} ⚡ to draft. Energy refills over time, or grab a pack!`, "shop")
			for _, q in humans do
				if q ~= p then
					toast({ q }, `{p.DisplayName} is out of energy`)
				end
			end
			return false
		end
	end
	for _, p in humans do
		Energy.spend(p, cost)
	end
	return true
end

local hooks = {
	changed = markChanged,
	toast = toast,
	pay = pay,
	result = function(t, player: Player, won: boolean)
		Records.add(player, won)
		toast({ player }, if won then "Victory! +1 win" else "Defeat. Run it back?", if won then "win" else "lose")
	end,
}

local map = Arena.build(Config.TABLES)
Arena.runSky()
local stations = map.tables
for i = 1, Config.TABLES do
	tables[i] = Table.new(i, hooks)
	markChanged(tables[i]) -- draw every stage screen once at start
end

local function moveTo(player: Player, cf: CFrame?)
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if root and cf then
		char:PivotTo(cf)
	end
end

local function leaveTable(player: Player)
	local t = playerTable[player]
	if t then
		playerTable[player] = nil
		t:removeMember(player)
		StateEvent:FireClient(player, nil)
	end
end

local function joinTable(player: Player, id: number, teleport: boolean)
	local t = tables[id]
	if not t or playerTable[player] == t then
		return
	end
	leaveTable(player)
	playerTable[player] = t
	t:addMember(player)
	if teleport then
		moveTo(player, stations[id].stand)
	end
end

for id, st in stations do
	st.prompt.Triggered:Connect(function(player)
		joinTable(player, id, false)
	end)
end

------------------------------------------------------------------ duels
-- Walk up to someone and use their "Challenge" prompt, or pick them in the Players list.
-- If they accept, both go to an empty table and sit down facing each other.

local pending: { [Player]: { from: Player, expires: number } } = {}
local lastChallenge: { [Player]: number } = {}

local function busy(p: Player): boolean
	local t = playerTable[p]
	return t ~= nil and t.mode ~= "lobby"
end

local function challenge(from: Player, to: Player?)
	if not to or to == from or not to.Parent then
		return
	end
	if busy(from) then
		return toast({ from }, "Finish your draft first")
	end
	if busy(to) then
		return toast({ from }, `{to.DisplayName} is in a draft right now`)
	end
	if os.clock() - (lastChallenge[from] or 0) < 4 then
		return
	end
	lastChallenge[from] = os.clock()
	local p = pending[to]
	if p and p.from == from and p.expires > os.clock() then
		return toast({ from }, "Challenge already sent")
	end
	pending[to] = { from = from, expires = os.clock() + Config.DUEL_TIMEOUT }
	DuelEvent:FireClient(to, { from = from.UserId, name = from.DisplayName, timeout = Config.DUEL_TIMEOUT })
	toast({ from }, `Challenge sent to {to.DisplayName}!`)
end

local function freeTable()
	local best, bestScore = nil, -1
	for _, t in tables do
		if t.mode == "lobby" and not t.seats[1] and not t.seats[2] then
			local score = 100 - t:memberCount()
			if score > bestScore then
				best, bestScore = t, score
			end
		end
	end
	return best
end

local function answer(to: Player, fromId: number, accept: boolean)
	local p = pending[to]
	if not p or p.from.UserId ~= fromId then
		return
	end
	pending[to] = nil
	local from = p.from
	if not accept then
		return toast({ from }, `{to.DisplayName} declined the duel`)
	end
	if p.expires < os.clock() or not from.Parent then
		return toast({ to }, "That challenge expired")
	end
	if busy(from) or busy(to) then
		return toast({ from, to }, "One of you is already in a draft")
	end
	local t = freeTable()
	if not t then
		return toast({ from, to }, "Every table is taken right now. Try again in a moment!")
	end
	joinTable(from, t.id, true)
	joinTable(to, t.id, true)
	t:handle(from, { type = "sit", seat = 1 })
	t:handle(to, { type = "sit", seat = 2 })
	toast({ from, to }, `Duel on at table {t.id}! Pick the rules and press START`)
end

-- A "Challenge" prompt on every character (hidden on your own by the client).
local function addPrompt(player: Player, char: Model)
	local root = char:WaitForChild("HumanoidRootPart", 10)
	if not root then
		return
	end
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "DuelPrompt"
	prompt.ActionText = "Challenge to a draft"
	prompt.ObjectText = player.DisplayName
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.HoldDuration = 0.3
	prompt.MaxActivationDistance = 12
	prompt.RequiresLineOfSight = false
	prompt.Parent = root
	prompt.Triggered:Connect(function(by)
		challenge(by, player)
	end)
end
local function watchCharacters(player: Player)
	player.CharacterAdded:Connect(function(char)
		addPrompt(player, char)
	end)
	if player.Character then
		task.spawn(addPrompt, player, player.Character)
	end
end
Players.PlayerAdded:Connect(watchCharacters)
for _, p in Players:GetPlayers() do
	watchCharacters(p)
end

------------------------------------------------------------------ rewarded video ads
-- Roblox shows a short ad; on completion Roblox grants Config.AD_REWARD's developer product, which
-- ProcessReceipt (Energy.luau) turns into energy. Roblox pays the creator for the ad view.
local AdService = game:GetService("AdService")
local adBusy: { [Player]: boolean } = {}

watchAd = function(player: Player)
	local A = Config.AD_REWARD
	if A.id == 0 then
		return toast({ player }, "Ads aren't set up yet")
	end
	if adBusy[player] then
		return
	end
	local blocked = Energy.adBlocked(player)
	if blocked then
		return toast({ player }, blocked)
	end
	adBusy[player] = true
	local ok, err = pcall(function()
		local avail = AdService:GetAdAvailabilityNowAsync(Enum.AdFormat.RewardedVideo)
		if avail.AdAvailabilityResult ~= Enum.AdAvailabilityResult.IsAvailable then
			error("unavailable")
		end
		local reward = AdService:CreateAdRewardFromDevProductId(A.id)
		local result = AdService:ShowRewardedVideoAdAsync(player, reward)
		if result == Enum.ShowAdResult.ShowCompleted then
			Energy.adWatched(player)
		else
			error("notcompleted")
		end
	end)
	adBusy[player] = nil
	if not ok then
		if tostring(err):find("notcompleted") then
			toast({ player }, "Watch the whole ad to get your energy")
		else
			toast({ player }, "No ads available right now. Try again later!")
		end
	end
end

-- Simple flood guard: at most 12 intents per second per player.
local budget: { [Player]: { t: number, n: number } } = {}
local function allowed(player: Player): boolean
	local b = budget[player]
	local t = os.clock()
	if not b or t - b.t >= 1 then
		budget[player] = { t = t, n = 1 }
		return true
	end
	b.n += 1
	return b.n <= 12
end

ActionEvent.OnServerEvent:Connect(function(player: Player, msg)
	if type(msg) ~= "table" or type(msg.type) ~= "string" or not allowed(player) then
		return
	end
	if msg.type == "join" then
		local id = tonumber(msg.table)
		if id then
			joinTable(player, id, true)
		end
	elseif msg.type == "quickPlay" then
		-- First table with a free seat in its lobby, preferring one where someone is waiting.
		local best, bestScore = nil, -1
		for _, t in tables do
			if t.mode == "lobby" then
				local free = (if t.seats[1] then 0 else 1) + (if t.seats[2] then 0 else 1)
				local score = if free == 1 then 2 elseif free == 2 then 1 else 0
				if score > bestScore then
					best, bestScore = t, score
				end
			end
		end
		if best and bestScore > 0 then
			joinTable(player, best.id, true)
			local seat = if best.seats[1] then 2 else 1
			best:handle(player, { type = "sit", seat = seat })
		else
			toast({ player }, "Every table is busy: pick one to watch")
		end
	elseif msg.type == "challenge" then
		challenge(player, Players:GetPlayerByUserId(tonumber(msg.userId) or 0))
	elseif msg.type == "duelReply" then
		answer(player, tonumber(msg.from) or 0, msg.accept == true)
	elseif msg.type == "watchAd" then
		task.spawn(watchAd, player)
	elseif msg.type == "leave" then
		leaveTable(player)
		moveTo(player, map.spawn)
	else
		local t = playerTable[player]
		if t then
			t:handle(player, msg)
		end
	end
end)

GetState.OnServerInvoke = function(player)
	local t = playerTable[player]
	return { tables = summaries(), state = if t then t:snapshot() else nil }
end

Players.PlayerRemoving:Connect(function(player)
	leaveTable(player)
	budget[player] = nil
	pending[player] = nil
	lastChallenge[player] = nil
	adBusy[player] = nil
end)
