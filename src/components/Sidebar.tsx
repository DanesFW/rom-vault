import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Plus, Trash2, Check, X, Pencil, ListMusic, Clock } from "lucide-react";
import type { SidebarCompany } from "../hooks/useSidebar";
import type { Company, Playlist } from "../types";
import { AddConsoleModal } from "./CompanyConsoleModals";
import { CONSOLE_LOGOS } from "../data/platformLogos";
import { CONSOLE_LOGOS as CONSOLE_LOGOS_DARK } from "../data/platformLogosDark";
import { useAppSettings } from "../hooks/useAppSettings";
import Tooltip from "./Tooltip";

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 400;

interface Props {
  companies: SidebarCompany[];
  activeConsoleId: string | null;
  activePlaylistId: number | null;
  playlists: Playlist[];
  companyColor: string;
  controllerFocused?: boolean;
  onSelectConsole: (companyId: string, consoleId: string) => void;
  onToggleCompany: (companyId: string) => void;
  onReload: () => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onAddPlaylist: (name: string) => void;
  onRemovePlaylist: (id: number) => void;
  onRenamePlaylist: (id: number, name: string) => void;
}

type SidebarTab = "games" | "playlists";

export default function Sidebar({
  companies, activeConsoleId, activePlaylistId, playlists, companyColor,
  controllerFocused = false,
  onSelectConsole, onToggleCompany, onReload,
  onSelectPlaylist, onAddPlaylist, onRemovePlaylist, onRenamePlaylist,
}: Props) {
  const { settings, updateSettings } = useAppSettings();
  const width = settings.sidebarWidth ?? 250;

  const [tab, setTab]             = useState<SidebarTab>("games");
  const [addConsoleForId, setAddConsoleForId] = useState<string | null>(null);
  const [canScrollMore,   setCanScrollMore]   = useState(false);
  const [hiddenColors,    setHiddenColors]    = useState<string[]>([]);
  const [dragging,        setDragging]        = useState(false);
  const navRef     = useRef<HTMLElement>(null);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = width;
    setDragging(true);
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartW.current + ev.clientX - dragStartX.current));
      updateSettings({ sidebarWidth: next });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, updateSettings]);

  const allCompanies: Company[] = companies.map(c => ({
    id: c.id, name: c.name, color: c.color, order: c.order, custom: c.custom,
  }));

  // When a playlist is selected, switch to playlists tab
  useEffect(() => {
    if (activePlaylistId !== null) setTab("playlists");
  }, [activePlaylistId]);

  // Scroll hint logic for games tab
  const updateScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const scrollBottom = el.scrollTop + el.clientHeight;
    const hasMore = scrollBottom < el.scrollHeight - 4;
    setCanScrollMore(hasMore);
    if (hasMore) {
      const cards = el.querySelectorAll<HTMLElement>("[data-company-id]");
      const colors: string[] = [];
      cards.forEach(card => {
        const cardBottom = card.offsetTop + card.offsetHeight;
        if (cardBottom > scrollBottom) {
          const color = card.getAttribute("data-company-color");
          if (color && !colors.includes(color)) colors.push(color);
        }
      });
      setHiddenColors(colors.slice(0, 4));
    } else {
      setHiddenColors([]);
    }
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    const observer = new ResizeObserver(updateScroll);
    observer.observe(el);
    return () => { el.removeEventListener("scroll", updateScroll); observer.disconnect(); };
  }, [updateScroll, companies]);

  const shadowGradient = (() => {
    if (!canScrollMore || tab !== "games") return null;
    if (hiddenColors.length === 0) return "linear-gradient(to bottom, transparent, var(--bg-surface)88)";
    if (hiddenColors.length === 1) return `linear-gradient(to bottom, transparent, ${hiddenColors[0]}44)`;
    const stops = hiddenColors.map((c, i) => {
      const pct = Math.round((i / (hiddenColors.length - 1)) * 100);
      return `${c}44 ${pct}%`;
    });
    return `linear-gradient(to right, ${stops.join(", ")})`;
  })();

  return (
    <>
      <div style={{ position: "relative", flexShrink: 0, display: "flex", flexDirection: "column", width, borderRight: `1px solid ${controllerFocused ? companyColor + "88" : "var(--border)"}`, transition: "border-color 0.2s", boxShadow: controllerFocused ? `inset -2px 0 8px ${companyColor}18` : "none" }}>
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          style={{
            position: "absolute", top: 0, right: -3, bottom: 0, width: 6,
            cursor: "col-resize", zIndex: 10,
            background: dragging ? `${companyColor}44` : "transparent",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { if (!dragging) e.currentTarget.style.background = `${companyColor}22`; }}
          onMouseLeave={e => { if (!dragging) e.currentTarget.style.background = "transparent"; }}
        />

        {/* ── Tab strip ── */}
        <div style={{
          display: "flex", flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
          position: "relative",
        }}>
          {(["games", "playlists"] as SidebarTab[]).map(t => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "9px 4px 8px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: active ? companyColor : "var(--text-muted)",
                  transition: "color 0.2s",
                  position: "relative",
                }}
              >
                {t === "playlists" && <ListMusic size={9} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />}
                {t}
                {/* Sliding underline */}
                <span style={{
                  position: "absolute", bottom: 0, left: "10%", right: "10%", height: 2,
                  background: companyColor,
                  borderRadius: "1px 1px 0 0",
                  transform: `scaleX(${active ? 1 : 0})`,
                  transformOrigin: "center",
                  transition: "transform 0.22s cubic-bezier(.4,0,.2,1), background 0.2s",
                }} />
              </button>
            );
          })}
        </div>

        {/* ── Games tab ── */}
        {tab === "games" && (
          <>
            <nav ref={navRef} className="sidebar-scroll" style={{
              flex: 1,
              background: "var(--bg-surface)",
              display: "flex", flexDirection: "column",
              overflowY: "auto", overflowX: "hidden",
            }}>
              <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
                {companies.map(company => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    activeConsoleId={activeConsoleId}
                    onSelectConsole={onSelectConsole}
                    onToggle={onToggleCompany}
                    onAddConsole={() => setAddConsoleForId(company.id)}
                  />
                ))}
              </div>
            </nav>
            <div style={{
              padding: "8px",
              borderTop: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0,
            }}>
              <button
                className="btn"
                style={{ width: "100%", justifyContent: "center", fontSize: 11 }}
                onClick={() => setAddConsoleForId("__open__")}
              >
                <Plus size={11} /> ADD CONSOLE
              </button>
            </div>
          </>
        )}

        {/* ── Playlists tab ── */}
        {tab === "playlists" && (
          <PlaylistsPanel
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            companyColor={companyColor}
            onSelect={onSelectPlaylist}
            onAdd={onAddPlaylist}
            onRemove={onRemovePlaylist}
            onRename={onRenamePlaylist}
          />
        )}

        {/* Scroll-hint shadow */}
        {shadowGradient && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
            background: shadowGradient, pointerEvents: "none",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
          }} />
        )}
      </div>

      {addConsoleForId !== null && (
        <AddConsoleModal
          companies={allCompanies}
          defaultCompanyId={addConsoleForId === "__open__" ? undefined : addConsoleForId}
          onClose={() => setAddConsoleForId(null)}
          onAdded={onReload}
        />
      )}
    </>
  );
}

// ── Company card (games tab) ──────────────────────────────────────────────────

function CompanyCard({ company, activeConsoleId, onSelectConsole, onToggle, onAddConsole }: {
  company: SidebarCompany;
  activeConsoleId: string | null;
  onSelectConsole: (companyId: string, consoleId: string) => void;
  onToggle: (id: string) => void;
  onAddConsole: () => void;
}) {
  const { settings } = useAppSettings();
  const logos = settings.theme === "light" ? CONSOLE_LOGOS_DARK : CONSOLE_LOGOS;
  const color     = company.color;
  const totalRoms = company.consoles.reduce((s, c) => s + c.romCount, 0);
  const isOpen    = company.isOpen;
  const hasActive = company.consoles.some(c => c.id === activeConsoleId);

  const [pulseKey, setPulseKey] = useState(0);
  const prevActive = useRef(hasActive);
  if (hasActive && !prevActive.current) setPulseKey(k => k + 1);
  prevActive.current = hasActive;

  return (
    <div
      data-company-id={company.id}
      data-company-color={color}
      style={{
        borderRadius: 8,
        border: `1px solid ${isOpen || hasActive ? color + "77" : "var(--border-lit)"}`,
        background: isOpen || hasActive ? color + "0d" : "var(--bg-card)",
        overflow: "hidden", transition: "all 0.2s",
        boxShadow: isOpen || hasActive ? `0 0 0 1px ${color}33, 0 4px 18px ${color}18` : "none",
        position: "relative",
      }}
    >
      {hasActive && (
        <div key={pulseKey} style={{
          position: "absolute", inset: -1, borderRadius: 8, pointerEvents: "none",
          border: `2px solid ${color}`,
          animation: "toolbarPulse 0.65s ease-out forwards",
          zIndex: 1,
        }} />
      )}

      <div onClick={() => onToggle(company.id)} role="button" style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 10px",
        background: isOpen
          ? `linear-gradient(100deg, ${color}3a 0%, ${color}18 55%, transparent 100%)`
          : `linear-gradient(100deg, ${color}18 0%, ${color}08 60%, transparent 100%)`,
        borderBottom: `1px solid ${isOpen ? color + "55" : color + "22"}`,
        borderLeft: `3px solid ${isOpen || hasActive ? color : "var(--border-lit)"}`,
        cursor: "pointer", userSelect: "none", transition: "all 0.2s",
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color,
          opacity: settings.logosBrightness === "always" ? 1 : (isOpen || hasActive ? 1 : 0.45),
          transition: "opacity 0.2s",
        }} />
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: "0.1em",
          color: isOpen || hasActive ? "var(--text)" : "var(--text-dim)",
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          transition: "color 0.2s",
        }}>
          {company.name.toUpperCase()}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
          background: isOpen ? color + "33" : "var(--bg-hover)",
          color: isOpen ? color : "var(--text-dim)",
          border: `1px solid ${isOpen ? color + "55" : "var(--border)"}`,
          transition: "all 0.2s", flexShrink: 0,
        }}>
          {totalRoms}
        </span>
      </div>

      {isOpen && (
        <div style={{ padding: "4px 6px 6px" }}>
          {company.consoles.filter(con => !settings.hideEmptyConsoles || con.romCount > 0).map((con, rowIdx) => {
            const isActive = con.id === activeConsoleId;
            return (
              <button
                key={con.id}
                onClick={() => onSelectConsole(company.id, con.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  position: "relative", overflow: "hidden",
                  width: "100%", padding: "7px 10px",
                  background: isActive
                    ? `linear-gradient(90deg, ${color}35 0%, ${color}10 70%, transparent 100%)`
                    : "transparent",
                  border: "none", borderLeft: `3px solid ${isActive ? color : "var(--border)"}`,
                  borderRadius: 4, marginBottom: 1, cursor: "pointer",
                  color: isActive ? color : "var(--text-dim)",
                  fontFamily: "var(--font)", fontSize: 13,
                  fontWeight: isActive ? 700 : 400, textAlign: "left",
                  animation: "slideInRow 0.22s ease both",
                  animationDelay: `${rowIdx * 32}ms`,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {isActive && (
                  <span style={{
                    position: "absolute", top: 0, bottom: 0, width: "35%", pointerEvents: "none",
                    background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
                    animation: "consoleSweep 2.4s ease-in-out infinite",
                    animationDelay: "0.8s",
                  }} />
                )}
                {settings.showCompanyLogos && logos[con.id] ? (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <img
                      src={logos[con.id]} alt={con.short_name}
                      style={{
                        height: 26, width: "auto", maxWidth: 100, objectFit: "contain",
                        opacity: settings.logosBrightness === "always" ? 1 : (isActive ? 1 : 0.45),
                        transition: "opacity 0.15s",
                      }}
                    />
                  </div>
                ) : (
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                    {con.name}
                  </span>
                )}
                <span style={{
                  fontSize: 11, flexShrink: 0, marginLeft: 6, fontWeight: 700,
                  padding: "1px 5px", borderRadius: 4,
                  background: isActive ? color + "40" : "var(--bg-hover)",
                  color: isActive ? color : "var(--text-muted)",
                  border: `1px solid ${isActive ? color + "66" : "var(--border)"}`,
                }}>
                  {con.romCount}
                </span>
              </button>
            );
          })}
          <button
            onClick={onAddConsole}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              width: "100%", padding: "5px 10px",
              background: "transparent", border: "none",
              color: "var(--text-muted)", fontFamily: "var(--font)", fontSize: 11,
              cursor: "pointer", borderRadius: 4, marginTop: 2, transition: "color 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.color = color)}
            onMouseOut={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Plus size={10} /> add console
          </button>
        </div>
      )}
    </div>
  );
}

// ── Gradient border helper ────────────────────────────────────────────────────

function GradientBorder({ colors, active, children }: {
  colors: string[];
  active: boolean;
  children: ReactNode;
}) {
  if (colors.length === 0) {
    return (
      <div style={{ border: `1px solid ${active ? "var(--text-muted)" : "var(--border)"}`, borderRadius: 7 }}>
        {children}
      </div>
    );
  }
  if (colors.length === 1) {
    return (
      <div style={{ border: `1px solid ${colors[0]}${active ? "cc" : "66"}`, borderRadius: 7 }}>
        {children}
      </div>
    );
  }
  // Multi-color conic gradient border via wrapper trick
  const stops = colors.map((c, i) => {
    const start = Math.round((i / colors.length) * 360);
    const end   = Math.round(((i + 1) / colors.length) * 360);
    return `${c} ${start}deg ${end}deg`;
  }).join(", ");
  return (
    <div style={{
      background: `conic-gradient(${stops})`,
      padding: 1, borderRadius: 7,
      opacity: active ? 1 : 0.5,
      transition: "opacity 0.2s",
    }}>
      <div style={{ background: "var(--bg-card)", borderRadius: 6 }}>
        {children}
      </div>
    </div>
  );
}

// ── Playlists panel ───────────────────────────────────────────────────────────

function PlaylistsPanel({ playlists, activePlaylistId, companyColor, onSelect, onAdd, onRemove, onRename }: {
  playlists: Playlist[];
  activePlaylistId: number | null;
  companyColor: string;
  onSelect: (p: Playlist) => void;
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
  onRename: (id: number, name: string) => void;
}) {
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editName,   setEditName]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);
  useEffect(() => { if (editingId !== null) editRef.current?.focus(); }, [editingId]);

  function commitNew() {
    const name = newName.trim();
    if (name) onAdd(name);
    setNewName(""); setCreating(false);
  }

  function commitEdit(id: number) {
    const name = editName.trim();
    if (name) onRename(id, name);
    setEditingId(null);
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "var(--bg-surface)",
      overflow: "hidden",
    }}>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }} className="sidebar-scroll">
      <div style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6 }}>

        {playlists.filter(p => !p.isAuto).length === 0 && !creating && (
          <div style={{
            textAlign: "center", padding: "24px 16px 32px",
            color: "var(--text-muted)", fontSize: 11, lineHeight: 1.6,
          }}>
            <ListMusic size={28} style={{ opacity: 0.3, marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
            No playlists yet.<br />
            Create one to start curating your collection.
          </div>
        )}

        {playlists.map(p => {
          const isActive = p.id === activePlaylistId;
          const isEditing = editingId === p.id;

          // ── Auto-playlist (e.g. Recently Played) ──────────────────────────
          if (p.isAuto) {
            return (
              <div key={p.id}>
                <button
                  onClick={() => onSelect(p)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", background: isActive ? companyColor + "14" : "none",
                    border: `1px solid ${isActive ? companyColor + "44" : "var(--border)"}`,
                    borderRadius: 6, fontFamily: "var(--font)", fontSize: 13, cursor: "pointer",
                    color: isActive ? companyColor : "var(--text-dim)", textAlign: "left",
                    fontWeight: isActive ? 700 : 500, transition: "all 0.15s",
                  }}
                >
                  <Clock size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    padding: "1px 5px", borderRadius: 4,
                    background: isActive ? companyColor + "33" : "var(--bg-hover)",
                    color: isActive ? companyColor : "var(--text-muted)",
                    border: `1px solid ${isActive ? companyColor + "55" : "var(--border)"}`,
                    letterSpacing: "0.06em",
                  }}>
                    AUTO
                  </span>
                </button>
                <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
              </div>
            );
          }

          return (
            <GradientBorder key={p.id} colors={p.company_colors ?? []} active={isActive}>
              <div style={{
                display: "flex", alignItems: "center",
                background: isActive ? companyColor + "14" : "transparent",
                borderRadius: 6,
                transition: "background 0.15s",
              }}>
                {isEditing ? (
                  <input
                    ref={editRef}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") commitEdit(p.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => commitEdit(p.id)}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
                      padding: "8px 10px",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => onSelect(p)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px", background: "none", border: "none",
                      fontFamily: "var(--font)", fontSize: 13, cursor: "pointer",
                      color: isActive ? companyColor : "var(--text)", textAlign: "left",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      padding: "1px 5px", borderRadius: 4,
                      background: isActive ? companyColor + "33" : "var(--bg-hover)",
                      color: isActive ? companyColor : "var(--text-dim)",
                      border: `1px solid ${isActive ? companyColor + "55" : "var(--border)"}`,
                    }}>
                      {p.rom_count ?? 0}
                    </span>
                  </button>
                )}

                {/* Edit + Delete icons */}
                {!isEditing && (
                  <div style={{ display: "flex", gap: 0, flexShrink: 0, paddingRight: 4 }}>
                    <Tooltip content="Rename">
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px 5px" }}
                    >
                      <Pencil size={9} />
                    </button>
                    </Tooltip>
                    <Tooltip content="Delete playlist" color="#f87171">
                    <button
                      onClick={() => onRemove(p.id)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px 5px" }}
                    >
                      <Trash2 size={9} />
                    </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </GradientBorder>
          );
        })}

        {/* New playlist inline input */}
        {creating && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            border: `1px solid ${companyColor}55`, borderRadius: 7,
            padding: "4px 8px", background: companyColor + "0a",
          }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") commitNew();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              placeholder="Playlist name…"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
                padding: "4px 0",
              }}
            />
            <button onClick={commitNew} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", padding: 2 }}><Check size={11} /></button>
            <button onClick={() => { setCreating(false); setNewName(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}><X size={11} /></button>
          </div>
        )}
      </div>
      </div>

      {/* Footer — outside scroll area so borderTop always spans full width */}
      <div style={{
        padding: "8px",
        borderTop: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0,
      }}>
        <button
          className="btn"
          style={{ width: "100%", justifyContent: "center", fontSize: 11 }}
          onClick={() => setCreating(true)}
        >
          <Plus size={11} /> NEW PLAYLIST
        </button>
      </div>
    </div>
  );
}
