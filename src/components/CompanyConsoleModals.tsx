import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { addCompany } from "../db";

// ── Colour presets ────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  "#e4000f", "#2f6bcc", "#22b422", "#17a2b8",
  "#ff6b35", "#9b59b6", "#e67e22", "#1abc9c",
  "#e91e63", "#607d8b", "#ff9800", "#795548",
];

interface AddCompanyProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddCompanyModal({ onClose, onAdded }: AddCompanyProps) {
  const [name,   setName]   = useState("");
  const [color,  setColor]  = useState("#888888");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit() {
    const n = name.trim();
    if (!n) { setError("Company name is required."); return; }
    setSaving(true);
    try {
      await addCompany({ name: n, color, order: 99, custom: true });
      onAdded();
      onClose();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalBox title="ADD COMPANY" onClose={onClose}>
        <Field label="NAME">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. Atari"
            style={inputStyle(!!error)}
          />
        </Field>

        <Field label="BRAND COLOUR">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: 4,
                  background: c, border: `2px solid ${color === c ? "white" : "transparent"}`,
                  cursor: "pointer", flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ width: 36, height: 28, border: "none", background: "none", cursor: "pointer", padding: 0 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font)" }}>{color}</span>
            <div style={{ width: 28, height: 20, borderRadius: 3, background: color }} />
          </div>
        </Field>

        {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}

        <ModalFooter onCancel={onClose} onSubmit={handleSubmit} saving={saving} label="ADD COMPANY" />
      </ModalBox>
    </Overlay>
  );
}

// ── Add Console Modal ─────────────────────────────────────────────────────────

import { addConsole, ensureCompany } from "../db";
import type { Company } from "../types";
import { useMemo } from "react";
import { Search } from "lucide-react";
import { CONSOLE_CATALOG, CATALOG_COMPANIES } from "../data/consoleCatalog";
import { BUILT_IN_COMPANIES } from "../types";

interface AddConsoleProps {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddConsoleModal({ companies, defaultCompanyId, onClose, onAdded }: AddConsoleProps) {
  const [mode, setMode] = useState<"catalogue" | "custom">("catalogue");
  const catalogScrollRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());




  // Filter catalogue — exclude already-added consoles
  const catalogueItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CONSOLE_CATALOG.filter(c => {
      if (added.has(c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.short_name.toLowerCase().includes(q) ||
        c.company_name.toLowerCase().includes(q)
      );
    });
  }, [search, added]);

  // Group catalogue by company
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; color: string; consoles: typeof CONSOLE_CATALOG }>();
    for (const c of catalogueItems) {
      if (!map.has(c.company_id)) {
        const builtin = BUILT_IN_COMPANIES.find(co => co.id === c.company_id);
        const cat = CATALOG_COMPANIES[c.company_id];
        map.set(c.company_id, {
          name:     builtin?.name ?? cat?.name ?? c.company_name,
          color:    builtin?.color ?? cat?.color ?? "#888888",
          consoles: [],
        });
      }
      map.get(c.company_id)!.consoles.push(c);
    }
    return [...map.entries()]
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => {
        // Built-in companies first
        const ai = BUILT_IN_COMPANIES.findIndex(c => c.id === a.id);
        const bi = BUILT_IN_COMPANIES.findIndex(c => c.id === b.id);
        if (ai >= 0 && bi >= 0) return ai - bi;
        if (ai >= 0) return -1;
        if (bi >= 0) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [catalogueItems]);

  // Colour-tracking scrollbar — thumb colour follows the active company
  useEffect(() => {
    const el = catalogScrollRef.current;
    if (!el) return;
    const styleId = "catalogue-scrollbar";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

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
      // If no header has scrolled past yet, use the first one's colour
      const firstHeader = el.querySelector<HTMLElement>("[data-company-color]");
      const fallback = firstHeader?.getAttribute("data-company-color") ?? "var(--border-lit)";
      const color = active ?? fallback;
      if (styleEl) {
        styleEl.textContent = `
          .catalogue-scroll::-webkit-scrollbar { width: 4px; }
          .catalogue-scroll::-webkit-scrollbar-track { background: transparent; }
          .catalogue-scroll::-webkit-scrollbar-thumb { background: ${color}; border-radius: 3px; transition: background 0.3s; }
        `;
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [groups]);

  async function handleAddCatalogue(catalogId: string) {
    const entry = CONSOLE_CATALOG.find(c => c.id === catalogId);
    if (!entry) return;
    setAdding(catalogId);
    try {
      // Ensure company exists
      const builtin = BUILT_IN_COMPANIES.find(c => c.id === entry.company_id);
      if (!builtin) {
        const cat = CATALOG_COMPANIES[entry.company_id];
        if (cat) await ensureCompany(entry.company_id, cat.name, cat.color);
      }
      // Add with canonical ID so art lookup works
      await addConsole({
        company_id:   entry.company_id,
        name:         entry.name,
        short_name:   entry.short_name,
        generation:   entry.generation,
        release_year: entry.release_year,
        order:        99,
        custom:       true,
      }, entry.id);
      setAdded(prev => new Set([...prev, catalogId]));
      onAdded();
    } catch (e) {
      console.error("Failed to add console:", e);
    } finally {
      setAdding(null);
    }
  }



  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-lit)",
        borderRadius: 10,
        width: "min(560px, 95vw)",
        maxHeight: "min(680px, 90vh)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)" }}>
            ADD CONSOLE
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {([
            { key: "catalogue", label: "FROM CATALOGUE" },
            { key: "custom",    label: "CUSTOM" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setMode(tab.key)} style={{
              flex: 1, padding: "10px 16px",
              background: mode === tab.key ? "var(--accent)0e" : "transparent",
              border: "none",
              borderBottom: `2px solid ${mode === tab.key ? "var(--accent)" : "transparent"}`,
              color: mode === tab.key ? "var(--accent)" : "var(--text-dim)",
              fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Catalogue mode ── */}
        {mode === "catalogue" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                autoFocus
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search consoles…"
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
            </div>

            {/* List */}
            <div ref={catalogScrollRef} className="catalogue-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 14px 12px" }}>
              {groups.length === 0 && (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  {search ? `No results for "${search}"` : "All catalogue consoles already added!"}
                </div>
              )}
              {groups.map(({ id: compId, name: compName, color, consoles }) => (
                <div key={compId} style={{ marginBottom: 16 }}>
                  <div
                    data-company-color={color}
                    style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                    color, marginBottom: 6,
                    display: "flex", alignItems: "center", gap: 8,
                    position: "sticky", top: 0, zIndex: 2,
                    background: "var(--bg-surface)",
                    padding: "6px 0",
                  }}>
                    {compName.toUpperCase()}
                    <div style={{ flex: 1, height: 1, background: `${color}22` }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {consoles.map(con => {
                      const isAdded   = added.has(con.id);
                      const isAdding  = adding === con.id;
                      return (
                        <div key={con.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px",
                          background: isAdded ? `${color}08` : "var(--bg-card)",
                          border: `1px solid ${isAdded ? color + "33" : "var(--border)"}`,
                          borderRadius: 6,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isAdded ? "var(--text-muted)" : "var(--text)" }}>
                              {con.name}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                              {con.release_year} · Gen {con.generation}
                            </div>
                          </div>
                          <button
                            onClick={() => !isAdded && handleAddCatalogue(con.id)}
                            disabled={isAdding || isAdded}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "4px 10px", borderRadius: 4,
                              background: isAdded ? `${color}14` : "var(--bg-surface)",
                              border: `1px solid ${isAdded ? color + "44" : color + "66"}`,
                              color: isAdded ? color : color,
                              fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
                              letterSpacing: "0.06em",
                              cursor: isAdded ? "default" : "pointer",
                              opacity: isAdding ? 0.5 : 1,
                              transition: "all 0.15s", whiteSpace: "nowrap",
                            }}
                          >
                            {isAdded ? "✓ ADDED" : isAdding ? "…" : <><Plus size={10} /> ADD</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: "8px 14px", borderTop: "1px solid var(--border)",
              fontSize: 10, color: "var(--text-muted)", flexShrink: 0,
            }}>
              Console not listed?{" "}
              <button onClick={() => setMode("custom")} style={{
                background: "none", border: "none", color: "var(--accent)",
                fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
                cursor: "pointer", padding: 0,
              }}>
                Add a custom console →
              </button>
            </div>
          </div>
        )}

        {/* ── Custom mode ── */}
        {mode === "custom" && (
          <CustomConsoleForm
            companies={companies}
            defaultCompanyId={defaultCompanyId}
            onClose={onClose}
            onAdded={onAdded}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Custom Console Form (with inline company creation) ────────────────────────

function CustomConsoleForm({ companies, defaultCompanyId, onClose, onAdded }: {
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [companyMode, setCompanyMode] = useState<"existing" | "new">(
    companies.length === 0 ? "new" : "existing"
  );
  const [companyId,    setCompanyId]    = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [newCompName,  setNewCompName]  = useState("");
  const [newCompColor, setNewCompColor] = useState("#888888");
  const [name,         setName]         = useState("");
  const [shortName,    setShortName]    = useState("");
  const [year,         setYear]         = useState(new Date().getFullYear().toString());
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  async function handleSubmit() {
    const n = name.trim();
    const s = shortName.trim();
    if (!n) { setError("Console name is required."); return; }
    if (!s) { setError("Short name is required."); return; }

    let targetCompanyId = companyId;

    if (companyMode === "new") {
      const cn = newCompName.trim();
      if (!cn) { setError("Company name is required."); return; }
      // Generate a stable ID from the name
      targetCompanyId = await addCompany({ name: cn, color: newCompColor, order: 99, custom: true });
    }

    if (!targetCompanyId) { setError("Select or create a company."); return; }
    setSaving(true);
    try {
      await addConsole({
        company_id:   targetCompanyId,
        name:         n,
        short_name:   s,
        generation:   0,
        release_year: parseInt(year) || 0,
        order:        99,
        custom:       true,
      });
      onAdded();
      onClose();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
        For consoles not in the catalogue. Box art auto-search won't work — use the catalogue tab for supported platforms.
      </div>

      {/* Company section */}
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-dim)", display: "block", marginBottom: 8 }}>
          COMPANY
        </span>

        {/* Toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {([
            { key: "existing", label: "Existing" },
            { key: "new",      label: "Create new" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setCompanyMode(opt.key)}
              disabled={opt.key === "existing" && companies.length === 0}
              style={{
                padding: "4px 12px", borderRadius: 5,
                background: companyMode === opt.key ? "var(--accent)18" : "var(--bg-card)",
                border: `1px solid ${companyMode === opt.key ? "var(--accent)66" : "var(--border)"}`,
                color: companyMode === opt.key ? "var(--accent)" : "var(--text-dim)",
                fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.06em", cursor: "pointer",
                transition: "all 0.12s",
                opacity: opt.key === "existing" && companies.length === 0 ? 0.3 : 1,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {companyMode === "existing" ? (
          <select
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            style={{ ...inputStyle(false), appearance: "none" as any }}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              autoFocus
              type="text" value={newCompName}
              onChange={e => { setNewCompName(e.target.value); setError(""); }}
              placeholder="e.g. Atari"
              style={inputStyle(false)}
            />
            {/* Colour picker */}
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                BRAND COLOUR
              </span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewCompColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: 4,
                      background: c,
                      border: `2px solid ${newCompColor === c ? "white" : "transparent"}`,
                      cursor: "pointer", flexShrink: 0,
                      boxShadow: newCompColor === c ? `0 0 0 1px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color" value={newCompColor}
                  onChange={e => setNewCompColor(e.target.value)}
                  style={{ width: 32, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                />
                <div style={{ width: 24, height: 18, borderRadius: 3, background: newCompColor, border: "1px solid var(--border)" }} />
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font)" }}>{newCompColor}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Console fields */}
      <Field label="CONSOLE NAME">
        <input
          autoFocus={companyMode === "existing"}
          type="text" value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Atari 2600"
          style={inputStyle(!!error)}
        />
      </Field>

      <Field label="SHORT NAME (shown in sidebar)">
        <input type="text" value={shortName}
          onChange={e => setShortName(e.target.value)}
          placeholder="e.g. 2600" maxLength={12}
          style={inputStyle(false)} />
      </Field>

      <Field label="RELEASE YEAR">
        <input type="number" value={year}
          onChange={e => setYear(e.target.value)}
          min={1970} max={2030}
          style={{ ...inputStyle(false), width: 120 }} />
      </Field>

      {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}

      <ModalFooter onCancel={onClose} onSubmit={handleSubmit} saving={saving} label="ADD CONSOLE" />
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function ModalBox({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-lit)",
      borderRadius: 8,
      width: 380,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)" }}>
          {title}
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
        >
          <X size={15} />
        </button>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-dim)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function ModalFooter({ onCancel, onSubmit, saving, label }: {
  onCancel: () => void; onSubmit: () => void; saving: boolean; label: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
      <button className="btn" onClick={onCancel}>CANCEL</button>
      <button
        className="btn primary"
        onClick={onSubmit}
        disabled={saving}
        style={{ opacity: saving ? 0.5 : 1 }}
      >
        <Plus size={12} />
        {saving ? "SAVING…" : label}
      </button>
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    background: "var(--bg-card)",
    border: `1px solid ${hasError ? "#f87171" : "var(--border-lit)"}`,
    color: "var(--text)",
    fontFamily: "var(--font)",
    fontSize: 13,
    padding: "7px 10px",
    borderRadius: 4,
    outline: "none",
    width: "100%",
  };
}
