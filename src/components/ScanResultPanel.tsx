import { useState } from "react";
import { X, Disc, Check, ChevronDown, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import type { ScanResult, SkippedFile } from "../hooks/useFolderScan";
import { BUILT_IN_CONSOLES, BUILT_IN_COMPANIES } from "../types";
import { insertRomsBatch } from "../db";

interface Props {
  result: ScanResult;
  companyColor: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function ScanResultPanel({ result, companyColor, onClose, onAdded }: Props) {
  const [showMerged,  setShowMerged]  = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);
  const [addingFor,   setAddingFor]   = useState<SkippedFile | null>(null);

  const hasContent = result.merged.length > 0 || result.skippedFiles.length > 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(600px, 100%)", maxHeight: "85vh",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-lit)",
        borderRadius: 10,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <Check size={15} style={{ color: "#4ade80" }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", flex: 1, color: "var(--text)" }}>
            SCAN COMPLETE
          </span>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 10, padding: "14px 18px",
          borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <StatBox value={result.inserted}              label="NEW"              color="#4ade80" />
          {(result.updated ?? 0) > 0 && (
            <StatBox value={result.updated!}            label="ALREADY EXISTED" color="var(--text-muted)" />
          )}
          {result.merged.length > 0 && (
            <StatBox value={result.merged.length}       label="MULTI-DISC"      color={companyColor} />
          )}
          {result.skippedFiles.length > 0 && (
            <StatBox value={result.skippedFiles.length} label="UNRECOGNISED"    color="#f87171" />
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>

          {/* No extra items */}
          {!hasContent && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0", gap: 8 }}>
              <Check size={26} style={{ color: "#4ade80" }} />
              <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>
                {result.inserted > 0
                ? `${result.inserted} new ROM${result.inserted !== 1 ? "s" : ""} added — no issues found.`
                : "No new ROMs found — library is up to date."
              }
              </p>
            </div>
          )}

          {/* ── Skipped / unrecognised ── */}
          {result.skippedFiles.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowSkipped(s => !s)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "6px 0", marginBottom: 8,
                  fontFamily: "var(--font)",
                }}
              >
                {showSkipped ? <ChevronDown size={13} color="#f87171" /> : <ChevronRight size={13} color="#f87171" />}
                <AlertTriangle size={12} style={{ color: "#f87171" }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#f87171" }}>
                  UNRECOGNISED FILES ({result.skippedFiles.length})
                </span>
              </button>

              {showSkipped && (
                <>
                  <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 10 }}>
                    These files couldn't be matched to a console automatically.
                    You can add them manually by choosing a console and title.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {result.skippedFiles.map((f, i) => (
                      addingFor?.filepath === f.filepath
                        ? <AddSkippedForm
                            key={i}
                            file={f}
                            onAdded={() => { setAddingFor(null); onAdded(); }}
                            onCancel={() => setAddingFor(null)}
                          />
                        : <SkippedRow
                            key={i}
                            file={f}
                            onAdd={() => setAddingFor(f)}
                          />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Multi-disc merged ── */}
          {result.merged.length > 0 && (
            <div>
              <button
                onClick={() => setShowMerged(s => !s)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "6px 0", marginBottom: 8, fontFamily: "var(--font)",
                }}
              >
                {showMerged ? <ChevronDown size={13} color={companyColor} /> : <ChevronRight size={13} color={companyColor} />}
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: companyColor }}>
                  MULTI-DISC MERGED ({result.merged.length})
                </span>
              </button>

              {showMerged && (
                <>
                  <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 10 }}>
                    These games had multiple disc files merged into one library entry.
                    Emulators will prompt to swap discs when needed.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.merged.map((game, i) => (
                      <div key={i} style={{
                        padding: "10px 12px",
                        background: "var(--bg-card)",
                        border: `1px solid ${companyColor}33`,
                        borderLeft: `3px solid ${companyColor}`,
                        borderRadius: 6,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <Disc size={13} style={{ color: companyColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{game.title}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                            background: `${companyColor}22`, color: companyColor,
                            border: `1px solid ${companyColor}44`, flexShrink: 0,
                          }}>
                            {game.discCount} DISCS
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 21 }}>
                          {game.discs.map((disc, di) => (
                            <div key={di} style={{ fontSize: 10, color: di === 0 ? "var(--text-dim)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 8, fontWeight: 700, color: di === 0 ? companyColor : "var(--text-muted)", flexShrink: 0 }}>
                                {di === 0 ? "PRIMARY" : `DISC ${di + 1}`}
                              </span>
                              {disc}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "7px 20px", borderRadius: 5,
            background: `${companyColor}18`, border: `1px solid ${companyColor}66`,
            color: companyColor, fontFamily: "var(--font)", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.08em", cursor: "pointer",
          }}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skipped file row ──────────────────────────────────────────────────────────

function SkippedRow({ file, onAdd }: { file: SkippedFile; onAdd: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px",
      background: "var(--bg-card)",
      border: "1px solid #f8717133",
      borderLeft: "3px solid #f87171",
      borderRadius: 6,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.filename}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
          {file.filepath}
        </div>
      </div>
      <button onClick={onAdd} style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 4, flexShrink: 0,
        background: "#f8717118", border: "1px solid #f8717166",
        color: "#f87171", fontFamily: "var(--font)",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
      }}>
        <Plus size={10} /> ADD
      </button>
    </div>
  );
}

// ── Inline add form for skipped files ────────────────────────────────────────

function AddSkippedForm({ file, onAdded, onCancel }: {
  file: SkippedFile;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [consoleId, setConsoleId] = useState("");
  const [title,     setTitle]     = useState(file.filename.replace(/\.[^.]+$/, "").replace(/\s*[\[\(][^\]\)]*[\]\)]/g, "").trim());
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  // Group consoles by company for the dropdown
  const companies = BUILT_IN_COMPANIES.map(c => ({
    ...c,
    consoles: BUILT_IN_CONSOLES.filter(con => con.company_id === c.id),
  }));

  async function handleSave() {
    if (!consoleId) { setError("Please select a console."); return; }
    if (!title.trim()) { setError("Please enter a title."); return; }
    setSaving(true);
    try {
      const ext = file.filename.match(/\.[^.]+$/)?.[0] ?? "";
      await insertRomsBatch([{
        console_id:   consoleId,
        title:        title.trim(),
        filename:     file.filename,
        filepath:     file.filepath,
        file_size:    0,
        format:       ext,
        is_exclusive: false,
      }]);
      onAdded();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div style={{
      padding: "12px 14px",
      background: "var(--bg-card)",
      border: "1px solid #f8717166",
      borderLeft: "3px solid #f87171",
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>
        ADD: {file.filename}
      </div>

      {/* Console picker */}
      <select
        value={consoleId}
        onChange={e => { setConsoleId(e.target.value); setError(""); }}
        style={{
          width: "100%", marginBottom: 8,
          background: "var(--bg-surface)", border: "1px solid var(--border-lit)",
          color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
          padding: "6px 10px", borderRadius: 4, outline: "none",
        }}
      >
        <option value="">Select console…</option>
        {companies.map(c => (
          <optgroup key={c.id} label={c.name}>
            {c.consoles.map(con => (
              <option key={con.id} value={con.id}>{con.name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Title input */}
      <input
        type="text" value={title}
        onChange={e => { setTitle(e.target.value); setError(""); }}
        placeholder="Game title"
        style={{
          width: "100%", marginBottom: 8,
          background: "var(--bg-surface)", border: `1px solid ${error ? "#f87171" : "var(--border-lit)"}`,
          color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
          padding: "6px 10px", borderRadius: 4, outline: "none",
        }}
      />

      {error && <div style={{ fontSize: 10, color: "#f87171", marginBottom: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          background: "none", border: "1px solid var(--border-lit)",
          color: "var(--text-dim)", fontFamily: "var(--font)", fontSize: 10,
          padding: "5px 12px", borderRadius: 4, cursor: "pointer",
        }}>
          CANCEL
        </button>
        <button onClick={handleSave} disabled={saving} style={{
          background: "#4ade8018", border: "1px solid #4ade8066",
          color: "#4ade80", fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
          padding: "5px 14px", borderRadius: 4, cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}>
          {saving ? "SAVING…" : "SAVE"}
        </button>
      </div>
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: "10px 14px", borderRadius: 6,
      background: `${color}0e`, border: `1px solid ${color}2a`, textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "var(--font)" }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 9, color: `${color}aa`, letterSpacing: "0.1em", fontWeight: 600, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
