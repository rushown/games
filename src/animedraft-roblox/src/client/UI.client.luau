--!nonstrict
-- AnimeDraft client: draws the lobby, the live auction and the results from the server's state.
-- Every button only sends an intent; the server decides what happens.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local StarterGui = game:GetService("StarterGui")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Battle = require(Shared.Battle)
local Auction = require(Shared.Auction)
local Config = require(Shared.Config)
local MarketplaceService = game:GetService("MarketplaceService")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ActionEvent = Remotes:WaitForChild("Action") :: RemoteEvent
local StateEvent = Remotes:WaitForChild("State") :: RemoteEvent
local ToastEvent = Remotes:WaitForChild("Toast") :: RemoteEvent
local GetState = Remotes:WaitForChild("GetState") :: RemoteFunction

local player = Players.LocalPlayer

pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false)
end)

------------------------------------------------------------------ theme + helpers

local C = {
	bg = Color3.fromRGB(18, 14, 28),
	panel = Color3.fromRGB(30, 24, 46),
	panel2 = Color3.fromRGB(44, 36, 66),
	text = Color3.fromRGB(245, 240, 255),
	dim = Color3.fromRGB(170, 160, 200),
	gold = Color3.fromRGB(255, 200, 60),
	good = Color3.fromRGB(70, 210, 130),
	bad = Color3.fromRGB(240, 80, 90),
	seat = { Color3.fromRGB(255, 90, 95), Color3.fromRGB(80, 160, 255) },
}

local function send(t: string, extra: { [string]: any }?)
	local msg = extra or {}
	msg.type = t
	ActionEvent:FireServer(msg)
end

local function new(class: string, props: { [string]: any }, children: { Instance }?): any
	local inst = Instance.new(class)
	for k, v in props do
		if k ~= "Parent" then
			(inst :: any)[k] = v
		end
	end
	for _, ch in children or {} do
		ch.Parent = inst
	end
	if props.Parent then
		inst.Parent = props.Parent
	end
	return inst
end

local function corner(r: number?)
	return new("UICorner", { CornerRadius = UDim.new(0, r or 12) })
end
local function stroke(color: Color3, t: number?)
	return new("UIStroke", { Color = color, Thickness = t or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border })
end
local function pad(n: number)
	return new("UIPadding", { PaddingTop = UDim.new(0, n), PaddingBottom = UDim.new(0, n), PaddingLeft = UDim.new(0, n), PaddingRight = UDim.new(0, n) })
end

local function text(props: { [string]: any }): TextLabel
	local base = {
		BackgroundTransparency = 1,
		TextColor3 = C.text,
		Font = Enum.Font.GothamBold,
		TextSize = 18,
		TextWrapped = true,
	}
	for k, v in props do
		base[k] = v
	end
	return new("TextLabel", base)
end

local function button(props: { [string]: any }, onClick: () -> ()): TextButton
	local base = {
		BackgroundColor3 = C.panel2,
		TextColor3 = C.text,
		Font = Enum.Font.GothamBlack,
		TextSize = 20,
		AutoButtonColor = true,
	}
	for k, v in props do
		base[k] = v
	end
	local b = new("TextButton", base, { corner(10) })
	b.Activated:Connect(onClick)
	return b
end

local function setEnabled(b: TextButton, on: boolean)
	b.Active = on
	b.AutoButtonColor = on
	b.TextTransparency = if on then 0 else 0.55
	b.BackgroundTransparency = if on then 0 else 0.5
end

local function clear(frame: Instance)
	for _, ch in frame:GetChildren() do
		if not ch:IsA("UIBase") then
			ch:Destroy()
		end
	end
end

------------------------------------------------------------------ root

local gui = new("ScreenGui", {
	Name = "AnimeDraft",
	ResetOnSpawn = false,
	IgnoreGuiInset = true,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = player:WaitForChild("PlayerGui"),
})

-- Everything is laid out for 1280x720 and scaled to fit the screen (phones included).
local root = new("Frame", {
	Size = UDim2.fromOffset(1280, 720),
	Position = UDim2.fromScale(0.5, 0.5),
	AnchorPoint = Vector2.new(0.5, 0.5),
	BackgroundTransparency = 1,
	Parent = gui,
})
local uiScale = new("UIScale", { Parent = root })
local function rescale()
	local cam = workspace.CurrentCamera
	if not cam then
		return
	end
	local v = cam.ViewportSize
	uiScale.Scale = math.min(v.X / 1280, v.Y / 720)
end
rescale()
workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)

local toastLabel = text({
	Size = UDim2.fromOffset(640, 46),
	Position = UDim2.new(0.5, 0, 0, 12),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(0, 0, 0),
	BackgroundTransparency = 1,
	TextTransparency = 1,
	TextSize = 20,
	ZIndex = 50,
	Parent = root,
}) :: TextLabel
corner(10).Parent = toastLabel
local toastToken = 0
local function toast(msg: string)
	toastToken += 1
	local my = toastToken
	toastLabel.Text = msg
	toastLabel.BackgroundTransparency = 0.25
	toastLabel.TextTransparency = 0
	task.delay(2.6, function()
		if my == toastToken then
			TweenService:Create(toastLabel, TweenInfo.new(0.4), { BackgroundTransparency = 1, TextTransparency = 1 }):Play()
		end
	end)
end

------------------------------------------------------------------ character card

local STATS = { { "pow", "POW" }, { "spd", "SPD" }, { "iq", "IQ" }, { "dur", "DUR" }, { "sup", "SUP" } }

local function characterCard(parent: Instance, key: string, size: UDim2, pos: UDim2, anchor: Vector2?)
	local c = Data.get(key)
	local s = Data.SERIES[c.series]
	local card = new("Frame", {
		Size = size,
		Position = pos,
		AnchorPoint = anchor or Vector2.zero,
		BackgroundColor3 = Color3.new(1, 1, 1),
		Parent = parent,
	}, {
		corner(16),
		stroke(C.gold, 3),
		new("UIGradient", { Color = ColorSequence.new(s.c1, s.c2), Rotation = 35 }),
	})
	local shade = new("Frame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 0.4,
		Parent = card,
	}, { corner(16), pad(16) })
	text({ Text = c.initials, Size = UDim2.fromOffset(120, 120), Font = Enum.Font.GothamBlack, TextSize = 72, TextTransparency = 0.15, Parent = shade })
	text({ Text = s.name:upper(), Position = UDim2.fromOffset(132, 0), Size = UDim2.new(1, -132, 0, 22), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, TextSize = 15, Parent = shade })
	text({ Text = c.name, Position = UDim2.fromOffset(132, 22), Size = UDim2.new(1, -132, 0, 62), TextXAlignment = Enum.TextXAlignment.Left, Font = Enum.Font.GothamBlack, TextSize = 30, TextScaled = true, Parent = shade })
	text({ Text = c.title, Position = UDim2.fromOffset(132, 84), Size = UDim2.new(1, -132, 0, 22), TextXAlignment = Enum.TextXAlignment.Left, Font = Enum.Font.GothamMedium, TextSize = 17, Parent = shade })
	local tier = text({
		Text = `{Battle.tierLabel(c.tier)}  {c.rating}`,
		Position = UDim2.new(1, 0, 0, 0),
		AnchorPoint = Vector2.new(1, 0),
		Size = UDim2.fromOffset(110, 34),
		BackgroundColor3 = if c.tier == "BEYOND" then Color3.fromRGB(140, 60, 255) else C.gold,
		BackgroundTransparency = 0,
		TextColor3 = if c.tier == "BEYOND" then C.text else Color3.new(0, 0, 0),
		Font = Enum.Font.GothamBlack,
		TextSize = 18,
		Parent = shade,
	})
	corner(8).Parent = tier

	-- Stat bars
	for i, st in STATS do
		local y = 124 + (i - 1) * 22
		text({ Text = st[2], Position = UDim2.fromOffset(0, y), Size = UDim2.fromOffset(44, 18), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 14, TextColor3 = C.dim, Parent = shade })
		local track = new("Frame", { Position = UDim2.fromOffset(48, y + 4), Size = UDim2.new(1, -90, 0, 10), BackgroundColor3 = Color3.fromRGB(0, 0, 0), BackgroundTransparency = 0.4, Parent = shade }, { corner(5) })
		new("Frame", { Size = UDim2.fromScale(c.stats[st[1]] / 100, 1), BackgroundColor3 = C.gold, Parent = track }, { corner(5) })
		text({ Text = tostring(c.stats[st[1]]), Position = UDim2.new(1, -36, 0, y), Size = UDim2.fromOffset(36, 18), TextXAlignment = Enum.TextXAlignment.Right, TextSize = 14, Parent = shade })
	end
	text({
		Text = Battle.scalingLine(c) .. "\n" .. c.feat,
		Position = UDim2.fromOffset(0, 236),
		Size = UDim2.new(1, 0, 1, -236),
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		Font = Enum.Font.Gotham,
		TextSize = 14,
		TextColor3 = C.text,
		Parent = shade,
	})
	return card
end

-- One-line row for team lists and bouts.
local function miniRow(parent: Instance, key: string, rightText: string, order: number)
	local c = Data.get(key)
	local s = Data.SERIES[c.series]
	local row = new("Frame", { Size = UDim2.new(1, 0, 0, 44), BackgroundColor3 = Color3.new(1, 1, 1), LayoutOrder = order, Parent = parent }, {
		corner(8),
		new("UIGradient", { Color = ColorSequence.new(s.c1, s.c2), Rotation = 0, Transparency = NumberSequence.new(0.2, 0.6) }),
	})
	local shade = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, Parent = row }, { corner(8), pad(6) })
	text({ Text = c.name, Size = UDim2.new(1, -60, 0, 18), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 15, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, Parent = shade })
	text({ Text = `{Battle.tierLabel(c.tier)} · {c.rating} · {s.short}`, Position = UDim2.fromOffset(0, 18), Size = UDim2.new(1, -60, 0, 14), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 12, Font = Enum.Font.Gotham, TextColor3 = C.dim, Parent = shade })
	text({ Text = rightText, Position = UDim2.new(1, -56, 0, 0), Size = UDim2.new(0, 56, 1, 0), TextXAlignment = Enum.TextXAlignment.Right, TextSize = 16, TextColor3 = C.gold, Parent = shade })
	return row
end

------------------------------------------------------------------ screens

local lobby = new("Frame", { Size = UDim2.fromOffset(760, 520), Position = UDim2.fromScale(0.5, 0.5), AnchorPoint = Vector2.new(0.5, 0.5), BackgroundColor3 = C.bg, BackgroundTransparency = 0.08, Visible = false, Parent = root }, { corner(20), stroke(C.gold, 2), pad(24) })
local draft = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false, Parent = root })
local results = new("Frame", { Size = UDim2.fromOffset(900, 580), Position = UDim2.new(0.5, 0, 0.5, -14), AnchorPoint = Vector2.new(0.5, 0.5), BackgroundColor3 = C.bg, BackgroundTransparency = 0.05, Visible = false, Parent = root }, { corner(20), stroke(C.gold, 2), pad(22) })

local state: any = nil
local mySeat: number? = nil

------------------------------------------------------------------ lobby

local CONFIG_ROWS = {
	{ key = "budget", label = "Budget", options = { 15, 25, 40 }, fmt = function(v) return "$" .. v end },
	{ key = "teamSize", label = "Team size", options = { 3, 5 }, fmt = function(v) return tostring(v) end },
	{ key = "timer", label = "Hammer timer", options = { 5, 8, 12, 0 }, fmt = function(v) return if v == 0 then "Manual" else v .. "s" end },
	{ key = "pool", label = "Characters", options = { "all", "fair", "gods" }, fmt = function(v) return ({ all = "All", fair = "Fair (no gods)", gods = "Gods only" })[v] end },
}

local function renderLobby()
	clear(lobby)
	text({ Text = "ANIME DRAFT", Size = UDim2.new(1, 0, 0, 52), Font = Enum.Font.GothamBlack, TextSize = 44, TextColor3 = C.gold, Parent = lobby })
	text({ Text = "Draft Duel · bid on anime's strongest, build a team, let power scaling decide", Position = UDim2.fromOffset(0, 52), Size = UDim2.new(1, 0, 0, 24), Font = Enum.Font.GothamMedium, TextColor3 = C.dim, TextSize = 17, Parent = lobby })

	for i = 1, 2 do
		local seat = state.seats[i]
		local box = new("Frame", { Position = UDim2.new((i - 1) * 0.5, if i == 1 then 0 else 8, 0, 92), Size = UDim2.new(0.5, -8, 0, 140), BackgroundColor3 = C.panel, Parent = lobby }, { corner(14), stroke(C.seat[i], 2), pad(14) })
		text({ Text = "SEAT " .. i, Size = UDim2.new(1, 0, 0, 18), TextColor3 = C.seat[i], TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, Parent = box })
		text({ Text = if seat.kind == "empty" then "Empty" else seat.name .. (if seat.kind == "bot" then "  🤖" else ""), Position = UDim2.fromOffset(0, 20), Size = UDim2.new(1, 0, 0, 40), Font = Enum.Font.GothamBlack, TextSize = 28, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, Parent = box })
		if seat.kind == "player" then
			local who = Players:GetPlayerByUserId(seat.userId)
			local e = who and who:GetAttribute("Energy")
			text({ Text = if e then `⚡ {e} energy` else "⚡ …", Position = UDim2.fromOffset(0, 20), Size = UDim2.new(1, 0, 0, 18), TextXAlignment = Enum.TextXAlignment.Right, TextColor3 = if e and e < Config.ENERGY.draftCost then C.bad else C.gold, TextSize = 15, Parent = box })
		end
		local row = new("Frame", { Position = UDim2.new(0, 0, 1, -44), Size = UDim2.new(1, 0, 0, 44), BackgroundTransparency = 1, Parent = box }, {
			new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }),
		})
		if seat.kind == "empty" then
			if not mySeat then
				button({ Text = "Sit here", Size = UDim2.fromOffset(150, 44), BackgroundColor3 = C.seat[i], Parent = row }, function()
					send("sit", { seat = i })
				end)
			end
			button({ Text = "Add bot", Size = UDim2.fromOffset(150, 44), Parent = row }, function()
				send("addBot", { seat = i })
			end)
		elseif seat.kind == "bot" then
			button({ Text = "Remove bot", Size = UDim2.fromOffset(160, 44), Parent = row }, function()
				send("removeBot", { seat = i })
			end)
		elseif mySeat == i then
			button({ Text = "Stand up", Size = UDim2.fromOffset(150, 44), Parent = row }, function()
				send("stand")
			end)
		end
	end

	-- Rules
	for r, cfg in CONFIG_ROWS do
		local y = 250 + (r - 1) * 50
		text({ Text = cfg.label, Position = UDim2.fromOffset(0, y), Size = UDim2.fromOffset(170, 42), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, Parent = lobby })
		local row = new("Frame", { Position = UDim2.fromOffset(170, y), Size = UDim2.new(1, -170, 0, 42), BackgroundTransparency = 1, Parent = lobby }, {
			new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }),
		})
		for _, v in cfg.options do
			local on = state.config[cfg.key] == v
			local b = button({
				Text = cfg.fmt(v),
				Size = UDim2.fromOffset(if cfg.key == "pool" then 170 else 110, 42),
				TextSize = 17,
				BackgroundColor3 = if on then C.gold else C.panel2,
				TextColor3 = if on then Color3.new(0, 0, 0) else C.text,
				Parent = row,
			}, function()
				send("config", { key = cfg.key, value = v })
			end)
			if not mySeat then
				setEnabled(b, on)
			end
		end
	end

	local ready = state.seats[1].kind ~= "empty" and state.seats[2].kind ~= "empty"
	local hint = if not mySeat then "Sit in a seat to play (or just watch)."
		elseif not ready then "Fill the other seat with a friend or a bot."
		else `Ready! Starting costs each player {Config.ENERGY.draftCost} ⚡`
	text({ Text = hint, Position = UDim2.new(0, 0, 1, -56), Size = UDim2.new(0.5, 0, 0, 56), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, Font = Enum.Font.GothamMedium, Parent = lobby })
	local start = button({ Text = `START  ⚡{Config.ENERGY.draftCost}`, Position = UDim2.new(1, 0, 1, 0), AnchorPoint = Vector2.new(1, 1), Size = UDim2.fromOffset(260, 56), BackgroundColor3 = C.good, TextSize = 24, Parent = lobby }, function()
		send("start")
	end)
	setEnabled(start, ready and mySeat ~= nil)
end

------------------------------------------------------------------ draft

local timerBar: Frame? = nil
local timerText: TextLabel? = nil

local function seatPanel(i: number)
	local a = state.auction
	local p = a.players[i]
	local left = i == 1
	local leading = a.lot and a.lot.leader == i
	local panel = new("Frame", {
		Position = if left then UDim2.fromOffset(16, 16) else UDim2.new(1, -16, 0, 16),
		AnchorPoint = if left then Vector2.zero else Vector2.new(1, 0),
		Size = UDim2.fromOffset(260, 520),
		BackgroundColor3 = C.bg,
		BackgroundTransparency = 0.12,
		Parent = draft,
	}, { corner(16), stroke(if leading then C.gold else C.seat[i], if leading then 4 else 2), pad(12) })
	text({ Text = p.name .. (if mySeat == i then " (you)" else ""), Size = UDim2.new(1, 0, 0, 26), TextColor3 = C.seat[i], TextSize = 20, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, Parent = panel })
	text({ Text = "$" .. p.budget, Position = UDim2.fromOffset(0, 28), Size = UDim2.new(0.5, 0, 0, 44), Font = Enum.Font.GothamBlack, TextSize = 40, TextXAlignment = Enum.TextXAlignment.Left, Parent = panel })
	text({
		Text = `{#p.team}/{a.config.teamSize}\n` .. (if p.skipUsed then "skip used" else "1 skip"),
		Position = UDim2.new(0.5, 0, 0, 28),
		Size = UDim2.new(0.5, 0, 0, 44),
		TextXAlignment = Enum.TextXAlignment.Right,
		TextColor3 = C.dim,
		TextSize = 15,
		Parent = panel,
	})
	local list = new("Frame", { Position = UDim2.fromOffset(0, 84), Size = UDim2.new(1, 0, 1, -84), BackgroundTransparency = 1, Parent = panel }, {
		new("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	for n, o in p.team do
		miniRow(list, o.key, if o.via == "won" then "$" .. o.price elseif o.via == "kept" then "kept" else "given", n)
	end
	for n = #p.team + 1, a.config.teamSize do
		new("Frame", { Size = UDim2.new(1, 0, 0, 44), BackgroundColor3 = C.panel, BackgroundTransparency = 0.4, LayoutOrder = n, Parent = list }, { corner(8) })
	end
end

local OUTCOME = {
	sold = function(o, a, c)
		return `{c.name} SOLD to {a.players[o.player].name} for ${o.price}`
	end,
	unsold = function(_, _, c)
		return `No bids: {c.name} goes back in the deck`
	end,
	vetoed = function(o, a, c)
		return `{a.players[o.player].name} SKIPPED {c.name}`
	end,
	kept = function(o, a, c)
		return `{a.players[o.player].name} kept {c.name}`
	end,
	passed = function(o, a, c)
		return `{c.name} was passed to {a.players[o.player].name}`
	end,
}

local function renderDraft()
	clear(draft)
	timerBar, timerText = nil, nil
	local a = state.auction
	if not a or not a.lot then
		return
	end
	seatPanel(1)
	seatPanel(2)

	text({ Text = `LOT {a.lotNo} · {a.left} left in deck`, Position = UDim2.new(0.5, 0, 0, 14), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(600, 22), TextColor3 = C.dim, TextSize = 16, Parent = draft })
	characterCard(draft, a.lot.key, UDim2.fromOffset(560, 340), UDim2.new(0.5, 0, 0, 42), Vector2.new(0.5, 0))

	-- Bid / decision status
	local status: string
	if a.phase == "auction" then
		status = if a.lot.leader then `${a.lot.bid}  ·  {a.players[a.lot.leader].name} leads` else "Opening bid: $1"
	elseif a.pending == "decide" then
		status = `{a.players[a.chooser].name} decides: keep it or pass it`
	else
		status = `{a.players[Auction.other(a.chooser)].name}: accept or skip?`
	end
	text({ Text = status, Position = UDim2.new(0.5, 0, 0, 392), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(620, 44), Font = Enum.Font.GothamBlack, TextSize = 32, TextColor3 = if a.lot.leader then C.seat[a.lot.leader] else C.text, Parent = draft })

	if a.phase == "auction" then
		local track = new("Frame", { Position = UDim2.new(0.5, 0, 0, 442), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(560, 12), BackgroundColor3 = C.panel, Parent = draft }, { corner(6) })
		timerBar = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.gold, Parent = track }, { corner(6) })
		timerText = text({ Position = UDim2.new(0.5, 0, 0, 456), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(560, 20), TextSize = 15, TextColor3 = C.dim, Parent = draft })
		if a.config.timer == 0 then
			(timerText :: TextLabel).Text = "Manual: a seated player taps SOLD"
			track.Visible = false
		end
	end

	if a.last then
		local c = Data.get(a.last.key)
		text({ Text = OUTCOME[a.last.kind](a.last, a, c), Position = UDim2.new(0.5, 0, 0, 482), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(620, 24), TextSize = 17, TextColor3 = C.gold, Font = Enum.Font.GothamMedium, Parent = draft })
	end

	-- Actions
	local bar = new("Frame", { Position = UDim2.new(0.5, 0, 1, -20), AnchorPoint = Vector2.new(0.5, 1), Size = UDim2.fromOffset(720, 150), BackgroundColor3 = C.bg, BackgroundTransparency = 0.12, Parent = draft }, { corner(18), pad(14) })
	if not mySeat then
		text({ Text = "Spectating", Size = UDim2.fromScale(1, 1), TextColor3 = C.dim, TextSize = 24, Parent = bar })
		return
	end
	local me = mySeat :: number
	local row = new("Frame", { Size = UDim2.new(1, 0, 0, 72), BackgroundTransparency = 1, Parent = bar }, {
		new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
	})
	local function act(label: string, color: Color3, enabled: boolean, w: number, fn: () -> ())
		local b = button({ Text = label, Size = UDim2.fromOffset(w, 72), BackgroundColor3 = color, TextSize = 24, Parent = row }, function()
			if enabled then
				fn()
			end
		end)
		setEnabled(b, enabled)
	end
	local skipOk = Auction.canSkip(a, me)
	local hint = ""

	if a.phase == "auction" then
		local myP = a.players[me]
		local room = #myP.team < a.config.teamSize
		local leading = a.lot.leader == me
		for _, by in { 1, 2, 5 } do
			act("+$" .. by, C.seat[me], room and not leading and a.lot.bid + by <= myP.budget, 96, function()
				send("raise", { by = by })
			end)
		end
		act("ALL IN $" .. myP.budget, C.bad, room and not leading and myP.budget > a.lot.bid, 150, function()
			send("allIn")
		end)
		act("SKIP", C.panel2, skipOk, 100, function()
			send("skip")
		end)
		if a.config.timer == 0 then
			act("SOLD!", C.good, true, 100, function()
				send("hammer")
			end)
		end
		hint = if not room then "Your team is full: watching the rest" elseif leading then "You're winning this one!" else "Raise to take the lead"
	else
		local opt = Auction.choiceOptions(a)
		if opt and a.pending == "decide" and opt.chooser == me then
			act("KEEP", C.good, opt.canKeep, 170, function()
				send("keep")
			end)
			act("PASS", C.seat[opt.receiver], opt.canPass, 170, function()
				send("pass")
			end)
			act("SKIP", C.panel2, skipOk, 130, function()
				send("skip")
			end)
			hint = `{a.players[opt.receiver].name} is out of money: you choose who gets each character`
		elseif opt and a.pending == "incoming" and opt.receiver == me then
			act("ACCEPT", C.good, true, 200, function()
				send("accept")
			end)
			act("SKIP", C.panel2, skipOk, 130, function()
				send("skip")
			end)
			hint = "This character was passed to you"
		else
			hint = "Waiting for the other player…"
		end
	end
	text({ Text = hint, Position = UDim2.fromOffset(0, 84), Size = UDim2.new(1, 0, 0, 36), TextColor3 = C.dim, TextSize = 17, Font = Enum.Font.GothamMedium, Parent = bar })
end

------------------------------------------------------------------ results

local function renderResults()
	clear(results)
	local r = state.result
	if not r then
		return
	end
	local title = if r.winner == 0 then "DRAW!" else `{state.seats[r.winner].name} WINS!`
	text({ Text = title, Size = UDim2.new(1, 0, 0, 54), Font = Enum.Font.GothamBlack, TextSize = 46, TextColor3 = if r.winner == 0 then C.text else C.seat[r.winner], Parent = results })
	local why = if r.decidedBy == "bouts"
		then `{r.wins[1]}–{r.wins[2]} in bouts`
		elseif r.decidedBy == "total" then `Bouts tied {r.wins[1]}–{r.wins[2]}: decided on total power`
		else "Bouts and total power both tied"
	text({ Text = why, Position = UDim2.fromOffset(0, 54), Size = UDim2.new(1, 0, 0, 24), TextColor3 = C.dim, Font = Enum.Font.GothamMedium, Parent = results })
	for i = 1, 2 do
		local sc = r.scores[i]
		text({
			Text = `{state.seats[i].name}: total {sc.total} · avg {sc.avgRating} · synergy +{sc.synergy}`,
			Position = UDim2.new((i - 1) * 0.5, 0, 0, 82),
			Size = UDim2.new(0.5, 0, 0, 22),
			TextColor3 = C.seat[i],
			TextSize = 16,
			Parent = results,
		})
	end

	local scroll = new("ScrollingFrame", {
		Position = UDim2.fromOffset(0, 114),
		Size = UDim2.new(1, 0, 1, -184),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 6,
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		CanvasSize = UDim2.new(),
		Parent = results,
	}, { new("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }) })
	for n, b in r.bouts do
		local bout = new("Frame", { Size = UDim2.new(1, -10, 0, 92), BackgroundColor3 = C.panel, LayoutOrder = n, Parent = scroll }, { corner(12), pad(8) })
		local left = new("Frame", { Size = UDim2.new(0.42, 0, 0, 44), BackgroundTransparency = 1, Parent = bout })
		miniRow(left, b.a, if b.winner == 1 then "WIN" else "", 1)
		text({ Text = "BOUT " .. n, Position = UDim2.fromScale(0.42, 0), Size = UDim2.new(0.16, 0, 0, 44), TextColor3 = C.dim, TextSize = 15, Parent = bout })
		local right = new("Frame", { Position = UDim2.fromScale(0.58, 0), Size = UDim2.new(0.42, 0, 0, 44), BackgroundTransparency = 1, Parent = bout })
		miniRow(right, b.b, if b.winner == 2 then "WIN" else "", 1)
		local winnerStroke = stroke(C.seat[b.winner], 3)
		winnerStroke.Parent = (if b.winner == 1 then left else right):FindFirstChildWhichIsA("Frame")
		text({ Text = b.reason, Position = UDim2.fromOffset(0, 48), Size = UDim2.new(1, 0, 0, 30), TextSize = 14, Font = Enum.Font.Gotham, TextColor3 = C.text, Parent = bout })
	end

	local row = new("Frame", { Position = UDim2.new(0, 0, 1, 0), AnchorPoint = Vector2.new(0, 1), Size = UDim2.new(1, 0, 0, 56), BackgroundTransparency = 1, Parent = results }, {
		new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 12), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
	})
	if mySeat then
		button({ Text = `REMATCH  ⚡{Config.ENERGY.draftCost}`, Size = UDim2.fromOffset(220, 56), BackgroundColor3 = C.good, TextSize = 22, Parent = row }, function()
			send("rematch")
		end)
		button({ Text = "BACK TO LOBBY", Size = UDim2.fromOffset(240, 56), TextSize = 22, Parent = row }, function()
			send("lobby")
		end)
	else
		text({ Text = "Spectating", Size = UDim2.fromOffset(300, 56), TextColor3 = C.dim, Parent = row })
	end
end

------------------------------------------------------------------ energy + shop

local energyPill = new("TextButton", {
	Text = "",
	Position = UDim2.new(0, 16, 1, -16),
	AnchorPoint = Vector2.new(0, 1),
	Size = UDim2.fromOffset(236, 58),
	BackgroundColor3 = C.bg,
	BackgroundTransparency = 0.1,
	AutoButtonColor = true,
	ZIndex = 20,
	Parent = root,
}, { corner(29), stroke(C.gold, 2) })
local energyValue = text({ Text = "⚡ …", Position = UDim2.fromOffset(18, 4), Size = UDim2.new(1, -76, 0, 30), Font = Enum.Font.GothamBlack, TextSize = 26, TextColor3 = C.gold, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, Parent = energyPill })
local energyRefill = text({ Text = "", Position = UDim2.fromOffset(18, 32), Size = UDim2.new(1, -76, 0, 18), Font = Enum.Font.GothamMedium, TextSize = 13, TextColor3 = C.dim, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, Parent = energyPill })
local plus = text({ Text = "+", Position = UDim2.new(1, -8, 0.5, 0), AnchorPoint = Vector2.new(1, 0.5), Size = UDim2.fromOffset(44, 44), BackgroundColor3 = C.good, BackgroundTransparency = 0, Font = Enum.Font.GothamBlack, TextSize = 32, ZIndex = 21, Parent = energyPill })
corner(22).Parent = plus

local shopDim = new("TextButton", { Text = "", AutoButtonColor = false, Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, Visible = false, ZIndex = 30, Parent = root })
local shop = new("Frame", { Size = UDim2.fromOffset(820, 470), Position = UDim2.fromScale(0.5, 0.5), AnchorPoint = Vector2.new(0.5, 0.5), BackgroundColor3 = C.bg, Active = true, ZIndex = 31, Parent = shopDim }, { corner(22), stroke(C.gold, 3), pad(24) })
text({ Text = "⚡ ENERGY", Size = UDim2.new(1, 0, 0, 48), Font = Enum.Font.GothamBlack, TextSize = 40, TextColor3 = C.gold, ZIndex = 32, Parent = shop })
local shopSub = text({ Text = "", Position = UDim2.fromOffset(0, 50), Size = UDim2.new(1, 0, 0, 44), Font = Enum.Font.GothamMedium, TextSize = 17, TextColor3 = C.dim, ZIndex = 32, Parent = shop })
local packRow = new("Frame", { Position = UDim2.fromOffset(0, 108), Size = UDim2.new(1, 0, 0, 250), BackgroundTransparency = 1, ZIndex = 32, Parent = shop }, {
	new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 18), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
})
local function closeShop()
	shopDim.Visible = false
end
local function openShop()
	shopDim.Visible = true
end
shopDim.Activated:Connect(closeShop)
energyPill.Activated:Connect(openShop)

for n, pack in Config.ENERGY_PACKS do
	local live = pack.id ~= 0
	local card = new("Frame", { Size = UDim2.fromOffset(240, 250), BackgroundColor3 = C.panel, LayoutOrder = n, ZIndex = 32, Parent = packRow }, {
		corner(18),
		stroke(if pack.tag then C.gold else C.panel2, if pack.tag then 3 else 2),
		pad(14),
	})
	if pack.tag then
		local tag = text({ Text = pack.tag, Position = UDim2.new(0.5, 0, 0, -28), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(130, 26), BackgroundColor3 = C.gold, BackgroundTransparency = 0, TextColor3 = Color3.new(0, 0, 0), TextSize = 13, Font = Enum.Font.GothamBlack, ZIndex = 33, Parent = card })
		corner(13).Parent = tag
	end
	text({ Text = pack.name, Size = UDim2.new(1, 0, 0, 26), TextSize = 20, ZIndex = 33, Parent = card })
	text({ Text = "⚡" .. pack.amount, Position = UDim2.fromOffset(0, 34), Size = UDim2.new(1, 0, 0, 80), Font = Enum.Font.GothamBlack, TextSize = 60, TextColor3 = C.gold, ZIndex = 33, Parent = card })
	text({ Text = `{pack.amount} more drafts`, Position = UDim2.fromOffset(0, 116), Size = UDim2.new(1, 0, 0, 22), TextSize = 15, Font = Enum.Font.GothamMedium, TextColor3 = C.dim, ZIndex = 33, Parent = card })
	local buy = button({
		Text = if live then `R$ {pack.robux}` else "Coming soon",
		Position = UDim2.new(0, 0, 1, 0),
		AnchorPoint = Vector2.new(0, 1),
		Size = UDim2.new(1, 0, 0, 56),
		BackgroundColor3 = if live then C.good else C.panel2,
		TextSize = 22,
		ZIndex = 33,
		Parent = card,
	}, function()
		if not live then
			toast("This pack isn't on sale yet")
			return
		end
		MarketplaceService:PromptProductPurchase(player, pack.id)
	end)
	setEnabled(buy, live)
end
button({ Text = "CLOSE", Position = UDim2.new(0.5, 0, 1, 0), AnchorPoint = Vector2.new(0.5, 1), Size = UDim2.fromOffset(200, 50), ZIndex = 32, Parent = shop }, closeShop)

local function fmtTime(sec: number): string
	sec = math.max(0, math.floor(sec))
	return string.format("%dh %02dm", sec // 3600, (sec % 3600) // 60)
end

local function refreshEnergy()
	local e = player:GetAttribute("Energy")
	local at = player:GetAttribute("EnergyRefillAt")
	energyValue.Text = if e then `⚡ {e}` else "⚡ …"
	energyValue.TextColor3 = if e and e < Config.ENERGY.draftCost then C.bad else C.gold
	local left = if at then at - workspace:GetServerTimeNow() else 0
	local daily = Config.ENERGY.daily
	energyRefill.Text = if e and e >= daily then "Full for today" else `+{daily} free in {fmtTime(left)}`
	shopSub.Text = `You have {e or "…"} energy. Each draft costs {Config.ENERGY.draftCost}.\nEvery day you're topped back up to {daily} free (in {fmtTime(left)}). Bought energy never expires.`
end
player:GetAttributeChangedSignal("Energy"):Connect(refreshEnergy)
player:GetAttributeChangedSignal("EnergyRefillAt"):Connect(refreshEnergy)
task.spawn(function()
	while true do
		refreshEnergy()
		task.wait(15)
	end
end)

ToastEvent.OnClientEvent:Connect(function(msg: string, kind: string?)
	toast(msg)
	if kind == "shop" then
		openShop()
	end
end)

------------------------------------------------------------------ state

local function render()
	if not state then
		return
	end
	mySeat = nil
	for i = 1, 2 do
		if state.seats[i].kind == "player" and state.seats[i].userId == player.UserId then
			mySeat = i
		end
	end
	lobby.Visible = state.mode == "lobby"
	draft.Visible = state.mode == "draft"
	results.Visible = state.mode == "results"
	if state.mode == "lobby" then
		renderLobby()
	elseif state.mode == "draft" then
		renderDraft()
	else
		renderResults()
	end
end

local watched: { [Player]: boolean } = {}
local function watch(p: Player)
	if watched[p] then
		return
	end
	watched[p] = true
	p:GetAttributeChangedSignal("Energy"):Connect(function()
		if state and state.mode == "lobby" then
			render()
		end
	end)
end
for _, p in Players:GetPlayers() do
	watch(p)
end
Players.PlayerAdded:Connect(watch)
Players.PlayerRemoving:Connect(function(p)
	watched[p] = nil
end)

StateEvent.OnClientEvent:Connect(function(snap)
	state = snap
	render()
end)
task.spawn(function()
	local ok, snap = pcall(function()
		return GetState:InvokeServer()
	end)
	if ok and snap and not state then
		state = snap
		render()
	end
end)

RunService.RenderStepped:Connect(function()
	if not (state and state.mode == "draft" and timerBar and timerText and state.deadline) then
		return
	end
	local a = state.auction
	local total = a.config.timer + (if a.lot and #a.lot.history == 0 then 4 else 0)
	local left = math.max(0, state.deadline - workspace:GetServerTimeNow())
	timerBar.Size = UDim2.fromScale(math.clamp(left / total, 0, 1), 1)
	timerBar.BackgroundColor3 = if left < 2.5 then C.bad else C.gold
	timerText.Text = if left < 2.5 then string.format("Going, going… %.1fs", left) else string.format("Hammer in %.1fs", left)
end)
