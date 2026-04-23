import { useState, useEffect, useCallback, useRef } from "react";
import type { RomEntry, BacklogStatus } from "../types";
import { getRoms, updateBacklog, updateNote, updateTitle, deleteRom } from "../db";
import { useAppSettings } from "./useAppSettings";

export type SortKey = "title" | "size" | "format" | "region" | "added" | "backlog" | "played";
export type SortDir = "asc" | "desc";

export interface RomFilters {
  search: string;
  backlogStatus: BacklogStatus | "all";
  tagIds: number[];
  playlistId?: number;
}

const PAGE_SIZE = 150;

export function useRoms(consoleId: string | null, reloadKey = 0) {
  const { settings } = useAppSettings();

  const [rows, setRows]         = useState<RomEntry[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(false);

  const [filters, setFilters]   = useState<RomFilters>({
    search: "",
    backlogStatus: (settings.defaultBacklog ?? "all") as RomFilters["backlogStatus"],
    tagIds: [],
  });

  const [sort, setSort]         = useState<{ key: SortKey; dir: SortDir }>({
    key: (settings.defaultSortKey ?? "title") as SortKey,
    dir: (settings.defaultSortDir ?? "asc") as SortDir,
  });

  // Reset page when console or playlist changes
  const prevConsole   = useRef<string | null>(null);
  const prevPlaylist  = useRef<number | undefined>(undefined);
  useEffect(() => {
    const plChanged = filters.playlistId !== prevPlaylist.current;
    const conChanged = prevConsole.current !== consoleId;
    if (conChanged || plChanged) {
      setPage(0);
      if (conChanged) setFilters(prev => ({ ...prev, tagIds: [] }));
      prevConsole.current  = consoleId;
      prevPlaylist.current = filters.playlistId;
    }
  }, [consoleId, filters.playlistId]);

  const load = useCallback(async () => {
    if (!consoleId) { setRows([]); setTotal(0); return; }
    setLoading(true);
    try {
      const { rows: r, total: t } = await getRoms({
        consoleId,
        search: filters.search || undefined,
        backlogStatus: filters.backlogStatus === "all" ? undefined : filters.backlogStatus,
        tagIds: filters.tagIds.length > 0 ? filters.tagIds : undefined,
        playlistId: filters.playlistId,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(r);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [consoleId, filters, page, reloadKey]);

  useEffect(() => { load(); }, [load]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const cycleBacklog = useCallback(async (rom: RomEntry) => {
    const { BACKLOG_NEXT } = await import("../types");
    const next = BACKLOG_NEXT[rom.backlog_status ?? "none"] as BacklogStatus | "none";
    const newStatus = next === "none" ? null : next;
    await updateBacklog(rom.id, newStatus as BacklogStatus);
    setRows(prev => prev.map(r =>
      r.id === rom.id ? { ...r, backlog_status: newStatus ?? undefined } : r
    ));
  }, []);

  const saveNote = useCallback(async (romId: number, note: string) => {
    await updateNote(romId, note);
    setRows(prev => prev.map(r => r.id === romId ? { ...r, note } : r));
  }, []);

  const renameRom = useCallback(async (romId: number, title: string) => {
    await updateTitle(romId, title);
    setRows(prev => prev.map(r => r.id === romId ? { ...r, title } : r));
  }, []);

  const removeRom = useCallback(async (romId: number) => {
    await deleteRom(romId);
    setRows(prev => prev.filter(r => r.id !== romId));
    setTotal(prev => prev - 1);
  }, []);

  // ── Client-side sort (on loaded page) ─────────────────────────────────────

  const BACKLOG_ORDER: Record<string, number> = {
    "completed": 0, "beaten": 1, "in-progress": 2, "unplayed": 3, "": 4,
  };

  const sortedRows = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort.key) {
      case "title":   cmp = a.title.localeCompare(b.title); break;
      case "size":    cmp = a.file_size - b.file_size; break;
      case "format":  cmp = a.format.localeCompare(b.format); break;
      case "region":  cmp = (a.region ?? "").localeCompare(b.region ?? ""); break;
      case "added":   cmp = a.added_at.localeCompare(b.added_at); break;
      case "backlog":
        cmp = (BACKLOG_ORDER[a.backlog_status ?? ""] ?? 4)
            - (BACKLOG_ORDER[b.backlog_status ?? ""] ?? 4);
        break;
      case "played":
        cmp = (a.last_played_at ?? "").localeCompare(b.last_played_at ?? "");
        break;
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const toggleSort = useCallback((key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }, []);

  return {
    rows: sortedRows,
    total,
    page,
    pageCount: Math.ceil(total / PAGE_SIZE),
    loading,
    filters,
    sort,
    setFilters,
    setPage,
    toggleSort,
    cycleBacklog,
    saveNote,
    renameRom,
    removeRom,
    reload: load,
  };
}
