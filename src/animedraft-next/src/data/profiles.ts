import type { Profile } from "./scaling";

/**
 * Power-scaling profile for every character, synthesised from their strongest canon feats and
 * common power-scaling consensus. See scaling.ts for the ladders.
 *
 *   [attack level 0–17, durability level 0–17, speed 0–12, intellect 0–7, hax 0–5, key feat]
 *
 * Levels: 0 Street · 1 Wall · 2 Building · 3 City Block · 4 Town · 5 City · 6 Mountain · 7 Island ·
 *         8 Country · 9 Continent · 10 Planet · 11 Star · 12 Solar System · 13 Galaxy · 14 Universe ·
 *         15 Multiverse · 16 Outerverse · 17 Boundless
 * Speed:  0 Peak Human … 4 Hypersonic · 5 Massively Hypersonic · 6 Relativistic · 7 Lightspeed · 8 FTL ·
 *         9 Massively FTL · 10 Infinite · 11 Immeasurable · 12 Irrelevant
 */
export const PROFILES: Record<string, Profile> = {
  // Gurren Lagann
  simon: [16, 16, 12, 3, 5, "Super Tengen Toppa Gurren Lagann threw galaxies like shuriken and drilled out of the Anti-Spiral's infinite-dimensional labyrinth."],
  kamina: [4, 4, 3, 1, 1, "Piloted Gurren on pure fighting spirit and taught Simon to pierce the heavens."],
  // Umineko
  featherine: [17, 17, 12, 7, 5, "Author-level Creator: writes and rewrites whole Game Boards. Other witches are characters in her stories."],
  bernkastel: [16, 16, 12, 6, 5, "Witch of Miracles: makes any event with a non-zero chance happen and plays with fragments across infinite worlds."],
  beatrice: [15, 15, 11, 5, 4, "Golden Witch who rules a Game Board, resurrects the dead at will and speaks the red truth."],
  // Madoka
  madoka: [16, 16, 12, 4, 5, "Rewrote the laws of the universe across every timeline to erase witches before they're born."],
  homura: [16, 15, 12, 5, 5, "Tore a piece away from the Law of Cycles and rewrote the universe as the Devil."],
  // Haruhi
  haruhi: [16, 15, 10, 4, 5, "Unconsciously creates closed spaces and may have created the world itself; reality bends to her mood."],
  // Dragon Ball
  goku: [14, 14, 9, 2, 2, "Mastered Ultra Instinct and fought Jiren while the Tournament of Power's arena crumbled."],
  vegeta: [14, 14, 9, 3, 2, "Ultra Ego Vegeta grows stronger the more damage he takes and stood toe-to-toe with Granolah."],
  gohan: [14, 14, 9, 4, 1, "Beast Gohan's Special Beam Cannon blew away Cell Max."],
  broly: [14, 14, 9, 1, 1, "Fought Goku and Vegeta to a standstill until they had to fuse into Gogeta."],
  zeno: [15, 12, 11, 1, 5, "Erases entire universes, gods included, with a wave of his hand."],
  whis: [15, 14, 10, 5, 4, "An Angel who trains Gods of Destruction and can rewind time by three minutes."],
  beerus: [14, 14, 9, 3, 4, "God of Destruction whose Hakai erases souls; his clash with Super Saiyan God Goku shook the universe."],
  frieza: [14, 14, 9, 4, 1, "Black Frieza one-shot Ultra Instinct Goku and Ultra Ego Vegeta at the same time."],
  // One Punch Man
  saitama: [13, 13, 9, 1, 2, "Out-copied Cosmic Garou and punched hard enough to travel back in time."],
  tatsumaki: [7, 5, 4, 3, 3, "Ripped the Monster Association's entire underground base out of the earth single-handedly."],
  garou: [13, 12, 9, 3, 3, "Cosmic Fear Mode: copied Saitama's style and fired a gamma-ray burst at him."],
  genos: [5, 4, 4, 3, 1, "His Incinerate cannons blasted apart a building-sized meteor fragment."],
  // Solo Leveling
  jinwoo: [11, 11, 7, 4, 4, "Defeated the Dragon Emperor Antares and rewound time with the Cup of Reincarnation."],
  // Jujutsu Kaisen
  gojo: [5, 6, 5, 5, 4, "Infinity stops anything from touching him; Unlimited Void floods foes with infinite information."],
  sukuna: [5, 5, 5, 5, 4, "World-Cutting Slash cut through Gojo's Infinity by slicing space itself."],
  yuji: [4, 4, 5, 2, 2, "Lands Black Flashes at will and strikes souls directly, even Sukuna's."],
  yuta: [5, 5, 5, 3, 4, "Near-limitless cursed energy with Rika; copies techniques and heals with Reverse Cursed Technique."],
  megumi: [3, 3, 4, 4, 3, "Ten Shadows can summon Mahoraga, the adaptation shikigami no sorcerer ever tamed."],
  toji: [3, 4, 5, 4, 2, "Killed Gojo in his prime with zero cursed energy."],
  // Bleach
  aizen: [10, 11, 8, 6, 5, "Kyoka Suigetsu's complete hypnosis fooled every captain for a century; the Hogyoku made him immortal."],
  yhwach: [11, 11, 8, 5, 5, "The Almighty sees every possible future and rewrites it; he shattered Ichigo's Bankai."],
  ichigo: [10, 10, 8, 2, 2, "Final Getsuga Tensho Ichigo overpowered Hogyoku-fused Aizen."],
  kenpachi: [9, 9, 7, 1, 1, "His Bankai cut down Gerard Valkyrie, a giant born from the Soul King's heart."],
  urahara: [7, 7, 7, 6, 4, "Created the Hogyoku and hid a sealing kido in his fight with Aizen."],
  unohana: [8, 8, 7, 4, 3, "The first Kenpachi: the only one able to teach Zaraki how to really fight."],
  orihime: [2, 6, 2, 2, 5, "Shun Shun Rikka rejects events themselves, undoing damage as if it never happened."],
  byakuya: [7, 7, 7, 4, 2, "Senbonzakura Kageyoshi scatters a million blades that move faster than the eye can see."],
  // Naruto
  naruto: [9, 9, 6, 2, 3, "Six Paths Sage Mode Naruto sealed Kaguya alongside Sasuke."],
  sasuke: [9, 8, 6, 4, 4, "Rinne Sharingan swaps through dimensions; Indra's Arrow matched Naruto's strongest Rasengan."],
  madara: [10, 9, 6, 4, 4, "As the Ten-Tails jinchuriki he cast the Infinite Tsukuyomi over the entire planet."],
  itachi: [5, 5, 5, 5, 4, "Tsukuyomi, Izanami, and a Totsuka Sword that seals whatever it pierces."],
  kakashi: [6, 6, 5, 5, 3, "Kamui warps anything into another dimension; used Perfect Susanoo against Kaguya."],
  minato: [6, 5, 7, 5, 3, "Flying Thunder God: teleports across a battlefield faster than anyone can react."],
  pain: [7, 6, 5, 4, 4, "Shinra Tensei flattened Konoha; Chibaku Tensei can make a moon."],
  kaguya: [10, 10, 6, 3, 5, "Creates whole dimensions at will and is the source of all chakra."],
  tsunade: [5, 6, 4, 4, 3, "The Byakugo seal regenerates her from fatal wounds; she kept the Five Kage alive."],
  shikamaru: [2, 2, 3, 6, 2, "IQ over 200: trapped Hidan with a plan laid out days in advance."],
  // One Piece
  luffy: [7, 8, 5, 1, 4, "Gear 5 Nika turns the world around him to rubber; defeated Kaido."],
  zoro: [7, 7, 5, 1, 3, "King of Hell Zoro cut Kaido and outlasted King of the Lunarians."],
  shanks: [7, 7, 5, 4, 3, "Ended the Marineford war just by arriving; his Haki knocks out armies."],
  whitebeard: [8, 7, 4, 3, 3, "The Tremor-Tremor Fruit could, in his words, destroy the world; he tilted Marineford's sea."],
  kaido: [7, 8, 5, 2, 2, "Strongest Creature: survived executions, suicide attempts and Yonko-level attacks."],
  chopper: [3, 3, 3, 5, 2, "Monster Point Chopper fought Queen, then cured the Ice Oni virus."],
  ace: [6, 5, 4, 2, 2, "Logia fire body; Fire Fist burned through a whole fleet."],
  blackbeard: [8, 7, 4, 4, 4, "Holds two Devil Fruits: Darkness nullifies powers, Tremor shatters the sea."],
  // Hunter x Hunter
  meruem: [4, 5, 4, 6, 2, "Mastered Gungi, Go and Nen in days and survived Netero's Zero Hand."],
  netero: [4, 3, 5, 4, 2, "Hundred-Type Guanyin Bodhisattva prays faster than sound."],
  gon: [4, 4, 4, 1, 2, "Sacrificed his future Nen to become Adult Gon and annihilated Pitou."],
  killua: [3, 3, 6, 4, 2, "Godspeed: moves and reacts at the speed of his own lightning."],
  hisoka: [3, 3, 4, 4, 2, "Revived himself with post-mortem Nen after losing to Chrollo."],
  chrollo: [3, 3, 4, 5, 4, "Skill Hunter steals other people's Nen abilities and combines them."],
  kurapika: [3, 3, 4, 5, 4, "Emperor Time grants every Nen category; Judgment Chain kills anyone who breaks a vow."],
  // Attack on Titan
  eren: [8, 7, 2, 3, 4, "The Founding Titan: unleashed the Rumbling and rewrote memories through the Paths."],
  levi: [2, 2, 3, 4, 1, "Shredded the Beast Titan in seconds and cut down a whole squad of titans."],
  armin: [5, 3, 2, 5, 1, "His Colossal Titan transformation went off like a nuclear blast in Liberio."],
  mikasa: [2, 2, 3, 3, 1, "Ackerman awakening; she struck the blow that ended the Rumbling."],
  // Seven Deadly Sins
  escanor: [8, 7, 5, 3, 2, "The One at high noon: burned through Estarossa and stood against the Demon King."],
  meliodas: [9, 9, 6, 3, 3, "Assault Mode and the Demon King's power; Full Counter reflects any magic back."],
  // Fate
  gilgamesh: [10, 6, 7, 4, 5, "Ea's Enuma Elish ruptures space-time; the Gate of Babylon holds the prototype of every Noble Phantasm."],
  artoria: [7, 6, 6, 3, 3, "Excalibur's beam can level a city; Avalon makes her nearly untouchable."],
  // Death Note
  light: [0, 0, 0, 6, 5, "Killed thousands as Kira with nothing but a name and a face."],
  L: [0, 0, 0, 6, 1, "Narrowed Kira down to the Kanto region with one televised bluff on day one."],
  ryuk: [1, 5, 3, 2, 5, "A shinigami: immortal to humans, kills by writing a name."],
  // Code Geass
  lelouch: [0, 0, 0, 6, 4, "Geass grants absolute obedience; he out-strategised Britannia's entire military."],
  // JoJo
  dio: [4, 4, 6, 4, 4, "The World stops time for up to nine seconds; vampire regeneration does the rest."],
  jotaro: [3, 3, 6, 4, 4, "Star Platinum: The World stops time and caught a bullet in mid-air."],
  giorno: [4, 6, 6, 4, 5, "Gold Experience Requiem returns any action to zero; trapped Diavolo in infinite deaths."],
  // My Hero Academia
  allmight: [5, 5, 4, 2, 1, "United States of Smash changed the weather with a single punch."],
  deku: [5, 5, 5, 4, 3, "Wields all nine One For All quirks; brought down Shigaraki."],
  afo: [5, 5, 4, 5, 4, "All For One steals quirks and stacks hundreds of them."],
  bakugo: [4, 4, 5, 4, 1, "Howitzer Impact; restarted his own heart mid-battle."],
  todoroki: [5, 4, 4, 3, 2, "Builds glaciers in a second and fires Flashfire Fist."],
  // Demon Slayer
  tanjiro: [2, 2, 3, 3, 2, "Sun Breathing's 13th form and the Selfless State let him see through Muzan."],
  nezuko: [2, 3, 3, 1, 3, "Conquered the sun; Exploding Blood burns demon flesh."],
  rengoku: [2, 2, 3, 3, 1, "Held off Upper Moon Three Akaza until dawn."],
  zenitsu: [2, 2, 4, 1, 1, "Thunderclap and Flash: Godspeed beheaded an Upper Moon."],
  yoriichi: [4, 3, 5, 4, 3, "Nearly killed Muzan alone; Muzan still feared him 400 years later."],
  muzan: [3, 5, 4, 4, 3, "Seven hearts, five brains: regenerates from almost total destruction."],
  kokushibo: [3, 3, 4, 4, 2, "Moon Breathing fills the air with crescent blades."],
  // Hellsing
  alucard: [5, 11, 5, 4, 5, "Absorbed 3.4 million souls; after Schrödinger he exists everywhere and nowhere."],
  // Black Clover
  asta: [6, 6, 5, 2, 4, "Anti-magic negates any spell; he cut down Lucifero, the supreme devil."],
  yami: [6, 5, 5, 3, 3, "Dimension Slash cuts through space itself."],
  // Mob Psycho
  mob: [6, 5, 3, 2, 4, "???% Mob nearly wiped out Seasoning City in one burst of emotion."],
  // Overlord
  ainz: [6, 6, 6, 5, 5, "Iä Shub-Niggurath killed 70,000 soldiers in one cast; immune to time stop and instant death."],
  // Slime
  rimuru: [16, 16, 12, 7, 5, "As a True Dragon with Ciel he created his own universe and devours concepts with Beelzebuth."],
  // Misfit
  anos: [16, 17, 12, 6, 5, "Destroys the very order of the world, and even destroyed his own destruction."],
  // Chainsaw Man
  makima: [5, 8, 4, 5, 5, "Every wound she takes is transferred to a random citizen; she controls anyone she sees as beneath her."],
  denji: [4, 7, 4, 1, 4, "Chainsaw Man's true form erases whatever devil it eats from existence."],
  power: [2, 3, 3, 0, 2, "Blood Fiend: shapes weapons from her own blood."],
  aki: [2, 2, 3, 3, 3, "Future Devil contract shows moments ahead; Curse Devil kills with three nails."],
  // Index
  accelerator: [6, 7, 5, 5, 5, "Reflects every vector (bullets, light, radiation); his black wings rewrote physics."],
  // Frieren
  frieren: [5, 4, 4, 5, 3, "The Slayer: has killed more demons than any mage in history."],
  himmel: [3, 3, 4, 3, 1, "The hero who slew the Demon King."],
  fern: [3, 2, 4, 4, 2, "Fires Zoltraak faster than demons can perceive it."],
  // FMA
  edward: [3, 2, 3, 5, 3, "Transmutes without a circle; beat Father as a human."],
  mustang: [5, 2, 3, 5, 2, "Flame Alchemy burned Lust to ash again and again."],
  father: [10, 9, 6, 5, 5, "Absorbed God itself and made a miniature sun in his hand."],
  // Tokyo Ghoul
  kaneki: [5, 6, 4, 4, 2, "Dragon Kaneki grew to cover Tokyo's 24th ward."],
  // SAO
  kirito: [4, 3, 5, 3, 3, "In the Underworld, Incarnation lets him override the world's system with imagination."],
  // Spy x Family
  loid: [1, 1, 1, 5, 1, "Twilight: Westalis' top spy, the man with a hundred faces."],
  yor: [2, 2, 3, 2, 1, "Thorn Princess: kicked a car to scrap and cut through dozens of assassins."],
  anya: [0, 0, 0, 2, 3, "Reads minds, mostly about peanuts."],
};
