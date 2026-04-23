import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Exclusive } from "../types";

const GENRE_OPTIONS = [
  "Action", "Adventure", "RPG", "JRPG", "Platformer", "Racing",
  "Sports", "Fighting", "Puzzle", "Shooter", "Strategy", "Simulation",
  "Horror", "Stealth", "Beat-em-up", "Run-and-Gun",
];

interface Props {
  consoleId: string;
  companyColor: string;
  onAdd: (item: Omit<Exclusive, "id">) => Promise<void>;
  onClose: () => void;
}

export default function AddExclusiveForm({ consoleId, companyColor, onAdd, onClose }: Props) {
  const [title, setTitle]     = useState("");
  const [note, setNote]       = useState("");
  const [genres, setGenres]   = useState<string[]>([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  function toggleGenre(g: string) {
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  async function handleSubmit() {
    const t = title.trim();
    if (!t) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      await onAdd({
        console_id: consoleId,
        title: t,
        publisher: "",
        note: note.trim(),
        genres,
        owned: false,
        user_added: true,
      });
      // Reset for next entry
      setTitle("");
      setNote("");
      setGenres([]);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "var(--bg-card)",
      borderLeft: `2px solid ${companyColor}`,
      borderBottom: "1px solid var(--border)",
      padding: "12px 16px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: companyColor }}>
          ADD EXCLUSIVE
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={e => { setTitle(e.target.value); setError(""); }}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="Game title"
        autoFocus
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: `1px solid ${error ? "#f87171" : "var(--border-lit)"}`,
          color: "var(--text)",
          fontFamily: "var(--font)",
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 4,
          outline: "none",
          marginBottom: 8,
        }}
      />

      {/* Note */}
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Why is it notable? (optional)"
        rows={2}
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-lit)",
          color: "var(--text)",
          fontFamily: "var(--font)",
          fontSize: 11,
          padding: "6px 10px",
          borderRadius: 4,
          outline: "none",
          resize: "none",
          marginBottom: 8,
        }}
      />

      {/* Genre chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {GENRE_OPTIONS.map(g => {
          const active = genres.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              style={{
                background: active ? companyColor : "transparent",
                border: `1px solid ${active ? companyColor : "var(--border-lit)"}`,
                color: active ? "black" : "var(--text-dim)",
                fontFamily: "var(--font)",
                fontSize: 9,
                fontWeight: active ? 700 : 400,
                padding: "2px 8px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {g}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ fontSize: 10, color: "#f87171", marginBottom: 8 }}>{error}</div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button
          className="btn primary"
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          style={{
            borderColor: companyColor,
            color: companyColor,
            opacity: saving || !title.trim() ? 0.5 : 1,
          }}
        >
          <Plus size={11} />
          {saving ? "SAVING…" : "ADD GAME"}
        </button>
      </div>
    </div>
  );
}
