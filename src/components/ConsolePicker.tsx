import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { SidebarCompany } from "../hooks/useSidebar";

interface Props {
  companies: SidebarCompany[];
  activeCompanyId: string | null;
  activeConsoleId: string | null;
  onSelectConsole: (companyId: string, consoleId: string) => void;
}

export default function ConsolePicker({
  companies, activeCompanyId, activeConsoleId, onSelectConsole,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const activeConsole = activeCompany?.consoles.find(c => c.id === activeConsoleId);
  const color = activeCompany?.color ?? "var(--text-dim)";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        flexShrink: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        zIndex: 20,
      }}
    >
      {/* Trigger bar */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 14px",
          background: "none",
          border: "none",
          borderLeft: `3px solid ${color}`,
          cursor: "pointer",
          fontFamily: "var(--font)",
          transition: "background 0.15s",
        }}
      >
        {/* Company dot */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }} />

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          {activeCompany && activeConsole ? (
            <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: "0.06em" }}>
              {activeCompany.name}
              <span style={{ color: "var(--text-dim)", fontWeight: 400, margin: "0 6px" }}>›</span>
              {activeConsole.short_name}
              {activeConsole.romCount > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 4,
                  background: color + "22", color, border: `1px solid ${color}44`,
                }}>
                  {activeConsole.romCount}
                </span>
              )}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Select a console…</span>
          )}
        </div>

        <ChevronDown
          size={14}
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-lit)",
          borderTop: "none",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          maxHeight: "60vh",
          overflowY: "auto",
          zIndex: 100,
        }}>
          {companies.map(company => {
            return (
              <div key={company.id}>
                {/* Company heading */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px 5px",
                  background: `linear-gradient(100deg, ${company.color}18 0%, transparent 60%)`,
                  borderLeft: `3px solid ${company.color}`,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: company.color,
                  }}>
                    {company.name.toUpperCase()}
                  </span>
                </div>

                {/* Console buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 10px 8px" }}>
                  {company.consoles.map(con => {
                    const isActive = con.id === activeConsoleId;
                    return (
                      <button
                        key={con.id}
                        onClick={() => {
                          onSelectConsole(company.id, con.id);
                          setOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 10px",
                          borderRadius: 5,
                          border: `1px solid ${isActive ? company.color : "var(--border-lit)"}`,
                          background: isActive
                            ? `linear-gradient(90deg, ${company.color}25, ${company.color}10)`
                            : "var(--bg-card)",
                          color: isActive ? company.color : "var(--text-dim)",
                          fontFamily: "var(--font)",
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 400,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          animation: "rowFadeIn 0.15s ease both",
                        }}
                      >
                        {isActive && (
                          <div style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: company.color,
                            flexShrink: 0,
                          }} />
                        )}
                        {con.short_name}
                        {con.romCount > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            padding: "0 4px", borderRadius: 3,
                            background: isActive ? company.color + "30" : company.color + "15",
                            color: isActive ? company.color : company.color + "99",
                          }}>
                            {con.romCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
