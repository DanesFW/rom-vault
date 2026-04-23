import { useState, useEffect, useCallback, useRef } from "react";
import { Library, Star, BarChart2, BookOpen, Settings, Layers, Gamepad2, Clock } from "lucide-react";
import "./index.css";
import type { TabId, AppState } from "./types";
import { TAB_COLORS, TAB_LABELS, BUILT_IN_CONSOLES } from "./types";
import { getLibraryStats } from "./db";
import { useAppSettings } from "./hooks/useAppSettings";
import { useGamepadAction, useGamepadConnected } from "./hooks/useGamepad";

import Tooltip          from "./components/Tooltip";
import LibraryTab       from "./tabs/LibraryTab";
import ExclusivesTab    from "./tabs/ExclusivesTab";
import StatsTab         from "./tabs/StatsTab";
import GuideTab         from "./tabs/GuideTab";
import ShelfTab         from "./tabs/ShelfTab";
import TimelineTab      from "./tabs/TimelineTab";
import SettingsPanel    from "./components/SettingsPanel";

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  library:    <Library    size={14} />,
  exclusives: <Star       size={14} />,
  stats:      <BarChart2  size={14} />,
  guide:      <BookOpen   size={14} />,
  shelf:      <Layers     size={14} />,
  timeline:   <Clock      size={14} />,
};

function useHeaderStats(refreshKey: number) {
  const [stats, setStats] = useState({ totalRoms: 0, systems: 0, beaten: 0 });
  useEffect(() => {
    getLibraryStats()
      .then(s => setStats({ totalRoms: s.totalRoms, systems: s.systems, beaten: s.beaten }))
      .catch(() => {});
  }, [refreshKey]);
  return stats;
}

// Darken a hex color so it reads clearly on a light background.
// Scales perceived brightness down to ≤90 so text contrasts against ~#ebebf5.
// Returns the original color unchanged on dark theme.
function adaptColor(hex: string, theme: "dark" | "light"): string {
  if (theme === "dark" || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness <= 100) return hex;
  const scale = 90 / brightness;
  const d = (c: number) => Math.round(c * scale);
  return `#${d(r).toString(16).padStart(2,'0')}${d(g).toString(16).padStart(2,'0')}${d(b).toString(16).padStart(2,'0')}`;
}

function useAnimatedNumber(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const rafRef  = useRef<number>(0);
  const fromRef = useRef(target);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

const SESSION_KEY = "romvault-session";
const TAB_ORDER   = Object.keys(TAB_LABELS) as TabId[];

function loadSession(): Pick<AppState, "activeTab" | "activeConsoleId" | "activeCompanyId"> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { activeTab: "library", activeConsoleId: null, activeCompanyId: null };
}

export default function App() {
  const { settings } = useAppSettings();

  const [state, setState] = useState<AppState>(() => {
    const session = loadSession();
    return {
      activeTab:       (settings.rememberTab     ? session.activeTab       : "library") as TabId,
      activeCompanyId: settings.rememberConsole  ? session.activeCompanyId : null,
      activeConsoleId: settings.rememberConsole  ? session.activeConsoleId : null,
    };
  });

  const [statsRefresh, setStatsRefresh] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const stats = useHeaderStats(statsRefresh);
  const onLibraryChanged = useCallback(() => setStatsRefresh(n => n + 1), []);
  const onImportComplete = useCallback(() => setStatsRefresh(n => n + 1), []);

  const animatedRoms    = useAnimatedNumber(stats.totalRoms);
  const animatedSystems = useAnimatedNumber(stats.systems);
  const animatedBeaten  = useAnimatedNumber(stats.beaten);

  // Persist session state
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        activeTab:       state.activeTab,
        activeConsoleId: state.activeConsoleId,
        activeCompanyId: state.activeCompanyId,
      }));
    } catch {}
  }, [state.activeTab, state.activeConsoleId, state.activeCompanyId]);

  const getTabColor = useCallback((tab: TabId) =>
    settings.tabColors?.[tab] ?? TAB_COLORS[tab],
  [settings.tabColors]);

  useEffect(() => {
    const color = settings.accentColor ?? getTabColor(state.activeTab);
    document.documentElement.style.setProperty("--accent", color);
  }, [state.activeTab, getTabColor, settings.accentColor]);

  const setTab = useCallback((tab: TabId) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const controllerConnected = useGamepadConnected();

  useGamepadAction(useCallback((action) => {
    if (action === "lb" || action === "rb") {
      setState(prev => {
        const idx  = TAB_ORDER.indexOf(prev.activeTab);
        const next = action === "lb" ? idx - 1 : idx + 1;
        if (next < 0 || next >= TAB_ORDER.length) return prev;
        return { ...prev, activeTab: TAB_ORDER[next] };
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const setConsole = useCallback((companyId: string, consoleId: string) => {
    setState(prev => ({ ...prev, activeCompanyId: companyId, activeConsoleId: consoleId }));
  }, []);

const color = getTabColor(state.activeTab);
  const displayColor = adaptColor(color, settings.theme);
  const compact = settings.compactHeader ?? false;

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header style={{
        background: `radial-gradient(ellipse 55% 200% at 100px center, ${color}14 0%, transparent 70%), var(--bg-surface)`,
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${color}30`,
        boxShadow: `0 1px 0 ${color}22, 0 4px 24px rgba(0,0,0,0.3)`,
        transition: "border-color 0.3s, box-shadow 0.4s, background 0.5s",
        position: "sticky", top: 0, zIndex: 100,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${color} 30%, ${color} 70%, transparent 100%)`,
          opacity: 0.8,
          transition: "background 0.4s",
        }} />

        {/* Slow beam sweep */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, width: "20%", pointerEvents: "none",
          background: `linear-gradient(90deg, transparent, ${color}0a, transparent)`,
          animation: "headerBeam 7s ease-in-out infinite",
        }} />

        {/* Scanlines overlay */}
        {settings.scanlines && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            backgroundImage: settings.theme === "light"
              ? "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)"
              : "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px)",
          }} />
        )}

        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "center", gap: compact ? 10 : 14,
          padding: compact ? "6px 20px 0" : "10px 20px 0",
          position: "relative",
          transition: "padding 0.2s",
        }}>
          {/* Logo */}
          <img
            src="/logo.png"
            alt="RomVault"
            style={{
              width: compact ? 22 : 32,
              height: compact ? 22 : 32,
              objectFit: "contain",
              flexShrink: 0,
              filter: `drop-shadow(0 0 6px ${color}66)`,
              transition: "width 0.3s, height 0.3s",
            }}
          />

          {/* Title + subtitle */}
          <div>
            <h1 style={{
              margin: 0, fontSize: compact ? 14 : 18, fontWeight: 700,
              letterSpacing: "0.1em", color: "var(--text)",
              display: "flex", alignItems: "baseline", gap: 6,
              fontFamily: "var(--font)",
              transition: "font-size 0.2s",
            }}>
              ROM
              <span style={{
                color: displayColor,
                transition: "color 0.3s",
                textShadow: `0 0 18px ${displayColor}88`,
              }}>
                VAULT
              </span>
            </h1>
            {!compact && (
              <p style={{
                margin: "1px 0 0", fontSize: 10,
                color: displayColor + "99", letterSpacing: "0.14em", fontWeight: 500,
                fontFamily: "var(--font)",
              }}>
                PERSONAL ROM BACKUP DATABASE
                <span style={{
                  animation: "cursorBlink 1.2s step-end infinite",
                  marginLeft: 3, color: displayColor,
                }}>▌</span>
              </p>
            )}
          </div>

          {/* Stats boxes */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {[
              { show: settings.showStatRoms,     target: stats.totalRoms, val: animatedRoms.toLocaleString(), label: "TOTAL ROMS", color: adaptColor("#52C060", settings.theme) },
              { show: settings.showStatSystems,  target: stats.systems,   val: animatedSystems,               label: "SYSTEMS",    color: adaptColor("#9999dd", settings.theme) },
              { show: settings.showStatBeaten,   target: stats.beaten,    val: animatedBeaten,                label: "BEATEN",     color: adaptColor("#e4a030", settings.theme) },
            ].filter(s => s.show !== false).map(s => (
              <div key={s.label} style={{
                textAlign: "right", flexShrink: 0,
                padding: compact ? "3px 8px" : "4px 10px", borderRadius: 6,
                background: s.color + "18",
                border: `1px solid ${s.color}44`,
              }}>
                <div
                  key={s.target}
                  style={{ fontSize: compact ? 13 : 16, color: s.color, fontWeight: 700, fontFamily: "var(--font)", animation: "statPop 0.38s ease-out" }}
                >
                  {s.val}
                </div>
                <div style={{ fontSize: 10, color: s.color + "cc", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "var(--font)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Controller connected indicator */}
          {controllerConnected && (
            <Tooltip content="Controller connected — use D-pad / LB / RB to navigate" color={color}>
              <div style={{
                display: "flex", alignItems: "center",
                color: color, opacity: 0.7,
                flexShrink: 0,
              }}>
                <Gamepad2 size={15} />
              </div>
            </Tooltip>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              background: showSettings ? `${color}18` : "transparent",
              border: `1px solid ${showSettings ? color + "55" : "var(--border-lit)"}`,
              color: showSettings ? color : "var(--text-muted)",
              borderRadius: 6, padding: "6px 8px",
              cursor: "pointer", display: "flex", alignItems: "center",
              transition: "all 0.15s", flexShrink: 0,
            }}
          >
            <Settings size={15} style={{
              transition: "transform 0.4s ease",
              transform: showSettings ? "rotate(60deg)" : "none",
            }} />
          </button>
        </div>

        {/* Nav tabs */}
        <div style={{
          display: "flex",
          marginTop: 2,
          borderTop: "1px solid var(--border)",
          padding: "0 20px",
          position: "relative",
        }}>
          {(Object.keys(TAB_LABELS) as TabId[]).map(tab => {
            const isActive = state.activeTab === tab;
            const c = getTabColor(tab);
            return (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                style={{
                  padding: "9px 18px",
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.06em",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? c : "transparent"}`,
                  background: isActive ? c + "0e" : "transparent",
                  color: isActive ? c : "var(--text-muted)",
                  transition: "color 0.18s, background 0.18s, border-color 0.18s",
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {TAB_ICONS[tab]}
                {TAB_LABELS[tab]}
                {isActive && (
                  <span style={{
                    position: "absolute", bottom: -1, left: "20%", right: "20%", height: 2,
                    background: c,
                    boxShadow: `0 0 8px ${c}`,
                    borderRadius: 1,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="app-body">
        {state.activeTab === "library" && (
          <LibraryTab
            activeCompanyId={state.activeCompanyId}
            activeConsoleId={state.activeConsoleId}
            totalRoms={stats.totalRoms}
            reloadKey={statsRefresh}
            onSelectConsole={setConsole}
            onLibraryChanged={onLibraryChanged}
          />
        )}
        {state.activeTab === "exclusives" && <ExclusivesTab />}
        {state.activeTab === "stats" && (
          <StatsTab onNavigateToConsole={(companyId, consoleId) => {
            setConsole(companyId, consoleId);
            setTab("library");
          }} />
        )}
        {state.activeTab === "shelf" && (
          <ShelfTab
            activeConsoleId={state.activeConsoleId}
            onSelectConsole={(consoleId) => {
              const companyId = BUILT_IN_CONSOLES.find(c => c.id === consoleId)?.company_id ?? "";
              setConsole(companyId, consoleId);
            }}
          />
        )}
        {state.activeTab === "timeline" && (
          <TimelineTab
            onNavigateToConsole={(companyId, consoleId) => {
              setConsole(companyId, consoleId);
              setTab("library");
            }}
          />
        )}
        {state.activeTab === "guide" && (
          <GuideTab onNavigateToConsole={(companyId, consoleId) => {
            setConsole(companyId, consoleId);
            setTab("library");
          }} />
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onImportComplete={onImportComplete}
          onLibraryChanged={onLibraryChanged}
          onShowWelcome={() => {
            setState(prev => ({ ...prev, activeTab: "library", activeConsoleId: null, activeCompanyId: null }));
            setShowSettings(false);
          }}
        />
      )}

    </div>
  );
}
