import React, { useState, useMemo, useRef, useEffect } from "react";
import { X, Download, Check, Copy, Sparkles, Search } from "lucide-react";
import type { ExclusiveList } from "../data/exclusivesData";
import { EXCLUSIVE_LISTS } from "../data/exclusivesData";
import { BUILT_IN_CONSOLES, BUILT_IN_COMPANIES } from "../types";
import type { Company, Console } from "../types";
import { addExclusive, getCompanies, getConsoles } from "../db";

interface Props {
  activeConsoleId: string | null;
  onImport: (list: ExclusiveList) => Promise<void>;
  onClose: () => void;
}

const CATEGORY_SLUGS: Record<string, string[]> = {
  "Essentials":  ["essentials"],
  "Hidden Gems": ["hidden-gems", "gems"],
  "Racing":      ["racing"],
  "RPG":         ["rpg", "jrpg"],
  "Shooters":    ["shooter", "shooting", "shmup"],
  "Sports":      ["sports"],
  "Horror":      ["horror"],
  "Fighting":    ["fighting"],
};

function getCategory(list: ExclusiveList): string {
  const combined = `${list.id} ${list.label}`.toLowerCase();
  for (const [cat, slugs] of Object.entries(CATEGORY_SLUGS)) {
    if (slugs.some(s => combined.includes(s))) return cat;
  }
  return "Other";
}

// ── Scrollable right panel with colour-tracking scrollbar ────────────────────

function RightPanel({ byCompany, activeConsoleId, imported, importing, handleImport, search, setSearch, totalVisible }: {
  byCompany: { company: typeof BUILT_IN_COMPANIES[number]; consoles: { console: typeof BUILT_IN_CONSOLES[number]; lists: ExclusiveList[] }[] }[];
  activeConsoleId: string | null;
  imported: Set<string>;
  importing: string | null;
  handleImport: (list: ExclusiveList) => void;
  search: string;
  setSearch: (s: string) => void;
  totalVisible: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbColor, setThumbColor] = useState("");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const headers = el.querySelectorAll<HTMLElement>("[data-company-color]");
      const parentTop = el.getBoundingClientRect().top;
      let active: string | null = null;
      headers.forEach(h => {
        if (h.getBoundingClientRect().top <= parentTop + 2) {
          active = h.getAttribute("data-company-color");
        }
      });
      const firstHeader = el.querySelector<HTMLElement>("[data-company-color]");
      const fallback = firstHeader?.getAttribute("data-company-color") ?? "var(--border-lit)";
      setThumbColor(active ?? fallback);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [byCompany]);

  useEffect(() => {
    const styleId = "list-picker-scrollbar";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `
      .list-picker-scroll::-webkit-scrollbar { width: 5px; }
      .list-picker-scroll::-webkit-scrollbar-track { background: transparent; }
      .list-picker-scroll::-webkit-scrollbar-thumb { background: ${thumbColor}; border-radius: 3px; transition: background 0.4s; }
    `;
    return () => { if (el) el.textContent = ""; };
  }, [thumbColor]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search lists or consoles…"
          style={{
            background: "none", border: "none", outline: "none",
            color: "var(--text)", fontFamily: "var(--font)", fontSize: 12, flex: 1,
          }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>
            ×
          </button>
        )}
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
          {totalVisible} list{totalVisible !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Scrollable list */}
      <div ref={scrollRef} className="list-picker-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 14px 10px" }}>
        {byCompany.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
            {search ? `No results for "${search}"` : "No lists in this category yet"}
          </div>
        )}

        {byCompany.map(({ company, consoles }) => (
          <div key={company.id} style={{ marginBottom: 20 }}>
            {/* Sticky company heading */}
            <div
              data-company-color={company.color}
              style={{
                fontSize: 12, fontWeight: 800, letterSpacing: "0.14em",
                color: company.color, marginBottom: 8,
                display: "flex", alignItems: "center", gap: 8,
                position: "sticky", top: 0, zIndex: 2,
                background: "var(--bg-surface)",
                padding: "8px 14px",
                margin: "0 -14px",
                borderBottom: `1px solid ${company.color}22`,
              }}
            >
              {company.name.toUpperCase()}
              <div style={{ flex: 1, height: 1, background: `${company.color}22` }} />
            </div>

            {consoles.map(({ console: con, lists }) => (
              <div key={con.id} style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 10, color: "var(--text-dim)", fontWeight: 700,
                  letterSpacing: "0.08em", marginBottom: 4,
                  paddingLeft: 8,
                  borderLeft: `2px solid ${company.color}44`,
                }}>
                  {con.name}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 8 }}>
                  {lists.map(list => {
                    const isImported  = imported.has(list.id);
                    const isImporting = importing === list.id;
                    const isActive    = list.console_id === activeConsoleId;
                    const cat         = getCategory(list);
                    return (
                      <div key={list.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px",
                        background: isActive ? `${company.color}0e` : "var(--bg-card)",
                        border: `1px solid ${isActive ? company.color + "44" : "var(--border)"}`,
                        borderRadius: 7, transition: "all 0.15s",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: "var(--text)",
                            marginBottom: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                          }}>
                            {list.label}
                            <span style={{
                              fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                              padding: "1px 5px", borderRadius: 3,
                              background: "var(--tab-exclusives)18", color: "var(--tab-exclusives)",
                              border: "1px solid var(--tab-exclusives)33",
                            }}>
                              {cat.toUpperCase()}
                            </span>
                            <span style={{
                              fontSize: 10, color: "var(--text-muted)",
                              background: "var(--bg-surface)", border: "1px solid var(--border)",
                              padding: "0 5px", borderRadius: 3,
                            }}>
                              {list.count} games
                            </span>
                            {isActive && (
                              <span style={{ fontSize: 9, color: company.color, fontWeight: 700 }}>● ACTIVE</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.4 }}>
                            {list.description}
                          </div>
                        </div>
                        <button
                          onClick={() => !isImported && handleImport(list)}
                          disabled={isImporting}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            background: isImported ? "#4ade8018" : "var(--bg-surface)",
                            border: `1px solid ${isImported ? "#4ade80" : company.color + "66"}`,
                            color: isImported ? "#4ade80" : company.color,
                            fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
                            letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 5,
                            cursor: isImported ? "default" : "pointer",
                            flexShrink: 0, whiteSpace: "nowrap",
                            transition: "all 0.15s", opacity: isImporting ? 0.5 : 1,
                          }}
                        >
                          {isImported ? <><Check size={11} /> DONE</> : isImporting ? "…" : <><Download size={11} /> IMPORT</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ListPickerModal({ activeConsoleId, onImport, onClose }: Props) {
  const [importing,      setImporting]      = useState<string | null>(null);
  const [imported,       setImported]       = useState<Set<string>>(new Set());
  const [activeTab,      setActiveTab]      = useState<"premade" | "ai">("premade");
  const [search,         setSearch]         = useState("");
  const [activeCategory, setCategory]       = useState("All");
  const [allCompanies,   setAllCompanies]   = useState<Company[]>([...BUILT_IN_COMPANIES] as Company[]);
  const [allConsoles,    setAllConsoles]    = useState<Console[]>([...BUILT_IN_CONSOLES] as Console[]);

  // Load from DB so custom companies/consoles appear
  useEffect(() => {
    const IS_TAURI = "__TAURI_INTERNALS__" in window;
    if (!IS_TAURI) return;
    getCompanies().then(setAllCompanies).catch(() => {});
    getConsoles().then(setAllConsoles).catch(() => {});
  }, []);

  const allCategories = useMemo(() => {
    const cats = new Set(EXCLUSIVE_LISTS.map(getCategory));
    const order = ["Essentials", "Hidden Gems", "Racing", "RPG", "Shooters", "Sports", "Horror", "Fighting", "Other"];
    return ["All", ...order.filter(c => cats.has(c))];
  }, []);

  const filteredLists = useMemo(() => {
    const q = search.toLowerCase().trim();
    return EXCLUSIVE_LISTS.filter(list => {
      if (activeCategory !== "All" && getCategory(list) !== activeCategory) return false;
      if (!q) return true;
      const con = BUILT_IN_CONSOLES.find(c => c.id === list.console_id);
      return (
        list.label.toLowerCase().includes(q) ||
        list.description.toLowerCase().includes(q) ||
        con?.name.toLowerCase().includes(q) ||
        con?.short_name.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const byCompany = useMemo(() => {
    return allCompanies.map(company => ({
      company,
      consoles: allConsoles
        .filter(c => c.company_id === company.id)
        .map(c => ({ console: c, lists: filteredLists.filter(l => l.console_id === c.id) }))
        .filter(c => c.lists.length > 0),
    })).filter(g => g.consoles.length > 0);
  }, [filteredLists, allCompanies, allConsoles]);

  async function handleImport(list: ExclusiveList) {
    setImporting(list.id);
    try {
      await onImport(list);
      setImported(prev => new Set(prev).add(list.id));
    } finally {
      setImporting(null);
    }
  }



  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-lit)",
        borderRadius: 12,
        width: "min(860px, 100%)",
        height: "min(700px, 90vh)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--tab-exclusives)", flex: 1 }}>
            ADD EXCLUSIVES LIST
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {([
            { key: "premade", label: "PRE-MADE LISTS", icon: <Download size={12} /> },
            { key: "ai",      label: "AI PROMPT",      icon: <Sparkles size={12} /> },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px",
              background: activeTab === tab.key ? "var(--tab-exclusives)0e" : "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? "var(--tab-exclusives)" : "transparent"}`,
              color: activeTab === tab.key ? "var(--tab-exclusives)" : "var(--text-dim)",
              fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s",
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Pre-made lists tab ── */}
        {activeTab === "premade" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

            {/* Category rail */}
            <div style={{
              width: 140, flexShrink: 0,
              borderRight: "1px solid var(--border)",
              overflowY: "auto", padding: "10px 8px",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              {allCategories.map(cat => {
                const isActive = cat === activeCategory;
                const count = cat === "All"
                  ? EXCLUSIVE_LISTS.length
                  : EXCLUSIVE_LISTS.filter(l => getCategory(l) === cat).length;
                return (
                  <button key={cat} onClick={() => setCategory(cat)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 10px", borderRadius: 6,
                    background: isActive ? "var(--tab-exclusives)18" : "transparent",
                    border: `1px solid ${isActive ? "var(--tab-exclusives)55" : "transparent"}`,
                    color: isActive ? "var(--tab-exclusives)" : "var(--text-dim)",
                    fontFamily: "var(--font)", fontSize: 11, fontWeight: isActive ? 700 : 500,
                    cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8,
                      background: isActive ? "var(--tab-exclusives)22" : "var(--bg-hover)",
                      color: isActive ? "var(--tab-exclusives)" : "var(--text-muted)",
                      flexShrink: 0, marginLeft: 4,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right panel */}
            <RightPanel
              byCompany={byCompany}
              activeConsoleId={activeConsoleId}
              imported={imported}
              importing={importing}
              handleImport={handleImport}
              search={search}
              setSearch={setSearch}
              totalVisible={filteredLists.length}
            />
          </div>
        )}

        {/* ── AI Prompt tab ── */}
        {activeTab === "ai" && (
          <AIPromptTab
            activeConsoleId={activeConsoleId}
            allCompanies={allCompanies}
            allConsoles={allConsoles}
            onImported={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ── AI Prompt Tab ─────────────────────────────────────────────────────────────

function AIPromptTab({ activeConsoleId, allCompanies, allConsoles, onImported }: {
  activeConsoleId: string | null;
  allCompanies: Company[];
  allConsoles: Console[];
  onImported: () => void;
}) {
  // Form state
  const [selectedConsoleId, setSelectedConsoleId] = useState<string>(activeConsoleId ?? "");
  const [listType,   setListType]   = useState("must-play exclusives");
  const [gameCount,  setGameCount]  = useState(15);
  const [extraCtx,   setExtraCtx]   = useState("");
  const [copied,     setCopied]     = useState(false);

  // Keep console in sync if user navigates sidebar while modal is open
  useEffect(() => {
    if (activeConsoleId) setSelectedConsoleId(activeConsoleId);
  }, [activeConsoleId]);

  const selectedConsole  = allConsoles.find(c => c.id === selectedConsoleId) ?? null;
  const selectedCompany  = selectedConsole ? allCompanies.find(c => c.id === selectedConsole.company_id) : null;
  const fullConsoleName  = selectedConsole
    ? `${selectedCompany?.name ?? ""} ${selectedConsole.name}`
    : null;
  const accentColor = selectedCompany?.color ?? "var(--tab-exclusives)";

  // Build prompt live from form values
  const prompt = fullConsoleName ? `I need a curated list of ${listType} for the ${fullConsoleName}.

Please provide exactly ${gameCount} games in the following JSON format — respond with JSON only, no preamble or markdown:

[
  {
    "title": "Exact game title",
    "note": "1–2 sentences on why this game is worth playing",
    "genres": ["Genre1", "Genre2"]
  }
]${extraCtx.trim() ? `

Additional context: ${extraCtx.trim()}` : ""}

Use genres from: Action, Adventure, RPG, JRPG, Platformer, Racing, Sports, Fighting, Puzzle, Shooter, Strategy, Simulation, Horror, Stealth, Beat-em-up, Run-and-Gun, Rhythm, Action-RPG.`
  : "";

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-lit)",
    borderRadius: 6,
    color: "var(--text)",
    fontFamily: "var(--font)",
    fontSize: 12,
    padding: "8px 10px",
    outline: "none",
    width: "100%",
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {/* Left: form */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        padding: "16px 16px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
          Fill in the form to build a custom prompt, then copy it into any AI assistant.
        </div>

        {/* Console picker */}
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
            CONSOLE
          </label>
          <select
            value={selectedConsoleId}
            onChange={e => setSelectedConsoleId(e.target.value)}
            style={{
              ...inputStyle,
              cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: 28,
            }}
          >
            <option value="">— Select a console —</option>
            {allCompanies.map(company => (
              <optgroup key={company.id} label={company.name}>
                {allConsoles
                  .filter(c => c.company_id === company.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                }
              </optgroup>
            ))}
          </select>
          {selectedConsole && (
            <div style={{
              marginTop: 6, padding: "4px 8px", borderRadius: 4,
              background: `${accentColor}14`,
              border: `1px solid ${accentColor}33`,
              fontSize: 10, color: accentColor, fontWeight: 600,
            }}>
              {fullConsoleName}
            </div>
          )}
        </div>

        {/* List type */}
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
            LIST TYPE
          </label>
          <input
            type="text"
            value={listType}
            onChange={e => setListType(e.target.value)}
            placeholder="e.g. must-play exclusives"
            style={inputStyle}
          />
          {/* Quick presets */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {["must-play exclusives", "hidden gems", "best RPGs", "top racing games", "best shooters", "greatest sports games", "horror essentials"].map(p => (
              <button key={p} onClick={() => setListType(p)} style={{
                padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                background: listType === p ? `${accentColor}20` : "var(--bg-hover)",
                border: `1px solid ${listType === p ? accentColor + "55" : "var(--border)"}`,
                color: listType === p ? accentColor : "var(--text-muted)",
                fontFamily: "var(--font)", fontSize: 9, fontWeight: 600,
                transition: "all 0.12s",
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Game count */}
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
            NUMBER OF GAMES — <span style={{ color: accentColor }}>{gameCount}</span>
          </label>
          <input
            type="range" min={5} max={30} step={1}
            value={gameCount}
            onChange={e => setGameCount(Number(e.target.value))}
            style={{ width: "100%", accentColor, cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
            <span>5</span><span>30</span>
          </div>
        </div>

        {/* Extra context */}
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
            EXTRA CONTEXT <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={extraCtx}
            onChange={e => setExtraCtx(e.target.value)}
            placeholder="e.g. Focus on Japan-only releases, no sports titles, include import-only gems"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>
      </div>

      {/* Right: preview + actions */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Prompt preview */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
            GENERATED PROMPT
          </div>

          {!selectedConsole ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", fontSize: 12, textAlign: "center",
              padding: 24,
            }}>
              Select a console on the left to generate a prompt
            </div>
          ) : (
            <pre style={{
              margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontSize: 11, lineHeight: 1.7, color: "var(--text-dim)",
              background: "var(--bg-card)",
              border: `1px solid ${accentColor}22`,
              borderRadius: 8, padding: "12px 14px",
              fontFamily: "var(--font)",
            }}>
              {prompt}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: "12px 16px", borderTop: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 8, flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Copy prompt → paste into any AI → paste JSON response below
          </div>

          <button
            onClick={copyPrompt}
            disabled={!selectedConsole}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: copied ? "#4ade8018" : `${accentColor}18`,
              border: `1px solid ${copied ? "#4ade80" : accentColor + "66"}`,
              color: copied ? "#4ade80" : accentColor,
              fontFamily: "var(--font)", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.06em", padding: "9px 16px", borderRadius: 6,
              cursor: selectedConsole ? "pointer" : "default",
              opacity: selectedConsole ? 1 : 0.4,
              transition: "all 0.15s",
            }}
          >
            {copied ? <><Check size={13} /> COPIED!</> : <><Copy size={13} /> COPY PROMPT</>}
          </button>

          <PasteImporter
            consoleId={selectedConsoleId || null}
            consoleName={fullConsoleName ?? ""}
            listType={listType}
            companyColor={accentColor}
            onImported={onImported}
          />
        </div>
      </div>
    </div>
  );
}

// ── Paste-back importer ───────────────────────────────────────────────────────

function PasteImporter({ consoleId, consoleName, listType, companyColor, onImported }: {
  consoleId: string | null;
  consoleName: string;
  listType?: string;
  companyColor: string;
  onImported: () => void;
}) {
  const [text,    setText]    = useState("");
  const [status,  setStatus]  = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleImport() {
    if (!consoleId) { setStatus("error"); setMessage("Please select a console first."); return; }
    if (!text.trim()) { setStatus("error"); setMessage("Paste the JSON response above."); return; }
    try {
      const clean = text.replace(/```json|```/gi, "").trim();
      const parsed = JSON.parse(clean) as Array<{ title: string; note?: string; genres?: string[] }>;
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
      let count = 0;
      for (const game of parsed) {
        if (!game.title) continue;
        // Build a stable list id from console + list type so all games from
        // this import share a list and appear as a named tab in the sidebar
        const slug = (listType ?? "custom").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const listId    = `ai-${consoleId}-${slug}`;
        const listLabel = listType
          ? `${listType.charAt(0).toUpperCase()}${listType.slice(1)} — ${consoleName}`
          : `AI Import — ${consoleName}`;
        await addExclusive({
          console_id:  consoleId,
          title:       game.title.trim(),
          publisher:   "",
          note:        game.note?.trim() ?? "",
          genres:      Array.isArray(game.genres) ? game.genres : [],
          owned:       false,
          user_added:  true,
          list_id:     listId,
          list_label:  listLabel,
        });
        count++;
      }
      setStatus("success");
      setMessage(`✓ Imported ${count} game${count !== 1 ? "s" : ""} to ${consoleName}`);
      setText("");
      setTimeout(onImported, 1500);
    } catch (e) {
      setStatus("error");
      setMessage(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
        PASTE AI RESPONSE HERE
      </div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setStatus("idle"); }}
        rows={6}
        placeholder={`[\n  {\n    "title": "Game Name",\n    "note": "Why it's notable",\n    "genres": ["Action"]\n  }\n]`}
        style={{
          width: "100%", background: "var(--bg-card)",
          border: `1px solid ${status === "error" ? "#f87171" : status === "success" ? "#4ade80" : "var(--border-lit)"}`,
          color: "var(--text)", fontFamily: "var(--font)", fontSize: 11,
          padding: "8px 10px", borderRadius: 5, resize: "vertical", outline: "none", lineHeight: 1.5,
        }}
      />
      {message && (
        <div style={{ fontSize: 11, marginTop: 5, color: status === "error" ? "#f87171" : "#4ade80" }}>
          {message}
        </div>
      )}
      <button
        onClick={handleImport}
        disabled={!text.trim() || !consoleId}
        style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 8,
          background: companyColor + "18", border: `1px solid ${companyColor}66`, color: companyColor,
          fontFamily: "var(--font)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          padding: "7px 16px", borderRadius: 4,
          cursor: (!text.trim() || !consoleId) ? "default" : "pointer",
          opacity: (!text.trim() || !consoleId) ? 0.4 : 1, transition: "all 0.15s",
        }}
      >
        <Download size={12} /> IMPORT FROM AI
      </button>
    </div>
  );
}
