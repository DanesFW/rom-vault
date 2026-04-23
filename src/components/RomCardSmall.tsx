import { useState, useRef, useEffect, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, FolderOpen, ImageOff, Pencil, Play, Search, Trash2, X } from "lucide-react";
import ArtworkImage from "./ArtworkImage";
import ArtPickerModal from "./ArtPickerModal";
import { useArtwork } from "../hooks/useArtwork";
import type { RomEntry, BacklogStatus } from "../types";
import { BACKLOG_COLORS, formatLabel, regionPillStyle, SIZE_PILL_STYLE, HASHEOUS_UNSUPPORTED_CONSOLES } from "../types";
import { getPlayStats } from "../db";
import { useAppSettings, isOffline } from "../hooks/useAppSettings";
import { useGamepadAction } from "../hooks/useGamepad";
import Spinner from "./Spinner";
import Tooltip from "./Tooltip";

interface Props {
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;

  cardImageMode?: string;
  rom: RomEntry;
  companyColor: string;
  onCycleBacklog: (rom: RomEntry) => void;
  onSaveNote: (id: number, note: string) => void;
  onRenameRom: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  onPlay?: (rom: RomEntry) => void;
  isControllerSelected?: boolean;
  controllerOpen?: boolean;
  onControllerClose?: () => void;
  rowIndex?: number;
}

const BACKLOG_SHORT: Record<BacklogStatus, string> = {
  "unplayed": "–", "in-progress": "▶", "beaten": "✓", "completed": "★",
};
const BACKLOG_LABELS: Record<BacklogStatus, string> = {
  "unplayed": "UNPLAYED", "in-progress": "IN PROGRESS",
  "beaten": "BEATEN", "completed": "COMPLETED",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** Blurred art fill — sits absolutely over ArtInfoBg to provide the blurred background */
function ArtBlurFill({ consoleId, title, region, filename }: {
  consoleId: string; title: string; region?: string; filename?: string;
}) {
  const { src } = useArtwork(consoleId, title, "Named_Boxarts", true, region, filename);
  if (!src || src === "error") return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "hidden" }}>
      <img src={src} alt="" style={{
        width: "100%", height: "100%", objectFit: "cover",
        filter: "blur(8px) saturate(1.2) brightness(0.45)",
        transform: "scale(1.08)",
      }} />
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "–";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function CopyCell({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!copyable) return;
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ display: "contents" }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.65)", alignSelf: "baseline", paddingTop: 2 }}>{label}</span>
      <span
        style={{ fontSize: mono ? 11 : 12, color: copied ? "#4ade80" : "rgba(255,255,255,0.95)", fontFamily: mono ? "var(--font)" : undefined, wordBreak: "break-all", lineHeight: 1.4, userSelect: "text", cursor: copyable ? "pointer" : "text", transition: "color 0.2s" }}
        onClick={handleClick}
        title={copyable ? (copied ? "Copied!" : "Click to copy") : undefined}
      >{value}</span>
    </div>
  );
}

function RomCardSmallInner({ rom, companyColor, cardImageMode, isSelected, onToggleSelect, onCycleBacklog, onSaveNote, onRenameRom, onDelete, onPlay, isControllerSelected = false, controllerOpen, onControllerClose, rowIndex }: Props) {
  const [showDetail,   setShowDetail]   = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);
  const { src: artSrc } = useArtwork(rom.console_id, rom.title, "Named_Boxarts", showDetail, rom.region, rom.filename);
  const hasArt = !!artSrc && artSrc !== "error";
  const [hovered,      setHovered]      = useState(false);
  const showCheckbox = hovered || isSelected;
  const [noteText,     setNoteText]     = useState(rom.note ?? "");
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText,    setTitleText]    = useState(rom.title);
  const titleRef = useRef<HTMLInputElement>(null);
  const [playStats, setPlayStats] = useState<{ sessions: number; total_seconds: number } | null>(null);
  const { settings } = useAppSettings();
  type Hashes = { crc32: string; md5: string; sha1: string };
  type HasheousResult = { title: string; platform: string; region: string; source: string } | null | "not-found";
  const [hashes,          setHashes]          = useState<Hashes | null>(null);
  const [hashing,         setHashing]         = useState(false);
  const [hasheousResult,  setHasheousResult]  = useState<HasheousResult>(undefined as any);
  const [hasheousLoading, setHasheousLoading] = useState(false);
  const [hasheousRaw,     setHasheousRaw]     = useState<string | null>(null);

  useEffect(() => { setTitleText(rom.title); }, [rom.title]);
  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);

  useEffect(() => {
    if (controllerOpen === true)  setShowDetail(true);
    if (controllerOpen === false) setShowDetail(false);
  }, [controllerOpen]);

  // In-detail controller navigation
  const detailRef  = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(0);

  // Reset focus index when detail opens
  useEffect(() => {
    if (isControllerSelected && showDetail) {
      setFocusIdx(0);
    } else {
      // Clear all focus rings when panel closes or loses controller selection
      detailRef.current?.querySelectorAll<HTMLElement>("[data-ctrl-focused]")
        .forEach(el => el.setAttribute("data-ctrl-focused", "false"));
    }
  }, [isControllerSelected, showDetail]);

  // Mark focused button with data attribute (programmatic .focus() doesn't
  // trigger :focus-visible in WebKit webviews, so we use CSS via attribute)
  useEffect(() => {
    if (!detailRef.current) return;
    const btns = detailRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
    btns.forEach((btn, i) => {
      btn.setAttribute("data-ctrl-focused", (isControllerSelected && showDetail && i === focusIdx) ? "true" : "false");
    });
    if (isControllerSelected && showDetail) btns[focusIdx]?.focus();
  }, [focusIdx, isControllerSelected, showDetail]);

  useGamepadAction(useCallback((action) => {
    if (!isControllerSelected || !showDetail) return;
    const btns = Array.from(
      detailRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []
    );
    if (action === "up" || action === "left") {
      setFocusIdx(prev => Math.max(0, prev - 1));
    } else if (action === "down" || action === "right") {
      setFocusIdx(prev => Math.min(btns.length - 1, prev + 1));
    } else if (action === "confirm") {
      btns[focusIdx]?.click();
    } else if (action === "cancel") {
      setShowDetail(false);
      onControllerClose?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControllerSelected, showDetail, focusIdx]));
  // Sync from DB whenever ROM changes
  useEffect(() => {
    setHashes(rom.crc32 && rom.md5 && rom.sha1 ? { crc32: rom.crc32, md5: rom.md5, sha1: rom.sha1 } : null);
    setHasheousResult(
      rom.hasheous_title
        ? { title: rom.hasheous_title, platform: rom.hasheous_platform ?? "", region: rom.hasheous_region ?? "", source: rom.hasheous_source ?? "" }
        : rom.sha1 && !rom.hasheous_title ? "not-found"  // previously looked up, no match
        : undefined as any
    );
    setHashing(false);
    setHasheousLoading(false);
  }, [rom.id]);
  useEffect(() => {
    if (showDetail) getPlayStats(rom.id).then(setPlayStats).catch(() => {});
  }, [showDetail, rom.id]);
  // Auto-hash on open if setting enabled and not yet hashed
  useEffect(() => {
    if (showDetail && settings.autoHash && !hashes && !hashing) {
      hashRom();
    }
  }, [showDetail]);

  async function hashRom() {
    setHashing(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<Hashes>("hash_rom", { path: rom.filepath });
      setHashes(result);
      const { saveRomHashes } = await import("../db");
      await saveRomHashes(rom.id, result.crc32, result.md5, result.sha1);
      // Auto-lookup after hashing — skip when offline
      if (!isOffline()) lookupHasheous(result.sha1);
    } catch (e) {
      setHashes({ crc32: "error", md5: String(e), sha1: "" });
    } finally {
      setHashing(false);
    }
  }

  async function showRawHasheous(sha1: string) {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<string>("hasheous_raw", { sha1 }).catch(e => String(e));
    setHasheousRaw(raw);
  }

  async function lookupHasheous(sha1: string) {
    if (isOffline()) return;
    setHasheousLoading(true);
    setHasheousRaw(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ title: string; platform: string; region: string; source: string } | null>("hasheous_lookup", { sha1 });
      const { saveHasheousResult } = await import("../db");
      if (result) {
        setHasheousResult(result);
        await saveHasheousResult(rom.id, result.title, result.platform, result.region, result.source);
      } else {
        setHasheousResult("not-found");
        await saveHasheousResult(rom.id, null, null, null, null);
      }
    } catch {
      setHasheousResult("not-found");
    } finally {
      setHasheousLoading(false);
    }
  }

  function copyText(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

  function commitTitle() {
    const t = titleText.trim();
    if (t && t !== rom.title) onRenameRom(rom.id, t);
    else setTitleText(rom.title);
    setEditingTitle(false);
  }

  const status      = rom.backlog_status as BacklogStatus | undefined;
  const statusColor = status ? BACKLOG_COLORS[status] : "var(--border)";

  function handleNoteBlur() {
    if (noteText !== (rom.note ?? "")) onSaveNote(rom.id, noteText);
  }
  function handleDelete() {
    if (confirmDel) { onDelete(rom.id); setShowDetail(false); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2500); }
  }
  function open() { setShowDetail(true); }

  return (
    <>
      {/* ── Card ── */}
      <div
        data-row-idx={rowIndex}
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${isControllerSelected ? companyColor + "cc" : hovered ? companyColor + "66" : companyColor + "22"}`,
          borderRadius: 8, overflow: "hidden", position: "relative",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: isControllerSelected
            ? `0 0 0 2px ${companyColor}66, 0 4px 18px ${companyColor}44`
            : hovered ? `0 4px 14px ${companyColor}28` : "none",
          display: "grid", gridTemplateRows: "1fr auto",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Hover checkbox overlay */}
        {onToggleSelect && showCheckbox && (
          <div
            onClick={e => { e.stopPropagation(); onToggleSelect(rom.id); }}
            style={{
              position: "absolute", top: 8, left: 8, zIndex: 10,
              width: 20, height: 20, borderRadius: 5,
              border: `2px solid ${isSelected ? companyColor : companyColor + "88"}`,
              background: isSelected ? companyColor : "rgba(0,0,0,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.12s",
              backdropFilter: "blur(2px)",
            }}
          >
            {isSelected && <span style={{ color: "white", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
          </div>
        )}

        <div onClick={open} style={{
          cursor: "pointer", minHeight: 0, display: "flex", flexDirection: "column",
          // Option A: fixed image height, image cropped to fit
          height: cardImageMode === "uniform-crop" ? 140 : undefined,
        }}>
          <ArtworkImage
            consoleId={rom.console_id}
            title={rom.title}
            region={rom.region}
            filename={rom.filename}
            companyColor={companyColor}
            width="100%"
            style={cardImageMode === "uniform-crop" ? { height: "100%" } : undefined}
          />
        </div>

        <div style={{ padding: "7px 8px 6px", minHeight: 52, display: "flex", flexDirection: "column" }}>
          <div onClick={open} style={{
            fontSize: 10, fontWeight: 700, color: "var(--text)",
            marginBottom: 4, lineHeight: 1.3, cursor: "pointer",
          }}>
            {rom.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: "auto" }}>
            {/* Format + region — region only shown if space allows (no size text) */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, overflow: "hidden" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, flexShrink: 0,
                background: `${companyColor}18`, color: companyColor,
                border: `1px solid ${companyColor}33`,
              }}>
                {formatLabel(rom.format, rom.filename)}
              </span>
              {rom.region && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, flexShrink: 0, ...regionPillStyle(rom.region) }}>
                  {rom.region}
                </span>
              )}
            </div>
            {/* Buttons — always visible */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              <Tooltip content={status ?? "Track"} color={statusColor}>
              <button onClick={() => onCycleBacklog(rom)} style={{
                width: 18, height: 18, borderRadius: "50%",
                background: status ? statusColor + "33" : "var(--bg-hover)",
                border: `1px solid ${statusColor}`, color: statusColor,
                fontSize: 9, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
              }}>
                {status ? BACKLOG_SHORT[status] : "·"}
              </button>
              </Tooltip>
              <button onClick={open} style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--bg-hover)", border: "1px solid var(--border-lit)",
                color: "var(--text-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <ChevronDown size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-screen modal (portal to body) ── */}
      {showDetail && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowDetail(false); }}
        >
          <div ref={detailRef} style={{
            width: "min(820px, 100vw - 32px)",
            maxHeight: "90vh",
            borderRadius: 14,
            boxShadow: `0 0 0 1px ${companyColor}44, 0 32px 80px rgba(0,0,0,0.9)`,
            display: "flex", flexDirection: "row",
            overflow: "hidden",
            animation: "slide-fade-in 0.18s ease both",
          }}>

            {/* ── LEFT: Box art panel ── */}
            <div style={{
              width: 510, flexShrink: 0,
              background: `linear-gradient(160deg, ${companyColor}22 0%, #0a0a18 100%)`,
              borderRight: `1px solid ${companyColor}33`,
              display: "flex", flexDirection: "column",
              alignItems: "center",
              overflow: "hidden",
            }}>
              {/* Art image */}
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px 12px", minHeight: 0, overflow: "hidden" }}>
                {hasArt ? (
                  <ArtworkImage
                    consoleId={rom.console_id}
                    title={rom.title}
                    region={rom.region}
                    filename={rom.filename}
                    companyColor={companyColor}
                    allowCustom
                    contain
                    style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${companyColor}33` }}
                  />
                ) : (
                  <div style={{
                    width: "100%", aspectRatio: "3/4",
                    background: `${companyColor}0d`,
                    border: `1px dashed ${companyColor}33`,
                    borderRadius: 8,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                  }}>
                    <ImageOff size={32} style={{ color: `${companyColor}88` }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>NO ART</span>
                  </div>
                )}
              </div>

              {/* Art action buttons */}
              <div style={{ width: "100%", padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => setShowPicker(true)} style={{
                  width: "100%", padding: "9px 0", borderRadius: 6,
                  background: `${companyColor}33`, border: `1px solid ${companyColor}99`,
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                }}>
                  <Search size={12} /> {hasArt ? "CHANGE ART" : "FIND ART"}
                </button>
                {hasArt && (
                  <button onClick={async () => {
                    try {
                      const { invoke } = await import("@tauri-apps/api/core");
                      const dir: string = await invoke("get_cover_art_dir");
                      const { artFilename } = await import("../hooks/useArtwork");
                      const sep = dir.includes("\\") ? "\\" : "/";
                      const path = dir + sep + artFilename(rom.console_id, rom.title, "Named_Boxarts");
                      await invoke("reveal_cover_art", { path });
                    } catch {}
                  }} style={{
                    width: "100%", padding: "9px 0", borderRadius: 6,
                    background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.40)",
                    color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                  }}>
                    <FolderOpen size={12} /> REVEAL FILE
                  </button>
                )}
              </div>
            </div>

            {/* ── RIGHT: Info panel ── */}
            <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", background: "#0d0d1e" }}>
              {/* Blurred art bg */}
              {hasArt && <ArtBlurFill consoleId={rom.console_id} title={rom.title} region={rom.region} filename={rom.filename} />}
              {!hasArt && (
                <div style={{ position: "absolute", inset: 0, zIndex: 1, background: `linear-gradient(135deg, ${companyColor}18 0%, #0d0d22 60%)` }} />
              )}
              <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "rgba(0,0,0,0.50)" }} />

              {/* Scrollable content */}
              <div style={{ position: "relative", zIndex: 5, overflowY: "auto", flex: 1, padding: "10px 13px 13px", display: "flex", flexDirection: "column", gap: 7 }}>

                {/* Close row */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
                  <button onClick={() => { setShowDetail(false); onControllerClose?.(); }} style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "rgba(255,255,255,0.8)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Title + play */}
                <div>
                  {editingTitle ? (
                    <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                      <input
                        ref={titleRef}
                        value={titleText}
                        onChange={e => setTitleText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleText(rom.title); setEditingTitle(false); } }}
                        onBlur={commitTitle}
                        style={{
                          flex: 1, background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          borderRadius: 4, color: "#fff",
                          fontFamily: "var(--font)", fontSize: 18, fontWeight: 800,
                          padding: "3px 7px", outline: "none",
                        }}
                      />
                      <button onClick={commitTitle} style={{
                        background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: 4, color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", padding: "3px 7px",
                      }}>
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.25, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
                        {rom.title}
                      </div>
                      <Tooltip content="Rename">
                      <button onClick={() => setEditingTitle(true)} style={{
                        background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                        cursor: "pointer", display: "flex", alignItems: "center", padding: "2px", flexShrink: 0,
                      }}>
                        <Pencil size={11} />
                      </button>
                      </Tooltip>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 4, background: companyColor, color: "#000", letterSpacing: "0.04em" }}>
                      {formatLabel(rom.format, rom.filename)}
                    </span>
                    {rom.region && <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 4, ...regionPillStyle(rom.region) }}>{rom.region}</span>}
                    {rom.file_size > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 4, ...SIZE_PILL_STYLE }}>{formatBytes(rom.file_size)}</span>}
                  </div>
                </div>

                {/* Backlog */}
                <button onClick={() => onCycleBacklog(rom)} style={{
                  width: "100%", padding: "5px", borderRadius: 5,
                  background: status ? BACKLOG_COLORS[status] + "33" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${status ? BACKLOG_COLORS[status] + "88" : "rgba(255,255,255,0.18)"}`,
                  color: status ? BACKLOG_COLORS[status] : "rgba(255,255,255,0.8)",
                  fontFamily: "var(--font)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer",
                }}>
                  {status ? BACKLOG_LABELS[status] : "NOT TRACKED — CLICK TO TRACK"}
                </button>

                {/* Note */}
                <textarea
                  rows={2} value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Personal note…" spellCheck={false}
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff", fontFamily: "var(--font)",
                    fontSize: 13, padding: "6px 8px",
                    borderRadius: 4, resize: "none", outline: "none", boxSizing: "border-box",
                  }}
                />

                {/* File info grid */}
                <div style={{
                  background: "rgba(0,0,0,0.25)", borderRadius: 5,
                  border: "1px solid rgba(255,255,255,0.10)", padding: "6px 8px",
                  display: "grid", gridTemplateColumns: "56px 1fr", rowGap: 3, columnGap: 6,
                }}>
                  {[
                    { l: "FILE",     v: rom.filename,               mono: true,  copy: true  },
                    { l: "PATH",     v: rom.filepath,               mono: true,  copy: true  },
                    { l: "SIZE",     v: formatBytes(rom.file_size),  mono: false, copy: false },
                    ...(rom.region   ? [{ l: "REGION",   v: rom.region,   mono: false, copy: false }] : []),
                    ...(rom.revision ? [{ l: "REVISION", v: rom.revision, mono: false, copy: false }] : []),
                    ...(playStats && playStats.sessions > 0 ? [
                      { l: "SESSIONS", v: String(playStats.sessions),              mono: false, copy: false },
                      { l: "PLAYTIME", v: formatDuration(playStats.total_seconds), mono: false, copy: false },
                    ] : []),
                  ].filter(c => c.v).map((c, i) => (
                    <CopyCell key={i} label={c.l} value={c.v} mono={c.mono} copyable={c.copy} />
                  ))}
                </div>

                {/* Hashes + Hasheous */}
                {hashes ? (
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", padding: "7px 10px", display: "flex", flexDirection: "column", gap: 5 }}>

                    {/* Hasheous verification result */}
                    {hasheousLoading && (
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>Verifying…</div>
                    )}
                    {!hasheousLoading && hasheousResult && hasheousResult !== "not-found" && (
                      <div style={{ background: `${companyColor}18`, border: `1px solid ${companyColor}55`, borderRadius: 4, padding: "6px 8px", marginBottom: 2 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: companyColor, letterSpacing: "0.08em", marginBottom: 3 }}>✓ VERIFIED — {hasheousResult.source}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{hasheousResult.title}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                          {[hasheousResult.platform, hasheousResult.region].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    )}
                    {!hasheousLoading && hasheousResult === "not-found" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>✗ No match found in Hasheous</div>
                        {hashes?.sha1 && (
                          <button onClick={() => showRawHasheous(hashes!.sha1)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font)", fontSize: 9, padding: "3px 6px", borderRadius: 3, cursor: "pointer", alignSelf: "flex-start" }}>
                            SHOW RAW API RESPONSE
                          </button>
                        )}
                        {hasheousRaw && (
                          <pre style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.4)", borderRadius: 3, padding: "6px 8px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", userSelect: "text", margin: 0 }}>
                            {hasheousRaw}
                          </pre>
                        )}
                      </div>
                    )}
                    {!hasheousLoading && !hasheousResult && hashes.sha1 && hashes.sha1 !== "error" && (
                      HASHEOUS_UNSUPPORTED_CONSOLES.has(rom.console_id)
                        ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>Hasheous does not index this system</div>
                        : <button onClick={() => lookupHasheous(hashes!.sha1)} style={{ background: `${companyColor}22`, border: `1px solid ${companyColor}55`, color: "#fff", fontFamily: "var(--font)", fontSize: 10, fontWeight: 700, padding: "5px 8px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.06em" }}>
                            VERIFY ON HASHEOUS
                          </button>
                    )}

                    {/* Raw hashes */}
                    {([["CRC32", hashes.crc32], ["MD5", hashes.md5], ["SHA1", hashes.sha1]] as [string, string][])
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)", width: 36, flexShrink: 0 }}>{label}</span>
                          <span style={{ flex: 1, fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.9)", wordBreak: "break-all", userSelect: "text" }}>{value}</span>
                          <Tooltip content="Copy">
                          <button onClick={() => copyText(value)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                          </Tooltip>
                        </div>
                      ))
                    }
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                      <button onClick={hashRom} disabled={hashing} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: hashing ? "default" : "pointer", fontFamily: "var(--font)", fontSize: 9, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        {hashing ? <><Spinner size={10} color="rgba(255,255,255,0.5)" /> HASHING…</> : "REHASH"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={hashRom} disabled={hashing} style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
                    color: hashing ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)",
                    fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "6px 10px", borderRadius: 5, cursor: hashing ? "default" : "pointer", width: "100%",
                  }}>
                    {hashing ? <><Spinner size={13} color="rgba(255,255,255,0.5)" /> HASHING…</> : "HASH ROM"}
                  </button>
                )}

                {/* Delete */}
                <button onClick={handleDelete} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: confirmDel ? "rgba(248,113,113,0.2)" : "transparent",
                  border: `1px solid ${confirmDel ? "#f87171" : "rgba(255,255,255,0.15)"}`,
                  color: confirmDel ? "#f87171" : "rgba(255,255,255,0.7)",
                  fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
                  padding: "6px 10px", borderRadius: 5, cursor: "pointer",
                }}>
                  <Trash2 size={11} />{confirmDel ? "CONFIRM DELETE" : "REMOVE"}
                </button>

                {/* Play */}
                {onPlay && (
                  <button onClick={() => onPlay(rom)} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 0", borderRadius: 8,
                    background: `${companyColor}cc`, border: `1px solid ${companyColor}`,
                    color: "#fff", fontFamily: "var(--font)",
                    fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", cursor: "pointer",
                    boxShadow: `0 4px 18px ${companyColor}44`,
                  }}>
                    <Play size={15} fill="currentColor" /> PLAY
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showPicker && <ArtPickerModal
        consoleId={rom.console_id}
        title={rom.title}
        artType="Named_Boxarts"
        companyColor={companyColor}
        onPicked={() => { setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
      />}
    </>
  );
}

export const RomCardSmall = memo(RomCardSmallInner);
export default RomCardSmall;
