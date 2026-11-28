--!strict
-- A simple auction opponent: values each character by combat rating against what it can still afford,
-- bids in small steps, keeps strong characters and passes weak ones when someone is broke.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Auction = require(Shared.Auction)

local Bot = {}

-- Seconds before the bot acts again (feels human, gives players time to answer).
function Bot.delay(s, i: number): number
	if s.phase == "choose" then
		return 1.6 + math.random() * 1.2
	end
	return 0.9 + math.random() * 2.2
end

-- Most the bot will pay for this character.
local function worth(s, i: number, c): number
	local me = s.players[i]
	local slots = s.config.teamSize - #me.team
	if slots <= 0 then
		return 0
	end
	local share = me.budget / slots
	local want = share * (0.35 + c.rating / 55)
	if c.tier == "BEYOND" then
		want = math.max(want, me.budget * 0.6)
	end
	-- Same-series pairs are worth +3 synergy.
	for _, o in me.team do
		if Data.get(o.key).series == c.series then
			want += 1.5
		end
	end
	-- A little personality so bots aren't predictable.
	want *= 0.85 + math.random() * 0.3
	return math.min(me.budget, math.floor(want + 0.5))
end

function Bot.decide(s, i: number): any?
	local lot = s.lot
	if not lot then
		return nil
	end
	local c = Data.get(lot.key)
	if s.phase == "auction" then
		if lot.leader == i or not Auction.hasRoom(s, i) then
			return nil
		end
		local cap = worth(s, i, c)
		local nextBid = lot.bid + 1
		if nextBid > cap then
			-- Deny the other side a god-tier pick it can't afford itself.
			if c.tier == "BEYOND" and lot.leader and Auction.canSkip(s, i) and math.random() < 0.5 then
				return { type = "skip" }
			end
			return nil
		end
		local gap = cap - lot.bid
		local by = if gap >= 8 and math.random() < 0.4 then 5 elseif gap >= 3 and math.random() < 0.4 then 2 else 1
		return { type = "raise", by = by }
	elseif s.phase == "choose" then
		local opt = Auction.choiceOptions(s)
		if not opt then
			return nil
		end
		if s.pending == "decide" and opt.chooser == i then
			local good = c.rating >= 35 or c.tier == "BEYOND"
			if good and opt.canKeep then
				return { type = "keep" }
			elseif opt.canPass then
				return { type = "pass" }
			elseif opt.canKeep then
				return { type = "keep" }
			end
		elseif s.pending == "incoming" and opt.receiver == i then
			if c.rating < 15 and Auction.canSkip(s, i) and math.random() < 0.5 then
				return { type = "skip" }
			end
			return { type = "accept" }
		end
	end
	return nil
end

return Bot
