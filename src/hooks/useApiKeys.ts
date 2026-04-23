/**
 * useApiKeys.ts
 * Stores third-party API keys in localStorage under a separate key from
 * display settings so they survive a display settings reset.
 *
 * Currently stores:
 *   steamGridDb  — SteamGridDB API key for logo fetching in the shelf view
 */

import { useState, useEffect, useCallback } from "react";

export interface ApiKeys {
  steamGridDb: string;
}

const DEFAULTS: ApiKeys = {
  steamGridDb: "",
};

const STORAGE_KEY = "romvault-api-keys";

// ── Global singleton ──────────────────────────────────────────────────────────

function loadKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULTS };
}

let globalKeys: ApiKeys = loadKeys();
const listeners = new Set<(k: ApiKeys) => void>();

function setGlobal(patch: Partial<ApiKeys>) {
  globalKeys = { ...globalKeys, ...patch };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalKeys)); } catch {}
  listeners.forEach(fn => fn(globalKeys));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeys>(globalKeys);

  useEffect(() => {
    const listener = (k: ApiKeys) => setKeys({ ...k });
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const updateKey = useCallback((patch: Partial<ApiKeys>) => {
    setGlobal(patch);
  }, []);

  return { keys, updateKey };
}

/** Read the current SteamGridDB key without subscribing to updates — for non-React contexts */
export function getSteamGridDbKey(): string {
  return globalKeys.steamGridDb;
}
