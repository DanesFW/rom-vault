import { useEffect, useState, useMemo, useRef, useLayoutEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useStats } from "../hooks/useStats";
import type { ConsoleStatRow } from "../hooks/useStats";
import ConsoleStatCard from "../components/ConsoleStatCard";
import { CONSOLE_LOGOS } from "../data/platformLogos";
import { CONSOLE_LOGOS as CONSOLE_LOGOS_DARK } from "../data/platformLogosDark";
import { useAppSettings } from "../hooks/useAppSettings";
import { getActivityData, getActivityByConsole } from "../db";

interface Props {
  onNavigateToConsole: (companyId: string, consoleId: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type ActivityDay = { date: string; sessions: number; duration_seconds: number };
type ConsoleActivityEntry = { week: string; console_id: string; sessions: number; duration_seconds: number };

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Get the ISO date of the Monday that starts the week `weeksAgo` weeks before today */
function getMondayKey(weeksAgo: number): string {
  const d = new Date();
  const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dayOfWeek - weeksAgo * 7);
  return d.toISOString().slice(0, 10);
}

/** Aggregate daily activity into weekly buckets, last N weeks ending this week */
function buildWeeklyBars(data: ActivityDay[], weeks = 12): { label: string; sessions: number; duration_seconds: number }[] {
  const map = new Map(data.map(d => [d.date, d]));
  const today = new Date();
  const result = [];
  for (let w = weeks - 1; w >= 0; w--) {
    let sessions = 0, duration_seconds = 0;
    let labelDate: Date | null = null;
    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - w * 7 - d);
      if (!labelDate) labelDate = day;
      const key = day.toISOString().slice(0, 10);
      const entry = map.get(key);
      if (entry) { sessions += entry.sessions; duration_seconds += entry.duration_seconds; }
    }
    const ld = labelDate!;
    result.push({ label: `${MONTH_LABELS[ld.getMonth()]} ${ld.getDate()}`, sessions, duration_seconds });
  }
  return result;
}

/** Build a 12-week grid of per-console session counts */
function buildWeeklyConsoleData(rows: ConsoleActivityEntry[], weeks = 12): {
  weekKey: string; label: string;
  entries: { console_id: string; sessions: number; duration_seconds: number }[];
  total: number;
}[] {
  const byWeek = new Map<string, Map<string, { sessions: number; duration_seconds: number }>>();
  for (const r of rows) {
    if (!byWeek.has(r.week)) byWeek.set(r.week, new Map());
    const wm = byWeek.get(r.week)!;
    const prev = wm.get(r.console_id) ?? { sessions: 0, duration_seconds: 0 };
    wm.set(r.console_id, { sessions: prev.sessions + r.sessions, duration_seconds: prev.duration_seconds + r.duration_seconds });
  }
  return Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    const weekKey = getMondayKey(weeksAgo);
    const monday = new Date(weekKey);
    const label = `${MONTH_LABELS[monday.getMonth()]} ${monday.getDate()}`;
    const consolesMap = byWeek.get(weekKey) ?? new Map<string, { sessions: number; duration_seconds: number }>();
    const entries = Array.from(consolesMap.entries())
      .map(([console_id, v]) => ({ console_id, ...v }))
      .sort((a, b) => b.sessions - a.sessions);
    return { weekKey, label, entries, total: entries.reduce((s, e) => s + e.sessions, 0) };
  });
}

// Fallback colors for demo consoles (by company)
const DEMO_CONSOLE_COLORS: Record<string, string> = {
  nes: "#E60012", snes: "#E60012", gb: "#E60012", gba: "#E60012", n64: "#E60012",
  ps1: "#2f6bcc", ps2: "#2f6bcc", psp: "#2f6bcc",
  genesis: "#2080cc", saturn: "#2080cc",
};

// Fixed fake data: 12 weeks from oldest → newest
// s = total sessions, c = [consoleId, sessions][]
const DEMO_RAW: { s: number; c: [string, number][] }[] = [
  { s: 0,  c: [] },
  { s: 3,  c: [["snes", 2], ["ps1", 1]] },
  { s: 7,  c: [["ps1", 4], ["snes", 2], ["gba", 1]] },
  { s: 2,  c: [["gb", 2]] },
  { s: 11, c: [["n64", 5], ["ps1", 3], ["snes", 2], ["gba", 1]] },
  { s: 5,  c: [["genesis", 3], ["nes", 2]] },
  { s: 18, c: [["ps2", 8], ["n64", 5], ["snes", 3], ["gb", 2]] },
  { s: 8,  c: [["ps2", 5], ["gba", 3]] },
  { s: 14, c: [["ps1", 6], ["n64", 4], ["genesis", 4]] },
  { s: 4,  c: [["gb", 3], ["nes", 1]] },
  { s: 16, c: [["snes", 7], ["ps2", 5], ["n64", 4]] },
  { s: 6,  c: [["ps1", 4], ["gba", 2]] },
];

const CARD_W = 160, CARD_GAP = 8;

// ── Brick layout: per-row segment borders, dynamic row gaps ───────────────────
const BPAD       = 8;               // border distance from card edge (px)
const LINE_H     = 2;               // border stroke / continuation line thickness (px)
const LINE_SEP   = 2;               // gap: border↔line and line↔line (px)
const BCORNER    = 6;               // border-radius (px)
const BORDER_GAP = 10;              // minimum gap between adjacent company borders (px)
const ROW_PAD    = 16;              // extra vertical breathing room between rows (px)
const BRICK_GAP  = 2 * BPAD + BORDER_GAP; // 19px — physical gap between brick-layout cards

type Company = { id: string; name: string; color: string };

interface LayoutResult {
  totalHeight: number;
  gridWidth:   number;
  cardPositions: Array<{ stat: ConsoleStatRow; company: Company; x: number; y: number }>;
  borderRects:   Array<{ company: Company; x: number; y: number; width: number; height: number }>;
  connections:   Array<{ company: Company; path: string }>;
}

/** Build a subway-map style path: descend from (x1,y1), jog horizontally at jogY, ascend to (x2,y2). */
function subwayPath(x1: number, y1: number, x2: number, y2: number, jogY: number): string {
  const BEND = 4;
  if (Math.abs(x1 - x2) < 0.5) {
    // Same column — straight vertical line
    return `M ${x1},${y1} L ${x1},${y2}`;
  }
  const dir = x2 > x1 ? 1 : -1;
  // Clamp bend radius so it never exceeds the available straight segments
  const r = Math.min(BEND, (jogY - y1) / 2, Math.abs(x2 - x1) / 2, (y2 - jogY) / 2);
  return [
    `M ${x1},${y1}`,
    `L ${x1},${jogY - r}`,
    `Q ${x1},${jogY} ${x1 + dir * r},${jogY}`,
    `L ${x2 - dir * r},${jogY}`,
    `Q ${x2},${jogY} ${x2},${jogY + r}`,
    `L ${x2},${y2}`,
  ].join(' ');
}

function computeBrickLayout(
  groups: Array<{ company: Company; consoles: ConsoleStatRow[] }>,
  containerW: number,
  cardH: number,
): LayoutResult {
  const cols = Math.max(1, Math.floor((containerW + BRICK_GAP) / (CARD_W + BRICK_GAP)));

  // Flatten cards with grid positions
  type Cell = { company: Company; stat: ConsoleStatRow; row: number; col: number };
  const cells: Cell[] = [];
  let idx = 0;
  for (const { company, consoles } of groups) {
    for (const stat of consoles) {
      cells.push({ company, stat, row: Math.floor(idx / cols), col: idx % cols });
      idx++;
    }
  }
  const totalRows = cells.length > 0 ? cells[cells.length - 1].row + 1 : 0;

  // Build row segments: consecutive same-company runs within each row
  type Segment = { company: Company; row: number; startCol: number; endCol: number; continues: boolean };
  const segments: Segment[] = [];
  for (let r = 0; r < totalRows; r++) {
    let seg: Segment | null = null;
    for (const cell of cells.filter(c => c.row === r)) {
      if (seg && seg.company.id === cell.company.id) {
        seg.endCol = cell.col;
      } else {
        if (seg) segments.push(seg);
        seg = { company: cell.company, row: r, startCol: cell.col, endCol: cell.col, continues: false };
      }
    }
    if (seg) segments.push(seg);
  }
  // A segment "continues" if the same company has a segment in the next row
  for (const seg of segments) {
    seg.continues = segments.some(s => s.row === seg.row + 1 && s.company.id === seg.company.id);
  }

  // Gap after row r = 2*BPAD (border pads) + BORDER_GAP (between borders) + stacked connection jogs
  const gapOf = (r: number): number => {
    const N = segments.filter(s => s.row === r && s.continues).length;
    const jogsH = N > 0 ? LINE_SEP + N * LINE_H + (N - 1) * LINE_SEP + LINE_SEP : 0;
    return 2 * BPAD + BORDER_GAP + ROW_PAD + jogsH;
  };

  // Row tops (y = top of card content, not border)
  const rowTops: number[] = [];
  let y = BPAD;
  for (let r = 0; r < totalRows; r++) {
    rowTops.push(y);
    if (r < totalRows - 1) y += cardH + gapOf(r);
  }
  const totalHeight = totalRows > 0 ? rowTops[totalRows - 1] + cardH + BPAD : 0;

  // Helper: border width and horizontal center of a segment
  const segW = (s: Segment) =>
    (s.endCol - s.startCol + 1) * (CARD_W + BRICK_GAP) - BRICK_GAP + 2 * BPAD;
  const segCX = (s: Segment) =>
    s.startCol * (CARD_W + BRICK_GAP) - BPAD + segW(s) / 2;

  // Card absolute positions
  const cardPositions = cells.map(cell => ({
    stat: cell.stat, company: cell.company,
    x: cell.col * (CARD_W + BRICK_GAP),
    y: rowTops[cell.row],
  }));

  // Segment border rects (border is BPAD outside card on every side)
  const borderRects = segments.map(seg => ({
    company: seg.company,
    x: seg.startCol * (CARD_W + BRICK_GAP) - BPAD,
    y: rowTops[seg.row] - BPAD,
    width: segW(seg),
    height: cardH + 2 * BPAD,
  }));

  // Subway-style connections: descend from upper border → jog → ascend to lower border
  const connections: LayoutResult["connections"] = [];
  for (let r = 0; r < totalRows - 1; r++) {
    const cont = segments.filter(s => s.row === r && s.continues).sort((a, b) => a.startCol - b.startCol);
    const upperBottom = rowTops[r] + cardH + BPAD;      // bottom edge of upper border
    const lowerTop    = rowTops[r + 1] - BPAD;          // top edge of lower border
    // Centre all jogs in the card-to-card gap
    const N = cont.length;
    const totalJogH = Math.max(N * LINE_H + (N - 1) * LINE_SEP, 0);
    const gapMid = (rowTops[r] + cardH + rowTops[r + 1]) / 2;
    let jogY = gapMid - totalJogH / 2;

    for (const seg of cont) {
      const next = segments.find(s => s.row === r + 1 && s.company.id === seg.company.id);
      if (!next) continue;
      connections.push({
        company: seg.company,
        path: subwayPath(segCX(seg), upperBottom, segCX(next), lowerTop, jogY),
      });
      jogY += LINE_H + LINE_SEP;
    }
  }

  const gridWidth = cols * (CARD_W + BRICK_GAP) - BRICK_GAP;
  return { totalHeight, gridWidth, cardPositions, borderRects, connections };
}

function BrickLayout({
  groups, logos, showLogo, onNavigate,
}: {
  groups: { company: Company; consoles: ConsoleStatRow[] }[];
  logos: Record<string, string | null>;
  showLogo: boolean;
  onNavigate: (companyId: string, consoleId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef   = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutResult | null>(null);

  const allCards = useMemo(
    () => groups.flatMap(({ company, consoles }) => consoles.map(stat => ({ company, stat }))),
    [groups],
  );

  useLayoutEffect(() => {
    const update = () => {
      const ctr = containerRef.current;
      const mel = measureRef.current;
      if (!ctr || !mel) return;
      const w = ctr.clientWidth;
      const h = mel.offsetHeight;
      if (w === 0 || h === 0) return;
      setLayout(computeBrickLayout(groups, w, h));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [groups]);

  const firstCard = allCards[0];

  return (
    <div ref={containerRef} style={{ padding: "12px 16px 20px", position: "relative" }}>
      {/* Hidden reference card for height measurement */}
      {firstCard && (
        <div ref={measureRef} style={{ width: CARD_W, position: "absolute", visibility: "hidden", pointerEvents: "none", zIndex: -1 }}>
          <ConsoleStatCard stat={firstCard.stat} logo={logos[firstCard.stat.consoleId] ?? null}
            showLogo={showLogo} onClick={() => {}} />
        </div>
      )}

      {layout && (
        <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", height: layout.totalHeight, width: layout.gridWidth, flexShrink: 0 }}>
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            overflow: "visible", pointerEvents: "none", zIndex: 1 }}>
            {/* Per-row segment borders */}
            {layout.borderRects.map((b, i) => (
              <rect key={`b${i}`} x={b.x} y={b.y} width={b.width} height={b.height}
                rx={BCORNER} ry={BCORNER}
                fill={`${b.company.color}10`} stroke={b.company.color} strokeWidth={LINE_H} />
            ))}
            {/* Subway-style connections between row segments */}
            {layout.connections.map((c, i) => (
              <path key={`c${i}`} d={c.path}
                fill="none" stroke={c.company.color} strokeWidth={LINE_H}
                strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>

          {layout.cardPositions.map(({ stat, company, x, y }) => (
            <div key={stat.consoleId} style={{ position: "absolute", left: x, top: y, width: CARD_W }}>
              <ConsoleStatCard stat={stat} logo={logos[stat.consoleId] ?? null}
                showLogo={showLogo} onClick={() => onNavigate(company.id, stat.consoleId)} />
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

export default function StatsTab({ onNavigateToConsole }: Props) {
  const { data, loading } = useStats();
  const { settings, updateSettings } = useAppSettings();
  const logos = settings.theme === "light" ? CONSOLE_LOGOS_DARK : CONSOLE_LOGOS;

  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [consoleActivity, setConsoleActivity] = useState<ConsoleActivityEntry[]>([]);
  const [sessionView, setSessionView] = useState<"horizon" | "timeline">("horizon");
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    label: string; sessions: number; duration: number;
    entries?: { console_id: string; sessions: number }[];
    accentColor?: string;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getActivityData().then(setActivity).catch(() => {}); }, []);
  useEffect(() => { getActivityByConsole().then(setConsoleActivity).catch(() => {}); }, []);

  const weeklyBars    = buildWeeklyBars(activity, 12);
  const totalSessions = activity.reduce((a, d) => a + d.sessions, 0);
  const totalPlaySecs = activity.reduce((a, d) => a + d.duration_seconds, 0);


  const weeklyConsoleBars = useMemo(() => buildWeeklyConsoleData(consoleActivity, 12), [consoleActivity]);
  const consoleColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of data.groups) {
      for (const cs of g.consoles) m.set(cs.consoleId, g.company.color);
    }
    return m;
  }, [data.groups]);

  const consoleShortNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of data.groups) {
      for (const cs of g.consoles) m.set(cs.consoleId, cs.shortName);
    }
    return m;
  }, [data.groups]);

  const isDemoMode = totalSessions === 0;

  const demoWeeklyBars = useMemo(() => DEMO_RAW.map((d, i) => {
    const key = getMondayKey(DEMO_RAW.length - 1 - i);
    const monday = new Date(key);
    return { label: `${MONTH_LABELS[monday.getMonth()]} ${monday.getDate()}`, sessions: d.s, duration_seconds: d.s * 1800 };
  }), []);

  const demoWeeklyConsoleBars = useMemo(() => DEMO_RAW.map((d, i) => {
    const weekKey = getMondayKey(DEMO_RAW.length - 1 - i);
    const monday = new Date(weekKey);
    const label = `${MONTH_LABELS[monday.getMonth()]} ${monday.getDate()}`;
    const entries = d.c.map(([console_id, sessions]) => ({ console_id, sessions, duration_seconds: sessions * 1800 }));
    return { weekKey, label, entries, total: d.s };
  }), []);

  const effectiveBars    = isDemoMode ? demoWeeklyBars    : weeklyBars;
  const effectiveConsole = isDemoMode ? demoWeeklyConsoleBars : weeklyConsoleBars;
  const effectiveMax     = Math.max(...effectiveBars.map(w => w.sessions), 1);

  const totalSize = data.groups.reduce((a, g) => a + g.totalSize, 0);
  const totalFinished = data.totalBeaten + data.totalCompleted;
  const finishedPct = data.totalRoms > 0 ? Math.round((totalFinished / data.totalRoms) * 100) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div className="section-header">
        <span className="section-title" style={{ color: "var(--tab-stats)" }}>
          COLLECTION STATS
        </span>
        <div style={{ flex: 1 }} />
        {/* Backlog legend */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {[
            { color: "#a78bfa", label: "COMPLETED" },
            { color: "#4ade80", label: "BEATEN" },
            { color: "#f59e0b", label: "PLAYING" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em" }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>

        {/* Layout toggle */}
        <div style={{ display: "flex", marginLeft: 16, paddingLeft: 16, borderLeft: "1px solid var(--border)" }}>
          {(["grouped", "grid"] as const).map(v => {
            const active = (settings.statCardLayout ?? "grouped") === v;
            return (
              <button
                key={v}
                onClick={() => updateSettings({ statCardLayout: v })}
                style={{
                  padding: "6px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: active ? "var(--tab-stats)" : "var(--text-muted)",
                  transition: "color 0.2s",
                  position: "relative",
                }}
              >
                {v === "grouped" ? "GROUPED" : "GRID"}
                <span style={{
                  position: "absolute", bottom: 0, left: "10%", right: "10%", height: 2,
                  background: "var(--tab-stats)",
                  borderRadius: "1px 1px 0 0",
                  transform: `scaleX(${active ? 1 : 0})`,
                  transformOrigin: "center",
                  transition: "transform 0.22s cubic-bezier(.4,0,.2,1)",
                }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="app-content">

        {/* Overview: stat cards + activity heatmap */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--border)",
          gap: 1,
        }}>
          {/* ── Stat cards: 3 + 2 grid ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 1,
            flexShrink: 0,
          }}>
            {[
              { label: "TOTAL ROMS",  value: data.totalRoms.toLocaleString(),      color: "#52C060" },
              { label: "PLATFORMS",   value: String(data.totalSystems),             color: "#60b8d8" },
              { label: "STORAGE",     value: formatBytes(totalSize),                color: "#52C060" },
              { label: "FINISHED",    value: totalFinished.toLocaleString(),         color: "#9999dd" },
              { label: "IN PROGRESS", value: data.totalInProgress.toLocaleString(), color: "#e4a030" },
              { label: "PLAY TIME",   value: totalPlaySecs > 0 ? formatDuration(totalPlaySecs) : "–", color: "#f472b6" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--bg-surface)",
                backgroundImage: `linear-gradient(135deg, ${s.color}18 0%, transparent 60%)`,
                borderBottom: `2px solid ${s.color}33`,
                padding: "12px 16px",
                display: "flex", flexDirection: "column", gap: 4,
                position: "relative", overflow: "hidden",
                minWidth: 110,
              }}>
                <div style={{
                  position: "absolute", top: -10, right: -10,
                  width: 50, height: 50, borderRadius: "50%",
                  background: s.color, opacity: 0.08, pointerEvents: "none",
                }} />
                <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.12em", fontWeight: 700 }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: "-0.02em", textShadow: `0 0 20px ${s.color}55` }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Activity chart (horizon / timeline) ── */}
          <div style={{
            flex: 1, background: "var(--bg-surface)",
            padding: "12px 20px 10px",
            display: "flex", flexDirection: "column", gap: 8, overflow: "hidden",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-dim)" }}>
                SESSIONS — LAST 12 WEEKS
              </span>
              {isDemoMode ? (
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "#e4a030", opacity: 0.9, border: "1px solid #e4a03066", borderRadius: 3, padding: "1px 5px" }}>
                  DEMO
                </span>
              ) : totalSessions > 0 && (
                <span style={{ fontSize: 9, fontWeight: 500, color: "var(--text-dim)", opacity: 0.8 }}>
                  {totalSessions} total · {formatDuration(totalPlaySecs)} played
                </span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {(["horizon", "timeline"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setSessionView(v)}
                    style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                      padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                      border: `1px solid ${sessionView === v ? "#52C06077" : "var(--border-lit)"}`,
                      background: sessionView === v ? "#52C06018" : "transparent",
                      color: sessionView === v ? "#52C060" : "var(--text-muted)",
                      transition: "all 0.15s",
                    }}
                  >
                    {v === "horizon" ? "HORIZON" : "BY PLATFORM"}
                  </button>
                ))}
              </div>
            </div>

            {sessionView === "horizon" ? (
              /* ── Horizon chart ── */
              (() => {
                const bandSize = effectiveMax / 3;
                const BAND_COLORS = ["#38bdf8", "#a78bfa", "#f472b6"];
                const BAND_GLOWS  = ["#38bdf840", "#a78bfa50", "#f472b660"];
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 4 }}>
                    {/* Chart area */}
                    <div style={{ flex: 1, position: "relative", minHeight: 0 }}>

                      {/* Atmospheric background — multi-band gradient */}
                      <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: "radial-gradient(ellipse 80% 55% at 30% 100%, #38bdf80a, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 100%, #f472b608, transparent 60%)",
                      }} />

                      {/* Threshold lines — tinted to matching band color */}
                      {[
                        { pct: 33, color: BAND_COLORS[1], label: "×2" },
                        { pct: 66, color: BAND_COLORS[2], label: "×3" },
                      ].map(({ pct, color, label }) => (
                        <div key={pct} style={{
                          position: "absolute", left: 0, right: 0, bottom: `${pct}%`,
                          borderTop: `1px dashed ${color}28`,
                          pointerEvents: "none", zIndex: 2,
                        }}>
                          <span style={{
                            position: "absolute", right: 3, top: -9,
                            fontSize: 7, color: color + "70", fontWeight: 700, letterSpacing: "0.06em",
                          }}>{label}</span>
                        </div>
                      ))}

                      {/* Rainbow baseline */}
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 1, zIndex: 10,
                        background: `linear-gradient(90deg, transparent, ${BAND_COLORS[0]}55 20%, ${BAND_COLORS[1]}55 50%, ${BAND_COLORS[2]}55 80%, transparent)`,
                      }} />

                      {/* Bars */}
                      <div style={{ position: "absolute", inset: "0 0 1px 0", display: "flex", alignItems: "flex-end", gap: 3 }}>
                        {effectiveBars.map((week, i) => {
                          const isCurrentWeek = i === effectiveBars.length - 1;
                          const fillPct = effectiveMax > 0 ? week.sessions / effectiveMax : 0;
                          const topBand = week.sessions > bandSize * 2 ? 2 : week.sessions > bandSize ? 1 : 0;
                          return (
                            <div
                              key={i}
                              onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, label: week.label, sessions: week.sessions, duration: week.duration_seconds, accentColor: week.sessions > 0 ? BAND_COLORS[topBand] : undefined })}
                              onMouseLeave={() => setTooltip(null)}
                              style={{ flex: 1, height: "100%", position: "relative", cursor: "default" }}
                            >
                              {/* Slot tint — faint gradient to give empty bars some presence */}
                              <div style={{
                                position: "absolute", inset: 0,
                                background: `linear-gradient(to top, ${BAND_COLORS[0]}09, transparent 65%)`,
                                borderRadius: "3px 3px 0 0",
                              }} />

                              {/* 3 horizon bands (each folds on top of previous, higher z-index = lower on screen) */}
                              <div style={{ position: "absolute", inset: 0, borderRadius: "3px 3px 0 0", overflow: "hidden" }}>
                                {BAND_COLORS.map((bc, bi) => {
                                  const lo = bi * bandSize;
                                  const fill = Math.max(0, Math.min(week.sessions - lo, bandSize));
                                  const pct = bandSize > 0 ? (fill / bandSize) * 100 : 0;
                                  if (pct === 0) return null;
                                  return (
                                    <div key={bi} style={{
                                      position: "absolute", bottom: 0, left: 0, right: 0,
                                      height: `${pct}%`,
                                      background: bc,
                                      opacity: isCurrentWeek ? 0.95 : 0.48,
                                      zIndex: bi + 1,
                                      transition: "height 0.5s ease",
                                    }} />
                                  );
                                })}
                                {/* Top highlight streak */}
                                {week.sessions > 0 && (
                                  <div style={{
                                    position: "absolute", left: 0, right: 0,
                                    bottom: `${Math.min(fillPct * 100, 98)}%`,
                                    height: isCurrentWeek ? 2 : 1, zIndex: 10,
                                    background: isCurrentWeek ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                                    boxShadow: isCurrentWeek ? "0 0 5px rgba(255,255,255,0.7)" : "none",
                                  }} />
                                )}
                              </div>

                              {/* Base bloom glow */}
                              {week.sessions > 0 && (
                                <div style={{
                                  position: "absolute", bottom: 0, left: "-40%", right: "-40%",
                                  height: "40%", pointerEvents: "none", zIndex: 0,
                                  background: `radial-gradient(ellipse at center bottom, ${BAND_GLOWS[topBand]}, transparent 70%)`,
                                  opacity: isCurrentWeek ? 1 : 0.45,
                                }} />
                              )}

                              {/* Current week: animated pulse cap */}
                              {isCurrentWeek && week.sessions > 0 && (
                                <div style={{
                                  position: "absolute", left: "-60%", right: "-60%",
                                  bottom: `${Math.max(0, Math.min(fillPct * 100 - 3, 96))}%`,
                                  height: 14, pointerEvents: "none", zIndex: 5,
                                  background: `radial-gradient(ellipse at center, ${BAND_COLORS[topBand]}55, transparent 70%)`,
                                  animation: "toolbarPulse 2.4s ease-in-out infinite",
                                }} />
                              )}

                              {/* Current week dot */}
                              {isCurrentWeek && (
                                <div style={{
                                  position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)",
                                  width: 4, height: 4, borderRadius: "50%", zIndex: 20,
                                  background: week.sessions > 0 ? BAND_COLORS[topBand] : "var(--border-lit)",
                                  boxShadow: week.sessions > 0 ? `0 0 7px ${BAND_COLORS[topBand]}` : "none",
                                }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X-axis: show month on first week of each month, day number otherwise */}
                    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                      {effectiveBars.map((week, i) => {
                        const parts = week.label.split(" ");
                        const prevParts = i > 0 ? effectiveBars[i - 1].label.split(" ") : ["", ""];
                        const monthChanged = i === 0 || parts[0] !== prevParts[0];
                        const isCurrentWeek = i === effectiveBars.length - 1;
                        return (
                          <div key={i} style={{
                            flex: 1, textAlign: "center",
                            fontSize: 7,
                            fontWeight: monthChanged ? 700 : 500,
                            color: isCurrentWeek ? BAND_COLORS[1] : monthChanged ? "var(--text-dim)" : "var(--text-muted)",
                            letterSpacing: monthChanged ? "0.06em" : 0,
                            lineHeight: 1, overflow: "hidden", whiteSpace: "nowrap",
                          }}>
                            {monthChanged ? parts[0].toUpperCase() : parts[1]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* ── By-platform timeline ── */
              (() => {
                const maxTotal = Math.max(...effectiveConsole.map(w => w.total), 1);
                return (
                  <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
                    {/* Atmospheric background */}
                    <div style={{
                      position: "absolute", inset: 0, pointerEvents: "none",
                      background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(96,165,250,0.06), transparent)",
                    }} />

                    {/* Bars */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 3 }}>
                      {effectiveConsole.map((week, i) => {
                        const isCurrentWeek = i === effectiveConsole.length - 1;
                        const heightPct = week.total === 0 ? 0 : Math.max(5, (week.total / maxTotal) * 100);
                        const dominantColor = week.entries.length > 0
                          ? (consoleColorMap.get(week.entries[0].console_id) ?? DEMO_CONSOLE_COLORS[week.entries[0].console_id] ?? "#52C060")
                          : "#52C060";
                        return (
                          <div
                            key={i}
                            onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, label: week.label, sessions: week.total, duration: week.entries.reduce((s, e) => s + e.duration_seconds, 0), entries: week.entries })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ flex: 1, height: "100%", position: "relative", cursor: "default" }}
                          >
                            {/* Bar slot background */}
                            <div style={{
                              position: "absolute", inset: 0,
                              borderRadius: "3px 3px 0 0",
                              background: "rgba(255,255,255,0.02)",
                            }} />

                            {/* Stacked segments */}
                            {week.total > 0 && (
                              <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                height: `${heightPct}%`,
                                borderRadius: "3px 3px 0 0", overflow: "hidden",
                                display: "flex", flexDirection: "column-reverse",
                                opacity: isCurrentWeek ? 1 : 0.55,
                                transition: "height 0.5s ease",
                              }}>
                                {week.entries.map((e, ei) => {
                                  const segPct = (e.sessions / week.total) * 100;
                                  const color = consoleColorMap.get(e.console_id) ?? DEMO_CONSOLE_COLORS[e.console_id] ?? "#52C060";
                                  return (
                                    <div key={ei} style={{
                                      width: "100%", height: `${segPct}%`, flexShrink: 0,
                                      background: color,
                                    }} />
                                  );
                                })}
                                {/* Top shine */}
                                <div style={{
                                  position: "absolute", top: 0, left: 0, right: 0,
                                  height: 2,
                                  background: isCurrentWeek
                                    ? "rgba(255,255,255,0.65)"
                                    : "rgba(255,255,255,0.2)",
                                  boxShadow: isCurrentWeek ? `0 0 6px #fff8` : "none",
                                }} />
                              </div>
                            )}

                            {/* Base bloom */}
                            {week.total > 0 && (
                              <div style={{
                                position: "absolute", bottom: 0, left: "-40%", right: "-40%",
                                height: "30%", pointerEvents: "none",
                                background: `radial-gradient(ellipse at center bottom, ${dominantColor}44, transparent 70%)`,
                                opacity: isCurrentWeek ? 0.9 : 0.35,
                              }} />
                            )}

                            {/* Current week top pulse */}
                            {isCurrentWeek && week.total > 0 && (
                              <div style={{
                                position: "absolute", left: "-50%", right: "-50%",
                                bottom: `${Math.min((week.total / maxTotal) * 100, 96)}%`,
                                height: 10, pointerEvents: "none",
                                background: `radial-gradient(ellipse at center, ${dominantColor}55, transparent 70%)`,
                                animation: "toolbarPulse 2.4s ease-in-out infinite",
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Backlog breakdown bar */}
        {data.totalRoms > 0 && (
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 9, color: "var(--text-dim)",
                letterSpacing: "0.1em", fontWeight: 700,
              }}>
                BACKLOG OVERVIEW
              </span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: finishedPct >= 50 ? "#4ade80" : finishedPct > 0 ? "#f59e0b" : "var(--text-dim)",
              }}>
                {finishedPct}% finished
              </span>
            </div>

            {/* Stacked bar */}
            <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", background: "var(--border)" }}>
              {[
                { count: data.totalCompleted,   color: "#a78bfa" },
                { count: data.totalBeaten,      color: "#4ade80" },
                { count: data.totalInProgress,  color: "#f59e0b" },
                { count: data.totalUnplayed,    color: "var(--bg-hover)" },
              ].map((seg, i) => seg.count > 0 ? (
                <div key={i} style={{
                  width: `${(seg.count / data.totalRoms) * 100}%`,
                  background: seg.color,
                  transition: "width 0.6s ease",
                }} />
              ) : null)}
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[
                { count: data.totalCompleted,   color: "#a78bfa", label: "completed" },
                { count: data.totalBeaten,      color: "#4ade80", label: "beaten" },
                { count: data.totalInProgress,  color: "#f59e0b", label: "in progress" },
                { count: data.totalUnplayed,    color: "var(--text-dim)", label: "unplayed" },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 10 }}>
                  <strong style={{ color: s.color }}>{s.count.toLocaleString()}</strong>
                  <span style={{ color: "var(--text-dim)", marginLeft: 4 }}>{s.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="empty-state">
            <span style={{ color: "var(--tab-stats)", fontSize: 10, letterSpacing: "0.1em" }}>LOADING…</span>
          </div>
        )}

        {/* Per-company panels */}
        {(() => {
          const visibleGroups = data.groups.filter(g => !(settings.hiddenStatCompanies ?? []).includes(g.company.id));
          const layout = settings.statCardLayout ?? "grouped";

          if (layout === "grid") {
            /* ── Dense Grid: single auto-fill grid with full-width company dividers ── */
            return (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`,
                justifyContent: "center",
                gap: CARD_GAP,
                padding: "12px 16px 20px",
                alignItems: "start",
              }}>
                {visibleGroups.map(({ company, consoles, totalRoms }) => (
                  <Fragment key={company.id}>
                    {/* Company divider row */}
                    <div style={{
                      gridColumn: "1 / -1",
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 2px 2px",
                    }}>
                      <div style={{ width: 3, height: 10, borderRadius: 2, background: company.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: company.color }}>
                        {company.name.toUpperCase()}
                      </span>
                      <div style={{ flex: 1, height: 1, background: `${company.color}20` }} />
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                        {totalRoms.toLocaleString()} ROMs
                      </span>
                    </div>
                    {/* Console cards */}
                    {consoles.map(stat => (
                      <ConsoleStatCard
                        key={stat.consoleId}
                        stat={stat}
                        logo={logos[stat.consoleId] ?? null}
                        showLogo={settings.showCompanyLogos ?? false}
                        onClick={() => onNavigateToConsole(company.id, stat.consoleId)}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
            );
          }

          /* ── Grouped: brick layout — cards flow continuously, SVG traces each company ── */
          return (
            <BrickLayout
              groups={visibleGroups}
              logos={logos}
              showLogo={settings.showCompanyLogos ?? false}
              onNavigate={onNavigateToConsole}
            />
          );
        })()}
      </div>

      {/* ── Session chart tooltip — rendered in a portal so position:fixed is
           always relative to the true viewport, unaffected by parent transforms ── */}
      {tooltip && createPortal((() => {
        const accentColor = tooltip.accentColor ?? (sessionView === "horizon" ? "#38bdf8" : (() => {
          const top = tooltip.entries?.[0];
          return top ? (consoleColorMap.get(top.console_id) ?? DEMO_CONSOLE_COLORS[top.console_id] ?? "#38bdf8") : "#38bdf8";
        })());
        const tipW        = tooltipRef.current?.offsetWidth ?? 200;
        const MARGIN      = 8;
        const rawLeft     = tooltip.x - tipW / 2;
        const clampedLeft = Math.min(Math.max(rawLeft, MARGIN), window.innerWidth - tipW - MARGIN);
        const arrowLeft   = Math.max(10, Math.min(tooltip.x - clampedLeft, tipW - 10));
        return (
          <div ref={tooltipRef} style={{
            position: "fixed",
            left: 0,
            top: tooltip.y - 12,
            transform: `translateX(${clampedLeft}px) translateY(-100%)`,
            zIndex: 9999,
            pointerEvents: "none",
            background: "var(--bg-surface)",
            border: `1px solid ${accentColor}55`,
            borderRadius: 7,
            padding: "8px 12px",
            boxShadow: `0 0 0 1px ${accentColor}18, 0 0 16px ${accentColor}28, 0 8px 24px rgba(0,0,0,0.55)`,
            fontFamily: "var(--font)",
            whiteSpace: "nowrap",
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
              color: accentColor, marginBottom: tooltip.sessions > 0 ? 6 : 0,
            }}>
              WEEK OF {tooltip.label.toUpperCase()}
            </div>

            {tooltip.sessions === 0 ? (
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>No sessions</div>
            ) : (<>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: tooltip.entries ? 7 : 0 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
                  {tooltip.sessions}
                </span>
                <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  {tooltip.sessions === 1 ? "SESSION" : "SESSIONS"}
                </span>
                {tooltip.duration > 0 && (
                  <span style={{ fontSize: 9, color: accentColor + "cc", marginLeft: 2 }}>
                    · {formatDuration(tooltip.duration)}
                  </span>
                )}
              </div>

              {tooltip.entries && tooltip.entries.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {tooltip.entries.map(e => {
                    const color = consoleColorMap.get(e.console_id) ?? DEMO_CONSOLE_COLORS[e.console_id] ?? "#888";
                    const name = consoleShortNameMap.get(e.console_id) ?? e.console_id.toUpperCase();
                    const barW = Math.round((e.sessions / tooltip.sessions) * 60);
                    return (
                      <div key={e.console_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 32 }}>{name}</span>
                        <div style={{ width: 60, height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{ width: barW, height: "100%", background: color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", minWidth: 14, textAlign: "right" }}>{e.sessions}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>)}

            <div style={{
              position: "absolute", bottom: -5, left: arrowLeft - 4,
              transform: "rotate(45deg)",
              width: 8, height: 8,
              background: "var(--bg-surface)",
              borderRight: `1px solid ${accentColor}55`,
              borderBottom: `1px solid ${accentColor}55`,
            }} />
          </div>
        );
      })(), document.body)}
    </div>
  );
}
