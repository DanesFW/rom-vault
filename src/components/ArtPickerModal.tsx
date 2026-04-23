import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Image } from "lucide-react";
import { LIBRETRO_SYSTEMS, artFilename, bumpCacheExternal } from "../hooks/useArtwork";
import { getSteamGridDbKey } from "../hooks/useApiKeys";
import type { ArtType } from "../hooks/useArtwork";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

interface Props {
  consoleId: string;
  title: string;
  artType: ArtType;
  companyColor: string;
  onPicked: (dataUrl: string) => void;
  onClose: () => void;
}

interface SgdbGrid {
  id: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
}

type Source = "libretro" | "sgdb";

export default function ArtPickerModal({
  consoleId, title, artType, companyColor, onPicked, onClose,
}: Props) {
  const system = LIBRETRO_SYSTEMS[consoleId];
  const sgdbKey = getSteamGridDbKey().trim();

  // ── source toggle ─────────────────────────────────────────────────────────
  const [source, setSource] = useState<Source>(system ? "libretro" : "sgdb");

  // ── LibRetro state ────────────────────────────────────────────────────────
  const [lrEntries, setLrEntries] = useState<string[]>([]);
  const [lrLoading, setLrLoading] = useState(false);
  const [lrError,   setLrError]   = useState("");
  const [query,     setQuery]     = useState(title);

  // ── SteamGridDB state ─────────────────────────────────────────────────────
  const [sgdbQuery,   setSgdbQuery]   = useState(title);
  const [sgdbGrids,   setSgdbGrids]   = useState<SgdbGrid[]>([]);
  const [sgdbLoading, setSgdbLoading] = useState(false);
  const [sgdbError,   setSgdbError]   = useState("");
  const [sgdbSearched, setSgdbSearched] = useState(false);

  const [fetching, setFetching] = useState<string | null>(null);
  const sgdbInputRef = useRef<HTMLInputElement>(null);

  // ── Load LibRetro index ───────────────────────────────────────────────────
  useEffect(() => {
    if (!system || !IS_TAURI) return;
    setLrLoading(true);
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const base = `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}`;

      // Strategy 1: .index plaintext
      try {
        const text: string = await invoke("fetch_thumbnail_index", { url: `${base}/.index` });
        const list = text.split("\n").map(l => l.trim().replace(/\.png$/i, "")).filter(Boolean);
        if (list.length > 0) { setLrEntries(list.sort()); setLrLoading(false); return; }
      } catch { /* fall through */ }

      // Strategy 2: HTML directory listing
      try {
        const html: string = await invoke("fetch_thumbnail_index", { url: `${base}/` });
        const doc = new DOMParser().parseFromString(html, "text/html");
        const list: string[] = [];
        doc.querySelectorAll("a[href]").forEach(el => {
          const href = el.getAttribute("href") ?? "";
          if (href.toLowerCase().endsWith(".png") && !href.startsWith("/") && !href.startsWith("?") && !href.startsWith("..")) {
            list.push(decodeURIComponent(href).replace(/\.png$/i, ""));
          }
        });
        if (list.length > 0) { setLrEntries(list.sort()); setLrLoading(false); return; }
      } catch { /* fall through */ }

      // No LibRetro coverage — auto-switch to SGDB if key is available
      setLrError("Not in LibRetro database.");
      setLrLoading(false);
      if (sgdbKey) setSource("sgdb");
    })();
  }, [system, artType]);

  // ── SteamGridDB search ────────────────────────────────────────────────────
  async function doSgdbSearch() {
    if (!IS_TAURI || !sgdbKey || !sgdbQuery.trim()) return;
    setSgdbLoading(true);
    setSgdbError("");
    setSgdbGrids([]);
    setSgdbSearched(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");

      // 1. Find game ID
      const searchData: any = JSON.parse(await invoke("sgdb_get", {
        url: `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(sgdbQuery.trim())}`,
        apiKey: sgdbKey,
      }));
      const games: { id: number; name: string }[] = searchData?.data ?? [];
      if (games.length === 0) { setSgdbError("No games found."); setSgdbLoading(false); return; }

      const exact = games.find(g => g.name.toLowerCase() === sgdbQuery.trim().toLowerCase());
      const gameId = (exact ?? games[0]).id;

      // 2. Fetch grids for that game
      const gridData: any = JSON.parse(await invoke("sgdb_get", {
        url: `https://www.steamgriddb.com/api/v2/grids/game/${gameId}`,
        apiKey: sgdbKey,
      }));
      const grids: SgdbGrid[] = (gridData?.data ?? []).filter((g: any) => g.url && g.thumb);
      if (grids.length === 0) { setSgdbError("No cover art found for this game."); setSgdbLoading(false); return; }

      setSgdbGrids(grids);
    } catch (e) {
      setSgdbError(`Search failed: ${e}`);
    } finally {
      setSgdbLoading(false);
    }
  }

  // ── Pick handlers ─────────────────────────────────────────────────────────
  async function handlePickLibretro(entry: string) {
    if (!IS_TAURI || fetching) return;
    setFetching(entry);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const encodedEntry = encodeURIComponent(entry).replace(/%27/g, "'");
      const url = `https://thumbnails.libretro.com/${encodeURIComponent(system)}/${artType}/${encodedEntry}.png`;
      const filename = artFilename(consoleId, title, artType);
      const savedPath: string = await invoke("fetch_and_save_cover_art", { url, filename });
      const b64: string = await invoke("load_cover_art", { path: savedPath });
      bumpCacheExternal(consoleId, title, artType, `data:image/png;base64,${b64}`);
      onPicked(`data:image/png;base64,${b64}`);
    } catch (e) {
      setLrError(`Failed to fetch: ${e}`);
      setFetching(null);
    }
  }

  async function handlePickSgdb(grid: SgdbGrid) {
    if (!IS_TAURI || fetching) return;
    const key = String(grid.id);
    setFetching(key);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const filename = artFilename(consoleId, title, artType);
      const savedPath: string = await invoke("fetch_and_save_cover_art", { url: grid.url, filename });
      const b64: string = await invoke("load_cover_art", { path: savedPath });
      bumpCacheExternal(consoleId, title, artType, `data:image/png;base64,${b64}`);
      onPicked(`data:image/png;base64,${b64}`);
    } catch (e) {
      setSgdbError(`Failed to fetch: ${e}`);
      setFetching(null);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const lrWords    = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lrFiltered = lrEntries.filter(e => lrWords.every(w => e.toLowerCase().includes(w)));

  const hasBothSources = system && sgdbKey;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, backdropFilter: "blur(4px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(560px, 100%)",
        height: "min(640px, 85vh)",
        background: "var(--bg-surface)",
        border: `1px solid ${companyColor}55`,
        borderRadius: 10, overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: `0 0 40px ${companyColor}22, 0 24px 48px rgba(0,0,0,0.5)`,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <Image size={13} style={{ color: companyColor }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: companyColor }}>
              SEARCH COVER ART
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{title}</div>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>

        {/* Source toggle (only shown when both sources available) */}
        {hasBothSources && (
          <div style={{
            display: "flex", gap: 0, padding: "8px 14px",
            borderBottom: "1px solid var(--border)", flexShrink: 0,
          }}>
            {(["libretro", "sgdb"] as Source[]).map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                style={{
                  flex: 1, padding: "5px 8px",
                  background: source === s ? `${companyColor}22` : "transparent",
                  border: `1px solid ${source === s ? companyColor : "var(--border)"}`,
                  borderRadius: s === "libretro" ? "4px 0 0 4px" : "0 4px 4px 0",
                  color: source === s ? companyColor : "var(--text-muted)",
                  fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.07em", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s === "libretro" ? "LIBRETRO" : "STEAMGRIDDB"}
              </button>
            ))}
          </div>
        )}

        {/* ── LibRetro panel ── */}
        {source === "libretro" && (
          <>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid var(--border)",
              flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter by words…"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
                }}
              />
              {lrFiltered.length > 0 && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                  {lrFiltered.length} match{lrFiltered.length !== 1 ? "es" : ""}
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {lrLoading && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
                  Loading index…
                </div>
              )}
              {!lrLoading && lrError && (
                <div style={{ padding: "16px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                  {lrError}
                  {sgdbKey && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => setSource("sgdb")} style={{
                        background: `${companyColor}22`, border: `1px solid ${companyColor}`,
                        color: companyColor, borderRadius: 4, padding: "4px 10px",
                        fontFamily: "var(--font)", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.07em", cursor: "pointer",
                      }}>
                        SEARCH STEAMGRIDDB INSTEAD
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!lrLoading && !lrError && lrFiltered.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
                  No matches — try different search words
                </div>
              )}
              {!lrLoading && lrFiltered.map(entry => (
                <button
                  key={entry}
                  onClick={() => handlePickLibretro(entry)}
                  disabled={!!fetching}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    padding: "9px 14px", gap: 10, textAlign: "left",
                    background: fetching === entry ? `${companyColor}18` : "none",
                    border: "none", borderBottom: "1px solid var(--border)",
                    color: fetching === entry ? companyColor : "var(--text)",
                    fontFamily: "var(--font)", fontSize: 11, cursor: fetching ? "default" : "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseOver={e => { if (!fetching) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseOut={e => { if (!fetching) (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <Image size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{entry}</span>
                  {fetching === entry && (
                    <span style={{ fontSize: 9, color: companyColor, flexShrink: 0 }}>FETCHING…</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── SteamGridDB panel ── */}
        {source === "sgdb" && (
          <>
            {/* SGDB search bar */}
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid var(--border)",
              flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                ref={sgdbInputRef}
                autoFocus={source === "sgdb"}
                value={sgdbQuery}
                onChange={e => setSgdbQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") doSgdbSearch(); }}
                placeholder="Search SteamGridDB…"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text)", fontFamily: "var(--font)", fontSize: 12,
                }}
              />
              <button
                onClick={doSgdbSearch}
                disabled={sgdbLoading || !sgdbQuery.trim()}
                style={{
                  padding: "4px 10px", background: `${companyColor}22`,
                  border: `1px solid ${companyColor}66`, borderRadius: 4,
                  color: companyColor, fontFamily: "var(--font)", fontSize: 9,
                  fontWeight: 700, letterSpacing: "0.07em",
                  cursor: sgdbLoading ? "default" : "pointer",
                  opacity: sgdbLoading || !sgdbQuery.trim() ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {sgdbLoading ? "…" : "SEARCH"}
              </button>
            </div>

            {/* No API key warning */}
            {!sgdbKey && (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
                Add a SteamGridDB API key in Settings to search.
              </div>
            )}

            {/* SGDB results */}
            {sgdbKey && (
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {!sgdbSearched && !sgdbLoading && (
                  <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
                    Press Search or Enter to find cover art
                  </div>
                )}
                {sgdbLoading && (
                  <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
                    Searching…
                  </div>
                )}
                {!sgdbLoading && sgdbError && (
                  <div style={{ padding: "16px", fontSize: 11, color: "#f87171", textAlign: "center" }}>
                    {sgdbError}
                  </div>
                )}
                {!sgdbLoading && !sgdbError && sgdbGrids.length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: 8, padding: 12,
                  }}>
                    {sgdbGrids.map(grid => (
                      <button
                        key={grid.id}
                        onClick={() => handlePickSgdb(grid)}
                        disabled={!!fetching}
                        title={`${grid.width}×${grid.height}`}
                        style={{
                          position: "relative", padding: 0,
                          background: "var(--bg-card)",
                          border: `1px solid ${fetching === String(grid.id) ? companyColor : "var(--border)"}`,
                          borderRadius: 6, overflow: "hidden", cursor: fetching ? "default" : "pointer",
                          transition: "border-color 0.12s",
                          aspectRatio: `${grid.width} / ${grid.height}`,
                        }}
                        onMouseOver={e => {
                          if (!fetching) (e.currentTarget as HTMLElement).style.borderColor = companyColor;
                        }}
                        onMouseOut={e => {
                          if (!fetching) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        }}
                      >
                        <img
                          src={grid.thumb}
                          alt=""
                          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {fetching === String(grid.id) && (
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: companyColor, letterSpacing: "0.07em",
                          }}>
                            SAVING…
          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
