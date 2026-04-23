import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { Plus, Monitor, Smartphone, Apple, ChevronDown, Library, X, HardDrive, Lightbulb, ArrowLeft } from "lucide-react";
import { BUILT_IN_CONSOLES, BUILT_IN_COMPANIES } from "../types";
import type { Console, Company } from "../types";
import { GUIDE_DATA } from "../data/guideData";
import { CONSOLE_CATALOG, CATALOG_COMPANIES } from "../data/consoleCatalog";
import { getConsoleStats, getConsoles, getCompanies } from "../db";
import { CONSOLE_IMAGES } from "../data/consoleImages";
import { COMPANY_LOGOS, COMPANY_LOGOS_DARK, COMPANY_LOGO_STYLES } from "../data/companyLogos";
import ConsoleCatalogModal from "../components/ConsoleCatalogModal";
import { useAppSettings } from "../hooks/useAppSettings";
import { useGamepadAction, useGamepadConnected } from "../hooks/useGamepad";

const HANDHELD_IDS = new Set([
  // Nintendo
  "gb", "gbc", "gba", "vb", "ds", "dsi", "3ds", "n3dsxl",
  // Sony
  "psp", "vita",
  // Sega
  "gg", "gamegearadv",
  // Atari
  "lynx",
  // SNK
  "ngpc",
  // Bandai
  "wswan",
]);

interface Props {
  onNavigateToConsole: (companyId: string, consoleId: string) => void;
}

function resolveGuide(consoleId: string) {
  if (GUIDE_DATA[consoleId]) return GUIDE_DATA[consoleId];
  const cat = CONSOLE_CATALOG.find(c => c.id === consoleId);
  return cat?.guide ?? null;
}

function resolveCompanyColor(companyId: string, allCompanies: Company[]): string {
  const builtin = BUILT_IN_COMPANIES.find(c => c.id === companyId);
  if (builtin) return builtin.color;
  const dyn = allCompanies.find(c => c.id === companyId);
  if (dyn) return dyn.color;
  const cat = CATALOG_COMPANIES[companyId];
  return cat?.color ?? "var(--tab-guide)";
}

type ConsoleEntry = Omit<Console, "custom"> & { custom?: boolean };
type GuideEntry = NonNullable<ReturnType<typeof resolveGuide>>;

// ── Format quality colours ───────────────────────────────────────────────────
const FORMAT_QUALITY: Record<string, number> = {
  ".rvz": 10, ".chd": 10, ".wux": 9, ".wia": 9,
  ".xci": 8, ".nsp": 8, ".gcm": 8, ".wbfs": 7,
  ".z64": 7, ".sfc": 7, ".gba": 7, ".nds": 7,
  ".iso": 5, ".cso": 5, ".pbp": 5,
  ".cue": 4, ".gdi": 4, ".bin": 3,
};
function fmtColor(fmt: string, i: number) {
  if (i === 0) return { bg: "#4ade8018", color: "#4ade80", border: "#4ade8044" };
  const q = FORMAT_QUALITY[fmt] ?? 3;
  if (q >= 9) return { bg: "#4ade8010", color: "#4ade80", border: "#4ade8030" };
  if (q >= 6) return { bg: "#fbbf2410", color: "#fbbf24", border: "#fbbf2430" };
  return { bg: "#60a5fa10", color: "#60a5fa", border: "#60a5fa30" };
}

// ── Compact console card — never expands inline ──────────────────────────────
const ConsoleGuideCard = memo(function ConsoleGuideCard({
  con, guide, romCount: _romCount, companyColor, isSelected, isControllerFocused, onToggle,
}: {
  con: ConsoleEntry;
  guide: GuideEntry;
  romCount: number;
  companyColor: string;
  isSelected: boolean;
  isControllerFocused?: boolean;
  onToggle: () => void;
}) {
  const img = CONSOLE_IMAGES[con.id];

  return (
    <div
      data-ctrl-console-id={con.id}
      data-ctrl-focused={isControllerFocused ? "true" : undefined}
      onClick={onToggle}
      onMouseEnter={e => {
        if (isSelected) return;
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = companyColor + "44";
        el.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={e => {
        if (isSelected) return;
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--border)";
        el.style.background = "var(--bg-card)";
      }}
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${isSelected ? companyColor + "88" : "var(--border)"}`,
        background: isSelected ? `${companyColor}0c` : "var(--bg-card)",
        cursor: "pointer",
        transition: "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
        boxShadow: isSelected ? `0 0 0 1px ${companyColor}22, 0 4px 20px ${companyColor}18` : "none",
        position: "relative",
      }}
    >
      {/* Bottom accent bar for selected state — avoids border shorthand conflicts */}
      {isSelected && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 2, background: companyColor, zIndex: 2,
          pointerEvents: "none",
        }} />
      )}

      {/* Card face */}
      <div style={{
        position: "relative",
        padding: "18px 16px 14px",
        minHeight: 120,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}>
        {/* Faded console image */}
        {img && (
          <img src={img} alt="" aria-hidden style={{
            position: "absolute", right: -8, top: "50%",
            transform: "translateY(-50%)",
            height: "90%", width: "auto", maxWidth: "50%",
            objectFit: "contain",
            opacity: 0.32,
            pointerEvents: "none", userSelect: "none",
          }} />
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(100deg, ${isSelected ? `${companyColor}0c` : "var(--bg-card)"} 40%, transparent 100%)`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 3 }}>
            {con.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>
            {con.release_year} · Gen {con.generation}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { Icon: Monitor,    label: "PC",      text: guide.primary_emulator_desktop },
              { Icon: Smartphone, label: "ANDROID", text: guide.primary_emulator_android },
              { Icon: Apple,      label: "iOS",     text: guide.primary_emulator_ios },
            ].map(({ Icon, label, text }) => {
              const na = text === "Not available";
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, opacity: na ? 0.3 : 1 }}>
                  <Icon size={10} style={{ color: na ? "var(--text-muted)" : companyColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", flexShrink: 0, minWidth: 44 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: na ? "var(--text-muted)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Format bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "9px 16px",
        borderTop: `1px solid ${isSelected ? companyColor + "33" : "var(--border)"}`,
        background: isSelected ? `${companyColor}08` : "var(--bg-surface)",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", flexShrink: 0 }}>
          FORMAT
        </span>
        {guide.recommended_formats.slice(0, 3).map((fmt, i) => {
          const s = fmtColor(fmt, i);
          return (
            <span key={fmt} style={{
              fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
              background: s.bg, color: s.color, border: `1px solid ${s.border}`,
              letterSpacing: "0.05em",
            }}>
              {fmt.replace(".", "").toUpperCase()}
              {i === 0 && <span style={{ marginLeft: 3, opacity: 0.6, fontSize: 6 }}>★</span>}
            </span>
          );
        })}
        <div style={{ flex: 1 }} />
        <ChevronDown size={9} style={{
          color: isSelected ? companyColor : "var(--text-muted)",
          transform: isSelected ? "rotate(180deg)" : "none",
          transition: "transform 0.2s, color 0.15s",
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
});

// ── Full-width expansion strip ───────────────────────────────────────────────
function ExpansionStrip({
  con, guide, romCount, companyColor, onClose, onNavigate,
}: {
  con: ConsoleEntry;
  guide: GuideEntry;
  romCount: number;
  companyColor: string;
  onClose: () => void;
  onNavigate?: (companyId: string, consoleId: string) => void;
}) {
  const img = CONSOLE_IMAGES[con.id];

  return (
    <div style={{
      margin: "4px 0 0",
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${companyColor}44`,
      background: "var(--bg-surface)",
      boxShadow: `0 0 0 1px ${companyColor}18, 0 8px 32px ${companyColor}14`,
      animation: "slide-fade-in 0.2s ease both",
    }}>
      {/* Colour accent bar at top */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${companyColor}, ${companyColor}44, transparent)` }} />

      <div style={{ display: "flex", gap: 0 }}>

        {/* ── Left: image + identity ── */}
        <div style={{
          width: 200,
          flexShrink: 0,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `${companyColor}08`,
          borderRight: `1px solid ${companyColor}22`,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Large console image */}
          {img ? (
            <img src={img} alt={con.name} style={{
              width: "90%", height: "auto", maxHeight: 130,
              objectFit: "contain",
              marginBottom: 16,
              filter: `drop-shadow(0 4px 16px ${companyColor}44)`,
            }} />
          ) : (
            <div style={{
              width: 80, height: 60, marginBottom: 16,
              borderRadius: 8,
              background: `${companyColor}18`,
              border: `1px solid ${companyColor}33`,
            }} />
          )}

          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", textAlign: "center", lineHeight: 1.3, marginBottom: 4 }}>
            {con.name}
          </div>
          <div style={{ fontSize: 10, color: companyColor, fontWeight: 600 }}>
            {con.release_year}
          </div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
            Generation {con.generation}
          </div>

          {romCount > 0 && onNavigate && (
            <button
              onClick={() => onNavigate(con.company_id, con.id)}
              style={{
                marginTop: 14,
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 6,
                background: `${companyColor}18`, border: `1px solid ${companyColor}44`,
                color: companyColor, cursor: "pointer",
                fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                letterSpacing: "0.07em", whiteSpace: "nowrap",
              }}
            >
              <Library size={10} /> {romCount} ROMS
            </button>
          )}
        </div>

        {/* ── Right: guide content ── */}
        <div style={{ flex: 1, padding: "20px 24px 20px", minWidth: 0 }}>

          {/* Close button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={onClose} style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: 5, padding: "3px 8px",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font)", fontSize: 8, fontWeight: 700,
              letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}>
              <X size={9} /> CLOSE
            </button>
          </div>

          {/* Emulator three-up */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { Icon: Monitor,    label: "DESKTOP",  primary: guide.primary_emulator_desktop,  alts: guide.alt_emulators },
              { Icon: Smartphone, label: "ANDROID",  primary: guide.primary_emulator_android,  alts: [] },
              { Icon: Apple,      label: "iOS",       primary: guide.primary_emulator_ios,      alts: [] },
            ].map(({ Icon, label, primary, alts }) => {
              const na = primary === "Not available";
              return (
                <div key={label} style={{
                  padding: "12px 14px",
                  background: "var(--bg-card)",
                  border: `1px solid ${na ? "var(--border)" : companyColor + "22"}`,
                  borderRadius: 8,
                  opacity: na ? 0.4 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <Icon size={10} style={{ color: na ? "var(--text-muted)" : companyColor }} />
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: na ? "var(--text-muted)" : "var(--text)", marginBottom: alts.length ? 6 : 0, lineHeight: 1.3 }}>
                    {primary}
                  </div>
                  {alts.map(a => (
                    <div key={a} style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 3 }}>
                      + {a}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Formats */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <HardDrive size={10} style={{ color: companyColor }} />
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                RECOMMENDED FORMATS
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {guide.recommended_formats.map((fmt, i) => {
                const s = fmtColor(fmt, i);
                return (
                  <div key={fmt} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                      letterSpacing: "0.06em",
                    }}>
                      {fmt.replace(".", "").toUpperCase()}
                    </span>
                    {i === 0 && <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 600 }}>PREFERRED</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hardware notes + Pro tips — two columns when both present */}
          <div style={{
            display: "grid",
            gridTemplateColumns: guide.hardware_notes.length > 0 && guide.pro_tips.length > 0 ? "1fr 1fr" : "1fr",
            gap: 16,
          }}>
            {guide.hardware_notes.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <HardDrive size={10} style={{ color: companyColor }} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                    HARDWARE & FLASHCARTS
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {guide.hardware_notes.map((note, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ color: companyColor, fontSize: 9, marginTop: 3, flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.pro_tips.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <Lightbulb size={10} style={{ color: "#fbbf24" }} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "#fbbf24" }}>
                    PRO TIPS
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {guide.pro_tips.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ color: "#fbbf24", fontSize: 9, marginTop: 3, flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Company section — grid + row-aware strip insertion ───────────────────────
function CompanyGuideSection({
  consoles, expandedId, onToggle, romCounts, companyColor, onNavigate,
  controllerFocusedId, onColumnsChange,
}: {
  consoles: ConsoleEntry[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  romCounts: Record<string, number>;
  companyColor: string;
  onNavigate?: (companyId: string, consoleId: string) => void;
  controllerFocusedId?: string | null;
  onColumnsChange?: (cols: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [colCount, setColCount] = useState(4);

  // Measure actual column count from computed grid style
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const cols = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length;
      const n = Math.max(1, isNaN(cols) ? 1 : cols);
      setColCount(n);
      onColumnsChange?.(n);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Find expanded console + its row index
  const expandedIdx = expandedId ? consoles.findIndex(c => c.id === expandedId) : -1;
  const expandedCon  = expandedIdx >= 0 ? consoles[expandedIdx] : null;
  const expandedGuide = expandedCon ? resolveGuide(expandedCon.id) : null;
  const expandedRow  = expandedIdx >= 0 ? Math.floor(expandedIdx / colCount) : -1;

  // Build flat item list: cards, with a strip injected after the last card of the expanded row
  type GridItem =
    | { kind: "card"; con: ConsoleEntry }
    | { kind: "strip" };

  const items: GridItem[] = [];
  for (let i = 0; i < consoles.length; i++) {
    items.push({ kind: "card", con: consoles[i] });
    const rowOfThis = Math.floor(i / colCount);
    const isLastInRow = i === consoles.length - 1 || Math.floor((i + 1) / colCount) !== rowOfThis;
    if (isLastInRow && rowOfThis === expandedRow) {
      items.push({ kind: "strip" });
    }
  }

  return (
    <div
      ref={gridRef}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 10,
      }}
    >
      {items.map((item, _idx) => {
        if (item.kind === "strip") {
          if (!expandedCon || !expandedGuide) return null;
          return (
            <div key="strip" style={{ gridColumn: "1 / -1" }}>
              <ExpansionStrip
                con={expandedCon}
                guide={expandedGuide}
                romCount={romCounts[expandedCon.id] ?? 0}
                companyColor={companyColor}
                onClose={() => onToggle(expandedCon.id)}
                onNavigate={onNavigate}
              />
            </div>
          );
        }

        const con = item.con;
        const guide = resolveGuide(con.id);
        if (!guide) return null;
        return (
          <ConsoleGuideCard
            key={con.id}
            con={con}
            guide={guide}
            romCount={romCounts[con.id] ?? 0}
            companyColor={companyColor}
            isSelected={con.id === expandedId}
            isControllerFocused={con.id === controllerFocusedId}
            onToggle={() => onToggle(con.id)}
          />
        );
      })}
    </div>
  );
}

// ── Main GuideTab ────────────────────────────────────────────────────────────
export default function GuideTab({ onNavigateToConsole }: Props) {
  const { settings } = useAppSettings();
  const companyLogos = settings.theme === "light" ? COMPANY_LOGOS_DARK : COMPANY_LOGOS;
  const [showCatalog,       setShowCatalog]       = useState(false);
  const [customConsoles,    setCustomConsoles]    = useState<Console[]>([]);
  const [allCompanies,      setAllCompanies]      = useState<Company[]>([]);
  const [romCounts,         setRomCounts]         = useState<Record<string, number>>({});
  const [expandedId,        setExpandedId]        = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Controller state ────────────────────────────────────────────────────────
  const [ctrlCompanyCursor,  setCtrlCompanyCursor]  = useState(0);
  const [ctrlConsoleCursor,  setCtrlConsoleCursor]  = useState(0);
  const companyGridRef    = useRef<HTMLDivElement>(null);
  const companyGridColsRef = useRef(1);
  const consoleGridColsRef = useRef(1);
  const controllerConnected = useGamepadConnected();

  const loadCustomData = useCallback(() => {
    getConsoles().then(all => setCustomConsoles(all.filter(c => c.custom))).catch(() => {});
    getCompanies().then(setAllCompanies).catch(() => {});
  }, []);

  // Update scrollbar colour + background gradient to match the selected company
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (selectedCompanyId) {
      const color = resolveCompanyColor(selectedCompanyId, allCompanies);
      el.style.setProperty("--scrollbar-thumb", color + "66");
      el.style.setProperty("--scrollbar-thumb-hover", color + "cc");
      el.style.background = `radial-gradient(ellipse at 60% 0%, ${color}1a 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, ${color}0d 0%, transparent 50%), var(--bg-surface)`;
    } else {
      el.style.removeProperty("--scrollbar-thumb");
      el.style.removeProperty("--scrollbar-thumb-hover");
      // Tile grid — soft ambient glow using guide tab colour (#60b8d8)
      el.style.background = `radial-gradient(ellipse at 80% 5%, #60b8d820 0%, transparent 55%), radial-gradient(ellipse at 15% 90%, #60b8d812 0%, transparent 50%), var(--bg-surface)`;
    }
    return () => { if (el) el.style.background = ""; };
  }, [selectedCompanyId, allCompanies]);

  useEffect(() => {
    loadCustomData();
    getConsoleStats().then(stats => {
      const map: Record<string, number> = {};
      stats.forEach(s => { map[s.console_id] = s.rom_count; });
      setRomCounts(map);
    }).catch(() => {});
  }, [loadCustomData]);

  const allGuideConsoles: ConsoleEntry[] = useMemo(() => {
    const builtins   = BUILT_IN_CONSOLES.filter(c => resolveGuide(c.id));
    const builtinIds = new Set(builtins.map(c => c.id));
    const custom     = customConsoles.filter(c => resolveGuide(c.id) && !builtinIds.has(c.id));
    return [...builtins, ...custom];
  }, [customConsoles]);

  const myConsoles = useMemo(() =>
    allGuideConsoles.filter(c => (romCounts[c.id] ?? 0) > 0),
    [allGuideConsoles, romCounts]
  );

  const myCompanyGroups = useMemo(() => {
    const companyOrder = new Map<string, number>([
      ...BUILT_IN_COMPANIES.map((c, i) => [c.id, i] as [string, number]),
      ...allCompanies.map((c, i) => [c.id, BUILT_IN_COMPANIES.length + i] as [string, number]),
    ]);
    const seen = new Set<string>();
    const orderedIds: string[] = [];
    for (const con of myConsoles) {
      if (!seen.has(con.company_id)) { seen.add(con.company_id); orderedIds.push(con.company_id); }
    }
    orderedIds.sort((a, b) => (companyOrder.get(a) ?? 99) - (companyOrder.get(b) ?? 99));

    return orderedIds.map(companyId => {
      const consoles = myConsoles
        .filter(c => c.company_id === companyId)
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      const color = resolveCompanyColor(companyId, allCompanies);
      const name = allCompanies.find(c => c.id === companyId)?.name
        ?? BUILT_IN_COMPANIES.find(c => c.id === companyId)?.name
        ?? companyId;
      return { companyId, name, color, consoles };
    });
  }, [myConsoles, allCompanies]);

  // Total guide console count per company (regardless of whether user has ROMs)
  const totalConsolesPerCompany = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of allGuideConsoles) {
      map[c.company_id] = (map[c.company_id] ?? 0) + 1;
    }
    return map;
  }, [allGuideConsoles]);



  const existingConsoleIds = useMemo(() => new Set([
    ...BUILT_IN_CONSOLES.map(c => c.id),
    ...customConsoles.map(c => c.id),
  ]), [customConsoles]);

  const existingCompanyIds = useMemo(() => new Set([
    ...BUILT_IN_COMPANIES.map(c => c.id),
    ...allCompanies.map(c => c.id),
  ]), [allCompanies]);

  const catalogAvailableCount = CONSOLE_CATALOG.filter(c => !existingConsoleIds.has(c.id)).length;

  // Flat sorted console list for the currently selected company (used by gamepad)
  const allForCompanyCtrl = useMemo(() => {
    if (!selectedCompanyId) return [];
    return allGuideConsoles
      .filter(c => c.company_id === selectedCompanyId)
      .sort((a, b) => a.release_year - b.release_year || (a.order ?? 99) - (b.order ?? 99));
  }, [selectedCompanyId, allGuideConsoles]);

  const consoleFocusedId = allForCompanyCtrl[ctrlConsoleCursor]?.id ?? null;

  // Reset console cursor when drilling into a company
  useEffect(() => { setCtrlConsoleCursor(0); }, [selectedCompanyId]);

  // ResizeObserver for company tile grid
  useEffect(() => {
    const el = companyGridRef.current;
    if (!el) return;
    const measure = () => {
      const cols = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length;
      companyGridColsRef.current = Math.max(1, isNaN(cols) ? 1 : cols);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [myCompanyGroups.length]);

  // Gamepad navigation
  useGamepadAction((action) => {
    if (selectedCompanyId === null) {
      // ── Company grid ──────────────────────────────────────────────────────
      if (action === "confirm") {
        const group = myCompanyGroups[ctrlCompanyCursor];
        if (group) { setSelectedCompanyId(group.companyId); }
        return;
      }
      const total = myCompanyGroups.length;
      const cols  = companyGridColsRef.current;
      setCtrlCompanyCursor(prev => {
        if (action === "left")  return Math.max(0, prev - 1);
        if (action === "right") return Math.min(total - 1, prev + 1);
        if (action === "up")    return Math.max(0, prev - cols);
        if (action === "down")  return Math.min(total - 1, prev + cols);
        return prev;
      });
    } else {
      // ── Console drill-down ────────────────────────────────────────────────
      if (expandedId !== null) {
        if (action === "cancel") setExpandedId(null);
        return;
      }
      if (action === "cancel") { setSelectedCompanyId(null); setExpandedId(null); return; }
      if (action === "confirm") {
        const con = allForCompanyCtrl[ctrlConsoleCursor];
        if (con) setExpandedId(prev => prev === con.id ? null : con.id);
        return;
      }
      const total = allForCompanyCtrl.length;
      const cols  = consoleGridColsRef.current;
      setCtrlConsoleCursor(prev => {
        if (action === "left")  return Math.max(0, prev - 1);
        if (action === "right") return Math.min(total - 1, prev + 1);
        if (action === "up")    return Math.max(0, prev - cols);
        if (action === "down")  return Math.min(total - 1, prev + cols);
        return prev;
      });
    }
  });

  // Scroll focused company tile into view
  useEffect(() => {
    if (!controllerConnected || selectedCompanyId !== null) return;
    const el = companyGridRef.current?.querySelector<HTMLElement>(`[data-ctrl-idx="${ctrlCompanyCursor}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ctrlCompanyCursor, controllerConnected, selectedCompanyId]);

  // Scroll focused console card into view
  useEffect(() => {
    if (!controllerConnected || selectedCompanyId === null || !consoleFocusedId) return;
    const el = contentRef.current?.querySelector<HTMLElement>(`[data-ctrl-console-id="${consoleFocusedId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ctrlConsoleCursor, controllerConnected, selectedCompanyId, consoleFocusedId]);

  function toggleCard(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div className="section-header" style={{ gap: 8 }}>
        <span className="section-title" style={{ color: "var(--tab-guide)" }}>
          EMULATION GUIDE
        </span>
        <div style={{ flex: 1 }} />
        {catalogAvailableCount > 0 && (
          <button
            onClick={() => setShowCatalog(true)}
            className="btn"
            style={{ gap: 5, borderColor: "var(--tab-guide)44", color: "var(--tab-guide)" }}
          >
            <Plus size={11} /> ADD CONSOLE
            <span style={{
              fontSize: 8, background: "var(--tab-guide)22",
              border: "1px solid var(--tab-guide)44",
              borderRadius: 3, padding: "1px 4px",
            }}>
              {catalogAvailableCount}
            </span>
          </button>
        )}
      </div>

      {/* ── Drill-down breadcrumb bar — outside scroll container so it never bounces ── */}
      {(() => {
        if (!selectedCompanyId) return null;
        const group = myCompanyGroups.find(g => g.companyId === selectedCompanyId);
        if (!group) return null;
        const { name, color } = group;
        const logoSrc = companyLogos[selectedCompanyId] ?? null;
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 18px",
            background: "var(--bg-surface)",
            borderBottom: `1px solid ${color}33`,
            flexShrink: 0,
          }}>
            <button
              onClick={() => { setSelectedCompanyId(null); setExpandedId(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "1px solid var(--border-lit)",
                borderRadius: 6, padding: "5px 12px",
                color: "var(--text-muted)", cursor: "pointer",
                fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.06em", transition: "all 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-lit)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            >
              <ArrowLeft size={11} /> ALL COMPANIES
            </button>
            <div style={{ height: 1, flex: 1, background: `${color}28` }} />
            {logoSrc ? (
              <img src={logoSrc} alt={name} style={{
                height: 34, width: "auto", maxWidth: 180, objectFit: "contain", opacity: 0.85,
                ...(COMPANY_LOGO_STYLES[selectedCompanyId]?.[settings.theme === "light" ? "light" : "dark"] ?? {}),
              }} />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color }}>{name.toUpperCase()}</span>
            )}
            <div style={{ height: 1, width: 16, background: `${color}28` }} />
            <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>
              {allForCompanyCtrl.length} console{allForCompanyCtrl.length !== 1 ? "s" : ""}
            </span>
          </div>
        );
      })()}

      <div ref={contentRef} className="app-content" style={{ paddingBottom: 32 }}>

        {/* ── Your Collection ── */}
        {myConsoles.length === 0 ? (
          <div style={{
            margin: "20px 18px 0", padding: "28px 24px",
            borderRadius: 10, background: "var(--bg-card)",
            border: "1px solid var(--border)", textAlign: "center",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>No ROMs scanned yet.</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>Your consoles will appear here once you scan a folder.</div>
          </div>

        ) : selectedCompanyId !== null ? (() => {
          // ── Drill-down: single company console grid ──────────────────────────
          const group = myCompanyGroups.find(g => g.companyId === selectedCompanyId);
          if (!group) return null;
          const { color } = group;

          // All guide consoles for this company, sorted by release year
          const allForCompany = allGuideConsoles
            .filter(c => c.company_id === selectedCompanyId)
            .sort((a, b) => a.release_year - b.release_year || (a.order ?? 99) - (b.order ?? 99));
          const homeConsoles    = allForCompany.filter(c => !HANDHELD_IDS.has(c.id));
          const handheldConsoles = allForCompany.filter(c => HANDHELD_IDS.has(c.id));

          return (
            <div style={{ animation: "guide-drill-in 0.22s ease both" }}>
              <div style={{ padding: "16px 18px 0" }}>
              {/* Home consoles */}
              {homeConsoles.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  {handheldConsoles.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-muted)" }}>HOME CONSOLES</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}
                  <CompanyGuideSection
                    consoles={homeConsoles}
                    expandedId={expandedId}
                    onToggle={toggleCard}
                    romCounts={romCounts}
                    companyColor={color}
                    onNavigate={onNavigateToConsole}
                    controllerFocusedId={controllerConnected ? consoleFocusedId : null}
                    onColumnsChange={cols => { consoleGridColsRef.current = cols; }}
                  />
                </div>
              )}

              {/* Handhelds */}
              {handheldConsoles.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-muted)" }}>HANDHELDS</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </div>
                  <CompanyGuideSection
                    consoles={handheldConsoles}
                    expandedId={expandedId}
                    onToggle={toggleCard}
                    romCounts={romCounts}
                    companyColor={color}
                    onNavigate={onNavigateToConsole}
                    controllerFocusedId={controllerConnected ? consoleFocusedId : null}
                    onColumnsChange={cols => { consoleGridColsRef.current = cols; }}
                  />
                </div>
              )}
              </div>{/* end padding wrapper */}
            </div>
          );
        })() : (
          // ── Company tile grid ────────────────────────────────────────────────
          <div style={{ padding: "20px 18px 0", animation: "guide-drill-back 0.22s ease both" }}>
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <div style={{
                fontSize: 13, color: "var(--text)", lineHeight: 1.75,
                maxWidth: 520, margin: "0 auto",
                padding: "14px 28px",
                background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-card) 100%)",
                border: "1px solid var(--border-lit)",
                borderRadius: 10,
                boxShadow: "0 1px 8px rgba(0,0,0,0.18)",
              }}>
                Pick a company below to browse setup guides, recommended emulators and the best ROM formats for each platform.
              </div>
            </div>

            <div
              ref={companyGridRef}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.ceil(myCompanyGroups.length / 2)}, 1fr)`,
                gap: 16,
              }}>
              {myCompanyGroups.map(({ companyId, name, color, consoles }, i) => {
                const logoSrc = companyLogos[companyId] ?? null;
                const platformCount = totalConsolesPerCompany[companyId] ?? consoles.length;
                const ctrlFocused = controllerConnected && i === ctrlCompanyCursor;
                return (
                  <button
                    key={companyId}
                    data-ctrl-idx={i}
                    data-ctrl-focused={ctrlFocused ? "true" : undefined}
                    onClick={() => setSelectedCompanyId(companyId)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "space-between",
                      gap: 0, padding: 0,
                      background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, var(--bg-card) 70%)`,
                      border: `1px solid ${color}44`,
                      borderRadius: 16, cursor: "pointer",
                      fontFamily: "var(--font)", textAlign: "center",
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                      position: "relative", overflow: "hidden",
                      boxShadow: `0 2px 12px ${color}18`,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = color + "88";
                      el.style.boxShadow = `0 4px 28px ${color}44, 0 0 0 1px ${color}33`;
                      el.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = color + "44";
                      el.style.boxShadow = `0 2px 12px ${color}18`;
                      el.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Top glow bar */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 4,
                      background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${color} 60%, transparent 100%)`,
                      opacity: 0.8,
                    }} />

                    {/* Subtle radial glow in corner */}
                    <div style={{
                      position: "absolute", top: -30, right: -30,
                      width: 100, height: 100, borderRadius: "50%",
                      background: color, opacity: 0.07,
                      pointerEvents: "none",
                    }} />

                    {/* Logo area */}
                    <div style={{
                      width: "100%", padding: "32px 24px 20px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minHeight: 110,
                    }}>
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={name}
                          style={{
                            height: 60, maxWidth: 170, width: "auto", objectFit: "contain",
                            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
                            ...(COMPANY_LOGO_STYLES[companyId]?.[settings.theme === "light" ? "light" : "dark"] ?? {}),
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.08em", color }}>
                          {name.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Footer strip */}
                    <div style={{
                      width: "100%",
                      padding: "10px 16px 14px",
                      borderTop: `1px solid ${color}22`,
                      background: `${color}08`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                        color: color + "cc",
                      }}>
                        {platformCount} PLATFORM{platformCount !== 1 ? "S" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {showCatalog && (
        <ConsoleCatalogModal
          existingConsoleIds={existingConsoleIds}
          existingCompanyIds={existingCompanyIds}
          onAdded={loadCustomData}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </div>
  );
}
