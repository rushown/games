--!nonstrict
-- Builds the auction hall at runtime (so the place file needs no hand-made parts) and keeps its
-- big screen and podium signs in sync with the draft.
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Battle = require(Shared.Battle)

local Arena = {}

local folder: Folder
local screenLabels: any = {}
local podiumLabels: { TextLabel } = {}
local podiumLights: { PointLight } = {}

local SEAT_COLORS = { Color3.fromRGB(255, 90, 95), Color3.fromRGB(80, 160, 255) }

local function part(props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do
		(p :: any)[k] = v
	end
	p.Parent = folder
	return p
end

local function label(parent: Instance, props: { [string]: any }): TextLabel
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.TextColor3 = Color3.new(1, 1, 1)
	l.Font = Enum.Font.GothamBlack
	l.TextScaled = true
	for k, v in props do
		(l :: any)[k] = v
	end
	l.Parent = parent
	return l
end

function Arena.build()
	-- The hall has its own floor; drop the template baseplate if the place has one.
	local old = workspace:FindFirstChild("Baseplate")
	if old then
		old:Destroy()
	end
	folder = Instance.new("Folder")
	folder.Name = "AuctionHall"
	folder.Parent = workspace

	Lighting.ClockTime = 19.5
	Lighting.Brightness = 2
	Lighting.Ambient = Color3.fromRGB(70, 60, 90)
	Lighting.OutdoorAmbient = Color3.fromRGB(90, 80, 120)
	local atmo = Instance.new("Atmosphere")
	atmo.Density = 0.3
	atmo.Color = Color3.fromRGB(200, 170, 255)
	atmo.Decay = Color3.fromRGB(80, 40, 120)
	atmo.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.6
	bloom.Threshold = 1.4
	bloom.Parent = Lighting

	-- Floor and stage
	part({ Name = "Floor", Size = Vector3.new(160, 2, 160), Position = Vector3.new(0, -1, 0), Color = Color3.fromRGB(28, 22, 40), Material = Enum.Material.SmoothPlastic })
	part({ Name = "Stage", Size = Vector3.new(70, 3, 26), Position = Vector3.new(0, 1.5, -40), Color = Color3.fromRGB(55, 30, 80), Material = Enum.Material.Marble })
	part({ Name = "StageTrim", Size = Vector3.new(71, 0.4, 0.6), Position = Vector3.new(0, 3.1, -27), Color = Color3.fromRGB(255, 200, 60), Material = Enum.Material.Neon })

	-- Walls
	for _, w in { { Vector3.new(160, 40, 2), Vector3.new(0, 20, -80) }, { Vector3.new(160, 40, 2), Vector3.new(0, 20, 80) }, { Vector3.new(2, 40, 160), Vector3.new(-80, 20, 0) }, { Vector3.new(2, 40, 160), Vector3.new(80, 20, 0) } } do
		part({ Size = w[1], Position = w[2], Color = Color3.fromRGB(20, 16, 32), Material = Enum.Material.Fabric })
	end

	-- Spawn facing the stage
	local spawn = Instance.new("SpawnLocation")
	spawn.Anchored = true
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.Position = Vector3.new(0, 0.5, 30)
	spawn.Color = Color3.fromRGB(60, 45, 90)
	spawn.Material = Enum.Material.Neon
	spawn.Transparency = 0.6
	spawn.Neutral = true
	spawn.Parent = folder

	-- Big screen
	local screen = part({ Name = "Screen", Size = Vector3.new(44, 24, 1), Position = Vector3.new(0, 18, -50), Color = Color3.fromRGB(10, 10, 16), Material = Enum.Material.SmoothPlastic })
	part({ Size = Vector3.new(46, 26, 0.6), Position = Vector3.new(0, 18, -50.6), Color = Color3.fromRGB(255, 200, 60), Material = Enum.Material.Neon })
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.CanvasSize = Vector2.new(1100, 600)
	sg.LightInfluence = 0
	sg.Brightness = 1.4
	sg.Parent = screen
	local bg = Instance.new("Frame")
	bg.Size = UDim2.fromScale(1, 1)
	bg.BorderSizePixel = 0
	bg.BackgroundColor3 = Color3.new(1, 1, 1)
	bg.Parent = sg
	local grad = Instance.new("UIGradient")
	grad.Rotation = 35
	grad.Parent = bg
	local shade = Instance.new("Frame")
	shade.Size = UDim2.fromScale(1, 1)
	shade.BackgroundColor3 = Color3.new(0, 0, 0)
	shade.BackgroundTransparency = 0.45
	shade.BorderSizePixel = 0
	shade.Parent = bg
	screenLabels = {
		bg = bg,
		grad = grad,
		top = label(bg, { Size = UDim2.new(1, -60, 0, 50), Position = UDim2.fromOffset(30, 20), TextXAlignment = Enum.TextXAlignment.Left, Font = Enum.Font.GothamBold }),
		initials = label(bg, { Size = UDim2.fromOffset(260, 260), Position = UDim2.fromOffset(40, 110), TextTransparency = 0.1 }),
		name = label(bg, { Size = UDim2.new(1, -360, 0, 110), Position = UDim2.fromOffset(330, 110), TextXAlignment = Enum.TextXAlignment.Left }),
		title = label(bg, { Size = UDim2.new(1, -360, 0, 50), Position = UDim2.fromOffset(330, 225), TextXAlignment = Enum.TextXAlignment.Left, Font = Enum.Font.GothamMedium }),
		tier = label(bg, { Size = UDim2.new(1, -360, 0, 50), Position = UDim2.fromOffset(330, 285), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(255, 220, 90) }),
		bid = label(bg, { Size = UDim2.new(1, -60, 0, 110), Position = UDim2.fromOffset(30, 440), Font = Enum.Font.GothamBlack }),
	}

	-- Podiums (one per seat)
	for i = 1, 2 do
		local x = if i == 1 then -16 else 16
		local color = SEAT_COLORS[i]
		part({ Name = "Podium" .. i, Size = Vector3.new(8, 5, 5), Position = Vector3.new(x, 5.5, -34), Color = Color3.fromRGB(35, 28, 50), Material = Enum.Material.Marble })
		local top = part({ Size = Vector3.new(8.4, 0.4, 5.4), Position = Vector3.new(x, 8.2, -34), Color = color, Material = Enum.Material.Neon })
		local light = Instance.new("PointLight")
		light.Color = color
		light.Range = 18
		light.Brightness = 1
		light.Parent = top
		podiumLights[i] = light
		local bb = Instance.new("BillboardGui")
		bb.Size = UDim2.fromOffset(260, 70)
		bb.StudsOffset = Vector3.new(0, 4, 0)
		bb.AlwaysOnTop = false
		bb.MaxDistance = 140
		bb.Parent = top
		podiumLabels[i] = label(bb, { Size = UDim2.fromScale(1, 1), TextColor3 = color, TextStrokeTransparency = 0.3 })
	end
end

function Arena.show(snap)
	if not folder then
		return
	end
	local L = screenLabels
	for i = 1, 2 do
		local seat = snap.seats[i]
		local extra = ""
		if snap.auction then
			local p = snap.auction.players[i]
			extra = `\n${p.budget} · {#p.team}/{snap.auction.config.teamSize}`
		end
		podiumLabels[i].Text = seat.name .. extra
		podiumLights[i].Brightness = if snap.auction and snap.auction.lot and snap.auction.lot.leader == i then 4 else 1
	end

	local a = snap.auction
	if snap.mode == "draft" and a and a.lot then
		local c = Data.get(a.lot.key)
		local s = Data.SERIES[c.series]
		L.grad.Color = ColorSequence.new(s.c1, s.c2)
		L.top.Text = `LOT {a.lotNo} · {s.name}`
		L.initials.Text = c.initials
		L.name.Text = c.name
		L.title.Text = c.title
		L.tier.Text = `{Battle.tierLabel(c.tier)} TIER · {c.rating} · {Battle.scalingLine(c)}`
		if a.phase == "auction" then
			L.bid.Text = if a.lot.leader then `${a.lot.bid} — {a.players[a.lot.leader].name}` else "NO BIDS YET"
		else
			L.bid.Text = `{a.players[a.chooser].name} decides: KEEP or PASS`
		end
	else
		L.grad.Color = ColorSequence.new(Color3.fromRGB(120, 60, 200), Color3.fromRGB(255, 90, 140))
		L.initials.Text = "AD"
		L.name.Text = "ANIME DRAFT"
		L.title.Text = "Draft Duel auction"
		L.tier.Text = `{#Data.CHARACTERS} characters · teams of 5 · one skip each`
		if snap.mode == "results" and snap.result then
			local w = snap.result.winner
			L.top.Text = "RESULTS"
			L.bid.Text = if w == 0 then "DRAW!" else `{snap.seats[w].name} WINS!`
		else
			L.top.Text = "LOBBY"
			L.bid.Text = "TAKE A SEAT TO PLAY"
		end
	end
end

return Arena
