import { memo } from "react";
import { CONSOLE_SVGS } from "../data/consoleSvgs";
import { CONSOLE_IMAGES } from "../data/consoleImages";
import type { ConsoleStatRow } from "../hooks/useStats";
import Tooltip from "./Tooltip";

interface Props {
  stat: ConsoleStatRow;
  logo: string | null;
  showLogo: boolean;
  onClick: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
}

// Simple SVG donut for backlog
function BacklogDonut({ segments, total, size = 44 }: {
  segments: { count: number; color: string }[];
  total: number;
  size?: number;
}) {
  if (total === 0) return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={size/2 - 3}
        fill="none" stroke="var(--border)" strokeWidth={4} />
    </svg>
  );

  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  // Start from top
  const startRotate = -90;

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="var(--border)" strokeWidth={4} />
      {/* Segments */}
      {segments.map((seg, i) => {
        if (seg.count === 0) return null;
        const pct = seg.count / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const seg_offset = offset;
        offset += pct;
        return (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={4}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-seg_offset * circ}
            transform={`rotate(${startRotate} ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        );
      })}
    </svg>
  );
}

export default memo(function ConsoleStatCard({ stat, logo, showLogo, onClick }: Props) {
  const image   = CONSOLE_IMAGES[stat.consoleId];
  const svg     = CONSOLE_SVGS[stat.consoleId];
  const hasRoms = stat.romCount > 0;

  const finishedCount = stat.beatenCount + stat.completedCount;
  const pct = hasRoms ? Math.round((finishedCount / stat.romCount) * 100) : 0;

  const segments = [
    { count: stat.completedCount,   color: "#a78bfa" },
    { count: stat.beatenCount,      color: "#4ade80" },
    { count: stat.inProgressCount,  color: "#f59e0b" },
    { count: stat.unplayedCount,    color: "var(--bg-hover)" },
  ];

  return (
    <Tooltip content={`${stat.consoleName} — click to browse library`} color={stat.companyColor}>
    <div
      onClick={onClick}
      role="button"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${hasRoms ? stat.companyColor + "33" : "var(--border)"}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "border-color 0.18s ease, background 0.18s ease",
        opacity: hasRoms ? 1 : 0.35,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => {
        if (!hasRoms) return;
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = stat.companyColor + "77";
        el.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = hasRoms ? stat.companyColor + "33" : "var(--border)";
        el.style.background = "var(--bg-card)";
      }}
    >
      {/* Console logo strip — sits at top of card */}
      {showLogo && logo && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "10px 12px 8px",
          background: `${stat.companyColor}08`,
          borderBottom: `1px solid ${stat.companyColor}18`,
        }}>
          <img
            src={logo}
            alt={stat.consoleName}
            style={{
              height: 24, width: "auto", maxWidth: 100,
              objectFit: "contain",
              opacity: hasRoms ? 0.85 : 0.25,
              transition: "opacity 0.15s",
            }}
          />
        </div>
      )}

      {/* Console image — large faded background fill */}
      <div style={{ position: "relative", paddingBottom: "72%", overflow: "hidden" }}>
        {/* Solid bg */}
        <div style={{
          position: "absolute", inset: 0,
          background: `${stat.companyColor}08`,
        }} />

        {/* Console image, full-bleed faded */}
        {image ? (
          <img
            src={image}
            alt={stat.consoleName}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              height: "90%", width: "auto",
              maxWidth: "90%",
              objectFit: "contain",
              opacity: 0.52,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        ) : svg ? (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0.38,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {/* Gradient overlay — strong bottom fade so ROM count is always legible */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.18) 55%, var(--bg-card) 100%)",
          pointerEvents: "none",
        }} />

        {/* ROM count — big number overlaid bottom-left */}
        <div style={{
          position: "absolute", bottom: 10, left: 12,
          display: "flex", flexDirection: "column",
        }}>
          <span style={{
            fontSize: 26, fontWeight: 800, lineHeight: 1,
            color: hasRoms ? stat.companyColor : "var(--text-muted)",
            letterSpacing: "-0.03em",
            textShadow: hasRoms
              ? `0 1px 8px rgba(0,0,0,0.85), 0 0 24px rgba(0,0,0,0.6), 0 0 3px ${stat.companyColor}55`
              : "0 1px 4px rgba(0,0,0,0.6)",
          }}>
            {stat.romCount.toLocaleString()}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
            color: "var(--text-dim)", marginTop: 1,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}>
            ROMS
          </span>
        </div>
      </div>

      {/* Bottom info strip */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 90 }}>

        {/* Name row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
            color: hasRoms ? "var(--text)" : "var(--text-muted)",
          }}>
            {stat.shortName}
          </span>
          {hasRoms && stat.totalSize > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: stat.companyColor + "cc",
            }}>
              {formatBytes(stat.totalSize)}
            </span>
          )}
        </div>

        {/* Backlog row — donut + breakdown */}
        {hasRoms && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BacklogDonut segments={segments} total={stat.romCount} size={40} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
              {[
                { count: stat.completedCount,  color: "#a78bfa", label: "completed" },
                { count: stat.beatenCount,      color: "#4ade80", label: "beaten" },
                { count: stat.inProgressCount,  color: "#f59e0b", label: "playing" },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: s.color }}>{s.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
              ))}
              {finishedCount === 0 && (
                <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
                  {stat.unplayedCount} unplayed
                </span>
              )}
              {finishedCount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 1 }}>
                  <span style={{ fontSize: 9, color: "var(--text-dim)" }}>finished</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    color: pct >= 75 ? "#4ade80" : pct >= 25 ? "#f59e0b" : "var(--text-dim)",
                  }}>
                    {pct}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </Tooltip>
  );
});
