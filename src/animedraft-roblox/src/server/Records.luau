--!nonstrict
-- Wins / losses on the leaderboard, saved with DataStores (silently session-only without API access).
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")

local Records = {}

local store = nil
pcall(function()
	store = DataStoreService:GetDataStore("AnimeDraftRecords_v1")
end)
local loaded: { [Player]: boolean } = {}

local function setup(player: Player)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	local w = Instance.new("IntValue")
	w.Name = "Wins"
	w.Parent = ls
	local l = Instance.new("IntValue")
	l.Name = "Losses"
	l.Parent = ls
	ls.Parent = player
	if not store then
		return
	end
	local ok, rec = pcall(function()
		return store:GetAsync("u" .. player.UserId)
	end)
	if ok then
		loaded[player] = true
		if type(rec) == "table" then
			w.Value = rec.wins or 0
			l.Value = rec.losses or 0
		end
	end
end

local function save(player: Player)
	local ls = player:FindFirstChild("leaderstats")
	if not (store and ls and loaded[player]) then
		return
	end
	local rec = { wins = ls.Wins.Value, losses = ls.Losses.Value }
	pcall(function()
		store:SetAsync("u" .. player.UserId, rec)
	end)
end

function Records.add(player: Player, won: boolean)
	local ls = player:FindFirstChild("leaderstats")
	if not ls then
		return
	end
	local stat = ls[if won then "Wins" else "Losses"]
	stat.Value += 1
	task.spawn(save, player)
end

Players.PlayerAdded:Connect(setup)
for _, p in Players:GetPlayers() do
	task.spawn(setup, p)
end
Players.PlayerRemoving:Connect(function(p)
	loaded[p] = nil
end)

return Records
