import React, { useState, useEffect } from "react";
import { Search, Plus, List, ArrowUpDown, Star, Zap } from "lucide-react";
import Tooltip from "../components/Tooltip";
import { useExclusives } from "../hooks/useExclusives";
import ExclusivesSidebar from "../components/ExclusivesSidebar";
import ExclusiveRow from "../components/ExclusiveRow";
import AddExclusiveForm from "../components/AddExclusiveForm";
import ListPickerModal from "../components/ListPickerModal";
import { BUILT_IN_COMPANIES } from "../types";

export default function ExclusivesTab() {
  const exc = useExclusives();
  const [showAdd, setShowAdd]               = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null); // list id to delete

  const activeStats  = exc.activeStats;
  const company      = activeStats
    ? BUILT_IN_COMPANIES.find(c => c.id === activeStats.console.company_id)
    : null;
  const companyColor = company?.color ?? "var(--tab-exclusives)";

  // Inject company-coloured scrollbar for the main exclusives list
  useEffect(() => {
    const styleId = "exclusives-content-scroll";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `
      .excl-content-scroll::-webkit-scrollbar { width: 5px; }
      .excl-content-scroll::-webkit-scrollbar-track { background: transparent; }
      .excl-content-scroll::-webkit-scrollbar-thumb { background: ${companyColor}88; border-radius: 3px; transition: background 0.3s; }
      .excl-content-scroll::-webkit-scrollbar-thumb:hover { background: ${companyColor}; }
    `;
    return () => { if (el) el.textContent = ""; };
  }, [companyColor]);
  const consoleName  = activeStats
    ? `${company?.name ?? ""} - ${activeStats.console.name}`
    : "";

  const activeListTab = exc.availableLists.find(l => l.id === exc.activeListId)
    ?? exc.availableLists[0];
  const pct = activeListTab && activeListTab.count > 0
    ? Math.round((activeListTab.owned / activeListTab.count) * 100)
    : 0;

  const gold = "var(--tab-exclusives)";

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <ExclusivesSidebar
        allStats={exc.allStats}
        activeConsoleId={exc.activeConsoleId}
        onSelect={id => { exc.setActiveConsoleId(id); setShowAdd(false); }}
      />

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Section header ── */}
        <div className="section-header" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="section-title" style={{ color: companyColor }}>
            {activeStats ? consoleName.toUpperCase() : "EXCLUSIVES"}
          </span>

          <div style={{ flex: 1 }} />

          {/* Stats */}
          {activeListTab && (
            <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>
              {activeListTab.owned}/{activeListTab.count} owned · {pct}%
            </span>
          )}

          {/* GAPS MODE toggle */}
          {exc.activeConsoleId && activeListTab && activeListTab.count > 0 && (
            <button
              className="btn"
              onClick={() => exc.setMode(exc.mode === "GAPS" ? "ALL" : "GAPS")}
              style={{
                borderColor: exc.mode === "GAPS" ? companyColor : "var(--border-lit)",
                color: exc.mode === "GAPS" ? companyColor : "var(--text-dim)",
                background: exc.mode === "GAPS" ? `${companyColor}14` : "transparent",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              <Zap size={11} /> {exc.mode === "GAPS" ? "GAPS ON" : "GAPS"}
            </button>
          )}

          {/* ADD LIST */}
          <button
            className="btn"
            style={{ borderColor: gold, color: gold, flexShrink: 0 }}
            onClick={() => setShowListPicker(true)}
          >
            <List size={12} /> ADD LIST
          </button>

          {/* ADD GAME */}
          {exc.activeConsoleId && (
            <button
              className="btn"
              style={{ borderColor: companyColor, color: companyColor, flexShrink: 0 }}
              onClick={() => setShowAdd(p => !p)}
            >
              <Plus size={11} />
              {showAdd ? "CANCEL" : "ADD GAME"}
            </button>
          )}
        </div>



        {/* ── List tabs with progress bars ── */}
        {exc.availableLists.length > 1 && (
          <div style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
            overflowX: "auto",
            flexShrink: 0,
          }}>
            {exc.availableLists.map(tab => {
              const isActive = exc.activeListId === tab.id;
              const tabPct = tab.count > 0 ? (tab.owned / tab.count) : 0;
              return (
                <React.Fragment key={tab.id}>
                {confirmDelete === tab.id ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "0 10px",
                    background: "#f8717114",
                    borderBottom: "2px solid #f87171",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Remove "{tab.label}"?
                    </span>
                    <button
                      onClick={async () => {
                        await exc.deleteList(exc.activeConsoleId!, tab.id);
                        setConfirmDelete(null);
                      }}
                      style={{
                        background: "#f87171", border: "none", color: "#fff",
                        fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                        padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{
                        background: "none", border: "1px solid var(--border-lit)", color: "var(--text-dim)",
                        fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                        padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                      }}
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <div style={{ position: "relative", display: "flex", alignItems: "stretch", flexShrink: 0 }}>
                    <button
                      onClick={() => { exc.setActiveListId(tab.id); exc.setGenreFilter("all"); }}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-start",
                        padding: "8px 12px 0",
                        background: isActive ? `${companyColor}0e` : "transparent",
                        border: "none",
                        color: isActive ? companyColor : "var(--text-dim)",
                        fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.06em", cursor: "pointer",
                        transition: "all 0.15s", whiteSpace: "nowrap",
                        position: "relative", minWidth: 0,
                      }}
                    >
                      <span style={{ marginBottom: 3 }}>{tab.label}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 400,
                        color: isActive ? companyColor + "aa" : "var(--text-muted)",
                        marginBottom: 6,
                      }}>
                        {tab.owned}/{tab.count}
                      </span>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "var(--border)" }}>
                        <div style={{
                          height: "100%", width: `${tabPct * 100}%`,
                          background: isActive ? companyColor : companyColor + "55",
                          boxShadow: isActive ? `0 0 6px ${companyColor}` : "none",
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </button>

                    {/* X button — only on deletable lists (not ALL or CUSTOM) */}
                    {tab.id !== "all" && (
                      <Tooltip content="Remove this list" color="#f87171">
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(tab.id); exc.setActiveListId(tab.id); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 18, alignSelf: "flex-start", marginTop: 8, marginRight: 4,
                          background: "none", border: "none", cursor: "pointer",
                          color: isActive ? companyColor + "88" : "var(--text-muted)",
                          fontSize: 13, lineHeight: 1, padding: 0,
                          transition: "color 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseOver={e => (e.currentTarget.style.color = "#f87171")}
                        onMouseOut={e => (e.currentTarget.style.color = isActive ? companyColor + "88" : "var(--text-muted)")}
                      >
                        ×
                      </button>
                      </Tooltip>
                    )}
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Add game form */}
        {showAdd && exc.activeConsoleId && (
          <AddExclusiveForm
            consoleId={exc.activeConsoleId}
            companyColor={companyColor}
            onAdd={async item => { await exc.insertExclusives([item]); }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {/* ── Genre + Sort controls ── */}
        {exc.activeConsoleId && (exc.availableGenres.length > 0 || true) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            padding: "5px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}>
            {/* Genre pills */}
            {exc.availableGenres.length > 0 && (
              <>
                {["all", ...exc.availableGenres].map(g => (
                  <button key={g} onClick={() => exc.setGenreFilter(g)} style={{
                    background: "none",
                    border: `1px solid ${exc.genreFilter === g ? companyColor : "transparent"}`,
                    color: exc.genreFilter === g ? companyColor : "var(--text-dim)",
                    fontFamily: "var(--font)", fontSize: 9, fontWeight: 600,
                    padding: "2px 7px", borderRadius: 10, cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {g}
                  </button>
                ))}
                <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />
              </>
            )}

            {/* Sort */}
            <ArrowUpDown size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            {([
              { key: "alpha",         label: "A–Z" },
              { key: "unowned-first", label: "UNOWNED FIRST" },
              { key: "owned-first",   label: "OWNED FIRST" },
            ] as const).map(opt => (
              <button key={opt.key} onClick={() => exc.setSortKey(opt.key)} style={{
                background: exc.sortKey === opt.key ? `${companyColor}18` : "none",
                border: `1px solid ${exc.sortKey === opt.key ? companyColor + "55" : "transparent"}`,
                borderRadius: 4,
                color: exc.sortKey === opt.key ? companyColor : "var(--text-dim)",
                fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                letterSpacing: "0.06em", padding: "2px 8px",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {opt.label}
              </button>
            ))}

            {/* Search */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={11} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
              <input
                type="text"
                value={exc.searchFilter}
                onChange={e => exc.setSearchFilter(e.target.value)}
                placeholder="Search…"
                style={{
                  background: "none", border: "none", color: "var(--text)",
                  fontFamily: "var(--font)", fontSize: 12, outline: "none",
                  width: exc.searchFilter ? 140 : 80,
                  transition: "width 0.2s",
                }}
              />
              {exc.searchFilter && (
                <button onClick={() => exc.setSearchFilter("")}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Content area ── */}
        <div className="app-content excl-content-scroll">

          {/* Welcome — nothing selected */}
          {!exc.loading && !exc.activeConsoleId && (
            <ExclusivesWelcome onAddList={() => setShowListPicker(true)} />
          )}

          {/* Loading */}
          {exc.loading && (
            <div className="empty-state">
              <span style={{ color: gold, fontSize: 10, letterSpacing: "0.1em" }}>LOADING…</span>
            </div>
          )}

          {/* Empty console — no lists yet */}
          {!exc.loading && exc.activeConsoleId && !activeListTab && (
            <div className="empty-state">
              <Star size={28} style={{ color: "var(--text-muted)" }} />
              <p>No lists imported for {consoleName} yet.</p>
              <button className="btn" style={{ borderColor: gold, color: gold }}
                onClick={() => setShowListPicker(true)}>
                <List size={12} /> ADD LIST
              </button>
            </div>
          )}

          {/* Empty — filters/gaps */}
          {!exc.loading && exc.activeConsoleId && activeListTab && exc.filteredExclusives.length === 0 && (
            <div className="empty-state">
              {exc.mode === "GAPS"
                ? <>
                    <span style={{ fontSize: 32 }}>🎉</span>
                    <p style={{ fontWeight: 700, color: companyColor }}>You own everything!</p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      No gaps in this list — your collection is complete.
                    </p>
                    <button className="btn" onClick={() => exc.setMode("ALL")}>
                      VIEW ALL GAMES
                    </button>
                  </>
                : <p>No games match your current filters.</p>
              }
            </div>
          )}

          {/* Rows */}
          {!exc.loading && exc.filteredExclusives.map((e, i) => (
            <ExclusiveRow
              key={e.id}
              exclusive={e}
              companyColor={companyColor}
              mode={exc.mode}
              onToggleOwned={exc.toggleOwned}
              onDelete={exc.removeExclusive}
              animDelay={Math.min(i * 18, 300)}
            />
          ))}
        </div>
      </div>

      {showListPicker && (
        <ListPickerModal
          activeConsoleId={exc.activeConsoleId}
          onImport={async list => { await exc.importList(list); }}
          onClose={() => setShowListPicker(false)}
        />
      )}
    </div>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────

function ExclusivesWelcome({ onAddList }: { onAddList: () => void }) {
  const gold = "var(--tab-exclusives)";
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 32px", gap: 28, textAlign: "center",
    }}>
      {/* Icon */}
      <div style={{
        width: 68, height: 68, borderRadius: 16,
        background: `linear-gradient(135deg, ${gold}33 0%, ${gold}11 100%)`,
        border: `1px solid ${gold}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 40px ${gold}22`,
      }}>
        <Star size={30} color={gold} />
      </div>

      {/* Title */}
      <div>
        <h2 style={{
          margin: "0 0 8px", fontSize: 20, fontWeight: 800,
          letterSpacing: "0.1em", color: "var(--text)", fontFamily: "var(--font)",
        }}>
          EXCLUSIVES <span style={{ color: gold }}>TRACKER</span>
        </h2>
        <p style={{
          margin: 0, fontSize: 12, color: "var(--text-dim)",
          lineHeight: 1.7, maxWidth: 380,
        }}>
          Track must-play games that are exclusive to each console — the ones
          you can't get anywhere else. Import curated lists or build your own.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onAddList}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "11px 24px", borderRadius: 6,
          background: `${gold}18`,
          border: `1px solid ${gold}66`,
          color: gold,
          fontFamily: "var(--font)", fontSize: 12, fontWeight: 700,
          letterSpacing: "0.08em", cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <List size={14} /> BROWSE CURATED LISTS
      </button>

      {/* Feature hints */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12, width: "100%", maxWidth: 460,
      }}>
        {[
          { icon: "📋", label: "Curated Lists", desc: "Pre-made lists for every major console" },
          { icon: "⚡", label: "Gaps Mode",     desc: "See only what you still need to find" },
          { icon: "🤖", label: "AI Prompt",     desc: "Generate custom lists with any AI assistant" },
        ].map(item => (
          <div key={item.label} style={{
            padding: "14px 10px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
          }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em" }}>
              {item.label}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
