/**
 * useLogo.ts
 * Fetches game logo images from SteamGridDB and caches them to disk
 * alongside box art, using the same file conventions as useArtwork.ts.
 *
 * Disk filename: {consoleId}__{canonicalTitle}__Logo.png
 *
 * Flow per game:
 *   1. Check memory cache
 *   2. Check disk  (covers dir, same as box art)
 *   3. Search SteamGridDB for game ID by title
 *   4. Fetch logo list for that game ID
 *   5. Download first result, save to disk, inject into memory cache
 */

import { useState, useEffect, useRef } from "react";
import { artFilename } from "./useArtwork";
import { getSteamGridDbKey } from "./useApiKeys";
import { isOffline } from "./useAppSettings";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

// ── Module-level caches ───────────────────────────────────────────────────────

// key: "consoleId::canonicalTitle"
const memCache  = new Map<string, string | "loading" | "error" | "no-key">();
const inFlight  = new Set<string>();
const notFound  = new Set<string>();
const listeners = new Set<() => void>();

function cacheKey(consoleId: string, title: string) {
  return `${consoleId}::${title.toLowerCase().trim()}`;
}

function bumpListeners() {
  listeners.forEach(fn => fn());
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function sgdbGet(path: string, apiKey: string): Promise<any> {
  // Route through Rust proxy to avoid Tauri webview network restrictions
  const { invoke } = await import("@tauri-apps/api/core");
  const body: string = await invoke("sgdb_get", {
    url: `https://www.steamgriddb.com/api/v2${path}`,
    apiKey,
  });
  return JSON.parse(body);
}

/** Search for a game by title, return the first matching SGDB game ID or null */
async function searchGameId(title: string, apiKey: string): Promise<number | null> {
  try {
    const data = await sgdbGet(
      `/search/autocomplete/${encodeURIComponent(title)}`,
      apiKey
    );
    const games: { id: number; name: string }[] = data?.data ?? [];
    if (games.length === 0) return null;
    // Prefer an exact title match, fall back to first result
    const exact = games.find(
      g => g.name.toLowerCase() === title.toLowerCase()
    );
    return exact?.id ?? games[0].id;
  } catch {
    return null;
  }
}

/** Get logo URLs for a SGDB game ID, return the first PNG URL or null */
async function fetchLogoUrl(gameId: number, apiKey: string): Promise<string | null> {
  try {
    const data = await sgdbGet(`/logos/game/${gameId}`, apiKey);
    const logos: { url: string; thumb: string }[] = data?.data ?? [];
    return logos[0]?.url ?? null;
  } catch {
    return null;
  }
}

// ── Core fetcher ──────────────────────────────────────────────────────────────

export async function fetchAndCacheLogo(
  consoleId: string,
  title: string
): Promise<string | null> {
  const key = cacheKey(consoleId, title);

  if (notFound.has(key))   return null;
  if (inFlight.has(key))   return null;

  const cached = memCache.get(key);
  if (cached && cached !== "loading" && cached !== "error" && cached !== "no-key") {
    return cached;
  }
  if (cached === "error" || cached === "no-key") return null;

  const apiKey = getSteamGridDbKey().trim();
  if (!apiKey) {
    memCache.set(key, "no-key");
    return null;
  }

  if (!IS_TAURI) return null;

  inFlight.add(key);
  memCache.set(key, "loading");

  try {
    const { invoke } = await import("@tauri-apps/api/core");

    // 1. Check disk first
    const filename  = artFilename(consoleId, title, "Logo" as any);
    const coversDir: string = await invoke("get_cover_art_dir");
    const sep       = coversDir.includes("\\") ? "\\" : "/";
    const fullPath  = `${coversDir}${sep}${filename}`;

    try {
      const b64: string = await invoke("load_cover_art", { path: fullPath });
      const dataUrl = `data:image/png;base64,${b64}`;
      memCache.set(key, dataUrl);
      bumpListeners();
      return dataUrl;
    } catch {
      // Not on disk — fetch from SGDB
    }

    // 2. Search SGDB — skip when offline
    if (isOffline()) {
      notFound.add(key);
      memCache.set(key, "error");
      bumpListeners();
      inFlight.delete(key);
      return null;
    }
    const gameId = await searchGameId(title, apiKey);
    if (!gameId) {
      notFound.add(key);
      memCache.set(key, "error");
      bumpListeners();
      return null;
    }

    // 3. Get logo URL
    const logoUrl = await fetchLogoUrl(gameId, apiKey);
    if (!logoUrl) {
      notFound.add(key);
      memCache.set(key, "error");
      bumpListeners();
      return null;
    }

    // 4. Download and save
    const savedPath: string = await invoke("fetch_and_save_cover_art", {
      url: logoUrl,
      filename,
    });

    const b64: string = await invoke("load_cover_art", { path: savedPath });
    const dataUrl = `data:image/png;base64,${b64}`;
    memCache.set(key, dataUrl);
    bumpListeners();
    return dataUrl;

  } catch (e) {
    console.error(`[logo] fetch failed for "${title}":`, e);
    memCache.set(key, "error");
    notFound.add(key);
    bumpListeners();
    return null;
  } finally {
    inFlight.delete(key);
  }
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useLogo(
  consoleId: string,
  title: string,
  enabled = true
): { src: string | null; loading: boolean } {
  const key = cacheKey(consoleId, title);
  const [, forceRender] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const listener = () => {
      if (mountedRef.current) forceRender(v => v + 1);
    };
    listeners.add(listener);
    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const cached = memCache.get(key);
    if (cached && cached !== "loading") return;
    if (inFlight.has(key)) return;
    fetchAndCacheLogo(consoleId, title);
  }, [key, enabled]);

  const entry = memCache.get(key);
  return {
    src:     (entry && entry !== "loading" && entry !== "error" && entry !== "no-key") ? entry : null,
    loading: entry === "loading",
  };
}

/** Subscribe to any logo cache update. Returns an unsubscribe function. */
export function onLogoCacheUpdate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Get the current cached logo URL for a game, or null if not loaded yet. */
export function getCachedLogo(consoleId: string, title: string): string | null {
  const val = memCache.get(cacheKey(consoleId, title));
  return (val && val !== "loading" && val !== "error" && val !== "no-key") ? val : null;
}

/** Bust the logo cache for a specific game (e.g. after manual replacement) */
export function bustLogoCache(consoleId: string, title: string) {
  const key = cacheKey(consoleId, title);
  memCache.delete(key);
  notFound.delete(key);
  bumpListeners();
}

/** Clear all cached logos (e.g. after API key change) */
export function clearLogoCache() {
  memCache.clear();
  notFound.clear();
  inFlight.clear();
  bumpListeners();
}
