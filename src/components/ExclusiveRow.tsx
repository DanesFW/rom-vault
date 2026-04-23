import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import Tooltip from "./Tooltip";
import { ArtworkThumb } from "./ArtworkImage";
import type { Exclusive } from "../types";

// ── Console media type lookup ─────────────────────────────────────────────────
const DISC_CONSOLES = new Set([
  "ps1","ps2","ps3","ps4","ps5","psp","vita",
  "gc","wii","wiiu","switch",
  "xbox","x360","xone","xseries",
  "dreamcast","saturn","scd","cd32x",
  "pcenginecd","tgcd","ngcd","pcfx",
  "3do","cdimaginaire","cdi",
  "n64dd","fds",
]);

function isDiscBased(consoleId: string): boolean {
  return DISC_CONSOLES.has(consoleId);
}

function DiscIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Disc rings */}
      <circle cx="14" cy="14" r="11" fill={color + "18"} stroke={color} strokeWidth="1.5"/>
      <circle cx="14" cy="14" r="5" fill={color + "33"} stroke={color + "88"} strokeWidth="1"/>
      {/* Centre hole */}
      <circle cx="14" cy="14" r="1.8" fill={color}/>
    </svg>
  );
}

function CartridgeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Body */}
      <rect x="6" y="5" width="16" height="20" rx="2" fill={color + "22"} stroke={color} strokeWidth="1.5"/>
      {/* Connector pins — bottom */}
      <rect x="9"  y="20" width="2.5" height="4" rx="0.5" fill={color} opacity="0.8"/>
      <rect x="13" y="20" width="2.5" height="4" rx="0.5" fill={color} opacity="0.8"/>
      <rect x="17" y="20" width="2.5" height="4" rx="0.5" fill={color} opacity="0.8"/>
    </svg>
  );
}

interface Props {
  exclusive: Exclusive;
  companyColor: string;
  mode: "ALL" | "GAPS";
  onToggleOwned: (exc: Exclusive) => void;
  onDelete: (exc: Exclusive) => void;
  animDelay?: number;
}

export default function ExclusiveRow({
  exclusive, companyColor, mode, onToggleOwned, onDelete, animDelay = 0,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const genres: string[] = Array.isArray(exclusive.genres)
    ? exclusive.genres
    : (typeof exclusive.genres === "string" ? JSON.parse(exclusive.genres) : []);

  function handleDelete() {
    if (confirmDelete) {
      onDelete(exclusive);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        background: exclusive.owned ? `${companyColor}10` : "transparent",
        transition: "background 0.25s",
        animation: "rowFadeIn 0.2s ease both",
        animationDelay: `${animDelay}ms`,
        opacity: exclusive.owned && mode === "ALL" ? 0.85 : 1,
      }}
    >
      {/* ── Box art thumbnail — fills height of the row content ── */}
      <div style={{ flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "stretch" }}>
        <ArtworkThumb
          consoleId={exclusive.console_id}
          title={exclusive.title}
          size={44}
          fillHeight
          showSearch
          companyColor={companyColor}
        />
      </div>

      {/* ── Owned toggle + content — clicking either toggles owned ── */}
      <div
        onClick={() => onToggleOwned(exclusive)}
        style={{
          flex: 1, minWidth: 0,
          display: "flex", alignItems: "flex-start", gap: 10,
          cursor: "pointer",
        }}
      >
        {/* Disc or cartridge icon with checkmark overlay when owned */}
        <div style={{
          flexShrink: 0, marginTop: 2, position: "relative",
          width: 28, height: 28,
          transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: exclusive.owned ? "scale(1.05)" : "scale(0.92)",
          opacity: exclusive.owned ? 1 : 0.4,
          filter: exclusive.owned ? `drop-shadow(0 2px 6px ${companyColor}66)` : "none",
        }}>
          {isDiscBased(exclusive.console_id)
            ? <DiscIcon color={companyColor} size={28} />
            : <CartridgeIcon color={companyColor} size={28} />
          }
          {/* Checkmark overlay when owned */}
          {exclusive.owned && (
            <div style={{
              position: "absolute", inset: -6,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "excl-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
              <Check size={22} color="#4ade80" strokeWidth={3}
                style={{ filter: "drop-shadow(0 0 5px #4ade8099)" }} />
            </div>
          )}
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <span
              style={{
                fontSize: 13, fontWeight: 600, color: "var(--text)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                userSelect: "text", cursor: "text",
              }}
              onClick={e => e.stopPropagation()}
            >
              {exclusive.title}
            </span>
            {exclusive.owned && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                color: companyColor, border: `1px solid ${companyColor}66`,
                background: `${companyColor}18`,
                padding: "1px 5px", borderRadius: 3, flexShrink: 0,
              }}>
                OWNED
              </span>
            )}
            {exclusive.user_added && !exclusive.list_id && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                color: "var(--text-muted)", border: "1px solid var(--border-lit)",
                padding: "1px 5px", borderRadius: 3, flexShrink: 0,
              }}>
                CUSTOM
              </span>
            )}
          </div>

          {exclusive.publisher && (
            <div style={{ fontSize: 10, fontWeight: 600, color: companyColor + "99", marginBottom: 3 }}>
              {exclusive.publisher}
            </div>
          )}

          {exclusive.note && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.55, marginBottom: 5 }}>
              {exclusive.note}
            </div>
          )}

          {genres.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {genres.map(g => (
                <span key={g} style={{
                  fontSize: 9, fontWeight: 600,
                  padding: "1px 6px", borderRadius: 8,
                  background: `${companyColor}15`, color: companyColor,
                  border: `1px solid ${companyColor}33`, letterSpacing: "0.04em",
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── GAPS mode quick-own ── */}
      {mode === "GAPS" && (
        <button
          onClick={() => onToggleOwned(exclusive)}
          style={{
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 12px",
            background: `${companyColor}18`, border: `1px solid ${companyColor}66`,
            color: companyColor, fontFamily: "var(--font)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            borderRadius: 4, cursor: "pointer", transition: "all 0.15s",
            whiteSpace: "nowrap", alignSelf: "center",
          }}
        >
          <Check size={11} /> OWN IT
        </button>
      )}

      {/* ── Delete button ── */}
      <Tooltip content={confirmDelete ? "Click again to confirm deletion" : "Remove from list"} color={confirmDelete ? "#f87171" : companyColor}>
      <button
        onClick={handleDelete}
        style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 5,
          border: `1px solid ${confirmDelete ? "#f87171" : "var(--border)"}`,
          background: confirmDelete ? "#f8717118" : "transparent",
          color: confirmDelete ? "#f87171" : "var(--text-muted)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", alignSelf: "center",
        }}
      >
        <Trash2 size={13} />
      </button>
      </Tooltip>
    </div>
  );
}
