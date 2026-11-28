--!nonstrict
-- Builds the map at runtime: a twilight shrine plaza with a giant sakura in the middle and a ring of
-- torii-framed draft stages, each with two podiums and a big screen showing that table's draft.
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Data = require(Shared.Data)
local Battle = require(Shared.Battle)
local DayNight = require(Shared.DayNight)
local RunService = game:GetService("RunService")

local Arena = {}

local folder: Folder
local screens = {} -- [tableId] = labels
local SEAT_COLORS = { Color3.fromRGB(255, 84, 112), Color3.fromRGB(70, 170, 255) }
local RED = Color3.fromRGB(200, 40, 40)
local WOOD = Color3.fromRGB(110, 70, 45)
local DARK_WOOD = Color3.fromRGB(60, 38, 28)
local STONE = Color3.fromRGB(150, 145, 150)
local PINK = Color3.fromRGB(255, 170, 205)
local PETAL_TEX = "rbxasset://textures/particles/sparkles_main.dds"

local rng = Random.new(7)

local function part(props, parent: Instance?): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = Enum.Material.SmoothPlastic
	for k, v in props do
		p[k] = v
	end
	p.Parent = parent or folder
	return p
end

local function ball(cf: CFrame, size: number, color: Color3, material, parent)
	return part({ Shape = Enum.PartType.Ball, Size = Vector3.one * size, CFrame = cf, Color = color, Material = material or Enum.Material.SmoothPlastic, CanCollide = false, CastShadow = false }, parent)
end

local function cylinder(cf: CFrame, length: number, diameter: number, color: Color3, material, parent)
	-- Cylinders run along X, so rotate them to stand upright.
	return part({ Shape = Enum.PartType.Cylinder, Size = Vector3.new(length, diameter, diameter), CFrame = cf * CFrame.Angles(0, 0, math.rad(90)), Color = color, Material = material or Enum.Material.Wood }, parent)
end

local function label(parent: Instance, props): TextLabel
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.TextColor3 = Color3.new(1, 1, 1)
	l.FontFace = Font.fromEnum(Enum.Font.FredokaOne)
	l.TextScaled = true
	for k, v in props do
		l[k] = v
	end
	l.Parent = parent
	return l
end

local function light(parent: Instance, color: Color3, range: number, brightness: number)
	local l = Instance.new("PointLight")
	l.Color = color
	l.Range = range
	l.Brightness = brightness
	l.Shadows = false
	l.Parent = parent
	return l
end

local function petals(parent: BasePart, rate: number)
	local e = Instance.new("ParticleEmitter")
	e.Texture = PETAL_TEX
	e.Color = ColorSequence.new(Color3.fromRGB(255, 190, 215), Color3.fromRGB(255, 140, 185))
	e.Size = NumberSequence.new(0.35, 0.2)
	e.Lifetime = NumberRange.new(5, 8)
	e.Rate = rate
	e.Speed = NumberRange.new(1, 3)
	e.SpreadAngle = Vector2.new(180, 180)
	e.Acceleration = Vector3.new(1.5, -1.2, 0.6)
	e.Rotation = NumberRange.new(0, 360)
	e.RotSpeed = NumberRange.new(-90, 90)
	e.LightEmission = 0.3
	e.Parent = parent
end

------------------------------------------------------------------ scenery pieces

local function sakura(pos: Vector3, scale: number)
	local m = Instance.new("Model")
	m.Name = "Sakura"
	m.Parent = folder
	local h = 14 * scale
	cylinder(CFrame.new(pos + Vector3.new(0, h / 2, 0)), h, 2.2 * scale, DARK_WOOD, Enum.Material.Wood, m)
	for i = 1, 3 do
		local a = math.rad(i * 120 + rng:NextNumber(-20, 20))
		local dir = Vector3.new(math.cos(a), 0.8, math.sin(a)).Unit
		local base = pos + Vector3.new(0, h * 0.75, 0)
		local tip = base + dir * 6 * scale
		local mid = (base + tip) / 2
		part({ Size = Vector3.new(1.1 * scale, 1.1 * scale, (tip - base).Magnitude), CFrame = CFrame.lookAt(mid, tip), Color = DARK_WOOD, Material = Enum.Material.Wood }, m)
		ball(CFrame.new(tip + Vector3.new(0, 1.5 * scale, 0)), rng:NextNumber(8, 10) * scale, PINK:Lerp(Color3.new(1, 1, 1), rng:NextNumber(0, 0.3)), Enum.Material.Plastic, m)
	end
	local crown = ball(CFrame.new(pos + Vector3.new(0, h + 3 * scale, 0)), 12 * scale, PINK, Enum.Material.Plastic, m)
	petals(crown, 2 * scale)
	return m
end

local function pine(pos: Vector3, scale: number)
	local m = Instance.new("Model")
	m.Name = "Pine"
	m.Parent = folder
	cylinder(CFrame.new(pos + Vector3.new(0, 3 * scale, 0)), 6 * scale, 1.6 * scale, DARK_WOOD, Enum.Material.Wood, m)
	for i = 0, 2 do
		local s = (9 - i * 2.5) * scale
		part({
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(s, s * 0.8, s),
			CFrame = CFrame.new(pos + Vector3.new(0, (6 + i * 3.6) * scale, 0)),
			Color = Color3.fromRGB(40, 95 + i * 10, 70),
			Material = Enum.Material.Grass,
			CastShadow = false,
		}, m)
	end
end

local function lantern(pos: Vector3, tall: boolean)
	local h = if tall then 6 else 3.5
	part({ Size = Vector3.new(1.6, 0.6, 1.6), Position = pos + Vector3.new(0, 0.3, 0), Color = STONE, Material = Enum.Material.Slate })
	part({ Size = Vector3.new(0.7, h, 0.7), Position = pos + Vector3.new(0, h / 2, 0), Color = STONE, Material = Enum.Material.Slate })
	local glow = part({ Size = Vector3.new(1.6, 1.4, 1.6), Position = pos + Vector3.new(0, h + 0.7, 0), Color = Color3.fromRGB(255, 190, 110), Material = Enum.Material.Neon })
	part({ Size = Vector3.new(2.6, 0.5, 2.6), Position = pos + Vector3.new(0, h + 1.65, 0), Color = STONE, Material = Enum.Material.Slate })
	light(glow, Color3.fromRGB(255, 170, 90), 16, 1.2)
end

local function torii(cf: CFrame, width: number, height: number)
	for _, x in { -width / 2, width / 2 } do
		cylinder(cf * CFrame.new(x, height / 2, 0), height, 2.2, RED, Enum.Material.SmoothPlastic)
		part({ Size = Vector3.new(3, 1.2, 3), CFrame = cf * CFrame.new(x, 0.6, 0), Color = Color3.fromRGB(30, 30, 30) })
	end
	part({ Size = Vector3.new(width + 8, 1.6, 3), CFrame = cf * CFrame.new(0, height + 0.8, 0), Color = Color3.fromRGB(25, 20, 20) })
	part({ Size = Vector3.new(width + 6, 1.4, 2.4), CFrame = cf * CFrame.new(0, height - 0.6, 0), Color = RED })
	part({ Size = Vector3.new(width + 2, 1.2, 1.8), CFrame = cf * CFrame.new(0, height - 4, 0), Color = RED })
end

local function stonePath(from: Vector3, to: Vector3)
	local d = (to - from)
	local n = math.floor(d.Magnitude / 4.5)
	for i = 0, n do
		local p = from + d * (i / n)
		part({
			Size = Vector3.new(rng:NextNumber(3.2, 4.2), 0.4, rng:NextNumber(3.2, 4.2)),
			CFrame = CFrame.new(p + Vector3.new(0, 0.2, 0)) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0),
			Color = STONE:Lerp(Color3.new(1, 1, 1), rng:NextNumber(0, 0.15)),
			Material = Enum.Material.Slate,
		})
	end
end

------------------------------------------------------------------ a draft stage

local function screenGui(screen: BasePart)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.CanvasSize = Vector2.new(1100, 620)
	sg.LightInfluence = 0
	sg.Brightness = 1.3
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
	return {
		grad = grad,
		top = label(bg, { Size = UDim2.new(1, -60, 0, 56), Position = UDim2.fromOffset(30, 18), TextXAlignment = Enum.TextXAlignment.Left }),
		initials = label(bg, { Size = UDim2.fromOffset(260, 260), Position = UDim2.fromOffset(40, 100), TextTransparency = 0.1 }),
		name = label(bg, { Size = UDim2.new(1, -360, 0, 120), Position = UDim2.fromOffset(330, 100) , TextXAlignment = Enum.TextXAlignment.Left }),
		title = label(bg, { Size = UDim2.new(1, -360, 0, 54), Position = UDim2.fromOffset(330, 225), TextXAlignment = Enum.TextXAlignment.Left }),
		tier = label(bg, { Size = UDim2.new(1, -360, 0, 50), Position = UDim2.fromOffset(330, 290), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(255, 220, 90) }),
		bid = label(bg, { Size = UDim2.new(1, -60, 0, 120), Position = UDim2.fromOffset(30, 450) }),
		podium = {},
		lights = {},
	}
end

local function stage(id: number, cf: CFrame)
	-- `cf` sits at the front of the stage, looking toward the plaza (its LookVector).
	local model = Instance.new("Model")
	model.Name = "Table" .. id
	model.Parent = folder

	part({ Size = Vector3.new(40, 2, 22), CFrame = cf * CFrame.new(0, 1, 10), Color = WOOD, Material = Enum.Material.WoodPlanks }, model)
	part({ Size = Vector3.new(40.6, 0.3, 22.6), CFrame = cf * CFrame.new(0, 2.05, 10), Color = Color3.fromRGB(255, 205, 90), Material = Enum.Material.Neon, Transparency = 0.6, CanCollide = false }, model)
	for i = 0, 2 do -- steps up from the plaza side
		part({ Size = Vector3.new(14, 0.66 * (i + 1), 1.4), CFrame = cf * CFrame.new(0, 0.33 * (i + 1), -1.2 - (2 - i) * 1.4), Color = WOOD, Material = Enum.Material.WoodPlanks }, model)
	end

	-- Screen inside a torii gate
	local screen = part({ Size = Vector3.new(34, 19, 1), CFrame = cf * CFrame.new(0, 14, 19.5), Color = Color3.fromRGB(10, 10, 16) }, model)
	part({ Size = Vector3.new(35.4, 20.4, 0.6), CFrame = cf * CFrame.new(0, 14, 20.1), Color = Color3.fromRGB(255, 200, 70), Material = Enum.Material.Neon }, model)
	torii(cf * CFrame.new(0, 2, 20.5), 40, 26)
	local L = screenGui(screen)

	-- Table number sign on top of the gate
	local sign = part({ Size = Vector3.new(8, 4, 0.6), CFrame = cf * CFrame.new(0, 26.2, 19), Color = Color3.fromRGB(25, 20, 20) }, model)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.CanvasSize = Vector2.new(200, 100)
	sg.LightInfluence = 0
	sg.Parent = sign
	label(sg, { Size = UDim2.fromScale(1, 1), Text = "卓 " .. id, TextColor3 = Color3.fromRGB(255, 215, 120) })

	-- Podiums
	for i = 1, 2 do
		local x = if i == 1 then -9 else 9
		part({ Size = Vector3.new(7, 4, 4), CFrame = cf * CFrame.new(x, 4, 8), Color = Color3.fromRGB(40, 30, 50), Material = Enum.Material.Marble }, model)
		local top = part({ Size = Vector3.new(7.4, 0.4, 4.4), CFrame = cf * CFrame.new(x, 6.2, 8), Color = SEAT_COLORS[i], Material = Enum.Material.Neon }, model)
		L.lights[i] = light(top, SEAT_COLORS[i], 16, 1)
		local bb = Instance.new("BillboardGui")
		bb.Size = UDim2.fromScale(9, 2.4) -- studs, so it shrinks with distance like a real sign
		bb.StudsOffset = Vector3.new(0, 3, 0)
		bb.MaxDistance = 70
		bb.LightInfluence = 0
		bb.Parent = top
		L.podium[i] = label(bb, { Size = UDim2.fromScale(1, 1), TextColor3 = SEAT_COLORS[i], TextStrokeTransparency = 0.2 })
	end

	-- Join prompt at the foot of the steps
	local post = part({ Size = Vector3.new(1, 4, 1), CFrame = cf * CFrame.new(-8.5, 2, -3), Color = DARK_WOOD, Material = Enum.Material.Wood }, model)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Join table"
	prompt.ObjectText = "Draft table " .. id
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 14
	prompt.RequiresLineOfSight = false
	prompt.Parent = post

	lantern((cf * CFrame.new(-22, 0, 0)).Position, true)
	lantern((cf * CFrame.new(22, 0, 0)).Position, true)

	screens[id] = L
	return {
		prompt = prompt,
		-- Where joining players appear: in front of the steps, facing the screen.
		stand = CFrame.lookAt((cf * CFrame.new(rng:NextNumber(-4, 4), 3, -9)).Position, (cf * CFrame.new(0, 3, 20)).Position),
	}
end

------------------------------------------------------------------ build

function Arena.build(count: number)
	local old = workspace:FindFirstChild("Baseplate")
	if old then
		old:Destroy()
	end
	folder = Instance.new("Folder")
	folder.Name = "Map"
	folder.Parent = workspace

	-- Lighting follows the shared day/night clock (see Arena.runSky)
	Lighting.GeographicLatitude = 30
	Lighting.Brightness = 3
	Lighting.Ambient = Color3.fromRGB(110, 100, 130)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 140, 170)
	local sky = Instance.new("Sky")
	sky.SunAngularSize = 18
	sky.MoonAngularSize = 14
	sky.StarCount = 3000
	sky.Parent = Lighting
	Lighting.EnvironmentDiffuseScale = 0.5
	Lighting.EnvironmentSpecularScale = 0.5
	pcall(function()
		Lighting.Technology = Enum.Technology.Future
	end)
	local function fx(class, props)
		local e = Instance.new(class)
		for k, v in props do
			e[k] = v
		end
		e.Parent = Lighting
	end
	fx("Atmosphere", { Density = 0.28, Offset = 0.1, Color = Color3.fromRGB(205, 215, 255), Decay = Color3.fromRGB(120, 110, 170), Glare = 0.3, Haze = 1.2 })
	fx("BloomEffect", { Intensity = 0.7, Size = 30, Threshold = 1.2 })
	fx("ColorCorrectionEffect", { Saturation = 0.2, Contrast = 0.06, TintColor = Color3.fromRGB(255, 248, 252) })
	fx("SunRaysEffect", { Intensity = 0.06, Spread = 0.6 })

	-- Ground, pond and mountains (terrain)
	local terrain = workspace.Terrain
	terrain:FillBlock(CFrame.new(0, -6, 0), Vector3.new(640, 12, 640), Enum.Material.Grass)
	-- Koi pond halfway between the last two stages, clear of their paths
	local pa = ((count - 0.5) / count) * math.pi * 2 + math.pi / 2
	local pondCf = CFrame.lookAt(Vector3.new(math.cos(pa) * 48, 0, math.sin(pa) * 48), Vector3.zero)
	terrain:FillBlock(pondCf * CFrame.new(0, -6.5, 0), Vector3.new(26, 1, 16), Enum.Material.Sand)
	terrain:FillBlock(pondCf * CFrame.new(0, -3, 0), Vector3.new(22, 6, 12), Enum.Material.Water)
	terrain.WaterColor = Color3.fromRGB(70, 140, 170)
	terrain.WaterTransparency = 0.6
	for i = 1, 14 do
		local a = (i / 14) * math.pi * 2 + rng:NextNumber(-0.15, 0.15)
		local r = rng:NextNumber(250, 290)
		local size = rng:NextNumber(70, 120)
		local c = Vector3.new(math.cos(a) * r, size * 0.15, math.sin(a) * r)
		terrain:FillBall(c, size * 0.6, Enum.Material.Rock)
		terrain:FillBall(c + Vector3.new(0, size * 0.45, 0), size * 0.22, Enum.Material.Snow)
	end

	-- Central plaza with the giant sakura
	part({ Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.6, 64, 64), CFrame = CFrame.new(0, 0.3, 0) * CFrame.Angles(0, 0, math.rad(90)), Color = Color3.fromRGB(170, 165, 170), Material = Enum.Material.Slate })
	part({ Shape = Enum.PartType.Cylinder, Size = Vector3.new(1.4, 14, 14), CFrame = CFrame.new(0, 0.7, 0) * CFrame.Angles(0, 0, math.rad(90)), Color = STONE, Material = Enum.Material.Cobblestone })
	sakura(Vector3.new(0, 1.4, 0), 1.8)
	for i = 1, 8 do
		local a = (i / 8) * math.pi * 2
		lantern(Vector3.new(math.cos(a) * 26, 0.6, math.sin(a) * 26), false)
	end

	local spawn = Instance.new("SpawnLocation")
	spawn.Anchored = true
	spawn.Size = Vector3.new(10, 0.4, 10)
	spawn.CFrame = CFrame.new(0, 0.8, 18)
	spawn.Color = Color3.fromRGB(255, 180, 210)
	spawn.Material = Enum.Material.Neon
	spawn.Transparency = 0.7
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Parent = folder

	-- Stages in a ring, each facing the plaza
	local stations = {}
	local R = 82
	for i = 1, count do
		local a = (i / count) * math.pi * 2 + math.pi / 2
		local pos = Vector3.new(math.cos(a) * R, 0, math.sin(a) * R)
		local cf = CFrame.lookAt(pos, Vector3.new(0, 0, 0))
		stations[i] = stage(i, cf)
		stonePath(Vector3.new(math.cos(a) * 32, 0, math.sin(a) * 32), (cf * CFrame.new(0, 0, -7)).Position)
	end

	-- Outer ring of trees
	for i = 1, 44 do
		local a = (i / 44) * math.pi * 2 + rng:NextNumber(-0.05, 0.05)
		local r = rng:NextNumber(128, 175)
		local pos = Vector3.new(math.cos(a) * r, 0, math.sin(a) * r)
		if i % 3 == 0 then
			sakura(pos, rng:NextNumber(0.9, 1.3))
		else
			pine(pos, rng:NextNumber(1.1, 1.8))
		end
	end
	-- A few sakura between stages
	for i = 1, count do
		local a = ((i + 0.5) / count) * math.pi * 2 + math.pi / 2
		sakura(Vector3.new(math.cos(a) * 70, 0, math.sin(a) * 70), 1.1)
	end

	-- Fireflies over the plaza
	local glowArea = part({ Size = Vector3.new(220, 1, 220), Position = Vector3.new(0, 8, 0), Transparency = 1, CanCollide = false, CanQuery = false, CanTouch = false })
	local flies = Instance.new("ParticleEmitter")
	flies.Texture = PETAL_TEX
	flies.Color = ColorSequence.new(Color3.fromRGB(255, 240, 150))
	flies.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(0.5, 0.35), NumberSequenceKeypoint.new(1, 0) })
	flies.Lifetime = NumberRange.new(4, 7)
	flies.Rate = 14
	flies.Speed = NumberRange.new(0.5, 1.5)
	flies.SpreadAngle = Vector2.new(180, 180)
	flies.LightEmission = 1
	flies.Parent = glowArea

	-- Boundary: a low stone wall around the playable area, with an invisible wall above it.
	local B = 122
	local N = 40
	for i = 1, N do
		local a = (i / N) * math.pi * 2
		local p = Vector3.new(math.cos(a) * B, 0, math.sin(a) * B)
		local cf = CFrame.lookAt(p, Vector3.zero)
		local len = 2 * math.pi * B / N + 1
		part({ Size = Vector3.new(len, 3, 2), CFrame = cf * CFrame.new(0, 1.5, 0), Color = STONE, Material = Enum.Material.Slate })
		part({ Size = Vector3.new(len, 120, 2), CFrame = cf * CFrame.new(0, 63, 0), Transparency = 1, CanQuery = false, CastShadow = false })
	end
	-- Lid so nobody can climb out over the top
	part({ Size = Vector3.new(2 * B + 10, 2, 2 * B + 10), Position = Vector3.new(0, 124, 0), Transparency = 1, CanQuery = false, CastShadow = false })

	return { tables = stations, spawn = CFrame.new(0, 4, 18) }
end

------------------------------------------------------------------ day / night

-- Drives Lighting from the shared clock; it replicates to every client.
function Arena.runSky()
	local nightFlag = nil
	RunService.Heartbeat:Connect(function()
		local t = workspace:GetServerTimeNow()
		Lighting.ClockTime = DayNight.clockTime(t)
		local night = DayNight.isNight(t)
		if night ~= nightFlag then
			nightFlag = night
			workspace:SetAttribute("Night", night)
			-- Lanterns glow brighter at night.
			for _, l in folder:GetDescendants() do
				if l:IsA("PointLight") then
					l.Brightness = if night then 2.2 else 0.8
				end
			end
		end
	end)
end

------------------------------------------------------------------ live screens

function Arena.show(id: number, snap)
	local L = screens[id]
	if not L then
		return
	end
	local a = snap.auction
	for i = 1, 2 do
		local seat = snap.seats[i]
		local extra = ""
		if a then
			local p = a.players[i]
			extra = `\n${p.budget} · {#p.team}/{a.config.teamSize}`
		end
		L.podium[i].Text = (if seat.kind == "empty" then "Open seat" else seat.name) .. extra
		L.lights[i].Brightness = if a and a.lot and a.lot.leader == i then 5 else 1
	end

	if snap.mode == "draft" and a and a.lot then
		local c = Data.get(a.lot.key)
		local s = Data.SERIES[c.series]
		L.grad.Color = ColorSequence.new(s.c1, s.c2)
		L.top.Text = `TABLE {id} · LOT {a.lotNo} · {s.name}`
		L.initials.Text = c.initials
		L.name.Text = c.name
		L.title.Text = c.title
		L.tier.Text = `{Battle.tierLabel(c.tier)} TIER · {c.rating} · {Battle.scalingLine(c)}`
		if a.phase == "auction" then
			L.bid.Text = if a.lot.leader then `${a.lot.bid} — {a.players[a.lot.leader].name}` else "NO BIDS YET"
		else
			L.bid.Text = `{a.players[a.chooser].name}: KEEP or PASS?`
		end
	else
		L.grad.Color = ColorSequence.new(Color3.fromRGB(140, 70, 220), Color3.fromRGB(255, 100, 150))
		L.initials.Text = "⚔"
		L.name.Text = "ANIME DRAFT"
		L.title.Text = "Bid. Build. Battle."
		L.tier.Text = `{#Data.CHARACTERS} characters · power scaling decides`
		if snap.mode == "results" and snap.result then
			local w = snap.result.winner
			L.top.Text = `TABLE {id} · RESULTS`
			L.bid.Text = if w == 0 then "DRAW!" else `{snap.seats[w].name} WINS!`
		else
			L.top.Text = `TABLE {id} · OPEN`
			L.bid.Text = "STEP UP TO PLAY"
		end
	end
end

return Arena
