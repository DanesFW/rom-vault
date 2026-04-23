import { useState } from "react";
import { ChevronRight, Monitor, Smartphone, Apple, HardDrive, Lightbulb, Copy, Check, Library } from "lucide-react";
import Tooltip from "./Tooltip";
import type { GuideEntry } from "../data/guideData";

interface Props {
  consoleId: string;
  consoleName: string;
  shortName: string;
  releaseYear: number;
  generation: number;
  companyColor: string;
  companyId: string;
  guide: GuideEntry;
  romCount: number;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onNavigate?: (companyId: string, consoleId: string) => void;
}

const FORMAT_QUALITY: Record<string, number> = {
  ".rvz": 10, ".chd": 10, ".wux": 9, ".wia": 9,
  ".xci": 8, ".nsp": 8, ".gcm": 8, ".wbfs": 7,
  ".z64": 7, ".sfc": 7, ".gba": 7, ".nds": 7,
  ".iso": 5, ".cso": 5, ".pbp": 5,
  ".cue": 4, ".gdi": 4, ".bin": 3,
};

function fmtStyle(fmt: string, i: number) {
  if (i === 0) return { bg: "#4ade8018", color: "#4ade80", border: "#4ade8044" };
  const q = FORMAT_QUALITY[fmt] ?? 3;
  if (q >= 9) return { bg: "#4ade8010", color: "#4ade80", border: "#4ade8030" };
  if (q >= 6) return { bg: "#fbbf2410", color: "#fbbf24", border: "#fbbf2430" };
  return { bg: "#60a5fa10", color: "#60a5fa", border: "#60a5fa30" };
}

export default function GuideCard({
  consoleId, consoleName, shortName, releaseYear, generation,
  companyColor, companyId, guide, romCount, isOpen, onToggle, onNavigate,
}: Props) {
  const notAvailable = (s: string) => s === "Not available";

  return (
    <div style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}>

      {/* ── Header row ── */}
      <div
        role="button"
        onClick={() => onToggle(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 16px",
          cursor: "pointer",
          background: isOpen ? "var(--bg-card)" : "transparent",
          transition: "background 0.15s",
          userSelect: "none",
        }}
      >
        <ChevronRight size={12} style={{
          color: companyColor,
          transform: isOpen ? "rotate(90deg)" : "none",
          transition: "transform 0.2s ease",
          flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: isOpen ? "var(--text)" : "var(--text-dim)",
            letterSpacing: "0.05em",
          }}>
            {shortName}
          </span>
          {!isOpen && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{consoleName}</span>
          )}
          {romCount > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
              background: `${companyColor}20`, color: companyColor,
              border: `1px solid ${companyColor}44`, flexShrink: 0,
            }}>
              {romCount.toLocaleString()} ROM{romCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Collapsed preview */}
        {!isOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
              {guide.primary_emulator_desktop}
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {guide.recommended_formats.slice(0, 3).map((fmt, i) => {
                const s = fmtStyle(fmt, i);
                return (
                  <span key={fmt} style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    letterSpacing: "0.05em",
                  }}>
                    {fmt.replace(".", "").toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>
          {releaseYear} · GEN {generation}
        </span>
      </div>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div className="slide-in" style={{ padding: "0 16px 16px 40px", background: "var(--bg-card)" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.05em" }}>
              {consoleName} · {releaseYear}
            </span>

            {/* Jump to Library button */}
            {onNavigate && (
              <button
                onClick={e => { e.stopPropagation(); onNavigate(companyId, consoleId); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 4,
                  background: `${companyColor}15`,
                  border: `1px solid ${companyColor}44`,
                  color: companyColor,
                  fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.08em", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Library size={10} />
                {romCount > 0 ? `VIEW ${romCount} ROMS` : "GO TO LIBRARY"}
              </button>
            )}
          </div>

          {/* Emulator blocks — 3 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <EmulatorBlock
              icon={<Monitor size={11} />}
              label="DESKTOP"
              primary={guide.primary_emulator_desktop}
              alts={guide.alt_emulators}
              color={companyColor}
            />
            <EmulatorBlock
              icon={<Smartphone size={11} />}
              label="ANDROID"
              primary={guide.primary_emulator_android}
              alts={[]}
              color={companyColor}
              faded={notAvailable(guide.primary_emulator_android)}
            />
            <EmulatorBlock
              icon={<Apple size={11} />}
              label="iOS"
              primary={guide.primary_emulator_ios}
              alts={[]}
              color={companyColor}
              faded={notAvailable(guide.primary_emulator_ios)}
            />
          </div>

          {/* Formats */}
          <Section icon={<HardDrive size={11} />} label="RECOMMENDED FORMATS" color={companyColor}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {guide.recommended_formats.map((fmt, i) => {
                const s = fmtStyle(fmt, i);
                return (
                  <div key={fmt} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                      letterSpacing: "0.06em",
                    }}>
                      {fmt.replace(".", "").toUpperCase()}
                    </span>
                    {i === 0 && (
                      <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 600 }}>PREFERRED</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {guide.hardware_notes.length > 0 && (
            <Section icon={<HardDrive size={11} />} label="HARDWARE & FLASHCARTS" color={companyColor}>
              <BulletList items={guide.hardware_notes} color={companyColor} />
            </Section>
          )}

          {guide.pro_tips.length > 0 && (
            <Section icon={<Lightbulb size={11} />} label="PRO TIPS" color="#fbbf24">
              <BulletList items={guide.pro_tips} color="#fbbf24" />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }
  return (
    <Tooltip content={`Copy "${text}"`}>
    <button onClick={handleCopy} style={{
      background: "none", border: "none",
      color: copied ? "#4ade80" : "var(--text-muted)",
      cursor: "pointer", padding: "0 2px",
      display: "inline-flex", alignItems: "center",
      transition: "color 0.15s", flexShrink: 0, lineHeight: 1,
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
    </Tooltip>
  );
}

// ── Emulator block ────────────────────────────────────────────────────────────

function EmulatorBlock({ icon, label, primary, alts, color, faded }: {
  icon: React.ReactNode; label: string; primary: string;
  alts: string[]; color: string; faded?: boolean;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${faded ? "var(--border)" : "var(--border)"}`,
      borderRadius: 6, padding: "10px 12px",
      opacity: faded ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, color: "var(--text-dim)" }}>
        {icon}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: alts.length ? 5 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: faded ? "var(--text-dim)" : color }}>
          {primary}
        </span>
        {!faded && <CopyButton text={primary} />}
      </div>
      {alts.map(a => (
        <div key={a} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>+ {a}</span>
          <CopyButton text={a} />
        </div>
      ))}
    </div>
  );
}

// ── Section + BulletList ──────────────────────────────────────────────────────

function Section({ icon, label, color, children }: {
  icon: React.ReactNode; label: string; color: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color }}>
        {icon}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <ul style={{ listStyle: "none", marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>▸</span>
          <span style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
