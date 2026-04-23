/**
 * TimelineTab.tsx
 * Horizontal console history timeline.
 * X spacing is console-index-based: equal slots per console, so sparse eras
 * are naturally compressed and dense eras (90s/00s) spread wide.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Clock, CalendarDays, Play, ExternalLink } from "lucide-react";
import { createPortal } from "react-dom";
import { BUILT_IN_CONSOLES, BUILT_IN_COMPANIES } from "../types";
import { getConsoleStats, findRomForOnThisDay, recordSessionStart, recordPlay } from "../db";
import { useAppSettings } from "../hooks/useAppSettings";
import { useEmulators } from "../hooks/useEmulators";
import { CONSOLE_LOGOS } from "../data/platformLogos";
import { CONSOLE_LOGOS as CONSOLE_LOGOS_DARK } from "../data/platformLogosDark";
import { getTodaysEntry, type OnThisDayEntry } from "../data/onThisDay";

// ── Layout constants ──────────────────────────────────────────────────────────
const SLOT_W     = 105;  // px per console slot — stair-step means cards can overlap in X
const CARD_W     = 135;
const CARD_H     = 123;
const STEM_NEAR  = 36;   // timeline center → near-lane card edge (lane 1)
const STEM_FAR   = 92;   // timeline center → far-lane card edge  (lane 0)
const PAD_X      = 150;  // leading/trailing space

// ── Console blurbs ────────────────────────────────────────────────────────────
const CONSOLE_BLURBS: Record<string, string> = {
  nes:          "Revived the video game industry after the 1983 crash. Home to Super Mario Bros., Zelda, and Metroid.",
  snes:         "The 16-bit gold standard. Mode 7, the SPC700 sound chip, and a library that defined the era.",
  n64:          "Nintendo's leap into 3D. Super Mario 64 wrote the blueprint for every 3D platformer that followed.",
  gc:           "A compact powerhouse that punched above its weight. Beloved for Wind Waker, Metroid Prime, and Melee.",
  wii:          "Motion controls brought gaming to living rooms worldwide. The best-selling seventh-gen console at 101 million units.",
  wiiu:         "Nintendo's experimental dual-screen home console. Home to Breath of the Wild and Splatoon before their Switch debuts.",
  switch:       "A hybrid home/portable that redefined what a Nintendo platform could be. The fastest-selling system in Nintendo history.",
  gb:           "A monochrome portable powerhouse that outlasted every color competitor. Tetris at launch made it a phenomenon.",
  gbc:          "Color and a faster CPU in the same pocket-sized shell. Launched Pokémon Gold and Silver.",
  gba:          "SNES-quality gaming in your pocket. An incredible library of ports and originals.",
  vb:           "Nintendo's experimental stereoscopic 3D system. A commercial failure, but a fascinating historical artifact.",
  ds:           "Dual screens and a stylus mainstreamed touch gaming before smartphones. One of the best-selling consoles of all time.",
  "3ds":        "Glasses-free 3D with a massive library. A system that found its audience and never let go.",
  ps1:          "Sony's debut changed everything. The CD format enabled cinematic storytelling at a scale the cartridge world couldn't match.",
  ps2:          "The best-selling console in history at 155 million units. Its DVD playback made it a household appliance.",
  ps3:          "Blu-ray, the Cell processor, and PlayStation Network defined Sony's seventh generation — after a rocky start.",
  ps4:          "A developer-friendly powerhouse. Home to a generation of acclaimed exclusives from Naughty Dog, Santa Monica, and Guerrilla.",
  ps5:          "Ultra-fast SSD and DualSense haptic feedback mark Sony's latest. The next frontier of PlayStation.",
  psp:          "The first serious portable challenger to Nintendo, with a gorgeous widescreen and a full 3D engine.",
  vita:         "Sony's most capable handheld, with an OLED screen and dual analog sticks. Found a second life through indie developers.",
  xbox:         "Microsoft's bold debut, built on DirectX. Halo: Combat Evolved redefined console first-person shooters.",
  x360:         "Xbox Live made online console gaming the norm. One of the most influential libraries of the seventh generation.",
  xone:         "An all-in-one entertainment hub that later found its footing through Game Pass and backwards compatibility.",
  sg1000:       "Sega's first home console, launched the same day as the Famicom in Japan. A modest but important first step.",
  mastersystem: "Technically superior to the NES in nearly every way, but outmaneuvered in North America. Dominated in Europe and Brazil.",
  genesis:      "Sega's 16-bit powerhouse, with a faster CPU and that legendary blast processing. Sonic changed everything.",
  scd:          "CD audio and FMV sequences added to the Genesis. A pioneer in cinematic presentation.",
  "32x":        "A stopgap 32-bit add-on that fractured Sega's audience and muddied their market position.",
  saturn:       "Complex dual-CPU hardware that challenged developers but delivered exceptional 2D fighters and RPGs.",
  dreamcast:    "Sega's swan song — the first console with built-in internet and a VMU memory card with its own screen. Discontinued in 2001.",
  gg:           "Sega's color portable rival to the Game Boy. Technically impressive, if battery hungry.",
  atari2600:    "The console that defined home gaming in the late 1970s. Space Invaders drove millions of unit sales.",
  atari5200:    "Atari's second-generation console, hampered by a non-centering joystick and strong competition from Mattel and Coleco.",
  atari7800:    "Backwards-compatible with the 2600, but it arrived just as Nintendo was reshaping the market.",
  jaguar:       "Marketed as 64-bit, the Jaguar was Atari's final home console — notable for Tempest 2000 and its unusual keypad.",
  jaguarcd:     "A CD add-on for the Jaguar that added a handful of titles to an already thin library.",
  lynx:         "The world's first color handheld, co-designed by creators of the Amiga chip set. Ahead of its time.",
  tg16:         "NEC's 16-bit system, sold as PC Engine in Japan. An exceptional library of shooters and action games.",
  pcenginecd:   "CD-ROM capability for the PC Engine, enabling full voice acting and redbook audio years before competitors.",
  sgfx:         "An enhanced PC Engine with additional graphics hardware. Rare and mostly overlooked outside Japan.",
  pcfx:         "NEC's 32-bit follow-up, leaning heavily into FMV. Niche but historically interesting.",
  neogeo:       "Arcade hardware in your living room at an eye-watering price. Pixel-perfect ports of SNK's best fighters.",
  ngcd:         "The cartridge-free Neo Geo with CD audio — at the cost of extremely long load times.",
  ngp:          "SNK's monochrome handheld with a satisfying clicky thumbstick and tight fighting game ports.",
  ngpc:         "The color Neo Geo Pocket — a hidden gem with excellent fighting games and a loyal following.",
  wswan:        "Bandai's vertical handheld, designed by Gunpei Yokoi after leaving Nintendo. Solar-powered model included.",
  wswanc:       "Color screen and an expanded library made the WonderSwan Color a refined collector's piece.",
  cdimaginaire: "Philips' multimedia CD platform. Remembered today mostly for its unusual Nintendo-licensed titles.",
  c64:          "One of the best-selling personal computers ever made, with a vibrant gaming and demo scene.",
  amiga:        "A multimedia powerhouse beloved for its graphics, sound, and the legendary demo scene.",
  amiga1200:    "The last major Amiga revision — 32-bit AGA graphics and an expanded color palette.",
  vic20:        "Commodore's first mass-market home computer, a warm-up act for the C64.",
  c128:         "Commodore's swan song for the 8-bit era — a C64 with extra memory and a Z80 for CP/M.",
  intellivision: "Mattel's answer to the Atari 2600, with a numeric keypad controller and a strong sports lineup.",
  colecovision: "Near-arcade-perfect Donkey Kong at launch made it an instant must-have in 1982.",
  odyssey2:     "Magnavox's second console, featuring a built-in keyboard for educational games alongside traditional titles.",
  "3do":        "An ambitious 32-bit platform launched at $699. Technically impressive but commercially outmaneuvered.",
  arcade:       "The birthplace of gaming — coin-operated machines that drove pop culture through the 70s, 80s, and 90s.",
  fbneo:        "FinalBurn Neo covers a vast range of arcade hardware, including many boards MAME treats as secondary.",
  dos:          "MS-DOS powered a golden era of PC gaming — from text adventures and point-and-clicks to the birth of 3D shooters.",
  msx:          "A standardized home computer spec dominant in Japan and Europe through the mid-80s.",
  msx2:         "An enhanced MSX standard with improved graphics and memory, home to early Konami classics.",
  amstrad:      "Amstrad's CPC line balanced affordability and capability, earning a devoted following in Europe.",
  zxspectrum:   "Sinclair's iconic British microcomputer — the machine that launched a thousand bedroom coders.",
  zx81:         "The razor-thin, £70 kit computer that brought programming to British homes for the first time.",
  appleii:      "Apple's first mass-market success — a gaming and productivity machine that defined early PC culture.",
  atarist:      "Atari's 16-bit computer line rivaled the Amiga for music and graphics, and was popular with European studios.",
};

function genLabel(g: number): string {
  if (g === 0) return "Arcade / PC";
  const s = g === 1 ? "st" : g === 2 ? "nd" : g === 3 ? "rd" : "th";
  return `${g}${s} Generation`;
}

// ── Handheld console IDs ─────────────────────────────────────────────────────
const HANDHELD_IDS = new Set([
  "gb", "gbc", "gba", "vb", "ds", "3ds",
  "psp", "vita",
  "gg",
  "lynx",
  "ngp", "ngpc",
  "wswan", "wswanc",
]);

// ── Generation band colors (subtle tints) ────────────────────────────────────
const GENERATION_COLORS: Record<number, string> = {
  2: "#d97706",  // amber  — early home gaming
  3: "#ea580c",  // orange — 8-bit era
  4: "#65a30d",  // lime   — 16-bit era
  5: "#0d9488",  // teal   — 32-bit era
  6: "#2563eb",  // blue   — DVD era
  7: "#7c3aed",  // violet — HD era
  8: "#db2777",  // pink   — connected era
  9: "#e11d48",  // rose   — current gen
};

// ── Named era labels (mid-year used for X positioning) ───────────────────────
const ERA_LABELS: { name: string; startYear: number; endYear: number }[] = [
  { name: "EARLY GAMING", startYear: 1972, endYear: 1982 },
  { name: "8-BIT ERA",    startYear: 1983, endYear: 1989 },
  { name: "16-BIT ERA",   startYear: 1989, endYear: 1996 },
  { name: "32-BIT ERA",   startYear: 1993, endYear: 2001 },
  { name: "DVD ERA",      startYear: 1999, endYear: 2007 },
  { name: "HD ERA",       startYear: 2005, endYear: 2013 },
  { name: "CONNECTED",    startYear: 2012, endYear: 2017 },
  { name: "MODERN",       startYear: 2017, endYear: 2026 },
];

// Preferred side for major companies so their lineage lines stay clean
const COMPANY_SIDE: Record<string, "above" | "below"> = {
  nintendo:  "above",
  microsoft: "above",
  atari:     "above",
  bandai:    "above",
  mattel:    "above",
  magnavox:  "above",
  sony:      "below",
  sega:      "below",
  nec:       "below",
  snk:       "below",
  philips:   "below",
  commodore: "below",
};

interface Slot {
  id: string;
  shortName: string;
  companyId: string;
  color: string;
  year: number;
  generation: number;
  consoleType: "home" | "handheld" | "other";
  x: number;
  side: "above" | "below";
  lane: 0 | 1;   // 0 = far from spine, 1 = near spine
  logoLight: string | null;
  logoDark:  string | null;
  romCount:  number;
}

// ── Legend helper components ──────────────────────────────────────────────────
function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 7,
      border: `1px solid ${color}28`,
      borderLeft: `3px solid ${color}99`,
      background: `${color}08`,
      padding: "8px 10px 9px",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: "0.13em",
        color, marginBottom: 7,
        textShadow: `0 0 12px ${color}55`,
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, text, accent, color }: { icon: string; text: string; accent?: boolean; color?: string }) {
  const c = accent && color ? color : undefined;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
        color:       c ?? "var(--text-muted)",
        background:  c ? `${c}18`               : "var(--bg-hover)",
        border:      `1px solid ${c ? `${c}44` : "var(--border)"}`,
        borderRadius: 3,
        padding: "1px 6px",
        whiteSpace: "nowrap", flexShrink: 0,
        lineHeight: "17px", minWidth: 28, textAlign: "center",
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.55, paddingTop: 1 }}>
        {text}
      </span>
    </div>
  );
}

export default function TimelineTab({
  onNavigateToConsole,
}: {
  onNavigateToConsole: (companyId: string, consoleId: string) => void;
}) {
  const { settings } = useAppSettings();
  const light = settings.theme === "light";
  const { consoleMap } = useEmulators();

  const outerRef        = useRef<HTMLDivElement>(null);
  const trackRef        = useRef<HTMLDivElement>(null);
  const minimapThumbRef = useRef<HTMLDivElement>(null);
  const yearLabelRef    = useRef<HTMLSpanElement>(null);
  const slotMapRef      = useRef<{ x: number; year: number }[]>([]);
  const scrollRef = useRef(0);
  const velRef    = useRef(0);
  const rafRef    = useRef(0);
  const maxSRef   = useRef(0);
  const totalWRef = useRef(0);
  const dimWRef   = useRef(900);

  const [dims, setDims]             = useState({ w: 900, h: 440 });
  const [showAll, setShowAll]       = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "home" | "handheld">("all");
  const [lockedCompany, setLockedCompany] = useState<string | null>(null);
  const [counts, setCounts]         = useState<Record<string, number>>({});
  const [hovered, setHovered]       = useState<string | null>(null);
  const [hoveredArc, setHoveredArc] = useState<string | null>(null);
  const [popup, setPopup]           = useState<{ slot: Slot; rect: DOMRect } | null>(null);
  const [legendAnchor, setLegendAnchor] = useState<DOMRect | null>(null);
  const legendBtnRef = useRef<HTMLButtonElement>(null);

  // ── On This Day ────────────────────────────────────────────────────────
  const [otdOpen, setOtdOpen]   = useState(false);
  const [otdEntry]              = useState<OnThisDayEntry | null>(() => getTodaysEntry());
  const [otdRom, setOtdRom]     = useState<{ id: number; filepath: string; backlog_status: string | null } | null>(null);
  const [otdChecked, setOtdChecked] = useState(false);

  useEffect(() => {
    if (!otdEntry) { setOtdChecked(true); return; }
    findRomForOnThisDay(otdEntry.consoleId, otdEntry.title).then(rom => {
      setOtdRom(rom);
      setOtdChecked(true);
    });
  }, [otdEntry]);

  const handleOtdPlay = useCallback(async () => {
    if (!otdRom || !otdEntry) return;
    const emulator = consoleMap.get(otdEntry.consoleId);
    if (!emulator) return;
    const sessionId = await recordSessionStart(otdRom.id);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("launch_rom", {
        exePath:  emulator.exe_path,
        args:     emulator.is_retroarch ? `-L {core} {rom}` : emulator.args,
        romPath:  otdRom.filepath,
        corePath: emulator.is_retroarch ? (emulator.core_path ?? null) : null,
        sessionId,
      });
      await recordPlay(otdRom.id, otdRom.backlog_status ?? null);
    } catch (e) {
      alert(`Could not launch emulator:\n${e}`);
    }
  }, [otdRom, otdEntry, consoleMap]);

  // Close popup + unlock company on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setPopup(null); setLockedCompany(null); setLegendAnchor(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Load ROM counts from DB ───────────────────────────────────────────────
  useEffect(() => {
    getConsoleStats().then(stats => {
      const m: Record<string, number> = {};
      stats.forEach(s => { m[s.console_id] = s.rom_count; });
      setCounts(m);
    }).catch(() => {});
  }, []);

  // ── Track container dimensions via ResizeObserver ─────────────────────────
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tlY = dims.h / 2;   // timeline sits at vertical center

  // ── Base slot list (all consoles, company side + stair-step lane assigned) ──
  const baseSlots = useMemo<Omit<Slot, "x" | "romCount">[]>(() => {
    const companyMemo: Record<string, "above" | "below"> = {};
    let alt: "above" | "below" = "below";

    const sorted = [...BUILT_IN_CONSOLES].sort((a, b) =>
      a.release_year - b.release_year ||
      a.company_id.localeCompare(b.company_id) ||
      a.order - b.order
    );

    // Per-side counters drive the lane alternation
    let aboveCount = 0;
    let belowCount = 0;

    return sorted.map(c => {
      const company = BUILT_IN_COMPANIES.find(co => co.id === c.company_id);
      let side: "above" | "below";
      if (COMPANY_SIDE[c.company_id]) {
        side = COMPANY_SIDE[c.company_id];
      } else if (companyMemo[c.company_id]) {
        side = companyMemo[c.company_id];
      } else {
        side = alt;
        companyMemo[c.company_id] = side;
        alt = alt === "above" ? "below" : "above";
      }
      const lane = (side === "above" ? aboveCount++ : belowCount++) % 2 as 0 | 1;
      const consoleType: "home" | "handheld" | "other" =
        HANDHELD_IDS.has(c.id) ? "handheld"
        : (c.company_id === "arcade" || c.company_id === "pc") ? "other"
        : "home";
      return {
        id:          c.id,
        shortName:   c.short_name,
        companyId:   c.company_id,
        color:       company?.color ?? "#888888",
        year:        c.release_year,
        generation:  c.generation,
        consoleType,
        side,
        lane,
        logoLight: CONSOLE_LOGOS[c.id]      ?? null,
        logoDark:  CONSOLE_LOGOS_DARK[c.id] ?? null,
      };
    });
  }, []);

  // ── Assign X positions — always all consoles, no filtering ──────────────
  const slots = useMemo<Slot[]>(() => {
    return baseSlots.map((s, i) => ({
      ...s,
      x:        PAD_X + i * SLOT_W + SLOT_W / 2,
      romCount: counts[s.id] ?? 0,
    }));
  }, [baseSlots, counts]);

  const totalW = Math.max(dims.w + 1, PAD_X * 2 + slots.length * SLOT_W);

  // Company whose lineage family should light up when a card is hovered
  const hoveredCompany = useMemo(
    () => hovered ? (slots.find(s => s.id === hovered)?.companyId ?? null) : null,
    [hovered, slots]
  );

  // Priority: locked > arc hover > card hover
  const activeCompany = lockedCompany ?? hoveredArc ?? hoveredCompany;

  // ── Generation bands (one per unique generation, spanning min→max slot X) ───
  const genBands = useMemo(() => {
    const byGen = new Map<number, number[]>();
    slots.forEach(s => {
      if (s.generation > 0) byGen.set(s.generation, [...(byGen.get(s.generation) ?? []), s.x]);
    });
    return [...byGen.entries()]
      .sort(([a], [b]) => a - b)
      .map(([gen, xs]) => ({
        gen,
        minX:  Math.min(...xs) - SLOT_W * 0.5,
        maxX:  Math.max(...xs) + SLOT_W * 0.5,
        color: GENERATION_COLORS[gen] ?? "#888888",
      }));
  }, [slots]);

  // ── Year → X interpolation (used for tick/decade label placement) ─────────
  const getYearX = useMemo((): ((y: number) => number) => {
    if (!slots.length) return () => PAD_X;
    // Average X of all consoles for each distinct year
    const byYear = new Map<number, number[]>();
    slots.forEach(s => byYear.set(s.year, [...(byYear.get(s.year) ?? []), s.x]));
    const avg = new Map<number, number>();
    byYear.forEach((xs, y) => avg.set(y, xs.reduce((a, b) => a + b, 0) / xs.length));
    const yrs = [...avg.keys()].sort((a, b) => a - b);
    return (y: number): number => {
      if (y <= yrs[0])                   return avg.get(yrs[0])!;
      if (y >= yrs[yrs.length - 1])      return avg.get(yrs[yrs.length - 1])!;
      for (let i = 0; i < yrs.length - 1; i++) {
        if (y >= yrs[i] && y <= yrs[i + 1]) {
          const t = (y - yrs[i]) / (yrs[i + 1] - yrs[i]);
          return avg.get(yrs[i])! + t * (avg.get(yrs[i + 1])! - avg.get(yrs[i])!);
        }
      }
      return PAD_X;
    };
  }, [slots]);

  // ── Decade / 5-year tick marks ────────────────────────────────────────────
  const ticks = useMemo(() => {
    if (!slots.length) return [];
    const minY = Math.min(...slots.map(s => s.year));
    const maxY = Math.max(...slots.map(s => s.year));
    const out: { year: number; x: number; major: boolean }[] = [];
    for (let y = Math.floor(minY / 5) * 5; y <= Math.ceil(maxY / 5) * 5 + 5; y += 5) {
      out.push({ year: y, x: getYearX(y), major: y % 10 === 0 });
    }
    return out;
  }, [slots, getYearX]);

  // ── Era label positions (start/end X derived from year interpolation) ───────
  const eraPositions = useMemo(() => ERA_LABELS.map(e => ({
    name:  e.name,
    x:     (getYearX(e.startYear) + getYearX(e.endYear)) / 2,
    width: getYearX(e.endYear) - getYearX(e.startYear),
  })), [getYearX]);

  // ── Company lineage bezier paths ──────────────────────────────────────────
  const lineage = useMemo(() => {
    const byCompany = new Map<string, Slot[]>();
    slots.forEach(s => byCompany.set(s.companyId, [...(byCompany.get(s.companyId) ?? []), s]));
    const paths: { d: string; color: string; companyId: string }[] = [];

    byCompany.forEach((group, companyId) => {
      if (group.length < 2) return;
      const sorted = [...group].sort((a, b) => a.x - b.x);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        const ay  = tlY + (a.side === "above" ? -2 : 2);
        const by_ = tlY + (b.side === "above" ? -2 : 2);
        const mx  = (a.x + b.x) / 2;
        let d: string;
        if (a.side === b.side) {
          const bow = a.side === "above" ? -20 : 20;
          d = `M ${a.x} ${ay} C ${mx} ${tlY + bow}, ${mx} ${tlY + bow}, ${b.x} ${by_}`;
        } else {
          const cx1 = a.x + (b.x - a.x) * 0.35;
          const cx2 = b.x - (b.x - a.x) * 0.35;
          d = `M ${a.x} ${ay} C ${cx1} ${tlY}, ${cx2} ${tlY}, ${b.x} ${by_}`;
        }
        paths.push({ d, color: sorted[0].color, companyId });
      }
    });
    return paths;
  }, [slots, tlY]);

  // ── Scroll: direct DOM transform, no React re-renders per frame ───────────
  useEffect(() => {
    maxSRef.current = Math.max(0, totalW - dims.w);
    totalWRef.current = totalW;
    dimWRef.current   = dims.w;
  }, [totalW, dims.w]);

  const applyScroll = useCallback((x: number) => {
    const c = Math.max(0, Math.min(x, maxSRef.current));
    scrollRef.current = c;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${-c}px)`;

    // Sync minimap thumb
    if (minimapThumbRef.current) {
      const tw = totalWRef.current;
      const vw = dimWRef.current;
      if (tw > 0) {
        minimapThumbRef.current.style.left  = `${(c / tw) * vw}px`;
        minimapThumbRef.current.style.width = `${Math.min(1, vw / tw) * vw}px`;
      }
    }

    // Update year label from viewport center
    if (yearLabelRef.current) {
      const map = slotMapRef.current;
      if (map.length) {
        const cx = c + dimWRef.current / 2;
        let year = map[0].year;
        if (cx >= map[map.length - 1].x) {
          year = map[map.length - 1].year;
        } else {
          for (let i = 0; i < map.length - 1; i++) {
            if (cx >= map[i].x && cx < map[i + 1].x) {
              const t = (cx - map[i].x) / (map[i + 1].x - map[i].x);
              year = Math.round(map[i].year + t * (map[i + 1].year - map[i].year));
              break;
            }
          }
        }
        yearLabelRef.current.textContent = String(year);
      }
    }
  }, []);

  // Re-sync thumb size whenever totalW or container width changes
  useEffect(() => {
    if (minimapThumbRef.current && totalW > 0 && dims.w > 0) {
      const ratio = Math.min(1, dims.w / totalW);
      minimapThumbRef.current.style.width = `${ratio * dims.w}px`;
      minimapThumbRef.current.style.left  = `${(scrollRef.current / totalW) * dims.w}px`;
    }
  }, [totalW, dims.w]);

  // Keep slot X→year lookup in sync; seed the label on initial load
  useEffect(() => {
    slotMapRef.current = slots.map(s => ({ x: s.x, year: s.year }));
    applyScroll(scrollRef.current); // re-runs the year label update with fresh map
  }, [slots, applyScroll]);

  // Click anywhere on the minimap → jump to that position
  const onMinimapPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    applyScroll(ratio * totalWRef.current - dimWRef.current / 2);
  }, [applyScroll]);

  // Drag the thumb to scrub
  const onThumbPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startX      = e.clientX;
    const startScroll = scrollRef.current;
    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      applyScroll(startScroll + (dx / dimWRef.current) * totalWRef.current);
    }
    function onUp(ev: PointerEvent) {
      (ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [applyScroll]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      const delta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * 0.85;
      velRef.current = delta;
      applyScroll(scrollRef.current + delta);
      (function momentum() {
        velRef.current *= 0.88;
        if (Math.abs(velRef.current) > 0.3) {
          applyScroll(scrollRef.current + velRef.current);
          rafRef.current = requestAnimationFrame(momentum);
        }
      })();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(rafRef.current);
    };
  }, [applyScroll]);

  // ── Colours ───────────────────────────────────────────────────────────────
  const dimColor  = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
  const tickColor = light ? "rgba(0,0,0,0.20)" : "rgba(255,255,255,0.20)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes tl-rise-above {
          from { transform-origin: bottom center; transform: scale(0.82) translateY(18px); }
          to   { transform-origin: bottom center; transform: scale(1)    translateY(0);    }
        }
        @keyframes tl-rise-below {
          from { transform-origin: top center; transform: scale(0.82) translateY(-18px); }
          to   { transform-origin: top center; transform: scale(1)    translateY(0);     }
        }
        @keyframes tl-popup-in {
          from { opacity: 0; transform: scale(0.90) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>

      {/* ── Controls bar ── */}
      <div style={{
        padding: "7px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 14, flexShrink: 0, flexWrap: "wrap",
        background: "var(--bg-surface)",
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Clock size={12} style={{ color: "#60b8d8", opacity: 0.85 }} />
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.14em",
            color: "#60b8d8",
            textShadow: "0 0 10px #60b8d844",
          }}>
            TIMELINE
          </span>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

        {/* Library visibility group */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#52C06099", paddingLeft: 2 }}>
            LIBRARY
          </span>
          <div style={{
            display: "flex",
            background: "var(--bg-inset, rgba(0,0,0,0.18))",
            border: "1px solid var(--border)",
            borderRadius: 6, overflow: "hidden",
          }}>
            {([
              { label: "HIGHLIGHT OWNED", val: false },
              { label: "SHOW ALL",        val: true  },
            ] as const).map(({ label, val }, i) => {
              const active = showAll === val;
              return (
                <button key={label} onClick={() => setShowAll(val)} style={{
                  fontSize: 10, padding: "4px 10px", cursor: "pointer",
                  fontFamily: "var(--font)", fontWeight: 700, letterSpacing: "0.06em",
                  background: active ? "#52C06022" : "transparent",
                  border: "none",
                  borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                  color: active ? "#52C060" : "var(--text-muted)",
                  transition: "all 0.15s",
                  boxShadow: active ? "inset 0 0 8px #52C06012" : "none",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

        {/* Type filter group */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#9999dd99", paddingLeft: 2 }}>
            SYSTEM TYPE
          </span>
          <div style={{
            display: "flex",
            background: "var(--bg-inset, rgba(0,0,0,0.18))",
            border: "1px solid var(--border)",
            borderRadius: 6, overflow: "hidden",
          }}>
            {([
              { label: "ALL",      val: "all"      },
              { label: "HOME",     val: "home"     },
              { label: "HANDHELD", val: "handheld" },
            ] as const).map(({ label, val }, i) => {
              const active = typeFilter === val;
              return (
                <button key={label} onClick={() => setTypeFilter(val)} style={{
                  fontSize: 10, padding: "4px 10px", cursor: "pointer",
                  fontFamily: "var(--font)", fontWeight: 700, letterSpacing: "0.06em",
                  background: active ? "#9999dd22" : "transparent",
                  border: "none",
                  borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                  color: active ? "#9999dd" : "var(--text-muted)",
                  transition: "all 0.15s",
                  boxShadow: active ? "inset 0 0 8px #9999dd12" : "none",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Locked company badge */}
        {lockedCompany && (() => {
          const name = BUILT_IN_COMPANIES.find(c => c.id === lockedCompany)?.name ?? lockedCompany;
          const color = BUILT_IN_COMPANIES.find(c => c.id === lockedCompany)?.color ?? "#888";
          return (
            <button
              onClick={() => setLockedCompany(null)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 10, padding: "4px 9px", borderRadius: 4, cursor: "pointer",
                fontFamily: "var(--font)", fontWeight: 700, letterSpacing: "0.06em",
                background: color + "18",
                border: `1px solid ${color}55`,
                color: color,
                transition: "all 0.15s",
              }}
            >
              {name.toUpperCase()} ×
            </button>
          );
        })()}

        <button
          ref={legendBtnRef}
          onClick={() => setLegendAnchor(a => a ? null : (legendBtnRef.current?.getBoundingClientRect() ?? null))}
          style={{
            marginLeft: "auto", flexShrink: 0,
            fontSize: 11, fontWeight: 800, lineHeight: 1,
            width: 24, height: 24, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontFamily: "var(--font)",
            background: legendAnchor ? "var(--bg-hover)" : "transparent",
            border: `1px solid ${legendAnchor ? "var(--border-lit)" : "var(--border)"}`,
            color: legendAnchor ? "var(--text)" : "var(--text-muted)",
            transition: "all 0.15s",
          }}
        >
          ?
        </button>
      </div>

      {/* ── Timeline canvas ── */}
      <div
        ref={outerRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", userSelect: "none", cursor: "default" }}
      >
        {/* ── On This Day floating card ── */}
        {otdEntry && (() => {
          const OTD_COLOR = "#e4a030";
          const otdConsole = BUILT_IN_CONSOLES.find(c => c.id === otdEntry.consoleId);
          const otdCompany = otdConsole?.company_id ?? "";
          const now = new Date();
          const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const dateLabel = `${MONTHS[now.getMonth()]} ${now.getDate()}`;
          return (
            <div
              style={{
                position: "absolute", top: 14, left: 14, zIndex: 60,
                width: otdOpen ? 272 : 118,
                maxHeight: otdOpen ? 400 : 28,
                background: light ? "rgba(255,252,245,0.97)" : "rgba(14,12,8,0.94)",
                border: `1px solid ${OTD_COLOR}${otdOpen ? "55" : "44"}`,
                borderRadius: otdOpen ? 10 : 7,
                boxShadow: otdOpen
                  ? `0 0 0 1px ${OTD_COLOR}18, 0 6px 32px rgba(0,0,0,0.45), 0 0 20px ${OTD_COLOR}14`
                  : `0 2px 8px rgba(0,0,0,0.28), 0 0 0 1px ${OTD_COLOR}18`,
                overflow: "hidden",
                transition: "width 0.32s cubic-bezier(0.4,0,0.2,1), max-height 0.38s cubic-bezier(0.4,0,0.2,1), border-radius 0.2s, box-shadow 0.25s, border-color 0.2s",
                fontFamily: "var(--font)",
                backdropFilter: "blur(12px)",
                cursor: otdOpen ? "default" : "pointer",
              }}
              onClick={() => { if (!otdOpen) setOtdOpen(true); }}
            >
              {/* Collapsed pill — only visible when closed */}
              {!otdOpen && (
                <div style={{
                  height: 28, padding: "0 10px",
                  display: "flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap",
                }}>
                  <CalendarDays size={12} style={{ color: OTD_COLOR, flexShrink: 0 }} />
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: OTD_COLOR,
                  }}>
                    ON THIS DAY
                  </span>
                </div>
              )}

              {/* Expanded content — fades in after width opens */}
              {otdOpen && (
                <div style={{ animation: "otd-fade 0.18s 0.15s ease-out both" }}>
                  <style>{`@keyframes otd-fade { from { opacity:0; } to { opacity:1; } }`}</style>

                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px",
                    background: `${OTD_COLOR}0e`,
                    borderBottom: `1px solid ${OTD_COLOR}22`,
                  }}>
                    <CalendarDays size={12} style={{ color: OTD_COLOR, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: OTD_COLOR + "99" }}>
                        ON THIS DAY
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: OTD_COLOR, letterSpacing: "0.06em" }}>
                        {dateLabel.toUpperCase()}
                      </div>
                    </div>
                    {/* Close button */}
                    <div
                      onClick={e => { e.stopPropagation(); setOtdOpen(false); }}
                      style={{
                        width: 18, height: 18, borderRadius: 4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0,
                        color: OTD_COLOR + "77",
                        fontSize: 13, lineHeight: 1,
                        transition: "color 0.15s",
                      }}
                    >
                      ×
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: "10px 11px 12px" }}>
                    {/* Year + console badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: OTD_COLOR,
                        background: OTD_COLOR + "18", border: `1px solid ${OTD_COLOR}33`,
                        borderRadius: 4, padding: "1px 7px", letterSpacing: "0.06em",
                      }}>
                        {otdEntry.year}
                      </span>
                      {otdConsole && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em", fontWeight: 600 }}>
                          {otdConsole.short_name.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: "var(--text)",
                      lineHeight: 1.25, marginBottom: 6, letterSpacing: "0.01em",
                    }}>
                      {otdEntry.title}
                    </div>

                    {/* Blurb */}
                    <div style={{
                      fontSize: 10.5, color: "var(--text-dim)", lineHeight: 1.55,
                      marginBottom: otdChecked ? 10 : 4,
                    }}>
                      {otdEntry.blurb}
                    </div>

                    {/* Action buttons */}
                    {otdChecked && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {/* Play — only shown when ROM is in library AND an emulator is mapped */}
                        {otdRom && consoleMap.get(otdEntry.consoleId) && (
                          <button
                            onClick={() => { handleOtdPlay(); setOtdOpen(false); }}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
                              padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                              background: OTD_COLOR + "22", border: `1px solid ${OTD_COLOR}55`,
                              color: OTD_COLOR, transition: "all 0.15s",
                            }}
                          >
                            <Play size={9} /> PLAY
                          </button>
                        )}
                        {/* In library — navigate without launching */}
                        {otdRom && (
                          <button
                            onClick={() => { onNavigateToConsole(otdCompany, otdEntry.consoleId); setOtdOpen(false); }}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                              padding: "4px 9px", borderRadius: 5, cursor: "pointer",
                              background: "transparent", border: `1px solid ${OTD_COLOR}44`,
                              color: OTD_COLOR + "cc", transition: "all 0.15s",
                            }}
                          >
                            <ExternalLink size={9} /> IN LIBRARY
                          </button>
                        )}
                        {/* Browse console regardless */}
                        <button
                          onClick={() => { onNavigateToConsole(otdCompany, otdEntry.consoleId); setOtdOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                            padding: "4px 9px", borderRadius: 5, cursor: "pointer",
                            background: "transparent", border: "1px solid var(--border)",
                            color: "var(--text-muted)", transition: "all 0.15s",
                          }}
                        >
                          {otdConsole?.short_name.toUpperCase() ?? "BROWSE"} LIBRARY
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom accent */}
                  <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${OTD_COLOR}55, transparent)` }} />
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Static background (non-scrolling) ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Dot grid — subtle texture matching the app's sci-fi aesthetic */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `radial-gradient(circle, ${light ? "rgba(0,0,0,0.11)" : "rgba(255,255,255,0.045)"} 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }} />
          {/* Era gradient — warm amber on the left (retro origins), cool indigo on the right (modern) */}
          <div style={{
            position: "absolute", inset: 0,
            background: light
              ? "linear-gradient(to right, rgba(210,160,70,0.15) 0%, transparent 30%, transparent 70%, rgba(80,100,210,0.11) 100%)"
              : "linear-gradient(to right, rgba(180,110,30,0.10) 0%, transparent 30%, transparent 70%, rgba(80,80,220,0.09) 100%)",
          }} />
          {/* Horizontal glow band along the spine — echoes the app's radial body gradients */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: "calc(50% - 90px)", height: 180,
            background: light
              ? "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(150,150,220,0.13) 0%, transparent 65%)"
              : "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(90,80,200,0.10) 0%, transparent 65%)",
          }} />
          {/* Top vignette — dark ceiling like the app body */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "38%",
            background: light
              ? "linear-gradient(to bottom, rgba(210,210,232,0.35) 0%, transparent 100%)"
              : "linear-gradient(to bottom, rgba(4,4,14,0.55) 0%, transparent 100%)",
          }} />
          {/* Bottom vignette */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
            background: light
              ? "linear-gradient(to top, rgba(210,210,232,0.35) 0%, transparent 100%)"
              : "linear-gradient(to top, rgba(4,4,14,0.55) 0%, transparent 100%)",
          }} />
        </div>

        {/* Scrollable track — transformed directly, zero React renders per frame */}
        <div
          ref={trackRef}
          style={{
            position: "absolute", top: 0, left: 0,
            width: totalW, height: "100%",
            willChange: "transform",
          }}
        >
          {/* Decade column highlights — faint vertical glow at each 10-year mark */}
          {ticks.filter(t => t.major).map(t => (
            <div key={t.year} style={{
              position: "absolute",
              left: t.x - 60, top: 0,
              width: 120, height: "100%",
              pointerEvents: "none",
              background: light
                ? "radial-gradient(ellipse at 50% 50%, rgba(120,120,200,0.06) 0%, transparent 65%)"
                : "radial-gradient(ellipse at 50% 50%, rgba(120,100,255,0.05) 0%, transparent 65%)",
            }} />
          ))}

          {/* ── Generation bands — faint vertical tint zones ── */}
          {genBands.map(b => (
            <div key={b.gen} style={{
              position: "absolute",
              left: b.minX, top: 0,
              width: b.maxX - b.minX, height: "100%",
              pointerEvents: "none",
              background: `linear-gradient(to bottom, transparent 0%, ${b.color}08 20%, ${b.color}10 50%, ${b.color}08 80%, transparent 100%)`,
              borderLeft:  `1px solid ${b.color}14`,
              borderRight: `1px solid ${b.color}14`,
            }} />
          ))}

          {/* ── SVG layer: spine + ticks + lineage + stems ── */}
          <svg
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
            width={totalW} height={dims.h}
          >
            {/* Era name labels — large watermark text near the top of the canvas */}
            {eraPositions.map(e => (
              <text
                key={e.name}
                x={e.x} y={14}
                textAnchor="middle"
                fontSize={10} fontWeight={800}
                fill={light ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.22)"}
                fontFamily="monospace" letterSpacing="2.5"
                pointerEvents="none"
              >
                {e.name}
              </text>
            ))}

            {/* Company lineage arcs — ghost path handles events, visual path shows state */}
            {lineage.map((p, i) => {
              const isArcHov = hoveredArc    === p.companyId;
              const isLocked = lockedCompany === p.companyId;
              const isActive = activeCompany === p.companyId;
              const isOther  = activeCompany !== null && !isActive;
              return (
                <g key={i}>
                  {/* Visual path — reflects hover/lock state, no pointer events */}
                  <path
                    d={p.d} fill="none"
                    stroke={p.color}
                    strokeWidth={isLocked ? 3.5 : isArcHov ? 3 : isActive ? 2.5 : 1.5}
                    strokeOpacity={isLocked ? 0.95 : isArcHov ? 0.88 : isActive ? 0.80 : isOther ? 0.05 : 0.28}
                    strokeLinecap="round"
                    pointerEvents="none"
                    style={{
                      transition: "stroke-opacity 0.18s, stroke-width 0.18s",
                      filter: isLocked ? `drop-shadow(0 0 4px ${p.color}99)` : "none",
                    }}
                  />
                  {/* Ghost path — wide transparent hit area for easy clicking */}
                  <path
                    d={p.d} fill="none"
                    stroke="transparent"
                    strokeWidth={20}
                    pointerEvents="stroke"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredArc(p.companyId)}
                    onMouseLeave={() => setHoveredArc(null)}
                    onClick={() => setLockedCompany(lc => lc === p.companyId ? null : p.companyId)}
                  />
                </g>
              );
            })}

            {/* Main timeline spine */}
            <line
              x1={PAD_X / 2} y1={tlY}
              x2={totalW - PAD_X / 2} y2={tlY}
              stroke={dimColor} strokeWidth={2}
              pointerEvents="none"
            />

            {/* Year tick marks, decade labels, and 5-year labels */}
            {ticks.map(t => (
              <g key={t.year}>
                <line
                  x1={t.x} y1={tlY - (t.major ? 13 : 6)}
                  x2={t.x} y2={tlY + (t.major ? 13 : 6)}
                  stroke={t.major ? (light ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)") : tickColor}
                  strokeWidth={t.major ? 2 : 1}
                />
                {/* Decade label — sits above the spine, clear of near-lane cards */}
                {t.major && (
                  <text
                    x={t.x} y={tlY - 22}
                    textAnchor="middle"
                    fontSize={13} fontWeight={800}
                    fill={light ? "rgba(0,0,0,0.60)" : "rgba(255,255,255,0.58)"}
                    fontFamily="monospace" letterSpacing="1"
                  >
                    {t.year}
                  </text>
                )}
                {/* 5-year label — sits below the spine, within the safe zone */}
                {!t.major && (
                  <text
                    x={t.x} y={tlY + 22}
                    textAnchor="middle"
                    fontSize={10} fontWeight={600}
                    fill={light ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.32)"}
                    fontFamily="monospace" letterSpacing="0.5"
                  >
                    {t.year}
                  </text>
                )}
              </g>
            ))}

            {/* Console stems */}
            {slots.map(s => {
              const isH    = hovered === s.id;
              const isSib  = !isH && activeCompany === s.companyId;
              const stemH  = s.lane === 0 ? STEM_FAR : STEM_NEAR;
              const y1     = s.side === "above" ? tlY - stemH : tlY;
              const y2     = s.side === "above" ? tlY : tlY + stemH;
              return (
                <line key={s.id}
                  x1={s.x} y1={y1} x2={s.x} y2={y2}
                  stroke={isH ? s.color : isSib ? s.color + "88" : dimColor}
                  strokeWidth={isH ? 2 : isSib ? 1.5 : 1}
                  pointerEvents="none"
                  style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
                />
              );
            })}
          </svg>

          {/* ── Console cards ── */}
          {slots.map((s, si) => {
            const isH    = hovered === s.id;
            const isSib  = !isH && activeCompany === s.companyId;
            const logo   = light ? (s.logoDark ?? s.logoLight) : s.logoLight;
            const stemH  = s.lane === 0 ? STEM_FAR : STEM_NEAR;
            const cardTop = s.side === "above"
              ? tlY - stemH - CARD_H
              : tlY + stemH;

            // Combined opacity: company lock strongest, then type filter, then owned highlight.
            // When a type filter is active, matching cards are always fully lit — the owned
            // dim only applies in "ALL" mode so selecting HANDHELD lights up every handheld.
            const typeMatch    = typeFilter === "all" || s.consoleType === typeFilter;
            const companyMatch = !lockedCompany || s.companyId === lockedCompany;
            const owned        = showAll || s.romCount > 0;
            const opacity = !companyMatch        ? 0.10
              : !typeMatch                       ? 0.18
              : typeFilter !== "all"             ? 1       // type filter active → always lit
              : !owned                           ? 0.28    // "ALL" mode → respect owned setting
              : 1;

            // Scale up the hovered card, spring overshoot for life
            // Siblings get a gentle lift; others scale down slightly to focus attention
            const scale   = isH ? 1.22 : isSib ? 1.05 : activeCompany ? 0.96 : 1;
            const liftY   = isH ? (s.side === "above" ? -8 : 8) : 0;
            const tOrigin = s.side === "above" ? "bottom center" : "top center";

            const borderColor = s.color + (isH ? "cc" : isSib ? "99" : s.romCount > 0 ? (light ? "70" : "50") : (light ? "44" : "28"));
            const bg = isH
              ? `linear-gradient(150deg, ${s.color}40 0%, ${light ? "#dcdcf4" : "#0a0a20"} 100%)`
              : isSib
              ? (light
                  ? `linear-gradient(150deg, ${s.color}30 0%, rgba(226,226,244,0.97) 100%)`
                  : `linear-gradient(150deg, ${s.color}14 0%, rgba(9,9,22,0.95) 100%)`)
              : light
                  ? `linear-gradient(150deg, ${s.color}1c 0%, rgba(228,228,246,0.96) 100%)`
                  : "rgba(9,9,22,0.92)";
            const shadow = isH
              ? `0 0 0 1px ${s.color}55, 0 8px 32px ${s.color}55, 0 2px 8px rgba(0,0,0,${light ? 0.18 : 0.4})`
              : isSib
              ? `0 0 0 1px ${s.color}33, 0 3px 14px ${s.color}38`
              : light
                ? `0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px ${s.color}22`
                : "none";

            return (
              <div
                key={s.id}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => setPopup({ slot: s, rect: e.currentTarget.getBoundingClientRect() })}
                style={{
                  position: "absolute",
                  left: s.x - CARD_W / 2,
                  top: cardTop,
                  width: CARD_W,
                  height: CARD_H,
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  background: bg,
                  boxShadow: shadow,
                  cursor: "pointer",
                  // Spring curve on transform for bouncy feel; ease for colours
                  transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
                  transform: `scale(${scale}) translateY(${liftY}px)`,
                  transformOrigin: tOrigin,
                  zIndex: isH ? 30 : isSib ? 10 : s.lane === 1 ? 3 : 1,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 4, padding: "7px 5px",
                  opacity,
                  // Entrance animation — slides in from the timeline side
                  animation: `${s.side === "above" ? "tl-rise-above" : "tl-rise-below"} 0.35s cubic-bezier(0.34,1.4,0.64,1) both`,
                  animationDelay: `${Math.min(si * 18, 400)}ms`,
                }}
              >
                {logo ? (
                  <img
                    src={logo} alt="" draggable={false}
                    style={{
                      width: 70, height: 42, objectFit: "contain",
                      filter: light
                        ? `opacity(${isH ? 1 : isSib ? 0.90 : 0.78})`
                        : `brightness(${isH ? 1.3 : isSib ? 1.2 : 1.1}) opacity(${isH ? 1 : 0.88})`,
                      transition: "filter 0.2s",
                      transform: isH ? "scale(1.08)" : "scale(1)",
                      transformOrigin: "center",
                    }}
                  />
                ) : (
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: s.color,
                    letterSpacing: "0.05em", textAlign: "center",
                    maxWidth: "100%", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {s.shortName}
                  </div>
                )}

                {/* Short name */}
                <div style={{
                  fontSize: 13, fontWeight: 700, letterSpacing: "0.03em",
                  color: isH ? s.color : isSib ? s.color + "dd" : "var(--text)",
                  textAlign: "center", maxWidth: "100%",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  transition: "color 0.2s",
                }}>
                  {s.shortName}
                </div>

                {/* Release year */}
                <div style={{
                  fontSize: isH ? 12 : 11,
                  color: isH ? s.color + "dd" : "var(--text-dim)",
                  fontFamily: "monospace", letterSpacing: "0.06em",
                  fontWeight: isH ? 700 : 500,
                  transition: "font-size 0.2s, color 0.2s, font-weight 0.2s",
                }}>
                  {s.year}
                </div>

                {/* ROM count badge */}
                {s.romCount > 0 && (
                  <div style={{
                    position: "absolute", top: -8, right: -8,
                    background: s.color, color: "#000",
                    fontSize: 10, fontWeight: 800, lineHeight: 1,
                    borderRadius: 12, padding: "3px 7px",
                    boxShadow: isH
                      ? `0 2px 10px ${s.color}88`
                      : "0 1px 6px rgba(0,0,0,0.5)",
                    transform: isH ? "scale(1.2)" : "scale(1)",
                    transformOrigin: "top right",
                    transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
                  }}>
                    {s.romCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Left/right edge fade vignettes */}
        {(["left", "right"] as const).map(side => (
          <div key={side} style={{
            position: "absolute", top: 0, bottom: 0, [side]: 0,
            width: 80, pointerEvents: "none",
            background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--bg) 0%, transparent 100%)`,
          }} />
        ))}

        {/* Year in view — updates via direct DOM write on every scroll frame */}
        <div style={{
          position: "absolute", bottom: 8, left: 20,
          pointerEvents: "none", zIndex: 8,
        }}>
          <span
            ref={yearLabelRef}
            style={{
              fontSize: 34, fontWeight: 800, fontFamily: "monospace",
              letterSpacing: "0.06em", lineHeight: 1,
              color: light ? "rgba(0,0,0,0.13)" : "rgba(255,255,255,0.11)",
            }}
          />
        </div>

      </div>

      {/* ── Minimap ── */}
      <div
        onPointerDown={onMinimapPointerDown}
        style={{
          flexShrink: 0, position: "relative",
          height: 36, cursor: "pointer",
          borderTop: "1px solid var(--border)",
          background: light ? "rgba(220,220,240,0.60)" : "rgba(6,6,18,0.72)",
          userSelect: "none",
        }}
      >
        {/* Spine line */}
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 1, marginTop: -0.5, pointerEvents: "none",
          background: light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)",
        }} />

        {/* Console marks — proportionally placed, staircase heights mirror the main layout */}
        {slots.map(s => {
          const mx           = (s.x / totalW) * dims.w;
          const typeMatch    = typeFilter === "all" || s.consoleType === typeFilter;
          const companyMatch = !lockedCompany || s.companyId === lockedCompany;
          const owned        = showAll || s.romCount > 0;
          const markOpacity  = !companyMatch ? 0.07
            : !typeMatch                   ? 0.12
            : typeFilter !== "all"         ? 0.75   // type filter active → always lit
            : owned                        ? 0.75
            : 0.18;
          const MARK_H = 7;
          const top = s.side === "above"
            ? (s.lane === 0 ? 2 : 10)
            : (s.lane === 1 ? 19 : 27);
          return (
            <div key={s.id} style={{
              position: "absolute",
              left: mx - 1, top, width: 2, height: MARK_H,
              background: s.color,
              opacity: markOpacity,
              borderRadius: 1,
              pointerEvents: "none",
            }} />
          );
        })}

        {/* Viewport thumb — draggable, shows current visible window */}
        <div
          ref={minimapThumbRef}
          onPointerDown={onThumbPointerDown}
          style={{
            position: "absolute", top: 0, bottom: 0,
            left: 0, width: 0,   // set imperatively via DOM
            background: light ? "rgba(100,100,180,0.10)" : "rgba(180,180,255,0.07)",
            border: `1px solid ${light ? "rgba(80,80,180,0.30)" : "rgba(160,160,255,0.22)"}`,
            borderRadius: 2, cursor: "grab",
            boxShadow: light
              ? "inset 0 0 0 1px rgba(80,80,180,0.10)"
              : "inset 0 0 0 1px rgba(160,160,255,0.06)",
          }}
        />
      </div>

      {/* ── Legend / feature explainer ── */}
      {legendAnchor && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99988 }} onPointerDown={() => setLegendAnchor(null)} />
          <div style={{
            position: "fixed",
            right: Math.max(10, window.innerWidth - legendAnchor.right),
            top: legendAnchor.bottom + 6,
            width: 330, zIndex: 99989,
            background: light ? "rgba(238,238,252,0.98)" : "rgba(10,10,24,0.98)",
            border: "1px solid var(--border-lit)",
            borderRadius: 10,
            boxShadow: "0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
            fontFamily: "var(--font)",
            overflow: "hidden",
            animation: "tl-popup-in 0.16s cubic-bezier(0.34,1.4,0.64,1) both",
          }} onPointerDown={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: "10px 14px 9px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "var(--text)" }}>
                TIMELINE GUIDE
              </span>
              <button onClick={() => setLegendAnchor(null)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: "0 2px",
              }}>×</button>
            </div>

            <div style={{ padding: "10px 12px 14px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "70vh" }}>

              {/* Navigation */}
              <Section title="NAVIGATION" color="#60b8d8">
                <Row icon="⟵⟶" text="Scroll or drag to move through time" />
                <Row icon="▭"   text="Click the minimap to jump · drag the thumb to scrub" />
                <Row icon="year" text="Current year shown bottom-left as you scroll" />
              </Section>

              {/* Cards */}
              <Section title="CONSOLE CARDS" color="#52C060">
                <Row icon="lanes" text="Cards alternate above and below the spine in two lanes per side" />
                <Row icon="click" text="Click any card to see info and browse your library" />
              </Section>

              {/* Company arcs */}
              <Section title="COMPANY LINEAGE ARCS" color="#9999dd">
                <Row icon="〜"   text="Curves connect successive consoles from the same maker" />
                <Row icon="hover" text="Hover near an arc to highlight that company's cards" />
                <Row icon="click" text="Click an arc to lock the focus · click again or Esc to clear" />
              </Section>

              {/* Filters */}
              <Section title="FILTERS" color="#e4a030">
                <Row icon="ALL"      text="All consoles shown equally" accent color="#e4a030" />
                <Row icon="HOME"     text="Highlights home consoles · dims handhelds and arcade" accent color="#e4a030" />
                <Row icon="HANDHELD" text="Highlights portables · dims home consoles and arcade" accent color="#e4a030" />
                <div style={{ height: 2 }} />
                <Row icon="owned" text="HIGHLIGHT OWNED dims consoles with no ROMs in your library" />
                <Row icon="all"   text="SHOW ALL treats every console equally regardless of library" />
              </Section>

              {/* Generation bands */}
              <Section title="GENERATION BANDS" color="#e8855a">
                <p style={{ margin: "0 0 7px", fontSize: 10.5, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Faint vertical tints behind the spine mark each console generation.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px" }}>
                  {([
                    { gen: 2, label: "Early Gaming" },
                    { gen: 3, label: "8-Bit Era" },
                    { gen: 4, label: "16-Bit Era" },
                    { gen: 5, label: "32-Bit Era" },
                    { gen: 6, label: "DVD Era" },
                    { gen: 7, label: "HD Era" },
                    { gen: 8, label: "Connected Era" },
                    { gen: 9, label: "Modern" },
                  ] as const).map(({ gen, label }) => {
                    const c = GENERATION_COLORS[gen] ?? "#888";
                    return (
                      <div key={gen} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{
                          width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                          background: c,
                          boxShadow: `0 0 6px ${c}77`,
                        }} />
                        <span style={{ fontSize: 10.5, color: "var(--text)", lineHeight: 1.3 }}>
                          <span style={{ color: c, fontWeight: 700 }}>Gen {gen}</span>
                          {" · "}{label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>

            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Console detail popup ── */}
      {popup && (() => {
        const s    = popup.slot;
        const rect = popup.rect;
        const company = BUILT_IN_COMPANIES.find(c => c.id === s.companyId);
        const fullConsole = BUILT_IN_CONSOLES.find(c => c.id === s.id);
        const logo = light ? (s.logoDark ?? s.logoLight) : s.logoLight;
        const blurb = CONSOLE_BLURBS[s.id] ?? null;

        const POPUP_W = 288;
        const centerX = rect.left + rect.width / 2;
        const left = Math.max(10, Math.min(centerX - POPUP_W / 2, window.innerWidth - POPUP_W - 10));

        // Place popup on the spine-side of the card so it points inward
        const top = s.side === "above"
          ? Math.min(rect.bottom + 10, window.innerHeight - 280)
          : Math.max(rect.top - 270, 10);

        return createPortal(
          <>
            {/* Click-away backdrop */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99990 }}
              onPointerDown={() => setPopup(null)}
            />

            {/* Popup card */}
            <div
              style={{
                position: "fixed", left, top,
                width: POPUP_W, zIndex: 99991,
                background: light ? "rgba(240,240,252,0.97)" : "rgba(10,10,24,0.97)",
                border: `1px solid ${s.color}55`,
                borderRadius: 10,
                boxShadow: `0 0 0 1px ${s.color}18, 0 12px 48px rgba(0,0,0,0.65), 0 0 24px ${s.color}20`,
                animation: "tl-popup-in 0.18s cubic-bezier(0.34,1.4,0.64,1) both",
                fontFamily: "var(--font)",
                overflow: "hidden",
              }}
              onPointerDown={e => e.stopPropagation()}
            >
              {/* Color accent stripe */}
              <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`, opacity: 0.7 }} />

              <div style={{ padding: "12px 14px 14px" }}>
                {/* Logo + name row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {logo && (
                    <img
                      src={logo} alt="" draggable={false}
                      style={{ width: 56, height: 34, objectFit: "contain", flexShrink: 0,
                        filter: light ? "none" : `brightness(1.2)` }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 800, color: "var(--text)",
                      lineHeight: 1.2, letterSpacing: "0.02em",
                    }}>
                      {fullConsole?.name ?? s.shortName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: s.color,
                        background: s.color + "18", border: `1px solid ${s.color}33`,
                        borderRadius: 4, padding: "1px 6px", letterSpacing: "0.06em",
                      }}>
                        {company?.name ?? s.companyId}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {s.year}
                      </span>
                      {fullConsole && fullConsole.generation > 0 && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          · {genLabel(fullConsole.generation)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Blurb */}
                {blurb && (
                  <p style={{
                    margin: "0 0 10px", fontSize: 11.5, lineHeight: 1.6,
                    color: "var(--text-dim)", letterSpacing: "0.01em",
                  }}>
                    {blurb}
                  </p>
                )}

                {/* Footer: ROM count + action */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  {s.romCount > 0 ? (
                    <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>
                      {s.romCount} ROM{s.romCount !== 1 ? "s" : ""} in library
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No ROMs in library</span>
                  )}

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setPopup(null)}
                      style={{
                        fontSize: 11, padding: "5px 10px", borderRadius: 5,
                        background: "transparent",
                        border: "1px solid var(--border-lit)",
                        color: "var(--text-muted)", cursor: "pointer",
                        fontFamily: "var(--font)", fontWeight: 600,
                      }}
                    >
                      Close
                    </button>
                    {s.romCount > 0 && (
                      <button
                        onClick={() => { setPopup(null); onNavigateToConsole(s.companyId, s.id); }}
                        style={{
                          fontSize: 11, padding: "5px 12px", borderRadius: 5,
                          background: s.color,
                          border: `1px solid ${s.color}`,
                          color: "#000", cursor: "pointer",
                          fontFamily: "var(--font)", fontWeight: 800,
                          letterSpacing: "0.04em",
                          boxShadow: `0 2px 10px ${s.color}44`,
                        }}
                      >
                        BROWSE LIBRARY →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        );
      })()}
    </div>
  );
}
