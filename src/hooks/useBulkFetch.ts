/**
 * useBulkFetch.ts
 * Bulk cover art downloader for large collections.
 * - Fetches in batches of CONCURRENCY with a delay between batches
 * - Prioritises consoles the user browses (optional consoleId param)
 * - Fully cancellable
 * - Persists to disk via save_cover_art Tauri command
 */

import { useState, useCallback, useRef } from "react";
import { getRomsWithoutArt } from "../db";
import { fetchAndCacheArt } from "./useArtwork";
import type { ArtType } from "./useArtwork";

const CONCURRENCY   = 3;    // parallel fetches per batch
const BATCH_DELAY   = 300;  // ms between batches — polite to the server

export interface BulkFetchProgress {
  phase:     "idle" | "running" | "done" | "cancelled" | "error";
  total:     number;
  done:      number;
  failed:    number;
  current:   string;   // title currently being fetched
  message:   string;
}

const IDLE: BulkFetchProgress = {
  phase: "idle", total: 0, done: 0, failed: 0, current: "", message: "",
};

export function useBulkFetch() {
  const [progress, setProgress] = useState<BulkFetchProgress>(IDLE);
  const cancelRef = useRef(false);

  const start = useCallback(async (consoleId?: string, artType: ArtType = "Named_Boxarts") => {
    cancelRef.current = false;

    // Load queue — all ROMs without cached art for this console (or all)
    setProgress({ ...IDLE, phase: "running", message: "Building queue…" });

    let queue: { id: number; title: string; console_id: string; region: string | null; filename: string }[];
    try {
      queue = await getRomsWithoutArt(consoleId);
    } catch (e) {
      setProgress({ ...IDLE, phase: "error", message: `Failed to load queue: ${e}` });
      return;
    }

    if (queue.length === 0) {
      setProgress({ ...IDLE, phase: "done", message: "All art already cached!" });
      return;
    }

    setProgress(p => ({ ...p, total: queue.length, message: `Fetching ${queue.length} images…` }));

    let done = 0;
    let failed = 0;

    // Process in batches of CONCURRENCY
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      if (cancelRef.current) {
        setProgress(p => ({ ...p, phase: "cancelled", message: `Cancelled after ${done} images` }));
        return;
      }

      const batch = queue.slice(i, i + CONCURRENCY);

      // Update current label with first item in batch
      setProgress(p => ({ ...p, current: batch[0]?.title ?? "" }));

      await Promise.allSettled(
        batch.map(async rom => {
          try {
            const result = await fetchAndCacheArt(rom.console_id, rom.title, artType, rom.id, rom.region ?? undefined, rom.filename);
            if (result) done++;
            else failed++;
          } catch {
            failed++;
          }
          setProgress(p => ({ ...p, done: done + failed, failed }));
        })
      );

      // Delay between batches (skip after last batch)
      if (i + CONCURRENCY < queue.length && !cancelRef.current) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    setProgress({
      phase: "done",
      total: queue.length,
      done,
      failed,
      current: "",
      message: `Done — ${done} found, ${failed} not found on server`,
    });
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = false;
    setProgress(IDLE);
  }, []);

  return { progress, start, cancel, reset };
}
