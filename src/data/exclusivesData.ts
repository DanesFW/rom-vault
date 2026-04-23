export interface ExclusiveSeed {
  title: string;
  publisher: string;
  note: string;
  genres: string[];
}

export interface ExclusiveList {
  id: string;
  console_id: string;
  label: string;
  description: string;
  count: number;
  games: ExclusiveSeed[];
}

export const EXCLUSIVE_LISTS: ExclusiveList[] = [

  // ── NES ──────────────────────────────────────────────────────────────────

  {
    id: "nes-essentials", console_id: "nes",
    label: "NES Essentials", description: "The definitive must-plays that defined the console", count: 10,
    games: [
      { title: "Super Mario Bros. 3",              publisher: "Nintendo",    note: "The pinnacle of NES platforming — never surpassed on the hardware",                          genres: ["Platformer"] },
      { title: "Mega Man 2",                        publisher: "Capcom",      note: "The high point of the classic Mega Man series, still holds up perfectly",                    genres: ["Action", "Platformer"] },
      { title: "Castlevania III: Dracula's Curse",  publisher: "Konami",      note: "The most ambitious Castlevania on NES with branching paths and multiple characters",         genres: ["Action", "Platformer"] },
      { title: "Contra",                            publisher: "Konami",      note: "The run-and-gun that defined the genre, best experienced in co-op",                          genres: ["Run-and-Gun"] },
      { title: "Bionic Commando",                   publisher: "Capcom",      note: "Ahead of its time — grappling hook platformer with no jump button",                          genres: ["Action", "Platformer"] },
      { title: "Ninja Gaiden",                      publisher: "Tecmo",       note: "Introduced cinematic storytelling to action games",                                           genres: ["Action"] },
      { title: "Little Samson",                     publisher: "Taito",       note: "One of the rarest and most polished NES action games ever made",                             genres: ["Action", "Platformer"] },
      { title: "DuckTales",                         publisher: "Capcom",      note: "Capcom's masterpiece licensed game — Scrooge McDuck's pogo cane is iconic",                  genres: ["Platformer"] },
      { title: "Battletoads",                       publisher: "Tradewest",   note: "Brutally hard but technically impressive brawler/platformer hybrid",                          genres: ["Beat-em-up", "Platformer"] },
      { title: "Kirby's Adventure",                 publisher: "Nintendo",    note: "The last great NES game — pushes the hardware beyond belief",                                genres: ["Platformer"] },
    ],
  },

  // ── SNES ─────────────────────────────────────────────────────────────────

  {
    id: "snes-essentials", console_id: "snes",
    label: "SNES Essentials", description: "The gold standard library — games that still hold up today", count: 15,
    games: [
      { title: "Super Metroid",                       publisher: "Nintendo",      note: "One of the greatest games ever made — the gold standard of atmospheric exploration",       genres: ["Action", "Adventure"] },
      { title: "Chrono Trigger",                      publisher: "Squaresoft",    note: "Universally regarded as the best JRPG ever made",                                          genres: ["JRPG"] },
      { title: "Final Fantasy VI",                    publisher: "Squaresoft",    note: "The peak of 16-bit RPGs — 14 playable characters, masterful story",                        genres: ["JRPG"] },
      { title: "Super Mario World",                   publisher: "Nintendo",      note: "The best 2D Mario game and the best SNES launch title",                                    genres: ["Platformer"] },
      { title: "The Legend of Zelda: A Link to the Past", publisher: "Nintendo", note: "Set the template for 2D Zelda and still the best of them",                                genres: ["Action", "Adventure"] },
      { title: "Donkey Kong Country 2",               publisher: "Nintendo",      note: "The peak of the DKC trilogy — better than the original in every way",                     genres: ["Platformer"] },
      { title: "Street Fighter II Turbo",             publisher: "Capcom",        note: "The definitive console fighting game of the era",                                          genres: ["Fighting"] },
      { title: "Contra III: The Alien Wars",          publisher: "Konami",        note: "Pushes the SNES hardware with Mode 7 and relentless action",                              genres: ["Run-and-Gun"] },
      { title: "Mega Man X",                          publisher: "Capcom",        note: "The best Mega Man game — X's dash and wall-climb changed the series forever",              genres: ["Action", "Platformer"] },
      { title: "Terranigma",                          publisher: "Enix",          note: "Quintet's masterpiece — never officially released in North America",                       genres: ["Action-RPG"] },
      { title: "Illusion of Gaia",                    publisher: "Enix",          note: "Atmospheric action-RPG with a surprisingly mature story",                                  genres: ["Action-RPG"] },
      { title: "EarthBound",                          publisher: "Nintendo",      note: "Quirky modern-day RPG — ahead of its time in tone and design",                            genres: ["JRPG"] },
      { title: "Super Castlevania IV",                publisher: "Konami",        note: "The best 16-bit Castlevania with incredible music and control",                            genres: ["Action", "Platformer"] },
      { title: "Yoshi's Island",                      publisher: "Nintendo",      note: "Technical marvel using the SA-1 chip — a platformer unlike any other",                    genres: ["Platformer"] },
      { title: "Lufia II: Rise of the Sinistrals",    publisher: "Natsume",       note: "Overlooked JRPG gem with revolutionary puzzle dungeons",                                   genres: ["JRPG", "Puzzle"] },
    ],
  },

  {
    id: "snes-hidden-gems", console_id: "snes",
    label: "SNES Hidden Gems", description: "Overlooked treasures most people have never played", count: 10,
    games: [
      { title: "Demon's Crest",          publisher: "Capcom",     note: "Capcom's dark gothic action game — a cult classic that deserves far more attention",       genres: ["Action", "Platformer"] },
      { title: "Pocky & Rocky",          publisher: "Natsume",    note: "Gorgeous co-op shooter with some of the best sprite art on the system",                    genres: ["Shooter"] },
      { title: "Soul Blazer",            publisher: "Enix",       note: "First in Quintet's action-RPG trilogy — depopulate dungeons to restore the world",         genres: ["Action-RPG"] },
      { title: "Ogre Battle: March of the Black Queen", publisher: "Enix", note: "Epic real-time strategy RPG — one of the deepest SNES games",                   genres: ["Strategy", "RPG"] },
      { title: "Actraiser",              publisher: "Enix",       note: "Unique blend of action platformer and city-builder — nothing else like it",               genres: ["Action", "Simulation"] },
      { title: "Cybernator",             publisher: "Konami",     note: "Intense mech shooter that goes largely unnoticed in the SNES library",                    genres: ["Shooter", "Action"] },
      { title: "Breath of Fire II",      publisher: "Capcom",     note: "Underrated JRPG sequel with great characters and a dark tone",                           genres: ["JRPG"] },
      { title: "Robotrek",               publisher: "Enix",       note: "Enix RPG where you build and program robots to fight — criminally overlooked",            genres: ["JRPG"] },
      { title: "Run Saber",              publisher: "Atlus",      note: "Superb Strider-inspired action platformer — only a few thousand copies in circulation",   genres: ["Action", "Platformer"] },
      { title: "Bahamut Lagoon",         publisher: "Squaresoft", note: "Square RPG/strategy hybrid — Japan only, fan translation essential",                      genres: ["Strategy", "JRPG"] },
    ],
  },

  // ── N64 ──────────────────────────────────────────────────────────────────

  {
    id: "n64-essentials", console_id: "n64",
    label: "N64 Essentials", description: "The games that defined 3D gaming as we know it", count: 12,
    games: [
      { title: "The Legend of Zelda: Ocarina of Time", publisher: "Nintendo", note: "Widely considered the greatest game ever made — invented 3D action-adventure", genres: ["Action", "Adventure"] },
      { title: "The Legend of Zelda: Majora's Mask",   publisher: "Nintendo", note: "Dark, experimental follow-up with an unforgettable three-day time loop",       genres: ["Action", "Adventure"] },
      { title: "Super Mario 64",            publisher: "Nintendo",       note: "Invented 3D platforming — every 3D game owes a debt to this one",                        genres: ["Platformer"] },
      { title: "GoldenEye 007",             publisher: "Nintendo",       note: "Invented the console FPS — multiplayer deathmatch still holds up",                       genres: ["Shooter"] },
      { title: "Banjo-Kazooie",             publisher: "Nintendo",       note: "Rare's masterpiece collect-a-thon — the best N64 platformer after Mario 64",             genres: ["Platformer"] },
      { title: "Conker's Bad Fur Day",      publisher: "Nintendo",       note: "Mature, hilariously subversive platformer that pushed the N64 to its limits",            genres: ["Platformer", "Action"] },
      { title: "Donkey Kong 64",            publisher: "Nintendo",       note: "The most ambitious collect-a-thon ever made — requires the Expansion Pak",               genres: ["Platformer"] },
      { title: "Star Fox 64",               publisher: "Nintendo",       note: "The definitive Star Fox experience — rail shooter perfection",                           genres: ["Shooter"] },
      { title: "Wave Race 64",              publisher: "Nintendo",       note: "Still the best wave physics in any racing game 25 years later",                          genres: ["Racing", "Sports"] },
      { title: "F-Zero X",                  publisher: "Nintendo",       note: "30 cars at 60fps — blistering anti-gravity racing",                                      genres: ["Racing"] },
      { title: "Paper Mario",               publisher: "Nintendo",       note: "The first Paper Mario — charming RPG that started an iconic series",                     genres: ["JRPG"] },
      { title: "Blast Corps",               publisher: "Nintendo",       note: "Rare's bizarre demolition puzzle game — totally unlike anything else",                   genres: ["Action", "Puzzle"] },
    ],
  },

  // ── GameCube ─────────────────────────────────────────────────────────────

  {
    id: "gc-essentials", console_id: "gc",
    label: "GameCube Essentials", description: "Nintendo's most underrated console had an incredible library", count: 12,
    games: [
      { title: "Resident Evil 4",           publisher: "Capcom",           note: "Redefined third-person action games — one of the best games ever made",                  genres: ["Action", "Horror"] },
      { title: "Metroid Prime",             publisher: "Nintendo",         note: "Translated Metroid into 3D perfectly — atmospheric masterpiece",                         genres: ["Shooter", "Adventure"] },
      { title: "F-Zero GX",                 publisher: "Nintendo",         note: "The greatest racing game ever made by many accounts — still unmatched for speed",        genres: ["Racing"] },
      { title: "The Legend of Zelda: The Wind Waker", publisher: "Nintendo", note: "Cel-shaded masterpiece — controversial at launch, universally loved now",             genres: ["Action", "Adventure"] },
      { title: "Pikmin 2",                  publisher: "Nintendo",         note: "The refined sequel — more caves, more Pikmin types, more depth",                         genres: ["Strategy", "Puzzle"] },
      { title: "Super Mario Sunshine",      publisher: "Nintendo",         note: "FLUDD-powered platforming across a sunny vacation island",                              genres: ["Platformer"] },
      { title: "Fire Emblem: Path of Radiance", publisher: "Nintendo",    note: "Fan-favourite Fire Emblem entry — never remastered, GCN exclusive",                     genres: ["Strategy", "JRPG"] },
      { title: "Eternal Darkness: Sanity's Requiem", publisher: "Nintendo", note: "Silicon Knights' psychological horror — broke the fourth wall with sanity effects",   genres: ["Horror", "Action"] },
      { title: "Paper Mario: The Thousand-Year Door", publisher: "Nintendo", note: "The best Paper Mario game — never officially remastered until very recently",        genres: ["JRPG"] },
      { title: "Kirby Air Ride",            publisher: "Nintendo",         note: "Unique auto-racing with the beloved City Trial mode — GCN exclusive",                   genres: ["Racing"] },
      { title: "Pokemon Colosseum",         publisher: "Nintendo",         note: "The only Pokemon console RPG of the era — shadow Pokemon mechanic is great",            genres: ["JRPG"] },
      { title: "Skies of Arcadia Legends",  publisher: "Sega",             note: "Port of the Dreamcast classic — pirate airship JRPG at its finest",                    genres: ["JRPG"] },
    ],
  },

  // ── GBA ──────────────────────────────────────────────────────────────────

  {
    id: "gba-essentials", console_id: "gba",
    label: "GBA Essentials", description: "The best handheld library ever assembled", count: 12,
    games: [
      { title: "Mother 3",                  publisher: "Nintendo",       note: "HAL Laboratory's emotional masterpiece — still no official English release",             genres: ["JRPG"] },
      { title: "Golden Sun",                publisher: "Nintendo",       note: "Camelot's stunning JRPG — pushed GBA visuals beyond what seemed possible",              genres: ["JRPG"] },
      { title: "Golden Sun: The Lost Age",  publisher: "Nintendo",       note: "The even better sequel — bigger world, deeper story, more Djinn",                       genres: ["JRPG"] },
      { title: "Metroid Fusion",            publisher: "Nintendo",       note: "Atmospheric Metroid on handheld — one of the best in the series",                       genres: ["Action", "Adventure"] },
      { title: "Metroid: Zero Mission",     publisher: "Nintendo",       note: "Remake of the original with new areas and a secret ending",                             genres: ["Action", "Adventure"] },
      { title: "Fire Emblem",               publisher: "Nintendo",       note: "The West's introduction to Fire Emblem — still one of the best in the series",          genres: ["Strategy", "JRPG"] },
      { title: "Castlevania: Aria of Sorrow", publisher: "Konami",       note: "The best GBA Castlevania — soul absorption system is endlessly satisfying",            genres: ["Action", "Platformer"] },
      { title: "Final Fantasy Tactics Advance", publisher: "Square Enix", note: "Deep tactical RPG set in Ivalice — 400+ missions worth of content",                  genres: ["Strategy", "JRPG"] },
      { title: "Advance Wars",              publisher: "Nintendo",       note: "The original strategy classic — bright, deep, and accessible",                          genres: ["Strategy"] },
      { title: "Tactics Ogre: The Knight of Lodis", publisher: "Atlus",  note: "Dense tactical RPG — the best in the Ogre saga on handheld",                          genres: ["Strategy", "JRPG"] },
      { title: "Mega Man Zero",             publisher: "Capcom",         note: "Brutally challenging action platformer with incredible pixel art",                      genres: ["Action", "Platformer"] },
      { title: "Drill Dozer",               publisher: "Nintendo",       note: "Game Freak's forgotten GBA gem — rumble pak support and brilliant level design",        genres: ["Platformer", "Action"] },
    ],
  },

  // ── DS ───────────────────────────────────────────────────────────────────

  {
    id: "ds-essentials", console_id: "ds",
    label: "DS Essentials", description: "The dual-screen library's finest moments", count: 10,
    games: [
      { title: "Pokemon HeartGold & SoulSilver", publisher: "Nintendo",       note: "The best Pokemon games ever made — Johto and Kanto combined",                     genres: ["JRPG"] },
      { title: "Castlevania: Order of Ecclesia", publisher: "Konami",         note: "The best DS Castlevania — Shanoa's glyph system is deeply satisfying",            genres: ["Action", "Platformer"] },
      { title: "The World Ends With You",   publisher: "Square Enix",         note: "Square Enix's cult classic — unique dual-screen combat and incredible style",      genres: ["Action-RPG"] },
      { title: "Dragon Quest IX",           publisher: "Square Enix",         note: "Massive co-op JRPG designed for local multiplayer — hundreds of hours",           genres: ["JRPG"] },
      { title: "Hotel Dusk: Room 215",      publisher: "Nintendo",            note: "Noir mystery visual novel — held sideways like a book, unforgettable atmosphere", genres: ["Adventure"] },
      { title: "Kirby: Canvas Curse",       publisher: "Nintendo",            note: "Brilliant touchscreen-first platformer — draw lines for Kirby to roll on",        genres: ["Platformer"] },
      { title: "Advance Wars: Dual Strike",  publisher: "Nintendo",           note: "The best Advance Wars game — dual front battles using both screens",              genres: ["Strategy"] },
      { title: "Elite Beat Agents",         publisher: "Nintendo",            note: "One of the best rhythm games ever made — irreverent and joyful",                  genres: ["Rhythm"] },
      { title: "Solatorobo: Red the Hunter", publisher: "Namco Bandai",       note: "CyberConnect2's gorgeous action-RPG — criminally overlooked",                    genres: ["Action-RPG"] },
      { title: "9 Hours, 9 Persons, 9 Doors", publisher: "Aksys Games",      note: "Gripping visual novel escape room thriller — the start of the Zero Escape series", genres: ["Adventure"] },
    ],
  },

  // ── 3DS ──────────────────────────────────────────────────────────────────

  {
    id: "3ds-essentials", console_id: "3ds",
    label: "3DS Essentials", description: "Nintendo's last dedicated handheld had a superb library", count: 12,
    games: [
      { title: "Fire Emblem: Awakening",    publisher: "Nintendo",     note: "The game that saved Fire Emblem — still one of the best in the series",               genres: ["Strategy", "JRPG"] },
      { title: "Bravely Default",           publisher: "Square Enix",  note: "Square Enix's JRPG renaissance — job system perfected",                               genres: ["JRPG"] },
      { title: "Kid Icarus: Uprising",      publisher: "Nintendo",     note: "Sora Ltd.'s chaotic, hilarious shooter with incredible voice work",                   genres: ["Shooter", "Action"] },
      { title: "Metroid: Samus Returns",    publisher: "Nintendo",     note: "MercurySteam's excellent Metroid II remake — added melee counter and Aeion abilities", genres: ["Action", "Adventure"] },
      { title: "The Legend of Zelda: A Link Between Worlds", publisher: "Nintendo", note: "Brilliant sequel to A Link to the Past using rental item system",        genres: ["Action", "Adventure"] },
      { title: "Shin Megami Tensei IV",     publisher: "Atlus",        note: "Dark post-apocalyptic JRPG — brutal and compelling",                                  genres: ["JRPG"] },
      { title: "Pokemon X & Y",             publisher: "Nintendo",     note: "The 3D Pokemon revolution — X/Y introduced Mega Evolution",                           genres: ["JRPG"] },
      { title: "Rhythm Heaven Megamix",     publisher: "Nintendo",     note: "The ultimate Rhythm Heaven compilation — over 100 games",                             genres: ["Rhythm"] },
      { title: "Fire Emblem Fates",         publisher: "Nintendo",     note: "Three routes with drastically different stories — the most ambitious FE",             genres: ["Strategy", "JRPG"] },
      { title: "Rune Factory 4",            publisher: "Natsume",      note: "The best Rune Factory — farming, dungeon crawling, and romance in one",               genres: ["JRPG", "Simulation"] },
      { title: "Etrian Odyssey IV",         publisher: "Atlus",        note: "Deep dungeon crawler with hand-drawn maps — the best entry point in the series",      genres: ["JRPG"] },
      { title: "Monster Hunter 4 Ultimate", publisher: "Capcom",       note: "The best Monster Hunter on handheld — online play with friends is incredible",        genres: ["Action-RPG"] },
    ],
  },

  // ── PS1 ──────────────────────────────────────────────────────────────────

  {
    id: "ps1-essentials", console_id: "ps1",
    label: "PS1 Essentials", description: "The games that defined a generation of PlayStation", count: 12,
    games: [
      { title: "Final Fantasy VII",          publisher: "Squaresoft",  note: "The JRPG that brought the genre to mainstream audiences — still emotionally impactful",  genres: ["JRPG"] },
      { title: "Final Fantasy IX",           publisher: "Squaresoft",  note: "The love letter to classic Final Fantasy — arguably the best in the series",            genres: ["JRPG"] },
      { title: "Xenogears",                  publisher: "Squaresoft",  note: "Square's epic sci-fi JRPG — never officially ported or remade",                        genres: ["JRPG"] },
      { title: "Vagrant Story",              publisher: "Squaresoft",  note: "Deep action-RPG with combat unlike anything else — still no sequel",                   genres: ["Action-RPG"] },
      { title: "Castlevania: Symphony of the Night", publisher: "Konami", note: "Invented the Metroidvania — the best Castlevania game ever made",                  genres: ["Action", "Platformer"] },
      { title: "Suikoden II",                publisher: "Konami",      note: "Often called the best JRPG ever made — never officially re-released for decades",      genres: ["JRPG"] },
      { title: "Parasite Eve",               publisher: "Squaresoft",  note: "Square's survival horror/RPG hybrid — unlike anything else on the platform",           genres: ["JRPG", "Horror"] },
      { title: "Einhander",                  publisher: "Squaresoft",  note: "Square's shooter masterpiece — never left PS1 until recently",                        genres: ["Shooter"] },
      { title: "Ape Escape",                 publisher: "Sony",        note: "Pioneered mandatory dual-analog gameplay — PlayStation exclusive classic",             genres: ["Platformer"] },
      { title: "Wild Arms",                  publisher: "Activision",  note: "Weird West JRPG with brilliant atmosphere and music",                                  genres: ["JRPG"] },
      { title: "Alundra",                    publisher: "Working Designs", note: "Dark Zelda-like action-RPG — challenging puzzles and emotional story",            genres: ["Action-RPG"] },
      { title: "Brave Fencer Musashi",       publisher: "Squaresoft",  note: "Underrated Square action-RPG with real-time combat — charming and deep",              genres: ["Action-RPG"] },
    ],
  },

  {
    id: "ps1-horror", console_id: "ps1",
    label: "PS1 Horror Essentials", description: "The PS1's horror library is unmatched — these defined the genre", count: 8,
    games: [
      { title: "Resident Evil 2",           publisher: "Capcom",        note: "The masterpiece of the classic RE era — Leon and Claire's dual campaigns",             genres: ["Horror", "Action"] },
      { title: "Resident Evil: Director's Cut", publisher: "Capcom",    note: "The game that invented survival horror as a genre",                                   genres: ["Horror", "Action"] },
      { title: "Silent Hill",               publisher: "Konami",        note: "Psychological horror masterpiece — fog and darkness used to terrifying effect",        genres: ["Horror"] },
      { title: "Parasite Eve",              publisher: "Squaresoft",    note: "Horror RPG hybrid based on the Japanese novel — unique and haunting",                  genres: ["Horror", "JRPG"] },
      { title: "Clock Tower",               publisher: "Human Entertainment", note: "Point-and-click survival horror with a relentless stalker",                     genres: ["Horror", "Adventure"] },
      { title: "Dino Crisis",               publisher: "Capcom",        note: "Resident Evil with dinosaurs — tense and fast-paced",                                  genres: ["Horror", "Action"] },
      { title: "Koudelka",                  publisher: "Infogrames",    note: "Dark RPG that serves as a prequel to Shadow Hearts — rarely talked about",            genres: ["Horror", "JRPG"] },
      { title: "Echo Night",                publisher: "From Software", note: "Obscure first-person ghost story — atmospheric and genuinely unsettling",              genres: ["Horror", "Adventure"] },
    ],
  },

  // ── PS2 ──────────────────────────────────────────────────────────────────

  {
    id: "ps2-essentials", console_id: "ps2",
    label: "PS2 Essentials", description: "The best-selling console ever had an extraordinary library", count: 15,
    games: [
      { title: "Shadow of the Colossus",    publisher: "Sony",          note: "One of gaming's greatest artistic achievements — 16 colossi, zero HUD",               genres: ["Action", "Adventure"] },
      { title: "Ico",                       publisher: "Sony",          note: "Minimalist puzzle-adventure that proved games could be art",                           genres: ["Adventure", "Puzzle"] },
      { title: "God of War II",             publisher: "Sony",          note: "The peak of PS2 action games — epic scale and satisfying combat",                     genres: ["Action"] },
      { title: "Kingdom Hearts II",         publisher: "Square Enix",   note: "The best Kingdom Hearts game — combat and world design vastly improved",              genres: ["Action-RPG"] },
      { title: "Final Fantasy XII",         publisher: "Square Enix",   note: "The gambit system and open world design was ahead of its time",                       genres: ["JRPG"] },
      { title: "Okami",                     publisher: "Capcom",        note: "Cel-shaded masterpiece — Zelda-like adventure with brush mechanics",                  genres: ["Action", "Adventure"] },
      { title: "Persona 4",                 publisher: "Atlus",         note: "Social simulation meets dungeon crawling — one of the best JRPGs ever made",          genres: ["JRPG"] },
      { title: "Silent Hill 2",             publisher: "Konami",        note: "Universally regarded as the scariest and best survival horror game ever made",        genres: ["Horror"] },
      { title: "Jak II",                    publisher: "Sony",          note: "Naughty Dog's open-world action game — darker and deeper than Jak 1",                genres: ["Action", "Platformer"] },
      { title: "Ratchet & Clank: Going Commando", publisher: "Sony",   note: "The peak of PS2 R&C — massive weapon upgrades and excellent level design",            genres: ["Platformer", "Shooter"] },
      { title: "Xenosaga Episode I",        publisher: "Namco",         note: "Ambitious space opera JRPG — the beginning of a cult classic trilogy",               genres: ["JRPG"] },
      { title: "Shadow Hearts: Covenant",   publisher: "Midway",        note: "The best Shadow Hearts game — judgment ring combat is endlessly satisfying",         genres: ["JRPG", "Horror"] },
      { title: "Haunting Ground",           publisher: "Capcom",        note: "Capcom's survival horror masterpiece — Fiona and Hewie vs. stalkers",                genres: ["Horror"] },
      { title: "Burnout 3: Takedown",       publisher: "EA",            note: "The greatest arcade racing game ever made — crash junctions are legendary",          genres: ["Racing"] },
      { title: "Dragon Quest VIII",         publisher: "Square Enix",   note: "Massive, beautiful JRPG — the game that popularized DQ in the West",                 genres: ["JRPG"] },
    ],
  },

  // ── PSP ──────────────────────────────────────────────────────────────────

  {
    id: "psp-essentials", console_id: "psp",
    label: "PSP Essentials", description: "Sony's first handheld punched well above its weight", count: 10,
    games: [
      { title: "Tactics Ogre: Let Us Cling Together", publisher: "Square Enix", note: "The definitive version of one of the greatest strategy RPGs ever made",      genres: ["Strategy", "JRPG"] },
      { title: "Crisis Core: Final Fantasy VII", publisher: "Square Enix",      note: "Prequel to FF7 — Zack's story told in an action-RPG format",                genres: ["Action-RPG"] },
      { title: "Monster Hunter Freedom Unite", publisher: "Capcom",             note: "The game that made Monster Hunter a phenomenon in the West",                  genres: ["Action-RPG"] },
      { title: "God of War: Chains of Olympus", publisher: "Sony",              note: "Console-quality action on handheld — impressive technical achievement",      genres: ["Action"] },
      { title: "Persona 3 Portable",        publisher: "Atlus",                 note: "The best way to play Persona 3 — added female protagonist option",           genres: ["JRPG"] },
      { title: "Jeanne d'Arc",              publisher: "Sony",                  note: "Level-5's tactical RPG reimagining of Joan of Arc — PSP exclusive",          genres: ["Strategy", "JRPG"] },
      { title: "Half-Minute Hero",          publisher: "Marvelous",             note: "Brilliant RPG parody — save the world in 30 seconds or less",               genres: ["JRPG"] },
      { title: "Valkyria Chronicles II",    publisher: "Sega",                  note: "Excellent strategy-RPG follow-up — the squad system is deeply satisfying",  genres: ["Strategy", "JRPG"] },
      { title: "Corpse Party",              publisher: "XSEED Games",           note: "Terrifying horror game — simple visuals hide one of the scariest stories",  genres: ["Horror", "Adventure"] },
      { title: "The Legend of Heroes: Trails in the Sky", publisher: "XSEED Games", note: "The beginning of one of the most ambitious RPG series ever written",    genres: ["JRPG"] },
    ],
  },

  // ── Vita ─────────────────────────────────────────────────────────────────

  {
    id: "vita-essentials", console_id: "vita",
    label: "PS Vita Essentials", description: "The underrated Vita had a genuinely great library", count: 10,
    games: [
      { title: "Persona 4 Golden",          publisher: "Atlus",           note: "The definitive version of arguably the best JRPG ever made",                       genres: ["JRPG"] },
      { title: "Killzone: Mercenary",       publisher: "Sony",            note: "The best handheld FPS ever made — console-quality graphics",                       genres: ["Shooter"] },
      { title: "Gravity Rush",              publisher: "Sony",            note: "Sony's unique gravity-manipulation action game — style and creativity overflow",    genres: ["Action", "Adventure"] },
      { title: "Soul Sacrifice",            publisher: "Sony",            note: "Dark monster-hunting RPG — sacrifice yourself or your companions for power",        genres: ["Action-RPG"] },
      { title: "Muramasa Rebirth",          publisher: "Aksys Games",     note: "Enhanced Vita version of Vanillaware's gorgeous action game",                      genres: ["Action"] },
      { title: "Tearaway",                  publisher: "Sony",            note: "Media Molecule's charming papercraft adventure — uses every Vita feature",         genres: ["Platformer", "Adventure"] },
      { title: "Danganronpa: Trigger Happy Havoc", publisher: "NIS America", note: "Visual novel murder mystery — the start of a beloved series",                genres: ["Adventure"] },
      { title: "Velocity 2X",               publisher: "Curve Digital",   note: "Outstanding shoot-em-up/platformer hybrid — Vita's finest arcade experience",     genres: ["Shooter", "Platformer"] },
      { title: "Oreshika: Tainted Bloodlines", publisher: "Sony",         note: "Deep, unusual JRPG — raise generations of clan members",                         genres: ["JRPG"] },
      { title: "Uncharted: Golden Abyss",   publisher: "Sony",            note: "Full Uncharted experience on handheld — technically remarkable",                  genres: ["Action", "Adventure"] },
    ],
  },

  // ── Genesis ──────────────────────────────────────────────────────────────

  {
    id: "genesis-essentials", console_id: "genesis",
    label: "Genesis Essentials", description: "Sega's 16-bit library at its finest", count: 12,
    games: [
      { title: "Sonic the Hedgehog 2",      publisher: "Sega",     note: "The Sonic that perfected the formula — Tails co-op and the spindash",               genres: ["Platformer"] },
      { title: "Streets of Rage 2",         publisher: "Sega",     note: "The greatest beat-em-up ever made — Yuzo Koshiro's soundtrack is legendary",        genres: ["Beat-em-up"] },
      { title: "Gunstar Heroes",            publisher: "Sega",     note: "Treasure's debut — the most technically impressive Genesis game ever made",         genres: ["Run-and-Gun"] },
      { title: "Comix Zone",                publisher: "Sega",     note: "Fighting inside a comic book — unique visual style and brutally hard",              genres: ["Action", "Platformer"] },
      { title: "Phantasy Star IV",          publisher: "Sega",     note: "The pinnacle of the Phantasy Star series — sci-fi JRPG with combo attacks",        genres: ["JRPG"] },
      { title: "Rocket Knight Adventures",  publisher: "Konami",   note: "Konami's mascot platformer — jetpack gameplay and beautiful sprites",              genres: ["Platformer", "Action"] },
      { title: "Ristar",                    publisher: "Sega",     note: "One of the last great Genesis games — stretching mechanic is brilliantly designed", genres: ["Platformer"] },
      { title: "Shinobi III",               publisher: "Sega",     note: "The best Shinobi game — fluid movement and incredible level design",               genres: ["Action", "Platformer"] },
      { title: "Contra: Hard Corps",        publisher: "Konami",   note: "The most technical and difficult Contra game — multiple endings and routes",       genres: ["Run-and-Gun"] },
      { title: "Vectorman",                 publisher: "Sega",     note: "Pre-rendered graphics showcase — fluid animation and solid action",                genres: ["Action", "Platformer"] },
      { title: "Ranger-X",                  publisher: "Sega",     note: "Technical showcase mech shooter — the most visually impressive Genesis game",     genres: ["Action", "Shooter"] },
      { title: "Castlevania: Bloodlines",   publisher: "Konami",   note: "The only Genesis Castlevania — underrated entry in the series",                   genres: ["Action", "Platformer"] },
    ],
  },

  // ── Dreamcast ────────────────────────────────────────────────────────────

  {
    id: "dreamcast-essentials", console_id: "dreamcast",
    label: "Dreamcast Essentials", description: "Sega's swansong had one of the best launch libraries ever", count: 12,
    games: [
      { title: "Shenmue",                   publisher: "Sega",      note: "The game that invented the open-world genre — Ryo's story still unfinished",        genres: ["Adventure", "Action"] },
      { title: "Jet Set Radio",             publisher: "Sega",      note: "The coolest game on any Sega platform — graffiti skating with a cel-shaded style",  genres: ["Action", "Platformer"] },
      { title: "Soul Calibur",              publisher: "Namco",     note: "Still considered the best-looking Dreamcast game — the arcade-perfect port",        genres: ["Fighting"] },
      { title: "Skies of Arcadia",          publisher: "Sega",      note: "The greatest JRPG Sega ever made — pirate airships and genuine discovery",         genres: ["JRPG"] },
      { title: "Ikaruga",                   publisher: "Treasure",  note: "Treasure's bullet-hell masterpiece — colour polarity switching gameplay",           genres: ["Shooter"] },
      { title: "Grandia II",                publisher: "Ubi Soft",  note: "Game Arts' underrated JRPG sequel — combat system is incredibly satisfying",       genres: ["JRPG"] },
      { title: "Crazy Taxi",                publisher: "Sega",      note: "Arcade port that defined the Dreamcast library — still incredibly fun",            genres: ["Action", "Racing"] },
      { title: "Power Stone 2",             publisher: "Capcom",    note: "Chaotic arena fighting with four players — the best Dreamcast party game",        genres: ["Fighting"] },
      { title: "Marvel vs. Capcom 2",       publisher: "Capcom",    note: "The definitive version of the classic crossover fighter",                          genres: ["Fighting"] },
      { title: "Phantasy Star Online",      publisher: "Sega",      note: "Invented the online console RPG — Dreamcast's killer app",                        genres: ["Action-RPG"] },
      { title: "Bangai-O",                  publisher: "Treasure",  note: "Treasure's manic bullet-hell mech game — fills the screen with explosions",       genres: ["Shooter", "Action"] },
      { title: "Cannon Spike",              publisher: "Capcom",    note: "Capcom's underrated dual-stick arcade shooter — gorgeous sprites",                 genres: ["Shooter"] },
    ],
  },

  // ── Saturn ────────────────────────────────────────────────────────────────

  {
    id: "saturn-essentials", console_id: "saturn",
    label: "Saturn Essentials", description: "The misunderstood Saturn had incredible exclusives you can't play elsewhere", count: 10,
    games: [
      { title: "Panzer Dragoon Saga",       publisher: "Sega",           note: "The rarest and most valuable Saturn game — action-RPG masterpiece, 4 discs",     genres: ["Action-RPG"] },
      { title: "Radiant Silvergun",         publisher: "Treasure",       note: "Treasure's legendary shoot-em-up — considered one of the greatest ever made",    genres: ["Shooter"] },
      { title: "Guardian Heroes",           publisher: "Treasure",       note: "Treasure's beat-em-up with branching story paths — stunning for 1996",           genres: ["Beat-em-up", "JRPG"] },
      { title: "Nights into Dreams",        publisher: "Sega",           note: "Sonic Team's experimental aerial action game — totally unique",                  genres: ["Action"] },
      { title: "Dragon Force",              publisher: "Working Designs", note: "Real-time strategy with 100-unit battles — the deepest Saturn exclusive",       genres: ["Strategy"] },
      { title: "Shining Force III",         publisher: "Sega",           note: "Three-scenario tactical RPG — scenarios 2 and 3 never left Japan",              genres: ["Strategy", "JRPG"] },
      { title: "Burning Rangers",           publisher: "Sega",           note: "Sonic Team's firefighter action game — incredible soundtrack",                  genres: ["Action"] },
      { title: "Hyper Duel",                publisher: "Technosoft",     note: "Technosoft's mecha shooter — rare but essential for shmup fans",                genres: ["Shooter"] },
      { title: "Castlevania: Symphony of the Night (Saturn)", publisher: "Konami", note: "Saturn port has extra content including Maria as playable character",  genres: ["Action", "Platformer"] },
      { title: "Magic Knight Rayearth",     publisher: "Working Designs", note: "Working Designs localisation of the CLAMP RPG — gorgeous sprites",            genres: ["Action-RPG"] },
    ],
  },

  // ── Xbox ─────────────────────────────────────────────────────────────────

  {
    id: "xbox-essentials", console_id: "xbox",
    label: "Original Xbox Essentials", description: "Microsoft's debut console had stronger exclusives than remembered", count: 10,
    games: [
      { title: "Halo: Combat Evolved",      publisher: "Microsoft",   note: "The game that legitimised console FPS — changed gaming history",                   genres: ["Shooter"] },
      { title: "Halo 2",                    publisher: "Microsoft",   note: "The sequel that invented online console multiplayer at scale",                     genres: ["Shooter"] },
      { title: "Fable",                     publisher: "Microsoft",   note: "Lionhead's ambitious morality RPG — choice and consequence in an open world",      genres: ["Action-RPG"] },
      { title: "Jade Empire",               publisher: "Microsoft",   note: "BioWare's martial arts action RPG — one of their most underrated games",          genres: ["Action-RPG"] },
      { title: "Ninja Gaiden",              publisher: "Tecmo",       note: "Team Ninja's brutal action masterpiece — one of the hardest and best action games", genres: ["Action"] },
      { title: "Panzer Dragoon Orta",       publisher: "Sega",        note: "The most beautiful game on original Xbox — rail shooter perfection",              genres: ["Shooter"] },
      { title: "Jet Set Radio Future",      publisher: "Sega",        note: "The refined sequel to the Dreamcast classic — cel-shaded perfection",            genres: ["Action", "Platformer"] },
      { title: "Crimson Skies: High Road to Revenge", publisher: "Microsoft", note: "The best flight action game of the era — full Xbox Live support",         genres: ["Action", "Shooter"] },
      { title: "Star Wars: Knights of the Old Republic", publisher: "LucasArts", note: "BioWare's RPG that defined the Star Wars expanded universe",           genres: ["Action-RPG"] },
      { title: "Grabbed by the Ghoulies",   publisher: "Microsoft",   note: "Rare's underrated cartoon brawler — hilarious and mechanically interesting",     genres: ["Action", "Beat-em-up"] },
    ],
  },

  // ── Xbox 360 ─────────────────────────────────────────────────────────────

  {
    id: "x360-essentials", console_id: "x360",
    label: "Xbox 360 Essentials", description: "360's library had some of the best exclusives of the HD era", count: 10,
    games: [
      { title: "Halo 3",                    publisher: "Microsoft",   note: "The conclusion to the original trilogy — defined 360-era multiplayer",            genres: ["Shooter"] },
      { title: "Gears of War",              publisher: "Microsoft",   note: "Invented cover-based shooting as a genre — still the best in the series",        genres: ["Shooter", "Action"] },
      { title: "Halo: Reach",               publisher: "Microsoft",   note: "The most emotional Halo campaign — Bungie's farewell to the series",             genres: ["Shooter"] },
      { title: "Forza Motorsport 4",        publisher: "Microsoft",   note: "The best simulation racing game of the 360 era",                                 genres: ["Racing", "Simulation"] },
      { title: "Phantom Dust",              publisher: "Microsoft",   note: "Rare cult classic — card-based action game with incredible replayability",       genres: ["Action", "Strategy"] },
      { title: "Crackdown",                 publisher: "Microsoft",   note: "Open-world superhero sandbox — the co-op is legendary",                         genres: ["Action"] },
      { title: "Left 4 Dead 2",             publisher: "Valve",       note: "Valve's co-op zombie shooter — still the best co-op game ever made",            genres: ["Shooter"] },
      { title: "Alan Wake",                 publisher: "Microsoft",   note: "Remedy's atmospheric psychological thriller — light as a weapon",                genres: ["Action", "Horror"] },
      { title: "Banjo-Kazooie: Nuts & Bolts", publisher: "Microsoft", note: "Divisive but brilliant vehicle-builder platformer — misunderstood gem",         genres: ["Platformer", "Racing"] },
      { title: "Earth Defense Force 2017",  publisher: "D3 Publisher", note: "B-movie co-op shooter at its finest — pure dumb fun at its best",             genres: ["Shooter", "Action"] },
    ],
  },

];

export function getListsForConsole(consoleId: string): ExclusiveList[] {
  return EXCLUSIVE_LISTS.filter(l => l.console_id === consoleId);
}

export function getConsolesWithLists(): string[] {
  return [...new Set(EXCLUSIVE_LISTS.map(l => l.console_id))];
}
