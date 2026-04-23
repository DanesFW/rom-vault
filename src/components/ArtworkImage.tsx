import { useState, useRef, useEffect } from "react";
import { Upload, Search } from "lucide-react";
import Tooltip from "./Tooltip";
import { useArtwork, bustArtCache, artFilename, useConsoleDims, recordConsoleDims, recordRomRatio } from "../hooks/useArtwork";
import ArtPickerModal from "./ArtPickerModal";
import { CONSOLE_IMAGES } from "../data/consoleImages";

function ConsoleArtPlaceholder({ consoleId, title, companyColor }: { consoleId: string; title: string; companyColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const consoleDims = useConsoleDims(consoleId); // width/height ratio from recorded art
  const W = 256;
  const H = consoleDims ? Math.round(W / consoleDims) : 356;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const safeColor = /^#[0-9a-fA-F]{6}$/.test(companyColor) ? companyColor : "#1a1a2e";
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, safeColor + "cc");
    grad.addColorStop(1, "#0a0a16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid overlay
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const drawTitle = () => {
      const margin = W * 0.08;
      const maxW = W - margin * 2;
      const fontSize = Math.max(11, Math.round(W * 0.075));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const words = title.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      const lineH = fontSize * 1.3;
      const totalH = lineH * lines.length;
      const startY = H * 0.72 - totalH / 2;
      lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));
    };

    const consoleImgUrl = CONSOLE_IMAGES[consoleId];
    if (consoleImgUrl) {
      const img = new Image();
      img.onload = () => {
        const maxImgW = W * 0.72, maxImgH = H * 0.50;
        const scale = Math.min(maxImgW / img.width, maxImgH / img.height);
        const iw = img.width * scale, ih = img.height * scale;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(img, (W - iw) / 2, H * 0.06, iw, ih);
        ctx.restore();
        drawTitle();
      };
      img.src = consoleImgUrl;
    } else {
      drawTitle();
    }
  }, [consoleId, title, companyColor, W, H]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}

interface Props {
  consoleId: string;
  title: string;
  region?: string;
  filename?: string;
  companyColor: string;
  allowCustom?: boolean;
  extraButtons?: React.ReactNode;
  onImageClick?: () => void;
  width?: number | string;
  style?: React.CSSProperties;
  /** Scale image to fit within the parent container without cropping */
  contain?: boolean;
}

function useVisible(rootMargin = "200px") {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function ArtworkImage({
  consoleId, title, region, filename, companyColor,
  allowCustom = false,
  extraButtons,
  onImageClick,
  width = "100%",
  style,
  contain = false,
}: Props) {
  const [importing,  setImporting]  = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { ref, visible } = useVisible();
  const { src, loading, error } = useArtwork(consoleId, title, "Named_Boxarts", visible, region, filename);
  const consoleDims = useConsoleDims(consoleId);
  // placeholder aspect ratio: use recorded console dims if available, else 3:4
  const placeholderPct = consoleDims ? `${(1 / consoleDims) * 100}%` : "133%";

  const IS_TAURI = "__TAURI_INTERNALS__" in window;

  async function handleImportCustom() {
    if (!IS_TAURI) return;
    setImporting(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const chosen = await open({
        multiple: false,
        title: "Choose cover art image",
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (!chosen || typeof chosen !== "string") return;
      const destFilename = artFilename(consoleId, title, "Named_Boxarts");
      await invoke("import_custom_cover_art", { sourcePath: chosen, filename: destFilename });
      bustArtCache(consoleId, title, "Named_Boxarts");
    } catch (e) {
      console.error("Custom art import failed:", e);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div ref={ref} style={contain ? { width: "100%", height: "100%", display: "flex", flexDirection: "column" } : { width, ...style }}>
      {/* Upload / Search / extra buttons row */}
      {(allowCustom || extraButtons) && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6, flexShrink: 0 }}>
          {allowCustom && (
            <button
              onClick={handleImportCustom}
              disabled={importing}
              style={{
                flex: 1, padding: "3px 6px", background: "transparent",
                border: "1px solid var(--border)", borderRadius: 4,
                color: "var(--text-muted)", cursor: importing ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                opacity: importing ? 0.5 : 1, transition: "all 0.15s",
                fontFamily: "var(--font)", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              }}
            >
              <Upload size={9} /> UPLOAD
            </button>
          )}
          {allowCustom && (
            <button
              onClick={() => setShowPicker(true)}
              style={{
                flex: 1, padding: "3px 6px", background: "transparent",
                border: "1px solid var(--border)", borderRadius: 4,
                color: "var(--text-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                transition: "all 0.15s",
                fontFamily: "var(--font)", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              }}
            >
              <Search size={9} /> SEARCH
            </button>
          )}
          {extraButtons}
        </div>
      )}

      {/* Art container */}
      <div
        onClick={onImageClick}
        style={contain ? {
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          cursor: onImageClick ? "pointer" : "default",
        } : {
          width: "100%",
          height: style?.height ? "100%" : undefined,
          position: "relative", borderRadius: 6,
          overflow: "hidden", background: "var(--bg-card)",
          border: "1px solid var(--border)",
          cursor: onImageClick ? "pointer" : "default",
          ...(!src || loading || error ? { paddingBottom: style?.height ? undefined : placeholderPct } : {}),
        }}
      >
        <div style={contain ? {
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        } : {
          position: !src || loading || error ? "absolute" : "relative",
          inset: !src || loading || error ? 0 : undefined,
          display: "flex", alignItems: "center", justifyContent: "center",
          height: style?.height && src ? "100%" : undefined,
        }}>
          {(loading || (!visible && !src)) && (
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, var(--bg-card), var(--bg-hover), var(--bg-card))",
              backgroundSize: "200% 100%",
              animation: visible ? "artSkeleton 1.4s ease infinite" : "none",
            }} />
          )}
          {!loading && src && (
            <img
              src={src}
              alt={title}
              style={contain ? {
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: 6,
                boxShadow: style?.boxShadow,
              } : {
                display: "block", width: "100%",
                height: style?.height ? "100%" : "auto",
                objectFit: style?.height ? "cover" : undefined,
              }}
              onLoad={e => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  const ratio = img.naturalWidth / img.naturalHeight;
                  recordConsoleDims(consoleId, ratio);
                  recordRomRatio(consoleId, title, ratio);
                }
              }}
            />
          )}
          {!loading && visible && error && (
            <div style={contain ? { width: "100%", height: "100%" } : { position: "absolute", inset: 0 }}>
              <ConsoleArtPlaceholder consoleId={consoleId} title={title} companyColor={companyColor} />
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <ArtPickerModal
          consoleId={consoleId}
          title={title}
          artType="Named_Boxarts"
          companyColor={companyColor}
          onPicked={() => setShowPicker(false)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

/** Compact thumbnail for inline row use */
export function ArtworkThumb({
  consoleId, title, region, filename, size = 48, fillHeight = false,
  showSearch = false, companyColor = "var(--accent)",
}: {
  consoleId: string; title: string; region?: string; filename?: string;
  size?: number; fillHeight?: boolean; showSearch?: boolean; companyColor?: string;
}) {
  const { ref, visible } = useVisible();
  const { src, loading, error } = useArtwork(consoleId, title, "Named_Boxarts", visible, region, filename);
  const [showPicker, setShowPicker] = useState(false);


  return (
    <>
      <div ref={ref} style={{
        width: size, flexShrink: 0, borderRadius: 4, overflow: "hidden",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        ...(fillHeight
          ? { height: "100%", minHeight: size }
          : (!src || loading ? { height: size * 1.33 } : {})
        ),
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {(loading || (!visible && !src)) && (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(90deg, var(--bg-card), var(--bg-hover), var(--bg-card))",
            backgroundSize: "200% 100%",
            animation: visible ? "artSkeleton 1.4s ease infinite" : "none",
          }} />
        )}
        {!loading && src && (
          <img src={src} alt={title} style={{
            display: "block", width: "100%",
            height: fillHeight ? "100%" : "auto",
            objectFit: fillHeight ? "cover" : "contain",
          }} />
        )}
        {!loading && visible && error && (
          showSearch ? (
            <Tooltip content="Search cover art">
            <button onClick={() => setShowPicker(true)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 4,
            }}>
              <Search size={12} />
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.06em" }}>SEARCH</span>
            </button>
            </Tooltip>
          ) : (
            <ConsoleArtPlaceholder consoleId={consoleId} title={title} companyColor={companyColor} />
          )
        )}
      </div>

      {showPicker && (
        <ArtPickerModal
          consoleId={consoleId}
          title={title}
          artType="Named_Boxarts"
          companyColor={companyColor}
          onPicked={() => setShowPicker(false)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
