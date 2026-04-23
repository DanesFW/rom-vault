import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, FolderOpen, RefreshCw, Copy, Shuffle, BookmarkPlus, ListPlus } from "lucide-react";
import type { RomEntry } from "../types";
import type { SortKey } from "../hooks/useRoms";
import type { ScanProgress } from "../hooks/useFolderScan";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { useAppSettings } from "../hooks/useAppSettings";
import { useGamepadScroll } from "../hooks/useGamepad";
import { getConsoleRatios, getRomRatio, useRatioVersion } from "../hooks/useArtwork";
import WelcomeScreen from "./WelcomeScreen";
import RomRow from "./RomRow";
import RomCardSmall from "./RomCardSmall";
import RomCardLarge from "./RomCardLarge";
import Tooltip from "./Tooltip";

// Returns an appropriate text-shadow for a company color.
// On dark theme: dark colors get a white glow to lift them off the background.
// On light theme: all colors get a subtle same-hue glow (dark colors already contrast fine).
function textShadow(hex: string, theme: "dark" | "light" = "dark"): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 'none';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (theme === "light") {
    return `0 0 14px ${hex}55, 0 0 5px ${hex}33`;
  }
  if (brightness < 90) {
    return '0 0 12px rgba(255,255,255,0.35), 0 0 4px rgba(255,255,255,0.2)';
  }
  return `0 0 20px ${hex}88, 0 0 8px ${hex}55`;
}



interface Props {
  consoleId: string | null;
  consoleName: string;
  companyColor: string;
  totalRomsVault: number;
  rows: RomEntry[];
  total: number;
  page: number;
  pageCount: number;
  loading: boolean;
  filters: { search: string; backlogStatus: string; tagIds?: number[] };
  sort: { key: SortKey; dir: "asc" | "desc" };
  scanProgress: ScanProgress;
  showDupeCleaner: boolean;
  allTags?: import("../types").Tag[];
  playlists?: import("../types").Playlist[];
  isGlobalSearch?: boolean;
  onFilterChange: (k: "search" | "backlogStatus", v: string) => void;
  onTagFilterChange?: (tagIds: number[]) => void;
  onScopeChange?: (global: boolean) => void;
  onSortToggle: (key: SortKey) => void;
  onPageChange: (p: number) => void;
  onNavigateToConsole: (companyId: string, consoleId: string) => void;
  onScan: () => void;
  onScanAll: () => void;
  onSurprise: () => void;
  onToggleDupeCleaner: () => void;
  onCycleBacklog: (rom: RomEntry) => void;
  onBulkStatusChange?: () => void;
  onSaveNote: (id: number, note: string) => void;
  onRenameRom: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  onSetTags?: (romId: number, tagIds: number[]) => void;
  onAddToPlaylist?: (romId: number, playlistId: number) => void;
  onAddSelectedToPlaylist?: (romIds: number[], playlistId: number) => void;
  onSaveList?: () => void;
  onPlay?: (rom: RomEntry) => void;
  controllerCursor?: number | null;
  controllerCardOpen?: boolean;
  onControllerCardClose?: () => void;
  onColumnsChange?: (cols: number) => void;
}

const STATUSES = ["all", "unplayed", "in-progress", "beaten", "completed"] as const;
const STATUS_COLORS: Record<string, string> = {
  all:           "var(--text-dim)",
  unplayed:      "#6b7280",
  "in-progress": "#f59e0b",
  beaten:        "#4ade80",
  completed:     "#a78bfa",
};

const COL = {
  num:     { desktop: 36,  mobile: 28 },
  format:  { desktop: 56,  mobile: 0  },
  size:    { desktop: 70,  mobile: 0  },
  note:    { desktop: 30,  mobile: 32 },
  backlog: { desktop: 100, mobile: 32 },
  del:     { desktop: 30,  mobile: 32 },
};

export default function RomList({
  consoleId, consoleName, companyColor, totalRomsVault,
  rows, total, page, pageCount, loading, filters, sort, scanProgress,
  showDupeCleaner, allTags = [], playlists = [], isGlobalSearch = false,
  onFilterChange, onTagFilterChange, onScopeChange, onSortToggle, onPageChange,
  onNavigateToConsole, onScan, onScanAll, onSurprise, onToggleDupeCleaner,
  onCycleBacklog, onBulkStatusChange, onSaveNote, onRenameRom, onDelete, onSetTags,
  onAddToPlaylist, onAddSelectedToPlaylist, onSaveList, onPlay,
  controllerCursor = null, controllerCardOpen = false, onControllerCardClose, onColumnsChange,
}: Props) {
  const { mobileLayout: mobile } = useWindowWidth();
  const { settings, updateSettings } = useAppSettings();
  const density = mobile ? 1 : (settings.density ?? 1);
  const showSizeColumn = !mobile && (settings.showSizeColumn !== false);
  const colorCodeRows = settings.colorCodeRows ?? false;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef   = useRef<HTMLDivElement>(null);

  // Scroll controller-selected row into view
  useEffect(() => {
    if (controllerCursor == null) return;
    const el = scrollRef.current?.querySelector(`[data-row-idx="${controllerCursor}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [controllerCursor]);

  // Right stick scrolls the ROM list
  useGamepadScroll((dy) => {
    scrollRef.current?.scrollBy({ top: dy });
  });

  // Report grid column count via ResizeObserver so LibraryTab can step by columns
  useEffect(() => {
    if (!onColumnsChange || density < 3) return;
    const el = gridRef.current;
    if (!el) return;
    const report = () => {
      const cols = getComputedStyle(el).gridTemplateColumns.split(" ").length;
      onColumnsChange(cols);
    };
    report();
    const obs = new ResizeObserver(report);
    obs.observe(el);
    return () => obs.disconnect();
  }, [density, onColumnsChange]);

  type HashItem = { id: number; title: string; filepath: string; crc32?: string; md5?: string; sha1?: string; status: "pending" | "hashing" | "done" | "error"; error?: string };
  const [hashBatch, setHashBatch] = useState<HashItem[] | null>(null);

  // Clear selection when console changes
  useEffect(() => { setSelectedIds(new Set()); }, [consoleId]);

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkSetStatus(status: import("../types").BacklogStatus | null) {
    const { updateBacklogBulk } = await import("../db");
    await updateBacklogBulk([...selectedIds], status);
    setSelectedIds(new Set());
    onBulkStatusChange?.();
  }

  async function startBatchHash() {
    const selected = rows.filter(r => selectedIds.has(r.id));
    if (!selected.length) return;
    const items: HashItem[] = selected.map(r => ({ id: r.id, title: r.title, filepath: r.filepath, status: "pending" }));
    setHashBatch(items);
    const { invoke } = await import("@tauri-apps/api/core");
    for (let i = 0; i < items.length; i++) {
      setHashBatch(prev => prev && prev.map((item, idx) => idx === i ? { ...item, status: "hashing" } : item));
      try {
        const result = await invoke<{ crc32: string; md5: string; sha1: string }>("hash_rom", { path: items[i].filepath });
        setHashBatch(prev => prev && prev.map((item, idx) => idx === i ? { ...item, ...result, status: "done" } : item));
        const { saveRomHashes } = await import("../db");
        await saveRomHashes(items[i].id, result.crc32, result.md5, result.sha1);
      } catch (e) {
        setHashBatch(prev => prev && prev.map((item, idx) => idx === i ? { ...item, status: "error", error: String(e) } : item));
      }
    }
    // Reload rows so individual ROM cards reflect the newly saved hashes
    onBulkStatusChange?.();
  }
  const gap = mobile ? 7 : 10;

  // Inject scrollbar colour matching the active console's company colour
  useEffect(() => {
    const styleId = "rom-scroll-colour";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `
      .rom-scroll-container::-webkit-scrollbar { width: 5px; }
      .rom-scroll-container::-webkit-scrollbar-track { background: transparent; }
      .rom-scroll-container::-webkit-scrollbar-thumb { background: ${companyColor}88; border-radius: 3px; }
      .rom-scroll-container::-webkit-scrollbar-thumb:hover { background: ${companyColor}; }
    `;
    return () => { if (el) el.textContent = ""; };
  }, [companyColor]);
  const cardMode = settings.cardImageMode ?? "natural";

  // Re-run sort whenever new art ratios are recorded
  const ratioVersion = useRatioVersion();

  // In card views, sort outlier-ratio ROMs to the bottom so they don't break rows.
  // We compute the median ratio of loaded images for this console, then flag any
  // ROM whose art ratio differs by more than 20% as an outlier.
  const sortedRows = useMemo(() => {
    if (density < 3 || !consoleId) return rows;
    const ratios = getConsoleRatios(consoleId);
    if (ratios.length < 3) return rows; // not enough data yet
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const THRESHOLD = 0.20; // 20% deviation = outlier
    const conforming: typeof rows = [];
    const outliers:   typeof rows = [];
    for (const rom of rows) {
      const ratio = getRomRatio(consoleId, rom.title);
      if (ratio === null || Math.abs(ratio - median) / median <= THRESHOLD) {
        conforming.push(rom);
      } else {
        outliers.push(rom);
      }
    }
    return [...conforming, ...outliers];
  }, [rows, consoleId, density, ratioVersion]);
  const px  = mobile ? 12 : 18;

  if (!consoleId) return (
    <WelcomeScreen
      totalRoms={totalRomsVault}
      onScanAll={onScanAll}
      onNavigateToConsole={onNavigateToConsole}
      onSurprise={onSurprise}
    />
  );

  return (
    <>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", animation: "romlist-enter 0.22s ease both" }}>

      {/* ── Section header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: `10px ${px}px`,
        borderBottom: `1px solid ${companyColor}30`,
        background: `linear-gradient(90deg, ${companyColor}18 0%, var(--bg-surface) 40%), var(--bg-surface)`,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, letterSpacing: "0.1em",
          color: companyColor, flex: mobile ? "0 0 auto" : 1,
          textShadow: textShadow(companyColor, settings.theme),
        }}>
          {consoleName.toUpperCase()}
        </span>

        <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>
          {total.toLocaleString()} ROM{total !== 1 ? "s" : ""}
        </span>

        {/* Backlog filter pills */}
        <div style={{ display: "flex", gap: 4, overflowX: mobile ? "auto" : "visible", flexShrink: 0 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => onFilterChange("backlogStatus", s)} style={{
              background: "none",
              border: `1px solid ${filters.backlogStatus === s ? STATUS_COLORS[s] : "transparent"}`,
              color: filters.backlogStatus === s ? STATUS_COLORS[s] : "var(--text-dim)",
              fontFamily: "var(--font)", fontSize: 9, fontWeight: 600,
              padding: "2px 7px", borderRadius: 10, cursor: "pointer",
              letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {s}
            </button>
          ))}
        </div>

        {/* Tag filter pills */}
        {!mobile && onTagFilterChange && allTags.length > 0 && allTags.map(tag => {
          const active = (filters.tagIds ?? []).includes(tag.id);
          return (
            <button key={tag.id} onClick={() => {
              const current = filters.tagIds ?? [];
              onTagFilterChange(active ? current.filter(id => id !== tag.id) : [...current, tag.id]);
            }} style={{
              background: active ? tag.color + "22" : "none",
              border: `1px solid ${active ? tag.color : "transparent"}`,
              color: active ? tag.color : "var(--text-dim)",
              fontFamily: "var(--font)", fontSize: 9, fontWeight: 600,
              padding: "2px 7px", borderRadius: 10, cursor: "pointer",
              letterSpacing: "0.06em", whiteSpace: "nowrap",
            }}>
              {tag.name}
            </button>
          );
        })}

        {!mobile && (
          <button className="btn"
            style={showDupeCleaner ? { borderColor: "#f87171", color: "#f87171" } : {}}
            onClick={onToggleDupeCleaner}>
            <Copy size={12} /> DUPLICATES
          </button>
        )}

        {/* Surprise Me */}
        <Tooltip content="Pick a random game from this console" color={companyColor}>
        <button
          onClick={onSurprise}
          className="btn"
          style={{ flexShrink: 0, gap: 5 }}
        >
          <Shuffle size={11} />
          {!mobile && "SURPRISE"}
        </button>
        </Tooltip>

        {/* Single scan button with dropdown */}
        <ScanDropdown
          companyColor={companyColor}
          consoleName={consoleName}
          mobile={mobile}
          onScan={onScan}
          onScanAll={onScanAll}
        />
      </div>

      {/* ── Scan progress banner ── */}
      {scanProgress.phase !== "idle" && (
        <div style={{
          padding: "6px 16px",
          background: scanProgress.phase === "error" ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.06)",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          color: scanProgress.phase === "error" ? "#f87171" : "#4ade80",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {(scanProgress.phase === "scanning" || scanProgress.phase === "inserting") && (
            <RefreshCw size={11} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
          )}
          {scanProgress.message}
          {scanProgress.found > 0 && (
            <span style={{ color: "var(--text-dim)" }}>
              ({scanProgress.inserted}/{scanProgress.found})
            </span>
          )}
        </div>
      )}

      {/* ── Search bar + density slider / bulk toolbar — same height, crossfade ── */}
      <div style={{
        position: "relative",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        background: "var(--bg-surface)",
      }}>
      {/* Search + density — fades out when selection active */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: `6px ${px}px`,
        background: `linear-gradient(90deg, ${companyColor}18 0%, transparent 60%)`,
        opacity: selectedIds.size > 0 ? 0 : 1,
        pointerEvents: selectedIds.size > 0 ? "none" : "auto",
        transition: "opacity 0.18s ease",
      }}>
        {/* Search — half width */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Search size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
          <input
            type="text"
            value={filters.search}
            onChange={e => onFilterChange("search", e.target.value)}
            placeholder="Search titles…"
            style={{
              background: "none", border: "none", color: "var(--text)",
              fontFamily: "var(--font)", fontSize: 13, outline: "none", flex: 1, minWidth: 0,
            }}
          />
          {filters.search && (
            <button onClick={() => onFilterChange("search", "")}
              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* Divider */}
        {!mobile && <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />}

        {/* Scope toggle — THIS CONSOLE / ALL CONSOLES */}
        {!mobile && onScopeChange && consoleId && (
          <div style={{ display: "flex", gap: 0, flexShrink: 0, borderRadius: 5, overflow: "hidden", border: "1px solid var(--border-lit)" }}>
            {[
              { label: "THIS CONSOLE", global: false },
              { label: "ALL CONSOLES", global: true  },
            ].map(opt => {
              const active = opt.global === isGlobalSearch;
              return (
                <button
                  key={String(opt.global)}
                  onClick={() => onScopeChange(opt.global)}
                  style={{
                    padding: "3px 9px", border: "none", cursor: "pointer",
                    fontFamily: "var(--font)", fontSize: 9, fontWeight: active ? 700 : 400,
                    letterSpacing: "0.06em",
                    background: active ? companyColor + "33" : "transparent",
                    color: active ? companyColor : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Save as list button — shown when any filter is active */}
        {!mobile && onSaveList && (filters.search || filters.backlogStatus !== "all" || (filters.tagIds ?? []).length > 0 || isGlobalSearch) && (
          <>
            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
            <Tooltip content="Save current filters as a smart list" color={companyColor}>
            <button
              onClick={onSaveList}
              className="btn"
              style={{ flexShrink: 0, gap: 5, color: companyColor, borderColor: companyColor + "55" }}
            >
              <BookmarkPlus size={11} />
              SAVE LIST
            </button>
            </Tooltip>
          </>
        )}

        {/* Divider */}
        {!mobile && <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />}

        {/* Density slider — only on non-mobile */}
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              VIEW
            </span>
            <input
              type="range" min={1} max={4} step={1}
              value={settings.density ?? 1}
              onChange={e => updateSettings({ density: Number(e.target.value) as import("../hooks/useAppSettings").Density })}
              style={{ width: 80, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,4].map(v => (
                <Tooltip key={v} content={["Compact", "Rows + Art", "Small Cards", "Large Cards"][v-1]}>
                <button
                  onClick={() => updateSettings({ density: v as import("../hooks/useAppSettings").Density })}
                  style={{
                    width: 18, height: 18, borderRadius: 3, padding: 0,
                    background: (settings.density ?? 1) === v ? "var(--accent)" : "var(--bg-hover)",
                    border: `1px solid ${(settings.density ?? 1) === v ? "var(--accent)" : "var(--border)"}`,
                    cursor: "pointer", transition: "all 0.12s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {/* Mini icon for each density */}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    {v === 1 && <>
                      <rect x="0" y="1" width="10" height="2" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.9"/>
                      <rect x="0" y="4" width="10" height="2" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.7"/>
                      <rect x="0" y="7" width="10" height="2" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.5"/>
                    </>}
                    {v === 2 && <>
                      <rect x="0" y="1" width="3" height="8" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.8"/>
                      <rect x="4" y="1" width="6" height="2" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.9"/>
                      <rect x="4" y="4" width="6" height="2" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.7"/>
                      <rect x="4" y="7" width="6" height="2" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.5"/>
                    </>}
                    {v === 3 && <>
                      <rect x="0" y="0" width="4" height="4" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.9"/>
                      <rect x="6" y="0" width="4" height="4" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.7"/>
                      <rect x="0" y="6" width="4" height="4" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.5"/>
                      <rect x="6" y="6" width="4" height="4" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.3"/>
                    </>}
                    {v === 4 && <>
                      <rect x="0" y="0" width="9" height="5" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.9"/>
                      <rect x="0" y="6" width="9" height="3" rx="0.5" fill={(settings.density ?? 1) === v ? "white" : "var(--text-muted)"} opacity="0.5"/>
                    </>}
                  </svg>
                </button>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk toolbar — absolutely overlays the search bar, same height ── */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", gap: 8,
        padding: `0 ${px}px`,
        background: `${companyColor}14`,
        borderBottom: `1px solid ${companyColor}44`,
        opacity: selectedIds.size > 0 ? 1 : 0,
        pointerEvents: selectedIds.size > 0 ? "auto" : "none",
        transition: "opacity 0.18s ease",
      }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: companyColor, flex: 1 }}>
            {selectedIds.size} selected
          </span>
          {/* Add to playlist — leftmost action */}
          {onAddSelectedToPlaylist && playlists.some(p => !p.isAuto) && (
            <BulkPlaylistPicker
              playlists={playlists.filter(p => !p.isAuto)}
              companyColor={companyColor}
              onAdd={(playlistId) => {
                onAddSelectedToPlaylist([...selectedIds], playlistId);
                setSelectedIds(new Set());
              }}
            />
          )}
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 4 }}>SET STATUS:</span>
          {([
            { status: null,          label: "–",   title: "Unplayed",    color: "var(--text-muted)" },
            { status: "in-progress", label: "▶",   title: "In Progress", color: "#60a5fa" },
            { status: "beaten",      label: "✓",   title: "Beaten",      color: "#4ade80" },
            { status: "completed",   label: "★",   title: "Completed",   color: "#a78bfa" },
          ] as { status: import("../types").BacklogStatus | null; label: string; title: string; color: string }[]).map(opt => (
            <button
              key={opt.title}
              onClick={() => bulkSetStatus(opt.status)}
              style={{
                padding: "4px 10px", borderRadius: 5,
                background: "var(--bg-card)",
                border: `1px solid ${opt.color}55`,
                color: opt.color,
                fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
                cursor: "pointer", transition: "all 0.12s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = opt.color + "22")}
              onMouseOut={e => (e.currentTarget.style.background = "var(--bg-card)")}
            >
              {opt.label} {opt.title}
            </button>
          ))}
          <button
            onClick={startBatchHash}
            style={{
              background: "var(--bg-card)", border: `1px solid ${companyColor}66`,
              color: companyColor, fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
              padding: "4px 10px", borderRadius: 4, cursor: "pointer",
            }}
          >
            HASH ROMS
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: "none", border: "1px solid var(--border-lit)",
              color: "var(--text-muted)", fontFamily: "var(--font)", fontSize: 10,
              padding: "4px 8px", borderRadius: 4, cursor: "pointer",
            }}
          >
            CANCEL
          </button>
      </div>
      </div>

      {/* ── Column header ── */}
      {density < 3 && (
        <ColumnHeader sort={sort} onToggle={onSortToggle} mobile={mobile} gap={gap} px={px} showSize={showSizeColumn} />
      )}

      {/* ── ROM rows / cards ── */}
      <div ref={scrollRef} className="rom-scroll-container" style={settings.scanlines && density >= 3 ? {
        backgroundImage: settings.theme === "light"
          ? "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.025) 3px, rgba(0,0,0,0.025) 4px)"
          : "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
      } : undefined}>
        {loading && rows.length === 0 ? (
          <div className="empty-state">
            <span style={{ color: companyColor, fontSize: 11, letterSpacing: "0.1em" }}>LOADING…</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyConsole consoleName={consoleName} onScan={onScan} />
        ) : density >= 3 ? (
          // ── Grid layouts (density 3 & 4) ──
          <div ref={gridRef} style={{
            display: "grid",
            gridTemplateColumns: density === 3
              ? "repeat(auto-fill, minmax(130px, 1fr))"
              : "repeat(auto-fill, minmax(200px, 1fr))",
            gap: density === 3 ? 10 : 14,
            padding: density === 3 ? "12px 16px" : "14px 18px",
          }}>
            {sortedRows.map((rom, i) => density === 3 ? (
              <RomCardSmall
                key={rom.id}
                rom={rom}
                rowIndex={i}
                companyColor={companyColor}
                cardImageMode={cardMode}
                isSelected={selectedIds.has(rom.id)}
                onToggleSelect={toggleSelect}
                onCycleBacklog={onCycleBacklog}
                onSaveNote={onSaveNote}
                onRenameRom={onRenameRom}
                onDelete={onDelete}
                onPlay={onPlay}
                isControllerSelected={controllerCursor === i}
                controllerOpen={controllerCursor === i ? controllerCardOpen : undefined}
                onControllerClose={controllerCursor === i ? onControllerCardClose : undefined}
              />
            ) : (
              <RomCardLarge
                key={rom.id}
                rom={rom}
                rowIndex={i}
                companyColor={companyColor}
                cardImageMode={cardMode}
                isSelected={selectedIds.has(rom.id)}
                onToggleSelect={toggleSelect}
                onCycleBacklog={onCycleBacklog}
                onSaveNote={onSaveNote}
                onRenameRom={onRenameRom}
                onDelete={onDelete}
                onPlay={onPlay}
                isControllerSelected={controllerCursor === i}
                controllerOpen={controllerCursor === i ? controllerCardOpen : undefined}
                onControllerClose={controllerCursor === i ? onControllerCardClose : undefined}
              />
            ))}
          </div>
        ) : (
          // ── List layout (density 1 & 2) ──
          rows.map((rom, i) => (
            <RomRow
              key={rom.id}
              rom={rom}
              rowNumber={page * 150 + i + 1}
              rowIndex={i}
              companyColor={rom.company_color ?? companyColor}
              mobile={mobile}
              density={density}
              isSelected={selectedIds.has(rom.id)}
              showSize={showSizeColumn}
              colorCode={colorCodeRows}
              allTags={allTags}
              onToggleSelect={toggleSelect}
              onCycleBacklog={onCycleBacklog}
              onSaveNote={onSaveNote}
              onRenameRom={onRenameRom}
              onDelete={onDelete}
              onSetTags={onSetTags}
              playlists={playlists}
              onAddToPlaylist={onAddToPlaylist}
              onPlay={onPlay}
              isControllerSelected={controllerCursor === i}
              controllerOpen={
                controllerCursor === i
                  ? controllerCardOpen
                  : undefined
              }
              onControllerClose={controllerCursor === i ? onControllerCardClose : undefined}
            />
          ))
        )}

        {pageCount > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "12px 16px",
            borderTop: "1px solid var(--border)",
          }}>
            <button className="btn" disabled={page === 0} onClick={() => onPageChange(page - 1)}
              style={{ opacity: page === 0 ? 0.3 : 1 }}>← PREV</button>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {page + 1} / {pageCount}
            </span>
            <button className="btn" disabled={page >= pageCount - 1} onClick={() => onPageChange(page + 1)}
              style={{ opacity: page >= pageCount - 1 ? 0.3 : 1 }}>NEXT →</button>
          </div>
        )}
      </div>
    </div>

    {/* ── Batch hash modal ── */}
    {hashBatch && createPortal(
      <div style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
        onClick={e => { if (e.target === e.currentTarget) setHashBatch(null); }}
      >
        <div style={{
          width: "min(700px, 100vw - 32px)", maxHeight: "80vh",
          background: "var(--bg-card)", borderRadius: 12,
          border: `1px solid ${companyColor}44`,
          boxShadow: `0 0 0 1px ${companyColor}22, 0 24px 60px rgba(0,0,0,0.8)`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${companyColor}33`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: "var(--text)", letterSpacing: "0.06em" }}>
              ROM HASHES — {hashBatch.length} FILE{hashBatch.length !== 1 ? "S" : ""}
            </span>
            {hashBatch.every(h => h.status === "done" || h.status === "error") && (
              <button
                onClick={() => {
                  const lines = ["Title\tCRC32\tMD5\tSHA1", ...hashBatch.map(h => `${h.title}\t${h.crc32 ?? ""}\t${h.md5 ?? ""}\t${h.sha1 ?? ""}`)];
                  navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
                }}
                style={{ background: `${companyColor}22`, border: `1px solid ${companyColor}55`, color: companyColor, fontFamily: "var(--font)", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.06em" }}
              >
                COPY ALL AS TSV
              </button>
            )}
            <button onClick={() => setHashBatch(null)} style={{ background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)", fontFamily: "var(--font)", fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>
              CLOSE
            </button>
          </div>

          {/* Progress bar */}
          {hashBatch.some(h => h.status === "pending" || h.status === "hashing") && (() => {
            const done = hashBatch.filter(h => h.status === "done" || h.status === "error").length;
            return (
              <div style={{ padding: "8px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 4, background: "var(--bg-surface)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(done / hashBatch.length) * 100}%`, background: companyColor, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{done} / {hashBatch.length}</span>
              </div>
            );
          })()}

          {/* Results list */}
          <div style={{ overflowY: "auto", flex: 1, padding: "10px 18px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {hashBatch.map(item => (
              <div key={item.id} style={{ background: "var(--bg-surface)", borderRadius: 7, border: `1px solid ${item.status === "error" ? "#f8717144" : item.status === "done" ? `${companyColor}33` : "var(--border-lit)"}`, padding: "9px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: item.status === "done" ? 6 : 0 }}>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{item.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: item.status === "done" ? companyColor : item.status === "error" ? "#f87171" : item.status === "hashing" ? "#fbbf24" : "var(--text-muted)" }}>
                    {item.status === "pending" ? "PENDING" : item.status === "hashing" ? "HASHING…" : item.status === "error" ? "ERROR" : "DONE"}
                  </span>
                </div>
                {item.status === "done" && (
                  <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", rowGap: 3, columnGap: 8 }}>
                    {([["CRC32", item.crc32 ?? ""], ["MD5", item.md5 ?? ""], ["SHA1", item.sha1 ?? ""]] as [string, string][]).map(([label, val]) => (
                      <div key={label} style={{ display: "contents" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center" }}>{label}</span>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text)", userSelect: "text" }}>{val}</span>
                        <Tooltip content="Copy">
                        <button onClick={() => navigator.clipboard.writeText(val).catch(() => {})} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
                {item.status === "error" && (
                  <span style={{ fontSize: 10, color: "#f87171" }}>{item.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

// ── Scan dropdown ─────────────────────────────────────────────────────────────

function ScanDropdown({ companyColor, consoleName, mobile, onScan, onScanAll }: {
  companyColor: string;
  consoleName: string;
  mobile: boolean;
  onScan: () => void;
  onScanAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        className="btn primary"
        onClick={() => setOpen(o => !o)}
        style={{ borderColor: companyColor, color: companyColor, display: "flex", alignItems: "center", gap: 5 }}
      >
        <FolderOpen size={12} />
        {mobile ? "SCAN" : "SCAN"}
        <ChevronDown size={10} style={{
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "none",
        }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-lit)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          zIndex: 200,
          minWidth: 240,
          overflow: "hidden",
        }}>
          {/* Option 1 — this console */}
          <button
            onClick={() => { onScan(); setOpen(false); }}
            style={{
              width: "100%", padding: "12px 16px",
              background: "none", border: "none",
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3,
              cursor: "pointer", textAlign: "left",
              borderBottom: "1px solid var(--border)",
              transition: "background 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseOut={e => (e.currentTarget.style.background = "none")}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 700, color: companyColor, fontFamily: "var(--font)",
              letterSpacing: "0.06em",
            }}>
              <FolderOpen size={13} color={companyColor} />
              SCAN FOR {consoleName.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", paddingLeft: 21 }}>
              Pick a folder — all ROMs added to this console
            </div>
          </button>

          {/* Option 2 — auto-detect */}
          <button
            onClick={() => { onScanAll(); setOpen(false); }}
            style={{
              width: "100%", padding: "12px 16px",
              background: "none", border: "none",
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3,
              cursor: "pointer", textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseOut={e => (e.currentTarget.style.background = "none")}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font)",
              letterSpacing: "0.06em",
            }}>
              <FolderOpen size={13} />
              SCAN ALL CONSOLES
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", paddingLeft: 21 }}>
              Pick your ROMs folder — consoles auto-detected from subfolders
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Column header ─────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown size={10} style={{ opacity: 0.3 }} />;
  return dir === "asc"
    ? <ChevronUp   size={10} style={{ color: "var(--accent)" }} />
    : <ChevronDown size={10} style={{ color: "var(--accent)" }} />;
}

function ColumnHeader({ sort, onToggle, mobile, gap, px, showSize }: {
  sort: { key: SortKey; dir: "asc" | "desc" };
  onToggle: (k: SortKey) => void;
  mobile: boolean;
  gap: number;
  px: number;
  showSize: boolean;
}) {
  const col = (key: keyof typeof COL) => mobile ? COL[key].mobile : COL[key].desktop;

  function SortBtn({ label, sortKey }: { label: string; sortKey: SortKey }) {
    const active = sort.key === sortKey;
    return (
      <button onClick={() => onToggle(sortKey)} style={{
        background: active ? "var(--accent)18" : "none",
        border: `1px solid ${active ? "var(--accent)55" : "transparent"}`,
        borderRadius: 4,
        color: active ? "var(--accent)" : "var(--text-dim)",
        fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.08em", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 3,
        padding: "2px 6px", flexShrink: 0,
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}>
        {label}
        <SortIcon active={active} dir={sort.dir} />
      </button>
    );
  }

  function Lbl({ children, width, align = "center" }: {
    children: React.ReactNode; width: number; align?: "left" | "center" | "right";
  }) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        color: "var(--text-muted)",
        width, minWidth: width, flexShrink: 0, textAlign: align, display: "block",
      }}>
        {children}
      </span>
    );
  }

  if (mobile) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap,
        padding: `5px ${px}px`,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}>
        <Lbl width={col("num")} align="right">#</Lbl>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)" }}>TITLE</span>
        <Lbl width={col("note")}>✎</Lbl>
        <Lbl width={col("backlog")}>▶</Lbl>
        <Lbl width={col("del")}>✕</Lbl>
      </div>
    );
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      {/* Sort pills */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
        padding: `5px ${px}px 4px`,
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", marginRight: 4 }}>SORT</span>
        <SortBtn label="TITLE"   sortKey="title" />
        <SortBtn label="FORMAT"  sortKey="format" />
        {showSize && <SortBtn label="SIZE" sortKey="size" />}
        <SortBtn label="REGION"  sortKey="region" />
        <SortBtn label="BACKLOG" sortKey="backlog" />
        <SortBtn label="ADDED"   sortKey="added" />
        <SortBtn label="PLAYED"  sortKey="played" />
      </div>

      {/* Column labels */}
      <div style={{ display: "flex", alignItems: "center", gap, padding: `3px ${px}px` }}>
        <Lbl width={col("num")} align="right">#</Lbl>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)" }}>TITLE</span>
        <Lbl width={col("format")} align="center">FORMAT</Lbl>
        {showSize && <Lbl width={col("size")} align="right">SIZE</Lbl>}
        <Lbl width={col("note")} align="center">✎</Lbl>
        <Lbl width={col("backlog")} align="center">BACKLOG</Lbl>
        <Lbl width={col("del")} align="center">✕</Lbl>
      </div>
    </div>
  );
}

// ── Bulk playlist picker ──────────────────────────────────────────────────────

function BulkPlaylistPicker({ playlists, companyColor, onAdd }: {
  playlists: import("../types").Playlist[];
  companyColor: string;
  onAdd: (playlistId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "4px 10px", borderRadius: 5,
          background: open ? companyColor + "22" : "var(--bg-card)",
          border: `1px solid ${companyColor}55`,
          color: companyColor, fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
          cursor: "pointer", transition: "all 0.12s",
          display: "flex", alignItems: "center", gap: 5,
        }}
        onMouseOver={e => (e.currentTarget.style.background = companyColor + "22")}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = "var(--bg-card)"; }}
      >
        <ListPlus size={11} /> ADD TO PLAYLIST
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0, zIndex: 200,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 6, padding: 4, minWidth: 180,
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        }}>
          {playlists.filter(p => !p.isAuto).map(p => (
            <button
              key={p.id}
              onClick={() => { onAdd(p.id); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 10px", background: "none", border: "none",
                color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11,
                cursor: "pointer", borderRadius: 4, textAlign: "left",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseOut={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.rom_count ?? 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyConsole({ consoleName, onScan }: { consoleName: string; onScan: () => void }) {
  return (
    <div className="empty-state">
      <FolderOpen size={28} style={{ color: "var(--text-muted)" }} />
      <p>No ROMs found for {consoleName}.<br />Scan a folder to import your library.</p>
      <button className="btn primary" onClick={onScan}>
        <FolderOpen size={12} /> SCAN FOLDER
      </button>
    </div>
  );
}
