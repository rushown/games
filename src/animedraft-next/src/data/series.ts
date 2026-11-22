import type { Series } from "./types";

type Row = [key: string, name: string, short: string, c1: string, c2: string, match: string, clues: string, similar: string];

const ROWS: Row[] = [
  ["gl", "Gurren Lagann", "TTGL", "#ff5a1f", "#ffd23f", "gurren", "Mecha|Drills|Underground village", "db|sds"],
  ["um", "Umineko", "UMI", "#9e0f42", "#f2b544", "umineko", "Mystery|Witches|Island murders", "pm|dn"],
  ["pm", "Madoka Magica", "PMMM", "#ff5fa2", "#ffd2e6", "madoka", "Magical girls|Wishes|Despair", "um|hs"],
  ["hs", "Haruhi Suzumiya", "SOS", "#ffb000", "#ff4d4d", "haruhi", "School club|Aliens|Time travel", "pm|mob"],
  ["db", "Dragon Ball", "DB", "#ff8a00", "#ffd400", "dragon ball", "Wishing orbs|Aliens|Tournaments", "na|op"],
  ["opm", "One Punch Man", "OPM", "#ffd000", "#e63b2e", "one punch", "Hero association|Monsters|Parody", "mob|mha"],
  ["sl", "Solo Leveling", "SL", "#6a1fb0", "#d9a6ff", "solo leveling|ore dake level", "Dungeons|Gates|Hunters", "ovl|ts"],
  ["jjk", "Jujutsu Kaisen", "JJK", "#d7263d", "#3a1020", "jujutsu", "Curses|Sorcerers|Domains", "bl|csm"],
  ["bl", "Bleach", "BLE", "#f4efe0", "#e07a5f", "bleach", "Soul reapers|Hollows|Bankai", "jjk|kny"],
  ["na", "Naruto", "NAR", "#ff7b00", "#2a1606", "naruto|boruto", "Ninjas|Hidden villages|Headbands", "bl|op"],
  ["op", "One Piece", "OP", "#e63946", "#ffd166", "one piece", "Pirates|Treasure|Devil fruits", "na|db"],
  ["hxh", "Hunter x Hunter", "HxH", "#1f9e6e", "#e9c46a", "hunter", "Licence exam|Nen|Ants", "jjk|bc"],
  ["aot", "Attack on Titan", "AoT", "#8d5524", "#d9b27c", "titan|shingeki", "Walls|Giants|Freedom", "tg|cg"],
  ["sds", "Seven Deadly Sins", "7DS", "#c1121f", "#fdf0d5", "deadly sins|nanatsu no taizai", "Knights|Sins|Tavern", "bc|fate"],
  ["fate", "Fate", "FATE", "#f6c90e", "#7d0a0a", "fate", "Holy grail|Heroic spirits|Masters", "sds|idx"],
  ["dn", "Death Note", "DN", "#e8e3da", "#6b0000", "death note", "Notebook|Detective|Gods of death", "cg|um"],
  ["cg", "Code Geass", "CG", "#9d0208", "#ffba08", "code geass", "Mechs|Rebellion|Chess", "dn|aot"],
  ["jojo", "JoJo's Bizarre Adventure", "JJBA", "#ff006e", "#ffbe0b", "jojo", "Stands|Bloodline|Poses", "hxh|db"],
  ["mha", "My Hero Academia", "MHA", "#ff3a20", "#2a9d8f", "hero academia", "Quirks|Hero school|Villains", "opm|bc"],
  ["kny", "Demon Slayer", "KNY", "#0b8f6a", "#14110f", "kimetsu|demon slayer", "Demons|Breathing styles|Swords", "jjk|bl"],
  ["hel", "Hellsing", "HEL", "#7a0303", "#f2e9d8", "hellsing", "Vampires|Church|Military", "tg|csm"],
  ["bc", "Black Clover", "BC", "#3a5a40", "#e9e4c9", "black clover", "Grimoires|Magic knights|Clovers", "mha|fr"],
  ["mob", "Mob Psycho 100", "MOB", "#b46cf0", "#ffe66d", "mob psycho", "Psychics|Percentages|Con-man mentor", "opm|hs"],
  ["ovl", "Overlord", "OVL", "#4b1286", "#ffd60a", "overlord", "Isekai|Undead|Guild", "ts|sl"],
  ["ts", "That Time I Got Reincarnated as a Slime", "SLIME", "#2fcf98", "#fff1a8", "slime", "Isekai|Monsters|Nation building", "ovl|mk"],
  ["mk", "The Misfit of Demon King Academy", "MAOU", "#ef233c", "#241a2e", "maou gakuin|demon king academy", "Demon lord|Academy|Reincarnation", "ts|ovl"],
  ["csm", "Chainsaw Man", "CSM", "#ff6b35", "#f7f2e8", "chainsaw", "Devils|Contracts|Public safety", "jjk|tg"],
  ["idx", "A Certain Magical Index", "INDEX", "#f72585", "#ffd6ff", "toaru|certain", "Espers|Science city|Levels", "fate|mha"],
  ["fr", "Frieren", "FRI", "#8fbf6a", "#f8f6ef", "frieren", "Elves|After the journey|Spells", "bc|ovl"],
  ["fma", "Fullmetal Alchemist", "FMA", "#c81d25", "#fcbf49", "fullmetal|hagane", "Alchemy|Brothers|Equivalent exchange", "hxh|aot"],
  ["tg", "Tokyo Ghoul", "TG", "#8d1a20", "#e9d8a6", "tokyo ghoul", "Ghouls|Coffee shop|Masks", "aot|csm"],
  ["sao", "Sword Art Online", "SAO", "#3a3f47", "#ffb703", "sword art", "Virtual reality|Death game|Guilds", "sl|ovl"],
  ["sxf", "Spy x Family", "SxF", "#2d6a4f", "#ffccd5", "spy", "Spies|Fake family|Telepathy", "dn|cg"],
];

/** AniList search titles for cover art (the most recognisable season/adaptation). */
const SEARCH: Record<string, string> = {
  gl: "Tengen Toppa Gurren Lagann",
  um: "Umineko no Naku Koro ni",
  pm: "Puella Magi Madoka Magica",
  hs: "The Melancholy of Haruhi Suzumiya",
  db: "Dragon Ball Z",
  na: "Naruto: Shippuden",
  hxh: "Hunter x Hunter (2011)",
  fate: "Fate/Zero",
  cg: "Code Geass: Lelouch of the Rebellion",
  kny: "Demon Slayer: Kimetsu no Yaiba",
  hel: "Hellsing Ultimate",
  fr: "Frieren: Beyond Journey's End",
  fma: "Fullmetal Alchemist: Brotherhood",
  sds: "The Seven Deadly Sins",
};

export const SERIES: Series[] = ROWS.map(([key, name, short, c1, c2, match, clues, similar]) => ({
  key,
  name,
  short,
  colors: [c1, c2],
  match,
  clues: clues.split("|"),
  similar: similar.split("|"),
  search: SEARCH[key] ?? name,
}));

export const SERIES_BY_KEY: Record<string, Series> = Object.fromEntries(SERIES.map((s) => [s.key, s]));
