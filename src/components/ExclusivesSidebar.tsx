import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, BookOpen, CheckSquare, List, PlusCircle } from "lucide-react";
import type { ConsoleExclusiveStats } from "../hooks/useExclusives";

interface Props {
  allStats: ConsoleExclusiveStats[];
  activeConsoleId: string | null;
  onSelect: (consoleId: string) => void;
}

export default function ExclusivesSidebar({ allStats, activeConsoleId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHelp, setShowHelp] = useState(false);

  const byCompany = new Map<string, ConsoleExclusiveStats[]>();
  for (const stat of allStats) {
    const cid = stat.console.company_id;
    if (!byCompany.has(cid)) byCompany.set(cid, []);
    byCompany.get(cid)!.push(stat);
  }

  // Colour-tracking scrollbar
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const styleId = "exclusives-sidebar-scroll";
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
          .excl-sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .excl-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .excl-sidebar-scroll::-webkit-scrollbar-thumb { background: ${color}; border-radius: 3px; transition: background 0.3s; }
        `;
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [allStats]);

  return (
    <>
    {showHelp && createPortal(
      <div
        onClick={() => setShowHelp(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "min(500px, 100%)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
            boxShadow: "0 32px 64px rgba(0,0,0,0.35)",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            background: "linear-gradient(135deg, var(--accent)18 0%, transparent 60%)",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "var(--accent)22", border: "1px solid var(--accent)44",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <HelpCircle size={15} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Exclusives</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>How this page works</div>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 6,
              color: "var(--text-dim)", cursor: "pointer", padding: "4px 6px",
              display: "flex", alignItems: "center",
            }}>
              <X size={13} />
            </button>
          </div>

          {/* Cards */}
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                icon: <BookOpen size={14} />,
                color: "#818cf8",
                title: "Curated Game Lists",
                body: "Each console has handpicked lists of its most notable titles — the games that define the platform or are unique to it.",
              },
              {
                icon: <CheckSquare size={14} />,
                color: "#4ade80",
                title: "Track What You Own",
                body: "Check off games you have in your collection. The sidebar shows a live progress bar and owned/total count per console.",
              },
              {
                icon: <List size={14} />,
                color: "#fb923c",
                title: "Multiple Lists per Console",
                body: "Consoles can have several themed lists such as Must-Play or Hidden Gems. Switch between them using the picker above the game list.",
              },
              {
                icon: <PlusCircle size={14} />,
                color: "#f472b6",
                title: "Add Your Own Entries",
                body: "Use the ADD button to include any game not already listed. Custom entries are marked and can be removed at any time.",
              },
            ].map(({ icon, color, title, body }) => (
              <div key={title} style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "12px 14px", borderRadius: 8,
                background: `${color}0a`, border: `1px solid ${color}22`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: `${color}20`, border: `1px solid ${color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color,
                }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.65 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 18px 14px",
            textAlign: "center", fontSize: 10, color: "var(--text-dim)",
          }}>
            Click anywhere outside to close
          </div>
        </div>
      </div>,
      document.body
    )}

    <nav style={{
      width: 250, flexShrink: 0,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      height: "100%",
    }}>
      {/* Help button */}
      <div style={{ padding: "10px 10px 6px", flexShrink: 0 }}>
        <button
          onClick={() => setShowHelp(true)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "8px 10px", borderRadius: 7, cursor: "pointer",
            background: "var(--accent)12",
            border: "1px solid var(--accent)33",
            color: "var(--accent)", fontFamily: "var(--font)", fontSize: 10,
            fontWeight: 700, letterSpacing: "0.08em", transition: "all 0.15s",
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent)22";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)66";
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent)12";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)33";
          }}
        >
          <HelpCircle size={12} />
          WHAT IS THIS PAGE?
        </button>
      </div>

      <div
        ref={scrollRef}
        className="excl-sidebar-scroll"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}
      >
        {[...byCompany.entries()].map(([, stats]) => {
          const company = stats[0].console.company;
          const companyOwned = stats.reduce((s, x) => s + x.ownedCount, 0);
          const companyTotal = stats.reduce((s, x) => s + x.totalCount, 0);
          const companyLists = stats.reduce((s, x) => s + x.listCount, 0);

          return (
            <div key={company.id} style={{
              borderRadius: 8,
              border: `1px solid ${company.color}33`,
              background: `${company.color}08`,
              overflow: "hidden",
            }}>
              {/* Company header — data attr for scroll colour tracking */}
              <div
                data-company-color={company.color}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px",
                  background: `linear-gradient(100deg, ${company.color}22 0%, ${company.color}08 60%, transparent 100%)`,
                  borderBottom: `1px solid ${company.color}22`,
                  borderLeft: `3px solid ${company.color}`,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: company.color }}>
                  {company.name.toUpperCase()}
                </span>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: company.color }}>
                    {companyLists} list{companyLists !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    {companyOwned}/{companyTotal}
                  </span>
                </div>
              </div>

              {/* Console rows */}
              <div style={{ padding: "4px 6px 6px" }}>
                {stats.map(stat => {
                  const isActive = stat.console.id === activeConsoleId;
                  const pct = stat.totalCount > 0
                    ? Math.round((stat.ownedCount / stat.totalCount) * 100)
                    : 0;

                  return (
                    <div
                      key={stat.console.id}
                      onClick={() => onSelect(stat.console.id)}
                      role="button"
                      style={{
                        padding: "6px 8px", borderRadius: 4, cursor: "pointer",
                        borderLeft: `3px solid ${isActive ? company.color : "transparent"}`,
                        background: isActive
                          ? `linear-gradient(90deg, ${company.color}25 0%, ${company.color}08 100%)`
                          : "transparent",
                        marginBottom: 2, transition: "all 0.15s",
                        animation: "slideInRow 0.22s ease both",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: isActive ? "var(--text)" : "var(--text-dim)", fontWeight: isActive ? 700 : 400 }}>
                          {stat.console.short_name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {stat.listCount > 0 && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              padding: "1px 5px", borderRadius: 3,
                              background: isActive ? company.color + "30" : company.color + "15",
                              color: isActive ? company.color : company.color + "99",
                              border: `1px solid ${isActive ? company.color + "55" : company.color + "22"}`,
                            }}>
                              {stat.listCount} {stat.listCount === 1 ? "list" : "lists"}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: isActive ? company.color : "var(--text-muted)" }}>
                            {stat.ownedCount}/{stat.totalCount}
                          </span>
                        </div>
                      </div>

                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${pct}%`, background: company.color, opacity: isActive ? 1 : 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {allStats.length === 0 && (
          <div style={{ padding: "20px 8px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, textAlign: "center" }}>
            No lists yet.<br />Click ADD LIST to get started.
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
