/**
 * Turns a set of wheel results into a character: name, epithet, backstory and an AI image prompt.
 * Everything is seeded, so the same picks + seed always produce the same character.
 */
import { segmentOf } from "@/data/wheels";
import type { CompleteRoll, Roll, SingleWheelId } from "@/data/types";
import { pick, seeded, type Rng } from "./random";
import { groupedPowers, seedOf } from "./roll";

/* ---------------- names ---------------- */

const SYLLABLES: Record<string, [string[], string[]]> = {
  human: [["Ka", "Ren", "Sei", "Mar", "Lio", "Aki", "To", "Ve", "Ha", "Yu"], ["to", "ji", "ra", "ka", "ren", "sho", "mi", "ro", "ga", "na"]],
  beastkin: [["Rok", "Fen", "Ula", "Gar", "Kiba", "Tsu", "Wol", "Lyn"], ["ra", "ko", "rin", "gar", "fang", "ki", "mar"]],
  elf: [["Ael", "Syl", "Thal", "Ely", "Lir", "Fae", "Ith", "Nim"], ["wen", "dris", "ion", "ara", "iel", "anor", "ith"]],
  android: [["Unit", "Axi", "Nexa", "Kor", "Vee", "Omi", "Zen"], ["-07", "-X", "on", "-9", "ra", "-Prime", "ix"]],
  vampire: [["Vla", "Mor", "Sang", "Lilith", "Cas", "Drav", "Nyx"], ["dimir", "rana", "uine", "ius", "otha", "eon"]],
  demon: [["Zar", "Mal", "Vex", "Kra", "Thul", "Baal", "Az"], ["goth", "akar", "ion", "zul", "rax", "oth", "ael"]],
  dragonborn: [["Dra", "Ryu", "Vor", "Ignis", "Khal", "Sha"], ["kar", "jin", "thrax", "vel", "zor", "goth"]],
  spirit: [["Ei", "Mi", "Sora", "Hika", "Nai", "Lu"], ["ra", "ko", "no", "ri", "sen", "mei"]],
  angel: [["Sera", "Uri", "Ael", "Raph", "Cassi", "Gab"], ["phiel", "el", "iel", "ael", "ion", "riel"]],
  titan: [["Kro", "Hyp", "Atla", "Rhe", "Oke", "Tyr"], ["nos", "erion", "s", "a", "anos", "on"]],
  eldritch: [["Y'th", "Nyar", "Ghl", "Xo'", "Azh", "Ctha"], ["oggua", "lath", "aaz", "thul", "nagh", "rr'o"]],
  celestial: [["Astra", "Sol", "Luna", "Vega", "Ori", "Neb"], ["ris", "aire", "on", "ael", "ion", "ula"]],
  primordial: [["Ae", "Chao", "Ere", "Nyx", "Ouro", "Prim"], ["on", "s", "bus", "ara", "boros", "eval"]],
  abstract: [["The", "Null", "Zero", "Omega", "Axiom", "Aleph"], [" Unwritten", "", " Point", "", "", "-0"]],
};

const EPITHETS: Partial<Record<SingleWheelId, string[][]>> = {
  strength: [
    ["Brawler", "Iron Fist"],
    ["Wallbreaker", "Stonecrusher"],
    ["Citybreaker", "Titanfall"],
    ["Worldsplitter", "Planetcrusher"],
    ["Starbreaker", "Sunshatter"],
    ["Universe Eater", "the Last Blow"],
  ],
  speed: [
    ["Quickstep", "Swift"],
    ["Thunderstep", "Mach Ghost"],
    ["Lightrunner", "Flash"],
    ["Starstrider", "Comet"],
    ["Timeless", "Instant"],
    ["the Everywhere", "Ever-Present"],
  ],
  durability: [
    ["Iron Hide", "Stubborn"],
    ["Bulwark", "Unbowed"],
    ["Unbroken", "Fortress"],
    ["World Shield", "Unscathed"],
    ["Undying", "Eternal Wall"],
    ["the Indestructible", "Never-Ending"],
  ],
  intelligence: [
    ["Clever", "Sharp-Eyed"],
    ["Strategist", "Mastermind"],
    ["Grandmaster", "Architect"],
    ["Starmind", "Sage"],
    ["All-Seeing", "Oracle"],
    ["All-Knowing", "the Omniscient"],
  ],
};

export function makeName(picks: Roll, rng: Rng): string {
  const [first, second] = SYLLABLES[picks.race ?? "human"] ?? SYLLABLES.human;
  const given = pick(first, rng) + pick(second, rng);
  if (picks.race === "abstract" || picks.race === "android") return given;
  const family = pick(first, rng) + pick(second, rng).toLowerCase();
  return `${given} ${family}`;
}

/** Epithet from the character's best scaled stat. */
export function makeEpithet(picks: Roll, rng: Rng): string {
  let best: SingleWheelId = "strength";
  let bestTier = -1;
  for (const id of ["strength", "speed", "durability", "intelligence"] as SingleWheelId[]) {
    const p = picks[id];
    if (!p) continue;
    const t = segmentOf(id, p as string).tier + rng() * 0.5; // tiny jitter to break ties
    if (t > bestTier) {
      bestTier = t;
      best = id;
    }
  }
  const band = Math.min(5, Math.floor(Math.max(0, bestTier) / 2));
  const word = pick(EPITHETS[best]![band], rng);
  const phrase = word.startsWith("the ") ? word.slice(4) : word;
  return `The ${phrase}`;
}

/* ---------------- backstory ---------------- */

const ORIGIN: Record<string, string[]> = {
  human: ["born in a forgotten mountain village", "an orphan raised on the streets of a capital city"],
  beastkin: ["raised by a pack in the deep forest", "the last cub of a hunted clan"],
  elf: ["a child of the Silver Wood, centuries old before learning to fight", "exiled from an elven court for asking forbidden questions"],
  android: ["assembled in a sealed laboratory and woken by accident", "a war machine that one day refused an order"],
  vampire: ["turned on the night their family was slaughtered", "a noble of the night who outlived their own bloodline"],
  demon: ["clawed up from the ninth layer of the abyss", "a demon prince who killed their way to the surface"],
  dragonborn: ["hatched from an egg found in a volcano's heart", "the heir to a dragon clan that ruled the skies"],
  spirit: ["a wandering spirit that took form from a dying wish", "born from the last breath of an ancient shrine"],
  angel: ["a soldier of the heavenly host", "an angel who fell in love with the mortal world"],
  titan: ["a giant who slept beneath the ocean for ten thousand years", "the last titan of a war against the gods"],
  eldritch: ["something that slipped in through a crack in the stars", "a dreaming thing at the bottom of the void that finally woke"],
  celestial: ["born in the heart of a newborn star", "a guardian of constellations older than any world"],
  primordial: ["there before the first light", "one of the gods who carved the universe out of chaos"],
  abstract: ["the idea of an ending, given a face", "a concept that wrote itself into existence"],
};

const PATH: Record<string, string> = {
  hero: "Now they stand between the world and everything that wants to end it.",
  villain: "Now they mean to bring every kingdom, heaven and hell to its knees.",
  antihero: "They save the world when it suits them, and nobody likes how they do it.",
  wanderer: "They walk from world to world, belonging to none of them.",
  mercenary: "Their power is for hire, and the price is always higher than you think.",
  guardian: "They swore to protect one person, one place, one promise, and nothing has broken that oath.",
  rogue: "Cast out of heaven, they answer to no god, which terrifies the gods.",
  fallen: "Once the greatest hero of their age, they are now the warning parents tell their children about.",
};

const SCALE_NOUN = [
  "a person",
  "a crowd",
  "a fortress",
  "a skyscraper",
  "a city",
  "a continent",
  "a planet",
  "a star system",
  "a galaxy",
  "the universe",
  "the multiverse",
  "existence itself",
];

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function powerPhrases(powers: string[]): string[] {
  return groupedPowers(powers).map(({ id, count }) => {
    const label = segmentOf("power", id).label.toLowerCase();
    return count >= 2 ? `awakened ${label}${count > 2 ? ` (×${count})` : ""}` : label;
  });
}

export function makeBackstory(r: CompleteRoll, name: string, rng: Rng): string[] {
  const race = segmentOf("race", r.race);
  const str = segmentOf("strength", r.strength);
  const dur = segmentOf("durability", r.durability);
  const spd = segmentOf("speed", r.speed);
  const int = segmentOf("intelligence", r.intelligence);
  const wpn = segmentOf("weapon", r.weapon);
  const first = name.split(" ")[0];
  const groups = groupedPowers(r.powers);
  const phrases = powerPhrases(r.powers);
  const top = groups.map((g) => segmentOf("power", g.id)).sort((a, b) => b.tier - a.tier)[0];

  const p1 = `${name} was ${pick(ORIGIN[race.id], rng)}. ${PATH[r.alignment]}`;

  const feats: string[] = [];
  feats.push(
    str.tier >= 11 ? "Their strikes exist outside of size and dimension." : `A single blow can ${str.tier >= 4 ? "erase" : "flatten"} ${SCALE_NOUN[str.tier]}.`,
  );
  feats.push(dur.tier >= 11 ? "Nothing in any reality can destroy them." : `They can walk away from attacks that would wipe out ${SCALE_NOUN[dur.tier]}.`);
  feats.push(spd.tier >= 9 ? `They move ${spd.label.toLowerCase()}, faster than time can follow.` : `They move at ${spd.label.toLowerCase()} speed.`);
  const kit =
    phrases.length === 1
      ? `${first}'s one and only power is ${phrases[0]}: ${top.desc.charAt(0).toLowerCase()}${top.desc.slice(1)}`
      : `${first} holds ${phrases.length === r.powers.length ? r.powers.length : groups.length} powers: ${list(phrases)}. The most feared is ${top.label.toLowerCase()}: ${top.desc.charAt(0).toLowerCase()}${top.desc.slice(1)}`;
  const p2 = `${kit} ${feats.join(" ")}`;

  const mind =
    int.tier >= 9 ? "Their mind holds every answer before the question is asked." : int.tier >= 5 ? "They out-think every opponent." : "They rely on instinct more than plans.";
  const awakened = groups.some((g) => g.count >= 2) ? " Some of their powers have awakened beyond their natural limits." : "";
  const p3 = `In battle they wield ${wpn.id === "fists" ? "nothing but their bare fists" : `the ${wpn.label}`}. ${mind}${awakened}`;

  return [p1, p2, p3];
}

/* ---------------- AI image prompt ---------------- */

const LOOK: Record<string, string> = {
  human: "human warrior",
  beastkin: "beastkin with animal ears and tail",
  elf: "elf with long pointed ears",
  android: "android with glowing circuit lines and a visor",
  vampire: "pale vampire with crimson eyes",
  demon: "demon with curved horns",
  dragonborn: "dragonborn with scales, horns and wings",
  spirit: "translucent spirit made of drifting light",
  angel: "angel with radiant feathered wings and a halo",
  titan: "colossal titan wearing an ancient crown",
  eldritch: "eldritch being with tendrils and too many eyes",
  celestial: "celestial being with skin full of stars",
  primordial: "primordial god wreathed in creation's first light",
  abstract: "abstract entity of floating geometric shapes in a vaguely human form",
};

const an = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

export function makePrompt(r: CompleteRoll, name: string, epithet: string): string {
  const s = (w: SingleWheelId) => segmentOf(w, r[w] as string);
  return [
    `Anime key-visual character portrait of ${name}, ${epithet}`,
    `${an(s("alignment").label)} ${s("alignment").label.toLowerCase()} ${LOOK[r.race]}`,
    `wielding ${an(s("weapon").label)} ${s("weapon").label.toLowerCase()}`,
    `powers: ${powerPhrases(r.powers).join(", ")}`,
    `${s("strength").label.toLowerCase()} power, ${s("speed").label.toLowerCase()} speed`,
    "dramatic rim lighting, dynamic pose, highly detailed, cinematic composition",
  ].join(", ");
}

/* ---------------- everything together ---------------- */

export interface Character {
  seed: number;
  roll: CompleteRoll;
  name: string;
  epithet: string;
  backstory: string[];
  prompt: string;
}

/** The character is fully determined by its spins: same spins → same character; any change → a different one. */
export function generateCharacter(roll: CompleteRoll): Character {
  const seed = seedOf(roll);
  const rng = seeded(seed);
  const name = makeName(roll, rng);
  const epithet = makeEpithet(roll, rng);
  return { seed, roll, name, epithet, backstory: makeBackstory(roll, name, rng), prompt: makePrompt(roll, name, epithet) };
}
