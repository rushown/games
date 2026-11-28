--!nonstrict
-- AnimeDraft client UI. Everything is drawn from server state; buttons only send intents.
-- Layout: a reference canvas (1180x680) scaled to the screen; the root always fills the whole
-- viewport, so edge-anchored pieces hug the screen edges on any aspect ratio (phones included).
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local StarterGui = game:GetService("StarterGui")
local MarketplaceService = game:GetService("MarketplaceService")
local SoundService = game:GetService("SoundService")
local GuiService = game:GetService("GuiService")
local ProximityPromptService = game:GetService("ProximityPromptService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Battle = require(Shared.Battle)
local Auction = require(Shared.Auction)
local Config = require(Shared.Config)
local DayNight = require(Shared.DayNight)
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ActionEvent = Remotes:WaitForChild("Action")
local StateEvent = Remotes:WaitForChild("State")
local TablesEvent = Remotes:WaitForChild("Tables")
local ToastEvent = Remotes:WaitForChild("Toast")
local GetState = Remotes:WaitForChild("GetState")
local DuelEvent = Remotes:WaitForChild("Duel")

local player = Players.LocalPlayer

local function core(kind, on)
	pcall(function()
		StarterGui:SetCoreGuiEnabled(kind, on)
	end)
end
core(Enum.CoreGuiType.Backpack, false)

------------------------------------------------------------------ theme

local HEAD = Font.fromEnum(Enum.Font.FredokaOne)
local BODY = Font.new("rbxasset://fonts/families/GothamSSm.json", Enum.FontWeight.Bold)
local BODY_MED = Font.new("rbxasset://fonts/families/GothamSSm.json", Enum.FontWeight.Medium)

local C = {
	ink = Color3.fromRGB(28, 16, 40),
	panelTop = Color3.fromRGB(74, 44, 120),
	panelBot = Color3.fromRGB(38, 22, 66),
	card = Color3.fromRGB(56, 34, 92),
	text = Color3.fromRGB(255, 250, 255),
	dim = Color3.fromRGB(205, 190, 235),
	gold = Color3.fromRGB(255, 205, 64),
	green = Color3.fromRGB(72, 214, 110),
	red = Color3.fromRGB(250, 76, 96),
	blue = Color3.fromRGB(70, 160, 255),
	purple = Color3.fromRGB(150, 90, 255),
	grey = Color3.fromRGB(110, 96, 140),
	seat = { Color3.fromRGB(255, 84, 112), Color3.fromRGB(70, 170, 255) },
}

------------------------------------------------------------------ sound

local sfx = {}
for name, id in Config.SOUNDS do
	if id ~= 0 then
		local s = Instance.new("Sound")
		s.Name = name
		s.SoundId = "rbxassetid://" .. id
		s.Volume = if name:find("Music") then 0 else 0.6
		s.Looped = name:find("Music") ~= nil
		s.Parent = SoundService
		sfx[name] = s
	end
end
local musicOn = true
local currentMusic = nil
local function play(name: string)
	local s = sfx[name]
	if s then
		SoundService:PlayLocalSound(s)
	end
end
local function setMusic(name: string?)
	if currentMusic == name then
		return
	end
	local old = currentMusic and sfx[currentMusic]
	currentMusic = name
	if old then
		TweenService:Create(old, TweenInfo.new(1.2), { Volume = 0 }):Play()
		task.delay(1.3, function()
			if currentMusic ~= old.Name then
				old:Stop()
			end
		end)
	end
	local new = name and sfx[name]
	if new then
		if not new.IsPlaying then
			new:Play()
		end
		TweenService:Create(new, TweenInfo.new(1.5), { Volume = if musicOn then 0.32 else 0 }):Play()
	end
end

------------------------------------------------------------------ helpers

local function new(class: string, props, children)
	local inst = Instance.new(class)
	for k, v in props do
		if k ~= "Parent" then
			inst[k] = v
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
local function corner(r)
	return new("UICorner", { CornerRadius = UDim.new(0, r or 14) })
end
local function stroke(color, t, mode)
	return new("UIStroke", { Color = color, Thickness = t or 3, ApplyStrokeMode = mode or Enum.ApplyStrokeMode.Border, LineJoinMode = Enum.LineJoinMode.Round })
end
local function pad(n)
	return new("UIPadding", { PaddingTop = UDim.new(0, n), PaddingBottom = UDim.new(0, n), PaddingLeft = UDim.new(0, n), PaddingRight = UDim.new(0, n) })
end
local function shine(rot)
	-- Lighter top, darker bottom: the glossy "simulator" look.
	return new("UIGradient", { Rotation = rot or 90, Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(185, 185, 185)) })
end
local function tween(obj, t, props, style, dir)
	local tw = TweenService:Create(obj, TweenInfo.new(t, style or Enum.EasingStyle.Quad, dir or Enum.EasingDirection.Out), props)
	tw:Play()
	return tw
end

-- Text. `heading = true` uses the chunky font with a dark outline.
local function text(props)
	local heading = props.heading
	props.heading = nil
	local base = {
		BackgroundTransparency = 1,
		TextColor3 = C.text,
		FontFace = if heading then HEAD else BODY,
		TextSize = 18,
		TextWrapped = true,
	}
	for k, v in props do
		base[k] = v
	end
	local l = new("TextLabel", base)
	if heading then
		stroke(C.ink, if (base.TextSize or 18) >= 30 then 3 else 2, Enum.ApplyStrokeMode.Contextual).Parent = l
	end
	return l
end

local function setEnabled(b, on)
	b:SetAttribute("Enabled", on)
	b.Active = on
	b.AutoButtonColor = false
	b.BackgroundColor3 = if on then b:GetAttribute("Color") else C.grey
	b.TextTransparency = if on then 0 else 0.35
end

-- Chunky bouncy button.
local function button(props, onClick)
	local color = props.BackgroundColor3 or C.purple
	local radius = props.radius or 14
	local sheen = props.sheen
	props.radius = nil
	props.sheen = nil
	local base = {
		BackgroundColor3 = color,
		TextColor3 = C.text,
		FontFace = HEAD,
		TextSize = 22,
		AutoButtonColor = false,
		Text = "",
	}
	for k, v in props do
		base[k] = v
	end
	local b = new("TextButton", base, {
		corner(radius),
		stroke(C.ink, 4),
		stroke(C.ink, 2.5, Enum.ApplyStrokeMode.Contextual),
		new("UIGradient", { Rotation = 90, Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.new(1, 1, 1)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(235, 235, 235)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(150, 150, 150)),
		}) }),
	})
	-- Glossy highlight on the top half
	new("Frame", {
		Name = "Gloss",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 3),
		Size = UDim2.new(1, -10, 0.42, -3),
		BackgroundColor3 = Color3.new(1, 1, 1),
		BackgroundTransparency = 0.8,
		BorderSizePixel = 0,
		ZIndex = base.ZIndex or 1,
		Parent = b,
	}, { corner(math.max(radius - 4, 4)) })
	if sheen then
		-- A light streak sweeps across the button every few seconds.
		local band = new("Frame", { Name = "Sheen", Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0, BorderSizePixel = 0, ZIndex = base.ZIndex or 1, Parent = b }, { corner(radius) })
		local g = new("UIGradient", {
			Rotation = 20,
			Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 1),
				NumberSequenceKeypoint.new(0.42, 1),
				NumberSequenceKeypoint.new(0.5, 0.55),
				NumberSequenceKeypoint.new(0.58, 1),
				NumberSequenceKeypoint.new(1, 1),
			}),
			Offset = Vector2.new(-1, 0),
			Parent = band,
		})
		task.spawn(function()
			while b.Parent do
				g.Offset = Vector2.new(-1, 0)
				tween(g, 0.9, { Offset = Vector2.new(1, 0) }, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut).Completed:Wait()
				task.wait(1.8)
			end
		end)
	end
	b:SetAttribute("Color", color)
	b:SetAttribute("Enabled", true)
	local scale = new("UIScale", { Parent = b })
	b.MouseEnter:Connect(function()
		if b:GetAttribute("Enabled") then
			tween(scale, 0.12, { Scale = 1.06 })
		end
	end)
	b.MouseLeave:Connect(function()
		tween(scale, 0.12, { Scale = 1 })
	end)
	b.MouseButton1Down:Connect(function()
		if b:GetAttribute("Enabled") then
			tween(scale, 0.06, { Scale = 0.92 })
		end
	end)
	b.MouseButton1Up:Connect(function()
		tween(scale, 0.2, { Scale = 1 }, Enum.EasingStyle.Back)
	end)
	b.Activated:Connect(function()
		if b:GetAttribute("Enabled") then
			play("click")
			onClick()
		end
	end)
	return b
end

local function panel(props, children)
	local base = { BackgroundColor3 = Color3.new(1, 1, 1), AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5) }
	for k, v in props do
		base[k] = v
	end
	local p = new("Frame", base, {
		corner(24),
		stroke(Color3.fromRGB(255, 255, 255), 4),
		new("UIGradient", { Rotation = 90, Color = ColorSequence.new(C.panelTop, C.panelBot) }),
	})
	for _, ch in children or {} do
		ch.Parent = p
	end
	return p
end

local function clear(frame)
	for _, ch in frame:GetChildren() do
		if not (ch:IsA("UIBase") or ch:GetAttribute("Keep")) then
			ch:Destroy()
		end
	end
end

-- Ribbon title that sticks out above a panel's top edge.
local function banner(parent, label, color, z)
	local w = math.max(300, utf8.len(label) * 26 + 80)
	local b = new("Frame", {
		Name = "Banner",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0, 2),
		Size = UDim2.fromOffset(w, 66),
		Rotation = -2,
		BackgroundColor3 = Color3.new(1, 1, 1),
		ZIndex = (z or 1) + 2,
		Parent = parent,
	}, {
		corner(18),
		stroke(C.ink, 5),
		new("UIGradient", { Rotation = 90, Color = ColorSequence.new(color or Color3.fromRGB(255, 214, 80), Color3.fromRGB(255, 130, 40)) }),
	})
	new("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 4), Size = UDim2.new(1, -14, 0.42, 0), BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0.7, BorderSizePixel = 0, ZIndex = (z or 1) + 2, Parent = b }, { corner(14) })
	text({ Text = label, Size = UDim2.fromScale(1, 1), heading = true, TextSize = 40, ZIndex = (z or 1) + 3, Parent = b })
	return b
end

-- Round red close button sitting on a panel's top-right corner.
local function closeX(parent, fn, z)
	return button({
		Text = "X",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(1, -10, 0, 10),
		Size = UDim2.fromOffset(56, 56),
		BackgroundColor3 = C.red,
		TextSize = 30,
		radius = 28,
		ZIndex = (z or 1) + 3,
		Parent = parent,
	}, fn)
end

-- Panels spring in when they appear.
local function popIn(obj)
	local s = obj:FindFirstChild("PopScale") or new("UIScale", { Name = "PopScale", Parent = obj })
	s.Scale = 0.82
	tween(s, 0.35, { Scale = 1 }, Enum.EasingStyle.Back)
end

local function send(t: string, extra)
	local msg = extra or {}
	msg.type = t
	ActionEvent:FireServer(msg)
end

------------------------------------------------------------------ root (responsive)

local gui = new("ScreenGui", {
	Name = "AnimeDraft",
	ResetOnSpawn = false,
	IgnoreGuiInset = true,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = player:WaitForChild("PlayerGui"),
})
local REF = Vector2.new(1180, 680)
-- `root` covers the screen below Roblox's top bar (menu/chat buttons), so nothing hides under them.
local root = new("Frame", { BackgroundTransparency = 1, Parent = gui })
local uiScale = new("UIScale", { Parent = root })
local function rescale()
	local v = workspace.CurrentCamera.ViewportSize
	local inset = 0
	pcall(function()
		inset = GuiService.TopbarInset.Height
	end)
	if inset <= 0 then
		inset = GuiService:GetGuiInset().Y
	end
	local h = v.Y - inset
	local s = math.max(math.min(v.X / REF.X, h / REF.Y), 0.3)
	uiScale.Scale = s
	root.Position = UDim2.fromOffset(0, inset)
	root.Size = UDim2.fromOffset(v.X / s, h / s)
end
rescale()
workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
pcall(function()
	GuiService:GetPropertyChangedSignal("TopbarInset"):Connect(rescale)
end)

------------------------------------------------------------------ toast

local toastFrame = new("Frame", {
	Size = UDim2.fromOffset(560, 54),
	Position = UDim2.new(0.5, 0, 0, -400),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = C.ink,
	BackgroundTransparency = 0.1,
	ZIndex = 60,
	Parent = root,
}, { corner(27), stroke(C.gold, 3) })
local toastText = text({ Text = "", Size = UDim2.fromScale(1, 1), heading = true, TextSize = 22, ZIndex = 61, Parent = toastFrame })
local toastToken = 0
local function toast(msg: string)
	toastToken += 1
	local my = toastToken
	toastText.Text = msg
	tween(toastFrame, 0.35, { Position = UDim2.new(0.5, 0, 0, 14) }, Enum.EasingStyle.Back)
	task.delay(2.8, function()
		if my == toastToken then
			tween(toastFrame, 0.3, { Position = UDim2.new(0.5, 0, 0, -400) }, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
		end
	end)
end

------------------------------------------------------------------ character card


-- Portrait slot: an uploaded image when Config.CHARACTER_IMAGES has one for this character, otherwise
-- an emblem in the series colours with the character's initials.
local function portrait(parent, c, s, size, pos)
	local frame = new("Frame", { Size = size, Position = pos or UDim2.new(), BackgroundColor3 = Color3.new(1, 1, 1), ClipsDescendants = true, Parent = parent }, {
		corner(18),
		stroke(Color3.new(1, 1, 1), 3),
		new("UIGradient", { Color = ColorSequence.new(s.c2, s.c1), Rotation = 60 }),
	})
	local imageId = Config.CHARACTER_IMAGES[c.key]
	if imageId and imageId ~= 0 then
		new("ImageLabel", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Image = "rbxassetid://" .. imageId, ScaleType = Enum.ScaleType.Crop, Parent = frame }, { corner(18) })
	else
		-- Light burst behind the emblem
		for i = 0, 5 do
			new("Frame", {
				AnchorPoint = Vector2.new(0.5, 0.5),
				Position = UDim2.fromScale(0.5, 0.42),
				Size = UDim2.new(0, 22, 2, 0),
				Rotation = i * 30,
				BackgroundColor3 = Color3.new(1, 1, 1),
				BackgroundTransparency = 0.82,
				BorderSizePixel = 0,
				Parent = frame,
			})
		end
		local ring = new("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.42), Size = UDim2.fromScale(0.78, 0.78), BackgroundColor3 = C.ink, BackgroundTransparency = 0.25, Parent = frame }, {
			new("UIAspectRatioConstraint", { AspectRatio = 1 }),
			new("UICorner", { CornerRadius = UDim.new(1, 0) }),
			stroke(Color3.new(1, 1, 1), 3),
		})
		text({ Text = c.initials, Size = UDim2.fromScale(1, 1), heading = true, TextScaled = true, Parent = ring })
		new("UIPadding", { PaddingTop = UDim.new(0.18, 0), PaddingBottom = UDim.new(0.18, 0), PaddingLeft = UDim.new(0.12, 0), PaddingRight = UDim.new(0.12, 0), Parent = ring })
		text({ Text = s.short, AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -10), Size = UDim2.new(1, -16, 0, 30), heading = true, TextSize = 26, TextColor3 = C.text, Parent = frame })
	end
	return frame
end

local TIER_COLOR = {
	BEYOND = Color3.fromRGB(170, 90, 255),
	SSS = Color3.fromRGB(255, 80, 110),
	SS = Color3.fromRGB(255, 150, 60),
	S = Color3.fromRGB(255, 210, 70),
	A = Color3.fromRGB(90, 200, 255),
	B = Color3.fromRGB(150, 220, 140),
}

local function characterCard(parent, key, size, pos, anchor)
	local c = Data.get(key)
	local s = Data.SERIES[c.series]
	local tierColor = TIER_COLOR[c.tier] or C.gold
	local card = new("Frame", { Size = size, Position = pos, AnchorPoint = anchor or Vector2.zero, BackgroundColor3 = Color3.new(1, 1, 1), Parent = parent }, {
		corner(22),
		stroke(tierColor, 5),
		new("UIGradient", { Color = ColorSequence.new(s.c1, s.c2), Rotation = 35 }),
	})
	local shade = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, Parent = card }, { corner(22), pad(14) })
	portrait(shade, c, s, UDim2.new(0, 196, 1, 0))
	local info = new("Frame", { Position = UDim2.fromOffset(212, 0), Size = UDim2.new(1, -212, 1, 0), BackgroundTransparency = 1, Parent = shade })
	text({ Text = s.name:upper(), Size = UDim2.new(1, -96, 0, 20), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, TextSize = 14, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, Parent = info })
	local tier = text({
		Text = Battle.tierLabel(c.tier),
		Position = UDim2.new(1, 0, 0, 0),
		AnchorPoint = Vector2.new(1, 0),
		Size = UDim2.fromOffset(86, 40),
		BackgroundColor3 = tierColor,
		BackgroundTransparency = 0,
		heading = true,
		TextSize = 28,
		Parent = info,
	})
	corner(12).Parent = tier
	stroke(C.ink, 3).Parent = tier
	text({ Text = c.name, Position = UDim2.fromOffset(0, 40), Size = UDim2.new(1, 0, 0, 74), TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, heading = true, TextSize = 36, Parent = info })
	text({ Text = c.title, Position = UDim2.fromOffset(0, 116), Size = UDim2.new(1, 0, 0, 22), TextXAlignment = Enum.TextXAlignment.Left, FontFace = BODY_MED, TextSize = 17, TextColor3 = C.gold, Parent = info })
	-- Power meter (rating 0–100)
	text({ Text = "POWER", Position = UDim2.fromOffset(0, 150), Size = UDim2.fromOffset(70, 20), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 14, TextColor3 = C.dim, Parent = info })
	local track = new("Frame", { Position = UDim2.fromOffset(70, 154), Size = UDim2.new(1, -120, 0, 13), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, Parent = info }, { corner(7) })
	local fill = new("Frame", { Size = UDim2.fromScale(0, 1), BackgroundColor3 = tierColor, Parent = track }, { corner(7), shine() })
	tween(fill, 0.8, { Size = UDim2.fromScale(math.clamp(c.rating / 100, 0.04, 1), 1) }, Enum.EasingStyle.Quart)
	text({ Text = tostring(c.rating), Position = UDim2.new(1, -44, 0, 148), Size = UDim2.fromOffset(44, 24), TextXAlignment = Enum.TextXAlignment.Right, heading = true, TextSize = 20, Parent = info })
	text({
		Text = Battle.scalingLine(c) .. "\n" .. c.feat,
		Position = UDim2.fromOffset(0, 184),
		Size = UDim2.new(1, 0, 1, -184),
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		FontFace = BODY_MED,
		TextSize = 14,
		TextTruncate = Enum.TextTruncate.AtEnd,
		Parent = info,
	})
	return card
end

local function miniRow(parent, key, rightText, order, height)
	local c = Data.get(key)
	local s = Data.SERIES[c.series]
	local row = new("Frame", { Size = UDim2.new(1, 0, 0, height or 44), BackgroundColor3 = Color3.new(1, 1, 1), LayoutOrder = order, Parent = parent }, {
		corner(10),
		new("UIGradient", { Color = ColorSequence.new(s.c1, s.c2) }),
	})
	local shade = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, Parent = row }, { corner(10), pad(6) })
	text({ Text = c.name, Size = UDim2.new(1, -54, 0, 18), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 15, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, Parent = shade })
	text({ Text = `{Battle.tierLabel(c.tier)} · {c.rating} · {s.short}`, Position = UDim2.fromOffset(0, 18), Size = UDim2.new(1, -54, 0, 14), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 12, FontFace = BODY_MED, TextColor3 = C.dim, Parent = shade })
	text({ Text = rightText, Position = UDim2.new(1, -54, 0, 0), Size = UDim2.new(0, 54, 1, 0), TextXAlignment = Enum.TextXAlignment.Right, heading = true, TextSize = 17, TextColor3 = C.gold, Parent = shade })
	return row
end

------------------------------------------------------------------ screens

local tablesPanel = panel({ Size = UDim2.fromOffset(980, 580), Position = UDim2.new(0.5, 44, 0.5, 0), Visible = false, Parent = root })
local lobbyPanel = panel({ Size = UDim2.fromOffset(780, 580), Visible = false, Parent = root })
local draftLayer = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false, Parent = root })
local resultsPanel = panel({ Size = UDim2.fromOffset(940, 600), Position = UDim2.new(0.5, 0, 0.5, -10), Visible = false, Parent = root })

local tables = {}
local state = nil
local mySeat = nil
local browserOpen = true

------------------------------------------------------------------ table browser

local MODE_LABEL = { lobby = { "OPEN", C.green }, draft = { "DRAFTING", C.gold }, results = { "RESULTS", C.blue } }

local function renderTables()
	clear(tablesPanel)
	banner(tablesPanel, "ANIME DRAFT")
	text({ Text = "Bid on anime's strongest · build a team of legends · power scaling decides", Position = UDim2.fromOffset(0, 70), Size = UDim2.new(1, 0, 0, 24), FontFace = BODY_MED, TextColor3 = C.dim, TextSize = 17, Parent = tablesPanel })
	closeX(tablesPanel, function()
		browserOpen = false
		tablesPanel.Visible = false
		core(Enum.CoreGuiType.PlayerList, true)
	end)

	local grid = new("Frame", { Position = UDim2.fromOffset(30, 110), Size = UDim2.new(1, -60, 1, -210), BackgroundTransparency = 1, Parent = tablesPanel }, {
		new("UIGridLayout", { CellSize = UDim2.new(1 / 4, -12, 0.5, -8), CellPadding = UDim2.fromOffset(16, 16), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	for _, t in tables do
		local m = MODE_LABEL[t.mode]
		local card = new("Frame", { BackgroundColor3 = C.card, LayoutOrder = t.id, Parent = grid }, { corner(18), stroke(C.ink, 3), pad(12) })
		text({ Text = "TABLE " .. t.id, Size = UDim2.new(1, -86, 0, 30), TextXAlignment = Enum.TextXAlignment.Left, heading = true, TextSize = 24, Parent = card })
		local pill = text({ Text = m[1], Position = UDim2.new(1, 0, 0, 2), AnchorPoint = Vector2.new(1, 0), Size = UDim2.fromOffset(84, 24), BackgroundTransparency = 0, BackgroundColor3 = m[2], TextColor3 = C.ink, FontFace = HEAD, TextSize = 13, Parent = card })
		corner(13).Parent = pill
		for i = 1, 2 do
			local open = t.kinds[i] == "empty"
			text({
				Text = (if open then "· open seat ·" else t.names[i]) .. (if t.kinds[i] == "bot" then " 🤖" else ""),
				Position = UDim2.fromOffset(0, 38 + (i - 1) * 30),
				Size = UDim2.new(1, 0, 0, 26),
				TextXAlignment = Enum.TextXAlignment.Left,
				TextColor3 = if open then C.dim else C.seat[i],
				TextTruncate = Enum.TextTruncate.AtEnd,
				TextWrapped = false,
				TextSize = 18,
				Parent = card,
			})
		end
		text({ Text = `👀 {t.watching}`, Position = UDim2.new(0, 0, 1, -40), Size = UDim2.fromOffset(80, 40), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, Parent = card })
		local hasSeat = t.mode == "lobby" and (t.kinds[1] == "empty" or t.kinds[2] == "empty")
		button({
			Text = if hasSeat then "JOIN" else "WATCH",
			Position = UDim2.new(1, 0, 1, 0),
			AnchorPoint = Vector2.new(1, 1),
			Size = UDim2.fromOffset(104, 42),
			BackgroundColor3 = if hasSeat then C.green else C.blue,
			Parent = card,
		}, function()
			send("join", { table = t.id })
		end)
	end
	button({ Text = "⚡ QUICK PLAY", sheen = true, Position = UDim2.new(0.5, 0, 1, -22), AnchorPoint = Vector2.new(0.5, 1), Size = UDim2.fromOffset(320, 64), BackgroundColor3 = C.green, TextSize = 30, Parent = tablesPanel }, function()
		send("quickPlay")
	end)
end

------------------------------------------------------------------ table lobby

local CONFIG_ROWS = {
	{ key = "budget", label = "Budget", options = { 15, 25, 40 }, fmt = function(v) return "$" .. v end },
	{ key = "teamSize", label = "Team size", options = { 3, 5 }, fmt = function(v) return v .. " fighters" end },
	{ key = "timer", label = "Hammer", options = { 5, 8, 12, 0 }, fmt = function(v) return if v == 0 then "Manual" else v .. "s" end },
	{ key = "pool", label = "Characters", options = { "all", "fair", "gods" }, fmt = function(v) return ({ all = "Everyone", fair = "No gods", gods = "Gods only" })[v] end },
}

local function energyOf(userId)
	local who = Players:GetPlayerByUserId(userId)
	return who and who:GetAttribute("Energy")
end

local function renderLobby()
	clear(lobbyPanel)
	banner(lobbyPanel, "TABLE " .. state.table)
	text({ Text = `{state.watching} here · 1 skip each · keep or pass when someone's broke`, Position = UDim2.fromOffset(0, 62), Size = UDim2.new(1, 0, 0, 22), FontFace = BODY_MED, TextColor3 = C.dim, TextSize = 16, Parent = lobbyPanel })
	button({ Text = "LEAVE", Size = UDim2.fromOffset(104, 42), Position = UDim2.new(1, -16, 0, 16), AnchorPoint = Vector2.new(1, 0), BackgroundColor3 = C.red, TextSize = 18, Parent = lobbyPanel }, function()
		send("leave")
	end)

	for i = 1, 2 do
		local seat = state.seats[i]
		local box = new("Frame", { Position = UDim2.new((i - 1) * 0.5, if i == 1 then 28 else 8, 0, 100), Size = UDim2.new(0.5, -36, 0, 150), BackgroundColor3 = C.card, Parent = lobbyPanel }, { corner(18), stroke(C.seat[i], 4), pad(14) })
		text({ Text = "SEAT " .. i, Size = UDim2.new(0.5, 0, 0, 20), TextColor3 = C.seat[i], heading = true, TextSize = 18, TextXAlignment = Enum.TextXAlignment.Left, Parent = box })
		text({
			Text = if seat.kind == "empty" then "Open seat" else seat.name .. (if seat.kind == "bot" then " 🤖" else ""),
			Position = UDim2.fromOffset(0, 24),
			Size = UDim2.new(1, 0, 0, 40),
			heading = true,
			TextSize = 30,
			TextXAlignment = Enum.TextXAlignment.Left,
			TextTruncate = Enum.TextTruncate.AtEnd,
			TextWrapped = false,
			TextColor3 = if seat.kind == "empty" then C.dim else C.text,
			Parent = box,
		})
		if seat.kind == "player" then
			local e = energyOf(seat.userId)
			text({ Text = if e then `⚡ {e}` else "⚡ …", Position = UDim2.new(0.5, 0, 0, 0), Size = UDim2.new(0.5, 0, 0, 20), TextXAlignment = Enum.TextXAlignment.Right, TextColor3 = if e and e < Config.ENERGY.draftCost then C.red else C.gold, heading = true, Parent = box })
		end
		local row = new("Frame", { Position = UDim2.new(0, 0, 1, -48), Size = UDim2.new(1, 0, 0, 48), BackgroundTransparency = 1, Parent = box }, {
			new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10) }),
		})
		if seat.kind == "empty" then
			if not mySeat then
				button({ Text = "SIT HERE", Size = UDim2.fromOffset(150, 48), BackgroundColor3 = C.seat[i], Parent = row }, function()
					send("sit", { seat = i })
				end)
			else
				button({ Text = "🤖 ADD BOT", Size = UDim2.fromOffset(160, 48), BackgroundColor3 = C.purple, Parent = row }, function()
					send("addBot", { seat = i })
				end)
			end
		elseif seat.kind == "bot" then
			button({ Text = "REMOVE BOT", Size = UDim2.fromOffset(170, 48), BackgroundColor3 = C.grey, Parent = row }, function()
				send("removeBot", { seat = i })
			end)
		elseif mySeat == i then
			button({ Text = "STAND UP", Size = UDim2.fromOffset(150, 48), BackgroundColor3 = C.grey, Parent = row }, function()
				send("stand")
			end)
		end
	end

	for r, cfg in CONFIG_ROWS do
		local y = 272 + (r - 1) * 54
		text({ Text = cfg.label, Position = UDim2.fromOffset(28, y), Size = UDim2.fromOffset(150, 44), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, heading = true, TextSize = 20, Parent = lobbyPanel })
		local row = new("Frame", { Position = UDim2.fromOffset(180, y), Size = UDim2.new(1, -208, 0, 44), BackgroundTransparency = 1, Parent = lobbyPanel }, {
			new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10) }),
		})
		for _, v in cfg.options do
			local on = state.config[cfg.key] == v
			local b = button({
				Text = cfg.fmt(v),
				Size = UDim2.fromOffset(if cfg.key == "pool" or cfg.key == "teamSize" then 160 else 118, 44),
				TextSize = 18,
				BackgroundColor3 = if on then C.gold else C.card,
				Parent = row,
			}, function()
				send("config", { key = cfg.key, value = v })
			end)
			if not mySeat and not on then
				setEnabled(b, false)
			end
		end
	end

	local ready = state.seats[1].kind ~= "empty" and state.seats[2].kind ~= "empty"
	local hint = if not mySeat then "Grab an open seat to play, or stay and watch."
		elseif not ready then "Waiting for an opponent… or add a bot!"
		else `Ready! Each player spends {Config.ENERGY.draftCost} ⚡ to start.`
	text({ Text = hint, Position = UDim2.new(0, 28, 1, -84), Size = UDim2.new(0.5, 0, 0, 60), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = C.dim, FontFace = BODY_MED, Parent = lobbyPanel })
	local start = button({ Text = `START  ⚡{Config.ENERGY.draftCost}`, sheen = true, Position = UDim2.new(1, -28, 1, -22), AnchorPoint = Vector2.new(1, 1), Size = UDim2.fromOffset(260, 64), BackgroundColor3 = C.green, TextSize = 30, Parent = lobbyPanel }, function()
		send("start")
	end)
	setEnabled(start, ready and mySeat ~= nil)
end

------------------------------------------------------------------ draft

local cardHolder = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = draftLayer })
local dyn = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = draftLayer })
local shownLot = nil
local shownBid = nil
local shownOutcome = nil
local timerBar, timerText = nil, nil

local OUTCOME = {
	sold = function(o, a, c) return `🔨 {c.name} SOLD to {a.players[o.player].name} for ${o.price}` end,
	unsold = function(_, _, c) return `No bids: {c.name} goes back in the deck` end,
	vetoed = function(o, a, c) return `⛔ {a.players[o.player].name} SKIPPED {c.name}` end,
	kept = function(o, a, c) return `{a.players[o.player].name} kept {c.name}` end,
	passed = function(o, a, c) return `{c.name} was passed to {a.players[o.player].name}` end,
}

local function seatPanel(i)
	local a = state.auction
	local p = a.players[i]
	local left = i == 1
	local leading = a.lot and a.lot.leader == i
	local box = new("Frame", {
		Position = if left then UDim2.fromOffset(16, 76) else UDim2.new(1, -16, 0, 76),
		AnchorPoint = if left then Vector2.zero else Vector2.new(1, 0),
		Size = UDim2.new(0, 250, 1, -270),
		BackgroundColor3 = C.panelBot,
		BackgroundTransparency = 0.08,
		Parent = dyn,
	}, { corner(20), stroke(if leading then C.gold else C.seat[i], if leading then 5 else 3), pad(12) })
	text({ Text = p.name .. (if mySeat == i then " (you)" else ""), Size = UDim2.new(1, 0, 0, 26), TextColor3 = C.seat[i], heading = true, TextSize = 22, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, Parent = box })
	text({ Text = "$" .. p.budget, Position = UDim2.fromOffset(0, 28), Size = UDim2.new(0.5, 0, 0, 46), heading = true, TextSize = 42, TextColor3 = C.gold, TextXAlignment = Enum.TextXAlignment.Left, Parent = box })
	text({ Text = `{#p.team}/{a.config.teamSize}\n` .. (if p.skipUsed then "skip used" else "⛔ 1 skip"), Position = UDim2.new(0.5, 0, 0, 28), Size = UDim2.new(0.5, 0, 0, 46), TextXAlignment = Enum.TextXAlignment.Right, TextColor3 = C.dim, TextSize = 15, Parent = box })
	local list = new("ScrollingFrame", { Position = UDim2.fromOffset(0, 84), Size = UDim2.new(1, 0, 1, -84), BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 4, AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), Parent = box }, {
		new("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	for n, o in p.team do
		miniRow(list, o.key, if o.via == "won" then "$" .. o.price elseif o.via == "kept" then "kept" else "gift", n)
	end
	for n = #p.team + 1, a.config.teamSize do
		new("Frame", { Size = UDim2.new(1, 0, 0, 44), BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0.88, LayoutOrder = n, Parent = list }, { corner(10) })
	end
end

local function renderDraft()
	local a = state.auction
	if not a or not a.lot then
		return
	end

	-- The card only rebuilds when a new character comes up, so bids never flicker it.
	if shownLot ~= a.lotNo then
		shownLot = a.lotNo
		shownBid = nil
		clear(cardHolder)
		local card = characterCard(cardHolder, a.lot.key, UDim2.fromOffset(520, 318), UDim2.new(0.5, 0, 0, 62), Vector2.new(0.5, 0))
		popIn(card)
		play("lot")
	end
	if a.last and a.last.id ~= shownOutcome then
		local first = shownOutcome == nil
		shownOutcome = a.last.id
		if not first and a.last.kind == "sold" then
			play("sold")
		end
	end

	clear(dyn)
	timerBar, timerText = nil, nil
	seatPanel(1)
	seatPanel(2)

	text({ Text = `TABLE {state.table} · LOT {a.lotNo} · {a.left} left`, Position = UDim2.new(0.5, 0, 0, 20), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(400, 30), heading = true, TextSize = 20, TextColor3 = C.dim, Parent = dyn })
	button({ Text = "LEAVE", Size = UDim2.fromOffset(96, 40), Position = UDim2.new(1, -16, 0, 20), AnchorPoint = Vector2.new(1, 0), BackgroundColor3 = C.red, TextSize = 17, Parent = dyn }, function()
		send("leave")
	end)

	local status, color
	if a.phase == "auction" then
		status = if a.lot.leader then `${a.lot.bid} · {a.players[a.lot.leader].name}` else "Opening bid: $1"
		color = if a.lot.leader then C.seat[a.lot.leader] else C.text
	elseif a.pending == "decide" then
		status = `{a.players[a.chooser].name}: keep or pass?`
		color = C.gold
	else
		status = `{a.players[Auction.other(a.chooser)].name}: accept or skip?`
		color = C.gold
	end
	local bidLabel = text({ Text = status, Position = UDim2.new(0.5, 0, 0, 410), AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.fromOffset(560, 48), heading = true, TextSize = 38, TextColor3 = color, Parent = dyn })
	local bs = new("UIScale", { Parent = bidLabel })
	local bidKey = a.phase .. tostring(a.lot.bid) .. tostring(a.lot.leader)
	if shownBid and shownBid ~= bidKey and a.lot.leader then
		play("bid")
		bs.Scale = 1.35
		tween(bs, 0.35, { Scale = 1 }, Enum.EasingStyle.Back)
	end
	shownBid = bidKey

	if a.phase == "auction" then
		local track = new("Frame", { Position = UDim2.new(0.5, 0, 0, 444), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(520, 14), BackgroundColor3 = C.ink, Parent = dyn }, { corner(7), stroke(C.ink, 2) })
		timerBar = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.gold, Parent = track }, { corner(7), shine() })
		timerText = text({ Position = UDim2.new(0.5, 0, 0, 460), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(520, 22), TextSize = 16, TextColor3 = C.dim, Parent = dyn })
		if a.config.timer == 0 then
			timerText.Text = "Manual hammer: a seated player taps SOLD!"
			track.Visible = false
		end
	end
	if a.last then
		local c = Data.get(a.last.key)
		text({ Text = OUTCOME[a.last.kind](a.last, a, c), Position = UDim2.new(0.5, 0, 0, 484), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(600, 24), TextSize = 17, TextColor3 = C.gold, FontFace = BODY_MED, Parent = dyn })
	end

	-- Action bar
	local bar = new("Frame", { Position = UDim2.new(0.5, 0, 1, -16), AnchorPoint = Vector2.new(0.5, 1), Size = UDim2.fromOffset(640, 150), BackgroundColor3 = C.panelBot, BackgroundTransparency = 0.08, Parent = dyn }, { corner(22), stroke(Color3.new(1, 1, 1), 3), pad(14) })
	if not mySeat then
		text({ Text = "👀 Spectating", Size = UDim2.fromScale(1, 1), heading = true, TextColor3 = C.dim, TextSize = 28, Parent = bar })
		return
	end
	local me = mySeat
	local row = new("Frame", { Size = UDim2.new(1, 0, 0, 74), BackgroundTransparency = 1, Parent = bar }, {
		new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
	})
	local function act(label, color, enabled, w, fn)
		local b = button({ Text = label, Size = UDim2.fromOffset(w, 74), BackgroundColor3 = color, TextSize = 24, Parent = row }, fn)
		setEnabled(b, enabled)
	end
	local skipOk = Auction.canSkip(a, me)
	local hint
	if a.phase == "auction" then
		local myP = a.players[me]
		local room = #myP.team < a.config.teamSize
		local leading = a.lot.leader == me
		for _, by in { 1, 2, 5 } do
			act("+$" .. by, C.seat[me], room and not leading and a.lot.bid + by <= myP.budget, 92, function()
				send("raise", { by = by })
			end)
		end
		act("ALL IN", C.red, room and not leading and myP.budget > a.lot.bid, 116, function()
			send("allIn")
		end)
		act("SKIP", C.grey, skipOk, 96, function()
			send("skip")
		end)
		if a.config.timer == 0 then
			act("SOLD!", C.green, true, 96, function()
				send("hammer")
			end)
		end
		hint = if not room then "Your team is full: watch the rest!" elseif leading then "🔥 You're winning this one!" else `You have ${myP.budget}. Raise to take the lead!`
	else
		local opt = Auction.choiceOptions(a)
		if opt and a.pending == "decide" and opt.chooser == me then
			act("KEEP", C.green, opt.canKeep, 170, function()
				send("keep")
			end)
			act("PASS", C.seat[opt.receiver], opt.canPass, 170, function()
				send("pass")
			end)
			act("SKIP", C.grey, skipOk, 120, function()
				send("skip")
			end)
			local rp = a.players[opt.receiver]
			hint = if #rp.team >= a.config.teamSize
				then `{rp.name}'s team is full: keep the rest!`
				else `{rp.name} is out of money: you decide who gets each character`
		elseif opt and a.pending == "incoming" and opt.receiver == me then
			act("ACCEPT", C.green, true, 200, function()
				send("accept")
			end)
			act("SKIP", C.grey, skipOk, 120, function()
				send("skip")
			end)
			hint = "This character was passed to you"
		else
			hint = "Waiting for the other player…"
		end
	end
	text({ Text = hint, Position = UDim2.fromOffset(0, 86), Size = UDim2.new(1, 0, 0, 32), TextColor3 = C.dim, TextSize = 17, FontFace = BODY_MED, Parent = bar })
end

------------------------------------------------------------------ results

local function renderResults()
	clear(resultsPanel)
	local r = state.result
	if not r then
		return
	end
	local title = if r.winner == 0 then "DRAW!" else `{state.seats[r.winner].name} WINS!`
	local head = banner(resultsPanel, title, if r.winner == 0 then Color3.fromRGB(180, 180, 200) elseif r.winner == mySeat then Color3.fromRGB(120, 240, 140) else nil)
	popIn(head)
	local why = if r.decidedBy == "bouts" then `{r.wins[1]}–{r.wins[2]} in bouts`
		elseif r.decidedBy == "total" then `Bouts tied {r.wins[1]}–{r.wins[2]}: total power decides`
		else "Bouts and total power both tied"
	text({ Text = why, Position = UDim2.fromOffset(0, 72), Size = UDim2.new(1, 0, 0, 24), TextColor3 = C.dim, FontFace = BODY_MED, Parent = resultsPanel })
	for i = 1, 2 do
		local sc = r.scores[i]
		text({ Text = `{state.seats[i].name} · total {sc.total} · synergy +{sc.synergy}`, Position = UDim2.new((i - 1) * 0.5, 0, 0, 100), Size = UDim2.new(0.5, 0, 0, 22), TextColor3 = C.seat[i], TextSize = 16, Parent = resultsPanel })
	end

	local scroll = new("ScrollingFrame", { Position = UDim2.fromOffset(24, 132), Size = UDim2.new(1, -48, 1, -214), BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 6, AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), Parent = resultsPanel }, {
		new("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	for n, b in r.bouts do
		local bout = new("Frame", { Size = UDim2.new(1, -10, 0, 96), BackgroundColor3 = C.card, LayoutOrder = n, Visible = false, Parent = scroll }, { corner(14), pad(8) })
		local left = new("Frame", { Size = UDim2.new(0.42, 0, 0, 46), BackgroundTransparency = 1, Parent = bout })
		miniRow(left, b.a, if b.winner == 1 then "WIN" else "", 1, 46)
		text({ Text = "VS", Position = UDim2.fromScale(0.42, 0), Size = UDim2.new(0.16, 0, 0, 46), heading = true, TextSize = 24, TextColor3 = C.gold, Parent = bout })
		local right = new("Frame", { Position = UDim2.fromScale(0.58, 0), Size = UDim2.new(0.42, 0, 0, 46), BackgroundTransparency = 1, Parent = bout })
		miniRow(right, b.b, if b.winner == 2 then "WIN" else "", 1, 46)
		stroke(C.seat[b.winner], 4).Parent = (if b.winner == 1 then left else right):FindFirstChildWhichIsA("Frame")
		text({ Text = b.reason, Position = UDim2.fromOffset(0, 50), Size = UDim2.new(1, 0, 0, 30), TextSize = 14, FontFace = BODY_MED, Parent = bout })
		-- Reveal the bouts one by one.
		task.delay(0.25 + n * 0.35, function()
			if bout.Parent then
				bout.Visible = true
				popIn(bout)
				play("click")
			end
		end)
	end

	local row = new("Frame", { Position = UDim2.new(0, 0, 1, -16), AnchorPoint = Vector2.new(0, 1), Size = UDim2.new(1, 0, 0, 60), BackgroundTransparency = 1, Parent = resultsPanel }, {
		new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 14), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
	})
	if mySeat then
		button({ Text = `REMATCH ⚡{Config.ENERGY.draftCost}`, sheen = true, Size = UDim2.fromOffset(250, 60), BackgroundColor3 = C.green, TextSize = 26, Parent = row }, function()
			send("rematch")
		end)
		button({ Text = "TABLE LOBBY", Size = UDim2.fromOffset(220, 60), BackgroundColor3 = C.purple, TextSize = 24, Parent = row }, function()
			send("lobby")
		end)
	end
	button({ Text = "LEAVE", Size = UDim2.fromOffset(150, 60), BackgroundColor3 = C.red, TextSize = 24, Parent = row }, function()
		send("leave")
	end)
end

------------------------------------------------------------------ energy pill, side menu, shop

local shopDim = new("TextButton", { Text = "", AutoButtonColor = false, Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, Visible = false, ZIndex = 30, Parent = root })
local shop = panel({ Size = UDim2.fromOffset(980, 500), Active = true, ZIndex = 31, Parent = shopDim })
local function openShop()
	shopDim.Visible = true
	popIn(shop)
	play("open")
end
local function closeShop()
	shopDim.Visible = false
end
shopDim.Activated:Connect(closeShop)

local energyPill = button({ Position = UDim2.new(0, 16, 0, 6), AnchorPoint = Vector2.new(0, 0), Size = UDim2.fromOffset(262, 62), BackgroundColor3 = C.panelBot, radius = 31, ZIndex = 20, Parent = root }, openShop)
local energyValue = text({ Text = "⚡ …", Position = UDim2.fromOffset(18, 4), Size = UDim2.new(1, -80, 0, 32), heading = true, TextSize = 28, TextColor3 = C.gold, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, Parent = energyPill })
local energyRefill = text({ Text = "", Position = UDim2.fromOffset(18, 34), Size = UDim2.new(1, -80, 0, 18), FontFace = BODY_MED, TextSize = 13, TextColor3 = C.dim, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, Parent = energyPill })
local plus = text({ Text = "+", Position = UDim2.new(1, -8, 0.5, 0), AnchorPoint = Vector2.new(1, 0.5), Size = UDim2.fromOffset(46, 46), BackgroundColor3 = C.green, BackgroundTransparency = 0, heading = true, TextSize = 34, ZIndex = 21, Parent = energyPill })
corner(23).Parent = plus
stroke(C.ink, 3).Parent = plus

-- Rewarded video ad: watch an ad (paid for by Roblox) for +1 energy.
local adButton = button({
	sheen = true,
	Position = UDim2.new(0, 16 + 262 + 10, 0, 6),
	AnchorPoint = Vector2.new(0, 0),
	Size = UDim2.fromOffset(92, 62),
	BackgroundColor3 = C.green,
	radius = 20,
	ZIndex = 20,
	Visible = Config.AD_REWARD.id ~= 0,
	Parent = root,
}, function()
	send("watchAd")
end)
text({ Text = "📺", Position = UDim2.fromOffset(0, 2), Size = UDim2.new(1, 0, 0, 34), TextSize = 28, ZIndex = 21, Parent = adButton })
text({ Text = `+{Config.AD_REWARD.amount}⚡ FREE`, Position = UDim2.fromOffset(0, 34), Size = UDim2.new(1, 0, 0, 22), heading = true, TextSize = 14, ZIndex = 21, Parent = adButton })

banner(shop, "⚡ ENERGY SHOP", nil, 31)
local shopSub = text({ Text = "", Position = UDim2.fromOffset(40, 70), Size = UDim2.new(1, -80, 0, 44), FontFace = BODY_MED, TextSize = 16, TextColor3 = C.dim, ZIndex = 32, Parent = shop })
closeX(shop, closeShop, 31)
local packRow = new("Frame", { Position = UDim2.fromOffset(0, 150), Size = UDim2.new(1, 0, 0, 300), BackgroundTransparency = 1, ZIndex = 32, Parent = shop }, {
	new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 18), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
})
local PACK_COLORS = { C.blue, C.purple, C.gold }
local HttpService = game:GetService("HttpService")
-- Packs come from the server (ids and prices resolved from the game's developer products).
local function buildPacks()
	clear(packRow)
	local packs = Config.ENERGY_PACKS
	local raw = ReplicatedStorage:GetAttribute("EnergyPacks")
	if type(raw) == "string" then
		local ok, decoded = pcall(function()
			return HttpService:JSONDecode(raw)
		end)
		if ok and type(decoded) == "table" then
			packs = decoded
		end
	end
	for n, pack in packs do
		local live = (pack.id or 0) ~= 0
		local card = new("Frame", { Size = UDim2.fromOffset(210, 290), BackgroundColor3 = Color3.new(1, 1, 1), LayoutOrder = n, ZIndex = 32, Parent = packRow }, {
			corner(22),
			stroke(C.ink, 4),
			new("UIGradient", { Rotation = 90, Color = ColorSequence.new(PACK_COLORS[n] or C.blue, C.panelBot) }),
			pad(14),
		})
		if pack.tag then
			local tag = text({ Text = pack.tag, Position = UDim2.new(0.5, 0, 0, -30), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(140, 28), BackgroundColor3 = C.red, BackgroundTransparency = 0, heading = true, TextSize = 15, ZIndex = 34, Parent = card })
			corner(14).Parent = tag
		end
		text({ Text = pack.name, Size = UDim2.new(1, 0, 0, 30), heading = true, TextSize = 26, ZIndex = 33, Parent = card })
		local big = text({ Text = "⚡" .. pack.amount, Position = UDim2.fromOffset(0, 40), Size = UDim2.new(1, 0, 0, 90), heading = true, TextSize = 64, TextColor3 = C.gold, ZIndex = 33, Parent = card })
		local bob = new("UIScale", { Parent = big })
		task.spawn(function()
			while big.Parent do
				tween(bob, 0.9, { Scale = 1.07 }, Enum.EasingStyle.Sine).Completed:Wait()
				tween(bob, 0.9, { Scale = 1 }, Enum.EasingStyle.Sine).Completed:Wait()
			end
		end)
		text({ Text = `{pack.amount} more drafts`, Position = UDim2.fromOffset(0, 134), Size = UDim2.new(1, 0, 0, 22), TextSize = 16, FontFace = BODY_MED, ZIndex = 33, Parent = card })
		local buy = button({ sheen = live, Text = if live then `R$ {pack.robux}` else "SOON", Position = UDim2.new(0, 0, 1, 0), AnchorPoint = Vector2.new(0, 1), Size = UDim2.new(1, 0, 0, 62), BackgroundColor3 = C.green, TextSize = 28, ZIndex = 33, Parent = card }, function()
			MarketplaceService:PromptProductPurchase(player, pack.id)
		end)
		setEnabled(buy, live)
	end

	-- Bigger Tank: raises the free-energy cap
	local tank = { id = Config.TANK.id, robux = Config.TANK.robux, name = Config.TANK.name, step = Config.TANK.step, cap = Config.TANK.cap }
	local rawTank = ReplicatedStorage:GetAttribute("TankProduct")
	if type(rawTank) == "string" then
		local ok, decoded = pcall(function()
			return HttpService:JSONDecode(rawTank)
		end)
		if ok and type(decoded) == "table" then
			tank = decoded
		end
	end
	local myMax = player:GetAttribute("EnergyMax") or Config.ENERGY.max
	local maxed = myMax >= tank.cap
	local live = (tank.id or 0) ~= 0 and not maxed
	local card = new("Frame", { Size = UDim2.fromOffset(210, 290), BackgroundColor3 = Color3.new(1, 1, 1), LayoutOrder = 99, ZIndex = 32, Parent = packRow }, {
		corner(22),
		stroke(C.ink, 4),
		new("UIGradient", { Rotation = 90, Color = ColorSequence.new(C.green, C.panelBot) }),
		pad(14),
	})
	local tag = text({ Text = "UPGRADE", Position = UDim2.new(0.5, 0, 0, -30), AnchorPoint = Vector2.new(0.5, 0), Size = UDim2.fromOffset(140, 28), BackgroundColor3 = C.green, BackgroundTransparency = 0, heading = true, TextSize = 15, ZIndex = 34, Parent = card })
	corner(14).Parent = tag
	text({ Text = tank.name, Size = UDim2.new(1, 0, 0, 30), heading = true, TextSize = 26, ZIndex = 33, Parent = card })
	text({ Text = if maxed then "MAX" else `{myMax}→{math.min(tank.cap, myMax + tank.step)}`, Position = UDim2.fromOffset(0, 40), Size = UDim2.new(1, 0, 0, 90), heading = true, TextSize = 50, TextColor3 = C.gold, ZIndex = 33, Parent = card })
	text({ Text = if maxed then "Your tank is full size!" else `+{tank.step} max energy, forever`, Position = UDim2.fromOffset(0, 134), Size = UDim2.new(1, 0, 0, 40), TextSize = 15, FontFace = BODY_MED, ZIndex = 33, Parent = card })
	local buyTank = button({ Text = if maxed then "MAXED" elseif live then `R$ {tank.robux}` else "SOON", Position = UDim2.new(0, 0, 1, 0), AnchorPoint = Vector2.new(0, 1), Size = UDim2.new(1, 0, 0, 62), BackgroundColor3 = C.green, TextSize = 28, ZIndex = 33, Parent = card }, function()
		MarketplaceService:PromptProductPurchase(player, tank.id)
	end)
	setEnabled(buyTank, live)
end
buildPacks()
ReplicatedStorage:GetAttributeChangedSignal("EnergyPacks"):Connect(buildPacks)
ReplicatedStorage:GetAttributeChangedSignal("TankProduct"):Connect(buildPacks)
player:GetAttributeChangedSignal("EnergyMax"):Connect(buildPacks)

local openPlayers -- defined below with the players panel
-- Side menu (left edge, outside drafts)
local side = new("Frame", { Position = UDim2.new(0, 16, 0.46, 0), AnchorPoint = Vector2.new(0, 0.5), Size = UDim2.fromOffset(86, 390), BackgroundTransparency = 1, Parent = root }, {
	new("UIListLayout", { Padding = UDim.new(0, 12), VerticalAlignment = Enum.VerticalAlignment.Center }),
})
local sideCount = 0
local function sideButton(icon, label, color, fn)
	sideCount += 1
	local b = button({ Size = UDim2.fromOffset(86, 86), BackgroundColor3 = color, radius = 22, Parent = side }, fn)
	local i = text({ Name = "Icon", Text = icon, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromOffset(43, 30), Size = UDim2.fromOffset(70, 52), TextSize = 40, Parent = b })
	text({ Text = label, Position = UDim2.fromOffset(0, 54), Size = UDim2.new(1, 0, 0, 26), heading = true, TextSize = 17, Parent = b })
	-- Idle wiggle, staggered so the buttons don't move in lockstep
	local phase = sideCount * 0.7
	task.spawn(function()
		task.wait(phase)
		while i.Parent do
			tween(i, 0.6, { Rotation = 8 }, Enum.EasingStyle.Sine).Completed:Wait()
			tween(i, 0.6, { Rotation = -8 }, Enum.EasingStyle.Sine).Completed:Wait()
			tween(i, 0.4, { Rotation = 0 }, Enum.EasingStyle.Sine).Completed:Wait()
			task.wait(2.5)
		end
	end)
	return b, i
end
local render -- forward
sideButton("🏯", "TABLES", C.purple, function()
	browserOpen = true
	if not state then
		play("open")
		render()
		popIn(tablesPanel)
	end
end)
sideButton("⚔", "DUEL", C.red, function()
	openPlayers()
end)
local shopButton = sideButton("⚡", "SHOP", C.gold, openShop)
local shopBadge = text({ Text = "!", AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(1, -6, 0, 6), Size = UDim2.fromOffset(30, 30), BackgroundColor3 = C.red, BackgroundTransparency = 0, heading = true, TextSize = 22, Visible = false, ZIndex = 5, Parent = shopButton })
corner(15).Parent = shopBadge
stroke(Color3.new(1, 1, 1), 2).Parent = shopBadge
local musicIcon
_, musicIcon = sideButton("🎵", "MUSIC", C.blue, function()
	musicOn = not musicOn
	local s = currentMusic and sfx[currentMusic]
	if s then
		tween(s, 0.4, { Volume = if musicOn then 0.32 else 0 })
	end
	musicIcon.Text = if musicOn then "🎵" else "🔇"
end)

local function fmtTime(sec)
	sec = math.max(0, math.floor(sec))
	return string.format("%dh %02dm", sec // 3600, (sec % 3600) // 60)
end
local function fmtClock(sec)
	sec = math.max(0, math.floor(sec))
	return string.format("%d:%02d", sec // 60, sec % 60)
end
local lastEnergy = nil
local function refreshEnergy()
	local e = player:GetAttribute("Energy")
	local cap = player:GetAttribute("EnergyMax") or Config.ENERGY.max
	local progress = player:GetAttribute("EnergyProgress") or 0
	local t = workspace:GetServerTimeNow()
	local night = DayNight.isNight(t)
	local rate = if night then Config.ENERGY.nightMultiplier else 1
	if e and lastEnergy and e > lastEnergy then
		play("bid")
		toast(`+{e - lastEnergy} ⚡ energy!`)
	end
	lastEnergy = e
	energyValue.Text = if e then `⚡ {e}/{cap}` else "⚡ …"
	shopBadge.Visible = e ~= nil and e < Config.ENERGY.draftCost
	energyValue.TextColor3 = if e and e < Config.ENERGY.draftCost then C.red else C.gold
	local next = (1 - progress) * Config.ENERGY.regenSeconds / rate
	local sky = if night then "🌙 night x1.5" else "☀ day"
	energyRefill.Text = if not e then "" elseif e >= cap then `Full · {sky}` else `+1 in {fmtClock(next)} · {sky}`
	shopSub.Text = `You have {e or "…"}/{cap} ⚡. Each draft costs {Config.ENERGY.draftCost}. Energy refills +1 every {Config.ENERGY.regenSeconds // 60} min up to your cap (1.5x faster at night while you play, and it keeps refilling while you're away). Bought energy can go past the cap.`
end
player:GetAttributeChangedSignal("Energy"):Connect(refreshEnergy)
player:GetAttributeChangedSignal("EnergyMax"):Connect(refreshEnergy)
task.spawn(function()
	while true do
		refreshEnergy()
		task.wait(1)
	end
end)

------------------------------------------------------------------ players + duels

local playersDim = new("TextButton", { Text = "", AutoButtonColor = false, Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, Visible = false, ZIndex = 30, Parent = root })
local playersPanel = panel({ Size = UDim2.fromOffset(560, 520), Active = true, ZIndex = 31, Parent = playersDim })
local playersList
local function renderPlayers()
	clear(playersPanel)
	banner(playersPanel, "⚔ CHALLENGE", Color3.fromRGB(255, 120, 120), 31)
	text({ Text = "Send a draft duel to anyone here, or walk up to them and press F", Position = UDim2.fromOffset(20, 64), Size = UDim2.new(1, -40, 0, 22), FontFace = BODY_MED, TextSize = 15, TextColor3 = C.dim, ZIndex = 32, Parent = playersPanel })
	closeX(playersPanel, function()
		playersDim.Visible = false
	end)
	playersList = new("ScrollingFrame", { Position = UDim2.fromOffset(24, 100), Size = UDim2.new(1, -48, 1, -124), BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 6, AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), ZIndex = 32, Parent = playersPanel }, {
		new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.Name }),
	})
	local others = 0
	for _, p in Players:GetPlayers() do
		if p ~= player then
			others += 1
			local row = new("Frame", { Name = p.DisplayName, Size = UDim2.new(1, -8, 0, 60), BackgroundColor3 = C.card, ZIndex = 32, Parent = playersList }, { corner(14), pad(8) })
			text({ Text = p.DisplayName, Size = UDim2.new(1, -150, 1, 0), TextXAlignment = Enum.TextXAlignment.Left, heading = true, TextSize = 22, TextTruncate = Enum.TextTruncate.AtEnd, TextWrapped = false, ZIndex = 33, Parent = row })
			button({ Text = "DUEL", Position = UDim2.new(1, 0, 0.5, 0), AnchorPoint = Vector2.new(1, 0.5), Size = UDim2.fromOffset(130, 44), BackgroundColor3 = C.red, ZIndex = 33, Parent = row }, function()
				send("challenge", { userId = p.UserId })
			end)
		end
	end
	if others == 0 then
		text({ Text = "Nobody else is here yet.\nJoin a table and play a bot while you wait!", Size = UDim2.new(1, 0, 0, 80), TextColor3 = C.dim, FontFace = BODY_MED, ZIndex = 33, Parent = playersList })
	end
end
playersDim.Activated:Connect(function()
	playersDim.Visible = false
end)
openPlayers = function()
	renderPlayers()
	playersDim.Visible = true
	popIn(playersPanel)
	play("open")
end
Players.PlayerAdded:Connect(function()
	if playersDim.Visible then
		renderPlayers()
	end
end)
Players.PlayerRemoving:Connect(function()
	task.defer(function()
		if playersDim.Visible then
			renderPlayers()
		end
	end)
end)

-- Incoming challenge popup
local duelBox = panel({ Size = UDim2.fromOffset(520, 200), Position = UDim2.new(0.5, 0, 0, 90), AnchorPoint = Vector2.new(0.5, 0), Visible = false, ZIndex = 50, Parent = root })
local duelToken = 0
DuelEvent.OnClientEvent:Connect(function(req)
	duelToken += 1
	local my = duelToken
	clear(duelBox)
	banner(duelBox, "⚔ DUEL!", Color3.fromRGB(255, 120, 120), 50)
	local line = text({ Text = `{req.name} challenges you to a draft!`, Position = UDim2.fromOffset(20, 56), Size = UDim2.new(1, -40, 0, 30), TextSize = 20, ZIndex = 51, Parent = duelBox })
	local row = new("Frame", { Position = UDim2.new(0, 0, 1, -18), AnchorPoint = Vector2.new(0, 1), Size = UDim2.new(1, 0, 0, 58), BackgroundTransparency = 1, ZIndex = 51, Parent = duelBox }, {
		new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 14), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
	})
	local function reply(accept)
		duelBox.Visible = false
		send("duelReply", { from = req.from, accept = accept })
	end
	button({ Text = "ACCEPT", sheen = true, Size = UDim2.fromOffset(190, 58), BackgroundColor3 = C.green, TextSize = 26, ZIndex = 52, Parent = row }, function()
		reply(true)
	end)
	button({ Text = "DECLINE", Size = UDim2.fromOffset(190, 58), BackgroundColor3 = C.grey, TextSize = 26, ZIndex = 52, Parent = row }, function()
		reply(false)
	end)
	duelBox.Visible = true
	popIn(duelBox)
	play("notify")
	task.spawn(function()
		for left = req.timeout or 20, 1, -1 do
			if my ~= duelToken or not duelBox.Visible then
				return
			end
			line.Text = `{req.name} challenges you to a draft! ({left}s)`
			task.wait(1)
		end
		if my == duelToken and duelBox.Visible then
			duelBox.Visible = false
		end
	end)
end)

-- Hide the "Challenge" prompt on your own character.
local function hideOwnPrompt(char)
	local root = char:WaitForChild("HumanoidRootPart", 10)
	local prompt = root and root:WaitForChild("DuelPrompt", 10)
	if prompt then
		prompt.Enabled = false
	end
end
player.CharacterAdded:Connect(hideOwnPrompt)
if player.Character then
	task.spawn(hideOwnPrompt, player.Character)
end

------------------------------------------------------------------ background blur behind popups

local blur = Instance.new("BlurEffect")
blur.Name = "AnimeDraftUIBlur"
blur.Size = 0
blur.Parent = game:GetService("Lighting")
local blurOn = false
RunService.Heartbeat:Connect(function()
	local want = shopDim.Visible or playersDim.Visible or tablesPanel.Visible or resultsPanel.Visible
	if want ~= blurOn then
		blurOn = want
		tween(blur, 0.3, { Size = if want then 14 else 0 })
	end
end)

------------------------------------------------------------------ state + routing

local lastMode = nil
render = function()
	mySeat = nil
	if state then
		for i = 1, 2 do
			if state.seats[i].kind == "player" and state.seats[i].userId == player.UserId then
				mySeat = i
			end
		end
	end
	local mode = if state then state.mode else "browse"
	local changed = mode ~= lastMode
	lastMode = mode
	if changed then
		shownLot, shownOutcome, shownBid = nil, nil, nil
		clear(cardHolder)
	end

	tablesPanel.Visible = mode == "browse" and browserOpen
	lobbyPanel.Visible = mode == "lobby"
	draftLayer.Visible = mode == "draft"
	resultsPanel.Visible = mode == "results"
	side.Visible = mode == "browse"
	-- At a table the screen belongs to the game: no player list or "join table" prompts on top.
	core(Enum.CoreGuiType.PlayerList, mode == "browse" and not tablesPanel.Visible)
	ProximityPromptService.Enabled = mode == "browse"
	setMusic(if mode == "draft" then "draftMusic" else "lobbyMusic")

	if mode == "browse" then
		if tablesPanel.Visible then
			renderTables()
		end
	elseif mode == "lobby" then
		renderLobby()
	elseif mode == "draft" then
		renderDraft()
	else
		renderResults()
	end
	if changed then
		local p = ({ browse = tablesPanel, lobby = lobbyPanel, results = resultsPanel })[mode]
		if p and p.Visible then
			popIn(p)
			play("open")
		end
	end
end

StateEvent.OnClientEvent:Connect(function(snap)
	state = snap
	render()
end)
TablesEvent.OnClientEvent:Connect(function(list)
	tables = list
	if not state and tablesPanel.Visible then
		renderTables()
	end
end)
ToastEvent.OnClientEvent:Connect(function(msg, kind)
	toast(msg)
	if kind == "shop" then
		openShop()
	elseif kind == "win" then
		play("victory")
	elseif kind == "lose" then
		play("defeat")
	else
		play("notify")
	end
end)

-- Seated players' energy shows in the table lobby.
local watched = {}
local function watch(p)
	if watched[p] then
		return
	end
	watched[p] = true
	p:GetAttributeChangedSignal("Energy"):Connect(function()
		if state and state.mode == "lobby" then
			renderLobby()
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

task.spawn(function()
	local ok, res = pcall(function()
		return GetState:InvokeServer()
	end)
	if ok and res then
		tables = res.tables or tables
		if res.state and not state then
			state = res.state
		end
	end
	render()
end)

RunService.RenderStepped:Connect(function()
	if not (state and state.mode == "draft" and timerBar and timerText and state.deadline) then
		return
	end
	local a = state.auction
	local total = a.config.timer + (if a.lot and #a.lot.history == 0 then 4 else 0)
	local left = math.max(0, state.deadline - workspace:GetServerTimeNow())
	timerBar.Size = UDim2.fromScale(math.clamp(left / total, 0, 1), 1)
	timerBar.BackgroundColor3 = if left < 2.5 then C.red else C.gold
	timerText.Text = if left < 2.5 then string.format("Going, going… %.1fs", left) else string.format("Hammer in %.1fs", left)
end)
