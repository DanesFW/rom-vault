import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useArtwork } from "../hooks/useArtwork";
import type { RomEntry } from "../types";

interface Props {
  rom: RomEntry;
  onDone: () => void;
}

const SPLASH_DURATION = 2800; // ms before auto-dismiss

function ArtBackground({ rom }: { rom: RomEntry }) {
  const { src } = useArtwork(rom.console_id, rom.title, "Named_Boxarts", true, rom.region ?? undefined, rom.filename ?? undefined);
  if (!src || src === "error") return null;
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: `url(${src})`,
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      filter: "blur(40px) brightness(0.35) saturate(1.4)",
      transform: "scale(1.15)",
      zIndex: 0,
    }} />
  );
}

function ArtForeground({ rom }: { rom: RomEntry }) {
  const { src } = useArtwork(rom.console_id, rom.title, "Named_Boxarts", true, rom.region ?? undefined, rom.filename ?? undefined);
  if (!src || src === "error") return (
    <div style={{
      width: 220, height: 280, borderRadius: 12, background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Play size={48} style={{ color: "rgba(255,255,255,0.2)" }} />
    </div>
  );
  return (
    <img
      src={src}
      alt={rom.title}
      style={{
        maxWidth: 240, maxHeight: 320,
        borderRadius: 12,
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        objectFit: "contain",
        zIndex: 1,
      }}
    />
  );
}

export default function PlaySplash({ rom, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setVisible(true), 30);
    // Begin fade out
    const t2 = setTimeout(() => setFading(true), SPLASH_DURATION - 400);
    // Done
    const t3 = setTimeout(() => onDone(), SPLASH_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
        background: "rgba(5,5,15,0.92)",
        backdropFilter: "blur(2px)",
        cursor: "pointer",
        opacity: fading ? 0 : visible ? 1 : 0,
        transition: fading ? "opacity 0.4s ease" : "opacity 0.35s ease",
      }}
    >
      <ArtBackground rom={rom} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <ArtForeground rom={rom} />

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.12em", fontWeight: 700,
            color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase",
          }}>
            Now launching
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: "#fff",
            textShadow: "0 2px 16px rgba(0,0,0,0.8)",
            maxWidth: 340, lineHeight: 1.3, textAlign: "center",
          }}>
            {rom.title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulse 1.4s ease-in-out 0s infinite" }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulse 1.4s ease-in-out 0.2s infinite" }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulse 1.4s ease-in-out 0.4s infinite" }} />
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 20, fontSize: 11,
        color: "rgba(255,255,255,0.2)", zIndex: 1,
      }}>
        Click to dismiss
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
