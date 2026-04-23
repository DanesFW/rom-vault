import { useState, useCallback } from "react";
import type { RomEntry } from "../types";
import { FORMAT_QUALITY_RANK } from "../types";
import { findDuplicates, deleteRom } from "../db";

export interface DupeGroup {
  normalizedTitle: string;
  entries: RomEntry[];          // sorted best → worst
  keepId: number;               // id of recommended keep
}

export type CleanerPhase = "idle" | "scanning" | "ready" | "error";

function rankEntry(rom: RomEntry): number {
  return FORMAT_QUALITY_RANK[rom.format] ?? 1;
}

function buildGroups(raw: Awaited<ReturnType<typeof findDuplicates>>): DupeGroup[] {
  return raw.map(g => {
    const sorted = [...g.entries].sort((a, b) => rankEntry(b) - rankEntry(a));
    return {
      normalizedTitle: g.normalizedTitle,
      entries: sorted,
      keepId: sorted[0].id,
    };
  });
}

export function useDuplicateCleaner(consoleId: string | null, onRemoved: () => void) {
  const [phase, setPhase]   = useState<CleanerPhase>("idle");
  const [groups, setGroups] = useState<DupeGroup[]>([]);
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");

  const scan = useCallback(async (scope: "console" | "all") => {
    setPhase("scanning");
    setGroups([]);
    setErrorMsg("");
    try {
      const target = scope === "all" ? "all" : (consoleId ?? "all");
      const raw = await findDuplicates(target);
      setGroups(buildGroups(raw));
      setPhase("ready");
    } catch (e) {
      setErrorMsg(String(e));
      setPhase("error");
    }
  }, [consoleId]);

  const remove = useCallback(async (romId: number) => {
    setRemoving(prev => new Set(prev).add(romId));
    try {
      await deleteRom(romId);
      // Remove the entry from its group; if group shrinks to 1, drop the group
      setGroups(prev => prev
        .map(g => ({ ...g, entries: g.entries.filter(e => e.id !== romId) }))
        .filter(g => g.entries.length > 1)
      );
      onRemoved();
    } finally {
      setRemoving(prev => { const s = new Set(prev); s.delete(romId); return s; });
    }
  }, [onRemoved]);

  const reset = useCallback(() => {
    setPhase("idle");
    setGroups([]);
    setErrorMsg("");
  }, []);

  const totalDupes = groups.reduce((s, g) => s + g.entries.length - 1, 0);

  return { phase, groups, removing, errorMsg, totalDupes, scan, remove, reset };
}
