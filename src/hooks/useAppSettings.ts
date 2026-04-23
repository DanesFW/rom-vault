import { useState, useEffect, useCallback } from "react";

export type Theme      = "dark" | "light";
export type Contrast   = "default" | "medium" | "high";
export type Density    = 1 | 2 | 3 | 4;
export type FontFamily = "mono" | "sans";
export type BgTexture  = "none" | "scanlines";

export type CardImageMode = "uniform-crop" | "uniform-rows" | "natural";

export interface AppDisplaySettings {
  theme:            Theme;
  contrast:         Contrast;
  density:          Density;
  showCompanyLogos:  boolean;
  cardImageMode:     CardImageMode;
  logosBrightness:   "active-only" | "always";
  scanlines:         boolean;
  fontFamily:        FontFamily;
  bgTexture:         BgTexture;
  compactHeader:     boolean;
  showStatRoms:      boolean;
  showStatSystems:   boolean;
  showStatBeaten:    boolean;
  tabColors:         Record<string, string>;
  // Customisation
  accentColor:       string | null;  // null = follow active tab colour
  borderRadius:      number;         // 0–12, applied as --radius px
  rowSpacing:        number;         // 0–3 extra vertical padding per row in px
  sidebarWidth:      number;         // 180–360
  // Library view
  defaultSortKey:    string;
  defaultSortDir:    "asc" | "desc";
  defaultBacklog:    string;
  showSizeColumn:    boolean;
  colorCodeRows:     boolean;
  // Sidebar
  hideEmptyConsoles: boolean;
  // Behavior
  offlineMode:       boolean;
  rememberTab:       boolean;
  rememberConsole:   boolean;
  confirmDelete:     boolean;
  autoHash:          boolean;
  // Stats
  hiddenStatCompanies: string[];
  statCardLayout: "grouped" | "grid";
}

const DEFAULTS: AppDisplaySettings = {
  theme:            "dark",
  contrast:         "medium",
  density:          1,
  showCompanyLogos:  true,
  cardImageMode:     "natural",
  logosBrightness:   "active-only",
  scanlines:         true,
  fontFamily:        "mono",
  bgTexture:         "none",
  compactHeader:     false,
  showStatRoms:      true,
  showStatSystems:   true,
  showStatBeaten:    true,
  tabColors:         {},
  // Customisation
  accentColor:       null,
  borderRadius:      6,
  rowSpacing:        0,
  sidebarWidth:      250,
  // Library view
  defaultSortKey:    "title",
  defaultSortDir:    "asc",
  defaultBacklog:    "all",
  showSizeColumn:    true,
  colorCodeRows:     false,
  // Sidebar
  hideEmptyConsoles: false,
  // Behavior
  offlineMode:       false,
  rememberTab:       true,
  rememberConsole:   false,
  confirmDelete:     true,
  autoHash:          false,
  // Stats
  hiddenStatCompanies: [],
  statCardLayout: "grouped",
};

const STORAGE_KEY = "romvault-display-settings";

export const CONTRAST_LABELS: Record<Contrast, string> = {
  default: "Default", medium: "Medium", high: "High",
};

// ── Theme token sets ──────────────────────────────────────────────────────────
type TokenSet = {
  bg: string; bgSurface: string; bgCard: string; bgHover: string;
  border: string; borderLit: string;
  text: string; textDim: string; textMuted: string;
  scrollTrack: string; scrollThumb: string;
  bodyGradient: string;
  placeholder: string;
};

const DARK_BASE: TokenSet = {
  bg: "#080810", bgSurface: "#0c0c1a", bgCard: "#0e0e1c", bgHover: "#14142a",
  border: "#1e1e36", borderLit: "#32325a",
  text: "#eeeef8", textDim: "#9898b8", textMuted: "#606080",
  scrollTrack: "#0a0a16", scrollThumb: "#2a2a44",
  bodyGradient:
    "radial-gradient(ellipse at 15% 0%, #0a1520 0%, transparent 45%), " +
    "radial-gradient(ellipse at 85% 100%, #0a130a 0%, transparent 45%)",
  placeholder: "#7878a0",
};

const LIGHT_BASE: TokenSet = {
  bg: "#f4f4fa", bgSurface: "#ebebf5", bgCard: "#e4e4f0", bgHover: "#dcdcec",
  border: "#c8c8e0", borderLit: "#aaaac8",
  text: "#18182e", textDim: "#44446a", textMuted: "#888aaa",
  scrollTrack: "#e0e0ee", scrollThumb: "#b0b0cc",
  bodyGradient:
    "radial-gradient(ellipse at 15% 0%, #e8eef8 0%, transparent 45%), " +
    "radial-gradient(ellipse at 85% 100%, #eaf4ea 0%, transparent 45%)",
  placeholder: "#9090b0",
};

type ContrastDelta = { textDim: string; textMuted: string; border: string; borderLit: string };

const DARK_CONTRAST: Record<Contrast, ContrastDelta> = {
  default: { textDim: "#9898b8", textMuted: "#606080", border: "#1e1e36", borderLit: "#32325a" },
  medium:  { textDim: "#aaaacc", textMuted: "#7070a0", border: "#242440", borderLit: "#3c3c64" },
  high:    { textDim: "#ccccee", textMuted: "#9898c0", border: "#2a2a4e", borderLit: "#484870" },
};

const LIGHT_CONTRAST: Record<Contrast, ContrastDelta> = {
  default: { textDim: "#44446a", textMuted: "#888aaa", border: "#c8c8e0", borderLit: "#aaaac8" },
  medium:  { textDim: "#2e2e54", textMuted: "#6a6a90", border: "#b8b8d8", borderLit: "#9494b8" },
  high:    { textDim: "#18183e", textMuted: "#50508a", border: "#a8a8cc", borderLit: "#7878aa" },
};

export function applySettings(s: AppDisplaySettings) {
  const root = document.documentElement;
  const base = s.theme === "light" ? LIGHT_BASE : DARK_BASE;
  const contrast = s.theme === "light" ? LIGHT_CONTRAST[s.contrast] : DARK_CONTRAST[s.contrast];

  root.style.setProperty("--bg",         base.bg);
  root.style.setProperty("--bg-surface", base.bgSurface);
  root.style.setProperty("--bg-card",    base.bgCard);
  root.style.setProperty("--bg-hover",   base.bgHover);
  root.style.setProperty("--border",     contrast.border);
  root.style.setProperty("--border-lit", contrast.borderLit);
  root.style.setProperty("--text",       base.text);
  root.style.setProperty("--text-dim",   contrast.textDim);
  root.style.setProperty("--text-muted", contrast.textMuted);

  // Customisation variables
  root.style.setProperty("--radius",      `${s.borderRadius ?? 6}px`);
  root.style.setProperty("--row-spacing", `${s.rowSpacing ?? 0}px`);
  if (s.accentColor) {
    root.style.setProperty("--accent-override", s.accentColor);
  } else {
    root.style.removeProperty("--accent-override");
  }

  // Font family
  const fontValue = (s.fontFamily ?? "mono") === "sans"
    ? "'Inter', 'Segoe UI', system-ui, sans-serif"
    : "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace";
  root.style.setProperty("--font", fontValue);

  document.body.style.background = base.bg;
  document.body.style.backgroundImage = base.bodyGradient;
  document.body.style.color = base.text;
  root.setAttribute("data-theme", s.theme);

  // Body background texture
  let texStyle = document.getElementById("rvault-texture-style") as HTMLStyleElement | null;
  if (!texStyle) {
    texStyle = document.createElement("style");
    texStyle.id = "rvault-texture-style";
    document.head.appendChild(texStyle);
  }
  const tex = s.bgTexture ?? "none";
  const isLight = s.theme === "light";
  const textureMap: Record<BgTexture, string> = {
    none: "",
    scanlines: isLight
      ? "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)"
      : "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
  };
  const bgImage = textureMap[tex];
  texStyle.textContent = bgImage
    ? `.app-body { background-image: ${bgImage}; }`
    : `.app-body { background-image: none; }`;

  let styleEl = document.getElementById("rvault-scroll-style") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "rvault-scroll-style";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    ::-webkit-scrollbar-track { background: ${base.scrollTrack}; }
    ::-webkit-scrollbar-thumb { background: ${base.scrollThumb}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${contrast.borderLit}; }
    input::placeholder { color: ${base.placeholder}; }
  `;
}

// ── Global singleton state ────────────────────────────────────────────────────
// All hook instances share the same state via a Set of listeners.
// This means any component calling useAppSettings re-renders when any other
// component updates settings — one source of truth, no Context needed.

function loadSettings(): AppDisplaySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULTS };
}

let globalSettings: AppDisplaySettings = loadSettings();
const listeners = new Set<(s: AppDisplaySettings) => void>();

function setGlobal(patch: Partial<AppDisplaySettings>) {
  globalSettings = { ...globalSettings, ...patch };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalSettings)); } catch {}
  applySettings(globalSettings);
  listeners.forEach(fn => fn(globalSettings));
  // Fire a custom window event so components using direct localStorage reads also update
  window.dispatchEvent(new Event("romvault-settings-changed"));
}

/** Read the offline flag synchronously — safe to call outside React. */
export function isOffline(): boolean {
  return globalSettings.offlineMode === true;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAppSettings() {
  const [settings, setSettings] = useState<AppDisplaySettings>(globalSettings);

  useEffect(() => {
    const listener = (s: AppDisplaySettings) => setSettings({ ...s });
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const updateSettings = useCallback((patch: Partial<AppDisplaySettings>) => {
    setGlobal(patch);
  }, []);

  const resetSettings = useCallback(() => {
    setGlobal(DEFAULTS);
  }, []);

  return { settings, updateSettings, resetSettings };
}

export type { AppDisplaySettings as DisplaySettings };
