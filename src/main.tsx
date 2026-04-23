import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./spin.css";
import "./index.css";
import App from "./App";
import { initDb } from "./db";

// ── Apply ALL CSS variables before first paint to prevent any flash ───────────
(function applySavedSettings() {
  try {
    const stored = localStorage.getItem("romvault-display-settings");
    const s = stored ? JSON.parse(stored) : {};
    const isLight = s.theme === "light";

    const vars: Record<string, string> = isLight ? {
      "--bg":          "#f4f4fa",
      "--bg-surface":  "#ebebf5",
      "--bg-card":     "#e4e4f0",
      "--bg-hover":    "#dcdcec",
      "--border":      "#c8c8e0",
      "--border-lit":  "#aaaac8",
      "--text":        "#18182e",
      "--text-dim":    "#44446a",
      "--text-muted":  "#888aaa",
    } : {
      "--bg":          "#080810",
      "--bg-surface":  "#0c0c1a",
      "--bg-card":     "#0e0e1c",
      "--bg-hover":    "#14142a",
      "--border":      "#1e1e36",
      "--border-lit":  "#32325a",
      "--text":        "#eeeef8",
      "--text-dim":    "#9898b8",
      "--text-muted":  "#606080",
    };

    const root = document.documentElement;
    root.setAttribute("data-theme", isLight ? "light" : "dark");
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.style.background = isLight ? "#f4f4fa" : "#080810";
    document.body.style.color      = isLight ? "#18182e" : "#eeeef8";

    const FONT_MAP: Record<string, number> = { small: 13, medium: 15, large: 17, xl: 19 };
    if (FONT_MAP[s.fontSize]) document.body.style.fontSize = `${FONT_MAP[s.fontSize]}px`;
  } catch {}
})();

function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDb()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh",
        background: "var(--bg)", color: "var(--accent, #4ade80)",
        fontFamily: "JetBrains Mono, monospace", fontSize: 14,
        letterSpacing: "0.1em", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "var(--accent, #4ade80)",
          animation: "spin 0.8s linear infinite",
        }} />
        LOADING VAULT…
      </div>
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
