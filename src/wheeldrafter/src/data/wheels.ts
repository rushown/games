import type { Segment, Wheel, WheelId } from "./types";

/**
 * Every wheel's weights add up to 100, so a weight is literally the % chance and the
 * slice's share of the circle. Higher tiers get thinner slices.
 */

type Row = [id: string, label: string, short: string, weight: number, desc: string];

/** Shared odds for the 12-step power scales (strength, durability, speed). */
const POWER_ODDS = [20, 17, 14.5, 12, 10, 8, 6.5, 5, 3.5, 2, 1, 0.5];

function scale(rows: [id: string, label: string, short: string, desc: string][], odds: number[]): Segment[] {
  return rows.map(([id, label, short, desc], i) => ({
    id,
    label,
    short,
    desc,
    weight: odds[i],
    tier: Math.round((i * 11) / (rows.length - 1)),
  }));
}

function weighted(rows: Row[]): Segment[] {
  return rows.map(([id, label, short, weight, desc], i) => ({
    id,
    label,
    short,
    weight,
    desc,
    tier: Math.round((i * 11) / (rows.length - 1)),
  }));
}

/** Scales weights so they add up to exactly 100. */
function normalise(segs: Segment[]): Segment[] {
  const total = segs.reduce((t, x) => t + x.weight, 0);
  return segs.map((x) => ({ ...x, weight: (x.weight / total) * 100 }));
}

export const WHEELS: Wheel[] = [
  {
    id: "race",
    name: "Race",
    ask: "What are you?",
    scoreWeight: 1,
    segments: weighted([
      ["human", "Human", "Human", 18, "Fragile, stubborn, endlessly adaptable."],
      ["beastkin", "Beastkin", "Beastkin", 12, "Animal instincts in a humanoid body."],
      ["elf", "Elf", "Elf", 10, "Long-lived, graceful, steeped in old magic."],
      ["android", "Android", "Android", 9, "A built mind in a built body."],
      ["vampire", "Vampire", "Vampire", 8, "Undying predator of the night."],
      ["demon", "Demon", "Demon", 8, "Born from the abyss, fuelled by hunger."],
      ["dragonborn", "Dragonborn", "Dragon", 7, "Dragon blood, scales and fire."],
      ["spirit", "Spirit", "Spirit", 6, "A will without a fixed body."],
      ["angel", "Angel", "Angel", 6, "Heaven's soldier, wings of light."],
      ["titan", "Titan", "Titan", 5, "A giant from before history."],
      ["eldritch", "Eldritch Horror", "Eldritch", 4, "Something that should not be looked at."],
      ["celestial", "Celestial", "Celestial", 3.5, "Starborn, older than worlds."],
      ["primordial", "Primordial God", "Primordial", 2, "A god from the first moment of creation."],
      ["abstract", "Abstract Entity", "Abstract", 1.5, "A concept that learned to walk."],
    ]),
  },
  {
    id: "strength",
    name: "Strength",
    ask: "How hard can you hit?",
    scoreWeight: 3,
    segments: scale(
      [
        ["average", "Average Human", "Average", "A normal punch."],
        ["peak", "Peak Human", "Peak Human", "Olympic-level force."],
        ["wall", "Wall Level", "Wall", "Breaks through brick and steel."],
        ["building", "Building Level", "Building", "Topples skyscrapers."],
        ["city", "City Level", "City", "Levels a whole city."],
        ["continent", "Continental", "Continent", "Splits continents apart."],
        ["planet", "Planetary", "Planet", "Shatters planets."],
        ["solar", "Solar System", "Solar Sys.", "Wipes out star systems."],
        ["galaxy", "Galactic", "Galaxy", "Destroys galaxies."],
        ["universe", "Universal", "Universe", "Erases a universe."],
        ["multiverse", "Multiversal", "Multiverse", "Breaks infinite universes."],
        ["boundless", "Boundless", "Boundless", "Beyond any scale of size or dimension."],
      ],
      POWER_ODDS,
    ),
  },
  {
    id: "durability",
    name: "Durability",
    ask: "How much can you take?",
    scoreWeight: 2,
    segments: scale(
      [
        ["average", "Average Human", "Average", "Bruises like anyone else."],
        ["tough", "Tough", "Tough", "Shrugs off a car crash."],
        ["bulletproof", "Bulletproof", "Bulletproof", "Bullets bounce off."],
        ["building", "Building Level", "Building", "Survives a collapsing tower."],
        ["city", "City Level", "City", "Walks out of a city-wide blast."],
        ["continent", "Continental", "Continent", "Tanks continent-busting hits."],
        ["planet", "Planetary", "Planet", "Survives a planet exploding."],
        ["solar", "Solar System", "Solar Sys.", "Unfazed inside a supernova."],
        ["galaxy", "Galactic", "Galaxy", "Galaxy-ending attacks barely sting."],
        ["universe", "Universal", "Universe", "Outlives the end of a universe."],
        ["multiverse", "Multiversal", "Multiverse", "Untouched by multiversal collapse."],
        ["boundless", "Boundless", "Boundless", "Cannot be destroyed by any means."],
      ],
      POWER_ODDS,
    ),
  },
  {
    id: "speed",
    name: "Speed",
    ask: "How fast are you?",
    scoreWeight: 2,
    segments: scale(
      [
        ["average", "Average Human", "Average", "Jogging pace."],
        ["athletic", "Athletic", "Athletic", "Sprinter reflexes."],
        ["supersonic", "Supersonic", "Mach 1", "Breaks the sound barrier."],
        ["hypersonic", "Hypersonic", "Hypersonic", "Mach 5 and beyond."],
        ["mhs", "Massively Hypersonic", "Mach 1000", "Crosses a country in a blink."],
        ["relativistic", "Relativistic", "Relativistic", "A real fraction of light speed."],
        ["light", "Speed of Light", "Lightspeed", "Moves as fast as light."],
        ["ftl", "Faster Than Light", "FTL", "Outruns light itself."],
        ["mftl", "Massively FTL", "MFTL", "Crosses galaxies in moments."],
        ["infinite", "Infinite", "Infinite", "Covers any distance in zero time."],
        ["immeasurable", "Immeasurable", "Immeasurable", "Beyond the concept of time."],
        ["omnipresent", "Omnipresent", "Omnipresent", "Already everywhere at once."],
      ],
      POWER_ODDS,
    ),
  },
  {
    id: "intelligence",
    name: "Intelligence",
    ask: "How sharp is your mind?",
    scoreWeight: 1,
    segments: scale(
      [
        ["average", "Average", "Average", "Gets by."],
        ["smart", "Smart", "Smart", "Quick on the uptake."],
        ["gifted", "Gifted", "Gifted", "Top of every class."],
        ["genius", "Genius", "Genius", "Once-in-a-generation mind."],
        ["tactical", "Tactical Genius", "Tactician", "Wins battles before they start."],
        ["supergenius", "Supergenius", "Supergenius", "Out-thinks civilisations."],
        ["cosmic", "Cosmic Intellect", "Cosmic", "Comprehends the laws of reality."],
        ["omniscient", "Omniscient", "Omniscient", "Knows everything. Everything."],
      ],
      [24, 20, 17, 14, 11, 8, 4.5, 1.5],
    ),
  },
  {
    id: "powerCount",
    name: "Power Count",
    ask: "How many powers do you hold?",
    scoreWeight: 0,
    segments: [
      ["1", "One Power", "1 Power", 38, "A single gift, mastered."],
      ["2", "Two Powers", "2 Powers", 27, "A rare dual-wielder of abilities."],
      ["3", "Three Powers", "3 Powers", 17, "A walking arsenal."],
      ["4", "Four Powers", "4 Powers", 10, "Too many tricks to counter."],
      ["5", "Five Powers", "5 Powers", 5.5, "A living legend's kit."],
      ["6", "Six Powers", "6 Powers", 2.5, "Everything, all at once."],
    ].map(([id, label, short, weight, desc], i) => ({
      id: id as string,
      label: label as string,
      short: short as string,
      weight: weight as number,
      desc: desc as string,
      tier: [0, 2, 4, 7, 9, 11][i],
    })),
  },
  {
    id: "power",
    name: "Power",
    ask: "Spin for a power",
    scoreWeight: 1,
    segments: normalise(
      weighted([
        ["senses", "Enhanced Senses", "Senses", 12, "Sees, hears and feels everything."],
        ["superstrength", "Super Strength", "Strength", 10, "Raw, overwhelming physical power."],
        ["pyro", "Pyrokinesis", "Fire", 9, "Commands flame and heat."],
        ["hydro", "Hydrokinesis", "Water", 8, "Bends oceans and rain."],
        ["electro", "Electrokinesis", "Lightning", 7.5, "Lightning on command."],
        ["regeneration", "Regeneration", "Regen", 7, "Heals from almost anything."],
        ["telekinesis", "Telekinesis", "Telekinesis", 6.5, "Moves matter with the mind."],
        ["shapeshifting", "Shapeshifting", "Shapeshift", 6, "Becomes anything or anyone."],
        ["invisibility", "Invisibility", "Invisible", 5.5, "Unseen, unheard, untraceable."],
        ["teleport", "Teleportation", "Teleport", 5, "Here, then there."],
        ["shadow", "Shadow Control", "Shadows", 4.5, "An army made of darkness."],
        ["gravity", "Gravity Manipulation", "Gravity", 4, "Bends weight and orbit."],
        ["barrier", "Absolute Barrier", "Barrier", 3.5, "Shields nothing gets through."],
        ["clones", "Infinite Clones", "Clones", 3, "An army of yourself."],
        ["copying", "Power Copying", "Copy", 2.7, "Steals any ability it sees."],
        ["precognition", "Precognition", "Foresight", 2.4, "Sees the future a step ahead."],
        ["space", "Space Manipulation", "Space", 2, "Folds distance, tears dimensions."],
        ["time", "Time Manipulation", "Time", 1.6, "Stops, rewinds and skips time."],
        ["soul", "Soul Manipulation", "Soul", 1.3, "Grabs the soul itself."],
        ["immortality", "True Immortality", "Immortal", 1.1, "Death simply doesn't apply."],
        ["probability", "Probability Control", "Luck", 0.9, "Makes the impossible happen."],
        ["reality", "Reality Warping", "Reality", 0.6, "Rewrites what is real."],
        ["conceptual", "Conceptual Erasure", "Erasure", 0.4, "Deletes ideas, laws and existence."],
        ["narrative", "Narrative Immunity", "Plot Armor", 0.3, "The story cannot end without you."],
      ]),
    ),
  },
  {
    id: "weapon",
    name: "Weapon",
    ask: "What do you fight with?",
    scoreWeight: 1,
    segments: weighted([
      ["fists", "Bare Fists", "Fists", 16, "Who needs a weapon?"],
      ["katana", "Katana", "Katana", 14, "A blade folded a thousand times."],
      ["spear", "Spear", "Spear", 12, "Reach and precision."],
      ["daggers", "Twin Daggers", "Daggers", 11, "Fast, quiet, deadly."],
      ["bow", "Spirit Bow", "Bow", 10, "Arrows that never miss."],
      ["gauntlets", "Gauntlets", "Gauntlets", 9, "Armoured fists that crack mountains."],
      ["scythe", "Reaper Scythe", "Scythe", 8, "Harvests souls."],
      ["cursed", "Cursed Blade", "Cursed", 7, "Hungry, whispering, forbidden."],
      ["mech", "Mech Armor", "Mech", 5, "A walking fortress."],
      ["relic", "Holy Relic", "Relic", 4, "A god's lost weapon."],
      ["hammer", "Star-Forge Hammer", "Star Hammer", 2.5, "Forged in a dying sun."],
      ["pen", "Pen of Creation", "Creation Pen", 1.5, "Whatever it writes becomes true."],
    ]),
  },
  {
    id: "alignment",
    name: "Path",
    ask: "Which side are you on?",
    scoreWeight: 0,
    segments: [
      ["hero", "Hero", "Hero", "Fights for everyone else."],
      ["villain", "Villain", "Villain", "The world will kneel."],
      ["antihero", "Anti-Hero", "Anti-Hero", "Does the right thing the wrong way."],
      ["wanderer", "Wanderer", "Wanderer", "Belongs to no one and nowhere."],
      ["mercenary", "Mercenary", "Mercenary", "Loyal to the highest bidder."],
      ["guardian", "Guardian", "Guardian", "Protects one thing above all."],
      ["rogue", "Rogue God", "Rogue God", "Cast out of heaven, still divine."],
      ["fallen", "Fallen One", "Fallen", "Once a legend, now a warning."],
    ].map(([id, label, short, desc]) => ({ id, label, short, desc, weight: 12.5, tier: -1 })),
  },
];

/* ---------------- Fortune: rare races reshape every later wheel ---------------- */

/** How strongly fortune boosts the top tier (a boundless race multiplies Boundless slices by e^BETA ≈ 33×). */
export const FORTUNE_BETA = 3.5;

/** Fortune 0 (human) … 1 (abstract entity), from the race's tier. */
export function fortuneOf(raceId: string | undefined): number {
  if (!raceId) return 0;
  const seg = WHEELS[0].segments.find((x) => x.id === raceId);
  return seg ? Math.pow(seg.tier / 11, 1.4) : 0;
}

/** Multiplier applied to a slice of tier `tier` under fortune `f`. */
export const fortuneBoost = (f: number, tier: number) => (tier < 0 ? 1 : Math.exp(FORTUNE_BETA * f * (tier / 11)));

/** Biggest boost (top tier) for display, e.g. "×12". */
export const fortuneMultiplier = (f: number) => Math.exp(FORTUNE_BETA * f);

/** "×1.4", "×12", "×33" */
export const formatMultiplier = (f: number) => {
  const m = fortuneMultiplier(f);
  return `×${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}`;
};

/** A wheel with its slice sizes re-weighted by fortune (still summing to 100). Race and Path are never tilted. */
export function tiltedWheel(wheel: Wheel, f: number): Wheel {
  if (f <= 0 || wheel.id === "race" || wheel.id === "alignment") return wheel;
  const raw = wheel.segments.map((x) => x.weight * fortuneBoost(f, x.tier));
  const total = raw.reduce((a, b) => a + b, 0);
  return { ...wheel, segments: wheel.segments.map((x, i) => ({ ...x, weight: (raw[i] / total) * 100 })) };
}

export const WHEEL_BY_ID = Object.fromEntries(WHEELS.map((w) => [w.id, w])) as Record<WheelId, Wheel>;

export function segmentOf(wheel: WheelId, id: string): Segment {
  const s = WHEEL_BY_ID[wheel].segments.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown ${wheel} segment: ${id}`);
  return s;
}

/** Monochrome ramp per tier: paper → ink. Only Boundless gets colour (the accent). */
export const TIER_COLORS = [
  "#ece8df",
  "#e0dbd0",
  "#d2cbbd",
  "#c1b8a7",
  "#aca290",
  "#958a78",
  "#7b7062",
  "#62584d",
  "#4a423a",
  "#332d28",
  "#1d1a17",
  "#c6f432",
];
/** Path wheel (no tiers) alternates these. */
export const PATH_COLORS = ["#f6f4ef", "#e7e3da"];

export const TIER_NAMES = [
  "Common",
  "Common",
  "Uncommon",
  "Uncommon",
  "Rare",
  "Rare",
  "Epic",
  "Epic",
  "Legendary",
  "Mythic",
  "Divine",
  "Boundless",
];

export const sliceColor = (seg: Segment, i: number) => (seg.tier < 0 ? PATH_COLORS[i % 2] : TIER_COLORS[seg.tier]);
export const textOnTier = (tier: number) => (tier === 11 || tier < 5 ? "#15130f" : "#fbfaf7");
