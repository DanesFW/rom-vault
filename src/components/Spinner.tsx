import { useEffect } from "react";

const STYLE_ID = "rvault-spinner-keyframes";

function ensureKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `@keyframes rvault-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

interface SpinnerProps {
  size?: number;
  color?: string;
}

export default function Spinner({ size = 14, color = "currentColor" }: SpinnerProps) {
  useEffect(() => { ensureKeyframes(); }, []);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "rvault-spin 0.75s linear infinite", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2 a10 10 0 0 1 10 10" />
    </svg>
  );
}
