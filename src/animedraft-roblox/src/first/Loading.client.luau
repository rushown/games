--!nonstrict
-- Loading screen (runs from ReplicatedFirst, before anything else). Shows the AnimeDraft art with a
-- live progress bar and tips while the game and its sounds/images load, then fades out.
local ReplicatedFirst = game:GetService("ReplicatedFirst")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ContentProvider = game:GetService("ContentProvider")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LOADING_IMAGE = "rbxassetid://117917683375233"
local TIPS = {
	"Tip: Draft the strongest team to defeat your opponent!",
	"Tip: Every bid resets the hammer timer. Bid late to steal a pick!",
	"Tip: Two fighters from the same series give +3 synergy.",
	"Tip: Out of money? Your rival decides who gets the rest.",
	"Tip: Energy refills 1.5x faster at night while you play.",
	"Tip: Walk up to a player and press F to challenge them!",
	"Tip: Each player gets ONE skip. Save it for a god-tier pick.",
}

ReplicatedFirst:RemoveDefaultLoadingScreen()

local player = Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "LoadingScreen"
gui.IgnoreGuiInset = true
gui.DisplayOrder = 1000
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local HEAD = Font.fromEnum(Enum.Font.FredokaOne)

local bg = Instance.new("Frame")
bg.Size = UDim2.fromScale(1, 1)
bg.BackgroundColor3 = Color3.new(1, 1, 1)
bg.BorderSizePixel = 0
bg.Parent = gui
local grad = Instance.new("UIGradient")
grad.Rotation = 30
grad.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0, Color3.fromRGB(230, 40, 70)),
	ColorSequenceKeypoint.new(0.5, Color3.fromRGB(120, 40, 220)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(40, 120, 255)),
})
grad.Parent = bg

-- Fallback title (visible if the art hasn't loaded yet)
local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.AnchorPoint = Vector2.new(0.5, 0.5)
title.Position = UDim2.fromScale(0.5, 0.38)
title.Size = UDim2.fromScale(0.8, 0.22)
title.FontFace = HEAD
title.TextScaled = true
title.RichText = true
title.Text = 'Anime<font color="#B14CFF">Draft</font>'
title.TextColor3 = Color3.new(1, 1, 1)
title.Parent = bg
local ts = Instance.new("UIStroke")
ts.Thickness = 6
ts.Color = Color3.fromRGB(20, 10, 30)
ts.Parent = title

local art = Instance.new("ImageLabel")
art.Size = UDim2.fromScale(1, 1)
art.BackgroundTransparency = 1
art.ScaleType = Enum.ScaleType.Crop
art.Image = LOADING_IMAGE
art.Parent = bg

-- Bottom band: "Loading..." + bar + tip
local band = Instance.new("Frame")
band.AnchorPoint = Vector2.new(0, 1)
band.Position = UDim2.fromScale(0, 1)
band.Size = UDim2.fromScale(1, 0.3)
band.BackgroundColor3 = Color3.new(0, 0, 0)
band.BorderSizePixel = 0
band.Parent = bg
local fade = Instance.new("UIGradient")
fade.Rotation = 90
fade.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 0.25) })
fade.Parent = band

local loadingText = Instance.new("TextLabel")
loadingText.BackgroundTransparency = 1
loadingText.AnchorPoint = Vector2.new(0.5, 1)
loadingText.Position = UDim2.new(0.5, 0, 1, -64)
loadingText.Size = UDim2.new(0.5, 0, 0, 52)
loadingText.FontFace = HEAD
loadingText.TextScaled = true
loadingText.Text = "Loading..."
loadingText.TextColor3 = Color3.new(1, 1, 1)
loadingText.Parent = band
local ls = Instance.new("UIStroke")
ls.Thickness = 4
ls.Color = Color3.fromRGB(20, 10, 30)
ls.Parent = loadingText

local track = Instance.new("Frame")
track.AnchorPoint = Vector2.new(0.5, 1)
track.Position = UDim2.new(0.5, 0, 1, -30)
track.Size = UDim2.new(0.55, 0, 0, 26)
track.BackgroundColor3 = Color3.fromRGB(20, 12, 30)
track.Parent = band
Instance.new("UICorner", track).CornerRadius = UDim.new(1, 0)
local trackStroke = Instance.new("UIStroke")
trackStroke.Thickness = 3
trackStroke.Color = Color3.new(1, 1, 1)
trackStroke.Parent = track
local fill = Instance.new("Frame")
fill.Size = UDim2.fromScale(0.02, 1)
fill.BackgroundColor3 = Color3.fromRGB(170, 70, 255)
fill.Parent = track
Instance.new("UICorner", fill).CornerRadius = UDim.new(1, 0)
local shine = Instance.new("UIGradient")
shine.Rotation = 90
shine.Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170))
shine.Parent = fill

local tip = Instance.new("TextLabel")
tip.BackgroundTransparency = 1
tip.AnchorPoint = Vector2.new(1, 1)
tip.Position = UDim2.new(1, -18, 1, -8)
tip.Size = UDim2.new(0.3, 0, 0, 44)
tip.FontFace = HEAD
tip.TextScaled = true
tip.TextWrapped = true
tip.TextXAlignment = Enum.TextXAlignment.Right
tip.TextColor3 = Color3.new(1, 1, 1)
tip.Text = TIPS[1]
tip.Parent = band
local tipStroke = Instance.new("UIStroke")
tipStroke.Thickness = 2
tipStroke.Color = Color3.fromRGB(20, 10, 30)
tipStroke.Parent = tip

local progress = 0
local function setProgress(p: number)
	p = math.clamp(p, progress, 1)
	progress = p
	TweenService:Create(fill, TweenInfo.new(0.25), { Size = UDim2.fromScale(math.max(p, 0.02), 1) }):Play()
end

local done = false
task.spawn(function()
	local i = 1
	while not done do
		task.wait(3.5)
		i = i % #TIPS + 1
		tip.Text = TIPS[i]
	end
end)
task.spawn(function()
	local dots = 0
	while not done do
		dots = dots % 3 + 1
		loadingText.Text = "Loading" .. string.rep(".", dots)
		task.wait(0.4)
	end
end)

local started = os.clock()

-- 1) The game itself
if not game:IsLoaded() then
	game.Loaded:Wait()
end
setProgress(0.35)

-- 2) The game's scripts and remotes
ReplicatedStorage:WaitForChild("Shared", 30)
ReplicatedStorage:WaitForChild("Remotes", 30)
setProgress(0.5)

-- 3) Art and sounds (best effort; never blocks forever)
local assets = { art }
local okShared, Config = pcall(function()
	return require(ReplicatedStorage.Shared.Config)
end)
if okShared then
	for _, id in Config.SOUNDS do
		if id ~= 0 then
			local s = Instance.new("Sound")
			s.SoundId = "rbxassetid://" .. id
			table.insert(assets, s)
		end
	end
end
local total = #assets
local loaded = 0
task.spawn(function()
	pcall(function()
		ContentProvider:PreloadAsync(assets, function()
			loaded += 1
			setProgress(0.5 + 0.45 * loaded / total)
		end)
	end)
	loaded = total
end)
local deadline = os.clock() + 12
while loaded < total and os.clock() < deadline do
	task.wait(0.1)
end
-- A short minimum so the screen doesn't just flash
while os.clock() - started < 2.5 do
	task.wait(0.1)
end
setProgress(1)
task.wait(0.4)
done = true

-- Fade out
local info = TweenInfo.new(0.6, Enum.EasingStyle.Quad)
for _, d in gui:GetDescendants() do
	if d:IsA("GuiObject") then
		TweenService:Create(d, info, { BackgroundTransparency = 1 }):Play()
		if d:IsA("TextLabel") then
			TweenService:Create(d, info, { TextTransparency = 1 }):Play()
		elseif d:IsA("ImageLabel") then
			TweenService:Create(d, info, { ImageTransparency = 1 }):Play()
		end
	elseif d:IsA("UIStroke") then
		TweenService:Create(d, info, { Transparency = 1 }):Play()
	end
end
task.wait(0.65)
gui:Destroy()
