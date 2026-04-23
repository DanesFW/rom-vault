import { useEffect, useState } from "react";
import { X, Download, Upload, CheckCircle, AlertCircle, FolderOpen, RefreshCw, Database, FileJson, Type, Sun, Moon, RotateCcw, Trash2, Palette, Layout, BarChart2, Settings, Shield, Gamepad2 } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { useSmartLists } from "../hooks/useSmartLists";
import TagManager from "./TagManager";
import { useApiKeys } from "../hooks/useApiKeys";
import { clearLogoCache } from "../hooks/useLogo";
import { useAppSettings } from "../hooks/useAppSettings";
import { deleteAllData } from "../db";
import { artCacheStats } from "../hooks/useArtwork";
import { useBulkFetch } from "../hooks/useBulkFetch";
import { TAB_COLORS, TAB_LABELS, BUILT_IN_COMPANIES, BUILT_IN_CONSOLES } from "../types";
import { EMULATOR_HINTS } from "../data/emulatorHints";
import type { Theme, FontFamily } from "../hooks/useAppSettings";
import type { TabId, EmulatorProfile } from "../types";
import { useEmulators } from "../hooks/useEmulators";
import Tooltip from "./Tooltip";

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
  onLibraryChanged?: () => void;
  onShowWelcome?: () => void;
}

const APP_VERSION = "1.0.0";

type CategoryId = "display" | "appearance" | "library" | "sidebar" | "behavior" | "stats" | "emulators" | "export" | "data" | "danger";

const CATEGORIES: { id: CategoryId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "display",    label: "Display",    icon: <Type size={15} />,     color: "#60b8d8" },
  { id: "appearance", label: "Appearance", icon: <Palette size={15} />,  color: "#a78bfa" },
  { id: "library",    label: "Library",    icon: <Layout size={15} />,   color: "#4ade80" },
  { id: "sidebar",    label: "Sidebar",    icon: <Database size={15} />, color: "#f59e0b" },
  { id: "behavior",   label: "Behavior",   icon: <Settings size={15} />, color: "#60a5fa" },
  { id: "stats",      label: "Stats",      icon: <BarChart2 size={15} />,  color: "#34d399" },
  { id: "emulators",  label: "Emulators",  icon: <Gamepad2 size={15} />,  color: "#e879f9" },
  { id: "export",     label: "Export",     icon: <Download size={15} />, color: "#fb923c" },
  { id: "data",       label: "Data",       icon: <FileJson size={15} />,  color: "#38bdf8" },
  { id: "danger",     label: "Danger",     icon: <Shield size={15} />,   color: "#f87171" },
];

export default function SettingsPanel({ onClose, onImportComplete, onLibraryChanged, onShowWelcome }: Props) {
  const { exportPhase, exportMsg, doExport, importPhase, importMsg, importResult, doImport, resetImport, htmlPhase, htmlMsg, doExportHtml, mdPhase, mdMsg, doExportMarkdown } = useSettings(onImportComplete);
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("display");
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;
  const catColor = activeCat.color;
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const [wiping,   setWiping]   = useState(false);
  const [wipeMsg,  setWipeMsg]  = useState("");
  const [sessionWipeStep, setSessionWipeStep] = useState<0 | 1>(0);
  const [sessionWiping,   setSessionWiping]   = useState(false);
  const [sessionWipeMsg,  setSessionWipeMsg]  = useState("");

  async function handleWipe() {
    if (wipeStep === 0) { setWipeStep(1); return; }
    if (wipeStep === 1) { setWipeStep(2); return; }
    setWiping(true);
    try {
      await deleteAllData();
      setWipeMsg("All data deleted.");
      setWipeStep(0);
      onImportComplete();
    } catch (e) {
      setWipeMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setWiping(false); }
  }

  async function handleSessionWipe() {
    if (sessionWipeStep === 0) { setSessionWipeStep(1); return; }
    setSessionWiping(true);
    try {
      const { deleteAllSessions } = await import("../db");
      await deleteAllSessions();
      setSessionWipeMsg("Session history cleared.");
      setSessionWipeStep(0);
      onLibraryChanged?.();
    } catch (e) {
      setSessionWipeMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSessionWiping(false); }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{
        width: 860, maxWidth: "calc(100vw - 40px)",
        height: 620, maxHeight: "calc(100vh - 60px)",
        background: "var(--bg-surface)",
        borderRadius: 12,
        border: "1px solid var(--border-lit)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        display: "flex", overflow: "hidden",
      }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 192, flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          background: "var(--bg)",
        }}>
          {/* Header */}
          <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-dim)" }}>SETTINGS</div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 16px",
                    background: active ? `${cat.color}18` : "none",
                    border: "none",
                    borderLeft: `3px solid ${active ? cat.color : "transparent"}`,
                    color: active ? cat.color : "var(--text-dim)",
                    fontFamily: "var(--font)", fontSize: 11, fontWeight: active ? 700 : 400,
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                    letterSpacing: "0.04em",
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </nav>

          {/* Logo */}
          <div style={{
            padding: "16px 12px",
            display: "flex", justifyContent: "center", alignItems: "center",
          }}>
            <img src="/logo.png" alt="RomVault" style={{ width: 88, height: 88, objectFit: "contain", opacity: 0.8 }} />
          </div>

          {/* Version footer */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)" }}>
            ROM Vault v{APP_VERSION}
          </div>
        </div>

        {/* ── Right content ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
          background: `radial-gradient(ellipse 70% 60% at 100% 0%, ${catColor}18 0%, ${catColor}08 40%, transparent 70%), var(--bg-surface)`,
          transition: "background 0.35s ease",
          ["--cat-color" as string]: catColor,
        } as React.CSSProperties}>
          {/* Content header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 28px 16px",
            borderBottom: `1px solid ${catColor}30`,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: catColor, opacity: 0.85 }}>{activeCat.icon}</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: catColor, letterSpacing: "0.04em", transition: "color 0.25s" }}>
                {activeCat.label}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: `1px solid ${catColor}44`, color: catColor, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
              <X size={13} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="settings-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 0 24px" }}>

            {/* ── DISPLAY ── */}
            {activeCategory === "display" && <>
              <Row label="Theme" desc="Choose your preferred colour scheme">
                <div style={{ display: "flex", gap: 6 }}>
                  {([{ value: "dark" as Theme, label: "Dark", icon: <Moon size={12} /> }, { value: "light" as Theme, label: "Light", icon: <Sun size={12} /> }]).map(opt => {
                    const on = settings.theme === opt.value;
                    return (
                      <button key={opt.value} onClick={() => updateSettings({ theme: opt.value })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                        {opt.icon} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row label="Text contrast" desc="Adjust dimmed text visibility">
                <div style={{ display: "flex", gap: 6 }}>
                  {([{ value: "medium" as const, label: "Default" }, { value: "high" as const, label: "High" }]).map(opt => {
                    const on = settings.contrast === opt.value;
                    return <button key={opt.value} onClick={() => updateSettings({ contrast: opt.value })} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>{opt.label}</button>;
                  })}
                </div>
              </Row>
              <Row label="Header scanlines" desc="CRT-style line overlay on the header bar">
                <Toggle on={settings.scanlines} onChange={v => updateSettings({ scanlines: v })} />
              </Row>
              <Divider />
              <div style={{ padding: "4px 28px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={resetSettings} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", fontFamily: "var(--font)", fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}>
                  <RotateCcw size={11} /> Reset all to defaults
                </button>
                {onShowWelcome && (
                  <button onClick={onShowWelcome} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", fontFamily: "var(--font)", fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}>
                    Preview dashboard
                  </button>
                )}
              </div>
            </>}

            {/* ── APPEARANCE ── */}
            {activeCategory === "appearance" && <>
              <Row label="Accent colour" desc="Override the tab colour with a fixed global accent">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={settings.accentColor ?? "#6366f1"}
                    onChange={e => updateSettings({ accentColor: e.target.value })}
                    style={{ width: 36, height: 28, border: "1px solid var(--border-lit)", borderRadius: 6, cursor: "pointer", padding: 3 }}
                  />
                  {settings.accentColor && (
                    <button onClick={() => updateSettings({ accentColor: null })} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", cursor: "pointer", padding: "4px 10px", borderRadius: 5, fontFamily: "var(--font)", fontSize: 10 }}>
                      Follow tab colour
                    </button>
                  )}
                  {!settings.accentColor && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Following tab colour</span>
                  )}
                </div>
              </Row>
              <Row label="Corner radius" desc="Roundness of cards, buttons, and panels">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range" min={0} max={12} step={1}
                    value={settings.borderRadius ?? 6}
                    onChange={e => updateSettings({ borderRadius: Number(e.target.value) })}
                    style={{ width: 120, accentColor: "var(--accent)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 28, fontVariantNumeric: "tabular-nums" }}>
                    {settings.borderRadius ?? 6}px
                  </span>
                  {(settings.borderRadius ?? 6) !== 6 && (
                    <button onClick={() => updateSettings({ borderRadius: 6 })} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", cursor: "pointer", padding: "3px 8px", borderRadius: 5, fontFamily: "var(--font)", fontSize: 10 }}>Reset</button>
                  )}
                </div>
              </Row>
              <Row label="Font style" desc="Typeface used throughout the interface">
                <div style={{ display: "flex", gap: 6 }}>
                  {([{ value: "mono" as FontFamily, label: "Monospace" }, { value: "sans" as FontFamily, label: "Sans-serif" }]).map(opt => {
                    const on = (settings.fontFamily ?? "mono") === opt.value;
                    return <button key={opt.value} onClick={() => updateSettings({ fontFamily: opt.value })} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: opt.value === "mono" ? "'JetBrains Mono', monospace" : "system-ui, sans-serif", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>{opt.label}</button>;
                  })}
                </div>
              </Row>
              <Row label="Background texture" desc="Subtle pattern overlaid on the app background">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["none","scanlines"] as const).map(t => {
                    const on = (settings.bgTexture ?? "none") === t;
                    return <button key={t} onClick={() => updateSettings({ bgTexture: t })} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize" }}>{t}</button>;
                  })}
                </div>
              </Row>
              <Row label="Compact header" desc="Smaller title row, hides the subtitle line">
                <Toggle on={!!settings.compactHeader} onChange={v => updateSettings({ compactHeader: v })} />
              </Row>
              <Divider label="Header stats" />
              {([
                { key: "showStatRoms" as const,    label: "Total ROMs" },
                { key: "showStatSystems" as const, label: "Systems" },
                { key: "showStatBeaten" as const,  label: "Beaten" },
              ]).map(opt => (
                <Row key={opt.key} label={opt.label} desc={`Show the ${opt.label.toLowerCase()} counter in the header`}>
                  <Toggle on={settings[opt.key] !== false} onChange={v => updateSettings({ [opt.key]: v })} />
                </Row>
              ))}
              <Divider label="Tab accent colours" />
              {(Object.keys(TAB_LABELS) as TabId[]).map(tab => {
                const defaultColor = TAB_COLORS[tab];
                const currentColor = settings.tabColors?.[tab] ?? defaultColor;
                const isCustom = !!settings.tabColors?.[tab];
                return (
                  <Row key={tab} label={TAB_LABELS[tab]} desc={isCustom ? "Custom colour" : "Default colour"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="color" value={currentColor} onChange={e => updateSettings({ tabColors: { ...settings.tabColors, [tab]: e.target.value } })} style={{ width: 36, height: 28, border: "1px solid var(--border-lit)", borderRadius: 6, cursor: "pointer", padding: 3 }} />
                      {isCustom && <button onClick={() => { const next = { ...settings.tabColors }; delete next[tab]; updateSettings({ tabColors: next }); }} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", cursor: "pointer", padding: "4px 10px", borderRadius: 5, fontFamily: "var(--font)", fontSize: 10 }}>Reset</button>}
                    </div>
                  </Row>
                );
              })}
            </>}

            {/* ── LIBRARY ── */}
            {activeCategory === "library" && <>
              <Row label="Row spacing" desc="Extra vertical padding in list rows">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range" min={0} max={8} step={1}
                    value={settings.rowSpacing ?? 0}
                    onChange={e => updateSettings({ rowSpacing: Number(e.target.value) })}
                    style={{ width: 120, accentColor: "var(--accent)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 28, fontVariantNumeric: "tabular-nums" }}>
                    {settings.rowSpacing ?? 0}px
                  </span>
                  {(settings.rowSpacing ?? 0) !== 0 && (
                    <button onClick={() => updateSettings({ rowSpacing: 0 })} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", cursor: "pointer", padding: "3px 8px", borderRadius: 5, fontFamily: "var(--font)", fontSize: 10 }}>Reset</button>
                  )}
                </div>
              </Row>
              <Divider />
              <Row label="Default sort column" desc="Column used when opening a console">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["title","format","size","region","backlog","added"] as const).map(key => {
                    const on = (settings.defaultSortKey ?? "title") === key;
                    return <button key={key} onClick={() => updateSettings({ defaultSortKey: key })} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize" }}>{key}</button>;
                  })}
                </div>
              </Row>
              <Row label="Default sort direction" desc="Ascending or descending on first open">
                <div style={{ display: "flex", gap: 6 }}>
                  {([{ v: "asc" as const, l: "A → Z" }, { v: "desc" as const, l: "Z → A" }]).map(({ v, l }) => {
                    const on = (settings.defaultSortDir ?? "asc") === v;
                    return <button key={v} onClick={() => updateSettings({ defaultSortDir: v })} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>{l}</button>;
                  })}
                </div>
              </Row>
              <Row label="Default backlog filter" desc="Filter applied when a console is first opened">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["all","unplayed","in-progress","beaten","completed"] as const).map(s => {
                    const on = (settings.defaultBacklog ?? "all") === s;
                    const c = { all: "var(--text-dim)", unplayed: "#6b7280", "in-progress": "#f59e0b", beaten: "#4ade80", completed: "#a78bfa" }[s];
                    return <button key={s} onClick={() => updateSettings({ defaultBacklog: s })} style={{ padding: "5px 12px", borderRadius: 10, border: `1px solid ${on ? c : "var(--border-lit)"}`, background: on ? c + "22" : "var(--bg-card)", color: on ? c : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 10, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize" }}>{s}</button>;
                  })}
                </div>
              </Row>
              <Row label="File size column" desc="Show the file size column in list views">
                <Toggle on={settings.showSizeColumn !== false} onChange={v => updateSettings({ showSizeColumn: v })} />
              </Row>
              <Row label="Colour-code rows" desc="Left border and tint matches backlog status">
                <Toggle on={!!settings.colorCodeRows} onChange={v => updateSettings({ colorCodeRows: v })} />
              </Row>
            </>}

            {/* ── SIDEBAR ── */}
            {activeCategory === "sidebar" && <>
              <Row label="Sidebar width" desc="Drag the sidebar edge or set a fixed width">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range" min={180} max={400} step={5}
                    value={settings.sidebarWidth ?? 250}
                    onChange={e => updateSettings({ sidebarWidth: Number(e.target.value) })}
                    style={{ width: 120, accentColor: "var(--accent)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 34, fontVariantNumeric: "tabular-nums" }}>
                    {settings.sidebarWidth ?? 250}px
                  </span>
                  {(settings.sidebarWidth ?? 250) !== 250 && (
                    <button onClick={() => updateSettings({ sidebarWidth: 250 })} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", cursor: "pointer", padding: "3px 8px", borderRadius: 5, fontFamily: "var(--font)", fontSize: 10 }}>Reset</button>
                  )}
                </div>
              </Row>
              <Divider />
              <Row label="Company logos" desc="Show logos in the sidebar, stats and guide">
                <Toggle on={settings.showCompanyLogos} onChange={v => updateSettings({ showCompanyLogos: v })} />
              </Row>
              {settings.showCompanyLogos && (
                <Row label="Logo brightness" desc="When logos are shown at full brightness">
                  <div style={{ display: "flex", gap: 6 }}>
                    {([{ value: "active-only" as const, label: "Active only" }, { value: "always" as const, label: "Always" }]).map(opt => {
                      const on = (settings.logosBrightness ?? "active-only") === opt.value;
                      return <button key={opt.value} onClick={() => updateSettings({ logosBrightness: opt.value })} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${on ? "var(--cat-color, var(--accent))" : "var(--border-lit)"}`, background: on ? "var(--cat-color, var(--accent))18" : "var(--bg-card)", color: on ? "var(--cat-color, var(--accent))" : "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>{opt.label}</button>;
                    })}
                  </div>
                </Row>
              )}
              <Divider />
              <Row label="Hide empty consoles" desc="Only show consoles that have at least one ROM">
                <Toggle on={!!settings.hideEmptyConsoles} onChange={v => updateSettings({ hideEmptyConsoles: v })} />
              </Row>
            </>}

            {/* ── BEHAVIOR ── */}
            {activeCategory === "behavior" && <>
              <Row label="Offline mode" desc="Block all network requests — no cover art downloads, no hash verification">
                <Toggle on={!!settings.offlineMode} onChange={v => updateSettings({ offlineMode: v })} />
              </Row>
              <Divider />
              <Row label="Remember last tab" desc="Reopen on the same tab when you relaunch">
                <Toggle on={settings.rememberTab !== false} onChange={v => updateSettings({ rememberTab: v })} />
              </Row>
              <Row label="Skip dashboard on launch" desc="Reopen with the last console selected instead of showing the dashboard">
                <Toggle on={settings.rememberConsole !== false} onChange={v => updateSettings({ rememberConsole: v })} />
              </Row>
              <Row label="Confirm before delete" desc="Require a second click to remove a ROM">
                <Toggle on={settings.confirmDelete !== false} onChange={v => updateSettings({ confirmDelete: v })} />
              </Row>
              <Row label="Auto-hash ROMs" desc="Automatically compute CRC32/MD5/SHA1 when you open a game — results are saved so it only runs once per file">
                <Toggle on={!!settings.autoHash} onChange={v => updateSettings({ autoHash: v })} />
              </Row>
            </>}

            {/* ── STATS ── */}
            {activeCategory === "stats" && <>
              <div style={{ padding: "4px 28px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                Toggle company sections visible on the Stats tab.
              </div>
              {BUILT_IN_COMPANIES.map(company => {
                const hidden = (settings.hiddenStatCompanies ?? []).includes(company.id);
                return (
                  <Row key={company.id} label={company.name} desc={hidden ? "Hidden from Stats" : "Visible on Stats"}>
                    <Toggle
                      on={!hidden}
                      color={company.color}
                      onChange={() => {
                        const cur = settings.hiddenStatCompanies ?? [];
                        updateSettings({ hiddenStatCompanies: hidden ? cur.filter(id => id !== company.id) : [...cur, company.id] });
                      }}
                    />
                  </Row>
                );
              })}
            </>}

            {/* ── EMULATORS ── */}
            {activeCategory === "emulators" && (
              <EmulatorsSection />
            )}

            {/* ── EXPORT ── */}
            {activeCategory === "export" && <>
              <Divider label="Share" />
              <div style={{ padding: "0 28px 4px" }}>
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 16 }}>
                  Export your collection as a styled HTML page or Markdown table — great for sharing on forums, GitHub, or keeping a readable snapshot.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ActionRow icon={<Download size={13} />} label="EXPORT AS HTML" description="Self-contained styled page, opens in any browser" phase={htmlPhase} msg={htmlMsg} workingLabel="EXPORTING…" doneLabel="EXPORTED ✓" errorLabel="EXPORT FAILED" buttonLabel="EXPORT" buttonColor="#60b8d8" onClick={doExportHtml} />
                  <div style={{ height: 1, background: "var(--border)" }} />
                  <ActionRow icon={<Download size={13} />} label="EXPORT AS MARKDOWN" description="Tables per console, ready for Reddit / GitHub / forums" phase={mdPhase} msg={mdMsg} workingLabel="EXPORTING…" doneLabel="EXPORTED ✓" errorLabel="EXPORT FAILED" buttonLabel="EXPORT" buttonColor="#a78bfa" onClick={doExportMarkdown} />
                </div>
              </div>
              <Divider label="Backup" />
              <div style={{ padding: "0 28px 4px" }}>
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 16 }}>
                  Export your entire collection as a single JSON file. Import on another device to restore everything.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ActionRow icon={<Download size={13} />} label="EXPORT BACKUP" description="Save romvault-backup-[date].json" phase={exportPhase} msg={exportMsg} workingLabel="EXPORTING…" doneLabel="EXPORTED ✓" errorLabel="EXPORT FAILED" buttonLabel="EXPORT" buttonColor="#4ade80" onClick={doExport} />
                  <div style={{ height: 1, background: "var(--border)" }} />
                  <ActionRow icon={<Upload size={13} />} label="IMPORT BACKUP" description="Merges into existing library — nothing is deleted" phase={importPhase === "picking" || importPhase === "importing" ? "working" : importPhase} msg={importMsg} workingLabel={importPhase === "picking" ? "CHOOSING FILE…" : "IMPORTING…"} doneLabel="IMPORTED ✓" errorLabel="IMPORT FAILED" buttonLabel="IMPORT" buttonColor="#60a5fa" onClick={doImport} onReset={resetImport} />
                  {importPhase === "done" && importResult && (
                    <div style={{ padding: "10px 12px", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 6, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.7 }}>
                      <div><span style={{ color: "#60a5fa", fontWeight: 600 }}>{importResult.romsRestored}</span> ROMs restored</div>
                      <div><span style={{ color: "#60a5fa", fontWeight: 600 }}>{importResult.exclusivesRestored}</span> exclusives restored</div>
                    </div>
                  )}
                </div>
              </div>
            </>}

            {/* ── DATA ── */}
            {activeCategory === "data" && <>
              <Divider label="Tags" />
              <div style={{ padding: "0 28px 4px" }}>
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 14 }}>
                  Create labels to categorise your ROMs — e.g. "co-op", "childhood", "replay". Assign them from any game row.
                </p>
                <TagManagerInline />
              </div>
              <Divider label="Cover art" />
              <div style={{ padding: "0 28px 4px" }}><CoverArtSectionSafe /></div>
              <Divider label="Game databases" />
              <div style={{ padding: "0 28px 4px" }}><GameDatabaseSection /></div>
              <Divider label="Integrations" />
              <div style={{ padding: "0 28px 4px" }}><IntegrationsSection /></div>
            </>}

            {/* ── DANGER ── */}
            {activeCategory === "danger" && <>
              <Divider label="Manage libraries" />
              <div style={{ padding: "0 28px 4px" }}>
                <ManageLibrariesSection onChanged={onLibraryChanged ?? (() => {})} />
              </div>
              <Divider label="Session history" />
              <div style={{ padding: "0 28px" }}>
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 14 }}>
                  Deletes all play session records and clears last-played timestamps. Your library and backlog are not affected.
                </p>
                {sessionWipeStep === 0 && (
                  <button onClick={handleSessionWipe} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "1px solid #f8717166", color: "#f87171", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "7px 14px", borderRadius: 6, cursor: "pointer" }}>
                    <Trash2 size={12} /> Clear session history
                  </button>
                )}
                {sessionWipeStep === 1 && (
                  <div style={{ padding: "14px 16px", background: "#f8717110", border: "1px solid #f87171", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 8 }}>Delete all session history? This cannot be undone.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSessionWipe} disabled={sessionWiping} style={{ background: "#f87171", border: "none", color: "#fff", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 5, cursor: sessionWiping ? "default" : "pointer", opacity: sessionWiping ? 0.6 : 1 }}>
                        {sessionWiping ? "Clearing…" : "Yes, clear history"}
                      </button>
                      <button onClick={() => setSessionWipeStep(0)} disabled={sessionWiping} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, padding: "7px 14px", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
                {sessionWipeMsg && <div style={{ marginTop: 10, fontSize: 11, color: sessionWipeMsg.startsWith("Error") ? "#f87171" : "var(--text-dim)" }}>{sessionWipeMsg}</div>}
              </div>
              <Divider label="Delete all data" />
              <div style={{ padding: "0 28px" }}>
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 14 }}>
                  Permanently deletes all ROMs, backlog data, notes, and owned exclusives. Settings are kept. Cannot be undone.
                </p>
                {wipeStep === 0 && (
                  <button onClick={handleWipe} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "1px solid #f8717166", color: "#f87171", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "7px 14px", borderRadius: 6, cursor: "pointer" }}>
                    <Trash2 size={12} /> Delete all data
                  </button>
                )}
                {wipeStep === 1 && (
                  <div style={{ padding: "14px 16px", background: "#f8717110", border: "1px solid #f87171", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 8 }}>Are you sure? This will delete everything.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleWipe} style={{ background: "#f8717122", border: "1px solid #f87171", color: "#f87171", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 5, cursor: "pointer" }}>Yes, continue</button>
                      <button onClick={() => setWipeStep(0)} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, padding: "6px 14px", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
                {wipeStep === 2 && (
                  <div style={{ padding: "14px 16px", background: "#f8717118", border: "2px solid #f87171", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 4 }}>Final confirmation — this cannot be undone.</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>All ROMs, backlog progress, notes, and exclusives will be permanently erased.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleWipe} disabled={wiping} style={{ background: "#f87171", border: "none", color: "#fff", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 5, cursor: wiping ? "default" : "pointer", opacity: wiping ? 0.6 : 1 }}>
                        {wiping ? "Deleting…" : "Permanently delete everything"}
                      </button>
                      <button onClick={() => setWipeStep(0)} disabled={wiping} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, padding: "7px 14px", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
                {wipeMsg && <div style={{ marginTop: 10, fontSize: 11, color: wipeMsg.startsWith("Error") ? "#f87171" : "var(--text-dim)" }}>{wipeMsg}</div>}
              </div>
              <Divider label="About" />
              <div style={{ padding: "4px 28px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  <InfoRow label="Version"  value={APP_VERSION} />
                  <InfoRow label="Database" value="SQLite (local)" />
                  <InfoRow label="Platform" value="Tauri v2 + React 18" />
                </div>
                <div style={{ padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 10, color: "var(--text-muted)", lineHeight: 1.7 }}>
                  ROM Vault stores everything locally. No internet connection, no accounts, no telemetry.
                </div>
              </div>
            </>}

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Layout primitives ──────────────────────────────────────────────────────────

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "13px 28px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font)" }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, color = "var(--cat-color, var(--accent))" }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: on ? color : "var(--border-lit)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 28px 8px" }}>
      {label && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", whiteSpace: "nowrap", textTransform: "uppercase" }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

function ActionRow({ icon, label, description, phase, msg,
  workingLabel, doneLabel, errorLabel, buttonLabel, buttonColor, onClick, onReset }: {
  icon: React.ReactNode; label: string; description: string;
  phase: "idle" | "working" | "done" | "error"; msg: string;
  workingLabel: string; doneLabel: string; errorLabel: string;
  buttonLabel: string; buttonColor: string;
  onClick: () => void; onReset?: () => void;
}) {
  const busy = phase === "working";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>
            <span style={{ color: buttonColor }}>{icon}</span>
            {label}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{description}</div>
        </div>
        <button
          onClick={onClick} disabled={busy}
          style={{
            background: "none",
            border: `1px solid ${phase === "done" ? buttonColor + "66" : phase === "error" ? "#f8717166" : busy ? "var(--border-lit)" : buttonColor + "66"}`,
            color: phase === "done" ? buttonColor : phase === "error" ? "#f87171" : busy ? "var(--text-muted)" : buttonColor,
            fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", padding: "5px 14px", borderRadius: 4,
            cursor: busy ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0, whiteSpace: "nowrap", transition: "all 0.15s",
          }}
        >
          {busy && (
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              border: "2px solid var(--border-lit)", borderTopColor: "var(--text-dim)",
              display: "inline-block", animation: "spin 0.8s linear infinite",
            }} />
          )}
          {phase === "done" ? <CheckCircle size={11} /> : phase === "error" ? <AlertCircle size={11} /> : busy ? null : icon}
          {busy ? workingLabel : phase === "done" ? doneLabel : phase === "error" ? errorLabel : buttonLabel}
        </button>
      </div>
      {msg && (
        <div style={{
          marginTop: 7, fontSize: 10,
          color: phase === "error" ? "#f87171" : phase === "done" ? buttonColor : "var(--text-dim)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {msg}
          {(phase === "error" || phase === "done") && onReset && (
            <button onClick={onReset} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              cursor: "pointer", fontFamily: "var(--font)", fontSize: 9,
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <RefreshCw size={9} /> reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TagManagerInline() {
  const { tags, addTag, saveTag, removeTag } = useSmartLists();
  return <TagManager tags={tags} onAdd={addTag} onSave={saveTag} onRemove={removeTag} />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-dim)" }}>{value}</span>
    </div>
  );
}


import React from "react";

class CoverArtSectionSafe extends React.Component<{}, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontSize: 11, color: "#f87171", padding: "10px 0" }}>
          Cover art section failed to load: {this.state.error}
        </div>
      );
    }
    return <CoverArtSection />;
  }
}

function CoverArtSection() {
  const [diskStats,    setDiskStats]    = useState({ count: 0, bytes: 0 });
  const [, forceUpdate] = useState(0);
  // Re-render periodically to show live session counters
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 2000);
    return () => clearInterval(t);
  }, []);
  const [diskByConsole, setDiskByConsole] = useState<{ consoleId: string; count: number }[]>([]);
  const [, setDbStats] = useState<{ totalCount: number; byConsole: { consoleId: string; count: number }[] }>({ totalCount: 0, byConsole: [] });
  const [clearing,     setClearing]     = useState(false);
  const [clearMsg,     setClearMsg]     = useState("");
  const [backupMsg,    setBackupMsg]    = useState("");
  const [selectedConsole, setSelectedConsole] = useState("all");
  const { progress, start, cancel, reset } = useBulkFetch();
  const IS_TAURI = "__TAURI_INTERNALS__" in window;

  async function loadStats() {
    if (!IS_TAURI) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const [count, bytes]: [number, number] = await invoke("get_cover_art_stats");
      setDiskStats({ count, bytes });
      const byConsoleDisk: [string, number][] = await invoke("get_cover_art_stats_by_console");
      setDiskByConsole(byConsoleDisk.map(([consoleId, count]) => ({ consoleId, count })));
      const { getCoverArtDbStats } = await import("../db");
      const db = await getCoverArtDbStats();
      setDbStats(db);
    } catch {}
  }

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (progress.phase === "done" || progress.phase === "cancelled") loadStats();
  }, [progress.phase]);

  async function handleOpenFolder() {
    if (!IS_TAURI) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_cover_art_dir");
    } catch (e) { alert(`Could not open folder: ${e}`); }
  }

  async function handleBackup() {
    if (!IS_TAURI) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dest = await open({ directory: true, multiple: false, title: "Choose backup destination" });
      if (!dest || typeof dest !== "string") return;
      const { invoke } = await import("@tauri-apps/api/core");
      const copied: number = await invoke("backup_cover_art", { destDir: dest });
      setBackupMsg(`✓ Backed up ${copied} files`);
      setTimeout(() => setBackupMsg(""), 4000);
    } catch (e) { setBackupMsg(`Error: ${e}`); }
  }

  async function handleClear() {
    setClearing(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { deleteCoverArtRecords } = await import("../db");

      if (selectedConsole === "all") {
        // Delete all files from disk
        await invoke("delete_all_cover_art");
        await deleteCoverArtRecords();
      } else {
        // Delete only files for this console
        await invoke("delete_cover_art_for_console", { consoleId: selectedConsole });
        await deleteCoverArtRecords(selectedConsole);
      }

      artCacheStats.clear();
      await loadStats();
      setClearMsg(selectedConsole === "all" ? "All art cleared from disk" : `Cleared ${selectedConsole.toUpperCase()} art from disk`);
      setTimeout(() => setClearMsg(""), 3000);
    } catch (e) { setClearMsg(`Error: ${e}`); }
    setClearing(false);
  }

  function fmt(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
  }

  const isRunning = progress.phase === "running";
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 14 }}>
        Cover art from <strong style={{ color: "var(--text)" }}>thumbnails.libretro.com</strong> — no account needed.
        Images saved to your app data folder and persist between sessions.
      </p>

      {/* Disk stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "IMAGES CACHED", value: diskStats.count.toLocaleString(), color: "#4ade80" },
          { label: "DISK USED",     value: fmt(diskStats.bytes),              color: "var(--tab-guide)" },
        ].map(s => (
          <div key={s.label} style={{
            padding: "10px 12px", borderRadius: 6, textAlign: "center",
            background: "var(--bg-card)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "var(--font)" }}>{s.value}</div>
            <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Session request stats */}
      <div style={{
        padding: "10px 12px", borderRadius: 6, marginBottom: 14,
        background: "var(--bg-card)", border: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
          THIS SESSION — REQUESTS TO thumbnails.libretro.com
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { label: "SENT",      value: artCacheStats.sessionRequests, color: "#f59e0b" },
            { label: "FOUND",     value: artCacheStats.sessionHits,     color: "#4ade80" },
            { label: "NOT FOUND", value: artCacheStats.sessionMisses,   color: "#f87171" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "var(--font)", lineHeight: 1 }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>{artCacheStats.sessionDiskHits.toLocaleString()}</span>
            {" "}served from disk — no server hit
          </div>
          <button
            onClick={() => { artCacheStats.resetSessionCounters(); forceUpdate(n => n + 1); }}
            style={{
              background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)",
              fontFamily: "var(--font)", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              padding: "3px 8px", borderRadius: 3, cursor: "pointer",
            }}
          >
            RESET
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Resets on app restart. Normal browsing is fine — the server is free to use.
          High counts only happen on first load or during bulk fetch.
        </div>
      </div>

      {/* Folder / backup buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: backupMsg ? 6 : 16 }}>
        <button onClick={handleOpenFolder} className="btn" style={{ flex: 1, justifyContent: "center", gap: 6 }}>
          <FolderOpen size={11} /> OPEN FOLDER
        </button>
        <button onClick={handleBackup} className="btn" style={{ flex: 1, justifyContent: "center", gap: 6 }}>
          <Download size={11} /> BACKUP ART
        </button>
      </div>
      {backupMsg && <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 12 }}>{backupMsg}</div>}

      {/* Fetch panel */}
      <div style={{
        padding: "12px 14px", borderRadius: 8,
        background: "var(--bg-card)", border: "1px solid var(--border)", marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "0.06em" }}>
          DOWNLOAD COVER ART
        </div>

        {/* Console selector — uses actual DB consoles that have art */}
        <select
          value={selectedConsole}
          onChange={e => setSelectedConsole(e.target.value)}
          disabled={isRunning}
          style={{
            width: "100%", marginBottom: 10,
            background: "var(--bg-surface)", border: "1px solid var(--border-lit)",
            color: "var(--text)", fontFamily: "var(--font)", fontSize: 11,
            padding: "6px 10px", borderRadius: 4, outline: "none",
          }}
        >
          <option value="all">All consoles</option>
          {diskByConsole.map(({ consoleId, count }) => (
            <option key={consoleId} value={consoleId}>
              {consoleId.toUpperCase()} ({count} images)
            </option>
          ))}
        </select>

        {/* Progress */}
        {(isRunning || progress.phase === "done" || progress.phase === "cancelled") && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginBottom: 4 }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: progress.phase === "done" ? "#4ade80" : progress.phase === "cancelled" ? "#f59e0b" : "var(--tab-guide)",
                transition: "width 0.3s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                {progress.current ? `↓ ${progress.current}` : progress.message}
              </span>
              <span style={{ flexShrink: 0 }}>{progress.done}/{progress.total}</span>
            </div>
            {progress.failed > 0 && (
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                {progress.failed} not found on server
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {!isRunning ? (
            <button onClick={() => { reset(); start(selectedConsole === "all" ? undefined : selectedConsole); }}
              style={{
                flex: 1, padding: "7px", borderRadius: 5,
                background: "var(--tab-guide)18", border: "1px solid var(--tab-guide)55",
                color: "var(--tab-guide)", fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.08em", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Download size={12} />
              {progress.phase === "done" ? "FETCH AGAIN" : "FETCH ART"}
            </button>
          ) : (
            <button onClick={cancel} style={{
              flex: 1, padding: "7px", borderRadius: 5,
              background: "#f8717118", border: "1px solid #f8717155",
              color: "#f87171", fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              CANCEL
            </button>
          )}
        </div>
      </div>

      {/* Clear art by console */}
      <div style={{
        padding: "12px 14px", borderRadius: 8, marginTop: 4,
        background: "var(--bg-card)", border: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "0.06em" }}>
          CLEAR ART BY CONSOLE
        </div>
        <select
          value={selectedConsole}
          onChange={e => setSelectedConsole(e.target.value)}
          disabled={clearing}
          style={{
            width: "100%", marginBottom: 10,
            background: "var(--bg-surface)", border: "1px solid var(--border-lit)",
            color: "var(--text)", fontFamily: "var(--font)", fontSize: 11,
            padding: "6px 10px", borderRadius: 4, outline: "none",
          }}
        >
          <option value="all">All consoles ({diskStats.count} images)</option>
          {diskByConsole.map(({ consoleId, count }) => (
            <option key={consoleId} value={consoleId}>
              {consoleId.toUpperCase()} — {count} image{count !== 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleClear}
            disabled={clearing || diskStats.count === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "1px solid #f8717155",
              color: "#f87171", fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
              padding: "6px 14px", borderRadius: 4,
              cursor: (clearing || diskStats.count === 0) ? "default" : "pointer",
              opacity: diskStats.count === 0 ? 0.4 : 1,
              transition: "all 0.15s",
            }}
          >
            <Trash2 size={11} />
            {clearing ? "CLEARING…" : selectedConsole === "all" ? "CLEAR ALL ART" : `CLEAR ${selectedConsole.toUpperCase()} ART`}
          </button>
          {clearMsg && <span style={{ fontSize: 10, color: clearMsg.startsWith("Error") ? "#f87171" : "var(--text-dim)" }}>{clearMsg}</span>}
        </div>
      </div>
    </>
  );
}


// ── Manage Libraries Section ─────────────────────────────────────────────────

// ── Emulators section ─────────────────────────────────────────────────────────

function EmulatorsSection() {
  const { profiles, consoleMap, loading, addProfile, editProfile, removeProfile, assignConsole, unassignConsole } = useEmulators();
  const [subTab, setSubTab] = React.useState<"profiles" | "consoles">("profiles");
  const [editing, setEditing] = React.useState<Partial<EmulatorProfile> | null>(null); // null = closed, {} = new
  const subColor = "#e879f9";

  if (loading) return <div style={{ padding: "20px 28px", color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-tab strip */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0, margin: "0 0 0 0" }}>
        {(["profiles", "consoles"] as const).map(t => {
          const active = subTab === t;
          return (
            <button key={t} onClick={() => setSubTab(t)} style={{
              padding: "9px 24px", background: "none", border: "none",
              borderBottom: `2px solid ${active ? subColor : "transparent"}`,
              color: active ? subColor : "var(--text-muted)",
              fontFamily: "var(--font)", fontSize: 11, fontWeight: active ? 700 : 400,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.15s",
            }}>
              {t === "profiles" ? "Emulator Profiles" : "Console Mapping"}
            </button>
          );
        })}
      </div>

      {/* ── Profiles tab ── */}
      {subTab === "profiles" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Add one profile per emulator you have installed — name it whatever makes sense to you (e.g. "PCSX2", "mGBA").
            The executable path is the <strong style={{ color: "var(--text-dim)" }}>.exe</strong> file for that emulator.
            Most emulators just need <code style={{ color: subColor, background: "var(--bg-card)", padding: "1px 4px", borderRadius: 3 }}>{"{rom}"}</code> left as-is in the args field — that gets replaced with your ROM's file path when you launch a game.
            Only change args if your emulator needs special flags (e.g. <code style={{ color: subColor, background: "var(--bg-card)", padding: "1px 4px", borderRadius: 3 }}>--fullscreen {"{rom}"}</code>).
          </p>

          {profiles.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 12 }}>
              No emulators configured yet. Add one below.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {profiles.map(p => (
              <div key={p.id} style={{
                padding: "12px 14px", borderRadius: 8,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Gamepad2 size={16} style={{ color: subColor, flexShrink: 0, opacity: 0.8 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.exe_path}
                  </div>
                  {p.is_retroarch && p.core_path && (
                    <div style={{ fontSize: 10, color: subColor, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Core: {p.core_path}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2, fontFamily: "monospace" }}>
                    {p.is_retroarch ? `retroarch -L [core] {rom}` : p.args}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditing(p)} style={iconBtnStyle}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font)", fontWeight: 700, letterSpacing: "0.06em" }}>EDIT</span>
                  </button>
                  <Tooltip content="Delete profile" color="#f87171">
                  <button onClick={() => removeProfile(p.id)} style={iconBtnStyle}>
                    <Trash2 size={12} style={{ color: "#f87171" }} />
                  </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setEditing({})} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 6, cursor: "pointer",
            background: `${subColor}14`, border: `1px solid ${subColor}55`,
            color: subColor, fontFamily: "var(--font)", fontSize: 11,
            fontWeight: 700, letterSpacing: "0.08em",
          }}>
            + ADD EMULATOR
          </button>
        </div>
      )}

      {/* ── Console mapping tab ── */}
      {subTab === "consoles" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Choose which emulator to use for each console. Only consoles that have ROMs in your library are shown.
          </p>
          {profiles.length === 0 && (
            <div style={{ padding: "12px 14px", borderRadius: 6, background: "#e879f914", border: "1px solid #e879f944", fontSize: 11, color: subColor, marginBottom: 12 }}>
              Add at least one emulator profile first.
            </div>
          )}
          <ConsoleMappingList profiles={profiles} consoleMap={consoleMap} onAssign={assignConsole} onUnassign={unassignConsole} color={subColor} />
        </div>
      )}

      {/* Profile editor modal */}
      {editing !== null && (
        <ProfileEditor
          initial={editing}
          color={subColor}
          onSave={async (p: Omit<EmulatorProfile, "id"> | EmulatorProfile) => {
            if ("id" in p && typeof p.id === "number") await editProfile(p as EmulatorProfile);
            else await addProfile(p as Omit<EmulatorProfile, "id">);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "1px solid var(--border-lit)", borderRadius: 5,
  padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
};

// ── Flat name→args lookup from all hints ─────────────────────────────────────
const HINT_ARGS_BY_NAME: Record<string, string> = {};
for (const hints of Object.values(EMULATOR_HINTS)) {
  for (const h of hints) {
    if (h.args) HINT_ARGS_BY_NAME[h.name.toLowerCase()] = h.args;
  }
}

// ── Profile editor (inline modal overlay) ────────────────────────────────────

function ProfileEditor({ initial, color, onSave, onClose }: {
  initial: Partial<EmulatorProfile>;
  color: string;
  onSave: (p: Omit<EmulatorProfile, "id"> | EmulatorProfile) => Promise<void>;
  onClose: () => void;
}) {
  const isNew = !("id" in initial && initial.id !== undefined);
  const [name,        setName]        = React.useState(initial.name        ?? "");
  const [exePath,     setExePath]     = React.useState(initial.exe_path    ?? "");
  const [args,        setArgs]        = React.useState(initial.args        ?? "{rom}");

  function handleNameChange(v: string) {
    setName(v);
    // Auto-fill args when name matches a known emulator with custom args,
    // but only if the user hasn't customised args away from the default
    const hintArgs = HINT_ARGS_BY_NAME[v.trim().toLowerCase()];
    if (hintArgs && (args === "{rom}" || args === "")) setArgs(hintArgs);
  }
  const [isRetroarch, setIsRetroarch] = React.useState(initial.is_retroarch ?? false);
  const [corePath,    setCorePath]    = React.useState(initial.core_path   ?? "");
  const [saving,      setSaving]      = React.useState(false);

  const IS_TAURI = "__TAURI_INTERNALS__" in window;

  async function pickFile(setter: (v: string) => void, title: string, exeMode = false) {
    if (!IS_TAURI) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const filters = exeMode
        ? [{ name: "Executable", extensions: ["exe", "app", ""] }]
        : [{ name: "RetroArch Core", extensions: ["dll", "so", "dylib"] }];
      const result = await open({ multiple: false, title, filters });
      if (result && typeof result === "string") setter(result);
    } catch {}
  }

  async function handleSave() {
    if (!name.trim() || !exePath.trim()) return;
    setSaving(true);
    const profile = {
      ...(isNew ? {} : { id: (initial as EmulatorProfile).id }),
      name: name.trim(),
      exe_path: exePath.trim(),
      args: isRetroarch ? "-L {core} {rom}" : args.trim() || "{rom}",
      is_retroarch: isRetroarch,
      core_path: isRetroarch ? (corePath.trim() || null) : null,
    };
    await onSave(profile as Omit<EmulatorProfile, "id"> | EmulatorProfile);
    setSaving(false);
  }

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 480, background: "var(--bg-surface)", borderRadius: 10,
        border: `1px solid ${color}55`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "var(--font)", letterSpacing: "0.06em" }}>
            {isNew ? "ADD EMULATOR" : "EDIT EMULATOR"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* RetroArch toggle */}
        <div style={{ padding: "12px 14px", borderRadius: 7, background: isRetroarch ? `${color}14` : "var(--bg-card)", border: `1px solid ${isRetroarch ? color + "55" : "var(--border)"}`, transition: "all 0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isRetroarch ? 10 : 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>RetroArch mode</div>
            <Toggle on={isRetroarch} onChange={v => {
              setIsRetroarch(v);
              // Reset args to a clean default when switching modes
              if (!v) setArgs("{rom}");
            }} color={color} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-dim)" }}>RetroArch</strong> is a single program that runs many emulator engines (called <em>cores</em>) — one per console.
            If you use RetroArch, enable this so ROM Vault can handle the core argument for you automatically.
            If you use standalone emulators (PCSX2, mGBA, Dolphin, etc.), leave this off.
          </div>
        </div>

        {/* Name */}
        <EditorField label="Name" placeholder="e.g. PCSX2, RetroArch - SNES">
          <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. PCSX2" style={inputStyle} />
        </EditorField>

        {/* Executable */}
        <EditorField label="Executable path" placeholder="">
          <div style={{ display: "flex", gap: 6 }}>
            <input value={exePath} onChange={e => setExePath(e.target.value)} placeholder="Path to emulator .exe" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => pickFile(setExePath, "Select emulator executable", true)} style={browseBtn(color)}>
              <FolderOpen size={12} />
            </button>
          </div>
        </EditorField>

        {/* RetroArch core OR custom args */}
        {isRetroarch ? (
          <EditorField label="Core path (.dll / .so)" placeholder="">
            <div style={{ display: "flex", gap: 6 }}>
              <input value={corePath} onChange={e => setCorePath(e.target.value)} placeholder="Path to libretro core" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => pickFile(setCorePath, "Select RetroArch core")} style={browseBtn(color)}>
                <FolderOpen size={12} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              This will be passed as <code style={{ color, background: "var(--bg-card)", padding: "1px 4px", borderRadius: 3 }}>-L [core]</code> to RetroArch.
            </div>
          </EditorField>
        ) : (
          <EditorField label="Launch arguments" placeholder="">
            <input value={args} onChange={e => setArgs(e.target.value)} placeholder="{rom}" style={inputStyle} />
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              <code style={{ color, background: "var(--bg-card)", padding: "1px 4px", borderRadius: 3 }}>{"{rom}"}</code> is replaced with the ROM's full file path. Leave as <code style={{ color, background: "var(--bg-card)", padding: "1px 4px", borderRadius: 3 }}>{"{rom}"}</code> for most emulators.
            </div>
          </EditorField>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", fontFamily: "var(--font)", fontSize: 11, padding: "7px 16px", borderRadius: 5, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !exePath.trim()} style={{
            background: `${color}22`, border: `1px solid ${color}66`, color,
            fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
            padding: "7px 18px", borderRadius: 5, cursor: "pointer",
            opacity: (!name.trim() || !exePath.trim()) ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}>
            {saving ? "Saving…" : isNew ? "ADD" : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorField({ label, children }: { label: string; placeholder?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border-lit)", borderRadius: 5,
  color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
  padding: "7px 10px", outline: "none", width: "100%",
};

function browseBtn(color: string): React.CSSProperties {
  return {
    background: `${color}14`, border: `1px solid ${color}44`, color,
    borderRadius: 5, padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center",
    flexShrink: 0,
  };
}

// ── Console mapping list ──────────────────────────────────────────────────────

function ConsoleMappingList({ profiles, consoleMap, onAssign, onUnassign, color }: {
  profiles: EmulatorProfile[];
  consoleMap: Map<string, EmulatorProfile>;
  onAssign: (consoleId: string, emulatorId: number) => Promise<void>;
  onUnassign: (consoleId: string) => Promise<void>;
  color: string;
}) {
  const [activeConsoleIds, setActiveConsoleIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    async function load() {
      try {
        const { default: Database } = await import("@tauri-apps/plugin-sql");
        const db = await Database.load("sqlite:romvault.db");
        const rows = await db.select<{ console_id: string }[]>(
          `SELECT DISTINCT console_id FROM roms`
        );
        setActiveConsoleIds(new Set(rows.map(r => r.console_id)));
      } catch {}
    }
    load();
  }, []);

  const companies = BUILT_IN_COMPANIES.map(company => ({
    ...company,
    consoles: BUILT_IN_CONSOLES.filter(c => c.company_id === company.id && activeConsoleIds.has(c.id)),
  })).filter(c => c.consoles.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {companies.map(company => (
        <div key={company.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: company.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: company.color, letterSpacing: "0.08em" }}>
              {company.name.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 16 }}>
            {company.consoles.map(con => {
              const assigned = consoleMap.get(con.id);
              const hints = EMULATOR_HINTS[con.id] ?? [];
              return (
                <div key={con.id} style={{
                  padding: "7px 10px", borderRadius: 6,
                  background: assigned ? `${color}0a` : "var(--bg-card)",
                  border: `1px solid ${assigned ? color + "44" : "var(--border)"}`,
                  transition: "all 0.15s",
                }}>
                  {/* Console name + dropdown */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {con.short_name}
                    </span>
                    <select
                      value={assigned?.id ?? ""}
                      onChange={async e => {
                        const val = e.target.value;
                        if (val === "") await onUnassign(con.id);
                        else await onAssign(con.id, Number(val));
                      }}
                      style={{
                        background: "var(--bg-surface)", border: `1px solid ${assigned ? color + "66" : "var(--border-lit)"}`,
                        color: assigned ? color : "var(--text-muted)",
                        fontFamily: "var(--font)", fontSize: 11, borderRadius: 4,
                        padding: "4px 8px", cursor: "pointer", outline: "none",
                      }}
                    >
                      <option value="">— none —</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Emulator hints */}
                  {hints.length > 0 && (
                    <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {hints.map((h, i) => (
                        <span key={i} style={{
                          fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
                          padding: "2px 6px", borderRadius: 3,
                          background: h.retroarch ? "var(--bg-hover)" : `${color}14`,
                          border: `1px solid ${h.retroarch ? "var(--border)" : color + "44"}`,
                          color: h.retroarch ? "var(--text-muted)" : color,
                        }}>
                          {h.name}
                          {h.note && <span style={{ opacity: 0.6 }}> ({h.note})</span>}
                          <span style={{ opacity: 0.5, marginLeft: 4 }}>
                            {h.retroarch ? "RA" : "standalone"}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ManageLibrariesSection({ onChanged }: { onChanged: () => void }) {
  const [companies, setCompanies] = React.useState<Array<{
    id: string; name: string; color: string; custom: boolean;
    consoles: Array<{ id: string; name: string; short_name: string; custom: boolean }>;
  }>>([]);
  const [loading,   setLoading]   = React.useState(false);
  const [expanded,  setExpanded]  = React.useState<Set<string>>(new Set());
  const [confirm,   setConfirm]   = React.useState<{
    type: "console" | "company";
    id: string; name: string; companyName?: string;
    step: 1 | 2; deleteArt: boolean;
  } | null>(null);
  const [result, setResult] = React.useState("");

  const IS_TAURI = "__TAURI_INTERNALS__" in window;

  async function load() {
    if (!IS_TAURI) return;
    setLoading(true);
    try {
      const { getCompanies, getConsoles } = await import("../db");
      const [comps, cons] = await Promise.all([getCompanies(), getConsoles()]);
      setCompanies(comps.map(co => ({
        ...co,
        consoles: cons.filter(c => c.company_id === co.id),
      })));
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []);

  async function handleDelete() {
    if (!confirm) return;
    const { deleteConsole, deleteCompany } = await import("../db");
    try {
      if (confirm.type === "console") {
        const res = await deleteConsole(confirm.id, { deleteBoxArt: confirm.deleteArt });
        setResult(`Removed ${confirm.name} — ${res.romsDeleted} ROMs deleted.`);
      } else {
        const res = await deleteCompany(confirm.id, { deleteBoxArt: confirm.deleteArt });
        setResult(`Removed ${confirm.name} — ${res.consolesDeleted} consoles, ${res.romsDeleted} ROMs deleted.`);
      }
      await load();
      onChanged();
      setConfirm(null);
    } catch (e) {
      setResult(`Error: ${e}`);
      setConfirm(null);
    }
  }

  const [migrating, setMigrating] = React.useState(false);
  const [migrateMsg, setMigrateMsg] = React.useState("");

  if (!IS_TAURI) return <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Available in the desktop app.</p>;
  if (loading)   return <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Loading…</p>;

  // ── Confirm overlay ───────────────────────────────────────────────────────
  if (confirm) {
    const isCompany = confirm.type === "company";
    return (
      <div style={{ padding: "14px 16px", borderRadius: 8, background: "#f8717110", border: "1px solid #f8717166" }}>
        {confirm.step === 1 ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>
              {isCompany ? `Remove "${confirm.name}"?` : `Remove "${confirm.name}"?`}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
              {isCompany
                ? "All consoles and every ROM scanned for this company will be permanently deleted."
                : `All ROMs scanned for ${confirm.name} will be permanently deleted.`}
            </div>

            {/* Box art checkbox */}
            <button
              onClick={() => setConfirm(c => c ? { ...c, deleteArt: !c.deleteArt } : null)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, padding: 0, marginBottom: 14 }}
            >
              <div style={{
                width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                border: `2px solid ${confirm.deleteArt ? "#f87171" : "var(--border-lit)"}`,
                background: confirm.deleteArt ? "#f87171" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {confirm.deleteArt && <span style={{ color: "white", fontSize: 9, lineHeight: 1 }}>✓</span>}
              </div>
              Also delete downloaded box art images
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirm(c => c ? { ...c, step: 2 } : null)}
                style={{ background: "#f8717122", border: "1px solid #f87171", color: "#f87171", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 4, cursor: "pointer" }}>
                CONTINUE
              </button>
              <button onClick={() => setConfirm(null)}
                style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, padding: "6px 14px", borderRadius: 4, cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>
              ⚠ This cannot be undone.
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>
              All data{confirm.deleteArt ? " and box art" : ""} for <strong>{confirm.name}</strong> will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDelete}
                style={{ background: "#f87171", border: "none", color: "#fff", fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 4, cursor: "pointer" }}>
                DELETE
              </button>
              <button onClick={() => setConfirm(null)}
                style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11, padding: "7px 14px", borderRadius: 4, cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Canonical company colours ────────────────────────────────────────────
  const CANONICAL_COLORS: Record<string, string> = {
    nintendo:  "#E60012",
    sony:      "#2f6bcc",
    microsoft: "#22b422",
    sega:      "#2080cc",
    atari:     "#F7941D",
    nec:       "#2090d8",
    snk:       "#E8A000",
    bandai:    "#E4002B",
    capcom:    "#1560A8",
    "3do":     "#7B1FA2",
    coleco:    "#CC0000",
    commodore: "#2080cc",
    mattel:    "#4466cc",
    sinclair:  "#1565C0",
    philips:   "#3366cc",
    arcade:    "#FF6600",
    pc:        "#3399ee",
    various:   "#2090d8",
  };

  async function handleMigrateColors() {
    setMigrating(true);
    setMigrateMsg("");
    try {
      const { updateCompanyColor } = await import("../db");
      let updated = 0;
      for (const company of companies) {
        const canonical = CANONICAL_COLORS[company.id];
        if (canonical && canonical.toLowerCase() !== company.color.toLowerCase()) {
          await updateCompanyColor(company.id, canonical);
          updated++;
        }
      }
      setMigrateMsg(updated > 0 ? `✓ Updated ${updated} company colour${updated !== 1 ? "s" : ""}` : "✓ All colours already up to date");
      await load();
      onChanged();
    } catch (e) {
      setMigrateMsg(`Error: ${e}`);
    } finally {
      setMigrating(false);
    }
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

      {/* Fix colours button */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button
          onClick={handleMigrateColors}
          disabled={migrating}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 5,
            background: "var(--cat-color, var(--accent))14",
            border: "1px solid var(--cat-color, var(--accent))55",
            color: "var(--cat-color, var(--accent))", fontFamily: "var(--font)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            cursor: migrating ? "default" : "pointer",
            opacity: migrating ? 0.6 : 1, transition: "all 0.15s",
          }}
        >
          {migrating ? "UPDATING…" : "✦ APPLY OFFICIAL COLOURS"}
        </button>
        {migrateMsg && (
          <span style={{ fontSize: 10, color: migrateMsg.startsWith("Error") ? "#f87171" : "#4ade80" }}>
            {migrateMsg}
          </span>
        )}
      </div>

      {result && (
        <div style={{ padding: "7px 10px", borderRadius: 5, marginBottom: 6, background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{result}</span>
          <button onClick={() => setResult("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>×</button>
        </div>
      )}

      {companies.length === 0 && (
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>No companies in library yet.</p>
      )}

      {companies.map(company => {
        const isExpanded  = expanded.has(company.id);
        const hasNoConsoles = company.consoles.length === 0;
        return (
          <div key={company.id} style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 3 }}>

            {/* Company header — click to expand */}
            <button
              onClick={() => setExpanded(prev => {
                const next = new Set(prev);
                next.has(company.id) ? next.delete(company.id) : next.add(company.id);
                return next;
              })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px",
                background: isExpanded ? `${company.color}10` : "var(--bg-card)",
                border: "none", borderLeft: `3px solid ${company.color}`,
                cursor: "pointer", transition: "background 0.15s",
                fontFamily: "var(--font)",
              }}
            >
              <span style={{ fontSize: 9, color: company.color, transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", flex: 1, textAlign: "left" }}>
                {company.name}
              </span>
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                {company.consoles.length} console{company.consoles.length !== 1 ? "s" : ""}
              </span>
              {/* Remove button only shown when all consoles deleted */}
              {hasNoConsoles && (
                <span
                  role="button"
                  onClick={e => {
                    e.stopPropagation();
                    setConfirm({ type: "company", id: company.id, name: company.name, step: 1, deleteArt: false });
                  }}
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "2px 7px", borderRadius: 3,
                    border: "1px solid #f8717144", color: "#f87171",
                    cursor: "pointer", background: "none",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "#f8717118")}
                  onMouseOut={e => (e.currentTarget.style.background = "none")}
                >
                  REMOVE
                </span>
              )}
            </button>

            {/* Console list — shown when expanded */}
            {isExpanded && (
              <div>
                {company.consoles.map(con => (
                  <div key={con.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px 7px 28px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--bg-card)",
                  }}>
                    <span style={{ fontSize: 11, color: "var(--text-dim)", flex: 1 }}>{con.name}</span>
                    <button
                      onClick={() => setConfirm({ type: "console", id: con.id, name: con.name, companyName: company.name, step: 1, deleteArt: false })}
                      style={{
                        background: "none", border: "1px solid #f8717133",
                        color: "#f8717188", fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 3, cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#f8717166"; }}
                      onMouseOut={e => { e.currentTarget.style.color = "#f8717188"; e.currentTarget.style.borderColor = "#f8717133"; }}
                    >
                      REMOVE
                    </button>
                  </div>
                ))}
                {company.consoles.length === 0 && (
                  <div style={{ padding: "8px 28px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    No consoles — you can now remove this company
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ── Game Databases Section ───────────────────────────────────────────────────

const GAME_DATABASES = [
  // GameTDB databases — cover disc-based Nintendo/Sony platforms
  {
    platform: "wii",
    label: "Wii + GameCube",
    url: "https://www.gametdb.com/wiitdb.zip",
    desc: "GameTDB: covers both Wii and GameCube disc IDs in one database.",
  },
  {
    platform: "wiiu",
    label: "Wii U",
    url: "https://www.gametdb.com/wiiutdb.zip",
    desc: "GameTDB: Wii U title IDs.",
  },
  {
    platform: "3ds",
    label: "Nintendo 3DS + DS",
    url: "https://www.gametdb.com/3dstdb.zip",
    desc: "GameTDB: 3DS and DS title IDs.",
  },
  {
    platform: "switch",
    label: "Nintendo Switch",
    url: "https://www.gametdb.com/switchtdb.zip",
    desc: "GameTDB: Switch title IDs.",
  },
  // Note: PS1/PS2/PS3/PSP use different naming — Sony disc IDs (e.g. SCES-12345)
  // are not in GameTDB. Art matching for those consoles relies on the filename-based
  // approach which works well since No-Intro names match libretro directly.
];

function GameDatabaseSection() {
  const [meta,       setMeta]       = React.useState<{ platform: string; downloadedAt: string; entryCount: number }[]>([]);
  const [loading,    setLoading]    = React.useState<string | null>(null);
  const [msg,        setMsg]        = React.useState("");
  const IS_TAURI = "__TAURI_INTERNALS__" in window;

  async function loadMeta() {
    if (!IS_TAURI) return;
    const { getGameDbMeta } = await import("../db");
    setMeta(await getGameDbMeta());
  }

  React.useEffect(() => { loadMeta(); }, []);

  async function handleDownload(db: typeof GAME_DATABASES[0]) {
    setLoading(db.platform);
    setMsg("");
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const entries: [string, string][] = await invoke("download_game_db", { url: db.url });
      const { saveGameTitles, saveGameDbMeta } = await import("../db");
      await saveGameTitles(entries.map(([gameId, title]) => ({ gameId, title, platform: db.platform })));
      await saveGameDbMeta(db.platform, entries.length);
      setMsg(`✓ ${db.label}: ${entries.length.toLocaleString()} titles saved`);
      await loadMeta();
    } catch (e) {
      setMsg(`Error: ${e}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleClear(platform: string) {
    const { clearGameTitles } = await import("../db");
    await clearGameTitles(platform);
    setMsg(`Cleared ${platform} database`);
    await loadMeta();
  }

  if (!IS_TAURI) return <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Available in the desktop app.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 8 }}>
        Download game title databases from <strong style={{ color: "var(--text)" }}>GameTDB</strong> — a free, open, community-maintained database.
        Once downloaded, disc IDs in your ROM filenames (e.g. <code style={{ color: "var(--cat-color, var(--accent))", fontSize: 10 }}>[SMNE01]</code>) are looked up
        to get the exact official title for accurate box art matching. Recommended for all Nintendo disc-based consoles.
      </p>

      {msg && (
        <div style={{
          padding: "7px 10px", borderRadius: 5, marginBottom: 4,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          fontSize: 11, color: msg.startsWith("Error") ? "#f87171" : "#4ade80",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{msg}</span>
          <button onClick={() => setMsg("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
        </div>
      )}

      {GAME_DATABASES.map(db => {
        const info = meta.find(m => m.platform === db.platform);
        const isLoading = loading === db.platform;
        return (
          <div key={db.platform} style={{
            padding: "10px 12px", borderRadius: 6,
            background: "var(--bg-card)", border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", flex: 1 }}>{db.label}</span>
              {info && (
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                  {info.entryCount.toLocaleString()} titles · {new Date(info.downloadedAt).toLocaleDateString()}
                </span>
              )}
              {info && (
                <Tooltip content="Clear this database" color="#f87171">
                <button
                  onClick={() => handleClear(db.platform)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "0 4px" }}
                >×</button>
                </Tooltip>
              )}
              <button
                onClick={() => handleDownload(db)}
                disabled={!!loading}
                style={{
                  padding: "4px 10px", borderRadius: 4,
                  background: info ? "var(--bg-surface)" : "var(--cat-color, var(--accent))18",
                  border: `1px solid ${info ? "var(--border-lit)" : "var(--cat-color, var(--accent))55"}`,
                  color: info ? "var(--text-dim)" : "var(--cat-color, var(--accent))",
                  fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.06em", cursor: loading ? "default" : "pointer",
                  opacity: loading && !isLoading ? 0.5 : 1,
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                {isLoading ? "DOWNLOADING…" : info ? "UPDATE" : "DOWNLOAD"}
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{db.desc}</div>
          </div>
        );
      })}
    </div>
  );
}


// ── Integrations Section ─────────────────────────────────────────────────────

function IntegrationsSection() {
  const { keys, updateKey } = useApiKeys();
  const [testing, setTesting]   = React.useState(false);
  const [testMsg, setTestMsg]   = React.useState("");

  async function handleTest() {
    if (!keys.steamGridDb.trim()) {
      setTestMsg("Enter an API key first.");
      return;
    }
    setTesting(true);
    setTestMsg("");
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      // Route through Rust to avoid Tauri webview network restrictions
      await invoke("sgdb_get", {
        url: "https://www.steamgriddb.com/api/v2/search/autocomplete/Mario",
        apiKey: keys.steamGridDb.trim(),
      });
      setTestMsg("✓ Key is valid — SteamGridDB connected");
    } catch (e: any) {
      const msg = String(e);
      if (msg.includes("401") || msg.includes("Unauthorized")) {
        setTestMsg("✗ Invalid key — check and try again");
      } else {
        setTestMsg(`✗ ${msg}`);
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* SteamGridDB */}
      <div style={{
        padding: "12px 14px", borderRadius: 8,
        background: "var(--bg-card)", border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", flex: 1 }}>SteamGridDB</span>
          {keys.steamGridDb && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              padding: "2px 6px", borderRadius: 3,
              background: "#4ade8022", color: "#4ade80",
              border: "1px solid #4ade8044",
            }}>CONFIGURED</span>
          )}
        </div>

        <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 10 }}>
          Used for game logo images in the Shelf view. Requires a free Steam account.{" "}
          <span style={{ color: "var(--text-dim)" }}>
            steamgriddb.com → log in with Steam → Profile → Preferences → API → Generate API key
          </span>
        </p>
        <div style={{
          padding: "7px 10px", borderRadius: 5, marginBottom: 10,
          background: "#4ade8010", border: "1px solid #4ade8030",
          fontSize: 10, color: "#4ade80cc", lineHeight: 1.6,
        }}>
          🔒 Your key is stored locally on this device only. ROM Vault never transmits
          it anywhere — requests go directly from your machine to SteamGridDB.
          No game data, library info, or personal data is ever shared.
        </div>

        {keys.steamGridDb ? (
          /* Key is saved — show compact status row instead of input */
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{
              flex: 1, padding: "8px 12px", borderRadius: 5,
              background: "#4ade8010", border: "1px solid #4ade8030",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <CheckCircle size={13} color="#4ade80" />
              <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
                API key saved
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>
                {"•".repeat(12)}
              </span>
            </div>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: "7px 12px", borderRadius: 5, whiteSpace: "nowrap",
                background: "var(--cat-color, var(--accent))18", border: "1px solid var(--cat-color, var(--accent))55",
                color: "var(--cat-color, var(--accent))", fontFamily: "var(--font)", fontSize: 9,
                fontWeight: 700, letterSpacing: "0.06em",
                cursor: testing ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {testing ? "TESTING…" : "TEST"}
            </button>
            <button
              onClick={() => { updateKey({ steamGridDb: "" }); setTestMsg(""); clearLogoCache(); }}
              style={{
                background: "none", border: "1px solid #f8717133",
                color: "#f87171", borderRadius: 5, padding: "7px 10px",
                cursor: "pointer", fontFamily: "var(--font)", fontSize: 9,
                fontWeight: 700, letterSpacing: "0.06em",
              }}
            >
              REMOVE
            </button>
          </div>
        ) : (
          /* No key — show input */
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <input
              type="text"
              value={keys.steamGridDb}
              onChange={e => { updateKey({ steamGridDb: e.target.value }); setTestMsg(""); clearLogoCache(); }}
              placeholder="Paste your API key here…"
              spellCheck={false}
              style={{
                flex: 1, boxSizing: "border-box",
                background: "var(--bg-surface)", border: "1px solid var(--border-lit)",
                color: "var(--text)", fontFamily: "monospace", fontSize: 11,
                padding: "7px 10px", borderRadius: 5, outline: "none",
              }}
            />
          </div>
        )}

        {testMsg && (
          <div style={{
            fontSize: 10,
            color: testMsg.startsWith("✓") ? "#4ade80" : "#f87171",
          }}>
            {testMsg}
          </div>
        )}
      </div>

    </div>
  );
}
