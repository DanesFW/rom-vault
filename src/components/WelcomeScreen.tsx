import { useEffect, useState, useMemo } from "react";
import { FolderOpen, Star, BarChart2, Shuffle } from "lucide-react";
import { getRecentlyAdded, getRecentlyPlayed, getConsoleStats } from "../db";
import { BUILT_IN_CONSOLES, BUILT_IN_COMPANIES, formatLabel } from "../types";
import { ArtworkThumb } from "./ArtworkImage";
import type { RomEntry } from "../types";

interface Props {
  totalRoms: number;
  onScanAll: () => void;
  onNavigateToConsole: (companyId: string, consoleId: string) => void;
  onSurprise: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type ConsoleStat = {
  console_id: string;
  rom_count: number;
  beaten_count: number;
  completed_count: number;
  in_progress_count: number;
  total_size: number;
};

export default function WelcomeScreen({ totalRoms, onScanAll, onNavigateToConsole, onSurprise }: Props) {
  const hasRoms = totalRoms > 0;
  const [recent,         setRecent]         = useState<RomEntry[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<(RomEntry & { total_play_seconds: number })[]>([]);
  const [consoleStats,   setConsoleStats]   = useState<ConsoleStat[]>([]);

  useEffect(() => {
    if (!hasRoms) return;
    getRecentlyAdded(20).then(setRecent).catch(() => {});
    getRecentlyPlayed(20).then(setRecentlyPlayed).catch(() => {});
    getConsoleStats().then(setConsoleStats).catch(() => {});
  }, [hasRoms, totalRoms]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const beaten     = consoleStats.reduce((a, s) => a + (s.beaten_count    ?? 0), 0);
    const completed  = consoleStats.reduce((a, s) => a + (s.completed_count ?? 0), 0);
    const inProgress = consoleStats.reduce((a, s) => a + (s.in_progress_count ?? 0), 0);
    const tracked    = beaten + completed + inProgress;
    const unplayed   = consoleStats.reduce((a, s) => a + Math.max(0, s.rom_count - (s.beaten_count ?? 0) - (s.completed_count ?? 0) - (s.in_progress_count ?? 0)), 0);
    const systems    = consoleStats.filter(s => s.rom_count > 0).length;
    const totalSize  = consoleStats.reduce((a, s) => a + (s.total_size ?? 0), 0);

    // Company breakdown
    const companyMap = new Map<string, { name: string; color: string; roms: number; beaten: number; completed: number }>();
    for (const stat of consoleStats) {
      const con = BUILT_IN_CONSOLES.find(c => c.id === stat.console_id);
      if (!con) continue;
      const company = BUILT_IN_COMPANIES.find(c => c.id === con.company_id);
      if (!company) continue;
      const existing = companyMap.get(company.id) ?? { name: company.name, color: company.color, roms: 0, beaten: 0, completed: 0 };
      existing.roms      += stat.rom_count;
      existing.beaten    += stat.beaten_count    ?? 0;
      existing.completed += stat.completed_count ?? 0;
      companyMap.set(company.id, existing);
    }
    const companies = [...companyMap.values()]
      .filter(c => c.roms > 0)
      .sort((a, b) => b.roms - a.roms);

    // Generation breakdown
    const genMap = new Map<number, { roms: number; beaten: number; completed: number }>();
    for (const stat of consoleStats) {
      const con = BUILT_IN_CONSOLES.find(c => c.id === stat.console_id);
      if (!con) continue;
      const gen = con.generation ?? 0;
      const existing = genMap.get(gen) ?? { roms: 0, beaten: 0, completed: 0 };
      existing.roms      += stat.rom_count;
      existing.beaten    += stat.beaten_count    ?? 0;
      existing.completed += stat.completed_count ?? 0;
      genMap.set(gen, existing);
    }
    const generations = [...genMap.entries()]
      .filter(([, v]) => v.roms > 0)
      .sort(([a], [b]) => a - b)
      .map(([gen, v]) => ({ gen, ...v }));

    return { beaten, completed, inProgress, tracked, unplayed, systems, totalSize, companies, generations };
  }, [consoleStats]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!hasRoms) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 32px", gap: 32, textAlign: "center",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 16,
          background: "linear-gradient(135deg, var(--accent)33 0%, var(--accent)11 100%)",
          border: "1px solid var(--accent, #52C060)55",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px var(--accent, #52C060)22",
        }}>
          <span style={{ fontSize: 32 }}>🗄️</span>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "0.1em", color: "var(--text)", fontFamily: "var(--font)" }}>
            ROM <span style={{ color: "var(--accent, #52C060)", textShadow: "0 0 20px var(--accent, #52C060)66" }}>VAULT</span>
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em", fontFamily: "var(--font)" }}>
            PERSONAL ROM BACKUP DATABASE
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 400 }}>
          <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.8 }}>
            Your vault is empty. Scan your ROMs folder to get started — ROM Vault will automatically detect which console each game belongs to.
          </p>
          <button onClick={onScanAll} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 6,
            background: "var(--accent, #52C060)18", border: "1px solid var(--accent, #52C060)66",
            color: "var(--accent, #52C060)", fontFamily: "var(--font)", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s",
          }}>
            <FolderOpen size={14} /> SCAN ROMS FOLDER
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 480 }}>
          {[
            { icon: <FolderOpen size={16} />, label: "Scan Folders", desc: "Auto-detect consoles from folder names" },
            { icon: <Star size={16} />,       label: "Exclusives",   desc: "Track must-play games you still need" },
            { icon: <BarChart2 size={16} />,  label: "Stats",        desc: "See your collection at a glance" },
          ].map(item => (
            <div key={item.label} style={{
              padding: "14px 12px", background: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: 8,
              display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
            }}>
              <span style={{ color: "var(--accent, #52C060)" }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em" }}>{item.label}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const accent = "var(--tab-library)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Hero stat strip ── */}
      <div style={{
        display: "flex", gap: 0, flexShrink: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}>
        {[
          { value: totalRoms.toLocaleString(),                   label: "ROMS",        color: accent },
          { value: derived.systems.toString(),                    label: "SYSTEMS",     color: "#60a5fa" },
          { value: (derived.beaten + derived.completed).toString(), label: "BEATEN",    color: "#4ade80" },
          { value: derived.inProgress.toString(),                 label: "IN PROGRESS", color: "#f59e0b" },
          { value: formatBytes(derived.totalSize),                label: "TOTAL SIZE",  color: "var(--text-muted)" },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{
            flex: 1, padding: "14px 16px",
            borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{
              fontSize: 22, fontWeight: 800, fontFamily: "var(--font)",
              color: stat.color, letterSpacing: "0.02em",
              fontVariantNumeric: "tabular-nums",
            }}>
              {stat.value || "0"}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
              {stat.label}
            </div>
          </div>
        ))}

        {/* Surprise Me */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 16px", borderLeft: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={onSurprise} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 5,
            background: `${accent}18`, border: `1px solid ${accent}55`, color: accent,
            fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}>
            <Shuffle size={12} /> SURPRISE ME
          </button>
        </div>
      </div>

      {/* ── Main content: left + right columns, each split 50/50 vertically ── */}
      <div style={{
        flex: 1, display: "flex", overflow: "hidden", minHeight: 0,
        background: derived.companies.length >= 2
          ? `radial-gradient(ellipse at 85% 10%, ${derived.companies[0].color}18 0%, transparent 50%), radial-gradient(ellipse at 10% 85%, ${derived.companies[1].color}14 0%, transparent 50%), var(--bg-surface)`
          : derived.companies.length === 1
            ? `radial-gradient(ellipse at 70% 15%, ${derived.companies[0].color}18 0%, transparent 55%), var(--bg-surface)`
            : "var(--bg-surface)",
      }}>

        {/* Left — recently added (full height) */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--border)" }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--bg-surface)",
          }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text)" }}>RECENTLY ADDED</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }} className="rom-scroll-container">
            {recent.map((rom, i) => {
              const console_ = BUILT_IN_CONSOLES.find(c => c.id === rom.console_id);
              const company  = console_ ? BUILT_IN_COMPANIES.find(c => c.id === console_.company_id) : null;
              const color    = company?.color ?? "var(--text-dim)";
              return (
                <div
                  key={rom.id}
                  onClick={() => { if (console_ && company) onNavigateToConsole(company.id, console_.id); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 14px",
                    borderBottom: "1px solid var(--border)",
                    cursor: console_ ? "pointer" : "default",
                    transition: "background 0.12s",
                    animation: "rowFadeIn 0.2s ease both",
                    animationDelay: `${i * 15}ms`,
                  }}
                  onMouseOver={e => { if (console_) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <span style={{ fontSize: 10, color: "#888", width: 18, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                  <ArtworkThumb consoleId={rom.console_id} title={rom.title} region={rom.region} filename={rom.filename} companyColor={color} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rom.title}</div>
                    <div style={{ fontSize: 10, color, marginTop: 1, letterSpacing: "0.04em" }}>{company?.name} · {console_?.short_name}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: `${color}18`, color, border: `1px solid ${color}33`, flexShrink: 0 }}>
                    {formatLabel(rom.format, rom.filename)}
                  </span>
                  {rom.file_size > 0 && (
                    <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, width: 52, textAlign: "right" }}>{formatBytes(rom.file_size)}</span>
                  )}
                  <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0, width: 58, textAlign: "right" }}>
                    {new Date(rom.added_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column — recently played (top half) + platform donut (bottom half) */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top half: recently played */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderBottom: "1px solid var(--border)" }}>
            <div style={{
              padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-surface)",
            }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "#f472b6", flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text)" }}>RECENTLY PLAYED</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }} className="rom-scroll-container">
              {recentlyPlayed.length === 0 ? (
                <div style={{ padding: "24px 14px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                  No games played yet
                </div>
              ) : recentlyPlayed.map((rom, i) => {
                const console_ = BUILT_IN_CONSOLES.find(c => c.id === rom.console_id);
                const company  = console_ ? BUILT_IN_COMPANIES.find(c => c.id === console_.company_id) : null;
                const color    = company?.color ?? "var(--text-dim)";
                return (
                  <div
                    key={rom.id}
                    onClick={() => { if (console_ && company) onNavigateToConsole(company.id, console_.id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 14px",
                      borderBottom: "1px solid var(--border)",
                      cursor: console_ ? "pointer" : "default",
                      transition: "background 0.12s",
                    }}
                    onMouseOver={e => { if (console_) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <span style={{ fontSize: 10, color: "#888", width: 18, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <ArtworkThumb consoleId={rom.console_id} title={rom.title} region={rom.region} filename={rom.filename} companyColor={color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rom.title}</div>
                      <div style={{ fontSize: 10, color, marginTop: 1, letterSpacing: "0.04em" }}>{company?.name} · {console_?.short_name}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                      {rom.total_play_seconds > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#f472b6", fontVariantNumeric: "tabular-nums" }}>
                          {formatDuration(rom.total_play_seconds)}
                        </span>
                      )}
                      {rom.last_played_at && (
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                          {new Date(rom.last_played_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom half: platforms donut + legend side by side */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{
              padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-surface)",
            }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "#60b8d8", flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text)" }}>BY PLATFORM</span>
            </div>

            {totalRoms > 0 ? (() => {
              const sorted = [...derived.companies].sort((a, b) => b.roms - a.roms);
              const otherRoms = sorted.slice(5).reduce((a, c) => a + c.roms, 0);
              const segs = [
                ...sorted.slice(0, 5).map(c => ({ label: c.name, count: c.roms, color: c.color })),
                ...(otherRoms > 0 ? [{ label: "Other", count: otherRoms, color: "#4b5563" }] : []),
              ];
              const topPlatform = sorted[0];
              const STROKE = 24;
              const DONUT = 190;
              const R = DONUT / 2 - STROKE / 2 - 1;
              const circ = 2 * Math.PI * R;
              let cum = 0;
              const paths = segs.filter(s => s.count > 0).map(s => {
                const len = (s.count / totalRoms) * circ;
                const offset = circ - cum;
                cum += len;
                return { ...s, len, offset };
              });

              return (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 0, padding: "4px 16px", minHeight: 0 }}>
                  {/* Donut */}
                  <div style={{ position: "relative", width: DONUT, height: DONUT, flexShrink: 0 }}>
                    <svg width={DONUT} height={DONUT} style={{ transform: "rotate(-90deg)" }}>
                      <circle cx={DONUT/2} cy={DONUT/2} r={R} fill="none" stroke="var(--border-lit)" strokeWidth={STROKE} />
                      {paths.map((p, i) => (
                        <circle key={i} cx={DONUT/2} cy={DONUT/2} r={R} fill="none"
                          stroke={p.color} strokeWidth={STROKE}
                          strokeDasharray={`${p.len} ${circ - p.len}`}
                          strokeDashoffset={p.offset}
                          strokeLinecap="butt"
                        />
                      ))}
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
                        {topPlatform ? `${Math.round(topPlatform.roms / totalRoms * 100)}%` : "–"}
                      </span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, textAlign: "center", maxWidth: 60 }}>
                        {topPlatform?.name ?? ""}
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, paddingLeft: 16 }}>
                    {segs.map(row => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{row.count.toLocaleString()}</span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {Math.round(row.count / totalRoms * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : null}
          </div>
        </div>
      </div>
    </div>
  );
}
