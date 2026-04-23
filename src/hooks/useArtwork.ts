/**
 * useArtwork.ts — Phase 2
 * Persistent disk cache via Tauri.
 * Art filenames are derived from consoleId + title — stable across rescans.
 * Filename format: {consoleId}__{sanitised_title}__{artType}.png
 */

export type ArtType = "Named_Boxarts";

import { isOffline } from "./useAppSettings";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

// ── Console → Libretro system folder ─────────────────────────────────────────

const LIBRETRO_SYSTEMS: Record<string, string> = {
  // ── Nintendo home consoles ────────────────────────────────────────────────
  nes:           "Nintendo - Nintendo Entertainment System",
  famicom:       "Nintendo - Nintendo Entertainment System",
  fds:           "Nintendo - Famicom Disk System",
  snes:          "Nintendo - Super Nintendo Entertainment System",
  sufami:        "Nintendo - Super Nintendo Entertainment System",
  n64:           "Nintendo - Nintendo 64",
  n64dd:         "Nintendo - Nintendo 64DD",
  gc:            "Nintendo - GameCube",
  wii:           "Nintendo - Wii",
  wiiu:          "Nintendo - Wii U",
  switch:        "Nintendo - Nintendo Switch",
  vb:            "Nintendo - Virtual Boy",
  // ── Nintendo handhelds ───────────────────────────────────────────────────
  gb:            "Nintendo - Game Boy",
  gbc:           "Nintendo - Game Boy Color",
  gba:           "Nintendo - Game Boy Advance",
  ds:            "Nintendo - Nintendo DS",
  dsi:           "Nintendo - Nintendo DSi",
  "3ds":         "Nintendo - Nintendo 3DS",
  n3ds:          "Nintendo - Nintendo 3DS",
  // ── Sony home consoles ───────────────────────────────────────────────────
  ps1:           "Sony - PlayStation",
  psx:           "Sony - PlayStation",
  ps2:           "Sony - PlayStation 2",
  ps3:           "Sony - PlayStation 3",
  ps4:           "Sony - PlayStation 4",
  ps5:           "Sony - PlayStation 5",
  // ── Sony handhelds ───────────────────────────────────────────────────────
  psp:           "Sony - PlayStation Portable",
  vita:          "Sony - PlayStation Vita",
  // ── Microsoft ────────────────────────────────────────────────────────────
  xbox:          "Microsoft - Xbox",
  x360:          "Microsoft - Xbox 360",
  xone:          "Microsoft - Xbox One",
  // ── Sega home consoles ───────────────────────────────────────────────────
  sg1000:        "Sega - SG-1000",
  mastersystem:  "Sega - Master System - Mark III",
  ms:            "Sega - Master System - Mark III",
  genesis:       "Sega - Mega Drive - Genesis",
  megadrive:     "Sega - Mega Drive - Genesis",
  scd:           "Sega - Mega-CD - Sega CD",
  "32x":         "Sega - 32X",
  saturn:        "Sega - Saturn",
  dreamcast:     "Sega - Dreamcast",
  // ── Sega handhelds ───────────────────────────────────────────────────────
  gg:            "Sega - Game Gear",
  gamegear:      "Sega - Game Gear",
  // ── NEC ──────────────────────────────────────────────────────────────────
  tg16:          "NEC - PC Engine - TurboGrafx 16",
  pcengine:      "NEC - PC Engine - TurboGrafx 16",
  pce:           "NEC - PC Engine - TurboGrafx 16",
  pcenginecd:    "NEC - PC Engine CD - TurboGrafx-CD",
  tgcd:          "NEC - PC Engine CD - TurboGrafx-CD",
  sgfx:          "NEC - PC Engine SuperGrafx",
  pcfx:          "NEC - PC-FX",
  // ── SNK ──────────────────────────────────────────────────────────────────
  neogeo:        "SNK - Neo Geo",
  ngaes:         "SNK - Neo Geo",
  ngcd:          "SNK - Neo Geo CD",
  ngp:           "SNK - Neo Geo Pocket",
  ngpc:          "SNK - Neo Geo Pocket Color",
  // ── Atari home consoles ──────────────────────────────────────────────────
  atari2600:     "Atari - 2600",
  a2600:         "Atari - 2600",
  atari5200:     "Atari - 5200",
  atari7800:     "Atari - 7800",
  jaguar:        "Atari - Jaguar",
  jaguarcd:      "Atari - Jaguar",
  // ── Atari handhelds ──────────────────────────────────────────────────────
  lynx:          "Atari - Lynx",
  // ── Bandai ───────────────────────────────────────────────────────────────
  wswan:         "Bandai - WonderSwan",
  wonderswan:    "Bandai - WonderSwan",
  wswanc:        "Bandai - WonderSwan Color",
  wonderswancolor: "Bandai - WonderSwan Color",
  // ── Commodore ────────────────────────────────────────────────────────────
  c64:           "Commodore - 64",
  amiga:         "Commodore - Amiga",
  amiga1200:     "Commodore - Amiga",
  vic20:         "Commodore - VIC-20",
  c128:          "Commodore - 128",
  // ── Other computers ──────────────────────────────────────────────────────
  dos:           "DOS",
  msdos:         "DOS",
  msx:           "Microsoft - MSX",
  msx2:          "Microsoft - MSX2",
  amstrad:       "Amstrad CPC",
  zxspectrum:    "Sinclair - ZX Spectrum +3",
  zx81:          "Sinclair - ZX81",
  appleii:       "Apple - Apple II",
  atarist:       "Atari - ST",
  // ── Philips / Magnavox ───────────────────────────────────────────────────
  cdi:           "Philips - CD-i",
  cdimaginaire:  "Philips - CD-i",
  o2:            "Magnavox - Odyssey2",
  odyssey2:      "Magnavox - Odyssey2",
  // ── Mattel / Coleco ──────────────────────────────────────────────────────
  intellivision: "Mattel - Intellivision",
  colecovision:  "Coleco - ColecoVision",
  // ── 3DO ──────────────────────────────────────────────────────────────────
  "3do":         "The 3DO Company - 3DO",
  // ── Arcade ───────────────────────────────────────────────────────────────
  arcade:        "MAME",
  mame:          "MAME",
  fbneo:         "FBNeo - Arcade Games",
  cps1:          "Capcom - CPS-1",
  cps2:          "Capcom - CPS-2",
  cps3:          "Capcom - CPS-3",
  neogeo_mvs:    "SNK - Neo Geo",
  // ── Sharp ────────────────────────────────────────────────────────────────
  x68000:        "Sharp - X68000",
  // ── Misc ─────────────────────────────────────────────────────────────────
  vectrex:       "GCE - Vectrex",
  channel_f:     "Fairchild - Channel F",
  fairchild:     "Fairchild - Channel F",
  pico8:         "PICO-8",
  scummvm:       "ScummVM",
};

function sanitiseTitle(title: string): string {
  // Replace characters that libretro replaces with _ in thumbnail filenames.
  // Official list from libretro-thumbnails README: &*/:`<>?\|"
  // So "Mario & Sonic..." → "Mario _ Sonic..." on the server.
  return title
    .replace(/[&*/:`<>?\\|"]/g, "_")
    .trim();
}


/** Generate all URL variants to try, mirroring RetroArch's matching algorithm */
// Encode a URL path segment — like encodeURIComponent but keeps apostrophes
// since the libretro server stores filenames with literal apostrophes
function encodeSegment(s: string): string {
  // Keep apostrophes and ampersands literal — libretro server stores filenames with
  // these characters unencoded, and some servers don't decode %26 in path segments
  return encodeURIComponent(s).replace(/%27/g, "'");
}

function buildUrlVariants(
  system: string,
  title: string,
  artType: ArtType,
  regions: string[],
  originalFilename?: string  // original ROM filename — best source for server name
): string[] {
  const base = `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}`;
  const urls: string[] = [];

  // ── Attempt 1: sanitized original filename stem ───────────────────────────
  // This is exactly what RetroArch does first — it matches the server's No-Intro naming.
  // e.g. "Fable (USA, EUROPE).xiso.iso" → "Fable (USA, EUROPE)" → "Fable (USA, EUROPE)"
  // The server may have "Fable (USA).png" but this catches cases where they match exactly.
  if (originalFilename) {
    // Strip all known ROM extensions iteratively.
    // Guard: skip if the "extension" has spaces or is >10 chars -- it's title text
    // (e.g. "Marvel vs. Capcom 2 (USA)" has "Capcom 2 (USA)" as its Path extension).
    let stem = originalFilename;
    const ROM_EXTS = new Set(["iso","xiso","bin","cue","gdi","chd","zip","7z",
      "nes","sfc","smc","n64","z64","v64","gb","gbc","gba","nds","3ds","cia",
      "xbe","pbp","cso","wua","wux","rpx","gcz","rvz","nsp","xci",
      "wbfs","wia","wud","gcm",
      "32x","md","smd","gen","img","mdf","m3u"]);
    for (let i = 0; i < 4; i++) {
      const dot = stem.lastIndexOf(".");
      if (dot === -1) break;
      const ext = stem.slice(dot + 1).toLowerCase();
      // If "extension" has spaces or is very long, it's part of the title -- stop
      if (ext.includes(" ") || ext.length > 10) break;
      if (ROM_EXTS.has(ext)) { stem = stem.slice(0, dot); }
      else { stem = stem.slice(0, dot); break; }
    }
    const sanitized = sanitiseTitle(stem);
    if (sanitized) urls.push(`${base}/${encodeSegment(sanitized)}.png`);

    // Also try with just the first region extracted from the filename
    // e.g. "Fable (USA, EUROPE)" → "Fable (USA)"
    const regionMatch = sanitized.match(/\(([A-Za-z]+)/);
    if (regionMatch) {
      const firstRegion = regionMatch[1];
      // Replace the full region group with just the first region
      const simplified = sanitized.replace(/\([^)]+\)/, `(${firstRegion})`).replace(/\s+/g, " ").trim();
      if (simplified !== sanitized) urls.push(`${base}/${encodeSegment(simplified)}.png`);
    }
  }

  // ── Attempt 2: short name (everything before first `(`) + region variants ─
  // RetroArch's most reliable fallback for non-database matches.
  // e.g. "Tom Clancy_s Splinter Cell - Chaos Theory" + "(USA)" etc.
  const cleanTitle = stripVersionTags(sanitiseTitle(title));
  const shortName  = cleanTitle.split("(")[0].trim();

  // Normalise dash spacing: "Metroid Prime 3- Corruption" → "Metroid Prime 3 - Corruption"
  // No-Intro format always has spaces around dashes
  const shortDashFixed = shortName.replace(/([^\s])-\s+/g, "$1 - ").replace(/\s+-/g, " -").trim();
  const hasFixedDash = shortDashFixed !== shortName;

  for (const r of regions) {
    urls.push(`${base}/${encodeSegment(`${shortName} (${r})`)}.png`);

    // Also try with dash spacing normalised
    if (hasFixedDash) {
      urls.push(`${base}/${encodeSegment(`${shortDashFixed} (${r})`)}.png`);
    }
  }

  // Subtitle-stripped variant — only for games where the subtitle is a colon-style
  // appended phrase. We strip conservatively: only if " - " appears AND what's left
  // is at least 4 chars, to avoid "Monster 4x4- Stunt Racer" → "Monster 4x4-"
  const dashIdx = shortName.indexOf(" - ");
  const noSubtitle = dashIdx >= 4 ? shortName.slice(0, dashIdx).trim() : "";
  if (noSubtitle && noSubtitle !== shortName) {
    for (const r of regions) {
      urls.push(`${base}/${encodeSegment(`${noSubtitle} (${r})`)}.png`);
    }
    urls.push(`${base}/${encodeSegment(noSubtitle)}.png`);
  }

  // ── Attempt 3: possessive-brand dash variant ─────────────────────────────
  const possessiveMatch = shortName.match(/^(.+?'s)\s+(.+)$/i);
  if (possessiveMatch) {
    const brandDash = `${possessiveMatch[1]} - ${possessiveMatch[2]}`;
    for (const r of regions) {
      urls.push(`${base}/${encodeSegment(`${brandDash} (${r})`)}.png`);
    }
    urls.push(`${base}/${encodeSegment(brandDash)}.png`);
  }

  // ── Attempt 4: colon → dash ───────────────────────────────────────────────
  // Exclusives use display names like "Contra III: The Alien Wars" but
  // No-Intro stores them as "Contra III - The Alien Wars"
  const colonDashTitle = title.replace(/:\s*/g, " - ").trim();
  if (colonDashTitle !== title) {
    const cdClean = stripVersionTags(sanitiseTitle(colonDashTitle)).split("(")[0].trim();
    for (const r of regions) {
      urls.push(`${base}/${encodeSegment(`${cdClean} (${r})`)}.png`);
    }
    urls.push(`${base}/${encodeSegment(cdClean)}.png`);
  }

  // ── Attempt 5: "The X" → "X, The" article flip ───────────────────────────
  // No-Intro moves leading "The" to the end -- but only flips the part BEFORE
  // any " - " subtitle separator so we get "Legend of Zelda, The - Twilight Princess HD"
  // rather than "Legend of Zelda - Twilight Princess HD, The".
  const theMatch = shortName.match(/^The\s+(.+)$/i);
  if (theMatch) {
    const rest = theMatch[1]; // everything after "The "
    // Split on first " - " to separate title prefix from subtitle
    const dashIdx = rest.indexOf(" - ");
    const flipped = dashIdx !== -1
      ? `${rest.slice(0, dashIdx)}, The - ${rest.slice(dashIdx + 3)}`
      : `${rest}, The`;
    for (const r of regions) {
      urls.push(`${base}/${encodeSegment(`${flipped} (${r})`)}.png`);
    }
    urls.push(`${base}/${encodeSegment(flipped)}.png`);
    // Also try the subtitle-stripped + flipped version (e.g. "Legend of Zelda, The")
    if (dashIdx !== -1) {
      const flippedBase = `${rest.slice(0, dashIdx)}, The`;
      for (const r of regions) {
        urls.push(`${base}/${encodeSegment(`${flippedBase} (${r})`)}.png`);
      }
      urls.push(`${base}/${encodeSegment(flippedBase)}.png`);
    }
  }

  // Bare short name last
  urls.push(`${base}/${encodeSegment(shortName)}.png`);

  // Deduplicate while preserving order
  return [...new Set(urls)];
}


function stripVersionTags(title: string): string {
  // Remove version suffixes like v1.001, v1.00, v1.2, v2, etc.
  return title.replace(/\s+v\d+(\.\d+)*$/i, "").trim();
}

export function buildArtUrl(consoleId: string, title: string, artType: ArtType, region?: string): string | null {
  const system = LIBRETRO_SYSTEMS[consoleId];
  if (!system) return null;
  const cleanTitle = stripVersionTags(sanitiseTitle(title));
  // Try with region tag first (e.g. "Shenmue (USA)"), fall back to bare title
  const withRegion = region ? `${cleanTitle} (${region})` : null;
  const safe = encodeSegment(withRegion ?? cleanTitle);
  return `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}/${safe}.png`;
}

/** Build URL without region — used as fallback */
export function buildArtUrlNoRegion(consoleId: string, title: string, artType: ArtType): string | null {
  const system = LIBRETRO_SYSTEMS[consoleId];
  if (!system) return null;
  const cleanTitle = stripVersionTags(sanitiseTitle(title));
  return `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}/${encodeURIComponent(cleanTitle)}.png`;
}

/**
 * Canonical title key — normalises display names and No-Intro names to the same string.
 * Ensures exclusives and library ROMs with equivalent titles share the same disk file.
 *
 * Rules applied (in order):
 *  1. Strip version tags (v1.001 etc)
 *  2. ": " → " - "  (display subtitle → No-Intro subtitle)
 *  3. Lowercase
 *  4. Collapse whitespace
 */
function canonicalTitle(title: string): string {
  return stripVersionTags(title)
    .replace(/:\s*/g, " - ")   // "Contra III: The Alien Wars" → "Contra III - The Alien Wars"
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable filename derived from console + title — no DB IDs, survives rescans.
 * Uses canonicalTitle so "Contra III: The Alien Wars" and "Contra III - The Alien Wars"
 * map to the same file, sharing art between exclusives list and library.
 * Example: dreamcast__marvel_vs._capcom_2__Named_Boxarts.png
 */
export function artFilename(consoleId: string, title: string, artType: ArtType): string {
  const canon = canonicalTitle(title).replace(/[<>:"/\\|?*]/g, "_");
  const safeId = consoleId.replace(/[<>:"/\\|?*]/g, "_");
  return `${safeId}__${canon}__${artType}.png`;
}

/** Cache key for in-memory lookup — also canonicalised so both title variants hit the same entry */
function artKey(consoleId: string, title: string, artType: ArtType): string {
  return `${consoleId}::${canonicalTitle(title)}::${artType}`;
}

// ── In-memory cache ───────────────────────────────────────────────────────────
type CacheEntry = "loading" | "error" | string;
const memCache = new Map<string, CacheEntry>();
// Module-level set of keys currently being fetched — survives component unmount/remount
// so switching tabs mid-fetch doesn't trigger duplicate network requests.
const inFlight = new Set<string>();

// Keys that definitively have no art on the server this session.
// Avoids re-sending 7+ requests for the same missing game every time it scrolls into view.
const notFound = new Set<string>();

// Global version counter — bumped whenever a new image lands in cache.
// All useArtwork instances subscribe so they re-render automatically.
let cacheVersion = 0;
const cacheListeners = new Set<() => void>();
function bumpCache() {
  cacheVersion++;
  cacheListeners.forEach(fn => fn());
}

// ── Session request counters ─────────────────────────────────────────────────
// Counts outgoing HTTP requests to thumbnails.libretro.com this session.
// Reset to zero when the app is reloaded. Does NOT count disk cache hits.
let sessionNetworkRequests = 0;
let sessionNetworkHits     = 0;  // requests that returned an image
let sessionNetworkMisses   = 0;  // requests that got a 404
let sessionDiskHits        = 0;  // served from local disk (no server hit)

export function bumpNetworkRequest() { sessionNetworkRequests++; }
export function bumpNetworkHit()     { sessionNetworkHits++;     }
export function bumpNetworkMiss()    { sessionNetworkMisses++;   }
export function bumpDiskHit()        { sessionDiskHits++;        }

export const artCacheStats = {
  get count()         { return [...memCache.values()].filter(v => v !== "loading" && v !== "error").length; },
  get errorCount()    { return [...memCache.values()].filter(v => v === "error").length; },
  get estimatedBytes() {
    let t = 0;
    for (const v of memCache.values()) if (v !== "loading" && v !== "error") t += v.length * 0.75;
    return t;
  },
  clear() { memCache.clear(); notFound.clear(); bumpCache(); },
  get sessionRequests() { return sessionNetworkRequests; },
  get sessionHits()     { return sessionNetworkHits; },
  get sessionMisses()   { return sessionNetworkMisses; },
  get sessionDiskHits() { return sessionDiskHits; },
  resetSessionCounters() {
    sessionNetworkRequests = 0;
    sessionNetworkHits     = 0;
    sessionNetworkMisses   = 0;
    sessionDiskHits        = 0;
  },
};


// ── Covers directory (fetched once per session) ───────────────────────────────
let coversDir: string | null = null;

async function getCoversDir(): Promise<string | null> {
  if (coversDir) return coversDir;
  if (!IS_TAURI) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    coversDir = await invoke("get_cover_art_dir");
    return coversDir;
  } catch (e) {
    console.warn("Could not get covers dir:", e);
    return null;
  }
}

export { LIBRETRO_SYSTEMS };

/** Called by ArtPickerModal to write a fetched image into the cache */
export function bumpCacheExternal(consoleId: string, title: string, artType: ArtType, dataUrl: string) {
  const key = artKey(consoleId, title, artType);
  memCache.set(key, dataUrl);
  bumpCache();
}

/** Subscribe to any art cache update. Returns an unsubscribe function. */
export function onArtCacheUpdate(fn: () => void): () => void {
  cacheListeners.add(fn);
  return () => cacheListeners.delete(fn);
}

/** Get the current cached art URL for a game, or null if not loaded yet. */
export function getCachedArt(consoleId: string, title: string, artType: ArtType): string | null {
  const val = memCache.get(artKey(consoleId, title, artType));
  return (val && val !== "loading" && val !== "error") ? val : null;
}

// ── Console art aspect ratio cache ────────────────────────────────────────────
// Stores the natural aspect ratio (width/height) of the first successfully
// loaded art image per console. Used as a placeholder size for missing art.
const consoleDimsCache = new Map<string, number>(); // consoleId → first ratio seen (for placeholders)
const dimsListeners    = new Set<() => void>();

// Per-ROM ratio cache — keyed by "consoleId::canonicalTitle"
// Used for outlier detection so weirdly-sized art sinks to the bottom of the grid
const romRatioCache = new Map<string, number>();
const ratioListeners = new Set<() => void>();

export function recordConsoleDims(consoleId: string, ratio: number) {
  if (!consoleDimsCache.has(consoleId)) {
    consoleDimsCache.set(consoleId, ratio);
    dimsListeners.forEach(fn => fn());
  }
}

export function recordRomRatio(consoleId: string, title: string, ratio: number) {
  const key = `${consoleId}::${canonicalTitle(title)}`;
  if (!romRatioCache.has(key)) {
    romRatioCache.set(key, ratio);
    ratioListeners.forEach(fn => fn());
  }
}

export function getRomRatio(consoleId: string, title: string): number | null {
  return romRatioCache.get(`${consoleId}::${canonicalTitle(title)}`) ?? null;
}

/** Returns all known ratios for a console — for computing the dominant ratio */
export function getConsoleRatios(consoleId: string): number[] {
  const prefix = `${consoleId}::`;
  const ratios: number[] = [];
  for (const [k, v] of romRatioCache) {
    if (k.startsWith(prefix)) ratios.push(v);
  }
  return ratios;
}

/** Subscribe to ratio updates — used by RomList to re-sort when new images load */
export function useRatioVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const fn = () => setV(x => x + 1);
    ratioListeners.add(fn);
    return () => { ratioListeners.delete(fn); };
  }, []);
  return v;
}

export function useConsoleDims(consoleId: string): number | null {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const fn = () => forceRender(v => v + 1);
    dimsListeners.add(fn);
    return () => { dimsListeners.delete(fn); };
  }, []);
  return consoleDimsCache.get(consoleId) ?? null;
}


// Keyed by "system::artType" — fetched once per session per console/arttype.
// Each value is an array of bare filenames (without .png) available on the server.
const indexCache = new Map<string, string[]>();

async function getSystemIndex(system: string, artType: ArtType): Promise<string[]> {
  const key = `${system}::${artType}`;
  if (indexCache.has(key)) return indexCache.get(key)!;

  if (isOffline()) { indexCache.set(key, []); return []; }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    // Libretro thumbnail server has a plain-text .index file per directory.
    // Note: server is http:// not https:// — try both
    const url = `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}/.index`;
    let text: string;
    try {
      text = await invoke("fetch_thumbnail_index", { url });
    } catch {
      // Fallback to http if https fails
      const httpUrl = url.replace("https://", "http://");
      text = await invoke("fetch_thumbnail_index", { url: httpUrl });
    }

    const entries = text
      .split("\n")
      .map(l => l.trim().replace(/\.png$/i, ""))
      .filter(l => l.length > 0);

    console.log(`[artwork] index loaded for ${system}/${artType}: ${entries.length} entries`);
    indexCache.set(key, entries);
    return entries;
  } catch (e) {
    console.log(`[artwork] index fetch failed for ${system}/${artType}:`, e);
    indexCache.set(key, []);
    return [];
  }
}

/** Find the best matching filename from the index using prefix matching.
 *  Returns the full server filename (without .png) or null if no match found. */
function normIndex(s: string): string {
  // Normalise for fuzzy index matching across naming format differences:
  // - Strip periods: "Bros." → "Bros"
  // - Normalise &: "Mario & Sonic" → "Mario _ Sonic" (as libretro does)
  // - Normalise ALL dashes and underscores to a single space
  //   so "Monster 4x4- Stunt Racer" matches "Monster 4x4_ Stunt Racer"
  //   and "3- Corruption" matches "3 - Corruption"
  return s.toLowerCase()
    .replace(/\.+/g, "")          // strip periods
    .replace(/&/g, "_")            // & → _ (libretro convention)
    .replace(/[\-_]+/g, " ")      // all dashes/underscores → space
    .replace(/\s+/g, " ")
    .trim();
}

function findInIndex(index: string[], shortName: string, regions: string[]): string | null {
  const lower = shortName.toLowerCase();
  const lowerNorm = normIndex(shortName);

  // Try exact match with each region (normalised)
  for (const r of regions) {
    const candidate = `${shortName} (${r})`.toLowerCase();
    const candidateNorm = normIndex(`${shortName} (${r})`);
    const match = index.find(e =>
      e.toLowerCase() === candidate ||
      normIndex(e) === candidateNorm
    );
    if (match) return match;
  }

  // Fuzzy: find entries that start with the short name (normalised)
  const prefixMatches = index.filter(e => {
    const eNorm = normIndex(e);
    return (
      e.toLowerCase().startsWith(lower + " (") ||
      e.toLowerCase().startsWith(lower + " -") ||
      eNorm.startsWith(lowerNorm + " (") ||
      eNorm.startsWith(lowerNorm + " -")
    );
  });

  if (prefixMatches.length === 0) return null;

  // Prefer USA region, then Europe, then first match
  for (const r of regions) {
    const pref = prefixMatches.find(e => e.toLowerCase().includes(`(${r.toLowerCase()})`));
    if (pref) return pref;
  }

  return prefixMatches[0];
}



export async function fetchAndCacheArt(
  consoleId: string,
  title: string,
  artType: ArtType,
  romId?: number,
  region?: string,
  filename?: string  // original ROM filename — used for more accurate URL matching
): Promise<string | null> {
  const key = artKey(consoleId, title, artType);

  // 0. Known missing — already exhausted all URLs this session, skip immediately
  if (notFound.has(key)) return null;

  // 0b. GameTDB disc ID lookup — extract ID from filename brackets e.g. [SMNE01]
  // and look up the canonical title from the downloaded database.
  // This solves "Monster 4x4- Stunt Racer" → "Monster 4x4: Stunt Racer" etc.
  let resolvedTitle = title;
  console.log(`[artwork] lookup check: IS_TAURI=${IS_TAURI} filename=${filename ?? "NONE"}`);
  if (IS_TAURI && filename) {
    const discIdMatch = filename.match(/\[([A-Z0-9]{4,8})\]/);
    console.log(`[artwork] discIdMatch for "${filename}":`, discIdMatch);
    if (discIdMatch) {
      const discId = discIdMatch[1];
      try {
        const { lookupGameTitle } = await import("../db");
        const canonical = await lookupGameTitle(discId);
        if (canonical) {
          resolvedTitle = canonical;
          console.log(`[artwork] GameTDB lookup: ${discId} → "${canonical}"`);
        }
      } catch {}
    }
  }

  // 1. Memory hit
  const mem = memCache.get(key);
  if (mem && mem !== "loading" && mem !== "error") return mem;
  if (mem === "error") return null;

  // 2. Disk — construct path from console + title, no DB lookup needed
  const dir = await getCoversDir();
  console.log(`[artwork] coversDir: ${dir}`);
  if (dir) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const sep = dir.includes("\\") ? "\\" : "/";
      const diskFilename = artFilename(consoleId, title, artType);
      const fullPath = `${dir}${sep}${diskFilename}`;
      console.log(`[artwork] trying disk: ${fullPath}`);
      const b64: string = await invoke("load_cover_art", { path: fullPath });
      console.log(`[artwork] disk hit! b64 length: ${b64?.length}`);
      if (b64?.length > 0) {
        const dataUrl = `data:image/png;base64,${b64}`;
        memCache.set(key, dataUrl);
        bumpCache();
        return dataUrl;
      }
    } catch (e) {
      console.log(`[artwork] disk miss for ${title}:`, e);
    }
  }

  // 3. Network fetch via Rust — try region variants then bare title
  if (isOffline()) { memCache.set(key, "error"); return null; }

  const system = LIBRETRO_SYSTEMS[consoleId];
  if (!system) { memCache.set(key, "error"); return null; }

  const REGION_ORDER = region
    ? [region, ...["USA", "Europe", "Japan", "World"].filter(r => r !== region)]
    : ["USA", "Europe", "Japan", "World"];

  // Use resolvedTitle (from GameTDB if available) for URL building
  const urlsToTry = buildUrlVariants(system, resolvedTitle, artType, REGION_ORDER, filename);

  for (const url of urlsToTry) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const filename = artFilename(consoleId, title, artType);
      console.log(`[artwork] trying: ${url}`);
      bumpNetworkRequest();
      const savedPath: string = await invoke("fetch_and_save_cover_art", { url, filename });
      console.log(`[artwork] saved: ${savedPath}`);
      bumpNetworkHit();

      const b64: string = await invoke("load_cover_art", { path: savedPath });
      const dataUrl = `data:image/png;base64,${b64}`;
      memCache.set(key, dataUrl);
      bumpCache();

      if (romId !== undefined) {
        try {
          const { saveCoverArtRecord } = await import("../db");
          await saveCoverArtRecord(romId, savedPath);
        } catch {}
      }
      return dataUrl;
    } catch (e: any) {
      if (String(e).includes("404") || String(e).includes("Not Found")) { bumpNetworkRequest(); bumpNetworkMiss(); continue; }
      console.error(`[artwork] fetch error for ${url}:`, e);
      break;
    }
  }

  // ── Attempt 4: index lookup — handles subtitle mismatches like "Mercenaries" ─
  // Fetch the server's .index file, find any entry that starts with our short name.
  if (IS_TAURI) {
    try {
      const index = await getSystemIndex(system, artType);
      if (index.length > 0) {
        const cleanTitle = stripVersionTags(sanitiseTitle(title));
        const shortName  = cleanTitle.split("(")[0].trim();
        // Try full title first, then subtitle-stripped as fallback
        const dashI = shortName.indexOf(" - ");
        const shortNoSub = dashI >= 4 ? shortName.slice(0, dashI).trim() : "";
        const match = findInIndex(index, shortName, REGION_ORDER)
               ?? (shortNoSub ? findInIndex(index, shortNoSub, REGION_ORDER) : null);
        if (match) {
          const url = `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}/${encodeSegment(match)}.png`;
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const filename = artFilename(consoleId, title, artType);
            const savedPath: string = await invoke("fetch_and_save_cover_art", { url, filename });
            const b64: string = await invoke("load_cover_art", { path: savedPath });
            const dataUrl = `data:image/png;base64,${b64}`;
            memCache.set(key, dataUrl);
            bumpCache();
            if (romId !== undefined) {
              try { const { saveCoverArtRecord } = await import("../db"); await saveCoverArtRecord(romId, savedPath); } catch {}
            }
            return dataUrl;
          } catch {}
        }
      }
    } catch {}
  }

  console.log(`[artwork] no art found for: ${title}`);
  // All attempts exhausted — remember this for the session so we don't retry
  notFound.add(key);
  memCache.set(key, "error");
  return null;
}

/** Called after importing custom art — busts memory cache so new image loads immediately */
export function bustArtCache(consoleId: string, title: string, artType: ArtType) {
  const key = artKey(consoleId, title, artType);
  memCache.delete(key);
  bumpCache();
}

import { useState, useEffect, useRef } from "react";

export function useArtwork(
  consoleId: string,
  title: string,
  artType: ArtType,
  enabled = true,
  region?: string,
  filename?: string
) {
  const key = artKey(consoleId, title, artType);
  const [, forceRender] = useState(0);
  const mountedRef = useRef(true);

  // Subscribe to cache bumps — re-renders when any image is added
  useEffect(() => {
    mountedRef.current = true;
    const listener = () => { if (mountedRef.current) forceRender(v => v + 1); };
    cacheListeners.add(listener);
    return () => {
      mountedRef.current = false;
      cacheListeners.delete(listener);
    };
  }, []);

  // Trigger fetch when visible
  useEffect(() => {
    if (!enabled) return;
    const v = memCache.get(key);
    // Already have a result (data URL or confirmed error) — nothing to do
    if (v && v !== "loading") return;
    // A fetch for this key is already in flight (possibly from a previous mount
    // of this component — e.g. user switched tabs mid-load). Don't duplicate it.
    if (inFlight.has(key)) return;

    inFlight.add(key);
    memCache.set(key, "loading");

    fetchAndCacheArt(consoleId, title, artType, undefined, region, filename)
      .catch(() => { memCache.set(key, "error"); })
      .finally(() => {
        inFlight.delete(key);
        if (mountedRef.current) forceRender(v => v + 1);
        else bumpCache(); // component unmounted; notify any other subscribers
      });
  }, [key, enabled]);

  const entry = memCache.get(key);
  return {
    src:     (entry && entry !== "loading" && entry !== "error") ? entry : null,
    loading: entry === "loading",
    error:   entry === "error",
  };
}
