import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  content: React.ReactNode;
  children: React.ReactElement;
  /** Accent color for the border/glow. Defaults to a neutral purple-grey. */
  color?: string;
}

export default function Tooltip({ content, children, color = "#7878aa" }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = children.props as any;

  const child = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); p.onMouseEnter?.(e); },
    onMouseMove:  (e: React.MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); p.onMouseMove?.(e); },
    onMouseLeave: (e: React.MouseEvent) => { setPos(null); p.onMouseLeave?.(e); },
  });

  // Read the previous render's measured width (one frame behind — imperceptible).
  // Using left:0 + translateX ensures width:max-content is never constrained by
  // the remaining right-side space of the viewport.
  const tipW        = tipRef.current?.offsetWidth ?? 200;
  const MARGIN      = 8;
  const rawLeft     = pos ? pos.x - tipW / 2 : 0;
  const clampedLeft = Math.min(Math.max(rawLeft, MARGIN), window.innerWidth - tipW - MARGIN);
  const arrowLeft   = pos ? Math.max(10, Math.min(pos.x - clampedLeft, tipW - 10)) : tipW / 2;

  return (
    <>
      {child}
      {pos && createPortal(
        <div ref={tipRef} style={{
          position: "fixed",
          left: 0,
          top: pos.y - 10,
          transform: `translateX(${clampedLeft}px) translateY(-100%)`,
          zIndex: 99999,
          pointerEvents: "none",
          background: "var(--bg-surface)",
          border: `1px solid ${color}44`,
          borderRadius: 6,
          padding: "6px 10px",
          boxShadow: `0 0 0 1px ${color}18, 0 0 14px ${color}22, 0 8px 24px rgba(0,0,0,0.55)`,
          fontFamily: "var(--font)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-dim)",
          maxWidth: 260,
          lineHeight: 1.5,
          whiteSpace: "normal",
          wordBreak: "break-word",
        }}>
          {content}
          <div style={{
            position: "absolute",
            bottom: -5, left: arrowLeft - 4,
            transform: "rotate(45deg)",
            width: 8, height: 8,
            background: "var(--bg-surface)",
            borderRight: `1px solid ${color}44`,
            borderBottom: `1px solid ${color}44`,
          }} />
        </div>,
        document.body
      )}
    </>
  );
}
