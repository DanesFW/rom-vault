import { Copy, Trash2, RefreshCw, Star, X, ScanSearch } from "lucide-react";
import { useDuplicateCleaner } from "../hooks/useDuplicateCleaner";
import { FORMAT_QUALITY_RANK, formatLabel } from "../types";
import Tooltip from "./Tooltip";

interface Props {
  consoleId: string | null;
  consoleName: string;
  companyColor: string;
  onRemovedRom: () => void;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const FORMAT_LABEL_COLOR = (fmt: string) => {
  const q = FORMAT_QUALITY_RANK[fmt] ?? 1;
  if (q >= 9) return "#4ade80";
  if (q >= 6) return "#fbbf24";
  if (q >= 4) return "#60a5fa";
  return "var(--text-muted)";
};

/** Returns the longest common prefix (up to last path separator) shared by all paths */
function commonPathPrefix(paths: string[]): string {
  if (paths.length === 0) return "";
  const sep = paths[0].includes("\\") ? "\\" : "/";
  const parts = paths[0].split(sep);
  let prefix = "";
  for (let i = 1; i <= parts.length; i++) {
    const candidate = parts.slice(0, i).join(sep) + sep;
    if (paths.every(p => p.startsWith(candidate))) prefix = candidate;
    else break;
  }
  return prefix;
}

export default function DuplicateCleaner({
  consoleId, consoleName, companyColor, onRemovedRom, onClose,
}: Props) {
  const { phase, groups, removing, errorMsg, totalDupes, scan, remove, reset }
    = useDuplicateCleaner(consoleId, onRemovedRom);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-card)",
      borderLeft: `1px solid ${companyColor}33`,
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        <Copy size={13} style={{ color: companyColor }} />
        <span style={{
          fontSize: 12, fontWeight: 700,
          letterSpacing: "0.1em", color: companyColor,
        }}>
          DUPLICATE CLEANER
        </span>
        <span style={{ flex: 1, fontSize: 10, color: "var(--text-dim)" }}>
          {consoleName}
        </span>
        <button
          onClick={() => { reset(); onClose(); }}
          style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Idle: scan buttons ── */}
      {phase === "idle" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16, padding: 24,
        }}>
          <ScanSearch size={32} style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", lineHeight: 1.6 }}>
            Scan for duplicate ROMs grouped by title.<br />
            The best format in each group is marked <span style={{ color: "#4ade80" }}>★ KEEP</span>.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {consoleId && (
              <button
                className="btn primary"
                style={{ borderColor: companyColor, color: companyColor }}
                onClick={() => scan("console")}
              >
                <ScanSearch size={12} /> SCAN {consoleName.toUpperCase()}
              </button>
            )}
            <button className="btn" onClick={() => scan("all")}>
              <ScanSearch size={12} /> SCAN ALL
            </button>
          </div>
        </div>
      )}

      {/* ── Scanning spinner ── */}
      {phase === "scanning" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14,
          color: "var(--text-dim)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: `2px solid ${companyColor}33`,
            borderTopColor: companyColor,
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: 11, letterSpacing: "0.1em" }}>SCANNING…</span>
        </div>
      )}

      {/* ── Error ── */}
      {phase === "error" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12, padding: 24,
        }}>
          <p style={{ fontSize: 11, color: "#f87171", textAlign: "center" }}>{errorMsg}</p>
          <button className="btn" onClick={reset}>TRY AGAIN</button>
        </div>
      )}

      {/* ── Results ── */}
      {phase === "ready" && (
        <>
          {/* Results header bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
            flexShrink: 0,
          }}>
            {totalDupes === 0 ? (
              <span style={{ fontSize: 11, color: "#4ade80" }}>
                ✓ No duplicates found
              </span>
            ) : (
              <>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  <strong style={{ color: "#f87171" }}>{totalDupes}</strong> duplicate{totalDupes !== 1 ? "s" : ""}
                  {" across "}
                  <strong style={{ color: "var(--text)" }}>{groups.length}</strong> title{groups.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            <div style={{ flex: 1 }} />
            <Tooltip content="Re-scan">
            <button
              className="btn"
              style={{ fontSize: 9, padding: "2px 8px" }}
              onClick={() => scan(consoleId ? "console" : "all")}
            >
              <RefreshCw size={10} /> RESCAN
            </button>
            </Tooltip>
          </div>

          {/* Group list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {totalDupes === 0 && (
              <div className="empty-state">
                <p>Your library is clean — no duplicate titles detected.</p>
              </div>
            )}

            {groups.map(group => {
              const prefix = commonPathPrefix(group.entries.map(e => e.filepath));
              return (
              <div key={group.normalizedTitle} style={{
                borderBottom: "1px solid var(--border)",
                padding: "10px 16px",
              }}>
                {/* Group title */}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--text-dim)",
                  letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase",
                }}>
                  {group.entries[0].title}
                  <span style={{ marginLeft: 8, fontSize: 9, color: "#f87171", fontWeight: 400 }}>
                    {group.entries.length} copies
                  </span>
                </div>

                {/* Entries */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {group.entries.map(entry => {
                    const isKeep     = entry.id === group.keepId;
                    const isRemoving = removing.has(entry.id);
                    const fmtColor   = FORMAT_LABEL_COLOR(entry.format);
                    const pathSuffix = entry.filepath.slice(prefix.length);

                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          padding: "6px 10px", borderRadius: 5,
                          background: isKeep ? `${companyColor}10` : "var(--bg-surface)",
                          border: `1px solid ${isKeep ? companyColor + "44" : "var(--border)"}`,
                          opacity: isRemoving ? 0.4 : 1, transition: "opacity 0.2s",
                        }}
                      >
                        {/* Keep star */}
                        <Star size={11} fill={isKeep ? companyColor : "none"}
                          style={{ color: isKeep ? companyColor : "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />

                        {/* Format pill */}
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: `${fmtColor}18`, color: fmtColor,
                          border: `1px solid ${fmtColor}44`,
                          letterSpacing: "0.05em", flexShrink: 0, marginTop: 1,
                        }}>
                          {formatLabel(entry.format, entry.filename)}
                        </span>

                        {/* Filename + path with diff highlight */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 10, color: isKeep ? "var(--text)" : "var(--text-dim)",
                            wordBreak: "break-all", lineHeight: 1.4,
                            userSelect: "text", cursor: "text",
                          }}>
                            {entry.filename}
                          </div>
                          <div style={{
                            fontSize: 9, lineHeight: 1.4, marginTop: 2,
                            wordBreak: "break-all", userSelect: "text", cursor: "text",
                          }}>
                            {prefix && (
                              <span style={{ color: "var(--text-muted)" }}>{prefix}</span>
                            )}
                            <span style={{
                              color: isKeep ? "#4ade80" : "#fbbf24",
                              fontWeight: prefix ? 700 : 400,
                            }}>
                              {pathSuffix || entry.filepath}
                            </span>
                          </div>
                        </div>

                        {/* File size */}
                        <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>
                          {formatBytes(entry.file_size)}
                        </span>

                        {/* KEEP label or REMOVE button */}
                        {isKeep ? (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                            color: companyColor, flexShrink: 0, marginTop: 2,
                          }}>
                            KEEP
                          </span>
                        ) : (
                          <Tooltip content="Remove this file from library" color="#f87171">
                          <button
                            onClick={() => remove(entry.id)}
                            disabled={isRemoving}
                            style={{
                              background: "none", border: "1px solid #f8717155",
                              color: "#f87171", fontFamily: "var(--font)",
                              fontSize: 9, fontWeight: 600,
                              padding: "2px 7px", borderRadius: 3,
                              cursor: isRemoving ? "default" : "pointer",
                              letterSpacing: "0.06em",
                              display: "flex", alignItems: "center", gap: 4,
                              flexShrink: 0, transition: "all 0.15s",
                            }}
                          >
                            <Trash2 size={9} />
                            {isRemoving ? "…" : "REMOVE"}
                          </button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
