--!nonstrict
-- AnimeDraft: Draft Duel server. One draft table per server: two seats (players or bots),
-- spectators watch. The server owns the auction state; clients only send intents.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Auction = require(Shared.Auction)
local Battle = require(Shared.Battle)
local Bot = require(script.Parent.Bot)
local Arena = require(script.Parent.Arena)
local Energy = require(script.Parent.Energy)
local Config = require(Shared.Config)

local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
local ActionEvent = Instance.new("RemoteEvent")
ActionEvent.Name = "Action"
ActionEvent.Parent = remotes
local StateEvent = Instance.new("RemoteEvent")
StateEvent.Name = "State"
StateEvent.Parent = remotes
local ToastEvent = Instance.new("RemoteEvent")
ToastEvent.Name = "Toast"
ToastEvent.Parent = remotes
local GetState = Instance.new("RemoteFunction")
GetState.Name = "GetState"
GetState.Parent = remotes
remotes.Parent = ReplicatedStorage

Arena.build()

-- Seat: { kind = "player", player = Player } | { kind = "bot", name = string } | nil
local seats: { [number]: any } = {}
local config = table.clone(Auction.DEFAULT_CONFIG)
local mode = "lobby" -- "lobby" | "draft" | "results"
local auction: any = nil
local deadline: number? = nil -- server time when the hammer falls
local lastRev = -1
local result: any = nil
local botThink: { [number]: number } = {}

local BOT_NAMES = { "Bot Kaizen", "Bot Ultra", "Bot Senpai", "Bot Bankai", "Bot Plus Ultra" }

local function seatName(i: number): string
	local s = seats[i]
	if not s then
		return "Empty"
	end
	return if s.kind == "bot" then s.name else s.player.DisplayName
end

local function seatOf(player: Player): number?
	for i = 1, 2 do
		local s = seats[i]
		if s and s.kind == "player" and s.player == player then
			return i
		end
	end
	return nil
end

local function now(): number
	return workspace:GetServerTimeNow()
end

local function snapshot()
	local seatInfo = {}
	for i = 1, 2 do
		local s = seats[i]
		seatInfo[i] = {
			name = seatName(i),
			kind = if s then s.kind else "empty",
			userId = if s and s.kind == "player" then s.player.UserId else 0,
		}
	end
	return {
		mode = mode,
		seats = seatInfo,
		config = config,
		auction = if auction then Auction.public(auction) else nil,
		deadline = deadline,
		result = result,
	}
end

local function broadcast()
	local snap = snapshot()
	StateEvent:FireAllClients(snap)
	Arena.show(snap)
end

-- `kind` = "shop" makes the client open the energy shop.
local function toast(player: Player?, text: string, kind: string?)
	if player then
		ToastEvent:FireClient(player, text, kind)
	else
		ToastEvent:FireAllClients(text, kind)
	end
end

------------------------------------------------------------------ records

local store = nil
pcall(function()
	store = DataStoreService:GetDataStore("AnimeDraftRecords_v1")
end)

local function setupLeaderstats(player: Player)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	local w = Instance.new("IntValue")
	w.Name = "Wins"
	w.Parent = ls
	local l = Instance.new("IntValue")
	l.Name = "Losses"
	l.Parent = ls
	ls.Parent = player
	if store then
		task.spawn(function()
			local ok, rec = pcall(function()
				return store:GetAsync("u" .. player.UserId)
			end)
			if ok and type(rec) == "table" then
				w.Value = rec.wins or 0
				l.Value = rec.losses or 0
			end
		end)
	end
end

local function saveRecord(player: Player)
	local ls = player:FindFirstChild("leaderstats")
	if not (store and ls) then
		return
	end
	local rec = { wins = (ls :: any).Wins.Value, losses = (ls :: any).Losses.Value }
	task.spawn(function()
		pcall(function()
			store:SetAsync("u" .. player.UserId, rec)
		end)
	end)
end

local function addResult(i: number, won: boolean)
	local s = seats[i]
	if not (s and s.kind == "player") then
		return
	end
	local ls = s.player:FindFirstChild("leaderstats")
	if ls then
		local stat = (ls :: any)[if won then "Wins" else "Losses"]
		stat.Value += 1
		saveRecord(s.player)
	end
end

------------------------------------------------------------------ flow

local function finishDraft()
	local teams = {}
	for i = 1, 2 do
		local t = {}
		for _, o in auction.players[i].team do
			table.insert(t, Data.get(o.key))
		end
		teams[i] = t
	end
	local battle = Battle.teamBattle(teams[1], teams[2])
	result = battle
	mode = "results"
	deadline = nil
	if battle.winner ~= 0 then
		addResult(battle.winner, true)
		addResult(Auction.other(battle.winner), false)
		toast(nil, `{seatName(battle.winner)} wins the draft!`)
	else
		toast(nil, "It's a dead draw!")
	end
end

local function afterChange()
	if not auction then
		return
	end
	if auction.phase == "done" then
		finishDraft()
	else
		local lot = auction.lot
		if lot and lot.rev ~= lastRev then
			lastRev = lot.rev
			if auction.phase == "auction" and auction.config.timer > 0 then
				-- First look at a fresh character gets a little extra time.
				local extra = if #lot.history == 0 then 4 else 0
				deadline = now() + auction.config.timer + extra
			else
				deadline = nil
			end
			botThink = {}
		end
	end
	broadcast()
end

-- Every human in a seat pays Config.ENERGY.draftCost to start. Nobody pays unless everyone can.
local function payForDraft(): boolean
	local cost = Config.ENERGY.draftCost
	local humans = {}
	for i = 1, 2 do
		local s = seats[i]
		if s and s.kind == "player" then
			table.insert(humans, s.player)
		end
	end
	for _, p in humans do
		if not Energy.ready(p) then
			toast(nil, `Loading {p.DisplayName}'s energy… try again in a moment`)
			return false
		end
		if Energy.get(p) < cost then
			toast(p, `You need {cost} ⚡ energy to draft. More arrives tomorrow, or grab a pack!`, "shop")
			for _, q in humans do
				if q ~= p then
					toast(q, `{p.DisplayName} is out of energy`)
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

local function startDraft()
	if not (seats[1] and seats[2]) then
		return
	end
	if not payForDraft() then
		return
	end
	auction = Auction.new(config, { seatName(1), seatName(2) })
	result = nil
	mode = "draft"
	lastRev = -1
	afterChange()
end

local function act(seat: number, a: any): string?
	if mode ~= "draft" or not auction then
		return "No draft running"
	end
	a.player = seat
	local err = Auction.apply(auction, a)
	if not err then
		afterChange()
	end
	return err
end

local function botSeat(i: number)
	local used = {}
	for j = 1, 2 do
		if seats[j] and seats[j].kind == "bot" then
			used[seats[j].name] = true
		end
	end
	local name = BOT_NAMES[math.random(#BOT_NAMES)]
	while used[name] do
		name = BOT_NAMES[math.random(#BOT_NAMES)]
	end
	seats[i] = { kind = "bot", name = name }
	if auction then
		auction.players[i].name = name
	end
end

------------------------------------------------------------------ client intents

local CONFIG_OPTIONS = {
	budget = { 15, 25, 40 },
	teamSize = { 3, 5 },
	timer = { 0, 5, 8, 12 },
	pool = { "all", "gods", "fair" },
}

local DRAFT_ACTIONS = { raise = true, allIn = true, skip = true, keep = true, pass = true, accept = true, hammer = true }

ActionEvent.OnServerEvent:Connect(function(player: Player, msg: any)
	if type(msg) ~= "table" or type(msg.type) ~= "string" then
		return
	end
	local t = msg.type
	local mine = seatOf(player)

	if t == "sit" then
		local i = msg.seat
		if mode ~= "lobby" or (i ~= 1 and i ~= 2) or mine then
			return
		end
		if seats[i] and seats[i].kind == "player" then
			return toast(player, "That seat is taken")
		end
		seats[i] = { kind = "player", player = player }
	elseif t == "stand" then
		if mode ~= "lobby" or not mine then
			return
		end
		seats[mine] = nil
	elseif t == "addBot" then
		local i = msg.seat
		if mode ~= "lobby" or (i ~= 1 and i ~= 2) or seats[i] then
			return
		end
		botSeat(i)
	elseif t == "removeBot" then
		local i = msg.seat
		if mode ~= "lobby" or (i ~= 1 and i ~= 2) or not (seats[i] and seats[i].kind == "bot") then
			return
		end
		seats[i] = nil
	elseif t == "config" then
		if mode ~= "lobby" or not mine then
			return toast(player, "Take a seat to change the rules")
		end
		local opts = CONFIG_OPTIONS[msg.key]
		if opts and table.find(opts, msg.value) then
			(config :: any)[msg.key] = msg.value
		end
	elseif t == "start" then
		if mode ~= "lobby" or not mine then
			return
		end
		if not (seats[1] and seats[2]) then
			return toast(player, "Both seats need a player or a bot")
		end
		startDraft()
		return
	elseif t == "rematch" then
		if mode ~= "results" or not mine then
			return
		end
		startDraft()
		return
	elseif t == "lobby" then
		if mode ~= "results" or not mine then
			return
		end
		mode, auction, result, deadline = "lobby", nil, nil, nil
	elseif DRAFT_ACTIONS[t] then
		if not mine then
			return toast(player, "You're spectating")
		end
		if t == "hammer" and not (auction and auction.config.timer == 0) then
			return
		end
		local a = { type = t, by = tonumber(msg.by) }
		if t == "raise" and not (a.by == 1 or a.by == 2 or a.by == 5) then
			return
		end
		local err = act(mine, a)
		if err then
			toast(player, err)
		end
		return
	else
		return
	end
	broadcast()
end)

GetState.OnServerInvoke = function()
	return snapshot()
end

------------------------------------------------------------------ players joining / leaving

Players.PlayerAdded:Connect(setupLeaderstats)
for _, p in Players:GetPlayers() do
	setupLeaderstats(p)
end

Players.PlayerRemoving:Connect(function(player)
	local i = seatOf(player)
	if not i then
		return
	end
	if mode == "lobby" then
		seats[i] = nil
	else
		botSeat(i) -- a bot takes over so the other player can finish
		toast(nil, `{player.DisplayName} left. {seats[i].name} takes over.`)
	end
	broadcast()
end)

------------------------------------------------------------------ hammer timer + bots

RunService.Heartbeat:Connect(function()
	if mode ~= "draft" or not auction then
		return
	end
	if deadline and now() >= deadline then
		deadline = nil
		act(1, { type = "hammer" })
		return
	end
	for i = 1, 2 do
		local s = seats[i]
		if s and s.kind == "bot" then
			local at = botThink[i]
			if not at then
				botThink[i] = os.clock() + Bot.delay(auction, i)
			elseif os.clock() >= at then
				botThink[i] = os.clock() + Bot.delay(auction, i)
				local a = Bot.decide(auction, i)
				if a then
					act(i, a)
					-- Manual timer with two bots: they'd wait forever, so a bot calls Sold when it leads.
				elseif
					auction.phase == "auction"
					and auction.config.timer == 0
					and auction.lot
					and (auction.lot.leader == i or (seats[1].kind == "bot" and seats[2].kind == "bot"))
				then
					act(i, { type = "hammer" })
				end
				return
			end
		end
	end
end)

broadcast()
