--!strict
-- Draft Duel auction engine, ported from animedraft-next/src/features/auction/engine.ts.
-- Players are seats 1 and 2. The state is a plain table so it can be sent to clients as-is.
--
-- Rules: each seat has a budget and a team to fill. Highest bid wins the character and pays.
-- Each seat has ONE skip (veto). When a seat can't bid any more (broke), the auction stops and the
-- other seat becomes the chooser: KEEP each character or PASS it to the broke seat.
local Data = require(script.Parent.Data)

local Auction = {}

export type Config = { budget: number, teamSize: number, timer: number, pool: string }

local DEFAULT_CONFIG: Config = { budget = 25, teamSize = 5, timer = 8, pool = "all" }
Auction.DEFAULT_CONFIG = DEFAULT_CONFIG

local function other(p: number): number
	return if p == 1 then 2 else 1
end
Auction.other = other

local function shuffle(t: { any }, rng: Random): { any }
	local a = table.clone(t)
	for i = #a, 2, -1 do
		local j = rng:NextInteger(1, i)
		a[i], a[j] = a[j], a[i]
	end
	return a
end

local function inPool(c, pool: string): boolean
	if pool == "gods" then
		return c.tier == "BEYOND" or c.tier == "SSS" or c.tier == "SS"
	elseif pool == "fair" then
		return c.tier ~= "BEYOND" and c.tier ~= "SSS"
	end
	return true
end

function Auction.hasRoom(s, p: number): boolean
	return #s.players[p].team < s.config.teamSize
end
function Auction.isBidder(s, p: number): boolean
	return Auction.hasRoom(s, p) and s.players[p].budget > 0
end

function Auction.bidError(s, p: number, amount: number): string?
	if s.phase ~= "auction" or not s.lot then
		return "Bidding is closed"
	end
	if not Auction.hasRoom(s, p) then
		return "Team is full"
	end
	if amount ~= math.floor(amount) or amount < 1 then
		return "Invalid amount"
	end
	if s.lot.leader == p then
		return "Already leading"
	end
	if amount <= s.lot.bid then
		return `Bid more than ${s.lot.bid}`
	end
	if amount > s.players[p].budget then
		return "Not enough money"
	end
	return nil
end

function Auction.canSkip(s, p: number): boolean
	if s.players[p].skipUsed or not s.lot then
		return false
	end
	if s.phase == "auction" then
		return true
	end
	if s.phase == "choose" then
		return if s.pending == "decide" then p == s.chooser else p == other(s.chooser)
	end
	return false
end

function Auction.choiceOptions(s)
	if s.phase ~= "choose" or not s.chooser then
		return nil
	end
	local chooser = s.chooser
	local receiver = other(chooser)
	return {
		chooser = chooser,
		receiver = receiver,
		canKeep = s.pending == "decide" and Auction.hasRoom(s, chooser),
		canPass = s.pending == "decide" and Auction.hasRoom(s, receiver),
	}
end

local function record(s, kind: string, key: string, player: number?, price: number?)
	s.outcomeSeq += 1
	local o = { id = s.outcomeSeq, kind = kind, key = key, player = player, price = price }
	s.last = o
	table.insert(s.log, o)
end

local function give(s, p: number, key: string, price: number, via: string)
	local pl = s.players[p]
	pl.budget -= price
	table.insert(pl.team, { key = key, price = price, via = via })
end

-- Works out the phase after something changed and puts the next character up.
local function advance(s)
	local full1, full2 = not Auction.hasRoom(s, 1), not Auction.hasRoom(s, 2)
	if full1 and full2 then
		s.phase, s.lot, s.chooser = "done", nil, nil
		return
	end
	local b1, b2 = Auction.isBidder(s, 1), Auction.isBidder(s, 2)
	local chooser = nil
	if b1 and b2 then
		s.phase = "auction"
	else
		s.phase = "choose"
		if b1 ~= b2 then
			chooser = if b1 then 1 else 2
		else
			local m1, m2 = s.players[1].budget, s.players[2].budget
			chooser = if m1 ~= m2 then (if m1 > m2 then 1 else 2) else (s.lotNo % 2) + 1
		end
	end
	if #s.deck == 0 then
		s.deck = shuffle(s.unsold, s.rng)
		s.unsold = {}
	end
	if #s.deck == 0 then
		s.phase, s.lot, s.chooser = "done", nil, nil
		return
	end
	local key = table.remove(s.deck, 1)
	s.chooser = chooser
	s.pending = "decide"
	s.lotNo += 1
	s.lot = { key = key, bid = 0, leader = nil, history = {}, rev = (if s.lot then s.lot.rev else 0) + 1 }
end

function Auction.new(config: Config, names: { string }, seed: number?)
	local rng = Random.new(seed or os.clock() * 1e6)
	local pool = {}
	for _, c in Data.CHARACTERS do
		if inPool(c, config.pool) then
			table.insert(pool, c.key)
		end
	end
	if #pool < config.teamSize * 2 + 6 then
		pool = {}
		for _, c in Data.CHARACTERS do
			table.insert(pool, c.key)
		end
	end
	local function seat(name: string)
		return { name = name, budget = config.budget, team = {}, skipUsed = false }
	end
	local s = {
		config = table.clone(config),
		players = { seat(names[1]), seat(names[2]) },
		deck = shuffle(pool, rng),
		unsold = {},
		lot = nil,
		lotNo = 0,
		phase = "auction",
		chooser = nil,
		pending = "decide",
		last = nil,
		log = {},
		outcomeSeq = 0,
		rng = rng,
	}
	advance(s)
	return s
end

-- Applies an action in place. Returns an error string if the action was refused.
function Auction.apply(s, a): string?
	local t = a.type
	if t == "raise" then
		if not s.lot then
			return "Bidding is closed"
		end
		return Auction.apply(s, { type = "bid", player = a.player, amount = s.lot.bid + a.by })
	elseif t == "allIn" then
		return Auction.apply(s, { type = "bid", player = a.player, amount = s.players[a.player].budget })
	elseif t == "bid" then
		local err = Auction.bidError(s, a.player, a.amount)
		if err then
			return err
		end
		s.lot.bid = a.amount
		s.lot.leader = a.player
		table.insert(s.lot.history, { player = a.player, amount = a.amount })
		s.lot.rev += 1
	elseif t == "hammer" then
		if s.phase ~= "auction" or not s.lot then
			return "Bidding is closed"
		end
		local lot = s.lot
		if lot.leader == nil then
			table.insert(s.unsold, lot.key)
			record(s, "unsold", lot.key)
		else
			give(s, lot.leader, lot.key, lot.bid, "won")
			record(s, "sold", lot.key, lot.leader, lot.bid)
		end
		advance(s)
	elseif t == "skip" then
		if not Auction.canSkip(s, a.player) then
			return "You can't skip now"
		end
		s.players[a.player].skipUsed = true
		record(s, "vetoed", s.lot.key, a.player)
		advance(s)
	elseif t == "keep" then
		local opt = Auction.choiceOptions(s)
		if not opt or not opt.canKeep or a.player ~= opt.chooser then
			return "You can't keep this one"
		end
		give(s, opt.chooser, s.lot.key, 0, "kept")
		record(s, "kept", s.lot.key, opt.chooser, 0)
		advance(s)
	elseif t == "pass" then
		local opt = Auction.choiceOptions(s)
		if not opt or not opt.canPass or a.player ~= opt.chooser then
			return "You can't pass this one"
		end
		s.pending = "incoming"
	elseif t == "accept" then
		if s.phase ~= "choose" or s.pending ~= "incoming" or not s.lot or a.player ~= other(s.chooser) then
			return "Nothing to accept"
		end
		local receiver = other(s.chooser)
		give(s, receiver, s.lot.key, 0, "passed")
		record(s, "passed", s.lot.key, receiver, 0)
		advance(s)
	else
		return "Unknown action"
	end
	return nil
end

-- The part of the state clients need (no deck order, no RNG).
function Auction.public(s)
	return {
		config = s.config,
		players = s.players,
		lot = s.lot,
		lotNo = s.lotNo,
		phase = s.phase,
		chooser = s.chooser,
		pending = s.pending,
		last = s.last,
		left = #s.deck + #s.unsold,
	}
end

return Auction
