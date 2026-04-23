import { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { X, Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
import { CONSOLE_CATALOG, CATALOG_COMPANIES } from "../data/consoleCatalog";
import { BUILT_IN_COMPANIES } from "../types";
import { addConsole, ensureCompany } from "../db";


interface Props {
  existingConsoleIds: Set<string>;
  existingCompanyIds: Set<string>;
  onAdded: () => void;
  onClose: () => void;
}

export default function ConsoleCatalogModal({
  existingConsoleIds, existingCompanyIds: _existingCompanyIds, onAdded, onClose,
}: Props) {
  const [search,   setSearch]   = useState("");
  const [adding,   setAdding]   = useState<string | null>(null); // console id being added
  const [added,    setAdded]    = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["atari", "nec", "snk"]));

  // Filter catalog to consoles not already in the app
  const available = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CONSOLE_CATALOG.filter(c => {
      if (existingConsoleIds.has(c.id) || added.has(c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.short_name.toLowerCase().includes(q) ||
        c.company_name.toLowerCase().includes(q)
      );
    });
  }, [search, existingConsoleIds, added]);

  // Group by company
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; color: string; consoles: typeof CONSOLE_CATALOG }>();
    for (const c of available) {
      if (!map.has(c.company_id)) {
        const builtin = BUILT_IN_COMPANIES.find(co => co.id === c.company_id);
        const catalog  = CATALOG_COMPANIES[c.company_id];
        map.set(c.company_id, {
          name:     builtin?.name  ?? catalog?.name  ?? c.company_name,
          color:    builtin?.color ?? catalog?.color ?? "#888888",
          consoles: [],
        });
      }
      map.get(c.company_id)!.consoles.push(c);
    }
    return [...map.entries()]
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [available]);

  function toggleGroup(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd(catalogId: string) {
    const entry = CONSOLE_CATALOG.find(c => c.id === catalogId);
    if (!entry) return;
    setAdding(catalogId);

    try {
      // Ensure company exists -- create with fixed id if catalog-only
      const builtin = BUILT_IN_COMPANIES.find(c => c.id === entry.company_id);
      if (!builtin) {
        const cat = CATALOG_COMPANIES[entry.company_id];
        if (cat) await ensureCompany(entry.company_id, cat.name, cat.color);
      }

      await addConsole({
        company_id:   entry.company_id,
        name:         entry.name,
        short_name:   entry.short_name,
        generation:   entry.generation,
        release_year: entry.release_year,
        order:        99,
        custom:       true,
      }, entry.id); // pass canonical ID so art lookup works

      setAdded(prev => new Set([...prev, catalogId]));
      onAdded();
    } catch (e) {
      console.error("Failed to add catalog console:", e);
    } finally {
      setAdding(null);
    }
  }

  const modal = (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 700,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-lit)",
        borderRadius: 10,
        width: "min(620px, 100%)",
        maxHeight: "min(700px, 90vh)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--tab-guide)" }}>
              ADD CONSOLE FROM CATALOG
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              {available.length} platform{available.length !== 1 ? "s" : ""} available — includes emulation guide data
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{
              position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", pointerEvents: "none",
            }} />
            <input
              autoFocus
              type="text"
              placeholder="Search consoles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 5, color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {groups.length === 0 && (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              fontSize: 12, color: "var(--text-muted)",
            }}>
              {search ? `No results for "${search}"` : "All catalog consoles already added!"}
            </div>
          )}

          {groups.map(group => (
            <div key={group.id}>
              {/* Company header */}
              <button
                onClick={() => toggleGroup(group.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 16px", background: "none", border: "none", cursor: "pointer",
                  borderBottom: `1px solid ${group.color}22`,
                }}
              >
                {expanded.has(group.id)
                  ? <ChevronDown size={11} style={{ color: group.color, flexShrink: 0 }} />
                  : <ChevronRight size={11} style={{ color: group.color, flexShrink: 0 }} />
                }
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: group.color }}>
                  {group.name.toUpperCase()}
                </span>
                <div style={{ flex: 1, height: 1, background: `${group.color}22` }} />
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                  {group.consoles.length}
                </span>
              </button>

              {/* Console rows */}
              {expanded.has(group.id) && group.consoles.map(c => {
                const isAdding = adding === c.id;
                const isDone   = added.has(c.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "7px 16px 7px 32px",
                      borderBottom: "1px solid var(--border)",
                      gap: 12,
                    }}
                  >
                    {/* Year badge */}
                    <span style={{
                      fontSize: 9, color: "var(--text-muted)",
                      minWidth: 32, textAlign: "right", flexShrink: 0,
                    }}>
                      {c.release_year}
                    </span>

                    {/* Names */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
                        {c.guide.primary_emulator_desktop}
                        {c.guide.recommended_formats.length > 0 && (
                          <span style={{ marginLeft: 8, color: "var(--text-muted)", opacity: 0.7 }}>
                            {c.guide.recommended_formats.slice(0, 3).join(" ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Gen badge */}
                    {c.generation > 0 && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
                        padding: "2px 5px", borderRadius: 3,
                        background: `${group.color}18`, color: group.color,
                        flexShrink: 0,
                      }}>
                        GEN {c.generation}
                      </span>
                    )}

                    {/* Add button */}
                    <button
                      onClick={() => !isDone && !isAdding && handleAdd(c.id)}
                      disabled={isAdding || isDone}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px",
                        background: isDone ? `${group.color}22` : "transparent",
                        border: `1px solid ${isDone ? group.color + "66" : "var(--border)"}`,
                        borderRadius: 4, cursor: isDone || isAdding ? "default" : "pointer",
                        color: isDone ? group.color : "var(--text-muted)",
                        fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.06em", flexShrink: 0,
                        opacity: isAdding ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {isDone ? "✓ ADDED" : isAdding ? "ADDING…" : <><Plus size={9} /> ADD</>}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        {added.size > 0 && (
          <div style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "var(--tab-guide)" }}>
              {added.size} console{added.size !== 1 ? "s" : ""} added
            </span>
            <button
              onClick={onClose}
              className="btn primary"
              style={{ fontSize: 10, padding: "5px 14px" }}
            >
              DONE
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
