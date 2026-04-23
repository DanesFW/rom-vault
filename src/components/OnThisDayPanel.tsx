import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, Play, ExternalLink } from "lucide-react";
import { getTodaysEntry, type OnThisDayEntry } from "../data/onThisDay";
import { findRomForOnThisDay } from "../db";
import { BUILT_IN_CONSOLES } from "../types";

interface Props {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onNavigateToConsole: (companyId: string, consoleId: string) => void;
  color?: string;
}

export default function OnThisDayPanel({ anchorRef, onClose, onNavigateToConsole, color = "#e4a030" }: Props) {
  const [entry] = useState<OnThisDayEntry | null>(() => getTodaysEntry());
  const [romId, setRomId] = useState<{ id: number; filepath: string; backlog_status: string | null } | null>(null);
  const [checked, setChecked] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Check if user owns this ROM
  useEffect(() => {
    if (!entry) { setChecked(true); return; }
    findRomForOnThisDay(entry.consoleId, entry.title).then(id => {
      setRomId(id);
      setChecked(true);
    });
  }, [entry]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Position below the anchor button
  const anchor = anchorRef.current?.getBoundingClientRect();
  const left   = anchor ? anchor.left : 0;
  const top    = anchor ? anchor.bottom + 6 : 0;

  const console_ = entry ? BUILT_IN_CONSOLES.find(c => c.id === entry.consoleId) : null;
  const companyId = console_?.company_id ?? "";

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const dateLabel = `${MONTHS[now.getMonth()]} ${now.getDate()}`;

  return createPortal(
    <>
      <style>{`
        @keyframes otd-in {
          from { opacity: 0; transform: scale(0.93) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left, top,
        zIndex: 99999,
        width: 300,
        background: "var(--bg-surface)",
        border: `1px solid ${color}44`,
        borderRadius: 10,
        boxShadow: `0 0 0 1px ${color}18, 0 4px 32px rgba(0,0,0,0.55), 0 0 24px ${color}18`,
        fontFamily: "var(--font)",
        overflow: "hidden",
        animation: "otd-in 0.18s ease-out both",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "10px 13px 9px",
        borderBottom: `1px solid ${color}22`,
        background: `${color}0c`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Calendar size={13} style={{ color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: color + "bb" }}>
            ON THIS DAY
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: "0.06em" }}>
            {dateLabel.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 13px 13px" }}>
        {!entry ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
            No entry for today.
          </div>
        ) : (
          <>
            {/* Year badge + console */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color,
                background: color + "18", border: `1px solid ${color}33`,
                borderRadius: 4, padding: "1px 7px", letterSpacing: "0.06em",
              }}>
                {entry.year}
              </span>
              {console_ && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  {console_.short_name.toUpperCase()}
                </span>
              )}
            </div>

            {/* Title */}
            <div style={{
              fontSize: 15, fontWeight: 800, color: "var(--text)",
              letterSpacing: "0.02em", lineHeight: 1.25, marginBottom: 7,
            }}>
              {entry.title}
            </div>

            {/* Blurb */}
            <div style={{
              fontSize: 11, color: "var(--text-dim)", lineHeight: 1.55,
              marginBottom: checked ? 10 : 0,
            }}>
              {entry.blurb}
            </div>

            {/* Action buttons */}
            {checked && (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {romId !== null && (
                  <button
                    onClick={() => {
                      onNavigateToConsole(companyId, entry.consoleId);
                      onClose();
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
                      padding: "5px 11px", borderRadius: 5, cursor: "pointer",
                      background: color + "22",
                      border: `1px solid ${color}55`,
                      color: color,
                      transition: "all 0.15s",
                    }}
                  >
                    <Play size={10} />
                    IN YOUR LIBRARY
                  </button>
                )}
                <button
                  onClick={() => {
                    onNavigateToConsole(companyId, entry.consoleId);
                    onClose();
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                    padding: "5px 10px", borderRadius: 5, cursor: "pointer",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >
                  <ExternalLink size={10} />
                  {console_?.short_name.toUpperCase() ?? "BROWSE"} LIBRARY
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Subtle bottom accent */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
      }} />
    </div>
    </>,
    document.body
  );
}
