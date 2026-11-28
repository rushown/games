--!strict
-- Deterministic 1v1 and team battles, ported from animedraft-next/src/lib/battle.ts.
local Data = require(script.Parent.Data)

local Battle = {}

local BEYOND = Data.BEYOND_LEVEL
local W = Data.WEIGHT

local function levelName(n: number): string
	local name = Data.LEVELS[n + 1]
	return if n >= BEYOND then name else name .. " level"
end
Battle.levelName = levelName

function Battle.scalingLine(c): string
	return levelName(c.scaling.ap) .. " · " .. Data.SPEEDS[c.scaling.spd + 1]
end

function Battle.tierLabel(t: string): string
	return if t == "BEYOND" then "∞" else t
end

-- 1 if a wins, 2 if b wins.
function Battle.duelWinner(a, b): number
	local ba, bb = a.scaling.ap >= BEYOND, b.scaling.ap >= BEYOND
	if ba ~= bb then
		return if ba then 1 else 2
	end
	if a.rating ~= b.rating then
		return if a.rating > b.rating then 1 else 2
	end
	for _, k in { "ap", "spd", "iq" } do
		if a.scaling[k] ~= b.scaling[k] then
			return if a.scaling[k] > b.scaling[k] then 1 else 2
		end
	end
	return 1
end

local FACTORS = { "ap", "hax", "dur", "spd", "iq" }
local FACTOR_WORD = { ap = "attack power", dur = "durability", spd = "speed", iq = "intellect", hax = "hax" }

function Battle.duelReason(winner, loser): string
	local Wn, Ln = winner.name, loser.name
	local w, l = winner.scaling, loser.scaling
	if w.ap >= BEYOND and l.ap < BEYOND then
		return `{Wn} is {levelName(w.ap)}: beyond every scale {Ln} can even reach. {Ln}'s {levelName(l.ap)} power doesn't register.`
	end
	local best, bestD = "none", 0
	local counter, counterD = nil, 0
	for _, f in FACTORS do
		local d = (w[f] - l[f]) * W[f]
		if d > bestD then
			best, bestD = f, d
		end
		if d < counterD then
			counter, counterD = f, d
		end
	end
	local why
	if best == "ap" then
		why = `{Wn} hits at {levelName(w.ap)}, {Ln} only at {levelName(l.ap)}.`
	elseif best == "hax" then
		why = `{Wn}'s {string.lower(Data.HAX[w.hax + 1])} abilities skip past {Ln}'s raw power.`
	elseif best == "dur" then
		why = `{Wn} can tank {levelName(w.dur)} attacks; {Ln}'s {levelName(l.ap)} offence can't break through.`
	elseif best == "spd" then
		why = `{Wn} is {Data.SPEEDS[w.spd + 1]} against {Ln}'s {Data.SPEEDS[l.spd + 1]}: {Ln} never lands a clean hit.`
	elseif best == "iq" then
		why = `{Wn} ({Data.INTELLECT[w.iq + 1]}) out-thinks {Ln} ({Data.INTELLECT[l.iq + 1]}).`
	else
		why = `Dead even on paper; {Wn} edges it on attack level and speed.`
	end
	if counter then
		why ..= ` {Ln} has the better {FACTOR_WORD[counter]}, but it isn't enough.`
	end
	return why
end

local function round1(x: number): number
	return math.round(x * 10) / 10
end

function Battle.scoreTeam(team)
	local sum, synergy = 0, 0
	for i, c in team do
		sum += c.rating
		for j = i + 1, #team do
			if team[j].series == c.series then
				synergy += 3
			end
		end
	end
	return {
		avgRating = if #team > 0 then round1(sum / #team) else 0,
		synergy = synergy,
		total = round1(sum + synergy),
	}
end

local function strongestFirst(team)
	local t = table.clone(team)
	table.sort(t, function(x, y)
		if x == y then
			return false
		end
		local xy, yx = Battle.duelWinner(x, y), Battle.duelWinner(y, x)
		if xy == yx then
			-- Exact tie (duelWinner favours whoever goes first): keep the order consistent.
			return x.key < y.key
		end
		return xy == 1
	end)
	return t
end

-- Teams are arrays of character records. Returns bouts, bout wins, winner (1, 2 or 0 for a draw).
function Battle.teamBattle(a, b)
	local scores = { Battle.scoreTeam(a), Battle.scoreTeam(b) }
	local la, lb = strongestFirst(a), strongestFirst(b)
	local bouts, wins = {}, { 0, 0 }
	for i = 1, math.min(#la, #lb) do
		local winner = Battle.duelWinner(la[i], lb[i])
		local w, l = if winner == 1 then la[i] else lb[i], if winner == 1 then lb[i] else la[i]
		wins[winner] += 1
		table.insert(bouts, { a = la[i].key, b = lb[i].key, winner = winner, reason = Battle.duelReason(w, l) })
	end
	local result = { scores = scores, bouts = bouts, wins = wins, winner = 0, decidedBy = "draw" }
	if wins[1] ~= wins[2] then
		result.winner = if wins[1] > wins[2] then 1 else 2
		result.decidedBy = "bouts"
	elseif scores[1].total ~= scores[2].total then
		result.winner = if scores[1].total > scores[2].total then 1 else 2
		result.decidedBy = "total"
	end
	return result
end

return Battle
