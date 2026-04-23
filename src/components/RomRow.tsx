import { useState, useRef, useEffect, memo, useCallback } from "react";
import { useAppSettings } from "../hooks/useAppSettings";
import { useGamepadAction } from "../hooks/useGamepad";
import { StickyNote, Trash2, X, Pencil, Check, Tag as TagIcon, ChevronDown, ChevronRight, ListPlus, Play } from "lucide-react";
import type { RomEntry, BacklogStatus, Tag, Playlist } from "../types";
import { BACKLOG_COLORS, FORMAT_QUALITY_RANK, formatLabel, regionPillStyle, DISC_PILL_STYLE, SIZE_PILL_STYLE } from "../types";
import ArtworkImage, { ArtworkThumb } from "./ArtworkImage";
import Tooltip from "./Tooltip";

export interface RomRowProps {
  rom: RomEntry;
  rowNumber: number;
  rowIndex: number;
  companyColor: string;
  mobile: boolean;
  density: number;
  isSelected?: boolean;
  showSize?: boolean;
  colorCode?: boolean;
  allTags?: Tag[];
  playlists?: Playlist[];
  onToggleSelect?: (id: number) => void;
  onCycleBacklog: (rom: RomEntry) => void;
  onSaveNote: (romId: number, note: string) => void;
  onRenameRom: (romId: number, title: string) => void;
  onDelete: (romId: number) => void;
  onSetTags?: (romId: number, tagIds: number[]) => void;
  onAddToPlaylist?: (romId: number, playlistId: number) => void;
  onPlay?: (rom: RomEntry) => void;
  isControllerSelected?: boolean;
  controllerOpen?: boolean;
  onControllerClose?: () => void;
}

const BACKLOG_LABELS: Record<BacklogStatus, string> = {
  "unplayed":    "UNPLAYED",
  "in-progress": "IN PROGRESS",
  "beaten":      "BEATEN",
  "completed":   "COMPLETED",
};

const BACKLOG_SHORT: Record<BacklogStatus, string> = {
  "unplayed":    "–",
  "in-progress": "▶",
  "beaten":      "✓",
  "completed":   "★",
};

// ── Static styles — defined once outside the component ───────────────────────
// Avoids creating new objects on every render pass.

const S = {
  rowNum: {
    fontSize: 11, color: "#888",
    width: 28, minWidth: 28,
    textAlign: "right" as const,
    flexShrink: 0,
    userSelect: "none" as const,
    fontVariantNumeric: "tabular-nums" as const,
    display: "block",
  },
  rowNumMobile: {
    fontSize: 12, color: "#888",
    width: 28, minWidth: 28,
    textAlign: "right" as const,
    flexShrink: 0,
    userSelect: "none" as const,
    fontVariantNumeric: "tabular-nums" as const,
    display: "block",
  },
  titleWrap: {
    flex: 1, minWidth: 0,
    display: "flex", alignItems: "center" as const, gap: 6,
    cursor: "pointer",
  },
  regionSpan: {
    fontSize: 10, color: "var(--text-dim)", flexShrink: 0,
  },
  excBadge: {
    fontSize: 9, fontWeight: 700 as const, flexShrink: 0,
    color: "var(--tab-exclusives)",
    border: "1px solid var(--tab-exclusives)",
    padding: "1px 4px", borderRadius: 3,
  },
  fileSizeSpan: {
    fontSize: 12, color: "#94a3b8",
    width: 70, textAlign: "right" as const,
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums" as const,
    whiteSpace: "nowrap" as const,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

const BACKLOG_ROW_COLORS: Record<string, string> = {
  "completed":   "#a78bfa",
  "beaten":      "#4ade80",
  "in-progress": "#f59e0b",
  "unplayed":    "#6b7280",
};

function RomRowInner({
  rom, rowNumber, rowIndex, companyColor, mobile, density,
  isSelected, showSize = true, colorCode = false, allTags = [], playlists = [], onToggleSelect,
  onCycleBacklog, onSaveNote, onRenameRom, onDelete, onSetTags, onAddToPlaylist, onPlay,
  isControllerSelected = false, controllerOpen, onControllerClose,
}: RomRowProps) {
  const { settings } = useAppSettings();
  const [hovered,         setHovered]         = useState(false);
  const [showNote,        setShowNote]        = useState(false);
  const [noteText,        setNoteText]        = useState(rom.note ?? "");
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [showInfo,        setShowInfo]        = useState(false);
  const [editingTitle,    setEditingTitle]    = useState(false);
  const [titleText,       setTitleText]       = useState(rom.title);
  const [discsOpen,       setDiscsOpen]       = useState(false);
  const [showPlaylists,   setShowPlaylists]   = useState(false);
  const noteRef  = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const plRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { setNoteText(rom.note ?? ""); }, [rom.note]);
  useEffect(() => { setTitleText(rom.title); }, [rom.title]);

  // Controller open/close — only respond when the prop is explicitly boolean
  useEffect(() => {
    if (controllerOpen === true)  setShowInfo(true);
    if (controllerOpen === false) setShowInfo(false);
  }, [controllerOpen]);

  // In-panel controller navigation
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const [focusIdx,    setFocusIdx] = useState(0);

  useEffect(() => {
    if (isControllerSelected && showInfo) {
      setFocusIdx(0);
    } else {
      infoPanelRef.current?.querySelectorAll<HTMLElement>("[data-ctrl-focused]")
        .forEach(el => el.setAttribute("data-ctrl-focused", "false"));
    }
  }, [isControllerSelected, showInfo]);

  useEffect(() => {
    if (!infoPanelRef.current) return;
    const btns = infoPanelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
    btns.forEach((btn, i) => {
      btn.setAttribute("data-ctrl-focused", (isControllerSelected && showInfo && i === focusIdx) ? "true" : "false");
    });
    if (isControllerSelected && showInfo) btns[focusIdx]?.focus();
  }, [focusIdx, isControllerSelected, showInfo]);

  useGamepadAction(useCallback((action) => {
    if (!isControllerSelected || !showInfo) return;
    const btns = Array.from(
      infoPanelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []
    );
    if (action === "up" || action === "left") {
      setFocusIdx(prev => Math.max(0, prev - 1));
    } else if (action === "down" || action === "right") {
      setFocusIdx(prev => Math.min(btns.length - 1, prev + 1));
    } else if (action === "confirm") {
      btns[focusIdx]?.click();
    } else if (action === "cancel") {
      setShowInfo(false);
      onControllerClose?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControllerSelected, showInfo, focusIdx]));

  // Close playlist picker on outside click
  useEffect(() => {
    if (!showPlaylists) return;
    function handler(e: MouseEvent) {
      if (plRef.current && !plRef.current.contains(e.target as Node)) {
        setShowPlaylists(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlaylists]);
  useEffect(() => { if (showNote) noteRef.current?.focus(); }, [showNote]);
  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);

  function commitTitle() {
    const trimmed = titleText.trim();
    if (trimmed && trimmed !== rom.title) onRenameRom(rom.id, trimmed);
    else setTitleText(rom.title);
    setEditingTitle(false);
  }

  const status      = rom.backlog_status as BacklogStatus | undefined;
  const statusColor = status ? BACKLOG_COLORS[status] : "var(--border-lit)";
  const rowStatusColor = colorCode && status ? BACKLOG_ROW_COLORS[status] : null;

  const quality     = FORMAT_QUALITY_RANK[rom.format] ?? 1;
  const formatColor = quality >= 9 ? "#4ade80"
    : quality >= 6 ? "#fbbf24"
    : quality >= 4 ? "#60a5fa"
    : "#94a3b8";

  function handleNoteBlur() {
    if (noteText !== (rom.note ?? "")) onSaveNote(rom.id, noteText);
  }

  function handleDeleteClick() {
    if (!settings.confirmDelete) { onDelete(rom.id); return; }
    if (confirmDelete) { onDelete(rom.id); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); }
  }

  // Set CSS custom property for alternating tint — only when companyColor changes
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rowRef.current && rowIndex % 2 === 0) {
      rowRef.current.style.setProperty("--row-tint", companyColor + "0c");
    }
  }, [companyColor, rowIndex]);

  return (
    <>
      <div
        ref={rowRef}
        data-row-idx={rowIndex}
        className={`rom-row ${rowIndex % 2 === 0 ? "rom-row-even" : "rom-row-odd"}`}
        style={{
          gap: mobile ? 7 : 8, padding: mobile ? "10px 12px" : undefined,
          borderLeft: isControllerSelected
            ? `3px solid ${companyColor}`
            : rowStatusColor ? `3px solid ${rowStatusColor}` : undefined,
          background: isControllerSelected
            ? companyColor + "18"
            : rowStatusColor ? rowStatusColor + "0a" : undefined,
          outline: isControllerSelected ? `1px solid ${companyColor}44` : undefined,
          outlineOffset: "-1px",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Play button — density 1 & 2, left of row number */}
        {!mobile && onPlay && (
          <Tooltip content="Launch in emulator" color={companyColor}>
          <button
            onClick={e => { e.stopPropagation(); onPlay(rom); }}
            style={showInfo ? {
              height: 24, flexShrink: 0,
              background: `${companyColor}22`,
              border: `1px solid ${companyColor}88`,
              borderRadius: 4, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              color: companyColor,
              fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.06em", padding: "0 8px",
              transition: "all 0.12s",
            } : {
              width: 20, height: 20, flexShrink: 0,
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 4, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--border-lit)",
              transition: "all 0.12s",
              opacity: hovered ? 1 : 0,
            }}
            onMouseEnter={e => {
              if (!showInfo) {
                const b = e.currentTarget;
                b.style.background = `${companyColor}22`;
                b.style.borderColor = `${companyColor}88`;
                b.style.color = companyColor;
              }
            }}
            onMouseLeave={e => {
              if (!showInfo) {
                const b = e.currentTarget;
                b.style.background = "transparent";
                b.style.borderColor = "transparent";
                b.style.color = "var(--border-lit)";
              }
            }}
          >
            <Play size={11} />{showInfo && " PLAY"}
          </button>
          </Tooltip>
        )}

        {/* Row number — always occupies same space; checkbox overlays it on hover/select */}
        <div style={{ position: "relative", flexShrink: 0, width: mobile ? 28 : 28, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ ...mobile ? S.rowNumMobile : S.rowNum, opacity: (hovered || isSelected) ? 0 : 1, transition: "opacity 0.12s" }}>
            {String(rowNumber).padStart(2, "0")}
          </span>
          {onToggleSelect && (hovered || isSelected) && (
            <div
              onClick={e => { e.stopPropagation(); onToggleSelect(rom.id); }}
              style={{
                position: "absolute", right: 0,
                width: 16, height: 16, borderRadius: 4, cursor: "pointer",
                border: `2px solid ${isSelected ? companyColor : companyColor + "55"}`,
                background: isSelected ? companyColor : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
              }}
            >
              {isSelected && <span style={{ color: "white", fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
            </div>
          )}
        </div>

        {/* Thumbnail — density 2 only */}
        {density >= 2 && !mobile && (
          <ArtworkThumb
            consoleId={rom.console_id}
            title={rom.title}
            region={rom.region}
            filename={rom.filename}
            size={40}
          />
        )}

        {/* Title */}
        <Tooltip content={rom.filepath} color={companyColor}>
        <div onClick={() => setShowInfo(p => !p)} style={S.titleWrap}>
          <span style={{
            fontSize: 14, fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: showInfo ? companyColor : "var(--text)",
            transition: "color 0.12s",
            flex: 1, minWidth: 0,
          }}>
            {rom.title}
          </span>
          {!!rom.is_exclusive && <span style={S.excBadge}>EXC</span>}
          {Array.isArray(rom.discs) && rom.discs.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setDiscsOpen(p => !p); }}
              style={{
                fontSize: 9, fontWeight: 600, flexShrink: 0,
                padding: "1px 5px", borderRadius: 3, ...DISC_PILL_STYLE,
                cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: 2,
              }}
            >
              {discsOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
              {rom.discs.length + 1} DISCS
            </button>
          )}
          {rom.region && !mobile && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, flexShrink: 0, ...regionPillStyle(rom.region) }}>
              {rom.region}
            </span>
          )}
          {/* Tag pills */}
          {!mobile && rom.tags && rom.tags.map(tag => (
            <span key={tag.id} style={{
              fontSize: 9, fontWeight: 600, flexShrink: 0,
              padding: "1px 6px", borderRadius: 10,
              background: tag.color + "22",
              border: `1px solid ${tag.color}66`,
              color: tag.color,
            }}>
              {tag.name}
            </span>
          ))}
          {/* Console badge for global search results */}
          {rom.console_name && !mobile && (
            <span style={{
              fontSize: 9, fontWeight: 700, flexShrink: 0,
              padding: "1px 6px", borderRadius: 3,
              background: (rom.company_color ?? "#888") + "22",
              border: `1px solid ${(rom.company_color ?? "#888")}55`,
              color: rom.company_color ?? "var(--text-dim)",
              letterSpacing: "0.06em",
            }}>
              {rom.console_name}
            </span>
          )}
        </div>
        </Tooltip>

        {/* Column separator — before stats */}
        {!mobile && <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "4px 0", flexShrink: 0 }} />}

        {/* Format pill — desktop only */}
        {!mobile && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            padding: "3px 8px", borderRadius: 4,
            letterSpacing: "0.06em",
            color: formatColor,
            border: `1px solid ${formatColor}55`,
            background: `${formatColor}15`,
            flexShrink: 0, width: 56, textAlign: "center",
            whiteSpace: "nowrap",
          }}>
            {formatLabel(rom.format, rom.filename)}
          </span>
        )}

        {/* File size — desktop only, when column enabled */}
        {!mobile && showSize && (
          <span style={{ ...SIZE_PILL_STYLE, fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 3, flexShrink: 0, fontVariantNumeric: "tabular-nums" as const }}>{formatBytes(rom.file_size)}</span>
        )}

        {/* Column separator — before action buttons */}
        {!mobile && <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "4px 0", flexShrink: 0 }} />}

        {/* Note button */}
        <Tooltip content={rom.note ? "Edit note" : "Add note"} color={companyColor}>
        <button
          onClick={() => setShowNote(p => !p)}
          style={{
            background: (rom.note || showNote) ? "#fbbf2422" : "var(--bg-card)",
            border: `1px solid ${(rom.note || showNote) ? "#fbbf24" : "var(--border-lit)"}`,
            color: (rom.note || showNote) ? "#fbbf24" : "#64748b",
            borderRadius: 4,
            width: mobile ? 32 : 30, height: mobile ? 32 : 30,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.12s",
          }}
        >
          <StickyNote size={mobile ? 15 : 14} />
        </button>
        </Tooltip>

        {/* Add to playlist button — only shown when user-created playlists exist */}
        {!mobile && onAddToPlaylist && playlists.some(p => !p.isAuto) && (
          <div ref={plRef} style={{ position: "relative", flexShrink: 0 }}>
            <Tooltip content="Add to playlist" color={companyColor}>
            <button
              onClick={() => setShowPlaylists(p => !p)}
              style={{
                background: showPlaylists ? companyColor + "22" : "var(--bg-card)",
                border: `1px solid ${showPlaylists ? companyColor + "88" : "var(--border-lit)"}`,
                color: showPlaylists ? companyColor : "#64748b",
                borderRadius: 4, width: 30, height: 30, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.12s",
              }}
            >
              <ListPlus size={14} />
            </button>
            </Tooltip>
            {showPlaylists && (
              <div style={{
                position: "absolute", bottom: "100%", right: 0, zIndex: 200,
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: 6, padding: 4, minWidth: 160, marginBottom: 4,
                boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", padding: "3px 8px 5px" }}>
                  ADD TO PLAYLIST
                </div>
                {playlists.filter(p => !p.isAuto).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onAddToPlaylist(rom.id, p.id); setShowPlaylists(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "6px 10px", background: "none", border: "none",
                      color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 11,
                      cursor: "pointer", borderRadius: 4, textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseOut={e => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.rom_count ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Column separator — before backlog */}
        {!mobile && <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "4px 0", flexShrink: 0 }} />}

        {/* Backlog button */}
        <Tooltip content={status ? `${BACKLOG_LABELS[status]} — click to advance` : "Click to start tracking"} color={statusColor}>
        <button
          onClick={() => onCycleBacklog(rom)}
          style={{
            background: status ? `${statusColor}18` : "var(--bg-card)",
            border: `1px solid ${statusColor}`,
            color: status ? statusColor : "#64748b",
            fontFamily: "var(--font)",
            fontSize: mobile ? 14 : 10, fontWeight: 700,
            letterSpacing: mobile ? 0 : "0.07em",
            width: mobile ? 32 : undefined,
            minWidth: mobile ? 32 : 100,
            height: mobile ? 32 : 30,
            borderRadius: 4, cursor: "pointer",
            flexShrink: 0, whiteSpace: "nowrap",
            transition: "all 0.12s", textAlign: "center",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {mobile
            ? (status ? BACKLOG_SHORT[status] : "·")
            : (status ? BACKLOG_LABELS[status] : "UNPLAYED")
          }
        </button>
        </Tooltip>

        {/* Column separator — before delete */}
        {!mobile && <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "4px 0", flexShrink: 0 }} />}

        {/* Delete button */}
        <Tooltip content={confirmDelete ? "Click again to confirm" : "Remove from library"} color={confirmDelete ? "#f87171" : companyColor}>
        <button
          onClick={handleDeleteClick}
          style={{
            background: confirmDelete ? "#f8717118" : "var(--bg-card)",
            border: `1px solid ${confirmDelete ? "#f87171" : "var(--border-lit)"}`,
            color: confirmDelete ? "#f87171" : "#64748b",
            borderRadius: 4,
            width: mobile ? 32 : 30, height: mobile ? 32 : 30,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.12s",
          }}
        >
          <Trash2 size={mobile ? 15 : 14} />
        </button>
        </Tooltip>
      </div>

      {/* Multi-disc expand — shows paths for disc 2+ */}
      {discsOpen && Array.isArray(rom.discs) && rom.discs.length > 0 && (
        <div style={{
          padding: mobile ? "6px 12px 8px 48px" : "6px 18px 8px 64px",
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          borderLeft: `3px solid ${companyColor}55`,
          display: "flex", flexDirection: "column", gap: 3,
        }}>
          {[rom.filepath, ...rom.discs].map((path, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: companyColor, minWidth: 44, letterSpacing: "0.06em" }}>
                DISC {i + 1}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {path.split(/[\\/]/).pop()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* File info panel */}
      {showInfo && (
        <div ref={infoPanelRef} style={{
          padding: mobile ? "10px 12px 12px" : "10px 18px 12px",
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          borderLeft: `3px solid ${companyColor}`,
          display: "flex", gap: 16,
        }}>
          {/* Left — artwork */}
          {!mobile && (
            <ArtworkImage
              consoleId={rom.console_id}
              title={rom.title}
              region={rom.region}
              filename={rom.filename}
              companyColor={companyColor}
              allowCustom
              width={120}
              style={{ flexShrink: 0 }}
            />
          )}

          {/* Right — file details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: companyColor }}>FILE INFO</span>
              <button onClick={() => { setShowInfo(false); onControllerClose?.(); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                <X size={13} />
              </button>
            </div>

            {/* Editable title */}
            {editingTitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <input
                  ref={titleRef}
                  value={titleText}
                  onChange={e => setTitleText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleText(rom.title); setEditingTitle(false); } }}
                  onBlur={commitTitle}
                  style={{
                    flex: 1, background: "var(--bg-hover)",
                    border: `1px solid ${companyColor}66`,
                    borderRadius: 4, color: "var(--text)",
                    fontFamily: "var(--font)", fontSize: 13, fontWeight: 600,
                    padding: "3px 7px", outline: "none",
                  }}
                />
                <button onClick={commitTitle} style={{
                  background: `${companyColor}22`, border: `1px solid ${companyColor}55`,
                  borderRadius: 4, color: companyColor, cursor: "pointer",
                  display: "flex", alignItems: "center", padding: "3px 5px",
                }}>
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {rom.title}
                </span>
                <Tooltip content="Rename" color={companyColor}>
                <button onClick={() => setEditingTitle(true)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <Pencil size={11} />
                </button>
                </Tooltip>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", rowGap: 5, columnGap: 10 }}>
              <InfoCell label="ROM ID"  value={String(rom.id)} />
              <InfoCell label="PATH"    value={rom.filepath} mono copyable />
              <InfoCell label="FILE"    value={rom.filename} mono copyable />
              <InfoCell label="SIZE"    value={formatBytes(rom.file_size)} />
              <InfoCell label="FORMAT"  value={formatLabel(rom.format, rom.filename)} />
              {rom.region   && <InfoCell label="REGION"   value={rom.region} />}
              {rom.revision && <InfoCell label="REVISION" value={rom.revision} />}
              {(rom.play_count ?? 0) > 0 && <InfoCell label="SESSIONS" value={String(rom.play_count)} />}
              {(rom.play_count ?? 0) > 0 && <InfoCell label="PLAYTIME" value={formatDuration(rom.total_play_seconds ?? 0)} />}
              {Array.isArray(rom.discs) && rom.discs.map((d, i) => (
                <InfoCell key={i} label={`DISC ${i + 2}`} value={d} mono />
              ))}
            </div>

            {/* Tags section */}
            {onSetTags && allTags.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)" }}>TAGS</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                  {allTags.map(tag => {
                    const active = (rom.tags ?? []).some(t => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const current = (rom.tags ?? []).map(t => t.id);
                          const next = active ? current.filter(id => id !== tag.id) : [...current, tag.id];
                          onSetTags(rom.id, next);
                        }}
                        style={{
                          fontSize: 10, fontWeight: 600, cursor: "pointer",
                          padding: "2px 8px", borderRadius: 10,
                          background: active ? tag.color + "33" : "var(--bg-hover)",
                          border: `1px solid ${active ? tag.color : "var(--border-lit)"}`,
                          color: active ? tag.color : "var(--text-muted)",
                          transition: "all 0.12s", fontFamily: "var(--font)",
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <TagIcon size={8} />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note sub-row */}
      {showNote && (
        <div style={{
          padding: mobile ? "6px 12px 10px" : "6px 18px 10px",
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
        }}>
          <textarea
            ref={noteRef} rows={2}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Personal note…"
            spellCheck={false}
            style={{
              width: "100%", background: "var(--bg-surface)",
              border: `1px solid ${companyColor}44`,
              color: "var(--text)", fontFamily: "var(--font)",
              fontSize: 13, padding: "7px 10px",
              borderRadius: 4, resize: "none", outline: "none",
            }}
          />
        </div>
      )}
    </>
  );
}

// ── Memoized export ───────────────────────────────────────────────────────────
// Only re-renders when rom data changes or interactive handlers change.
// rowIndex and companyColor are stable between scroll events.

export const RomRow = memo(RomRowInner, (prev, next) => {
  const prevTagIds = (prev.rom.tags ?? []).map(t => t.id).join(",");
  const nextTagIds = (next.rom.tags ?? []).map(t => t.id).join(",");
  return (
    prev.rom.id            === next.rom.id            &&
    prev.rom.title         === next.rom.title         &&
    prev.rom.backlog_status=== next.rom.backlog_status&&
    prev.rom.note          === next.rom.note          &&
    prev.rowNumber         === next.rowNumber         &&
    prev.rowIndex          === next.rowIndex          &&
    prev.companyColor      === next.companyColor      &&
    prev.mobile            === next.mobile            &&
    prev.density           === next.density           &&
    prev.onCycleBacklog    === next.onCycleBacklog    &&
    prev.onSaveNote        === next.onSaveNote        &&
    prev.onRenameRom       === next.onRenameRom       &&
    prev.onDelete          === next.onDelete          &&
    prev.isSelected        === next.isSelected        &&
    prevTagIds             === nextTagIds             &&
    prev.allTags           === next.allTags           &&
    prev.playlists         === next.playlists         &&
    prev.onPlay            === next.onPlay
  );
});

export default RomRow;

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoCell({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!copyable) return;
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", alignSelf: "baseline", paddingTop: 1 }}>
        {label}
      </span>
      <span
        style={{ fontSize: mono ? 11 : 12, color: copied ? "#4ade80" : "var(--text-dim)", fontFamily: mono ? "var(--font)" : undefined, wordBreak: "break-all", lineHeight: 1.5, userSelect: "text", cursor: copyable ? "pointer" : "text", transition: "color 0.2s" }}
        onClick={handleClick}
        title={copyable ? (copied ? "Copied!" : "Click to copy") : undefined}
      >
        {value}
      </span>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
