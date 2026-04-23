/**
 * ShelfTab.tsx
 * 3D game shelf view — games lined up on a shelf, scroll one per notch.
 * Uses Three.js for 3D boxes (front = box art, spine = brand colour + logo).
 * Background: user-supplied image placed in public/shelf-bg.png, with
 * a procedural placeholder until the real image is ready.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppSettings } from "../hooks/useAppSettings";
import { useGamepadAction, useGamepadConnected, useGamepadScroll } from "../hooks/useGamepad";
import * as THREE from "three";
import { getRoms, getCompanies, getConsoleStats, updateBacklog, updateNote, updateTitle, deleteRom } from "../db";
import { BUILT_IN_COMPANIES, BUILT_IN_CONSOLES, BACKLOG_NEXT } from "../types";
import { CONSOLE_LOGOS } from "../data/platformLogos";
import { CONSOLE_LOGOS as CONSOLE_LOGOS_DARK } from "../data/platformLogosDark";
import { SHELF_LOGO_OVERRIDES } from "../data/shelfLogos";
import { CONSOLE_IMAGES } from "../data/consoleImages";
import type { RomEntry, BacklogStatus } from "../types";
import { fetchAndCacheArt, onArtCacheUpdate, getCachedArt } from "../hooks/useArtwork";
import { fetchAndCacheLogo, onLogoCacheUpdate, getCachedLogo } from "../hooks/useLogo";
import Tooltip from "../components/Tooltip";
import { RomCardSmall } from "../components/RomCardSmall";

// ── Constants ─────────────────────────────────────────────────────────────────

// Canonical aspect ratios (width/height) per console, based on real physical box sizes.
// Used to shape the 3D box so cover art fills it correctly without distortion.
// Default 0.72 ≈ standard game box portrait ratio.
const CONSOLE_ASPECT: Record<string, number> = {
  // Nintendo cartridge boxes (cardboard)
  // N64 box is landscape: 930×620 → 1.50
  nes:       0.72, snes:      0.72, n64:       1.50,
  gb:        0.60, gbc:       0.60, gba:       0.82,
  ds:        0.73, "3ds":     0.69,
  // Nintendo disc cases (keep-case)
  gc:        0.70, wii:       0.65, wiiu:      0.70,
  switch:    0.65,
  // Sony disc cases (DVD/Blu-ray keep-case)
  ps1:       0.71, ps2:       0.71, ps3:       0.65,
  ps4:       0.65, psp:       0.73, vita:      0.70,
  // Microsoft (DVD keep-case)
  xbox:      0.67, x360:      0.67,
  // Sega cartridge/CD boxes
  genesis:   0.72, saturn:    0.71, dreamcast: 0.71,
  gg:        0.60, scd:       0.71, "32x":     0.72,
};
const DEFAULT_ASPECT = 0.72;

function getBoxDims(consoleId: string): { w: number; h: number } {
  const aspect = CONSOLE_ASPECT[consoleId] ?? DEFAULT_ASPECT;
  // Keep height constant at BOX_H, derive width from aspect ratio
  return { w: BOX_H * aspect, h: BOX_H };
}

const BOX_H        = 1.95;   // box height — width derived per-console via aspect ratio
const BOX_W        = 1.4;    // box width (full front) — overridden per-console at build time
const BOX_D        = 0.22;   // box depth / spine thickness
const SPINE_W      = BOX_D;  // effective width when spine-facing
const SHELF_Y      = -1.1;   // where boxes sit (shelf surface)
const FRONT_GAP    = 0.14;   // gap between full-face boxes

// Placeholder shelf constants — percentages for when real bg image is used
export const SHELF_CONSTANTS = {
  shelfTopPct: 0.55,  // shelf surface starts 55% down the viewport
  boxBottomPct: 0.88, // boxes sit with base at 88% down
};

interface ShelfGame {
  rom: RomEntry;
  consoleColor: string;
}

// ── Texture loader helper ─────────────────────────────────────────────────────

function loadTexture(
  loader: THREE.TextureLoader,
  dataUrl: string,
  maxAnisotropy = 1
): THREE.Texture {
  const tex = loader.load(dataUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeColorTexture(hex: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 4; canvas.height = 4;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 4, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlaceholderFrontTexture(
  title: string,
  consoleId: string,
  consoleColor: string,
  boxW: number,
  boxH: number,
  onReady: (tex: THREE.Texture) => void,
) {
  // Canvas sized to box aspect ratio at 512px base height
  const PH = 512;
  const PW = Math.round(PH * (boxW / boxH));
  const canvas = document.createElement("canvas");
  canvas.width = PW; canvas.height = PH;
  const ctx = canvas.getContext("2d")!;

  const safeColor = /^#[0-9a-fA-F]{6}$/.test(consoleColor) ? consoleColor : "#1a1a2e";

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, PW, PH);
  grad.addColorStop(0, safeColor + "cc");
  grad.addColorStop(1, "#0a0a16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PW, PH);

  // Subtle grid overlay
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < PW; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, PH); ctx.stroke(); }
  for (let y = 0; y < PH; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PW, y); ctx.stroke(); }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const drawTitle = () => {
    const margin = PW * 0.08;
    const maxW = PW - margin * 2;
    const fontSize = Math.max(14, Math.round(PW * 0.075));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Word-wrap title
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
    const startY = PH * 0.72 - totalH / 2;
    lines.forEach((line, i) => ctx.fillText(line, PW / 2, startY + i * lineH));
    tex.needsUpdate = true;
  };

  const consoleImgUrl = CONSOLE_IMAGES[consoleId];
  if (consoleImgUrl) {
    const img = new Image();
    img.onload = () => {
      // Draw console image centred in upper ~55% of the card
      const maxImgW = PW * 0.72;
      const maxImgH = PH * 0.50;
      const scale = Math.min(maxImgW / img.width, maxImgH / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, (PW - iw) / 2, PH * 0.06, iw, ih);
      ctx.restore();
      drawTitle();
    };
    img.src = consoleImgUrl;
  } else {
    drawTitle();
  }

  onReady(tex);
}

function makeSpineTexture(
  color: string,
  title: string,
  logoDataUrl: string | null,
  consoleLogoUrl: string | null,
  textSize = 1.0,
  textColor = "",
  textPos = 0.62,
  textMaxWidth = 0.58,
  textWrap = false,
  logoSize = 0.65,
  logoRotation = 0,
  logoPos = 0.5,
  gameLogoRotation = 0,
  logoWMult = 1.0,
  logoHMult = 1.0,
  gameLogoWMult = 1.0,
  gameLogoHMult = 1.0,
  textFlip = false,
): THREE.Texture {
  const W = 256, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient — guard against partial/invalid hex while user is typing
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#111122";
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, safeColor + "ff");
  grad.addColorStop(1, safeColor + "dd");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle diagonal sheen
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, "rgba(255,255,255,0.15)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // Top/bottom edge lines
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(W, 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1); ctx.stroke();

  // Draw console logo along spine at logoPos
  if (consoleLogoUrl) {
    const cImg = new Image();
    cImg.onload = () => {
      const cSize = W * logoSize;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(W / 2, H * logoPos);
      ctx.rotate((logoRotation * Math.PI) / 180);
      ctx.drawImage(cImg, -(cSize * logoWMult) / 2, -(cSize * logoHMult) / 2, cSize * logoWMult, cSize * logoHMult);
      ctx.restore();
      tex.needsUpdate = true;
    };
    cImg.src = consoleLogoUrl;
  }

  // Thin divider line below console logo area
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, W + 16);
  ctx.lineTo(W - 8, W + 16);
  ctx.stroke();

  if (logoDataUrl) {
    // Game logo — centred, rotated to read along spine + any extra rotation
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.translate(W / 2, H * 0.62);
      ctx.rotate(-Math.PI / 2 + (gameLogoRotation * Math.PI) / 180);
      const maxW = H * 0.52;
      const scale = Math.min(maxW / img.width, (W * 0.72) / img.height);
      const gw = img.width * scale * gameLogoWMult;
      const gh = img.height * scale * gameLogoHMult;
      ctx.drawImage(img, -gw / 2, -gh / 2, gw, gh);
      ctx.restore();
      tex.needsUpdate = true;
    };
    img.src = logoDataUrl;
  } else {
    // Text title fallback — rotated along spine
    ctx.save();
    ctx.translate(W / 2, H * textPos);
    ctx.rotate(-Math.PI / 2 + (textFlip ? Math.PI : 0));
    ctx.fillStyle = textColor || "rgba(255,255,255,0.88)";
    const basePx = Math.floor(W * 0.125);
    const fontSize = Math.round(basePx * textSize);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxPx = H * textMaxWidth;
    if (textWrap) {
      // Word-wrap: split into lines that fit within maxPx
      const words = title.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxPx && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      const lineH = fontSize * 1.25;
      const totalOffset = lineH * (lines.length - 1);
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, -totalOffset / 2 + i * lineH);
      });
    } else {
      // Truncate with ellipsis
      let t = title;
      while (ctx.measureText(t).width > maxPx && t.length > 4) {
        t = t.slice(0, -1);
      }
      if (t !== title) t = t.trimEnd() + "…";
      ctx.fillText(t, 0, 0);
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Placeholder background ────────────────────────────────────────────────────

function PlaceholderBg({ tvLogoY, consoleColor, colorGlow, consoleList, currentIdx }: {
  tvLogoY: number; consoleColor: string; colorGlow: boolean;
  consoleList: string[]; currentIdx: number;
}) {
  const { settings } = useAppSettings();
  const light = settings.theme === "light";
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(consoleColor) ? consoleColor : "#c084fc";
  const N = Math.max(consoleList.length, 1);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: light
        ? "linear-gradient(180deg, #c8c8d8 0%, #cecede 40%, #cdc8bf 60%, #d0ccc0 100%)"
        : "linear-gradient(180deg, #0a0a18 0%, #10101e 40%, #16120a 60%, #1e180a 100%)",
      pointerEvents: "none",
    }}>
      {/* Subtle dot pattern on light to add depth */}
      {light && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }} />
      )}
      {/* Faint CRT scanlines — dark only */}
      {!light && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)",
          pointerEvents: "none",
        }} />
      )}
      {/* Wall bloom — console color radiating from shelf area */}
      {colorGlow && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 80% 60% at 50% 60%, ${safeColor}${light ? "55" : "44"} 0%, transparent 70%)`,
          transition: "background 0.6s ease",
        }} />
      )}

      {/* TV casing */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        width: "62%", height: "52%",
        border: colorGlow ? `3px solid ${safeColor}${light ? "99" : "77"}` : light ? "3px solid #aaa" : "3px solid #333",
        borderBottom: "none",
        borderRadius: "12px 12px 0 0",
        background: light ? "#1a1a1a" : "#050508",
        boxShadow: colorGlow
          ? (light
            ? `0 0 48px ${safeColor}66, 0 0 16px ${safeColor}44, inset 0 0 20px rgba(0,0,0,0.5)`
            : `0 0 64px ${safeColor}66, 0 0 24px ${safeColor}44, inset 0 0 20px rgba(0,0,0,0.6)`)
          : (light
            ? "0 0 32px rgba(0,0,0,0.25), inset 0 0 20px rgba(0,0,0,0.5)"
            : "0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6)"),
        transition: "border-color 0.6s ease, box-shadow 0.6s ease",
      }}>
        {/* Screen bezel inner border */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "10px 10px 0 0",
          border: "1px solid #111",
        }} />
        {/* Logo carousel — full list strip, always-on transition */}
        {consoleList.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: `${tvLogoY}%`, height: "35%",
            overflow: "hidden",
            pointerEvents: "none",
          }}>
            {/* The strip: one slot per console, each 1/3 of container so 3 fit simultaneously */}
            <div style={{
              display: "flex",
              width: `${N * 100 / 3}%`,
              height: "100%",
              transform: (() => {
                const idx = currentIdx === -1 ? 0 : currentIdx;
                return `translateX(${(1 - idx) / N * 100}%)`;
              })(),
              transition: "transform 0.45s cubic-bezier(0.25,1,0.5,1)",
            }}>
              {consoleList.map((id, i) => {
                const src = CONSOLE_LOGOS[id] ?? null;
                const center = currentIdx === -1 ? 0 : currentIdx;
                const dist = Math.abs(i - center);
                const opacity = dist === 0 ? 0.55 : dist === 1 ? 0.22 : 0;
                // Mask direction fixed by position so it never snaps mid-animation
                const maskImage = dist === 0 ? "none"
                  : i < center
                    ? "linear-gradient(to left, white 20%, transparent 100%)"
                    : "linear-gradient(to right, white 20%, transparent 100%)";
                return (
                  <div key={id} style={{
                    width: `${100 / N}%`, flexShrink: 0, height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "opacity 0.45s cubic-bezier(0.25,1,0.5,1)",
                    opacity,
                  }}>
                    {src && (
                      <img src={src} alt="" style={{
                        maxWidth: "80%", maxHeight: "100%",
                        objectFit: "contain",
                        filter: "brightness(1.2)",
                        maskImage,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Screen glare */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "10px 10px 0 0",
          background: "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />
      </div>
      {/* Shelf surface */}
      <div style={{
        position: "absolute", top: "calc(52% + 10px)", left: "50%", transform: "translateX(-50%)",
        width: "70%", height: 14,
        background: light
          ? "linear-gradient(180deg, #e8dcc8 0%, #ddd0b8 100%)"
          : "linear-gradient(180deg, #3a2e1a 0%, #2a200e 100%)",
        boxShadow: light ? "0 4px 16px rgba(0,0,0,0.15)" : "0 4px 16px rgba(0,0,0,0.6)",
        borderRadius: "0 0 2px 2px",
      }} />
      {/* Shelf underside shadow */}
      <div style={{
        position: "absolute", top: "calc(52% + 24px)", left: "50%", transform: "translateX(-50%)",
        width: "70%", height: 8,
        background: "linear-gradient(180deg, rgba(0,0,0,0.15), transparent)",
      }} />
    </div>
  );
}

// ── Tuning config (live-editable via debug panel) ─────────────────────────────
// Defaults come from the user-tuned session. Per-console overrides can be
// added to CONSOLE_CONFIG below — ShelfTab merges them on top at load time.

interface ShelfConfig {
  camZ:     number;
  camFov:   number;
  frontGap: number;
  spineGap: number;
  rot1:     number;
  rot2:     number;
  rot3:     number;
  hw1:      number;
  scale1:   number;
  scale2:   number;
  scale3:   number;
  boxDepth:  number;  // z-scale multiplier for box thickness (1.0 = default BOX_D)
  boxWMult:  number;  // x-scale multiplier for box width (1.0 = console default)
  boxHMult:  number;  // y-scale multiplier for box height (1.0 = console default)
  spineColor:   string;
  logoSize:          number;
  logoRotation:      number;
  logoPos:           number;
  logoWMult:         number;  // independent width scale for console logo (1.0 = square)
  logoHMult:         number;  // independent height scale for console logo (1.0 = square)
  gameLogoRotation:  number;
  gameLogoWMult:     number;  // independent width scale for game logo
  gameLogoHMult:     number;  // independent height scale for game logo
  textFlip:          boolean; // rotate text 180° along spine
  textSize:     number;
  textColor:    string;
  textPos:      number;
  textMaxWidth: number;
  textWrap:     boolean;
  tilt:         number;  // forward tilt of boxes in radians
  colorGlow:    boolean; // console color glow on wall + TV
  logoVariant:  "light" | "dark";  // light = white logo, dark = coloured logo
  tvLogoY:      number;  // % from top of TV screen (0–100)
}

const DEFAULT_CONFIG: ShelfConfig = {
  camZ:     4.2,
  camFov:   75,
  frontGap: 0,
  spineGap: 0,
  rot1:     0.50,
  rot2:     0.50,
  rot3:     0.47,
  hw1:      1.7,
  scale1:    0.90,
  scale2:    0.83,
  scale3:    0.76,
  boxDepth:     1.0,
  boxWMult:     1.0,
  boxHMult:     1.0,
  spineColor:   "",
  logoSize:         0.65,
  logoRotation:     0,
  logoPos:          0.5,
  logoWMult:        1.0,
  logoHMult:        1.0,
  gameLogoRotation: 0,
  gameLogoWMult:    1.0,
  gameLogoHMult:    1.0,
  textFlip:         false,
  textSize:     1.0,
  textColor:    "",
  textPos:      0.62,
  textMaxWidth: 0.58,
  textWrap:     false,
  tilt:         0.08,
  colorGlow:    true,
  logoVariant:  "light",
  tvLogoY:      12,
};

// Per-console config overrides — add entries here when a console needs
// different camera / spacing / rotation values. Merged on top of DEFAULT_CONFIG.
const CONSOLE_CONFIG: Partial<Record<string, Partial<ShelfConfig>>> = {
  wii: { camZ: 2.7, camFov: 76, frontGap: 0, spineGap: 0, rot1: 0.45, rot2: 0.48, rot3: 0.45, hw1: 1.4, scale1: 0.9, scale2: 0.83, scale3: 0.76, boxDepth: 0.7 },
  n64: { camZ: 3.8, camFov: 75, frontGap: 0, spineGap: 0, rot1: 0.48, rot2: 0.5, rot3: 0.48, hw1: 1, scale1: 0.9, scale2: 0.83, scale3: 0.76, boxDepth: 1.6, boxWMult: 1, boxHMult: 1, spineColor: "#f59e0b", logoSize: 0.65, logoRotation: 0, logoPos: 0.5, textSize: 1.85, textColor: "#000000", textPos: 0.56, textMaxWidth: 0.64, textWrap: true },
  psp: { camZ: 3.4, camFov: 51, frontGap: 0.03, spineGap: 0.03, rot1: 0.45, rot2: 0.48, rot3: 0.45, hw1: 1.2, scale1: 0.88, scale2: 0.83, scale3: 0.76, boxDepth: 1, boxWMult: 0.75, boxHMult: 0.95, spineColor: "#1e1b4b", logoSize: 0.5, logoRotation: 91, logoPos: 0.11, gameLogoRotation: 180, textSize: 1.6, textColor: "", textPos: 0.58, textMaxWidth: 0.76, textWrap: true },
};

function getConsoleConfig(consoleId: string): ShelfConfig {
  return { ...DEFAULT_CONFIG, ...(CONSOLE_CONFIG[consoleId] ?? {}) };
}

// ── Per-console config persistence ───────────────────────────────────────────

const SHELF_CONFIG_KEY   = "shelf_console_configs";
const SHELF_DEFAULT_KEY  = "shelf_default_config";

function loadGlobalDefault(): Partial<ShelfConfig> {
  try { return JSON.parse(localStorage.getItem(SHELF_DEFAULT_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveGlobalDefault(cfg: ShelfConfig) {
  localStorage.setItem(SHELF_DEFAULT_KEY, JSON.stringify(cfg));
}

function loadSavedConfigs(): Record<string, Partial<ShelfConfig>> {
  try { return JSON.parse(localStorage.getItem(SHELF_CONFIG_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveConsoleConfig(consoleId: string, cfg: ShelfConfig) {
  const all = loadSavedConfigs();
  all[consoleId] = cfg;
  localStorage.setItem(SHELF_CONFIG_KEY, JSON.stringify(all));
}

function clearConsoleConfig(consoleId: string) {
  const all = loadSavedConfigs();
  delete all[consoleId];
  localStorage.setItem(SHELF_CONFIG_KEY, JSON.stringify(all));
}

function getConsoleConfigWithSaved(consoleId: string): ShelfConfig {
  const base = { ...DEFAULT_CONFIG, ...loadGlobalDefault(), ...(CONSOLE_CONFIG[consoleId] ?? {}) };
  const saved = loadSavedConfigs()[consoleId];
  return saved ? { ...base, ...saved } : base;
}


const SLIDERS: Array<{
  key: keyof ShelfConfig; label: string;
  min: number; max: number; step: number; decimals: number;
  group?: string;  // divider label shown before this slider
}> = [
  { key: "camZ",        label: "Camera Distance",  min: 2,   max: 18,  step: 0.1,   decimals: 1, group: "Camera" },
  { key: "camFov",      label: "Field of View",    min: 30,  max: 100, step: 1,     decimals: 0 },
  { key: "tilt",        label: "Box Tilt",         min: 0,   max: 0.3, step: 0.005, decimals: 3 },
  { key: "frontGap",    label: "Front Gap",        min: 0,   max: 0.6, step: 0.01,  decimals: 2, group: "Spacing" },
  { key: "spineGap",    label: "Spine Gap",        min: 0,   max: 0.2, step: 0.005, decimals: 3 },
  { key: "hw1",         label: "±1 Pack Width",    min: 0.5, max: 6,   step: 0.1,   decimals: 1, group: "Rotation" },
  { key: "rot1",        label: "±1 Rotation (×π)", min: 0.1, max: 0.5, step: 0.01,  decimals: 2 },
  { key: "rot2",        label: "±2 Rotation (×π)", min: 0.2, max: 0.5, step: 0.01,  decimals: 2 },
  { key: "rot3",        label: "±3 Rotation (×π)", min: 0.3, max: 0.5, step: 0.01,  decimals: 2 },
  { key: "scale1",      label: "±1 Scale",         min: 0.5, max: 1.0, step: 0.01,  decimals: 2, group: "Scale" },
  { key: "scale2",      label: "±2 Scale",         min: 0.4, max: 1.0, step: 0.01,  decimals: 2 },
  { key: "scale3",      label: "±3 Scale",         min: 0.3, max: 1.0, step: 0.01,  decimals: 2 },
  { key: "logoSize",     label: "Logo Size",        min: 0.2, max: 1.5, step: 0.05,  decimals: 2, group: "Console Logo" },
  { key: "logoPos",      label: "Logo Position",   min: 0.0, max: 1.0, step: 0.01,  decimals: 2 },
  { key: "logoWMult",    label: "Logo Width",      min: 0.2, max: 3.0, step: 0.05,  decimals: 2 },
  { key: "logoHMult",    label: "Logo Height",     min: 0.2, max: 3.0, step: 0.05,  decimals: 2 },
  { key: "boxWMult",    label: "Box Width",        min: 0.3, max: 3.0, step: 0.05,  decimals: 2, group: "Box Shape" },
  { key: "boxHMult",    label: "Box Height",       min: 0.3, max: 3.0, step: 0.05,  decimals: 2 },
  { key: "boxDepth",    label: "Box Thickness",    min: 0.3, max: 4.0, step: 0.05,  decimals: 2 },
  { key: "gameLogoWMult", label: "Game Logo Width",  min: 0.2, max: 3.0, step: 0.05, decimals: 2, group: "Game Logo" },
  { key: "gameLogoHMult", label: "Game Logo Height", min: 0.2, max: 3.0, step: 0.05, decimals: 2 },
  { key: "textSize",    label: "Text Size",        min: 0.5, max: 3.0, step: 0.05,  decimals: 2, group: "Text" },
  { key: "textPos",     label: "Text Position",    min: 0.3, max: 0.9, step: 0.01,  decimals: 2 },
  { key: "textMaxWidth",label: "Text Max Width",   min: 0.2, max: 1.0, step: 0.02,  decimals: 2 },
  { key: "tvLogoY",     label: "Logo Vertical",    min: 0,   max: 70,  step: 1,     decimals: 0, group: "TV Screen" },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ShelfTab({ activeConsoleId, onSelectConsole }: { activeConsoleId: string | null; onSelectConsole: (consoleId: string) => void }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const sceneRef   = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    boxes: THREE.Group[];
    animId: number;
    targetIndex: number;
    currentOffset: number;
    dispose: () => void;
  } | null>(null);

  const { settings } = useAppSettings();
  const light = settings.theme === "light";

  const [games, setGames]           = useState<ShelfGame[]>([]);
  const [activeIdx, setActiveIdx]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showDebug, setShowDebug]   = useState(false);
  const [savedDefault, setSavedDefault] = useState(false);
  const [config, setConfig]         = useState<ShelfConfig>({ ...DEFAULT_CONFIG });
  const configRef                   = useRef<ShelfConfig>({ ...DEFAULT_CONFIG });
  const [consoleList, setConsoleList] = useState<string[]>([]);
  const [detailGame, setDetailGame] = useState<ShelfGame | null>(null);

  // ── Load ordered list of consoles that have ROMs ────────────────────────────
  useEffect(() => {
    getConsoleStats().then(stats => {
      const withRoms = new Set(stats.filter(s => s.rom_count > 0).map(s => s.console_id));
      const ordered = BUILT_IN_CONSOLES.filter(c => withRoms.has(c.id)).map(c => c.id);
      setConsoleList(ordered);
    }).catch(() => {});
  }, []);

  // ── Derive console color synchronously so background updates instantly ───────
  const activeConsoleColor = (() => {
    if (!activeConsoleId) return "#c084fc";
    const companyId = BUILT_IN_CONSOLES.find(c => c.id === activeConsoleId)?.company_id;
    return BUILT_IN_COMPANIES.find(c => c.id === companyId)?.color ?? "#c084fc";
  })();

  // ── Load games for active console ──────────────────────────────────────────
  useEffect(() => {
    if (!activeConsoleId) return;
    setLoading(true);
    setActiveIdx(0);
    // Apply per-console config defaults when switching consoles, restoring any saved spine colour
    const consoleCfg = getConsoleConfigWithSaved(activeConsoleId);
    configRef.current = consoleCfg;
    setConfig(consoleCfg);

    async function load() {
      const [result, companies] = await Promise.all([
        getRoms({ consoleId: activeConsoleId!, pageSize: 200, page: 0 }),
        getCompanies(),
      ]);
      const companyId = BUILT_IN_CONSOLES.find(c => c.id === activeConsoleId)?.company_id;
      const companyData = companyId
        ? (companies.find(c => c.id === companyId) ?? BUILT_IN_COMPANIES.find(c => c.id === companyId))
        : null;
      const color = companyData?.color ?? "#c084fc";
      setGames(result.rows.map(rom => ({ rom, consoleColor: color })));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [activeConsoleId]);

  // ── Build / rebuild Three.js scene ─────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current || loading || games.length === 0) return;

    const el = mountRef.current;
    const W = el.clientWidth;
    const H = el.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    el.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(configRef.current.camFov, W / H, 0.1, 100);
    camera.position.set(0, 0.3, configRef.current.camZ);
    camera.lookAt(0, SHELF_Y + BOX_H / 2, 0);

    // Lights — brighter ambient in light theme so boxes don't look dim
    const ambient = new THREE.AmbientLight(0xffffff, light ? 1.1 : 0.6);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, light ? 0.8 : 1.2);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(light ? 0xccccff : 0x8888ff, 0.3);
    fill.position.set(-4, 2, 3);
    scene.add(fill);

    // Shelf surface — match theme so it doesn't create a dark band in light mode
    const shelfGeo = new THREE.BoxGeometry(200, 0.06, 2);
    const shelfMat = new THREE.MeshLambertMaterial({ color: light ? 0xd4c4a0 : 0x3a2e1a });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.y = SHELF_Y - 0.03; // SHELF_Y is bottom of box space
    shelf.receiveShadow = true;
    scene.add(shelf);

    const loader = new THREE.TextureLoader();
    const boxes: THREE.Group[] = [];
    // Compute box dims for this console (all games share the same console)
    const consoleId = games[0]?.rom.console_id ?? "nes";
    const { w: cBoxW, h: cBoxH } = getBoxDims(consoleId);
    const geo = new THREE.BoxGeometry(cBoxW, cBoxH, BOX_D);

    // Material indices: +x right, -x left, +y top, -y bottom, +z front, -z back/spine
    // Three.js BoxGeometry face order: +x, -x, +y, -y, +z, -z

    const placeholderFront = makeColorTexture("#1a1a2e");
    const placeholderSpine = makeColorTexture("#2a2a4e");

    // Helper: apply anisotropy to a spine texture and assign it to materials
    function setSpineTex(mat0: THREE.MeshBasicMaterial, mat1: THREE.MeshBasicMaterial, tex: THREE.Texture) {
      tex.anisotropy = maxAnisotropy;
      mat0.map = tex; mat0.needsUpdate = true;
      mat1.map = tex; mat1.needsUpdate = true;
    }

    // Per-box spine cache so _rebuildSpines can re-draw with a new colour
    const spineCache: Array<{
      mat0: THREE.MeshBasicMaterial; mat1: THREE.MeshBasicMaterial;
      matFront: THREE.MeshBasicMaterial;
      baseColor: string; title: string; consoleId: string;
      logoUrl: string | null;
      consoleLogoUrl: string | null;       // light (white) variant
      consoleLogoUrlDark: string | null;   // dark (coloured) variant
      loadedArtUrl: string | null; // tracks which art URL is currently applied
    }> = [];

    games.forEach((g, i) => {
      const group = new THREE.Group();

      const mats = [
        new THREE.MeshBasicMaterial({ map: placeholderSpine }), // right = spine
        new THREE.MeshBasicMaterial({ map: placeholderSpine }), // left = spine
        new THREE.MeshLambertMaterial({ color: 0x111122 }), // top
        new THREE.MeshLambertMaterial({ color: 0x0a0a16 }), // bottom
        new THREE.MeshBasicMaterial({ map: placeholderFront }), // front = box art
        new THREE.MeshLambertMaterial({ color: 0x111122 }), // back
      ];

      const mesh = new THREE.Mesh(geo, mats);
      mesh.castShadow = true;
      mesh.rotation.x = 0;
      group.add(mesh);
      group.position.set(i * (cBoxW + FRONT_GAP), SHELF_Y + cBoxH / 2, 0);
      scene.add(group);
      boxes.push(group);

      // Load art async — fall back to generated placeholder if none found
      fetchAndCacheArt(g.rom.console_id, g.rom.title, "Named_Boxarts", undefined, g.rom.region, g.rom.filename)
        .then(artUrl => {
          if (artUrl) {
            mats[4].map = loadTexture(loader, artUrl, maxAnisotropy);
            mats[4].needsUpdate = true;
            cacheEntry.loadedArtUrl = artUrl;
          } else {
            makePlaceholderFrontTexture(g.rom.title, g.rom.console_id, g.consoleColor, cBoxW, cBoxH, tex => {
              mats[4].map = tex;
              mats[4].needsUpdate = true;
            });
          }
        });

      const consoleLogoUrl     = SHELF_LOGO_OVERRIDES[g.rom.console_id] ?? CONSOLE_LOGOS[g.rom.console_id] ?? null;
      const consoleLogoUrlDark = CONSOLE_LOGOS_DARK[g.rom.console_id] ?? null;
      const cacheEntry = {
        mat0: mats[0] as THREE.MeshBasicMaterial,
        mat1: mats[1] as THREE.MeshBasicMaterial,
        matFront: mats[4] as THREE.MeshBasicMaterial,
        baseColor: g.consoleColor, title: g.rom.title, consoleId: g.rom.console_id,
        logoUrl: null as string | null, consoleLogoUrl, consoleLogoUrlDark,
        loadedArtUrl: null as string | null,
      };
      spineCache.push(cacheEntry);

      fetchAndCacheLogo(g.rom.console_id, g.rom.title)
        .then(logoUrl => {
          cacheEntry.logoUrl = logoUrl;
          const color = configRef.current.spineColor || g.consoleColor;
          const activeLogoUrl = configRef.current.logoVariant === "dark" ? consoleLogoUrlDark : consoleLogoUrl;
          const spineTex = makeSpineTexture(color, g.rom.title, logoUrl, activeLogoUrl, configRef.current.textSize, configRef.current.textColor, configRef.current.textPos, configRef.current.textMaxWidth, configRef.current.textWrap, configRef.current.logoSize, configRef.current.logoRotation, configRef.current.logoPos, configRef.current.gameLogoRotation, configRef.current.logoWMult, configRef.current.logoHMult, configRef.current.gameLogoWMult, configRef.current.gameLogoHMult, configRef.current.textFlip);
          setSpineTex(mats[0] as THREE.MeshBasicMaterial, mats[1] as THREE.MeshBasicMaterial, spineTex);
        });
      // Build spine immediately with console logo, respecting any colour override
      const initColor = configRef.current.spineColor || g.consoleColor;
      const initLogoUrl = configRef.current.logoVariant === "dark" ? consoleLogoUrlDark : consoleLogoUrl;
      const initialSpine = makeSpineTexture(initColor, g.rom.title, null, initLogoUrl, configRef.current.textSize, configRef.current.textColor, configRef.current.textPos);
      setSpineTex(mats[0] as THREE.MeshBasicMaterial, mats[1] as THREE.MeshBasicMaterial, initialSpine);
    });

    let animId = 0;
    let alive = true;

    // Build obj first so the animate loop can read obj.targetIndex directly
    const obj = {
      renderer, scene, camera, boxes,
      animId: 0,
      targetIndex: 0,
      currentOffset: 0,
      dispose: () => {
        alive = false;
        cancelAnimationFrame(animId);
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      },
    };

    // _rebuildSpines re-draws all spine textures with the current spineColor config
    (obj as any)._rebuildSpines = () => {
      spineCache.forEach(e => {
        const color = configRef.current.spineColor || e.baseColor;
        const activeLogoUrl = configRef.current.logoVariant === "dark" ? e.consoleLogoUrlDark : e.consoleLogoUrl;
        const tex = makeSpineTexture(color, e.title, e.logoUrl, activeLogoUrl, configRef.current.textSize, configRef.current.textColor, configRef.current.textPos, configRef.current.textMaxWidth, configRef.current.textWrap, configRef.current.logoSize, configRef.current.logoRotation, configRef.current.logoPos, configRef.current.gameLogoRotation, configRef.current.logoWMult, configRef.current.logoHMult, configRef.current.gameLogoWMult, configRef.current.gameLogoHMult, configRef.current.textFlip);
        setSpineTex(e.mat0, e.mat1, tex);
      });
    };

    // _setTarget updates obj.targetIndex which the animate loop reads
    (obj as any)._setTarget = (idx: number) => {
      obj.targetIndex = Math.max(0, Math.min(games.length - 1, idx));
    };
    (obj as any)._boxW = cBoxW;

    sceneRef.current = obj;

    // Animation loop — reads obj.targetIndex so _setTarget works correctly
    function animate() {
      if (!alive) return;
      animId = requestAnimationFrame(animate);

      // Compute each box's target X position.
      // A box is "front" if it's the selected or ±1 neighbour, otherwise "spine".
      // We step outward from selected, adding half the left box + gap + half the right box.
      const posMap: number[] = new Array(boxes.length).fill(0);
      const sel = obj.targetIndex;

      const activeBoxW = (obj as any)._boxW ?? BOX_W;
      const cfg = configRef.current;
      const hw = (idx: number) => {
        const d = Math.abs(idx - sel);
        if (d === 0) return activeBoxW / 2;
        if (d === 1) return SPINE_W * cfg.boxDepth * cfg.hw1;
        return (SPINE_W * cfg.boxDepth) / 2;
      };
      const gap = (idx: number) => {
        const d = Math.abs(idx - sel);
        return d <= 1 ? cfg.frontGap : cfg.spineGap;
      };

      posMap[sel] = 0;

      for (let i = sel + 1; i < boxes.length; i++) {
        posMap[i] = posMap[i - 1] + hw(i - 1) + gap(i) + hw(i);
      }
      for (let i = sel - 1; i >= 0; i--) {
        posMap[i] = posMap[i + 1] - hw(i + 1) - gap(i) - hw(i);
      }

      boxes.forEach((box, i) => {
        const idxDist = i - sel;
        // Smooth position to target
        box.position.x += (posMap[i] - box.position.x) * 0.12;

        // Scale
        const absDist = Math.abs(idxDist);
        const scale = absDist === 0 ? 1.0
          : absDist === 1 ? cfg.scale1
          : absDist === 2 ? cfg.scale2
          : cfg.scale3;
        box.scale.set(scale * cfg.boxWMult, scale * cfg.boxHMult, scale * cfg.boxDepth);

        // Rotation — 3 tiers from configRef
        const sign = idxDist > 0 ? -1 : 1;
        let targetRot: number;
        if (idxDist === 0) {
          targetRot = 0;
        } else if (Math.abs(idxDist) === 1) {
          targetRot = sign * Math.PI * cfg.rot1;
        } else if (Math.abs(idxDist) === 2) {
          targetRot = sign * Math.PI * cfg.rot2;
        } else {
          targetRot = sign * Math.PI * cfg.rot3;
        }
        box.rotation.y += (targetRot - box.rotation.y) * 0.12;
        const targetTilt = idxDist === 0 ? cfg.tilt : 0;
        box.rotation.x += (targetTilt - box.rotation.x) * 0.12;
      });

      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function onResize() {
      const W = el.clientWidth, H = el.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener("resize", onResize);

    // Re-apply front textures when art lands in cache (e.g. after picker saves art)
    const unsubArt = onArtCacheUpdate(() => {
      spineCache.forEach(e => {
        const artUrl = getCachedArt(e.consoleId, e.title, "Named_Boxarts");
        if (artUrl && artUrl !== e.loadedArtUrl) {
          e.matFront.map = loadTexture(loader, artUrl, maxAnisotropy);
          e.matFront.needsUpdate = true;
          e.loadedArtUrl = artUrl;
        }
      });
    });

    // Re-apply spine textures when game logos land in cache
    const unsubLogo = onLogoCacheUpdate(() => {
      spineCache.forEach(e => {
        const logoUrl = getCachedLogo(e.consoleId, e.title);
        if (logoUrl && logoUrl !== e.logoUrl) {
          e.logoUrl = logoUrl;
          const color = configRef.current.spineColor || e.baseColor;
          const tex = makeSpineTexture(color, e.title, logoUrl, e.consoleLogoUrl, configRef.current.textSize, configRef.current.textColor, configRef.current.textPos, configRef.current.textMaxWidth, configRef.current.textWrap, configRef.current.logoSize, configRef.current.logoRotation, configRef.current.logoPos, configRef.current.gameLogoRotation, configRef.current.logoWMult, configRef.current.logoHMult, configRef.current.gameLogoWMult, configRef.current.gameLogoHMult, configRef.current.textFlip);
          setSpineTex(e.mat0, e.mat1, tex);
        }
      });
    });

    return () => {
      window.removeEventListener("resize", onResize);
      unsubArt();
      unsubLogo();
      obj.dispose();
      sceneRef.current = null;
    };
  }, [games, loading, light]);

  // ── Debug config helpers ────────────────────────────────────────────────────
  const updateConfig = useCallback((key: keyof ShelfConfig, val: number | string | boolean) => {
    (configRef.current as any)[key] = val;
    if (sceneRef.current) {
      if (key === "camZ")      sceneRef.current.camera.position.z = val as number;
      if (key === "camFov") {
        sceneRef.current.camera.fov = val as number;
        sceneRef.current.camera.updateProjectionMatrix();
      }
    }
    if (activeConsoleId) saveConsoleConfig(activeConsoleId, configRef.current);
    setConfig({ ...configRef.current });
  }, [activeConsoleId]);

  // Reactively rebuild spines whenever any spine appearance setting changes
  useEffect(() => {
    (sceneRef.current as any)?._rebuildSpines?.();
  }, [config.spineColor, config.logoVariant, config.logoSize, config.logoRotation, config.logoPos, config.logoWMult, config.logoHMult, config.gameLogoRotation, config.gameLogoWMult, config.gameLogoHMult, config.textSize, config.textColor, config.textPos, config.textMaxWidth, config.textWrap, config.textFlip]);

  // ── Detail modal helpers ────────────────────────────────────────────────────
  const openDetail = useCallback(() => {
    setDetailGame(prev => prev ?? (games[activeIdx] ?? null));
  }, [games, activeIdx]);

  const handleCycleBacklog = useCallback(async (rom: RomEntry) => {
    const next = BACKLOG_NEXT[rom.backlog_status ?? "none"] as BacklogStatus | "none";
    const newStatus = next === "none" ? null : (next as BacklogStatus);
    await updateBacklog(rom.id, newStatus);
    const updated = { ...rom, backlog_status: newStatus ?? undefined };
    setGames(prev => prev.map(g => g.rom.id === rom.id ? { ...g, rom: updated } : g));
    setDetailGame(prev => prev && prev.rom.id === rom.id ? { ...prev, rom: updated } : prev);
  }, []);

  const handleSaveNote = useCallback(async (romId: number, note: string) => {
    await updateNote(romId, note);
    setGames(prev => prev.map(g => g.rom.id === romId ? { ...g, rom: { ...g.rom, note } } : g));
    setDetailGame(prev => prev && prev.rom.id === romId ? { ...prev, rom: { ...prev.rom, note } } : prev);
  }, []);

  const handleRenameRom = useCallback(async (romId: number, title: string) => {
    await updateTitle(romId, title);
    setGames(prev => prev.map(g => g.rom.id === romId ? { ...g, rom: { ...g.rom, title } } : g));
    setDetailGame(prev => prev && prev.rom.id === romId ? { ...prev, rom: { ...prev.rom, title } } : prev);
  }, []);

  const handleDeleteRom = useCallback(async (romId: number) => {
    await deleteRom(romId);
    setGames(prev => prev.filter(g => g.rom.id !== romId));
    setDetailGame(null);
    setActiveIdx(prev => Math.max(0, prev - 1));
  }, []);

  // ── Scroll / key navigation ─────────────────────────────────────────────────
  const navigate = useCallback((delta: number) => {
    setActiveIdx(prev => {
      const next = Math.max(0, Math.min(games.length - 1, prev + delta));
      if (sceneRef.current) {
        (sceneRef.current as any)._setTarget(next);
      }
      return next;
    });
  }, [games.length]);

  useEffect(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      navigate(e.deltaY > 0 ? 1 : -1);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft")  navigate(-1);
    }
    const el = mountRef.current;
    el?.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el?.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [navigate]);

  // ── Console adjacency (computed here so gamepad hooks can use it before early return) ──
  const currentListIdx = activeConsoleId ? consoleList.indexOf(activeConsoleId) : -1;
  const prevConsoleId  = currentListIdx > 0                      ? consoleList[currentListIdx - 1] : null;
  const nextConsoleId  = currentListIdx < consoleList.length - 1 ? consoleList[currentListIdx + 1] : null;

  // ── Gamepad support ──────────────────────────────────────────────────────────
  const controllerConnected = useGamepadConnected();

  useGamepadAction((action) => {
    if (action === "left")  navigate(-1);
    if (action === "right") navigate(1);
    if (action === "lt" && prevConsoleId) onSelectConsole(prevConsoleId);
    if (action === "rt" && nextConsoleId) onSelectConsole(nextConsoleId);
  });

  const scrollAccRef = useRef(0);
  useGamepadScroll((dy) => {
    scrollAccRef.current += dy;
    if      (scrollAccRef.current >=  100) { scrollAccRef.current = 0; navigate(1); }
    else if (scrollAccRef.current <= -100) { scrollAccRef.current = 0; navigate(-1); }
  });

  // ── No console selected ─────────────────────────────────────────────────────
  if (!activeConsoleId) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12, color: "var(--text-muted)",
      }}>
        <div style={{ fontSize: 48 }}>🎮</div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>SELECT A CONSOLE</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", maxWidth: 280 }}>
          Choose a console from the sidebar to view its games on the shelf.
        </div>
      </div>
    );
  }

  const active = games[activeIdx];

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", userSelect: "none" }}>

      {/* Background layer */}
      <PlaceholderBg
        tvLogoY={config.tvLogoY}
        consoleColor={activeConsoleColor} colorGlow={config.colorGlow}
        consoleList={consoleList} currentIdx={currentListIdx}
      />

      {/* Three.js canvas mount */}
      <div
        ref={mountRef}
        onClick={openDetail}
        style={{
          position: "absolute", inset: 0, cursor: "default",
          opacity: loading ? 0 : 1,
          transition: "opacity 0.4s ease",
        }}
      />

      {/* TV logo overlay — rendered above canvas so clicks work */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        width: "62%", height: "52%",
        pointerEvents: "none",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: `${config.tvLogoY}%`,
      }}>
        {/* Prev click zone — transparent, carousel renders the logo */}
        <div
          onClick={() => { if (prevConsoleId) onSelectConsole(prevConsoleId); }}
          style={{
            flex: 1, height: "35%",
            cursor: prevConsoleId ? "pointer" : "default",
            pointerEvents: prevConsoleId ? "auto" : "none",
          }}
        />

        {/* Spacer matching center logo width */}
        <div style={{ width: "33%", flexShrink: 0 }} />

        {/* Next click zone — transparent, carousel renders the logo */}
        <div
          onClick={() => { if (nextConsoleId) onSelectConsole(nextConsoleId); }}
          style={{
            flex: 1, height: "35%",
            cursor: nextConsoleId ? "pointer" : "default",
            pointerEvents: nextConsoleId ? "auto" : "none",
          }}
        />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.1em",
        }}>
          LOADING SHELF…
        </div>
      )}

      {/* Game title strip at bottom */}
      {active && !loading && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "56px 24px 16px",
          background: light
            ? "linear-gradient(0deg, rgba(112,112,128,0.97) 0%, rgba(112,112,128,0.92) 35%, rgba(112,112,128,0.6) 65%, transparent 100%)"
            : "linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.3) 70%, transparent 100%)",
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          pointerEvents: "none",
        }}>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: "white",
              textShadow: "0 1px 6px rgba(0,0,0,0.6)",
              letterSpacing: "0.04em",
            }}>
              {active.rom.title}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
              {activeIdx + 1} / {games.length}
            </div>
          </div>
          <div style={{
            display: "flex", gap: 8,
            fontSize: 10, color: "rgba(255,255,255,0.55)",
          }}>
            {controllerConnected ? (
              <>
                <span>D-pad ← →  navigate</span>
                <span>·</span>
                <span>LT / RT  console</span>
                <span>·</span>
                <span>click  details</span>
              </>
            ) : (
              <>
                <span>← →  navigate</span>
                <span>·</span>
                <span>scroll</span>
                <span>·</span>
                <span>click  details</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Game detail modal ── */}
      {detailGame && (
        <div style={{ display: "none" }}>
          <RomCardSmall
            rom={detailGame.rom}
            companyColor={detailGame.consoleColor}
            controllerOpen={true}
            isControllerSelected={true}
            onControllerClose={() => setDetailGame(null)}
            onCycleBacklog={handleCycleBacklog}
            onSaveNote={handleSaveNote}
            onRenameRom={handleRenameRom}
            onDelete={handleDeleteRom}
          />
        </div>
      )}

      {/* ── Tuning panel ── */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 30 }}>
        <button
          onClick={() => setShowDebug(v => !v)}
          style={{
            background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "6px 14px",
            fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", fontWeight: 700,
          }}
        >
          {showDebug ? "✕ Close" : "⚙ Settings"}
        </button>

        {showDebug && (
          <div style={{
            marginTop: 6,
            background: "rgba(10,10,22,0.96)", border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 12, padding: "16px 18px", width: 310,
            backdropFilter: "blur(12px)",
            maxHeight: "82vh", overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            {/* Header */}
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#c084fc", marginBottom: 16 }}>
              SHELF SETTINGS
            </div>

            {/* ── Sliders ── */}
            {SLIDERS.map(s => (
              <div key={s.key}>
                {s.group && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 10px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(192,132,252,0.7)", whiteSpace: "nowrap" }}>
                      {s.group.toUpperCase()}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                    {s.group === "Console Logo" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {(["light", "dark"] as const).map(v => (
                            <button key={v} onClick={() => updateConfig("logoVariant", v)} style={{
                              fontSize: 9, padding: "2px 7px", borderRadius: 3, cursor: "pointer",
                              background: config.logoVariant === v ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                              border: config.logoVariant === v ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.1)",
                              color: config.logoVariant === v ? "#c084fc" : "rgba(255,255,255,0.4)",
                            }}>{v}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {([0, 90, -90, 180] as number[]).map(deg => (
                            <button key={deg} onClick={() => updateConfig("logoRotation", deg)} style={{
                              fontSize: 9, padding: "2px 7px", borderRadius: 3, cursor: "pointer",
                              background: config.logoRotation === deg ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                              border: config.logoRotation === deg ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.1)",
                              color: config.logoRotation === deg ? "#c084fc" : "rgba(255,255,255,0.4)",
                            }}>{deg}°</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.group === "Box Shape" && (
                      <div style={{ display: "flex", gap: 3 }}>
                        {([
                          { label: "Default", w: 1.0,  h: 1.0 },
                          { label: "Slim",    w: 0.65, h: 1.0 },
                          { label: "Wide",    w: 1.5,  h: 1.0 },
                          { label: "Tall",    w: 0.75, h: 1.2 },
                          { label: "Square",  w: 1.0,  h: 0.8 },
                        ] as { label: string; w: number; h: number }[]).map(p => (
                          <button key={p.label} onClick={() => { updateConfig("boxWMult", p.w); updateConfig("boxHMult", p.h); }} style={{
                            fontSize: 9, padding: "2px 6px", borderRadius: 3, cursor: "pointer", whiteSpace: "nowrap",
                            background: config.boxWMult === p.w && config.boxHMult === p.h ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                            border: config.boxWMult === p.w && config.boxHMult === p.h ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.1)",
                            color: config.boxWMult === p.w && config.boxHMult === p.h ? "#c084fc" : "rgba(255,255,255,0.4)",
                          }}>{p.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{s.label}</span>
                    <span style={{ fontSize: 11, color: "white", fontFamily: "monospace", fontWeight: 600 }}>
                      {(config[s.key] as number).toFixed(s.decimals)}
                    </span>
                  </div>
                  <input
                    type="range" min={s.min} max={s.max} step={s.step}
                    value={config[s.key] as number}
                    onChange={e => updateConfig(s.key, parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#c084fc", cursor: "pointer" }}
                  />
                </div>
              </div>
            ))}

            {/* ── Colours ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(192,132,252,0.7)", whiteSpace: "nowrap" }}>COLOURS</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Colour row helper */}
            {([
              { label: "Spine", key: "spineColor" as const, swatches: ["#c084fc","#3b82f6","#22c55e","#ef4444","#f59e0b","#ec4899","#06b6d4","#1e1b4b","#0f172a","#f8fafc"] },
              { label: "Text",  key: "textColor"  as const, swatches: ["#ffffff","#f8fafc","#fef08a","#fde68a","#f59e0b","#c084fc","#86efac","#7dd3fc","#fca5a5","#000000"] },
            ]).map(row => (
              <div key={row.key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{row.label}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {config[row.key] && <div style={{ width: 16, height: 16, borderRadius: 3, background: config[row.key], border: "1px solid rgba(255,255,255,0.2)" }} />}
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{config[row.key] || "default"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 7 }}>
                  {row.swatches.map(hex => (
                    <Tooltip key={hex} content={hex}>
                    <button onClick={() => updateConfig(row.key, hex)} style={{
                      width: 22, height: 22, borderRadius: 4, background: hex, cursor: "pointer", padding: 0,
                      border: config[row.key] === hex ? "2px solid white" : "2px solid transparent",
                    }} />
                    </Tooltip>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="text" placeholder="#rrggbb" maxLength={7} value={config[row.key]}
                    onChange={e => {
                      const v = e.target.value;
                      if (!/^#?[0-9a-fA-F]{0,6}$/.test(v.replace(/^#/, ""))) return;
                      const formatted = v.startsWith("#") ? v : v ? "#" + v : "";
                      // Update config (and trigger rebuild) only when empty or complete
                      if (formatted === "" || /^#[0-9a-fA-F]{6}$/.test(formatted)) {
                        updateConfig(row.key, formatted);
                      } else {
                        // Update display state only — no rebuild yet
                        setConfig(prev => ({ ...prev, [row.key]: formatted }));
                      }
                    }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 4, color: "white", fontSize: 11, padding: "5px 8px", fontFamily: "monospace", outline: "none" }}
                  />
                  <button onClick={() => updateConfig(row.key, "")} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "5px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                    reset
                  </button>
                </div>
              </div>
            ))}

            {/* ── Text / Game Logo ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(192,132,252,0.7)", whiteSpace: "nowrap" }}>TEXT / GAME LOGO</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Text flip */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Text direction</span>
              <div style={{ display: "flex", gap: 4 }}>
                {([{ label: "Normal", val: false }, { label: "Flip 180°", val: true }] as { label: string; val: boolean }[]).map(o => (
                  <button key={String(o.val)} onClick={() => updateConfig("textFlip", o.val)} style={{
                    fontSize: 10, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                    background: config.textFlip === o.val ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                    border: config.textFlip === o.val ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.12)",
                    color: config.textFlip === o.val ? "#c084fc" : "rgba(255,255,255,0.45)",
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* Text overflow */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Text overflow</span>
              <div style={{ display: "flex", gap: 4 }}>
                {([{ label: "Truncate", val: false }, { label: "Wrap", val: true }] as { label: string; val: boolean }[]).map(o => (
                  <button key={o.label} onClick={() => updateConfig("textWrap", o.val)} style={{
                    fontSize: 10, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                    background: config.textWrap === o.val ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                    border: config.textWrap === o.val ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.12)",
                    color: config.textWrap === o.val ? "#c084fc" : "rgba(255,255,255,0.45)",
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* Game logo rotation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Game logo rotation</span>
              <div style={{ display: "flex", gap: 4 }}>
                {([0, 90, 180, -90] as number[]).map(deg => (
                  <button key={deg} onClick={() => updateConfig("gameLogoRotation", deg)} style={{
                    fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                    background: config.gameLogoRotation === deg ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                    border: config.gameLogoRotation === deg ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.12)",
                    color: config.gameLogoRotation === deg ? "#c084fc" : "rgba(255,255,255,0.45)",
                  }}>{deg}°</button>
                ))}
              </div>
            </div>

            {/* ── Color glow toggle ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Console color glow</span>
              <button
                onClick={() => updateConfig("colorGlow", !config.colorGlow)}
                style={{
                  fontSize: 10, padding: "4px 12px", borderRadius: 4, cursor: "pointer",
                  background: config.colorGlow ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.05)",
                  border: config.colorGlow ? "1px solid rgba(192,132,252,0.6)" : "1px solid rgba(255,255,255,0.12)",
                  color: config.colorGlow ? "#c084fc" : "rgba(255,255,255,0.45)",
                }}
              >
                {config.colorGlow ? "ON" : "OFF"}
              </button>
            </div>

            {/* ── Footer buttons ── */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => {
                  saveGlobalDefault(configRef.current);
                  setSavedDefault(true);
                  setTimeout(() => setSavedDefault(false), 2000);
                }}
                style={{
                  flex: 1, background: savedDefault ? "rgba(192,132,252,0.3)" : "rgba(192,132,252,0.18)",
                  border: "1px solid rgba(192,132,252,0.4)", color: "#c084fc",
                  borderRadius: 6, padding: "8px 0", fontSize: 11,
                  cursor: "pointer", letterSpacing: "0.08em", fontWeight: 700,
                }}
              >
                {savedDefault ? "✓ Saved as Default" : "Set as Default"}
              </button>
              <button
                onClick={() => { if (activeConsoleId) clearConsoleConfig(activeConsoleId); const c = getConsoleConfig(activeConsoleId ?? ""); configRef.current = c; setConfig(c); }}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)",
                  borderRadius: 6, padding: "8px 0", fontSize: 11,
                  cursor: "pointer", letterSpacing: "0.08em",
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
