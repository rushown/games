--!strict
-- Day/night clock shared by server and clients. It's derived from the server time, so every server and
-- every client agrees without sending anything: 3/4 of each cycle is day (06:00 → 18:00),
-- 1/4 is night (18:00 → 06:00).
local Config = require(script.Parent.Config)

local DayNight = {}

local CYCLE = Config.DAY_NIGHT.cycleSeconds
local DAY = CYCLE * Config.DAY_NIGHT.dayFraction

-- Seconds into the current cycle.
local function phase(t: number): number
	return t % CYCLE
end

function DayNight.isNight(t: number): boolean
	return phase(t) >= DAY
end

-- Lighting.ClockTime for server time `t`.
function DayNight.clockTime(t: number): number
	local p = phase(t)
	if p < DAY then
		return 6 + 12 * (p / DAY)
	end
	return (18 + 12 * ((p - DAY) / (CYCLE - DAY))) % 24
end

-- Seconds until the next change between day and night.
function DayNight.untilSwitch(t: number): number
	local p = phase(t)
	return if p < DAY then DAY - p else CYCLE - p
end

return DayNight
