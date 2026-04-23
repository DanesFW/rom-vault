import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import type { Tag } from "../types";

const PRESET_COLORS = [
  "#60a5fa", "#4ade80", "#f59e0b", "#f87171", "#a78bfa",
  "#34d399", "#fb923c", "#e879f9", "#38bdf8", "#facc15",
];

interface Props {
  tags: Tag[];
  onAdd: (name: string, color: string) => void;
  onSave: (id: number, name: string, color: string) => void;
  onRemove: (id: number) => void;
}

export default function TagManager({ tags, onAdd, onSave, onRemove }: Props) {
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor,setEditColor]= useState("");

  function commitNew() {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newColor);
    setNewName("");
    setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  }

  function startEdit(tag: Tag) {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function commitEdit() {
    if (editId === null) return;
    const name = editName.trim();
    if (name) onSave(editId, name, editColor);
    setEditId(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Existing tags */}
      {tags.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>
          No tags yet. Create one below.
        </div>
      )}
      {tags.map(tag => (
        <div key={tag.id} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 10px", borderRadius: 6,
          background: "var(--bg-card)", border: "1px solid var(--border)",
        }}>
          {editId === tag.id ? (
            <>
              <ColorDots color={editColor} onPick={setEditColor} />
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                autoFocus
                style={{
                  flex: 1, background: "var(--bg-hover)", border: `1px solid ${editColor}66`,
                  borderRadius: 4, color: "var(--text)", fontFamily: "var(--font)",
                  fontSize: 12, padding: "3px 7px", outline: "none",
                }}
              />
              <button onClick={commitEdit} style={iconBtn("#4ade80")}><Check size={12} /></button>
              <button onClick={() => setEditId(null)} style={iconBtn("var(--text-muted)")}><X size={12} /></button>
            </>
          ) : (
            <>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: tag.color, flexShrink: 0 }} />
              <span
                onClick={() => startEdit(tag)}
                style={{ flex: 1, fontSize: 12, color: "var(--text)", cursor: "pointer" }}
              >
                {tag.name}
              </span>
              <button onClick={() => onRemove(tag.id)} style={iconBtn("#f87171")}><Trash2 size={12} /></button>
            </>
          )}
        </div>
      ))}

      {/* New tag row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <ColorDots color={newColor} onPick={setNewColor} />
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commitNew(); }}
          placeholder="New tag name…"
          style={{
            flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-lit)",
            borderRadius: 4, color: "var(--text)", fontFamily: "var(--font)",
            fontSize: 12, padding: "5px 8px", outline: "none",
          }}
        />
        <button
          onClick={commitNew}
          disabled={!newName.trim()}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: newName.trim() ? `${newColor}22` : "var(--bg-card)",
            border: `1px solid ${newName.trim() ? newColor : "var(--border-lit)"}`,
            color: newName.trim() ? newColor : "var(--text-muted)",
            borderRadius: 5, padding: "5px 10px", cursor: newName.trim() ? "pointer" : "default",
            fontFamily: "var(--font)", fontSize: 11, fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          <Plus size={11} /> ADD
        </button>
      </div>
    </div>
  );
}

function ColorDots({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onPick(c)}
          style={{
            width: 12, height: 12, borderRadius: "50%", background: c,
            border: `2px solid ${c === color ? "white" : "transparent"}`,
            cursor: "pointer", padding: 0, outline: "none",
            boxShadow: c === color ? `0 0 0 1px ${c}` : "none",
            transition: "all 0.1s",
          }}
        />
      ))}
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    background: "none", border: "none", color, cursor: "pointer",
    display: "flex", alignItems: "center", padding: 3, borderRadius: 3,
    flexShrink: 0,
  };
}
