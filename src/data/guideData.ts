/**
 * guideData.ts
 * Static emulation/hardware guide content for every built-in console.
 * Keyed by console ID — merged with BUILT_IN_CONSOLES at render time.
 */

export interface GuideEntry {
  primary_emulator_desktop: string;
  primary_emulator_android: string;
  primary_emulator_ios: string;
  alt_emulators: string[];
  recommended_formats: string[];
  hardware_notes: string[];
  pro_tips: string[];
}

export const GUIDE_DATA: Record<string, GuideEntry> = {

  // ── Nintendo ───────────────────────────────────────────────────────────────

  nes: {
    primary_emulator_desktop: "Mesen",
    primary_emulator_android: "RetroArch (Mesen core)",
    primary_emulator_ios: "Delta",
    alt_emulators: ["FCEUX", "Nestopia UE", "RetroArch (Nestopia core)"],
    recommended_formats: [".nes", ".unf"],
    hardware_notes: [
      "Original hardware uses 72-pin cartridge connector — older systems often need connector cleaning or replacement.",
      "The Analogue Pocket with NES adapter or the Analogue NT Mini Noir provides accurate FPGA-based play.",
      "Famicom Disk System games require .fds format and a BIOS file.",
      "Flash carts: EverDrive N8 Pro is the gold standard, supports FDS expansion audio.",
    ],
    pro_tips: [
      "Mesen has the best accuracy and a built-in HD pack loader for texture packs.",
      "Enable 'Overclock CPU' in Mesen to eliminate slowdown in games like Contra and Battletoads.",
      "For authenticity, use NTSC filter + scanlines — NES games were designed around CRT bleed.",
    ],
  },

  snes: {
    primary_emulator_desktop: "bsnes / Ares",
    primary_emulator_android: "RetroArch (Snes9x core)",
    primary_emulator_ios: "Delta",
    alt_emulators: ["Snes9x", "RetroArch (bsnes core)", "ZSNES (legacy only)"],
    recommended_formats: [".sfc", ".smc", ".zip"],
    hardware_notes: [
      "Original hardware has a region lockout chip — PAL and NTSC carts are physically keyed differently.",
      "The Analogue Super NT is the best FPGA option, with jailbreak firmware for ROM loading.",
      "Super Game Boy functionality requires a real SNES or the Analogue Super NT.",
      "Flash carts: SD2SNES / FXPak Pro supports all enhancement chips (SA-1, SuperFX, DSP).",
    ],
    pro_tips: [
      "bsnes/Ares offers near-perfect accuracy including all enhancement chips like SuperFX and SA-1.",
      "Snes9x is faster and fine for 95% of the library — use bsnes only for demanding accuracy needs.",
      "Enable Widescreen hack in bsnes for a handful of compatible titles.",
      "The .sfc extension is the clean, headerless format — prefer it over .smc which includes a 512-byte header.",
    ],
  },

  n64: {
    primary_emulator_desktop: "Ares / simple64",
    primary_emulator_android: "Mupen64Plus FZ",
    primary_emulator_ios: "Delta",
    alt_emulators: ["Project64 (Windows)", "RetroArch (Mupen64Plus-Next core)", "CEN64"],
    recommended_formats: [".z64", ".n64", ".v64"],
    hardware_notes: [
      "Original hardware requires Expansion Pak for many games — it adds 4MB RAM and is required for Majora's Mask.",
      "Controller stick is notorious for wearing out — replacement sticks (Hall effect) are available from GuliKit.",
      "Flashcarts: EverDrive 64 X7 is the top option, supports 64DD games and RumblePak.",
      "Region differences are significant — some JP games run faster or have extra content.",
    ],
    pro_tips: [
      ".z64 is native big-endian byte order — the correct format. .v64 is byteswapped, .n64 is wordswapped.",
      "simple64 uses the ParaLLEl-RDP renderer for accurate graphics without per-game plugin tweaking.",
      "Ares has the best accuracy but is more CPU-intensive — pair with a Ryzen 5 or better.",
      "Texture packs via GLideN64 can dramatically improve visuals in Project64.",
      "Many N64 games have PC or recompiled ports now (Super Mario 64, OOT, MM) — worth checking before emulating.",
    ],
  },

  gc: {
    primary_emulator_desktop: "Dolphin",
    primary_emulator_android: "Dolphin (Android)",
    primary_emulator_ios: "Dolphin (via AltStore)",
    alt_emulators: ["Ares (early GameCube support)"],
    recommended_formats: [".rvz", ".iso", ".gcm", ".ciso"],
    hardware_notes: [
      "Original hardware supports progressive scan (480p) via component cables — dramatically improves image quality.",
      "The Game Boy Player attachment lets you play GB/GBC/GBA games on GameCube.",
      "SD2SP2 adapter allows loading ROMs from SD card without modchip.",
      "Swiss homebrew + SD card is the cleanest modchip-free solution for hardware play.",
    ],
    pro_tips: [
      ".rvz is Dolphin's lossless compressed format — roughly 40% smaller than ISO with no quality loss, use it.",
      "Dolphin supports widescreen hacks, 4K resolution, and texture packs for most major titles.",
      "Enable 'Dual Core' mode in Dolphin for a significant speed boost on multi-core CPUs.",
      "GameCube controller adapter (official or Mayflash) gives the most authentic input in Dolphin.",
      "Memory card emulation in Dolphin is more reliable than real memory cards which can corrupt.",
    ],
  },

  wii: {
    primary_emulator_desktop: "Dolphin",
    primary_emulator_android: "Dolphin (Android)",
    primary_emulator_ios: "Dolphin (via AltStore)",
    alt_emulators: [],
    recommended_formats: [".rvz", ".wbfs", ".iso", ".wia"],
    hardware_notes: [
      "Original hardware can be softmodded easily via LetterBomb (no hardware modification needed).",
      "USB Loader GX or WiiFlow lets you load Wii games from USB hard drive on real hardware.",
      "Wii U's Virtual Console and Wii backward compatibility mode offer clean hardware alternatives.",
      "MotionPlus required for some games — built into newer Wiimotes (Wiimote Plus).",
    ],
    pro_tips: [
      ".rvz is the preferred format — same as GameCube. .wbfs is Wii-specific but larger.",
      "Dolphin supports real Wiimote passthrough over Bluetooth for full motion control.",
      "Emulated Wiimote works fine for most games — real Wiimote is only needed for IR precision games.",
      "Wii's library includes the entire GameCube library via backward compatibility.",
      "Many Wii titles support 480p component output — set Dolphin to at least 720p.",
    ],
  },

  wiiu: {
    primary_emulator_desktop: "Cemu",
    primary_emulator_android: "Cemu (Android, experimental)",
    primary_emulator_ios: "Not available",
    alt_emulators: [],
    recommended_formats: [".wud", ".wux", ".rpx", ".wua"],
    hardware_notes: [
      "Original hardware can be softmodded via Tiramisu or Aroma — no soldering required.",
      "Loadiine and WUP Installer allow backup loading on real hardware.",
      "GamePad screen streaming has noticeable latency on emulators — real hardware is preferable for GamePad-heavy games.",
    ],
    pro_tips: [
      ".wux is a compressed .wud — same content, roughly half the size. Use .wux to save space.",
      "Cemu has near-perfect compatibility. Enable Vulkan for best performance on modern GPUs.",
      "Shader pre-compilation (async) eliminates stutter — let it compile on first run.",
      "Breath of the Wild runs better in Cemu than on real Wii U hardware in many cases.",
      "Many Wii U exclusives are now on Switch — check before spending time on emulation setup.",
    ],
  },

  switch: {
    primary_emulator_desktop: "Ryujinx",
    primary_emulator_android: "Skyline Edge / Sudachi",
    primary_emulator_ios: "Not available",
    alt_emulators: ["Yuzu (discontinued)", "Suyu"],
    recommended_formats: [".xci", ".nsp", ".nca"],
    hardware_notes: [
      "Original V1 Switch (HAC-001, not HAC-001(-01)) is RCM-hackable via hardware vulnerability.",
      "Atmosphere CFW is the standard — allows game backups, mods, and homebrew.",
      "OLED and V2 models are patched and require a modchip (Picofly) for CFW.",
      "emuMMC setup keeps CFW entirely separate from stock OS — strongly recommended.",
    ],
    pro_tips: [
      ".xci is a raw cartridge dump. .nsp is installable package format — both work in Ryujinx.",
      "Ryujinx requires firmware and prod.keys dumped from your own console.",
      "Enable NVDEC emulation for video cutscenes in Ryujinx.",
      "Many Switch ports run better in Ryujinx at 4K than on hardware at 1080p docked.",
    ],
  },

  gb: {
    primary_emulator_desktop: "Gambatte / SameBoy",
    primary_emulator_android: "RetroArch (Gambatte core)",
    primary_emulator_ios: "Delta",
    alt_emulators: ["BGB (Windows)", "mGBA", "RetroArch (SameBoy core)"],
    recommended_formats: [".gb", ".zip"],
    hardware_notes: [
      "Original DMG hardware has the iconic green screen — different palette than GBC rendering.",
      "Game Boy Pocket (MGB) uses the same cartridges with a cleaner grey display.",
      "Analogue Pocket is the premium FPGA option — plays GB, GBC, and GBA cartridges natively.",
      "Flash carts: EverDrive GB X7 or krikzz's alternatives are reliable.",
    ],
    pro_tips: [
      "SameBoy has pixel-perfect accuracy. Gambatte is slightly faster and ideal for RetroArch.",
      "Use a DMG color palette in your emulator — many games were designed with specific color expectations.",
      "Super Game Boy mode (via bsnes) adds border frames and enhanced color to compatible titles.",
    ],
  },

  gbc: {
    primary_emulator_desktop: "SameBoy",
    primary_emulator_android: "RetroArch (SameBoy core)",
    primary_emulator_ios: "Delta",
    alt_emulators: ["mGBA", "Gambatte", "BGB"],
    recommended_formats: [".gbc", ".gb", ".zip"],
    hardware_notes: [
      "GBC is backward compatible with all original GB games.",
      "Analogue Pocket plays both GB and GBC cartridges with FPGA accuracy.",
      "GBC cartridges are keyed differently from GB — the notch in the top corner.",
    ],
    pro_tips: [
      "SameBoy accurately emulates the GBC's colour correction — real GBC screens appear washed out vs raw RGB output.",
      "Enable colour correction in SameBoy for the most authentic look.",
      "GBC had a surprisingly strong library often overshadowed by GBA — Shantae, Dragon Warrior Monsters, etc.",
    ],
  },

  gba: {
    primary_emulator_desktop: "mGBA",
    primary_emulator_android: "mGBA (Android) / RetroArch (mGBA core)",
    primary_emulator_ios: "Delta",
    alt_emulators: ["RetroArch (VBA-M core)", "Ares", "NanoBoyAdvance"],
    recommended_formats: [".gba", ".zip"],
    hardware_notes: [
      "Original GBA has no backlight — GBA SP AGS-101 (backlit) is far more playable.",
      "Analogue Pocket natively supports GBA cartridges via FPGA.",
      "Flash carts: EverDrive GBA Mini is compact and widely recommended.",
      "Game Boy Player on GameCube lets you play GBA games on a TV with a controller.",
    ],
    pro_tips: [
      "mGBA is the definitive GBA emulator — highly accurate, fast, and actively maintained.",
      "Enable LCD ghosting filter in mGBA if you want the authentic handheld feel.",
      "GBA had one of the strongest libraries of any Nintendo platform — don't sleep on it.",
      "NanoBoyAdvance is more accurate but much slower — only needed for specific edge cases.",
    ],
  },

  ds: {
    primary_emulator_desktop: "melonDS",
    primary_emulator_android: "melonDS (Android) / DraStic",
    primary_emulator_ios: "Delta (limited)",
    alt_emulators: ["RetroArch (DeSmuME core)", "DeSmuME (legacy)"],
    recommended_formats: [".nds", ".zip"],
    hardware_notes: [
      "DS Lite is the most comfortable hardware revision — folds flat, backlit both screens.",
      "DSi and DSi XL add DSiWare, camera, and SD card support.",
      "3DS is backward compatible with all DS cartridges.",
      "Flash carts: R4 clones are cheap but variable quality. DSTT and Acekard 2i are better.",
    ],
    pro_tips: [
      "melonDS has JIT recompiler and Wi-Fi emulation for local multiplayer via LAN.",
      "Screen layout options: vertical stack, side-by-side, or single screen with swap — adjust per game.",
      "DraStic (Android, paid) is extremely fast and widely used for mobile play.",
      "Many DS games require the touchscreen — map it to mouse or right stick in desktop emulators.",
    ],
  },

  "3ds": {
    primary_emulator_desktop: "Citra / Lime3DS",
    primary_emulator_android: "Citra MMJ / Lime3DS",
    primary_emulator_ios: "Delta (via AltStore)",
    alt_emulators: ["PabloMK7's Citra fork"],
    recommended_formats: [".3ds", ".cia", ".cxi"],
    hardware_notes: [
      "New 3DS XL is the best hardware revision — extra CPU cores, faster load times, better screen.",
      "Luma3DS CFW is the standard — installed via boot9strap, no soldering required.",
      "GodMode9 and FBI allow dumping cartridges to SD and installing .cia files.",
      "Original 3DS is significantly slower than New 3DS — worth upgrading for demanding games.",
    ],
    pro_tips: [
      "Citra was discontinued — use Lime3DS or PabloMK7's fork as maintained replacements.",
      ".cia is the installed format. .3ds is a cartridge dump. Both work in emulators.",
      "3DS games at 4x resolution in Citra often look dramatically better than native hardware.",
      "Stereoscopic 3D can be emulated with anaglyphic output — requires red/cyan glasses.",
      "Many 3DS exclusives (Fire Emblem, Bravely Default, Pokemon) have no other official platform.",
    ],
  },

  // ── Sony ───────────────────────────────────────────────────────────────────

  ps1: {
    primary_emulator_desktop: "DuckStation",
    primary_emulator_android: "DuckStation (Android)",
    primary_emulator_ios: "Provenance",
    alt_emulators: ["RetroArch (Beetle PSX HW core)", "PCSX-Redux", "ePSXe (legacy)"],
    recommended_formats: [".chd", ".cue+.bin", ".pbp"],
    hardware_notes: [
      "PS1 hardware revisions vary significantly — early SCPH-1000 has different sound hardware.",
      "Xplorer FX and Action Replay allow backup loading on real hardware.",
      "PS2 is backward compatible with all PS1 games and often runs them better.",
      "PS1Digital mod adds HDMI output with upscaling to original hardware.",
    ],
    pro_tips: [
      ".chd compresses multi-bin .cue sets into a single file — strongly recommended for PS1's multi-disc games.",
      "DuckStation supports PGXP (Parallel/Perspective Geometry Transform) — eliminates the wobbly polygon effect.",
      "Texture replacement and widescreen hacks are available for many PS1 games in DuckStation.",
      "PS1 BIOS is required — dump from your own console or use HLE BIOS for compatibility.",
      "Enable 8x MSAA + PGXP in DuckStation to make PS1 games look surprisingly modern.",
    ],
  },

  ps2: {
    primary_emulator_desktop: "PCSX2",
    primary_emulator_android: "AetherSX2 / NetherSX2",
    primary_emulator_ios: "Play! (experimental)",
    alt_emulators: ["RetroArch (PCSX2 core, limited)"],
    recommended_formats: [".chd", ".iso", ".bin+.cue"],
    hardware_notes: [
      "PS2 Slim (SCPH-7000x) is most reliable for long-term use — runs cooler.",
      "FreeMCBoot (FMCB) memory card mod allows playing backups without modchip.",
      "USB Loader via OPL (Open PS2 Loader) — run games from USB HDD without disc.",
      "PS2 HDMI adapters (RetroGEM, OSSC) add HD output to original hardware.",
    ],
    pro_tips: [
      ".chd is by far the best format for PS2 — compresses ISOs significantly with no loss.",
      "PCSX2 supports widescreen patches, 4K rendering, and texture replacement.",
      "Enable EE Overclock in PCSX2 to eliminate slowdown in demanding titles like God of War.",
      "AetherSX2 development ended — use NetherSX2 (patched version) for continued updates on Android.",
      "BIOS required — SCPH-77001 (US) or region-appropriate version.",
    ],
  },

  ps3: {
    primary_emulator_desktop: "RPCS3",
    primary_emulator_android: "Not practically emulatable on mobile",
    primary_emulator_ios: "Not available",
    alt_emulators: [],
    recommended_formats: [".pkg + .rap", "Installed folder (PS3_GAME)"],
    hardware_notes: [
      "Fat PS3 (CECHA/CECHB) models have full PS2 hardware backward compatibility — rare and valuable.",
      "PS3 can be CFW'd (HEN or CFW on compatible models) to load backups from HDD.",
      "Rebug and HFW are common custom firmware options for jailbroken PS3.",
      "YLOD (Yellow Light of Death) is a common failure on early fat models due to lead-free solder.",
    ],
    pro_tips: [
      "RPCS3 requires a powerful CPU — Ryzen 5 5600 or better strongly recommended.",
      "Compile shaders before playing — initial stuttering is normal and goes away after first run.",
      "Many PS3 exclusives (Demon's Souls, Ico/SotC HD, 3D Dot Game Heroes) have no other legal option.",
      "Use the RPCS3 compatibility list to check game status before spending setup time.",
      "LLE audio modules give better sound accuracy but increase CPU load — toggle per game.",
    ],
  },

  ps4: {
    primary_emulator_desktop: "shadPS4 (early, limited)",
    primary_emulator_android: "Not emulatable",
    primary_emulator_ios: "Not available",
    alt_emulators: [],
    recommended_formats: [".pkg"],
    hardware_notes: [
      "PS4 firmware 9.00 and below can be jailbroken via GoldHEN.",
      "GoldHEN allows loading .pkg backups directly from USB or HDD.",
      "PS4 Pro runs most games at 4K or higher framerates — worth the premium if buying hardware.",
      "Many PS4 exclusives are now on PC (God of War, Spider-Man, Horizon) — check before emulating.",
    ],
    pro_tips: [
      "shadPS4 can run some 2D and simpler 3D titles — compatibility is still very early stage.",
      "For most PS4 games, a jailbroken PS4 console is still the most practical option.",
      "PS4 backward compatibility on PS5 covers essentially the entire library.",
    ],
  },

  ps5: {
    primary_emulator_desktop: "No emulator available",
    primary_emulator_android: "No emulator available",
    primary_emulator_ios: "Not available",
    alt_emulators: [],
    recommended_formats: [".pkg"],
    hardware_notes: [
      "PS5 has no CFW or jailbreak for current firmware.",
      "PS5 plays all PS4 games natively with performance improvements.",
      "Most PS5 exclusives release on PC within 1–2 years.",
    ],
    pro_tips: [
      "There is no working PS5 emulator — original hardware or PC ports are the only options.",
      "PS5's SSD architecture (Direct Storage) is a core part of several game designs, making future emulation complex.",
    ],
  },

  psp: {
    primary_emulator_desktop: "PPSSPP",
    primary_emulator_android: "PPSSPP (Android)",
    primary_emulator_ios: "PPSSPP",
    alt_emulators: ["RetroArch (PPSSPP core)"],
    recommended_formats: [".iso", ".cso", ".pbp"],
    hardware_notes: [
      "PSP-3000 is the best hardware revision — brighter screen, better audio.",
      "PSP is easily hackable via Infinity or 6.61 CFW — extremely beginner-friendly.",
      "Memory Stick Pro Duo required — use a MicroSD adapter for modern cards.",
      "PSP Go uses internal storage and downloads only — no UMD drive, different hack method.",
    ],
    pro_tips: [
      "PPSSPP is one of the best emulators ever made — near-perfect compatibility and runs on almost anything.",
      ".cso (Compressed ISO) is a good format — smaller than .iso with no loading penalty.",
      "Enable upscaling in PPSSPP — PSP games at 4x look fantastic on modern displays.",
      "Many PSP games are best-in-class entries: Monster Hunter Freedom Unite, Tactics Ogre, Crisis Core.",
      "PPSSPP supports multiplayer via Ad-Hoc Party emulation over network.",
    ],
  },

  vita: {
    primary_emulator_desktop: "Vita3K (playable titles only)",
    primary_emulator_android: "Vita3K (Android, limited)",
    primary_emulator_ios: "Not available",
    alt_emulators: [],
    recommended_formats: [".vpk", "Installed via Vita3K"],
    hardware_notes: [
      "PS Vita with firmware 3.73 or below can use HENkaku Ensō CFW.",
      "StorageMgr plugin allows using MicroSD cards instead of proprietary Vita cards.",
      "PSTV (Vita TV) is a microconsole version that outputs to TV — supports most Vita games.",
      "SD2Vita adapter + StorageMgr is the standard setup for large game libraries.",
    ],
    pro_tips: [
      "Vita3K has limited compatibility — check the compatibility list before expecting a game to work.",
      "Original hardware with HENkaku is still the best Vita experience by a wide margin.",
      "Vita has a genuinely strong JRPG and visual novel library that's hard to play any other way.",
      "Retroarch on Vita lets you run PS1/PSP/SNES/GBA games natively on the handheld.",
    ],
  },

  // ── Microsoft ──────────────────────────────────────────────────────────────

  xbox: {
    primary_emulator_desktop: "xemu",
    primary_emulator_android: "Not practically emulatable",
    primary_emulator_ios: "Not available",
    alt_emulators: ["Cxbx-Reloaded (some titles)"],
    recommended_formats: [".iso", ".xiso"],
    hardware_notes: [
      "Original Xbox is easily softmodded via save game exploits (Splinter Cell, 007 Agent Under Fire).",
      "BIOS replacement (Evox M8+) allows running backups from HDD without modchip.",
      "Xbox hard drive can be replaced with an IDE SSD via adapter for much faster loads.",
      "128MB RAM upgrade is possible but only needed for a handful of homebrew apps.",
    ],
    pro_tips: [
      "xemu has good compatibility — most major titles are playable at full speed.",
      ".xiso is the clean extracted ISO format — smaller and faster than raw disc image.",
      "xemu requires a MCPX and BIOS dump from your own console.",
      "Many Xbox exclusives (Halo, Fable, Jade Empire) are on PC or Xbox Game Pass.",
    ],
  },

  x360: {
    primary_emulator_desktop: "Xenia",
    primary_emulator_android: "Not emulatable",
    primary_emulator_ios: "Not available",
    alt_emulators: ["Xenia Canary (better compatibility)"],
    recommended_formats: [".iso", "Extracted folder (GOD format)"],
    hardware_notes: [
      "Xbox 360 Slim and E models are harder to softmod — Jasper-era fat models preferred for RGH.",
      "RGH (Reset Glitch Hack) requires soldering — not for beginners.",
      "Aurora dashboard is the standard homebrew launcher for RGH consoles.",
      "Xbox 360 E models cannot be RGH'd on later revisions.",
    ],
    pro_tips: [
      "Xenia Canary has significantly better compatibility than the stable release — always use Canary.",
      "Many 360 titles run well but demanding games (Red Dead Redemption) have issues.",
      "Xenia requires Vulkan or DirectX 12 — ensure your GPU drivers are current.",
      "Xbox Game Pass covers a large portion of the 360 library via backward compatibility.",
      "360 exclusive gems: Phantom Dust, Chromehounds, Earth Defense Force 2017.",
    ],
  },

  // ── Sega ───────────────────────────────────────────────────────────────────

  genesis: {
    primary_emulator_desktop: "Ares / BlastEm",
    primary_emulator_android: "RetroArch (Genesis Plus GX core)",
    primary_emulator_ios: "Delta / Provenance",
    alt_emulators: ["Genesis Plus GX", "RetroArch (BlastEm core)", "Kega Fusion (legacy)"],
    recommended_formats: [".md", ".gen", ".smd", ".zip"],
    hardware_notes: [
      "Mega Drive (PAL) and Genesis (NTSC) are the same hardware with minor clock differences.",
      "32X and Sega CD add-ons connect directly to the Genesis — both are supported by Ares.",
      "Analogue Mega Sg is the premium FPGA option — plays cartridges and supports all add-ons.",
      "Flash carts: EverDrive MD X7 supports SVP chip games (Virtua Racing) and Sega CD via MegaSD.",
    ],
    pro_tips: [
      "BlastEm is incredibly accurate and cycle-perfect for demanding games.",
      "Genesis Plus GX is faster and has excellent compatibility — ideal for Android/lower-end hardware.",
      ".md is the clean format. .smd has an interleaved header — most emulators handle both.",
      "Sega's YM2612 FM sound chip has unique characteristics — look for VGM music players to appreciate it.",
    ],
  },

  saturn: {
    primary_emulator_desktop: "Mednafen / Ares",
    primary_emulator_android: "RetroArch (Beetle Saturn core)",
    primary_emulator_ios: "Provenance (limited)",
    alt_emulators: ["RetroArch (Mednafen Saturn core)", "SSF (Windows, accurate but slow)"],
    recommended_formats: [".chd", ".cue+.bin"],
    hardware_notes: [
      "Saturn has a dual-CPU architecture that made it notoriously difficult to program — few developers mastered it.",
      "Action Replay 4-in-1 cartridge enables backup loading, RAM expansion, and region switching.",
      "Fenrir ODE (Optical Drive Emulator) replaces the disc drive — very reliable hardware solution.",
      "Rhea/Phoebe are older ODE options — compatible with different Saturn revisions.",
    ],
    pro_tips: [
      "Saturn emulation requires a powerful CPU — Mednafen is accurate but demanding.",
      ".chd format works well for Saturn's multi-track disc images.",
      "Beetle Saturn (Mednafen core) in RetroArch with OpenGL hardware renderer is the best balance of accuracy/speed.",
      "Many Saturn exclusives remain exclusive to this day — Panzer Dragoon Saga, Radiant Silvergun, Guardian Heroes.",
      "Japanese Saturn library is significantly larger than Western releases — region-free mod or Action Replay recommended.",
    ],
  },

  dreamcast: {
    primary_emulator_desktop: "Flycast",
    primary_emulator_android: "Flycast (Android)",
    primary_emulator_ios: "Flycast (via AltStore)",
    alt_emulators: ["RetroArch (Flycast core)", "Redream", "Demul (Windows)"],
    recommended_formats: [".chd", ".gdi", ".cdi"],
    hardware_notes: [
      "Dreamcast can play burned discs natively — no modchip required, just CD-R media.",
      "GDEMU replaces the GD-ROM drive with an SD card reader — fast, silent, reliable.",
      "USB-GDROM is an alternative ODE using USB storage.",
      "VGA cable provides 480p output — Dreamcast has native VGA support for most games.",
    ],
    pro_tips: [
      ".gdi is a full disc image (GD-ROM, ~1GB). .cdi is older CD-R rip format. .chd compresses both.",
      "Flycast has excellent compatibility and supports widescreen, HD rendering, and online play.",
      "Redream is a great beginner-friendly option with a clean UI and good performance.",
      "Dreamcast had many arcade-perfect ports — Soul Calibur, Marvel vs. Capcom 2, Crazy Taxi.",
      "Dreamcast homebrew scene is still active — indie games still being released.",
    ],
  },

  gg: {
    primary_emulator_desktop: "Ares / Genesis Plus GX",
    primary_emulator_android: "RetroArch (Genesis Plus GX core)",
    primary_emulator_ios: "Provenance",
    alt_emulators: ["Osmose", "RetroArch (Ares core)"],
    recommended_formats: [".gg", ".zip"],
    hardware_notes: [
      "Game Gear uses SMS hardware with minor changes — many Master System games are compatible via adapter.",
      "Original hardware eats through AA batteries extremely fast — 6 batteries for ~3 hours.",
      "McWill LCD mod replaces the dim, aged screen with a bright IPS display.",
      "Flash carts: Everdrive GG is the standard option.",
    ],
    pro_tips: [
      "Genesis Plus GX emulates Game Gear accurately alongside Genesis and Master System.",
      "Game Gear library is modest but has some gems: Sonic, Shining Force: The Sword of Hajya, Columns.",
      "Many GG games are ports of SMS or Genesis games — check if a better version exists.",
    ],
  },

  scd: {
    primary_emulator_desktop: "Ares / Genesis Plus GX",
    primary_emulator_android: "RetroArch (Genesis Plus GX core)",
    primary_emulator_ios: "Provenance",
    alt_emulators: ["Gens (legacy)"],
    recommended_formats: [".chd", ".cue+.bin", ".iso+.mp3"],
    hardware_notes: [
      "Sega CD is an add-on to the Genesis/Mega Drive — requires a working Genesis to function.",
      "Model 1 and Model 2 Sega CD units are functionally identical, different form factors.",
      "Sega CD's laser mechanism is prone to failure — ODE solutions (Fenrir modified) are available.",
      "MegaSD cartridge plays Sega CD games directly from Genesis cart slot — no Sega CD unit needed.",
    ],
    pro_tips: [
      ".chd is the best format for Sega CD — handles CD audio tracks cleanly.",
      "Sega CD BIOS file required — region-specific versions exist.",
      "The library has hidden gems beyond the FMV shovelware: Snatcher, Sonic CD, Lunar series.",
      "Genesis Plus GX handles Sega CD emulation alongside standard Genesis games seamlessly.",
    ],
  },

  "32x": {
    primary_emulator_desktop: "Ares / PicoDrive",
    primary_emulator_android: "RetroArch (PicoDrive core)",
    primary_emulator_ios: "Provenance",
    alt_emulators: ["Genesis Plus GX (limited 32X support)"],
    recommended_formats: [".32x", ".bin", ".zip"],
    hardware_notes: [
      "Sega 32X plugs into the Genesis cartridge slot and requires its own power supply.",
      "Sega CD + 32X combo games (32X CD) require all three units connected simultaneously.",
      "The 32X library is tiny (~40 games) — most are ports or tech demos.",
      "Original hardware setup is cumbersome with three separate power adapters.",
    ],
    pro_tips: [
      "PicoDrive is the most compatible 32X emulator — lightweight and accurate enough for the small library.",
      "Ares provides the most accurate combined Genesis + 32X + Sega CD emulation.",
      "Knuckles Chaotix and Virtua Fighter are the most notable exclusives.",
      "Most 32X titles exist in better versions on other platforms — the library is largely historical curiosity.",
    ],
  },
};
