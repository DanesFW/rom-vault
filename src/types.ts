// ─── Hasheous coverage ───────────────────────────────────────────────────────
// Console IDs whose systems are not indexed by No-Intro / Redump / TOSEC / MAME.
// For these, the Hasheous verify button is replaced with an informational note.
export const HASHEOUS_UNSUPPORTED_CONSOLES = new Set([
  "ps4",     // PlayStation 4
  "switch",  // Nintendo Switch
  "xone",    // Xbox One
]);

// ─── Tabs ────────────────────────────────────────────────────────────────────

export type TabId = "library" | "exclusives" | "stats" | "guide" | "shelf" | "timeline";

export const TAB_COLORS: Record<TabId, string> = {
  library:    "#52C060",
  exclusives: "#e4a030",
  stats:      "#9999dd",
  guide:      "#60b8d8",
  shelf:      "#c084fc",
  timeline:   "#e8855a",
};

export const TAB_LABELS: Record<TabId, string> = {
  library:    "LIBRARY",
  exclusives: "EXCLUSIVES",
  stats:      "STATS",
  guide:      "GUIDE",
  shelf:      "SHELF",
  timeline:   "TIMELINE",
};

// ─── Companies & Consoles ────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  color: string;       // brand color hex
  order: number;       // sort order (Nintendo=0, Sony=1, Microsoft=2, Sega=3, custom=4+)
  custom: boolean;
}

export interface Console {
  id: string;
  company_id: string;
  name: string;
  short_name: string;  // e.g. "SNES"
  generation: number;
  release_year: number;
  order: number;       // within company
  custom: boolean;
  // emulation guide fields
  primary_emulator_desktop?: string;
  primary_emulator_android?: string;
  alt_emulators?: string;         // JSON array string
  recommended_formats?: string;   // JSON array string
  hardware_notes?: string;        // newline-separated bullets
  pro_tips?: string;              // newline-separated bullets
}

export const BUILT_IN_COMPANIES: Omit<Company, "custom">[] = [
  { id: "nintendo",   name: "Nintendo",    color: "#E60012", order: 0 },
  { id: "sony",       name: "Sony",        color: "#2f6bcc", order: 1 },
  { id: "microsoft",  name: "Microsoft",   color: "#22b422", order: 2 },
  { id: "sega",       name: "Sega",        color: "#2080cc", order: 3 },
  { id: "atari",      name: "Atari",       color: "#E47C20", order: 4 },
  { id: "nec",        name: "NEC",         color: "#2090d8", order: 5 },
  { id: "snk",        name: "SNK",         color: "#C0392B", order: 6 },
  { id: "bandai",     name: "Bandai",      color: "#E31837", order: 7 },
  { id: "philips",    name: "Philips",     color: "#0095DB", order: 8 },
  { id: "commodore",  name: "Commodore",   color: "#8B6914", order: 9 },
  { id: "mattel",     name: "Mattel",      color: "#E4002B", order: 10 },
  { id: "coleco",     name: "Coleco",      color: "#888888", order: 11 },
  { id: "3do",        name: "3DO",         color: "#9966cc", order: 12 },
  { id: "arcade",     name: "Arcade",      color: "#FF6B00", order: 13 },
  { id: "pc",         name: "PC",          color: "#555555", order: 14 },
  { id: "magnavox",   name: "Magnavox",    color: "#8B4513", order: 15 },
];

export const BUILT_IN_CONSOLES: Omit<Console, "custom">[] = [
  // Nintendo
  { id: "nes",       company_id: "nintendo",  name: "Nintendo Entertainment System", short_name: "NES",       generation: 3, release_year: 1983, order: 0 },
  { id: "snes",      company_id: "nintendo",  name: "Super Nintendo",                short_name: "SNES",      generation: 4, release_year: 1990, order: 1 },
  { id: "n64",       company_id: "nintendo",  name: "Nintendo 64",                   short_name: "N64",       generation: 5, release_year: 1996, order: 2 },
  { id: "gc",        company_id: "nintendo",  name: "GameCube",                      short_name: "GameCube",  generation: 6, release_year: 2001, order: 3 },
  { id: "wii",       company_id: "nintendo",  name: "Wii",                           short_name: "Wii",       generation: 7, release_year: 2006, order: 4 },
  { id: "wiiu",      company_id: "nintendo",  name: "Wii U",                         short_name: "Wii U",     generation: 8, release_year: 2012, order: 5 },
  { id: "switch",    company_id: "nintendo",  name: "Nintendo Switch",               short_name: "Switch",    generation: 9, release_year: 2017, order: 6 },
  { id: "gb",        company_id: "nintendo",  name: "Game Boy",                      short_name: "GB",        generation: 4, release_year: 1989, order: 7 },
  { id: "gbc",       company_id: "nintendo",  name: "Game Boy Color",                short_name: "GBC",       generation: 5, release_year: 1998, order: 8 },
  { id: "gba",       company_id: "nintendo",  name: "Game Boy Advance",              short_name: "GBA",       generation: 6, release_year: 2001, order: 9 },
  { id: "vb",        company_id: "nintendo",  name: "Virtual Boy",                   short_name: "Virtual Boy", generation: 5, release_year: 1995, order: 10 },
  { id: "ds",        company_id: "nintendo",  name: "Nintendo DS",                   short_name: "DS",        generation: 7, release_year: 2004, order: 11 },
  { id: "3ds",       company_id: "nintendo",  name: "Nintendo 3DS",                  short_name: "3DS",       generation: 8, release_year: 2011, order: 12 },
  // Sony
  { id: "ps1",       company_id: "sony",      name: "PlayStation",                   short_name: "PS1",       generation: 5, release_year: 1994, order: 0 },
  { id: "ps2",       company_id: "sony",      name: "PlayStation 2",                 short_name: "PS2",       generation: 6, release_year: 2000, order: 1 },
  { id: "ps3",       company_id: "sony",      name: "PlayStation 3",                 short_name: "PS3",       generation: 7, release_year: 2006, order: 2 },
  { id: "ps4",       company_id: "sony",      name: "PlayStation 4",                 short_name: "PS4",       generation: 8, release_year: 2013, order: 3 },
  { id: "ps5",       company_id: "sony",      name: "PlayStation 5",                 short_name: "PS5",       generation: 9, release_year: 2020, order: 4 },
  { id: "psp",       company_id: "sony",      name: "PlayStation Portable",          short_name: "PSP",       generation: 7, release_year: 2005, order: 5 },
  { id: "vita",      company_id: "sony",      name: "PlayStation Vita",              short_name: "Vita",      generation: 8, release_year: 2011, order: 6 },
  // Microsoft
  { id: "xbox",      company_id: "microsoft", name: "Xbox",                          short_name: "Xbox",        generation: 6, release_year: 2001, order: 0 },
  { id: "x360",      company_id: "microsoft", name: "Xbox 360",                      short_name: "Xbox 360",    generation: 7, release_year: 2005, order: 1 },
  { id: "xone",      company_id: "microsoft", name: "Xbox One",                      short_name: "Xbox One",    generation: 8, release_year: 2013, order: 2 },
  // Sega
  { id: "sg1000",      company_id: "sega",    name: "SG-1000",                       short_name: "SG-1000",     generation: 2, release_year: 1983, order: 0 },
  { id: "mastersystem",company_id: "sega",    name: "Master System",                 short_name: "Master Sys",  generation: 3, release_year: 1985, order: 1 },
  { id: "genesis",     company_id: "sega",    name: "Sega Genesis",                  short_name: "Genesis",     generation: 4, release_year: 1988, order: 2 },
  { id: "scd",         company_id: "sega",    name: "Sega CD",                       short_name: "Sega CD",     generation: 4, release_year: 1992, order: 3 },
  { id: "32x",         company_id: "sega",    name: "Sega 32X",                      short_name: "32X",         generation: 4, release_year: 1994, order: 4 },
  { id: "saturn",      company_id: "sega",    name: "Sega Saturn",                   short_name: "Saturn",      generation: 5, release_year: 1994, order: 5 },
  { id: "dreamcast",   company_id: "sega",    name: "Dreamcast",                     short_name: "Dreamcast",   generation: 6, release_year: 1998, order: 6 },
  { id: "gg",          company_id: "sega",    name: "Game Gear",                     short_name: "Game Gear",   generation: 4, release_year: 1990, order: 7 },
  // Atari
  { id: "atari2600",  company_id: "atari",    name: "Atari 2600",                    short_name: "Atari 2600",  generation: 2, release_year: 1977, order: 0 },
  { id: "atari5200",  company_id: "atari",    name: "Atari 5200",                    short_name: "Atari 5200",  generation: 3, release_year: 1982, order: 1 },
  { id: "atari7800",  company_id: "atari",    name: "Atari 7800",                    short_name: "Atari 7800",  generation: 3, release_year: 1986, order: 2 },
  { id: "jaguar",     company_id: "atari",    name: "Atari Jaguar",                  short_name: "Jaguar",      generation: 5, release_year: 1993, order: 3 },
  { id: "jaguarcd",   company_id: "atari",    name: "Atari Jaguar CD",               short_name: "Jaguar CD",   generation: 5, release_year: 1995, order: 4 },
  { id: "lynx",       company_id: "atari",    name: "Atari Lynx",                    short_name: "Lynx",        generation: 4, release_year: 1989, order: 5 },
  // NEC
  { id: "tg16",       company_id: "nec",      name: "TurboGrafx-16",                 short_name: "TG-16",       generation: 4, release_year: 1987, order: 0 },
  { id: "pcenginecd", company_id: "nec",      name: "PC Engine CD",                  short_name: "PC-CD",       generation: 4, release_year: 1988, order: 1 },
  { id: "sgfx",       company_id: "nec",      name: "PC Engine SuperGrafx",          short_name: "SuperGrafx",  generation: 4, release_year: 1989, order: 2 },
  { id: "pcfx",       company_id: "nec",      name: "PC-FX",                         short_name: "PC-FX",       generation: 5, release_year: 1994, order: 3 },
  // SNK
  { id: "neogeo",     company_id: "snk",      name: "Neo Geo",                       short_name: "Neo Geo",     generation: 4, release_year: 1990, order: 0 },
  { id: "ngcd",       company_id: "snk",      name: "Neo Geo CD",                    short_name: "Neo Geo CD",  generation: 4, release_year: 1994, order: 1 },
  { id: "ngp",        company_id: "snk",      name: "Neo Geo Pocket",                short_name: "NGP",         generation: 5, release_year: 1998, order: 2 },
  { id: "ngpc",       company_id: "snk",      name: "Neo Geo Pocket Color",          short_name: "NGPC",        generation: 5, release_year: 1999, order: 3 },
  // Bandai
  { id: "wswan",      company_id: "bandai",   name: "WonderSwan",                    short_name: "WonderSwan",  generation: 5, release_year: 1999, order: 0 },
  { id: "wswanc",     company_id: "bandai",   name: "WonderSwan Color",              short_name: "WSC",         generation: 5, release_year: 2000, order: 1 },
  // Philips
  { id: "cdimaginaire", company_id: "philips",  name: "Philips CD-i",                  short_name: "CD-i",        generation: 4, release_year: 1991, order: 0 },
  // Commodore
  { id: "c64",        company_id: "commodore",name: "Commodore 64",                  short_name: "C64",         generation: 2, release_year: 1982, order: 0 },
  { id: "amiga",      company_id: "commodore",name: "Amiga",                         short_name: "Amiga",       generation: 3, release_year: 1985, order: 1 },
  { id: "amiga1200",  company_id: "commodore",name: "Amiga 1200",                    short_name: "A1200",       generation: 4, release_year: 1992, order: 2 },
  { id: "vic20",      company_id: "commodore",name: "Commodore VIC-20",              short_name: "VIC-20",      generation: 2, release_year: 1980, order: 3 },
  { id: "c128",       company_id: "commodore",name: "Commodore 128",                 short_name: "C128",        generation: 3, release_year: 1985, order: 4 },
  // Mattel
  { id: "intellivision", company_id: "mattel",name: "Intellivision",                 short_name: "Intellivision",generation:2, release_year: 1979, order: 0 },
  // Coleco
  { id: "colecovision",  company_id: "coleco",name: "ColecoVision",                  short_name: "ColecoVision",generation: 2, release_year: 1982, order: 0 },
  // Magnavox
  { id: "odyssey2",   company_id: "magnavox", name: "Magnavox Odyssey²",             short_name: "Odyssey²",    generation: 2, release_year: 1978, order: 0 },
  // 3DO
  { id: "3do",        company_id: "3do",      name: "3DO Interactive Multiplayer",   short_name: "3DO",         generation: 5, release_year: 1993, order: 0 },
  // Arcade
  { id: "arcade",     company_id: "arcade",   name: "Arcade (MAME)",                 short_name: "MAME",        generation: 0, release_year: 1970, order: 0 },
  { id: "fbneo",      company_id: "arcade",   name: "Arcade (FBNeo)",                short_name: "FBNeo",       generation: 0, release_year: 1970, order: 1 },
  // PC
  { id: "dos",        company_id: "pc",       name: "DOS",                           short_name: "DOS",         generation: 0, release_year: 1981, order: 0 },
  { id: "msx",        company_id: "pc",       name: "MSX",                           short_name: "MSX",         generation: 3, release_year: 1983, order: 1 },
  { id: "msx2",       company_id: "pc",       name: "MSX2",                          short_name: "MSX2",        generation: 3, release_year: 1985, order: 2 },
  { id: "amstrad",    company_id: "pc",       name: "Amstrad CPC",                   short_name: "Amstrad",     generation: 3, release_year: 1984, order: 3 },
  { id: "zxspectrum", company_id: "pc",       name: "ZX Spectrum",                   short_name: "ZX Spectrum", generation: 2, release_year: 1982, order: 4 },
  { id: "zx81",       company_id: "pc",       name: "Sinclair ZX81",                 short_name: "ZX81",        generation: 1, release_year: 1981, order: 5 },
  { id: "appleii",    company_id: "pc",       name: "Apple II",                      short_name: "Apple II",    generation: 2, release_year: 1977, order: 6 },
  { id: "atarist",    company_id: "atari",    name: "Atari ST",                      short_name: "Atari ST",    generation: 3, release_year: 1985, order: 6 },
];

// ─── ROM extensions → console detection ─────────────────────────────────────

export const EXT_TO_CONSOLE: Record<string, string> = {
  ".nes": "nes",
  ".sfc": "snes", ".smc": "snes",
  ".z64": "n64", ".n64": "n64", ".v64": "n64",
  ".gcm": "gc", ".iso": "gc",      // iso is ambiguous, folder name wins
  ".wbfs": "wii", ".wia": "wii",
  ".wud": "wiiu", ".wux": "wiiu",
  ".xci": "switch", ".nsp": "switch",
  ".gb": "gb",
  ".gbc": "gbc",
  ".gba": "gba",
  ".nds": "ds",
  ".3ds": "3ds", ".cia": "3ds",
  ".cue": "ps1", ".bin": "ps1",    // ambiguous; folder wins
  ".chd": "ps2",                   // ambiguous
  ".pkg": "ps4",
  ".xiso": "xbox",                 // .iso is ambiguous — omitted
  ".md": "genesis", ".gen": "genesis", ".smd": "genesis",
  // .cue is already mapped to ps1 above; saturn/dreamcast detected via folder
  ".gdi": "dreamcast", ".cdi": "dreamcast",
  ".gg": "gg",
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
  color: string;
}

// ─── Smart Lists ──────────────────────────────────────────────────────────────

export interface SmartList {
  id: number;
  name: string;
  color: string;
  console_id: string | null;
  backlog_status: string | null;
  search: string | null;
  tag_ids: number[];
  sort_order: number;
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export interface Playlist {
  id: number;
  name: string;
  sort_order: number;
  rom_count?: number;
  company_colors?: string[];  // distinct company colors of member ROMs
  isAuto?: boolean;           // virtual/auto-generated playlist, not stored in DB
}

export const RECENTLY_PLAYED_PLAYLIST: Playlist = {
  id: -1,
  name: "Recently Played",
  sort_order: -1,
  isAuto: true,
};

export interface EmulatorProfile {
  id: number;
  name: string;
  exe_path: string;
  args: string;          // launch arg template; {rom} = absolute filepath
  is_retroarch: boolean;
  core_path: string | null;
}

// console_id → emulator profile id
export interface ConsoleEmulator {
  console_id: string;
  emulator_id: number;
}

// ─── ROM / Library ────────────────────────────────────────────────────────────

export type BacklogStatus = "unplayed" | "in-progress" | "beaten" | "completed";

export const BACKLOG_NEXT: Record<BacklogStatus | "none", BacklogStatus | "none"> = {
  none:          "unplayed",
  unplayed:      "in-progress",
  "in-progress": "beaten",
  beaten:        "completed",
  completed:     "none",
};

export const BACKLOG_COLORS: Record<BacklogStatus, string> = {
  unplayed:      "#6b7280",
  "in-progress": "#f59e0b",
  beaten:        "#4ade80",
  completed:     "#a78bfa",
};

export const FORMAT_QUALITY_RANK: Record<string, number> = {
  ".chd": 10, ".rvz": 10,
  ".wia": 9,
  ".gcm": 8, ".wbfs": 8,
  ".xci": 7, ".nsp": 7,
  ".iso": 5,
  ".cue": 4, ".gdi": 4,
  ".bin": 3, ".cdi": 3,
  ".sfc": 6, ".smc": 5,
  ".z64": 6,
};

export interface RomEntry {
  id: number;
  console_id: string;
  title: string;
  filename: string;
  filepath: string;
  file_size: number;
  format: string;
  region?: string;
  revision?: string;
  backlog_status?: BacklogStatus;
  note?: string;
  is_exclusive: boolean;
  added_at: string;
  last_played_at?: string | null;
  play_count?: number;
  total_play_seconds?: number;
  discs?: string[];   // extra disc filepaths for multi-disc games
  tags?: Tag[];       // user-defined labels, loaded alongside the row
  crc32?: string;
  md5?: string;
  sha1?: string;
  hasheous_title?: string;
  hasheous_platform?: string;
  hasheous_region?: string;
  hasheous_source?: string;
  // populated when consoleId='all' global search is active:
  console_name?: string;
  company_color?: string;
}

// ─── Play sessions ───────────────────────────────────────────────────────────

export interface PlaySession {
  id: number;
  rom_id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

// ─── Exclusives ──────────────────────────────────────────────────────────────

export interface Exclusive {
  id: number;
  console_id: string;
  title: string;
  publisher: string;
  note: string;
  genres: string[];
  owned: boolean;
  user_added: boolean;
  list_id?: string;
  list_label?: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface ConsoleStats {
  console_id: string;
  rom_count: number;
  beaten_count: number;
  completed_count: number;
  in_progress_count: number;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface AppState {
  activeTab: TabId;
  activeCompanyId: string | null;
  activeConsoleId: string | null;
}

// ─── Format display ────────────────────────────────────────────────────────────

/** Returns the display label for a ROM format, accounting for double extensions.
 *  e.g. format=".iso", filename="Game.xiso.iso" → "XISO"
 *       format=".iso", filename="Game.iso"      → "ISO"
 */
export function formatLabel(format: string, filename?: string): string {
  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.includes(".xiso")) return "XISO";
  }
  return format.replace(".", "").toUpperCase();
}

// ─── Region colours ───────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Americas
  "USA":   { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb55" },
  "US":    { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb55" },
  "U":     { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb55" },
  "NTSC":  { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb55" },
  // Europe
  "Europe":{ bg: "#1a3d2e", text: "#4ade80", border: "#16a34a55" },
  "EUR":   { bg: "#1a3d2e", text: "#4ade80", border: "#16a34a55" },
  "PAL":   { bg: "#1a3d2e", text: "#4ade80", border: "#16a34a55" },
  "En":    { bg: "#1a3d2e", text: "#4ade80", border: "#16a34a55" },
  "Fr":    { bg: "#1c2d50", text: "#93c5fd", border: "#3b82f655" },
  "De":    { bg: "#2d1f1f", text: "#fca5a5", border: "#ef444455" },
  "Es":    { bg: "#2d1a1a", text: "#fca5a5", border: "#dc262655" },
  "It":    { bg: "#1f2d1f", text: "#86efac", border: "#22c55e55" },
  "Pt":    { bg: "#1a2d1a", text: "#86efac", border: "#16a34a55" },
  // Japan
  "Japan": { bg: "#3d1a1a", text: "#fca5a5", border: "#ef444455" },
  "JPN":   { bg: "#3d1a1a", text: "#fca5a5", border: "#ef444455" },
  // World
  "World": { bg: "#2d2050", text: "#c4b5fd", border: "#8b5cf655" },
};

const REGION_DEFAULT = { bg: "#1e1e2e", text: "#94a3b8", border: "#47475555" };

export function regionPillStyle(region: string): { background: string; color: string; border: string } {
  const r = REGION_COLORS[region] ?? REGION_DEFAULT;
  return { background: r.bg, color: r.text, border: `1px solid ${r.border}` };
}

// ─── Disc pill colour ─────────────────────────────────────────────────────────

export const DISC_PILL_STYLE = {
  background: "#2d1f3d",
  color: "#c4b5fd",
  border: "1px solid #8b5cf655",
} as const;

export const SIZE_PILL_STYLE = {
  background: "#1e2d1e",
  color: "#86efac",
  border: "1px solid #22c55e44",
} as const;
