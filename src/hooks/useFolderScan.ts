import { useState, useCallback } from "react";
import { insertRomsBatch } from "../db";

export interface ScanProgress {
  phase: "idle" | "scanning" | "parsing" | "inserting" | "done" | "error";
  found: number;
  inserted: number;
  skipped: number;
  merged: number;
  message: string;
}

export interface SkippedFile {
  filename: string;
  filepath: string;
}

export interface MergedGame {
  title: string;
  discCount: number;
  discs: string[];
}

export interface ScanResult {
  inserted: number;
  updated: number;
  skipped: number;
  merged: MergedGame[];
  skippedFiles: SkippedFile[];
}

const IS_TAURI = "__TAURI_INTERNALS__" in window;

// ── Folder name → console alias map ──────────────────────────────────────────

const FOLDER_ALIASES: Record<string, string> = {
  // ── Nintendo home ──────────────────────────────────────────────────────────
  "nes": "nes", "nintendo entertainment system": "nes", "famicom": "nes", "fc": "nes",
  "fds": "nes", "famicomdisksystem": "nes",
  "snes": "snes", "super nintendo": "snes", "super nes": "snes", "super famicom": "snes",
  "sfc": "snes", "superfamicom": "snes", "snesmsx": "snes",
  "n64": "n64", "nintendo 64": "n64", "nintendo64": "n64",
  "gc": "gc", "gamecube": "gc", "game cube": "gc", "gcn": "gc", "nintendo gamecube": "gc",
  "wii": "wii",
  "wiiu": "wiiu", "wii u": "wiiu", "wii-u": "wiiu", "nintendo wii u": "wiiu",
  "switch": "switch", "nintendo switch": "switch", "ns": "switch",
  "virtualboy": "vb", "virtual boy": "vb", "vb": "vb",
  // ── Nintendo handheld ──────────────────────────────────────────────────────
  "gb": "gb", "game boy": "gb", "gameboy": "gb", "dmg": "gb",
  "gbc": "gbc", "game boy color": "gbc", "game boy colour": "gbc",
  "gameboy color": "gbc", "gameboy colour": "gbc", "cgb": "gbc",
  "gba": "gba", "game boy advance": "gba", "gameboy advance": "gba", "agb": "gba",
  "ds": "ds", "nintendo ds": "ds", "nds": "ds",
  "dsi": "ds",
  "3ds": "3ds", "nintendo 3ds": "3ds", "n3ds": "3ds",
  // ── Sony home ─────────────────────────────────────────────────────────────
  "ps1": "ps1", "psx": "ps1", "psone": "ps1", "playstation": "ps1",
  "playstation 1": "ps1", "ps one": "ps1", "playstation1": "ps1",
  "ps2": "ps2", "playstation 2": "ps2", "playstation2": "ps2",
  "ps3": "ps3", "playstation 3": "ps3", "playstation3": "ps3",
  "ps4": "ps4", "playstation 4": "ps4", "playstation4": "ps4",
  "ps5": "ps5", "playstation 5": "ps5", "playstation5": "ps5",
  // ── Sony handheld ─────────────────────────────────────────────────────────
  "psp": "psp", "playstation portable": "psp",
  "vita": "vita", "ps vita": "vita", "playstation vita": "vita", "psv": "vita", "psvita": "vita",
  // ── Microsoft ─────────────────────────────────────────────────────────────
  "xbox": "xbox", "original xbox": "xbox", "xbox 1": "xbox", "xboxoriginal": "xbox",
  "x360": "x360", "xbox 360": "x360", "xbox360": "x360", "360": "x360",
  "xone": "xone", "xbox one": "xone", "xboxone": "xone",
  // ── Sega home ─────────────────────────────────────────────────────────────
  "sg1000": "sg1000", "sega sg1000": "sg1000", "sega sg-1000": "sg1000",
  "mastersystem": "mastersystem", "master system": "mastersystem", "ms": "mastersystem",
  "sega master system": "mastersystem", "mark iii": "mastersystem",
  "genesis": "genesis", "sega genesis": "genesis", "mega drive": "genesis",
  "megadrive": "genesis", "md": "genesis", "smd": "genesis",
  "sega megadrive": "genesis", "sega mega drive": "genesis",
  "segacd": "scd", "sega cd": "scd", "mega cd": "scd", "megacd": "scd", "scd": "scd",
  "sega32x": "32x", "sega 32x": "32x", "32x": "32x",
  "saturn": "saturn", "sega saturn": "saturn",
  "dreamcast": "dreamcast", "dc": "dreamcast", "sega dreamcast": "dreamcast",
  // ── Sega handheld ─────────────────────────────────────────────────────────
  "gamegear": "gg", "game gear": "gg", "gg": "gg",
  "sega game gear": "gg", "sega gamegear": "gg",
  // ── Atari home ────────────────────────────────────────────────────────────
  "atari2600": "atari2600", "atari 2600": "atari2600", "2600": "atari2600", "a2600": "atari2600",
  "atari5200": "atari5200", "atari 5200": "atari5200", "5200": "atari5200",
  "atari7800": "atari7800", "atari 7800": "atari7800", "7800": "atari7800",
  "jaguar": "jaguar", "atari jaguar": "jaguar", "atarijaguar": "jaguar",
  "jaguarcd": "jaguarcd", "jaguar cd": "jaguarcd", "atari jaguar cd": "jaguarcd",
  // ── Atari handheld ────────────────────────────────────────────────────────
  "lynx": "lynx", "atari lynx": "lynx", "atarilynx": "lynx",
  // ── NEC ───────────────────────────────────────────────────────────────────
  "tg16": "tg16", "turbografx": "tg16", "turbografx16": "tg16", "turbografx-16": "tg16",
  "pcengine": "tg16", "pc engine": "tg16", "pce": "tg16",
  "tgcd": "pcenginecd", "turbografxcd": "pcenginecd", "pcenginecd": "pcenginecd",
  "pc engine cd": "pcenginecd", "pc-engine cd": "pcenginecd",
  "supergrafx": "sgfx", "sgfx": "sgfx", "pc engine supergrafx": "sgfx",
  "pcfx": "pcfx", "pc-fx": "pcfx",
  // ── SNK ───────────────────────────────────────────────────────────────────
  "neogeo": "neogeo", "neo geo": "neogeo", "ngaes": "neogeo", "neogeo_mvs": "neogeo",
  "neo-geo": "neogeo", "neogeoaes": "neogeo",
  "ngcd": "ngcd", "neo geo cd": "ngcd", "neogeocd": "ngcd",
  "ngp": "ngp", "neo geo pocket": "ngp", "neogeopocket": "ngp",
  "ngpc": "ngpc", "neo geo pocket color": "ngpc", "neo geo pocket colour": "ngpc",
  "neogeopocketcolor": "ngpc",
  // ── Bandai ────────────────────────────────────────────────────────────────
  "wswan": "wswan", "wonderswan": "wswan", "bandai wonderswan": "wswan",
  "wswanc": "wswanc", "wonderswancolor": "wswanc", "wonderswancolour": "wswanc",
  "wonder swan color": "wswanc", "bandai wonderswan color": "wswanc",
  // ── Philips ───────────────────────────────────────────────────────────────
  "cdi": "cdimaginaire", "cd-i": "cdimaginaire", "philips cdi": "cdimaginaire", "philips cd-i": "cdimaginaire",
  // ── Commodore ─────────────────────────────────────────────────────────────
  "c64": "c64", "commodore 64": "c64", "commodore64": "c64",
  "amiga": "amiga", "amiga500": "amiga", "amiga 500": "amiga",
  "amiga1200": "amiga1200", "amiga 1200": "amiga1200",
  "vic20": "vic20", "vic 20": "vic20", "commodore vic-20": "vic20",
  "c128": "c128", "commodore 128": "c128",
  // ── Other computers ───────────────────────────────────────────────────────
  "dos": "dos", "msdos": "dos", "ms-dos": "dos",
  "msx": "msx",
  "msx2": "msx2",
  "amstradcpc": "amstrad", "amstrad": "amstrad", "amstrad cpc": "amstrad",
  "zxspectrum": "zxspectrum", "zx spectrum": "zxspectrum", "spectrum": "zxspectrum",
  "zx81": "zx81",
  "appleii": "appleii", "apple ii": "appleii", "apple2": "appleii",
  "atarist": "atarist", "atari st": "atarist", "atariste": "atarist",
  // ── Mattel / Coleco ───────────────────────────────────────────────────────
  "intellivision": "intellivision", "mattel intellivision": "intellivision",
  "colecovision": "colecovision", "coleco": "colecovision", "coleco vision": "colecovision",
  // ── Magnavox / Philips ────────────────────────────────────────────────────
  "odyssey2": "odyssey2", "odyssey 2": "odyssey2", "magnavox odyssey": "odyssey2",
  // ── 3DO ───────────────────────────────────────────────────────────────────
  "3do": "3do", "panasonic 3do": "3do",
  // ── Arcade ────────────────────────────────────────────────────────────────
  "arcade": "arcade", "mame": "arcade", "fbneo": "fbneo", "finalburn": "fbneo",
  "finalburnneo": "fbneo", "fba": "fbneo",
};

const EXT_TO_CONSOLE: Record<string, string> = {
  ".nes": "nes", ".unf": "nes", ".unif": "nes",
  ".sfc": "snes", ".smc": "snes", ".fig": "snes", ".swc": "snes",
  ".z64": "n64", ".n64": "n64", ".v64": "n64",
  ".gcm": "gc", ".gcz": "gc", ".rvz": "gc",
  ".wbfs": "wii", ".wia": "wii",
  ".wud": "wiiu", ".wux": "wiiu", ".rpx": "wiiu", ".wua": "wiiu",
  ".xci": "switch", ".nsp": "switch", ".nca": "switch",
  ".gb": "gb", ".gbc": "gbc", ".gba": "gba",
  ".nds": "ds", ".dsi": "ds",
  ".3ds": "3ds", ".cia": "3ds", ".cxi": "3ds",
  ".pbp": "psp", ".cso": "psp",
  ".xbe": "xbox", ".xiso": "xbox",
  ".md": "genesis", ".gen": "genesis", ".smd": "genesis",
  ".gg": "gg",
  ".gdi": "dreamcast",
  ".32x": "32x",
  ".a26": "atari2600",
  ".a52": "atari5200",
  ".a78": "atari7800",
  ".j64": "jaguar", ".jag": "jaguar",
  ".lnx": "lynx",
  ".pce": "tg16",
  ".ngp": "ngp", ".ngc": "ngpc",
  ".ws": "wswan", ".wsc": "wswanc",
  ".d64": "c64", ".t64": "c64", ".prg": "c64",
  ".adf": "amiga", ".hdf": "amiga",
  ".col": "colecovision",
  ".int": "intellivision",
};

function inferConsoleId(filepath: string, ext: string): string | null {
  const parts = filepath.replace(/\\/g, "/").split("/");
  for (let i = parts.length - 2; i >= 0; i--) {
    const segment = parts[i].toLowerCase().trim();
    if (FOLDER_ALIASES[segment]) return FOLDER_ALIASES[segment];
  }
  return EXT_TO_CONSOLE[ext] ?? null;
}

async function cleanTitle(filename: string): Promise<{ title: string; region?: string; revision?: string; disc?: number }> {
  if (IS_TAURI) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return invoke("clean_rom_title", { filename });
    } catch {}
  }
  const stem  = filename.replace(/\.[^.]+$/, "");
  const title = stem.replace(/\s*[\[\(][^\]\)]*[\]\)]/g, "").trim();
  return { title };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFolderScan(onComplete: () => void) {
  const [progress, setProgress] = useState<ScanProgress>({
    phase: "idle", found: 0, inserted: 0, skipped: 0, merged: 0, message: "",
  });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const scan = useCallback(async (targetConsoleId?: string) => {
    if (!IS_TAURI) {
      setProgress({ phase: "error", found: 0, inserted: 0, skipped: 0, merged: 0,
        message: "Folder scanning requires the desktop app." });
      return;
    }

    setScanResult(null);
    setProgress({ phase: "scanning", found: 0, inserted: 0, skipped: 0, merged: 0, message: "Opening folder picker…" });

    try {
      const { open }   = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");

      const selected = await open({
        directory: true, multiple: false,
        title: targetConsoleId
          ? "Select folder to scan for this console"
          : "Select your ROMs folder — subfolders will be auto-detected",
      });

      if (!selected || typeof selected !== "string") {
        setProgress({ phase: "idle", found: 0, inserted: 0, skipped: 0, merged: 0, message: "" });
        return;
      }

      setProgress({ phase: "scanning", found: 0, inserted: 0, skipped: 0, merged: 0, message: `Scanning ${selected}…` });

      const files = await invoke<Array<{
        filename: string; filepath: string; file_size: number; extension: string;
      }>>("scan_folder", { path: selected });

      setProgress({ phase: "parsing", found: files.length, inserted: 0, skipped: 0, merged: 0,
        message: `Found ${files.length} files — detecting consoles…` });

      // ── Per-folder dedup for multi-track disc images ──────────────────────
      // Dreamcast / PS1 / Sega CD games are often stored as a folder per disc
      // containing one .cue playlist + multiple .bin track files.
      // Strategy: if a folder has a .cue, collapse ALL files in that folder into
      // a single representative entry — use the .cue as filepath (emulator entry
      // point) and sum all .bin sizes so the display size is real.

      // Group all files by their parent folder path
      const folderMap = new Map<string, typeof files>();
      for (const file of files) {
        const folder = file.filepath.replace(/[/\\][^/\\]+$/, "");
        if (!folderMap.has(folder)) folderMap.set(folder, []);
        folderMap.get(folder)!.push(file);
      }

      // Build a deduplicated flat list: one entry per disc-folder (or per file
      // for consoles that don't use cue+bin layout)
      type FlatFile = { filename: string; filepath: string; file_size: number; extension: string };
      const flatFiles: FlatFile[] = [];

      // Descriptor extensions — small playlist/index files that point to track data
      const DESCRIPTOR_EXTS = new Set([".cue", ".gdi"]);

      for (const [, folderFiles] of folderMap) {
        const descriptor = folderFiles.find(f => DESCRIPTOR_EXTS.has(f.extension));
        if (descriptor) {
          // Collapse the whole folder to one entry.
          // Sum ALL non-descriptor files (handles .bin, .raw, .iso, numbered tracks)
          const totalSize = folderFiles
            .filter(f => !DESCRIPTOR_EXTS.has(f.extension))
            .reduce((s, f) => s + f.file_size, 0);
          flatFiles.push({
            filename:  descriptor.filename,
            filepath:  descriptor.filepath,
            file_size: totalSize > 0 ? totalSize : descriptor.file_size,
            extension: descriptor.extension,
          });
        } else {
          // No descriptor — include each file individually (chd, zip, 7z, etc.)
          for (const f of folderFiles) flatFiles.push(f);
        }
      }

      // ── Build individual entries ──────────────────────────────────────────
      type RawEntry = {
        console_id: string;
        title: string;
        disc: number;
        filename: string;
        filepath: string;
        file_size: number;
        format: string;
        region?: string;
        revision?: string;
      };

      const raw: RawEntry[] = [];
      let skipped = 0;
      const skippedFiles: SkippedFile[] = [];

      for (const file of flatFiles) {
        const consoleId = targetConsoleId ?? inferConsoleId(file.filepath, file.extension);
        if (!consoleId) {
          skipped++;
          skippedFiles.push({ filename: file.filename, filepath: file.filepath });
          continue;
        }

        const { title, region, revision, disc } = await cleanTitle(file.filename);

        raw.push({
          console_id: consoleId,
          title,
          disc:       disc ?? 1,
          filename:   file.filename,
          filepath:   file.filepath,
          file_size:  file.file_size,
          format:     file.extension,
          region,
          revision,
        });
      }

      // ── Group multi-disc entries ──────────────────────────────────────────
      // Key includes region so regional variants (USA/Europe/Japan) of the
      // same game are never merged together as "discs".
      // We only merge entries that have DIFFERENT disc numbers — if all entries
      // in a group share disc=1 (no disc tag in filename), they're separate games.
      const discGroups = new Map<string, RawEntry[]>();
      for (const entry of raw) {
        const regionKey = (entry.region ?? "").toLowerCase();
        const key = `${entry.console_id}::${entry.title.toLowerCase()}::${regionKey}`;
        if (!discGroups.has(key)) discGroups.set(key, []);
        discGroups.get(key)!.push(entry);
      }

      const batch: Parameters<typeof insertRomsBatch>[0] = [];
      const mergedGames: MergedGame[] = [];

      for (const [, group] of discGroups) {
        group.sort((a, b) => a.disc - b.disc);

        // Only treat as multi-disc if entries actually have different disc numbers.
        // If everything has disc=1 (no disc tag in filenames), they're separate games
        // that happen to share a title — insert each one individually.
        const discNumbers = new Set(group.map(e => e.disc));
        const isMultiDisc = group.length > 1 && discNumbers.size > 1;

        if (!isMultiDisc) {
          for (const e of group) {
            batch.push({
              console_id:   e.console_id,
              title:        e.title,
              filename:     e.filename,
              filepath:     e.filepath,
              file_size:    e.file_size,
              format:       e.format,
              region:       e.region,
              revision:     e.revision,
              is_exclusive: false,
            });
          }
        } else {
          // True multi-disc — merge into primary entry (disc 1)
          const primary    = group[0];
          const extraDiscs = group.slice(1).map(e => e.filepath);

          batch.push({
            console_id:   primary.console_id,
            title:        primary.title,
            filename:     primary.filename,
            filepath:     primary.filepath,
            file_size:    group.reduce((s, e) => s + e.file_size, 0),
            format:       primary.format,
            region:       primary.region,
            revision:     primary.revision,
            is_exclusive: false,
            discs:        extraDiscs,
          });

          mergedGames.push({
            title:     primary.title,
            discCount: group.length,
            discs:     group.map(e => e.filename),
          });
        }
      }

      setProgress({ phase: "inserting", found: flatFiles.length, inserted: 0, skipped, merged: mergedGames.length,
        message: `Inserting ${batch.length} ROMs…` });

      const CHUNK = 50;
      let done = 0, totalAdded = 0, totalUpdated = 0;
      for (let i = 0; i < batch.length; i += CHUNK) {
        const counts = await insertRomsBatch(batch.slice(i, i + CHUNK));
        totalAdded   += counts.added;
        totalUpdated += counts.updated;
        done = Math.min(done + CHUNK, batch.length);
        setProgress(p => ({ ...p, inserted: done, message: `Inserted ${done} / ${batch.length}…` }));
      }

      const parts = [
        totalAdded > 0   ? `✓ ${totalAdded} new ROM${totalAdded !== 1 ? "s" : ""} added`       : "",
        totalUpdated > 0 ? `${totalUpdated} already existed`                                     : "",
        skipped > 0      ? `${skipped} unmatched`                                                : "",
        mergedGames.length > 0 ? `${mergedGames.length} multi-disc merged`                      : "",
      ].filter(Boolean);

      if (parts.length === 0) parts.push("No new ROMs found");

      setProgress({
        phase: "done", found: flatFiles.length, inserted: totalAdded,
        skipped, merged: mergedGames.length,
        message: parts.join(" · "),
      });

      setScanResult({ inserted: totalAdded, updated: totalUpdated, skipped, merged: mergedGames, skippedFiles });
      onComplete();
      setTimeout(() => setProgress({ phase: "idle", found: 0, inserted: 0, skipped: 0, merged: 0, message: "" }), 6000);

    } catch (err) {
      setProgress({
        phase: "error", found: 0, inserted: 0, skipped: 0, merged: 0,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [onComplete]);

  return { progress, scan, scanResult, clearScanResult: () => setScanResult(null) };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
