/**
 * consoleCatalog.ts
 * Extended catalog of popular platforms not in BUILT_IN_CONSOLES.
 * Used by the "Add Console" picker in the Guide tab.
 * Includes pre-filled emulation guide data for each entry.
 */

import type { GuideEntry } from "./guideData";

export interface CatalogConsole {
  id: string;
  company_id: string;       // used if company already exists, else companyName is shown
  company_name: string;     // display name for company grouping
  company_color: string;
  name: string;
  short_name: string;
  generation: number;
  release_year: number;
  guide: GuideEntry;
}

export const CONSOLE_CATALOG: CatalogConsole[] = [
  // ── Nintendo (built-in — shown here so they can be restored if deleted) ──

  {
    id: "nes", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Nintendo Entertainment System", short_name: "NES", generation: 3, release_year: 1983,
    guide: { primary_emulator_desktop: "Mesen", primary_emulator_android: "RetroArch (Mesen core)", primary_emulator_ios: "Delta", alt_emulators: ["RetroArch (Nestopia UE)", "FCEUX"], recommended_formats: [".nes", ".zip"], hardware_notes: ["Original hardware still widely available and robust.", "Famiclones are common but vary in compatibility."], pro_tips: ["Mesen is the most accurate NES emulator available.", "Use .nes (iNES) format — universally supported."] },
  },
  {
    id: "snes", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Super Nintendo Entertainment System", short_name: "SNES", generation: 4, release_year: 1990,
    guide: { primary_emulator_desktop: "BSNES / Snes9x", primary_emulator_android: "RetroArch (Snes9x core)", primary_emulator_ios: "Delta", alt_emulators: ["RetroArch (BSNES core)", "Snes9x"], recommended_formats: [".sfc", ".smc", ".zip"], hardware_notes: ["1CHIP models have the best video quality.", "Super Game Boy requires specific BIOS."], pro_tips: ["BSNES for accuracy, Snes9x for performance.", ".sfc is the preferred format."] },
  },
  {
    id: "n64", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Nintendo 64", short_name: "N64", generation: 5, release_year: 1996,
    guide: { primary_emulator_desktop: "Mupen64Plus-Next", primary_emulator_android: "Mupen64Plus FZ", primary_emulator_ios: "RetroArch", alt_emulators: ["Project64", "Ares"], recommended_formats: [".z64", ".n64", ".v64", ".zip"], hardware_notes: ["Expansion Pak required for some games.", "UltraHDMI mod for digital output."], pro_tips: ["Use .z64 (big-endian) format for best compatibility.", "Parallel-RDP plugin for accurate graphics."] },
  },
  {
    id: "gc", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "GameCube", short_name: "GameCube", generation: 6, release_year: 2001,
    guide: { primary_emulator_desktop: "Dolphin", primary_emulator_android: "Dolphin", primary_emulator_ios: "RetroArch (Dolphin core)", alt_emulators: [], recommended_formats: [".rvz", ".gcz", ".iso", ".gcm"], hardware_notes: ["GBA connectivity requires specific setup.", "Component cables give best analog video."], pro_tips: ["RVZ is the recommended compressed format.", "Dolphin supports widescreen hacks and HD textures."] },
  },
  {
    id: "wii", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Wii", short_name: "Wii", generation: 7, release_year: 2006,
    guide: { primary_emulator_desktop: "Dolphin", primary_emulator_android: "Dolphin", primary_emulator_ios: "RetroArch (Dolphin core)", alt_emulators: [], recommended_formats: [".rvz", ".wbfs", ".iso"], hardware_notes: ["Wii can play GameCube games natively.", "Homebrew Channel enables backup loading."], pro_tips: ["RVZ format saves significant space over ISO.", "WBFS is the most common dump format for Wii."] },
  },
  {
    id: "wiiu", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Wii U", short_name: "Wii U", generation: 8, release_year: 2012,
    guide: { primary_emulator_desktop: "Cemu", primary_emulator_android: "Cemu (Android)", primary_emulator_ios: "Not viable currently", alt_emulators: [], recommended_formats: [".wud", ".wux", ".rpx"], hardware_notes: ["GamePad required for some titles.", "Many titles ported to Switch."], pro_tips: ["Cemu is the gold standard — near-perfect compatibility.", "WUX is the compressed format of WUD dumps."] },
  },
  {
    id: "switch", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Nintendo Switch", short_name: "Switch", generation: 9, release_year: 2017,
    guide: { primary_emulator_desktop: "Ryujinx / Yuzu", primary_emulator_android: "Yuzu / Sudachi", primary_emulator_ios: "Not viable currently", alt_emulators: [], recommended_formats: [".xci", ".nsp"], hardware_notes: ["Early V1 Switch units are hackable.", "Requires prod.keys from your console."], pro_tips: ["XCI for cartridge dumps, NSP for eShop titles.", "Keys file is legally required from your own Switch."] },
  },
  {
    id: "gb", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Game Boy", short_name: "GB", generation: 4, release_year: 1989,
    guide: { primary_emulator_desktop: "SameBoy", primary_emulator_android: "RetroArch (Gambatte core)", primary_emulator_ios: "Delta", alt_emulators: ["Gambatte", "RetroArch (SameBoy core)"], recommended_formats: [".gb", ".zip"], hardware_notes: ["Original DMG model has iconic sound.", "Game Boy Pocket has sharper screen."], pro_tips: ["SameBoy is the most accurate emulator.", "Enable Game Boy Color mode for compatible games."] },
  },
  {
    id: "gbc", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Game Boy Color", short_name: "GBC", generation: 5, release_year: 1998,
    guide: { primary_emulator_desktop: "SameBoy", primary_emulator_android: "RetroArch (Gambatte core)", primary_emulator_ios: "Delta", alt_emulators: ["Gambatte", "RetroArch (SameBoy core)"], recommended_formats: [".gbc", ".gb", ".zip"], hardware_notes: ["Backwards compatible with original Game Boy.", "IPS screen mods dramatically improve visibility."], pro_tips: ["SameBoy handles GB/GBC colour palettes accurately.", ".gbc files are GBC-specific, .gb may run on either."] },
  },
  {
    id: "gba", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Game Boy Advance", short_name: "GBA", generation: 6, release_year: 2001,
    guide: { primary_emulator_desktop: "mGBA", primary_emulator_android: "My OldBoy! / mGBA", primary_emulator_ios: "Delta", alt_emulators: ["RetroArch (mGBA core)", "VisualBoyAdvance-M"], recommended_formats: [".gba", ".zip"], hardware_notes: ["GBA SP backlit screen is the best original hardware.", "AGS-101 model has the brightest screen."], pro_tips: ["mGBA is the definitive GBA emulator.", "BIOS file improves compatibility for some games."] },
  },
  {
    id: "ds", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Nintendo DS", short_name: "DS", generation: 7, release_year: 2004,
    guide: { primary_emulator_desktop: "melonDS", primary_emulator_android: "DraStic / melonDS", primary_emulator_ios: "RetroArch (melonDS core)", alt_emulators: ["RetroArch (DeSmuME core)"], recommended_formats: [".nds", ".zip"], hardware_notes: ["DS Lite has improved screens over original.", "DSi has better screens and more RAM."], pro_tips: ["melonDS is the most accurate DS emulator.", "BIOS and firmware files improve accuracy."] },
  },
  {
    id: "3ds", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Nintendo 3DS", short_name: "3DS", generation: 8, release_year: 2011,
    guide: { primary_emulator_desktop: "Citra / Lime3DS", primary_emulator_android: "Citra MMJ / Lime3DS", primary_emulator_ios: "RetroArch (Citra core)", alt_emulators: [], recommended_formats: [".3ds", ".cia", ".cxi"], hardware_notes: ["New 3DS has significantly better performance.", "CFW enables backup loading on real hardware."], pro_tips: ["Requires AES keys from your 3DS for encrypted titles.", "CIA format for eShop titles, 3DS for cartridges."] },
  },

  // ── Sony (built-in) ───────────────────────────────────────────────────────

  {
    id: "ps1", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation", short_name: "PS1", generation: 5, release_year: 1994,
    guide: { primary_emulator_desktop: "DuckStation", primary_emulator_android: "DuckStation", primary_emulator_ios: "RetroArch (DuckStation core)", alt_emulators: ["RetroArch (Beetle PSX HW)"], recommended_formats: [".chd", ".cue", ".bin"], hardware_notes: ["Net Yaroze was a developer version.", "PocketStation accessory for some Japan-only features."], pro_tips: ["DuckStation is the most accurate PS1 emulator.", "CHD format saves space and maintains single-file structure."] },
  },
  {
    id: "ps2", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation 2", short_name: "PS2", generation: 6, release_year: 2000,
    guide: { primary_emulator_desktop: "PCSX2", primary_emulator_android: "AetherSX2 / NetherSX2", primary_emulator_ios: "RetroArch (PCSX2 core)", alt_emulators: [], recommended_formats: [".chd", ".iso"], hardware_notes: ["Best-selling console of all time.", "Original HDD add-on for some titles."], pro_tips: ["PCSX2 has near-perfect compatibility.", "CHD format for space savings."] },
  },
  {
    id: "ps3", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation 3", short_name: "PS3", generation: 7, release_year: 2006,
    guide: { primary_emulator_desktop: "RPCS3", primary_emulator_android: "Not viable currently", primary_emulator_ios: "Not viable currently", alt_emulators: [], recommended_formats: [".pkg", ".iso"], hardware_notes: ["Early 60GB models can play PS2 games.", "Requires a powerful PC to emulate well."], pro_tips: ["RPCS3 has excellent compatibility for many titles.", "Firmware must be obtained legally from Sony's website."] },
  },
  {
    id: "ps4", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation 4", short_name: "PS4", generation: 8, release_year: 2013,
    guide: { primary_emulator_desktop: "shadPS4 (early)", primary_emulator_android: "Not viable currently", primary_emulator_ios: "Not viable currently", alt_emulators: [], recommended_formats: [".pkg"], hardware_notes: ["Most titles have PC ports available.", "PS4 Pro offers improved performance."], pro_tips: ["shadPS4 is in early development — limited compatibility.", "Many PS4 exclusives are now on PC."] },
  },
  {
    id: "psp", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation Portable", short_name: "PSP", generation: 7, release_year: 2005,
    guide: { primary_emulator_desktop: "PPSSPP", primary_emulator_android: "PPSSPP", primary_emulator_ios: "PPSSPP", alt_emulators: [], recommended_formats: [".chd", ".cso", ".iso"], hardware_notes: ["PSP-3000 has best screen of original models.", "CFW enables backup loading on real hardware."], pro_tips: ["PPSSPP has excellent compatibility.", "CSO/CHD are compressed formats that save significant space."] },
  },
  {
    id: "vita", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation Vita", short_name: "Vita", generation: 8, release_year: 2011,
    guide: { primary_emulator_desktop: "Vita3K", primary_emulator_android: "Not viable currently", primary_emulator_ios: "Not viable currently", alt_emulators: [], recommended_formats: [".pkg", ".vpk"], hardware_notes: ["OLED model (PCH-1000) has the best screen.", "CFW HENkaku enables backup loading."], pro_tips: ["Vita3K is in active development.", "Many Vita titles run better on CFW real hardware than emulation."] },
  },

  // ── Microsoft (built-in) ──────────────────────────────────────────────────

  {
    id: "xbox", company_id: "microsoft", company_name: "Microsoft", company_color: "#22b422",
    name: "Xbox", short_name: "Xbox", generation: 6, release_year: 2001,
    guide: { primary_emulator_desktop: "Xemu", primary_emulator_android: "Winlator (runs Xemu via Wine)", primary_emulator_ios: "Not viable currently", alt_emulators: ["CXBX-Reloaded"], recommended_formats: [".xiso", ".iso"], hardware_notes: ["Original Xbox is easily moddable.", "Softmod possible with game save exploits."], pro_tips: ["Xemu has good compatibility on desktop.", "Use .xiso (extracted ISO) format for best results.", "On Android, Winlator runs the Windows version of Xemu — requires a high-end device (Snapdragon 8 Gen 2+).", "Enable Turnip (Vulkan) driver in Winlator for better GPU performance."] },
  },
  {
    id: "x360", company_id: "microsoft", company_name: "Microsoft", company_color: "#22b422",
    name: "Xbox 360", short_name: "Xbox 360", generation: 7, release_year: 2005,
    guide: { primary_emulator_desktop: "Xenia Canary", primary_emulator_android: "Winlator (runs Xenia via Wine) — very demanding", primary_emulator_ios: "Not viable currently", alt_emulators: ["Xenia (stable)"], recommended_formats: [".iso", ".xex", ".zar"], hardware_notes: ["RGH/JTAG mod enables homebrew and backups.", "Slim and E models are more reliable."], pro_tips: ["Xenia Canary gets more frequent updates than stable — prefer it.", "Many 360 titles have backward compat on Xbox One/Series.", "On Android, Winlator can run Xenia but only flagship-tier devices will get playable framerates.", "Xbox 360 emulation on Android is still maturing — check compatibility lists before committing."] },
  },

  // ── Sega (built-in) ───────────────────────────────────────────────────────

  {
    id: "genesis", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Mega Drive / Genesis", short_name: "Genesis", generation: 4, release_year: 1988,
    guide: { primary_emulator_desktop: "Blastem / Genesis Plus GX", primary_emulator_android: "RetroArch (Genesis Plus GX)", primary_emulator_ios: "RetroArch", alt_emulators: ["Gens", "Kega Fusion"], recommended_formats: [".md", ".bin", ".zip"], hardware_notes: ["Model 1 VA3 and Model 2 VA2.3 have the best audio.", "32X and Sega CD add-ons."], pro_tips: ["BlastEm for accuracy, Genesis Plus GX for broad compatibility.", ".md is the standard format."] },
  },
  {
    id: "saturn", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega Saturn", short_name: "Saturn", generation: 5, release_year: 1994,
    guide: { primary_emulator_desktop: "Mednafen / Beetle Saturn", primary_emulator_android: "RetroArch (Yabause core)", primary_emulator_ios: "RetroArch", alt_emulators: ["SSF", "Yabause"], recommended_formats: [".chd", ".cue", ".bin"], hardware_notes: ["Region-free mod chip or swap trick.", "Action Replay 4M+ for memory expansion."], pro_tips: ["Mednafen/Beetle Saturn is the most accurate Saturn emulator.", "CHD format greatly reduces file sizes."] },
  },
  {
    id: "dreamcast", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega Dreamcast", short_name: "Dreamcast", generation: 6, release_year: 1998,
    guide: { primary_emulator_desktop: "Flycast", primary_emulator_android: "Flycast", primary_emulator_ios: "RetroArch (Flycast core)", alt_emulators: ["Redream", "NullDC"], recommended_formats: [".chd", ".gdi", ".cdi"], hardware_notes: ["Plays CD-R backups on unmodified hardware.", "GDEMU replaces GD-ROM drive with SD card."], pro_tips: ["Flycast has excellent compatibility and performance.", "GDI format for full-fidelity GD-ROM dumps, CHD to save space."] },
  },
  {
    id: "gg", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Game Gear", short_name: "Game Gear", generation: 4, release_year: 1990,
    guide: { primary_emulator_desktop: "RetroArch (Genesis Plus GX)", primary_emulator_android: "RetroArch (Genesis Plus GX)", primary_emulator_ios: "RetroArch", alt_emulators: ["Kega Fusion"], recommended_formats: [".gg", ".zip"], hardware_notes: ["Notoriously heavy on batteries.", "Capacitor recap mod improves screen quality."], pro_tips: ["Genesis Plus GX handles Game Gear accurately.", ".gg is the standard format."] },
  },
  {
    id: "scd", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega CD", short_name: "Sega CD", generation: 4, release_year: 1991,
    guide: { primary_emulator_desktop: "RetroArch (Genesis Plus GX)", primary_emulator_android: "RetroArch (Genesis Plus GX)", primary_emulator_ios: "RetroArch", alt_emulators: ["Gens", "Kega Fusion"], recommended_formats: [".chd", ".cue", ".bin"], hardware_notes: ["Requires Mega Drive / Genesis to operate.", "BIOS required for emulation."], pro_tips: ["Genesis Plus GX handles Sega CD well.", "CHD format for space savings."] },
  },
  {
    id: "32x", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega 32X", short_name: "32X", generation: 4, release_year: 1994,
    guide: { primary_emulator_desktop: "RetroArch (PicoDrive core)", primary_emulator_android: "RetroArch (PicoDrive core)", primary_emulator_ios: "RetroArch", alt_emulators: ["Gens", "Kega Fusion"], recommended_formats: [".32x", ".zip"], hardware_notes: ["Plugs into Mega Drive cartridge slot.", "Small library of about 40 games."], pro_tips: ["PicoDrive is the recommended 32X emulator.", "Combine with Sega CD for 32X CD games."] },
  },


  // ── Atari ─────────────────────────────────────────────────────────────────

  {
    id: "atari2600", company_id: "atari", company_name: "Atari", company_color: "#F7941D",
    name: "Atari 2600", short_name: "2600", generation: 2, release_year: 1977,
    guide: {
      primary_emulator_desktop: "Stella",
      primary_emulator_android: "RetroArch (Stella core)",
      primary_emulator_ios: "RetroArch (Stella core)",
      alt_emulators: ["RetroArch (Stella 2014 core)", "MAME"],
      recommended_formats: [".a26", ".bin", ".zip"],
      hardware_notes: [
        "Original hardware is very robust — most units still work after 40+ years.",
        "The six-switch 'Heavy Sixer' (1977–1978) is considered the best built unit.",
        "Flashcarts: Harmony Encore cartridge is the standard — supports the full library.",
        "The Atari 2600+ (2023 reissue) plays original carts and includes 10 games.",
      ],
      pro_tips: [
        "Stella is the gold-standard emulator — highly accurate with great CRT filters.",
        ".bin is the most common dump format; .a26 is identical with a different extension.",
        "Many 2600 games look better with a phosphor/CRT filter — the display was designed for CRFs.",
        "Paddle games (Breakout, Kaboom!) require analog input — use a mouse or analog stick mapped to paddle.",
      ],
    },
  },

  {
    id: "atari5200", company_id: "atari", company_name: "Atari", company_color: "#F7941D",
    name: "Atari 5200", short_name: "5200", generation: 2, release_year: 1982,
    guide: {
      primary_emulator_desktop: "Atari800 / MAME",
      primary_emulator_android: "RetroArch (Atari800 core)",
      primary_emulator_ios: "RetroArch (Atari800 core)",
      alt_emulators: ["AltirraHW", "RetroArch (MAME core)"],
      recommended_formats: [".a52", ".bin", ".zip"],
      hardware_notes: [
        "Original controllers are notoriously unreliable — the self-centering mechanism fails.",
        "Replacement controllers (Masterplay adapter for Atari 2600 sticks) are a popular fix.",
        "Requires BIOS ROM (atarixl.rom or atari5200.rom) for accurate emulation.",
      ],
      pro_tips: [
        "The 5200 is essentially an Atari 8-bit computer (400/800) in a console form factor.",
        "Many 5200 games are ports of Atari 8-bit computer titles — often superior to 2600 versions.",
        "Use analog axis mapping for the analog joystick — most emulators support mouse-as-paddle.",
      ],
    },
  },

  {
    id: "atari7800", company_id: "atari", company_name: "Atari", company_color: "#F7941D",
    name: "Atari 7800", short_name: "7800", generation: 3, release_year: 1986,
    guide: {
      primary_emulator_desktop: "A7800 / MAME",
      primary_emulator_android: "RetroArch (A7800 core)",
      primary_emulator_ios: "RetroArch (A7800 core)",
      alt_emulators: ["ProSystem", "MAME"],
      recommended_formats: [".a78", ".bin"],
      hardware_notes: [
        "Backward compatible with the Atari 2600 — plays the full 2600 library.",
        "The Atari 7800+ (2024) reissue plays original carts with HDMI output.",
        "Flashcarts: UNO Cart supports both 7800 and 2600 titles.",
      ],
      pro_tips: [
        "A7800 is the most accurate emulator; MAME is a good alternative.",
        "The 7800 has a high-resolution mode (160×240) that many games use — enable accurate scanlines.",
        "BIOS (7800.rom / 7800 BIOS.bin) is optional but recommended for full compatibility.",
      ],
    },
  },

  {
    id: "jaguar", company_id: "atari", company_name: "Atari", company_color: "#F7941D",
    name: "Atari Jaguar", short_name: "Jaguar", generation: 5, release_year: 1993,
    guide: {
      primary_emulator_desktop: "BigPEmu",
      primary_emulator_android: "RetroArch (Virtual Jaguar core)",
      primary_emulator_ios: "RetroArch (Virtual Jaguar core)",
      alt_emulators: ["Virtual Jaguar", "MAME"],
      recommended_formats: [".j64", ".jag", ".rom", ".zip"],
      hardware_notes: [
        "Small library (~70 titles) but some genuine gems: Tempest 2000, Alien vs. Predator, Doom.",
        "Original controller has a telephone keypad layout — emulation remaps these freely.",
        "Jaguar CD add-on is also emulated in BigPEmu.",
      ],
      pro_tips: [
        "BigPEmu is a massive leap in accuracy over older emulators — use it for best results.",
        "Virtual Jaguar (RetroArch core) is more compatible on mobile but less accurate.",
        "Tempest 2000 and Doom are legitimately great and worth experiencing in emulation.",
      ],
    },
  },

  {
    id: "lynx", company_id: "atari", company_name: "Atari", company_color: "#F7941D",
    name: "Atari Lynx", short_name: "Lynx", generation: 4, release_year: 1989,
    guide: {
      primary_emulator_desktop: "Mednafen / RetroArch (Handy core)",
      primary_emulator_android: "RetroArch (Handy core)",
      primary_emulator_ios: "RetroArch (Handy core)",
      alt_emulators: ["Handy", "MAME"],
      recommended_formats: [".lnx", ".zip"],
      hardware_notes: [
        "First handheld with a color backlit LCD — impressive for 1989.",
        "Requires BIOS (lynxboot.img) for accurate emulation.",
        "Original hardware has a notoriously short battery life (~4 hours on 6 AA batteries).",
      ],
      pro_tips: [
        "The Handy core in RetroArch is excellent — accurate and fast.",
        "Many Lynx games are landscape; some flip the screen for portrait play.",
        "California Games and Chip's Challenge are standout titles in the small library.",
      ],
    },
  },

  // ── NEC ───────────────────────────────────────────────────────────────────

  {
    id: "tg16", company_id: "nec", company_name: "NEC", company_color: "#2090d8",
    name: "TurboGrafx-16 / PC Engine", short_name: "TG-16", generation: 4, release_year: 1987,
    guide: {
      primary_emulator_desktop: "Mednafen / Ares",
      primary_emulator_android: "RetroArch (Beetle PCE core)",
      primary_emulator_ios: "RetroArch (Beetle PCE core)",
      alt_emulators: ["Beetle PCE Fast (RetroArch)", "MAME"],
      recommended_formats: [".pce", ".chd", ".cue+bin"],
      hardware_notes: [
        "Known as PC Engine in Japan — the Japanese library is far larger and often superior.",
        "The Analogue Pocket (with adapter) supports TG-16/PC Engine cartridges.",
        "PC Engine CD games require the System Card BIOS (syscard3.pce).",
        "The SuperGrafx is a more powerful variant — Mednafen handles both.",
      ],
      pro_tips: [
        "Use Beetle PCE (not PCE Fast) for full accuracy including CD games.",
        "Many of the best TG-16 games are Japan-only — Castlevania: Rondo of Blood, Dracula X.",
        ".chd format is recommended for CD games — massively smaller than .cue+bin.",
        "PC Engine mini (2019) confirms the library's value — great ports of arcade games.",
      ],
    },
  },

  {
    id: "pcfx", company_id: "nec", company_name: "NEC", company_color: "#2090d8",
    name: "PC-FX", short_name: "PC-FX", generation: 5, release_year: 1994,
    guide: {
      primary_emulator_desktop: "Mednafen",
      primary_emulator_android: "RetroArch (Beetle PC-FX core)",
      primary_emulator_ios: "RetroArch (Beetle PC-FX core)",
      alt_emulators: ["MAME"],
      recommended_formats: [".chd", ".cue+bin"],
      hardware_notes: [
        "Japan-only console with a very niche library (~62 games) focused on anime FMV titles.",
        "Requires BIOS (pcfx.rom) for emulation.",
        "Notable for the only home version of Chip Chan Kick! and Zenki.",
      ],
      pro_tips: [
        "Mednafen is the only accurate emulator; the RetroArch Beetle PC-FX core wraps it.",
        ".chd format significantly reduces file sizes for this CD-based system.",
        "Library is almost entirely Japan-only visual novels and anime games.",
      ],
    },
  },

  // ── SNK ───────────────────────────────────────────────────────────────────

  {
    id: "neogeo", company_id: "snk", company_name: "SNK", company_color: "#E8A000",
    name: "Neo Geo AES / MVS", short_name: "Neo Geo", generation: 4, release_year: 1990,
    guide: {
      primary_emulator_desktop: "MAME / FinalBurn Neo",
      primary_emulator_android: "RetroArch (FinalBurn Neo core)",
      primary_emulator_ios: "RetroArch (FinalBurn Neo core)",
      alt_emulators: ["Ares", "NeoRAGEx (legacy)"],
      recommended_formats: [".zip", ".7z", ".neo"],
      hardware_notes: [
        "The AES (home) and MVS (arcade) share the same ROM hardware — same games, different packaging.",
        "Original AES cartridges are extremely expensive collectors items.",
        "Analogue Pocket (with adapter) and Analogue Mega Sg can play Neo Geo via cores.",
        "BIOS ROMs (neogeo.zip) are required — ensure you have the correct version.",
      ],
      pro_tips: [
        "FinalBurn Neo is the recommended emulator — actively maintained, great compatibility.",
        "ROM sets are in MAME format — use a MAME-compatible ROM set (0.258+).",
        "The .neo format (Neobuilder) is a modern single-file format for Neo Geo ROMs.",
        "Samurai Shodown series, Metal Slug series, and KOF series are must-plays.",
      ],
    },
  },

  {
    id: "ngpc", company_id: "snk", company_name: "SNK", company_color: "#E8A000",
    name: "Neo Geo Pocket Color", short_name: "NGPC", generation: 5, release_year: 1999,
    guide: {
      primary_emulator_desktop: "Mednafen / NeoPop",
      primary_emulator_android: "RetroArch (Beetle NeoPop core)",
      primary_emulator_ios: "RetroArch (Beetle NeoPop core)",
      alt_emulators: ["MAME", "NeoPop"],
      recommended_formats: [".ngc", ".ngp", ".zip"],
      hardware_notes: [
        "A brilliant handheld with a clicky microswitched joystick — widely praised for feel.",
        "Short-lived but quality library: SNK vs. Capcom, Sonic Pocket Adventure, Metal Slug 1st Mission.",
        "Also emulates the monochrome Neo Geo Pocket (NGP) — same hardware, earlier model.",
      ],
      pro_tips: [
        "Beetle NeoPop is highly accurate and handles both NGP and NGPC ROM sets.",
        "The microswitched thumbstick in NGPC games feels different — use a good D-pad mapping.",
        "Small library (~80 color games) but extremely high quality-to-quantity ratio.",
      ],
    },
  },

  // ── Bandai ────────────────────────────────────────────────────────────────

  {
    id: "wswan", company_id: "bandai", company_name: "Bandai", company_color: "#E4002B",
    name: "WonderSwan Color", short_name: "WS Color", generation: 5, release_year: 2000,
    guide: {
      primary_emulator_desktop: "Mednafen",
      primary_emulator_android: "RetroArch (Beetle Cygne core)",
      primary_emulator_ios: "RetroArch (Beetle Cygne core)",
      alt_emulators: ["Ares", "MAME"],
      recommended_formats: [".wsc", ".ws", ".zip"],
      hardware_notes: [
        "Japan-only handheld with a unique dual-orientation design — games can be played horizontal or vertical.",
        "Designed by Gunpei Yokoi (Game Boy creator) after leaving Nintendo.",
        "Both monochrome WonderSwan and color WonderSwan Color are emulated.",
        "Some great Final Fantasy ports and exclusives — FF I, II, IV exclusive arrangement.",
      ],
      pro_tips: [
        "Beetle Cygne (Mednafen core) is the most accurate emulator.",
        ".wsc for color games, .ws for monochrome — ensure correct extension for best compatibility.",
        "Rotation is important — some games are designed for portrait orientation.",
        "Final Fantasy titles here are exclusive arrangements not available elsewhere.",
      ],
    },
  },

  // ── Sega additions ────────────────────────────────────────────────────────

  {
    id: "mastersystem", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega Master System", short_name: "SMS", generation: 3, release_year: 1986,
    guide: {
      primary_emulator_desktop: "Ares / Mesen",
      primary_emulator_android: "RetroArch (Genesis Plus GX core)",
      primary_emulator_ios: "RetroArch (Genesis Plus GX core)",
      alt_emulators: ["BizHawk", "Fusion (legacy)", "MAME"],
      recommended_formats: [".sms", ".zip"],
      hardware_notes: [
        "Far more popular in Brazil and Europe than in North America.",
        "Brazil's TecToy still manufactures SMS variants to this day.",
        "The Mark III (Japan) is the base hardware — SMS is the export version.",
        "Sega My Card format also supported — many early titles used cards, not cartridges.",
      ],
      pro_tips: [
        "Genesis Plus GX handles SMS, Game Gear, Genesis, and Sega CD in one core.",
        "The Japanese library (Mark III) has some exclusives not released elsewhere.",
        "Alex Kidd in Miracle World is built into the BIOS — loads automatically without a cart.",
        "Enable FM Sound emulation for Japanese versions with enhanced audio.",
      ],
    },
  },

  {
    id: "sg1000", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega SG-1000", short_name: "SG-1000", generation: 2, release_year: 1983,
    guide: {
      primary_emulator_desktop: "Ares / Mesen",
      primary_emulator_android: "RetroArch (Genesis Plus GX core)",
      primary_emulator_ios: "RetroArch (Genesis Plus GX core)",
      alt_emulators: ["MAME"],
      recommended_formats: [".sg", ".zip"],
      hardware_notes: [
        "Sega's first home console — released the same day as the Famicom in Japan.",
        "Japan-only release; similar hardware to the Colecovision.",
        "Small but historically interesting library — many arcade conversions.",
      ],
      pro_tips: [
        "Genesis Plus GX handles SG-1000 alongside SMS and Genesis.",
        "Library is small (~68 titles) — mostly Japan-only arcade ports.",
        "The SC-3000 computer variant shares the same hardware and is also emulated.",
      ],
    },
  },

  {
    id: "gamegearadv", company_id: "sega", company_name: "Sega", company_color: "#2080cc",
    name: "Sega Pico", short_name: "Pico", generation: 4, release_year: 1993,
    guide: {
      primary_emulator_desktop: "Ares / MAME",
      primary_emulator_android: "RetroArch (PicoDrive core)",
      primary_emulator_ios: "RetroArch (PicoDrive core)",
      alt_emulators: ["Genesis Plus GX"],
      recommended_formats: [".md", ".bin"],
      hardware_notes: [
        "Educational children's console with a book-style flip-up screen and activity books.",
        "Uses special cartridges with embedded activity books; the stylus interacts with pages.",
        "Rare and collectible — original hardware and software are increasingly hard to find.",
      ],
      pro_tips: [
        "PicoDrive core handles Pico emulation alongside standard Genesis/32X.",
        "The touchpad/storybook page input is complex — mouse mapping works best.",
        "Despite being a children's toy, it has a genuine library of ~80 titles.",
      ],
    },
  },

  // ── Microsoft additions ───────────────────────────────────────────────────

  {
    id: "xone", company_id: "microsoft", company_name: "Microsoft", company_color: "#22b422",
    name: "Xbox One", short_name: "Xbox One", generation: 8, release_year: 2013,
    guide: {
      primary_emulator_desktop: "Xenia Canary (some titles)",
      primary_emulator_android: "Not viable currently",
      primary_emulator_ios: "Not viable",
      alt_emulators: ["Xenia (limited compatibility)"],
      recommended_formats: [".iso", ".xex"],
      hardware_notes: [
        "Xbox One hardware still widely available and affordable secondhand.",
        "Xbox One S and X are fully backward compatible with 360 and original Xbox titles.",
        "Xbox Series X/S backward compatibility covers most of the Xbox One library.",
        "Xbox Game Pass Ultimate remains an excellent way to access the library digitally.",
      ],
      pro_tips: [
        "Emulation is currently very early-stage — most titles don't run in Xenia.",
        "Original hardware or Xbox Series X/S remains the recommended option.",
        "Physical Xbox One games work in Series X/S with free upgrades for many titles.",
        "Xbox backwards compatibility program is extensive — check Xbox.com for the list.",
      ],
    },
  },

  {
    id: "xseries", company_id: "microsoft", company_name: "Microsoft", company_color: "#22b422",
    name: "Xbox Series X/S", short_name: "Xbox Series", generation: 9, release_year: 2020,
    guide: {
      primary_emulator_desktop: "Not available",
      primary_emulator_android: "Not available",
      primary_emulator_ios: "Not available",
      alt_emulators: [],
      recommended_formats: [],
      hardware_notes: [
        "Current-generation hardware — no emulation available.",
        "Extensive backward compatibility covers original Xbox, 360, and Xbox One libraries.",
        "Xbox Cloud Gaming (xCloud) streams Series X-quality games to any device.",
        "Xbox Game Pass Ultimate is arguably the best value in console gaming.",
      ],
      pro_tips: [
        "The Series S is an excellent budget option — same games, lower resolution/framerates.",
        "Quick Resume feature can suspend up to 6 games simultaneously.",
        "Free 1TB storage expansion cards are expensive — USB external drives work for older games.",
      ],
    },
  },

  // ── Nintendo additions ────────────────────────────────────────────────────

  {
    id: "vb", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Virtual Boy", short_name: "Virtual Boy", generation: 5, release_year: 1995,
    guide: {
      primary_emulator_desktop: "Mednafen / Red Viper (RetroArch)",
      primary_emulator_android: "RetroArch (Beetle VB core)",
      primary_emulator_ios: "RetroArch (Beetle VB core)",
      alt_emulators: ["Ares", "VBjin"],
      recommended_formats: [".vb", ".zip"],
      hardware_notes: [
        "Nintendo's commercial failure — discontinued after less than 1 year and only in North America/Japan.",
        "Original hardware uses a parallax red LED display — causes eye strain with extended use.",
        "Only 22 games released in North America; 14 Japan-exclusives bring total to 22.",
        "Collector items — loose carts are affordable, but the stand is often missing.",
      ],
      pro_tips: [
        "Emulators let you play with color palettes — the red/black aesthetic can be changed.",
        "Beetle VB (Mednafen) is the most accurate emulator.",
        "Best games: Wario Land, Galactic Pinball, Teleroboxer, Mario's Tennis.",
        "The stereoscopic 3D effect can be simulated with anaglyph (red/blue glasses) mode.",
      ],
    },
  },

  {
    id: "fds", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Famicom Disk System", short_name: "FDS", generation: 3, release_year: 1986,
    guide: {
      primary_emulator_desktop: "Mesen",
      primary_emulator_android: "RetroArch (Mesen core)",
      primary_emulator_ios: "Delta",
      alt_emulators: ["FCEUX", "Nestopia UE"],
      recommended_formats: [".fds"],
      hardware_notes: [
        "Japan-only floppy disk add-on for the Famicom.",
        "Required BIOS (disksys.rom) for emulation.",
        "Enabled Zelda, Metroid, Kid Icarus, and many other classics in Japan.",
        "Disks could be re-written at Disk Writer kiosks — a form of early game updates.",
      ],
      pro_tips: [
        "Mesen handles FDS with excellent accuracy including disk-swapping.",
        "Many FDS games were later released as Famicom/NES carts — slight differences exist.",
        "The FDS has expansion audio (wave-table channel) not present on cartridge releases.",
        "Zelda, Metroid, and Castlevania all originated or had significant versions on FDS.",
      ],
    },
  },

  {
    id: "gba_sp", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Game Boy Advance SP", short_name: "GBA SP", generation: 6, release_year: 2003,
    guide: {
      primary_emulator_desktop: "mGBA",
      primary_emulator_android: "RetroArch (mGBA core)",
      primary_emulator_ios: "Delta",
      alt_emulators: ["VisualBoyAdvance-M", "Ares"],
      recommended_formats: [".gba", ".zip"],
      hardware_notes: [
        "Same GBA library as the original GBA — same emulation, different shell.",
        "The AGS-101 (backlit model) is highly sought-after for its superior screen.",
        "Plays GB and GBC carts as well as GBA titles.",
        "IPS/TFT screen mods for original GBA are popular with collectors.",
      ],
      pro_tips: [
        "This uses the same ROM set and emulators as the standard GBA.",
        "mGBA is the gold standard — accurate, fast, great on all platforms.",
        "The GBA library is one of the best of any handheld — Super Mario series, Golden Sun, Metroid Fusion.",
      ],
    },
  },

  {
    id: "dsi", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "Nintendo DSi", short_name: "DSi", generation: 7, release_year: 2008,
    guide: {
      primary_emulator_desktop: "melonDS",
      primary_emulator_android: "RetroArch (melonDS core)",
      primary_emulator_ios: "RetroArch (melonDS core)",
      alt_emulators: ["DeSmuME", "RetroArch (DeSmuME core)"],
      recommended_formats: [".nds", ".dsi", ".zip"],
      hardware_notes: [
        "DSi-enhanced and DSi-exclusive titles require a DSi or 3DS to run properly.",
        "DSiWare games were digital-only — preservation is important.",
        "The DSi added cameras, SD card slot, and an online shop (now closed).",
      ],
      pro_tips: [
        "melonDS handles DSi mode — use it for DSi-exclusive and DSi-enhanced titles.",
        "DeSmuME is still widely used for standard DS games on older hardware.",
        "DSiWare (.dsi) files require DSi mode in melonDS to run.",
        "DSi NAND is required for DSi mode emulation.",
      ],
    },
  },

  {
    id: "n3dsxl", company_id: "nintendo", company_name: "Nintendo", company_color: "#E60012",
    name: "New Nintendo 3DS", short_name: "New 3DS", generation: 8, release_year: 2014,
    guide: {
      primary_emulator_desktop: "Citra / Lime3DS",
      primary_emulator_android: "Citra MMJ / Lime3DS",
      primary_emulator_ios: "Folium",
      alt_emulators: ["RetroArch (Citra core — limited)"],
      recommended_formats: [".3ds", ".cia", ".3dsx"],
      hardware_notes: [
        "New 3DS has exclusive titles that require the upgraded CPU — uses same emulator.",
        "Citra project ended — Lime3DS is the maintained community fork.",
        "Hardware is still widely available; Homebrew/CFW (Luma3DS) is well documented.",
      ],
      pro_tips: [
        "Lime3DS (Citra fork) handles both original 3DS and New 3DS titles.",
        "New 3DS exclusive titles: Xenoblade Chronicles 3D, Fire Emblem Fates (runs better).",
        ".cia is the installed title format; .3ds is a raw ROM format — both work in Lime3DS.",
      ],
    },
  },

  // ── Sony additions ────────────────────────────────────────────────────────

  {
    id: "ps5", company_id: "sony", company_name: "Sony", company_color: "#2f6bcc",
    name: "PlayStation 5", short_name: "PS5", generation: 9, release_year: 2020,
    guide: {
      primary_emulator_desktop: "Not available",
      primary_emulator_android: "Not available",
      primary_emulator_ios: "Not available",
      alt_emulators: [],
      recommended_formats: [],
      hardware_notes: [
        "Current-generation hardware — no emulation available.",
        "PS5 is backward compatible with virtually the entire PS4 library.",
        "PlayStation Plus Premium includes a catalog of PS1, PS2, PS3 (streaming), and PS4 games.",
        "The PS5 Slim (2023) has a detachable disc drive option.",
      ],
      pro_tips: [
        "PS4 discs play on PS5 with free performance upgrades for many titles.",
        "DualSense haptics and adaptive triggers are system-level features — most games support them.",
        "1TB SSDs in the M.2 slot expand storage — Samsung 980/990 Pro are popular choices.",
      ],
    },
  },

  // ── Computers / Arcades ───────────────────────────────────────────────────

  {
    id: "arcade", company_id: "arcade", company_name: "Arcade", company_color: "#FF6600",
    name: "Arcade (MAME)", short_name: "Arcade", generation: 0, release_year: 1970,
    guide: {
      primary_emulator_desktop: "MAME",
      primary_emulator_android: "RetroArch (MAME core) / MAME4droid",
      primary_emulator_ios: "RetroArch (MAME core)",
      alt_emulators: ["FinalBurn Neo (CPS/Neo Geo focus)", "HBMAME (hacks/homebrews)"],
      recommended_formats: [".zip", ".chd"],
      hardware_notes: [
        "MAME emulates over 40,000 unique arcade systems and machines.",
        "ROMs must match the exact MAME version — use merged ROM sets for compatibility.",
        "CHD files are required for hard disk and CD-ROM based arcade games.",
        "Original arcade hardware is extremely expensive and maintenance-intensive.",
      ],
      pro_tips: [
        "Always match your ROM set to your MAME version — mismatches cause instant failures.",
        "FinalBurn Neo is better for Capcom, Neo Geo, and Cave — more focused and faster.",
        "MAME's -listclones flag shows parent/clone relationships for confusing ROM sets.",
        ".chd files store disc/HDD data — required for CPS3, Naomi, and many others.",
        "Use MAME's built-in artwork system for bezels and overlays.",
      ],
    },
  },

  {
    id: "cps1", company_id: "capcom", company_name: "Capcom", company_color: "#3a88d8",
    name: "Capcom CPS-1", short_name: "CPS-1", generation: 4, release_year: 1988,
    guide: {
      primary_emulator_desktop: "FinalBurn Neo / MAME",
      primary_emulator_android: "RetroArch (FinalBurn Neo core)",
      primary_emulator_ios: "RetroArch (FinalBurn Neo core)",
      alt_emulators: ["MAME"],
      recommended_formats: [".zip"],
      hardware_notes: [
        "The CPS-1 board powered iconic Capcom titles: Street Fighter II, Final Fight, Ghouls 'n Ghosts.",
        "Original boards are expensive and actively traded by collectors.",
        "JAMMA connector standard means original PCBs fit in many arcade cabinets.",
      ],
      pro_tips: [
        "FinalBurn Neo has excellent CPS-1/CPS-2 accuracy and is faster than MAME.",
        "Street Fighter II Championship Edition, Final Fight, and Alien vs. Predator are must-plays.",
        "Input lag is very low in FBN — important for fighting games.",
      ],
    },
  },

  {
    id: "cps2", company_id: "capcom", company_name: "Capcom", company_color: "#3a88d8",
    name: "Capcom CPS-2", short_name: "CPS-2", generation: 5, release_year: 1993,
    guide: {
      primary_emulator_desktop: "FinalBurn Neo / MAME",
      primary_emulator_android: "RetroArch (FinalBurn Neo core)",
      primary_emulator_ios: "RetroArch (FinalBurn Neo core)",
      alt_emulators: ["MAME"],
      recommended_formats: [".zip"],
      hardware_notes: [
        "Powered Super Street Fighter II Turbo, Marvel vs. Capcom, Dungeons & Dragons.",
        "CPS-2 boards had a suicide battery — dead battery = dead board. Most are now 'decrypted'.",
        "The CPS Changer (Japan) was a home version of the CPS-2.",
      ],
      pro_tips: [
        "FinalBurn Neo is the preferred emulator for CPS-2 — great accuracy and speed.",
        "Marvel vs. Capcom 1 & 2 originate on CPS-2 (MvC2 is actually NAOMI).",
        "Progear no Arashi (Cave shooter on CPS-2) is extremely rare and valuable.",
      ],
    },
  },

  {
    id: "dos", company_id: "pc", company_name: "PC", company_color: "#3399ee",
    name: "DOS / PC (x86)", short_name: "DOS", generation: 0, release_year: 1981,
    guide: {
      primary_emulator_desktop: "DOSBox-X / DOSBox Staging",
      primary_emulator_android: "RetroArch (DOSBox Pure core)",
      primary_emulator_ios: "iDOS 3",
      alt_emulators: ["DOSBox (original)", "86Box (for Windows 3.x/95)"],
      recommended_formats: [".exe", ".com", ".iso", ".img", ".zip"],
      hardware_notes: [
        "Covers games from the early 1980s through mid-1990s before Windows became dominant.",
        "Many DOS games are available DRM-free via GOG.com with pre-configured DOSBox.",
        "86Box / PCem for accurate emulation of specific hardware (Sound Blaster, Gravis).",
      ],
      pro_tips: [
        "DOSBox-X is the most feature-complete fork — handles CD-ROM games and networking.",
        "DOSBox Pure (RetroArch) is excellent for casual play — auto-configures most games.",
        "Sound Blaster 16 + Roland MT-32 (emulated via Munt) gives the best audio experience.",
        "Quake, Doom, Duke Nukem 3D, and Warcraft II are classics that hold up extremely well.",
        "Many old DOS games are free on Archive.org — legal preservation copies.",
      ],
    },
  },

  {
    id: "amiga", company_id: "commodore", company_name: "Commodore", company_color: "#2080cc",
    name: "Amiga", short_name: "Amiga", generation: 3, release_year: 1985,
    guide: {
      primary_emulator_desktop: "WinUAE (Windows) / FS-UAE (cross-platform)",
      primary_emulator_android: "RetroArch (PUAE core)",
      primary_emulator_ios: "RetroArch (PUAE core)",
      alt_emulators: ["Amiberry (Pi/Linux focus)", "PUAE"],
      recommended_formats: [".adf", ".hdf", ".lha", ".ipf", ".zip"],
      hardware_notes: [
        "Commodore Amiga was far more popular in Europe than the US.",
        "Kickstart ROM is required — 1.3 for A500, 3.1 for A1200/CD32.",
        "The Amiga CD32 (1993) was a CD-ROM based Amiga — emulated separately.",
        "Many Amiga games were on floppy disks and require multi-disk handling.",
      ],
      pro_tips: [
        "WinUAE is the definitive emulator on Windows — extremely accurate.",
        "FS-UAE is the cross-platform alternative based on WinUAE.",
        ".ipf format (from CAPS/SPS) is the most accurate disk image format.",
        "The WHDLoad system lets you install games to hard disk — modern .lha packs use this.",
        "Sensible Soccer, Lemmings, Monkey Island, Turrican — standout titles.",
      ],
    },
  },

  {
    id: "c64", company_id: "commodore", company_name: "Commodore", company_color: "#2080cc",
    name: "Commodore 64", short_name: "C64", generation: 2, release_year: 1982,
    guide: {
      primary_emulator_desktop: "VICE",
      primary_emulator_android: "RetroArch (VICE x64sc core)",
      primary_emulator_ios: "RetroArch (VICE x64sc core)",
      alt_emulators: ["CCS64", "Hoxs64"],
      recommended_formats: [".d64", ".t64", ".prg", ".crt", ".tap"],
      hardware_notes: [
        "Best-selling home computer of all time — ~17 million units sold.",
        "The SID chip's sound is legendary — VICE emulates it extremely accurately.",
        "C64 Mini / C64 Maxi are modern reissues with built-in games.",
        "TheC64 joystick is a faithful modern reproduction for desk use.",
      ],
      pro_tips: [
        "VICE is the reference emulator — x64sc is the more accurate C64 model.",
        ".d64 is the standard disk image format; .crt is for cartridge games.",
        "The C64 library has over 10,000 games — use the HVSC for SID music collections.",
        "Loader sounds (tape loading) can be skipped in VICE with warp mode.",
        "Impossible Mission, Summer Games, Elite, and Last Ninja are landmark C64 titles.",
      ],
    },
  },

  {
    id: "zxspectrum", company_id: "sinclair", company_name: "Sinclair", company_color: "#3a88d8",
    name: "ZX Spectrum", short_name: "Spectrum", generation: 2, release_year: 1982,
    guide: {
      primary_emulator_desktop: "Fuse",
      primary_emulator_android: "RetroArch (Fuse core)",
      primary_emulator_ios: "RetroArch (Fuse core)",
      alt_emulators: ["Spectaculator (Windows)", "ZXSpin"],
      recommended_formats: [".z80", ".sna", ".tap", ".tzx", ".zip"],
      hardware_notes: [
        "The definitive home computer of 1980s UK — millions of units sold.",
        "Rubber keyboard ('Speccy') is iconic — many games used keyboard input.",
        "Multiple models: 48K, 128K, +2, +3 — different capabilities.",
        "The ZX Spectrum Next is a modern FPGA-based enhancement.",
      ],
      pro_tips: [
        "Fuse is the most accurate and well-maintained emulator.",
        ".tzx is the most accurate tape format; .tap is simpler but widely used.",
        ".z80 and .sna are snapshot formats — instant loading, no tape simulation.",
        "Jet Set Willy, Manic Miner, Sabre Wulf — definitive Spectrum experiences.",
      ],
    },
  },

  {
    id: "msx", company_id: "various", company_name: "Various (MSX)", company_color: "#2090d8",
    name: "MSX / MSX2", short_name: "MSX", generation: 3, release_year: 1983,
    guide: {
      primary_emulator_desktop: "openMSX",
      primary_emulator_android: "RetroArch (blueMSX core)",
      primary_emulator_ios: "RetroArch (blueMSX core)",
      alt_emulators: ["blueMSX", "fMSX"],
      recommended_formats: [".rom", ".dsk", ".cas", ".zip"],
      hardware_notes: [
        "MSX was a standardised home computer format used by Sony, Philips, Panasonic, and others.",
        "Hugely popular in Japan — Konami made many classics here first (Metal Gear, Castlevania).",
        "MSX2 adds improved graphics and more RAM — most late-library titles require it.",
        "Machine ROMs (BIOS) are required — vary by manufacturer and model.",
      ],
      pro_tips: [
        "openMSX is the most accurate emulator — supports virtually all MSX variants.",
        "Metal Gear and Metal Gear 2: Solid Snake originated on MSX2 — play them here.",
        "Konami's SCC sound chip (in Gradius, Castlevania) sounds incredible — enable it.",
        "Castlevania (Vampire Killer) on MSX has different level design than the NES version.",
      ],
    },
  },

  {
    id: "pcenginecd", company_id: "nec", company_name: "NEC", company_color: "#2090d8",
    name: "PC Engine CD-ROM²", short_name: "PCE-CD", generation: 4, release_year: 1988,
    guide: {
      primary_emulator_desktop: "Mednafen / Ares",
      primary_emulator_android: "RetroArch (Beetle PCE core)",
      primary_emulator_ios: "RetroArch (Beetle PCE core)",
      alt_emulators: ["Ootake"],
      recommended_formats: [".chd", ".cue+bin", ".iso"],
      hardware_notes: [
        "World's first CD-ROM add-on for a home gaming console.",
        "Requires System Card BIOS — System Card 3.0 (syscard3.pce) for Super CD-ROM titles.",
        "Library includes Rondo of Blood, Lords of Thunder, Ys I & II.",
        "The PC Engine Duo combined the base unit and CD drive — most common for collectors.",
      ],
      pro_tips: [
        "Use Beetle PCE (full, not Fast) for CD games — the accurate ADPCM audio matters.",
        ".chd is strongly recommended — reduces 700MB CDs to under 200MB typically.",
        "Castlevania: Rondo of Blood (Japan only) is arguably the best in the series.",
        "Ys I & II CD has a legendary soundtrack — the CD audio is a huge upgrade.",
      ],
    },
  },

  {
    id: "3do", company_id: "3do", company_name: "3DO Company", company_color: "#7B1FA2",
    name: "3DO Interactive Multiplayer", short_name: "3DO", generation: 5, release_year: 1993,
    guide: {
      primary_emulator_desktop: "Opera",
      primary_emulator_android: "RetroArch (Opera core)",
      primary_emulator_ios: "RetroArch (Opera core)",
      alt_emulators: ["FreeDO (legacy)"],
      recommended_formats: [".chd", ".cue+bin", ".iso"],
      hardware_notes: [
        "Expensive console at launch ($699) — killed by Saturn and PlayStation pricing.",
        "Manufactured by multiple companies: Panasonic, Goldstar, Sanyo.",
        "Requires 3DO BIOS ROM (panafz10.bin is most compatible).",
        "Small but interesting library: Road Rash, Gex, Star Control II.",
      ],
      pro_tips: [
        "Opera is the only accurate emulator — actively maintained.",
        "3DO BIOS is required — Panasonic FZ-10 BIOS (panafz10.bin) is recommended.",
        ".chd reduces disc image sizes significantly for this CD-only system.",
        "Star Control II (The Ur-Quan Masters) is the standout title.",
      ],
    },
  },

  {
    id: "cdimaginaire", company_id: "philips", company_name: "Philips", company_color: "#3366cc",
    name: "Philips CD-i", short_name: "CD-i", generation: 5, release_year: 1991,
    guide: {
      primary_emulator_desktop: "MAME",
      primary_emulator_android: "RetroArch (MAME core — limited)",
      primary_emulator_ios: "Not viable",
      alt_emulators: ["CD-i Emu (legacy)"],
      recommended_formats: [".chd", ".cue+bin"],
      hardware_notes: [
        "Infamous for three licensed Zelda and two Mario games — universally panned.",
        "Also had some genuinely good titles: Burn:Cycle, Kether.",
        "BIOS ROM required — multiple hardware revisions exist.",
        "An interesting piece of gaming history rather than a great system.",
      ],
      pro_tips: [
        "MAME is currently the best emulation option, though accuracy is limited.",
        "The Zelda and Mario CD-i games are historically significant curiosities.",
        "Full motion video quality is notably poor — a product of early 1990s CD technology.",
      ],
    },
  },

  {
    id: "colecovision", company_id: "coleco", company_name: "Coleco", company_color: "#CC0000",
    name: "ColecoVision", short_name: "ColecoVision", generation: 2, release_year: 1982,
    guide: {
      primary_emulator_desktop: "blueMSX / openMSX",
      primary_emulator_android: "RetroArch (blueMSX core)",
      primary_emulator_ios: "RetroArch (blueMSX core)",
      alt_emulators: ["CoolCV", "MAME"],
      recommended_formats: [".col", ".rom", ".zip"],
      hardware_notes: [
        "Known for excellent arcade ports — Donkey Kong, Zaxxon, Lady Bug.",
        "ColecoVision BIOS ROM required (coleco.rom).",
        "Adam computer add-on is also emulated in some cores.",
        "Compatible with the Atari 2600 through an expansion module.",
      ],
      pro_tips: [
        "blueMSX handles ColecoVision alongside MSX hardware.",
        "CoolCV is a more focused ColecoVision emulator for Windows.",
        "Donkey Kong on ColecoVision is the most faithful home port of its era.",
        ".col and .rom extensions are used interchangeably for ColecoVision ROMs.",
      ],
    },
  },

  {
    id: "intellivision", company_id: "mattel", company_name: "Mattel", company_color: "#4466cc",
    name: "Intellivision", short_name: "Intellivision", generation: 2, release_year: 1979,
    guide: {
      primary_emulator_desktop: "jzIntv / MAME",
      primary_emulator_android: "RetroArch (FreeIntv core)",
      primary_emulator_ios: "RetroArch (FreeIntv core)",
      alt_emulators: ["BlissJ", "MAME"],
      recommended_formats: [".int", ".bin", ".zip"],
      hardware_notes: [
        "Mattel's answer to the Atari 2600 — notable for disc controller and number pad.",
        "BIOS ROM (exec.bin, grom.bin) required for emulation.",
        "Intellivision Amico (2023 reboot) is a separate modern product.",
        "Sports games were a particular strength — football, baseball, NBA Basketball.",
      ],
      pro_tips: [
        "jzIntv is the most accurate dedicated emulator.",
        "The disc controller is awkward to map — analog stick works reasonably well.",
        "Number pad overlays are important for some games — emulators include on-screen options.",
        "Shark! Shark!, Night Stalker, and Tron: Deadly Discs are standout titles.",
      ],
    },
  },

];

/**
 * Companies that appear in the catalog but not in BUILT_IN_COMPANIES.
 * When a user adds a catalog console from one of these companies,
 * the company is automatically created.
 */
export const CATALOG_COMPANIES: Record<string, { name: string; color: string }> = {
  atari:      { name: "Atari",           color: "#e6821e" },
  nec:        { name: "NEC",             color: "#cc0000" },
  snk:        { name: "SNK",             color: "#c8a020" },
  bandai:     { name: "Bandai",          color: "#2090d8" },
  capcom:     { name: "Capcom",          color: "#0050a0" },
  arcade:     { name: "Arcade",          color: "#ff4444" },
  pc:         { name: "PC",              color: "#888888" },
  commodore:  { name: "Commodore",       color: "#aa4422" },
  sinclair:   { name: "Sinclair",        color: "#888888" },
  various:    { name: "Various",         color: "#666666" },
  "3do":      { name: "3DO",             color: "#880044" },
  philips:    { name: "Philips",         color: "#0066cc" },
  coleco:     { name: "Coleco",          color: "#336699" },
  mattel:     { name: "Mattel",          color: "#cc4400" },
};
