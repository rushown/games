--!nonstrict
-- One draft table: two seats (players or bots), its own rules, auction, hammer timer and results.
-- Players who "join" a table are its members: they see its state and can take a free seat.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Auction = require(Shared.Auction)
local Battle = require(Shared.Battle)
local Bot = require(script.Parent.Bot)

local Table = {}
Table.__index = Table

local BOT_NAMES = { "Bot Kaizen", "Bot Ultra", "Bot Senpai", "Bot Bankai", "Bot Plus Ultra", "Bot Gear Five", "Bot Domain" }

local CONFIG_OPTIONS = {
	budget = { 15, 25, 40 },
	teamSize = { 3, 5 },
	timer = { 0, 5, 8, 12 },
	pool = { "all", "gods", "fair" },
}
local DRAFT_ACTIONS = { raise = true, allIn = true, skip = true, keep = true, pass = true, accept = true, hammer = true }

local function now(): number
	return workspace:GetServerTimeNow()
end

-- hooks = { changed(tbl), toast(players | nil, text, kind?), pay(tbl) -> bool, result(tbl, seat, won) }
function Table.new(id: number, hooks)
	return setmetatable({
		id = id,
		hooks = hooks,
		members = {} :: { [Player]: boolean },
		seats = {} :: { [number]: any },
		config = table.clone(Auction.DEFAULT_CONFIG),
		mode = "lobby",
		auction = nil,
		deadline = nil,
		lastRev = -1,
		result = nil,
		botThink = {},
	}, Table)
end

function Table:seatName(i: number): string
	local s = self.seats[i]
	if not s then
		return "Empty"
	end
	return if s.kind == "bot" then s.name else s.player.DisplayName
end

function Table:seatOf(player: Player): number?
	for i = 1, 2 do
		local s = self.seats[i]
		if s and s.kind == "player" and s.player == player then
			return i
		end
	end
	return nil
end

function Table:humans(): { Player }
	local list = {}
	for i = 1, 2 do
		local s = self.seats[i]
		if s and s.kind == "player" then
			table.insert(list, s.player)
		end
	end
	return list
end

function Table:memberCount(): number
	local n = 0
	for _ in self.members do
		n += 1
	end
	return n
end

function Table:snapshot()
	local seatInfo = {}
	for i = 1, 2 do
		local s = self.seats[i]
		seatInfo[i] = {
			name = self:seatName(i),
			kind = if s then s.kind else "empty",
			userId = if s and s.kind == "player" then s.player.UserId else 0,
		}
	end
	return {
		table = self.id,
		mode = self.mode,
		seats = seatInfo,
		config = self.config,
		auction = if self.auction then Auction.public(self.auction) else nil,
		deadline = self.deadline,
		result = self.result,
		watching = self:memberCount(),
	}
end

-- Short form for the table browser.
function Table:summary()
	return {
		id = self.id,
		mode = self.mode,
		names = { self:seatName(1), self:seatName(2) },
		kinds = { if self.seats[1] then self.seats[1].kind else "empty", if self.seats[2] then self.seats[2].kind else "empty" },
		watching = self:memberCount(),
	}
end

function Table:changed()
	self.hooks.changed(self)
end

function Table:toastAll(text: string)
	local list = {}
	for p in self.members do
		table.insert(list, p)
	end
	self.hooks.toast(list, text)
end

------------------------------------------------------------------ flow

function Table:finish()
	local teams = {}
	for i = 1, 2 do
		local t = {}
		for _, o in self.auction.players[i].team do
			table.insert(t, Data.get(o.key))
		end
		teams[i] = t
	end
	local battle = Battle.teamBattle(teams[1], teams[2])
	self.result = battle
	self.mode = "results"
	self.deadline = nil
	if battle.winner ~= 0 then
		for i = 1, 2 do
			local s = self.seats[i]
			if s and s.kind == "player" then
				self.hooks.result(self, s.player, i == battle.winner)
			end
		end
	end
end

function Table:afterChange()
	local a = self.auction
	if not a then
		return self:changed()
	end
	if a.phase == "done" then
		self:finish()
	else
		local lot = a.lot
		if lot and lot.rev ~= self.lastRev then
			self.lastRev = lot.rev
			if a.phase == "auction" and a.config.timer > 0 then
				local extra = if #lot.history == 0 then 4 else 0 -- a fresh character gets a longer first look
				self.deadline = now() + a.config.timer + extra
			else
				self.deadline = nil
			end
			self.botThink = {}
		end
	end
	self:changed()
end

function Table:start()
	if not (self.seats[1] and self.seats[2]) then
		return
	end
	if not self.hooks.pay(self) then
		return
	end
	self.auction = Auction.new(self.config, { self:seatName(1), self:seatName(2) })
	self.result = nil
	self.mode = "draft"
	self.lastRev = -1
	self:afterChange()
end

function Table:act(seat: number, a): string?
	if self.mode ~= "draft" or not self.auction then
		return "No draft running"
	end
	a.player = seat
	local err = Auction.apply(self.auction, a)
	if not err then
		self:afterChange()
	end
	return err
end

function Table:botSeat(i: number)
	local used = {}
	for j = 1, 2 do
		if self.seats[j] and self.seats[j].kind == "bot" then
			used[self.seats[j].name] = true
		end
	end
	local name
	repeat
		name = BOT_NAMES[math.random(#BOT_NAMES)]
	until not used[name]
	self.seats[i] = { kind = "bot", name = name }
	if self.auction then
		self.auction.players[i].name = name
	end
end

function Table:reset()
	self.mode, self.auction, self.result, self.deadline = "lobby", nil, nil, nil
	-- Bots never sit alone at an idle table.
	if #self:humans() == 0 then
		self.seats = {}
	end
end

------------------------------------------------------------------ members

function Table:addMember(player: Player)
	self.members[player] = true
	self:changed()
end

-- Leaving a table (or the game) frees the seat; mid-draft a bot takes it over.
function Table:removeMember(player: Player)
	self.members[player] = nil
	local i = self:seatOf(player)
	if i then
		if self.mode == "lobby" then
			self.seats[i] = nil
		else
			self:botSeat(i)
			self:toastAll(`{player.DisplayName} left. {self.seats[i].name} takes over.`)
		end
	end
	if #self:humans() == 0 and self:memberCount() == 0 then
		self:reset()
	end
	self:changed()
end

------------------------------------------------------------------ intents

function Table:handle(player: Player, msg)
	local t = msg.type
	local mine = self:seatOf(player)
	local function say(text: string)
		self.hooks.toast({ player }, text)
	end

	if t == "sit" then
		local i = msg.seat
		if self.mode ~= "lobby" or (i ~= 1 and i ~= 2) or mine then
			return
		end
		if self.seats[i] and self.seats[i].kind == "player" then
			return say("That seat is taken")
		end
		self.seats[i] = { kind = "player", player = player }
	elseif t == "stand" then
		if self.mode ~= "lobby" or not mine then
			return
		end
		self.seats[mine] = nil
	elseif t == "addBot" then
		local i = msg.seat
		if self.mode ~= "lobby" or (i ~= 1 and i ~= 2) or self.seats[i] then
			return
		end
		if not mine then
			return say("Take a seat first, then add a bot opponent")
		end
		self:botSeat(i)
	elseif t == "removeBot" then
		local i = msg.seat
		if self.mode ~= "lobby" or (i ~= 1 and i ~= 2) or not (self.seats[i] and self.seats[i].kind == "bot") then
			return
		end
		self.seats[i] = nil
	elseif t == "config" then
		if self.mode ~= "lobby" or not mine then
			return say("Take a seat to change the rules")
		end
		local opts = CONFIG_OPTIONS[msg.key]
		if opts and table.find(opts, msg.value) then
			self.config[msg.key] = msg.value
		end
	elseif t == "start" or t == "rematch" then
		if not mine or (t == "start" and self.mode ~= "lobby") or (t == "rematch" and self.mode ~= "results") then
			return
		end
		if not (self.seats[1] and self.seats[2]) then
			return say("Both seats need a player or a bot")
		end
		return self:start()
	elseif t == "lobby" then
		if self.mode ~= "results" or not mine then
			return
		end
		self:reset()
	elseif DRAFT_ACTIONS[t] then
		if not mine then
			return say("You're spectating")
		end
		if t == "hammer" and not (self.auction and self.auction.config.timer == 0) then
			return
		end
		local a = { type = t, by = tonumber(msg.by) }
		if t == "raise" and not (a.by == 1 or a.by == 2 or a.by == 5) then
			return
		end
		local err = self:act(mine, a)
		if err then
			say(err)
		end
		return
	else
		return
	end
	self:changed()
end

------------------------------------------------------------------ tick (hammer timer + bots)

function Table:step()
	if self.mode ~= "draft" or not self.auction then
		return
	end
	local a = self.auction
	if self.deadline and now() >= self.deadline then
		self.deadline = nil
		self:act(1, { type = "hammer" })
		return
	end
	for i = 1, 2 do
		local s = self.seats[i]
		if s and s.kind == "bot" then
			local at = self.botThink[i]
			if not at then
				self.botThink[i] = os.clock() + Bot.delay(a, i)
			elseif os.clock() >= at then
				self.botThink[i] = os.clock() + Bot.delay(a, i)
				local intent = Bot.decide(a, i)
				if intent then
					self:act(i, intent)
				elseif
					a.phase == "auction"
					and a.config.timer == 0
					and a.lot
					and (a.lot.leader == i or (self.seats[1].kind == "bot" and self.seats[2].kind == "bot"))
				then
					-- Manual timer: a bot calls "Sold!" when it leads, so drafts never stall.
					self:act(i, { type = "hammer" })
				end
				return
			end
		end
	end
end

return Table
