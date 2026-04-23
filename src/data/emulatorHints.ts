/**
 * Suggested emulators per console, shown as hints in the Console Mapping tab.
 * Each entry lists one or two common options so users know what to look for.
 *
 * retroarch: true  → point to retroarch.exe, enable RetroArch mode, pick a core
 * retroarch: false → point to the emulator's own .exe, leave RetroArch mode off
 */

export interface EmulatorHint {
  name: string;
  retroarch: boolean;
  note?: string;  // extra context shown in brackets
  args?: string;  // default launch args (overrides "{rom}" default)
}

export const EMULATOR_HINTS: Record<string, EmulatorHint[]> = {
  // ── Nintendo ──────────────────────────────────────────────────────────────
  nes:        [{ name: "RetroArch + Mesen core",       retroarch: true  },
               { name: "RetroArch + FCEUmm core",      retroarch: true  }],
  snes:       [{ name: "RetroArch + Snes9x core",      retroarch: true  },
               { name: "RetroArch + bsnes core",       retroarch: true  }],
  n64:        [{ name: "RetroArch + Mupen64Plus core", retroarch: true  },
               { name: "simple64",                     retroarch: false }],
  gc:         [{ name: "Dolphin",                      retroarch: false, args: `-e "{rom}"` }],
  wii:        [{ name: "Dolphin",                      retroarch: false, args: `-e "{rom}"` }],
  wiiu:       [{ name: "Cemu",                         retroarch: false }],
  switch:     [{ name: "Ryujinx",                      retroarch: false },
               { name: "Yuzu / Suyu",                  retroarch: false }],
  gb:         [{ name: "RetroArch + Gambatte core",    retroarch: true  },
               { name: "mGBA",                         retroarch: false }],
  gbc:        [{ name: "RetroArch + Gambatte core",    retroarch: true  },
               { name: "mGBA",                         retroarch: false }],
  gba:        [{ name: "mGBA",                         retroarch: false },
               { name: "RetroArch + mGBA core",        retroarch: true  }],
  vb:         [{ name: "RetroArch + Beetle VB core",   retroarch: true  }],
  ds:         [{ name: "melonDS",                      retroarch: false },
               { name: "RetroArch + melonDS core",     retroarch: true  }],
  "3ds":      [{ name: "Citra / Lime3DS",              retroarch: false }],

  // ── Sony ──────────────────────────────────────────────────────────────────
  ps1:        [{ name: "DuckStation",                  retroarch: false },
               { name: "RetroArch + Beetle PSX core",  retroarch: true  }],
  ps2:        [{ name: "PCSX2",                        retroarch: false }],
  ps3:        [{ name: "RPCS3",                        retroarch: false }],
  ps4:        [{ name: "shadPS4",                      retroarch: false, note: "early dev" }],
  ps5:        [],
  psp:        [{ name: "PPSSPP",                       retroarch: false },
               { name: "RetroArch + PPSSPP core",      retroarch: true  }],
  vita:       [{ name: "Vita3K",                       retroarch: false }],

  // ── Microsoft ─────────────────────────────────────────────────────────────
  xbox:       [{ name: "Xemu",                         retroarch: false }],
  x360:       [{ name: "Xenia",                        retroarch: false }],
  xone:       [],

  // ── Sega ──────────────────────────────────────────────────────────────────
  sg1000:     [{ name: "RetroArch + blueMSX core",     retroarch: true  }],
  mastersystem:[{ name: "RetroArch + Genesis Plus GX", retroarch: true  }],
  genesis:    [{ name: "RetroArch + Genesis Plus GX",  retroarch: true  },
               { name: "Gens",                         retroarch: false }],
  scd:        [{ name: "RetroArch + Genesis Plus GX",  retroarch: true  }],
  "32x":      [{ name: "RetroArch + PicoDrive core",   retroarch: true  }],
  saturn:     [{ name: "RetroArch + Beetle Saturn",    retroarch: true  },
               { name: "Mednafen",                     retroarch: false }],
  dreamcast:  [{ name: "Flycast",                      retroarch: false },
               { name: "RetroArch + Flycast core",     retroarch: true  }],
  gg:         [{ name: "RetroArch + Genesis Plus GX",  retroarch: true  }],

  // ── Atari ─────────────────────────────────────────────────────────────────
  atari2600:  [{ name: "RetroArch + Stella core",      retroarch: true  }],
  atari5200:  [{ name: "RetroArch + Atari800 core",    retroarch: true  }],
  atari7800:  [{ name: "RetroArch + ProSystem core",   retroarch: true  }],
  jaguar:     [{ name: "RetroArch + Virtual Jaguar",   retroarch: true  }],
  jaguarcd:   [{ name: "RetroArch + Virtual Jaguar",   retroarch: true  }],
  lynx:       [{ name: "RetroArch + Handy core",       retroarch: true  }],
  atarist:    [{ name: "RetroArch + Hatari core",      retroarch: true  }],

  // ── NEC ───────────────────────────────────────────────────────────────────
  tg16:       [{ name: "RetroArch + Beetle PCE",       retroarch: true  }],
  pcenginecd: [{ name: "RetroArch + Beetle PCE",       retroarch: true  }],
  sgfx:       [{ name: "RetroArch + Beetle PCE",       retroarch: true  }],
  pcfx:       [{ name: "RetroArch + Beetle PC-FX",     retroarch: true  }],

  // ── SNK ───────────────────────────────────────────────────────────────────
  neogeo:     [{ name: "RetroArch + FBNeo core",       retroarch: true  }],
  ngcd:       [{ name: "RetroArch + FBNeo core",       retroarch: true  }],
  ngp:        [{ name: "RetroArch + RACE core",        retroarch: true  }],
  ngpc:       [{ name: "RetroArch + RACE core",        retroarch: true  }],

  // ── Bandai ────────────────────────────────────────────────────────────────
  wswan:      [{ name: "RetroArch + Beetle Cygne",     retroarch: true  }],
  wswanc:     [{ name: "RetroArch + Beetle Cygne",     retroarch: true  }],

  // ── Others ────────────────────────────────────────────────────────────────
  cdimaginaire:[{ name: "RetroArch + SAME_CDi core",   retroarch: true  }],
  "3do":      [{ name: "RetroArch + Opera core",       retroarch: true  }],
  arcade:     [{ name: "RetroArch + MAME core",        retroarch: true  },
               { name: "MAME (standalone)",            retroarch: false }],
  fbneo:      [{ name: "RetroArch + FBNeo core",       retroarch: true  }],
  dos:        [{ name: "DOSBox-X",                     retroarch: false },
               { name: "RetroArch + DOSBox-Pure core", retroarch: true  }],
  msx:        [{ name: "RetroArch + blueMSX core",     retroarch: true  }],
  msx2:       [{ name: "RetroArch + blueMSX core",     retroarch: true  }],
  amstrad:    [{ name: "RetroArch + CrocoDS core",     retroarch: true  }],
  zxspectrum: [{ name: "RetroArch + Fuse core",        retroarch: true  }],
  zx81:       [{ name: "RetroArch + EightyOne core",   retroarch: true  }],
  appleii:    [{ name: "RetroArch + AppleWin core",    retroarch: true  }],
  c64:        [{ name: "RetroArch + VICE core",        retroarch: true  }],
  amiga:      [{ name: "RetroArch + PUAE core",        retroarch: true  }],
  amiga1200:  [{ name: "RetroArch + PUAE core",        retroarch: true  }],
  vic20:      [{ name: "RetroArch + VICE core",        retroarch: true  }],
  c128:       [{ name: "RetroArch + VICE core",        retroarch: true  }],
  intellivision:[{ name: "RetroArch + FreeIntv core",  retroarch: true  }],
  colecovision:[{ name: "RetroArch + blueMSX core",    retroarch: true  }],
  odyssey2:   [{ name: "RetroArch + O2EM core",        retroarch: true  }],
};
