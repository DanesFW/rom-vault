import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { X, Shuffle, Library, Check } from "lucide-react";
import type { RomEntry, BacklogStatus, Tag } from "../types";
import { BUILT_IN_CONSOLES, BUILT_IN_COMPANIES, BACKLOG_COLORS, formatLabel } from "../types";
import { updateBacklog, getRandomRom } from "../db";
import type { SidebarCompany } from "../hooks/useSidebar";
import { useArtwork } from "../hooks/useArtwork";
import Tooltip from "./Tooltip";

interface Props {
  rom: RomEntry;
  companies: SidebarCompany[];
  allTags: Tag[];
  onClose: () => void;
  onNavigate: (companyId: string, consoleId: string) => void;
}

const BACKLOG_LABELS: Record<BacklogStatus, string> = {
  "unplayed":    "UNPLAYED",
  "in-progress": "IN PROGRESS",
  "beaten":      "BEATEN",
  "completed":   "COMPLETED",
};

const BACKLOG_NEXT: Record<string, BacklogStatus | null> = {
  "unplayed":    "in-progress",
  "in-progress": "beaten",
  "beaten":      "completed",
  "completed":   null,
};

const STATUS_OPTS: { value: BacklogStatus | "any"; label: string; color: string }[] = [
  { value: "any",         label: "Any",         color: "var(--text-dim)" },
  { value: "unplayed",    label: "Unplayed",    color: "#6b7280" },
  { value: "in-progress", label: "In Progress", color: "#f59e0b" },
  { value: "beaten",      label: "Beaten",      color: "#4ade80" },
  { value: "completed",   label: "Completed",   color: "#a78bfa" },
];

function colorIsLight(hex: string): boolean {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function SurpriseModal({ rom: initialRom, companies, allTags, onClose, onNavigate }: Props) {
  const [rom, setRom]         = useState<RomEntry>(initialRom);
  const [status, setStatus]   = useState<BacklogStatus | undefined>(
    initialRom.backlog_status as BacklogStatus | undefined
  );
  const [rolling, setRolling] = useState(false);

  const [filterCompanyId,  setFilterCompanyId]  = useState<string | null>(null);
  const [filterConsoleId,  setFilterConsoleId]  = useState<string | null>(null);
  const [filterStatus,     setFilterStatus]     = useState<BacklogStatus | "any">("any");
  const [filterTagIds,     setFilterTagIds]     = useState<number[]>([]);

  const companyConsoles = filterCompanyId
    ? (companies.find(c => c.id === filterCompanyId)?.consoles ?? []).filter(c => c.romCount > 0)
    : [];

  const console_    = BUILT_IN_CONSOLES.find(c => c.id === rom.console_id);
  const company     = console_ ? BUILT_IN_COMPANIES.find(c => c.id === console_.company_id) : null;
  const color       = company?.color ?? "var(--tab-library)";
  const statusColor = status ? BACKLOG_COLORS[status] : "var(--border-lit)";

  async function handleCycleBacklog() {
    const next = status ? (BACKLOG_NEXT[status] ?? null) : "unplayed";
    await updateBacklog(rom.id, next as BacklogStatus);
    setStatus(next ?? undefined);
  }

  const handleRoll = useCallback(async () => {
    setRolling(true);
    try {
      const next = await getRandomRom({
        companyId:     filterCompanyId  ?? undefined,
        consoleId:     filterConsoleId  ?? undefined,
        backlogStatus: filterStatus,
        tagIds:        filterTagIds.length > 0 ? filterTagIds : undefined,
      });
      if (next) {
        setRom(next);
        setStatus(next.backlog_status as BacklogStatus | undefined);
      }
    } finally {
      setRolling(false);
    }
  }, [filterCompanyId, filterConsoleId, filterStatus, filterTagIds]);

  function handleNavigate() {
    if (company && console_) {
      onNavigate(company.id, console_.id);
      onClose();
    }
  }

  function toggleTag(id: number) {
    setFilterTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  function selectCompany(id: string | null) {
    setFilterCompanyId(id);
    setFilterConsoleId(null);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(680px, 100%)",
        maxHeight: "calc(100vh - 40px)",
        minHeight: 0,
        background: "var(--bg-surface)",
        border: `1px solid ${color}55`,
        borderRadius: 12,
        boxShadow: `0 0 60px ${color}22, 0 24px 48px rgba(0,0,0,0.5)`,
        overflow: "hidden",
        animation: "slideInRow 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        display: "flex",
      }}>

        {/* ── Left: filter panel ── */}
        <div style={{
          width: 190, flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          background: "var(--bg-card)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Radial colour glow — bottom right, like the library view */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            background: `radial-gradient(ellipse 120% 80% at 100% 100%, ${color}30 0%, ${color}10 45%, transparent 70%)`,
            transition: "background 0.4s ease",
          }} />

          {/* Panel header */}
          <div style={{
            padding: "16px 14px 12px",
            borderBottom: `1px solid ${color}22`,
            position: "relative", zIndex: 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shuffle size={13} style={{ color, opacity: 0.8 }} />
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: "0.12em",
                color: "var(--text)",
              }}>
                FILTERS
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.04em" }}>
              Roll with constraints
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px", position: "relative", zIndex: 1 }} className="sidebar-scroll">

            <FilterSection label="PLATFORM">
              <FilterPill label="Any" active={filterCompanyId === null} color="var(--text-dim)" onClick={() => selectCompany(null)} />
              {companies.filter(c => c.consoles.some(con => con.romCount > 0)).map(c => (
                <FilterPill
                  key={c.id} label={c.name}
                  active={filterCompanyId === c.id} color={c.color}
                  onClick={() => selectCompany(filterCompanyId === c.id ? null : c.id)}
                />
              ))}
            </FilterSection>

            {filterCompanyId && companyConsoles.length > 1 && (
              <FilterSection label="CONSOLE">
                <FilterPill label="Any" active={filterConsoleId === null} color="var(--text-dim)" onClick={() => setFilterConsoleId(null)} />
                {companyConsoles.map(c => (
                  <FilterPill
                    key={c.id} label={c.short_name}
                    active={filterConsoleId === c.id}
                    color={companies.find(co => co.id === filterCompanyId)?.color ?? "var(--accent)"}
                    onClick={() => setFilterConsoleId(filterConsoleId === c.id ? null : c.id)}
                  />
                ))}
              </FilterSection>
            )}

            <FilterSection label="STATUS">
              {STATUS_OPTS.map(opt => (
                <FilterPill
                  key={opt.value} label={opt.label}
                  active={filterStatus === opt.value} color={opt.color}
                  onClick={() => setFilterStatus(opt.value)}
                />
              ))}
            </FilterSection>

            {allTags.length > 0 && (
              <FilterSection label="TAGS">
                {allTags.map(tag => (
                  <FilterPill
                    key={tag.id} label={tag.name}
                    active={filterTagIds.includes(tag.id)} color={tag.color}
                    onClick={() => toggleTag(tag.id)}
                  />
                ))}
              </FilterSection>
            )}
          </div>

          {/* Roll button */}
          <div style={{ padding: "10px", borderTop: `1px solid ${color}22`, flexShrink: 0, position: "relative", zIndex: 1 }}>
            <button
              onClick={handleRoll}
              disabled={rolling}
              style={{
                width: "100%", padding: "10px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: color,
                border: `1px solid ${color}`,
                color: colorIsLight(color) ? "#111" : "#fff",
                borderRadius: 7,
                fontFamily: "var(--font)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.08em", cursor: rolling ? "wait" : "pointer",
                transition: "all 0.15s",
                opacity: rolling ? 0.6 : 1,
              }}
            >
              <Shuffle size={13} style={{ animation: rolling ? "spin 0.5s linear infinite" : "none" }} />
              {rolling ? "ROLLING…" : "ROLL"}
            </button>
          </div>
        </div>

        {/* ── Right: game card ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Accent top bar */}
          <div style={{
            height: 3, flexShrink: 0,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }} />

          {/* Header row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px 8px", flexShrink: 0,
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color, flex: 1 }}>
              SURPRISE ME
            </span>
            <button onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 2 }}>
              <X size={14} />
            </button>
          </div>

          {/* Art — fills remaining space, never crops, never overflows */}
          <ArtPanel rom={rom} color={color} />

          {/* Info + buttons — always at the bottom, never scrolls */}
          <div style={{ flexShrink: 0, padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>

            {/* Console tag */}
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              color, paddingTop: 10, marginBottom: 3,
            }}>
              {company?.name.toUpperCase()} · {console_?.name.toUpperCase()}
            </div>

            {/* Title */}
            <div style={{
              fontSize: 16, fontWeight: 800,
              color: "var(--text)", fontFamily: "var(--font)",
              letterSpacing: "0.02em", lineHeight: 1.2,
              marginBottom: 6,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {rom.title}
            </div>

            {/* Pills row */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              {rom.region && (
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{rom.region}</span>
              )}
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                background: `${color}18`, color, border: `1px solid ${color}33`,
              }}>
                {formatLabel(rom.format, rom.filename)}
              </span>
              {rom.file_size > 0 && (
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatBytes(rom.file_size)}</span>
              )}
              {Array.isArray(rom.discs) && rom.discs.length > 0 && (
                <span style={{ fontSize: 9, color: "var(--text-muted)", border: "1px solid var(--border-lit)", padding: "1px 5px", borderRadius: 3 }}>
                  {rom.discs.length + 1} DISCS
                </span>
              )}
            </div>

            {/* File path */}
            {rom.filepath && (
              <Tooltip content={rom.filepath}>
              <div style={{
                fontSize: 9, color: "var(--text-muted)", fontFamily: "monospace",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 4, padding: "4px 8px", marginBottom: 8,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {rom.filepath}
              </div>
              </Tooltip>
            )}

            {/* Backlog + Go to console row */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, padding: "7px 10px",
                background: "var(--bg-card)",
                border: `1px solid ${status ? statusColor + "44" : "var(--border)"}`,
                borderRadius: 7,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 1 }}>
                    BACKLOG
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: status ? statusColor : "var(--text-muted)" }}>
                    {status ? BACKLOG_LABELS[status] : "NOT TRACKED"}
                  </div>
                </div>
                <button
                  onClick={handleCycleBacklog}
                  style={{
                    padding: "4px 9px", borderRadius: 5, flexShrink: 0,
                    background: status ? `${statusColor}22` : "var(--bg-surface)",
                    border: `1px solid ${status ? statusColor + "55" : "var(--border-lit)"}`,
                    color: status ? statusColor : "var(--text)",
                    fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {status === "completed" ? "RESET" : status ? "ADVANCE" : "TRACK"}
                </button>
              </div>

              <button
                onClick={handleNavigate}
                style={{
                  flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 7,
                  background: color,
                  border: `1px solid ${color}`,
                  color: colorIsLight(color) ? "#111" : "#fff",
                  fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <Library size={12} /> GO TO CONSOLE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Art panel — flex:1, image constrained with object-fit ────────────────────
// ArtworkImage uses a paddingBottom % trick that ignores flex height constraints.
// This component loads the src directly and renders a plain img with object-fit: contain.

function ArtPanel({ rom, color }: { rom: RomEntry; color: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: "100px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { src } = useArtwork(rom.console_id, rom.title, "Named_Boxarts", visible, rom.region, rom.filename);

  return (
    <div
      ref={ref}
      style={{
        flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "10px 16px 8px",
        background: color + "06",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={rom.title}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius: 6,
            display: "block",
          }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: color + "44", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          border: `1px solid ${color}18`, borderRadius: 8,
        }}>
          NO ART
        </div>
      )}
    </div>
  );
}

// ── Filter panel components ───────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
        color: "var(--text-dim)", marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function FilterPill({ label, active, color, onClick }: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        width: "100%", padding: "5px 8px",
        background: active ? color + "18" : "none",
        border: `1px solid ${active ? color + "66" : "transparent"}`,
        borderRadius: 5, cursor: "pointer", textAlign: "left",
        fontFamily: "var(--font)", fontSize: 12,
        color: active ? color : "var(--text)",
        fontWeight: active ? 700 : 400,
        transition: "all 0.12s",
      }}
    >
      <div style={{
        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
        background: color,
        opacity: active ? 1 : 0.4,
        transition: "opacity 0.12s",
      }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {label}
      </span>
      {active && <Check size={9} style={{ marginLeft: "auto", flexShrink: 0, color }} />}
    </button>
  );
}
