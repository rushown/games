import type { Character } from "./types";
import { PROFILES } from "./profiles";
import { combatRating, displayStats, tierFor, type Scaling } from "./scaling";

/**
 * Character database.
 * sup     = team support value 0–100 (healing, leadership, utility). Every combat number comes from
 *           the power-scaling profile in profiles.ts, never from here.
 * clues   = vague words an imposter may receive.
 * similar = characters that feel alike (archetype, powers, vibe), used for imposter hints.
 * search  = optional AniList search name when it differs from the display name.
 */
type Seed = [
  key: string,
  name: string,
  series: string,
  title: string,
  sup: number,
  clues: string,
  similar: string,
  search?: string,
];

const SEEDS: Seed[] = [
  // Gurren Lagann
  ["simon", "Simon", "gl", "The Spiral King", 72, "Drill|Spiral|Bro", "kamina|asta|deku"],
  ["kamina", "Kamina", "gl", "Leader of Team Dai-Gurren", 92, "Sunglasses|Cape|Fighting spirit", "simon|allmight|rengoku"],
  // Umineko
  ["featherine", "Featherine Augustus Aurora", "um", "Witch of Theatergoing", 45, "Author|Purple|Higher dimension", "bernkastel|haruhi|zeno"],
  ["bernkastel", "Bernkastel", "um", "Witch of Miracles", 30, "Cat|Wine|Miracles", "featherine|beatrice|homura"],
  ["beatrice", "Beatrice", "um", "Golden Witch", 50, "Butterflies|Gold|Pipe", "bernkastel|makima|frieren"],
  // Madoka
  ["madoka", "Madoka Kaname", "pm", "Law of Cycles", 99, "Pink|Bow|Wish", "homura|orihime|haruhi"],
  ["homura", "Homura Akemi", "pm", "Time-Looping Devil", 55, "Time loop|Shield|Black hair", "bernkastel|dio|madoka"],
  // Haruhi
  ["haruhi", "Haruhi Suzumiya", "hs", "Unconscious God", 45, "Club|Headband|Boredom", "madoka|featherine|zeno"],
  // Dragon Ball
  ["goku", "Goku", "db", "Ultra Instinct Saiyan", 42, "Spiky hair|Training|Big appetite", "vegeta|luffy|naruto", "Son Goku"],
  ["vegeta", "Vegeta", "db", "Prince of All Saiyans", 30, "Prince|Pride|Rival", "goku|sasuke|bakugo"],
  ["gohan", "Gohan", "db", "Beast Mode", 55, "Scholar|Hidden potential|Glasses", "goku|deku|yuji", "Son Gohan"],
  ["broly", "Broly", "db", "Legendary Super Saiyan", 15, "Rage|Green aura|Legend", "kenpachi|eren|vegeta"],
  ["zeno", "Zeno", "db", "Omni-King", 10, "Button|Erase|Childlike", "beerus|haruhi|featherine"],
  ["whis", "Whis", "db", "Angel Attendant", 88, "Staff|Angel|Food", "beerus|unohana|urahara"],
  ["beerus", "Beerus", "db", "God of Destruction", 20, "Cat|Destruction|Pudding", "zeno|whis|frieza"],
  ["frieza", "Frieza", "db", "Emperor of the Universe", 18, "Golden form|Emperor|Polite villain", "muzan|aizen|vegeta"],
  // One Punch Man
  ["saitama", "Saitama", "opm", "One Punch", 30, "Bald|Supermarket sales|Boredom", "mob|gojo|goku"],
  ["tatsumaki", "Tatsumaki", "opm", "Terrible Tornado", 55, "Telekinesis|Green|Short temper", "mob|accelerator|homura"],
  ["garou", "Garou", "opm", "Cosmic Fear Mode", 20, "Hero hunter|Martial arts|Monster", "sukuna|kaneki|vegeta"],
  ["genos", "Genos", "opm", "Demon Cyborg", 40, "Cyborg|Disciple|Incinerate", "edward|saitama|deku"],
  // Solo Leveling
  ["jinwoo", "Sung Jinwoo", "sl", "Shadow Monarch", 86, "Shadows|Level up|Arise", "ainz|anos|rimuru", "Sung Jin-Woo"],
  // Jujutsu Kaisen
  ["gojo", "Satoru Gojo", "jjk", "The Honored One", 40, "Blindfold|Infinity|Sweets", "accelerator|killua|saitama"],
  ["sukuna", "Ryomen Sukuna", "jjk", "King of Curses", 32, "Four arms|Fingers|Shrine", "gojo|dio|muzan", "Sukuna Ryoumen"],
  ["yuji", "Yuji Itadori", "jjk", "Sukuna's Vessel", 42, "Vessel|Divergent fist|Pink hair", "denji|tanjiro|deku", "Yuuji Itadori"],
  ["yuta", "Yuta Okkotsu", "jjk", "Special Grade Sorcerer", 82, "Ring|Copy|Katana", "yuji|asta|kirito", "Yuuta Okkotsu"],
  ["megumi", "Megumi Fushiguro", "jjk", "Ten Shadows", 70, "Shadows|Dogs|Ten", "jinwoo|sasuke|kurapika"],
  ["toji", "Toji Fushiguro", "jjk", "Sorcerer Killer", 10, "No energy|Gambler|Weapons", "levi|zoro|hisoka", "Touji Fushiguro"],
  // Bleach
  ["aizen", "Sosuke Aizen", "bl", "Hogyoku Transcendent", 40, "Glasses|Hypnosis|Butterfly", "lelouch|madara|light", "Sousuke Aizen"],
  ["yhwach", "Yhwach", "bl", "The Almighty", 50, "Almighty|Father|Quincy", "aizen|kaguya|father"],
  ["ichigo", "Ichigo Kurosaki", "bl", "Substitute Soul Reaper", 32, "Orange hair|Bankai|Substitute", "naruto|yuji|asta"],
  ["kenpachi", "Kenpachi Zaraki", "bl", "Sword Demon", 10, "Bells|Battle junkie|Eyepatch", "broly|zoro|kaido"],
  ["urahara", "Kisuke Urahara", "bl", "Mad Genius Shopkeeper", 82, "Hat|Shopkeeper|Fan", "shikamaru|L|whis"],
  ["unohana", "Retsu Unohana", "bl", "First Kenpachi", 96, "Braid|Healer|Hidden past", "tsunade|orihime|kenpachi"],
  ["orihime", "Orihime Inoue", "bl", "Rejection of Fate", 99, "Hairpins|Rejection|Weird food", "tsunade|chopper|madoka"],
  ["byakuya", "Byakuya Kuchiki", "bl", "Senbonzakura", 30, "Cherry blossoms|Noble|Scarf", "itachi|levi|kokushibo"],
  // Naruto
  ["naruto", "Naruto Uzumaki", "na", "Seventh Hokage", 84, "Ramen|Fox|Believe it", "luffy|goku|ichigo"],
  ["sasuke", "Sasuke Uchiha", "na", "Rinne Sharingan", 30, "Red eyes|Revenge|Lightning", "vegeta|itachi|megumi"],
  ["madara", "Madara Uchiha", "na", "Ghost of the Uchiha", 30, "Clan|Meteor|Armor", "aizen|yhwach|kaguya"],
  ["itachi", "Itachi Uchiha", "na", "Tsukuyomi Prodigy", 55, "Crows|Illusions|Sacrifice", "byakuya|lelouch|sasuke"],
  ["kakashi", "Kakashi Hatake", "na", "Copy Ninja", 72, "Mask|Copy|Book", "gojo|levi|yami"],
  ["minato", "Minato Namikaze", "na", "Yellow Flash", 70, "Teleport|Yellow|Hokage", "killua|netero|naruto"],
  ["pain", "Pain", "na", "Six Paths of Pain", 40, "Piercings|Push|God", "madara|aizen|light", "Pain"],
  ["kaguya", "Kaguya Otsutsuki", "na", "Rabbit Goddess", 30, "Rabbit|Moon|White eyes", "madara|yhwach|zeno", "Kaguya Ootsutsuki"],
  ["tsunade", "Tsunade", "na", "Legendary Sannin", 98, "Gambling|Medic|Super strength", "unohana|orihime|chopper"],
  ["shikamaru", "Shikamaru Nara", "na", "IQ 200 Strategist", 82, "Shadows|Shogi|Troublesome", "L|urahara|armin"],
  // One Piece
  ["luffy", "Monkey D. Luffy", "op", "Sun God Nika", 86, "Straw hat|Meat|Rubber", "naruto|goku|asta"],
  ["zoro", "Roronoa Zoro", "op", "King of Hell", 30, "Three swords|Lost|Green hair", "kenpachi|toji|levi", "Zoro Roronoa"],
  ["shanks", "Shanks", "op", "Red-Haired Emperor", 80, "Red hair|Missing arm|Conqueror", "whitebeard|gojo|yami"],
  ["whitebeard", "Whitebeard", "op", "Strongest Man Alive", 72, "Mustache|Earthquake|Family", "allmight|kaido|netero", "Edward Newgate"],
  ["kaido", "Kaido", "op", "Strongest Creature", 20, "Dragon|Drunk|Unkillable", "whitebeard|broly|muzan", "Kaidou"],
  ["chopper", "Tony Tony Chopper", "op", "Monster Doctor", 97, "Reindeer|Doctor|Cotton candy", "orihime|tsunade|anya"],
  ["ace", "Portgas D. Ace", "op", "Fire Fist", 50, "Fire|Brother|Freckles", "mustang|rengoku|kaneki"],
  ["blackbeard", "Blackbeard", "op", "Emperor of Darkness", 20, "Darkness|Two fruits|Laugh", "aizen|afo|kaido", "Marshall D. Teach"],
  // Hunter x Hunter
  ["meruem", "Meruem", "hxh", "Chimera Ant King", 20, "King|Board game|Tail", "sukuna|light|garou"],
  ["netero", "Isaac Netero", "hxh", "Zero Hand", 42, "Prayer|Old man|Hundred hands", "minato|whitebeard|allmight"],
  ["gon", "Gon Freecss", "hxh", "Adult Gon", 42, "Fishing rod|Rock paper scissors|Green", "luffy|naruto|tanjiro"],
  ["killua", "Killua Zoldyck", "hxh", "Godspeed", 55, "Lightning|Assassin|Skateboard", "gojo|minato|zenitsu"],
  ["hisoka", "Hisoka", "hxh", "Bungee Gum Magician", 10, "Rubber|Clown|Cards", "toji|dio|makima", "Hisoka Morow"],
  ["chrollo", "Chrollo Lucilfer", "hxh", "Phantom Troupe Leader", 62, "Book|Spider|Cross", "lelouch|aizen|light"],
  ["kurapika", "Kurapika", "hxh", "Last of the Kurta", 55, "Chains|Scarlet eyes|Revenge", "sasuke|levi|itachi"],
  // Attack on Titan
  ["eren", "Eren Yeager", "aot", "The Founder", 32, "Giant|Freedom|Rumbling", "kaneki|sasuke|lelouch"],
  ["levi", "Levi Ackerman", "aot", "Humanity's Strongest", 52, "Tea|Cleaning|Short", "toji|zoro|kakashi", "Levi"],
  ["armin", "Armin Arlert", "aot", "Colossal Strategist", 76, "Strategy|Colossal|Ocean", "shikamaru|lelouch|L"],
  ["mikasa", "Mikasa Ackerman", "aot", "Scarf Guardian", 60, "Red scarf|Loyal|Blades", "levi|nezuko|yor"],
  // Seven Deadly Sins
  ["escanor", "Escanor", "sds", "The One", 30, "Sun|Pride|Noon", "allmight|ichigo|vegeta"],
  ["meliodas", "Meliodas", "sds", "Dragon's Sin of Wrath", 42, "Dragon|Tavern|Demon mark", "naruto|ichigo|asta"],
  // Fate
  ["gilgamesh", "Gilgamesh", "fate", "King of Heroes", 40, "Gold|Treasury|King", "frieza|aizen|madara"],
  ["artoria", "Artoria Pendragon", "fate", "King of Knights", 62, "Sword|Knight|Food", "escanor|mikasa|himmel"],
  // Death Note
  ["light", "Light Yagami", "dn", "Kira", 60, "Notebook|Potato chip|Justice", "lelouch|L|aizen"],
  ["L", "L Lawliet", "dn", "World's Greatest Detective", 78, "Sweets|Crouching|Detective", "light|shikamaru|urahara"],
  ["ryuk", "Ryuk", "dn", "Shinigami", 10, "Apples|Wings|Boredom", "zeno|power|beerus"],
  // Code Geass
  ["lelouch", "Lelouch Lamperouge", "cg", "Zero", 86, "Command|Chess|Mask", "light|aizen|armin"],
  // JoJo
  ["dio", "DIO", "jojo", "The World", 20, "Time stop|Vampire|Road roller", "jotaro|sukuna|alucard", "Dio Brando"],
  ["jotaro", "Jotaro Kujo", "jojo", "Star Platinum", 40, "Hat|Ora ora|Stand", "dio|giorno|saitama", "Jotaro"],
  ["giorno", "Giorno Giovanna", "jojo", "Gold Experience Requiem", 92, "Dream|Ladybug|Gang", "jotaro|lelouch|dio"],
  // My Hero Academia
  ["allmight", "All Might", "mha", "Symbol of Peace", 88, "Smile|Symbol|Plus ultra", "whitebeard|netero|kamina"],
  ["deku", "Izuku Midoriya", "mha", "One For All", 72, "Notebook|Quirkless|Green", "gohan|yuji|asta"],
  ["afo", "All For One", "mha", "Symbol of Evil", 50, "Stealing|Mask|Mastermind", "aizen|makima|blackbeard"],
  ["bakugo", "Katsuki Bakugo", "mha", "Ground Zero", 30, "Explosions|Anger|Rival", "vegeta|sasuke|deku", "Katsuki Bakugou"],
  ["todoroki", "Shoto Todoroki", "mha", "Half-Cold Half-Hot", 50, "Ice|Fire|Scar", "mustang|sasuke|accelerator", "Shouto Todoroki"],
  // Demon Slayer
  ["tanjiro", "Tanjiro Kamado", "kny", "Sun Breathing", 72, "Earrings|Smell|Kind", "gon|yuji|mikasa", "Tanjirou Kamado"],
  ["nezuko", "Nezuko Kamado", "kny", "Demon Sister", 60, "Bamboo|Box|Pink kimono", "power|mikasa|anya"],
  ["rengoku", "Kyojuro Rengoku", "kny", "Flame Hashira", 70, "Flames|Heart|Bento", "allmight|kamina|ace", "Kyoujurou Rengoku"],
  ["zenitsu", "Zenitsu Agatsuma", "kny", "Thunderclap", 40, "Thunder|Sleep|Cowardly", "killua|minato|denji"],
  ["yoriichi", "Yoriichi Tsugikuni", "kny", "Origin of Breathing", 52, "Sun|Earrings|Twin", "kokushibo|saitama|netero"],
  ["muzan", "Muzan Kibutsuji", "kny", "Demon King", 10, "Demon King|Hat|Blue lily", "frieza|alucard|kaido"],
  ["kokushibo", "Kokushibo", "kny", "Upper Moon One", 15, "Six eyes|Moon|Brother", "yoriichi|byakuya|madara", "Kokushibo"],
  // Hellsing
  ["alucard", "Alucard", "hel", "No-Life King", 10, "Vampire|Red coat|Hounds", "dio|muzan|kaneki"],
  // Black Clover
  ["asta", "Asta", "bc", "Anti-Magic Devil", 62, "No magic|Push-ups|Shouting", "deku|luffy|naruto"],
  ["yami", "Yami Sukehiro", "bc", "Captain of the Black Bulls", 74, "Darkness|Limits|Toilet", "kakashi|shanks|toji"],
  // Mob Psycho
  ["mob", "Shigeo Kageyama", "mob", "???%", 70, "Bowl cut|Percentage|Psychic", "saitama|tatsumaki|eren"],
  // Overlord
  ["ainz", "Ainz Ooal Gown", "ovl", "Sorcerer King", 62, "Skeleton|Overthinking|Ring", "jinwoo|anos|rimuru"],
  // Slime
  ["rimuru", "Rimuru Tempest", "ts", "Ultimate Slime God", 92, "Slime|Predator|Nation", "ainz|anos|jinwoo"],
  // Misfit
  ["anos", "Anos Voldigoad", "mk", "Demon King of Tyranny", 72, "Demon King|Reincarnated|Smirk", "rimuru|ainz|saitama"],
  // Chainsaw Man
  ["makima", "Makima", "csm", "Control Devil", 62, "Control|Dogs|Ringed eyes", "afo|aizen|hisoka"],
  ["denji", "Denji", "csm", "Chainsaw Man", 40, "Chainsaw|Bread|Dog", "yuji|power|asta"],
  ["power", "Power", "csm", "Blood Fiend", 40, "Blood|Horns|Cat", "nezuko|denji|ryuk"],
  ["aki", "Aki Hayakawa", "csm", "Fox Devil Contract", 55, "Topknot|Sword|Cigarette", "levi|kurapika|megumi"],
  // Index
  ["accelerator", "Accelerator", "idx", "Level 5 #1", 40, "Vectors|White hair|Coffee", "gojo|tatsumaki|todoroki"],
  // Frieren
  ["frieren", "Frieren", "fr", "The Slayer", 72, "Elf|Grimoires|Mimic", "himmel|beatrice|ainz"],
  ["himmel", "Himmel", "fr", "The Hero", 90, "Hero|Statue|Narcissist", "artoria|kamina|allmight"],
  ["fern", "Fern", "fr", "Prodigy Mage", 55, "Purple|Basic spell|Grumpy", "frieren|megumi|homura"],
  // FMA
  ["edward", "Edward Elric", "fma", "Fullmetal Alchemist", 62, "Metal arm|Short|Clap", "deku|armin|genos"],
  ["mustang", "Roy Mustang", "fma", "Flame Alchemist", 52, "Fire|Snap|Ambition", "ace|todoroki|rengoku"],
  ["father", "Father", "fma", "God-Eater Homunculus", 20, "God|Homunculus|Flask", "yhwach|aizen|afo", "Dwarf in the Flask"],
  // Tokyo Ghoul
  ["kaneki", "Ken Kaneki", "tg", "One-Eyed King", 32, "Eyepatch|Centipede|Coffee", "eren|alucard|denji"],
  // SAO
  ["kirito", "Kirito", "sao", "Black Swordsman", 60, "Dual swords|Black coat|Gamer", "asta|ichigo|jinwoo"],
  // Spy x Family
  ["loid", "Loid Forger", "sxf", "Twilight", 70, "Spy|Disguise|Fake family", "lelouch|light|L"],
  ["yor", "Yor Forger", "sxf", "Thorn Princess", 40, "Assassin|Needles|Bad cooking", "mikasa|nezuko|killua"],
  ["anya", "Anya Forger", "sxf", "Telepath", 70, "Peanuts|Mind reading|Heh", "chopper|power|haruhi"],
];

function initialsOf(name: string): string {
  return name
    .replace(/[^A-Za-z .]/g, "")
    .split(/[ .]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const CHARACTERS: Character[] = SEEDS.map(([key, name, series, title, sup, clues, similar, search]) => {
  const p = PROFILES[key];
  if (!p) throw new Error(`No power-scaling profile for ${key}`);
  const scaling: Scaling = { ap: p[0], dur: p[1], spd: p[2], iq: p[3], hax: p[4], feat: p[5] };
  const stats = { ...displayStats(scaling), sup };
  const rating = combatRating(scaling);
  return {
    key,
    name,
    search: search ?? name,
    series,
    title,
    stats,
    clues: clues.split("|"),
    similar: similar.split("|"),
    scaling,
    rating,
    tier: tierFor(scaling, rating),
    initials: initialsOf(name),
  };
});

export const CHARACTER_BY_KEY: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.key, c]));
