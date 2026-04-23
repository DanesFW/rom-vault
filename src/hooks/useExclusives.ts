import { useState, useEffect, useCallback } from "react";
import type { Exclusive, Console, Company } from "../types";
import {
  getExclusives, toggleExclusiveOwned, addExclusive, deleteExclusive,
  getRoms, getCompanies, getConsoles,
} from "../db";
import { BUILT_IN_COMPANIES, BUILT_IN_CONSOLES } from "../types";

export type ExclusivesMode = "ALL" | "GAPS";

export interface ExclusiveListTab {
  id: string;       // list_id or "custom" or "all"
  label: string;    // display name
  count: number;    // total games in this list
  owned: number;    // owned games in this list
}

export interface ConsoleExclusiveStats {
  console: Console & { company: Company };
  exclusives: Exclusive[];
  ownedCount: number;
  totalCount: number;
  listCount: number;  // number of distinct imported lists
}

function fuzzyMatch(a: string, b: string): boolean {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ca = clean(a), cb = clean(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

const IS_TAURI = "__TAURI_INTERNALS__" in window;

export function useExclusives() {
  const [mode, setMode]                   = useState<ExclusivesMode>("ALL");
  const [allStats, setAllStats]           = useState<ConsoleExclusiveStats[]>([]);
  const [loading, setLoading]             = useState(false);
  const [activeConsoleId, setActiveConsoleId] = useState<string | null>(null);
  const [activeListId, setActiveListId]   = useState<string>("all");
  const [sortKey, setSortKey]             = useState<"alpha" | "owned-first" | "unowned-first">("alpha");

  const [genreFilter, setGenreFilter]     = useState<string>("all");
  const [searchFilter, setSearchFilter]   = useState("");

  // Reset list tab when console changes
  const handleSetConsole = useCallback((id: string) => {
    setActiveConsoleId(id);
    setActiveListId("all");
    setGenreFilter("all");
    setSearchFilter("");
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const companies: Company[] = IS_TAURI
        ? await getCompanies()
        : BUILT_IN_COMPANIES.map(c => ({ ...c, custom: false }));
      const consoles: Console[] = IS_TAURI
        ? await getConsoles()
        : BUILT_IN_CONSOLES.map(c => ({ ...c, custom: false }));
      const companyMap = new Map(companies.map(c => [c.id, c]));
      const exclusives = IS_TAURI ? await getExclusives() : [];

      const libraryTitles = new Set<string>();
      if (IS_TAURI) {
        for (const con of consoles) {
          const { rows } = await getRoms({ consoleId: con.id, pageSize: 9999 });
          rows.forEach(r => libraryTitles.add(r.title));
        }
      }

      const stats: ConsoleExclusiveStats[] = [];
      for (const con of consoles) {
        const conExclusives = exclusives.filter(e => e.console_id === con.id);
        if (conExclusives.length === 0) continue;

        const enriched = conExclusives.map(e => ({
          ...e,
          owned: e.owned || [...libraryTitles].some(t => fuzzyMatch(t, e.title)),
          genres: typeof e.genres === "string" ? JSON.parse(e.genres) : e.genres,
        }));

        // Count distinct imported lists (non-null list_id values)
        const listIds = new Set(enriched.map(e => e.list_id).filter(Boolean));

        const company = companyMap.get(con.company_id);
        if (!company) continue;

        stats.push({
          console: { ...con, company },
          exclusives: enriched,
          ownedCount: enriched.filter(e => e.owned).length,
          totalCount: enriched.length,
          listCount: listIds.size,
        });
      }

      stats.sort((a, b) =>
        a.console.company.order - b.console.company.order ||
        a.console.order - b.console.order
      );

      setAllStats(stats);
      if (!activeConsoleId && stats.length > 0) {
        setActiveConsoleId(stats[0].console.id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeConsoleId]);

  useEffect(() => { reload(); }, [reload]);

  const toggleOwned = useCallback(async (exc: Exclusive) => {
    await toggleExclusiveOwned(exc.id, !exc.owned);
    setAllStats(prev => prev.map(s => ({
      ...s,
      exclusives: s.exclusives.map(e =>
        e.id === exc.id ? { ...e, owned: !e.owned } : e
      ),
      ownedCount: s.exclusives.filter(e =>
        e.id === exc.id ? !exc.owned : e.owned
      ).length,
    })));
  }, []);

  const removeExclusive = useCallback(async (exc: Exclusive) => {
    await deleteExclusive(exc.id);
    setAllStats(prev => prev.map(s => ({
      ...s,
      exclusives: s.exclusives.filter(e => e.id !== exc.id),
      ownedCount: s.exclusives.filter(e => e.id !== exc.id && e.owned).length,
      totalCount: s.exclusives.filter(e => e.id !== exc.id).length,
    })));
  }, []);

  const insertExclusives = useCallback(async (items: Omit<Exclusive, "id">[]) => {
    for (const item of items) await addExclusive(item);
    await reload();
  }, [reload]);

  const importList = useCallback(async (list: import("../data/exclusivesData").ExclusiveList) => {
    for (const game of list.games) {
      await addExclusive({
        console_id: list.console_id,
        title:      game.title,
        publisher:  game.publisher,
        note:       game.note,
        genres:     game.genres,
        owned:      false,
        user_added: false,
        list_id:    list.id,
        list_label: list.label,
      });
    }
    await reload();
  }, [reload]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeStats = allStats.find(s => s.console.id === activeConsoleId);

  // Build list tabs for active console: ALL + each distinct list + CUSTOM
  const availableLists: ExclusiveListTab[] = (() => {
    if (!activeStats) return [];
    const games = activeStats.exclusives;

    // Distinct imported lists
    const listMap = new Map<string, { label: string; games: Exclusive[] }>();
    for (const g of games) {
      if (g.list_id) {
        if (!listMap.has(g.list_id)) {
          listMap.set(g.list_id, { label: g.list_label ?? g.list_id, games: [] });
        }
        listMap.get(g.list_id)!.games.push(g);
      }
    }

    const customGames = games.filter(g => !g.list_id);
    const tabs: ExclusiveListTab[] = [];

    // ALL tab
    tabs.push({
      id: "all",
      label: "ALL",
      count: games.length,
      owned: games.filter(g => g.owned).length,
    });

    // Per-list tabs
    for (const [id, { label, games: lg }] of listMap.entries()) {
      tabs.push({
        id,
        label,
        count: lg.length,
        owned: lg.filter(g => g.owned).length,
      });
    }

    // Custom tab (user-added games)
    if (customGames.length > 0) {
      tabs.push({
        id: "custom",
        label: "CUSTOM",
        count: customGames.length,
        owned: customGames.filter(g => g.owned).length,
      });
    }

    return tabs;
  })();

  // Games filtered by active list + mode + genre + search, then sorted
  const filteredExclusives = (() => {
    const base = (activeStats?.exclusives ?? []).filter(e => {
      if (activeListId !== "all") {
        if (activeListId === "custom" && e.list_id) return false;
        if (activeListId !== "custom" && e.list_id !== activeListId) return false;
      }
      if (searchFilter && !e.title.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (genreFilter !== "all" && !e.genres.includes(genreFilter)) return false;
      if (mode === "GAPS" && e.owned) return false;
      return true;
    });

    return [...base].sort((a, b) => {
      if (sortKey === "owned-first")   return (a.owned === b.owned) ? a.title.localeCompare(b.title) : a.owned ? -1 : 1;
      if (sortKey === "unowned-first") return (a.owned === b.owned) ? a.title.localeCompare(b.title) : a.owned ? 1 : -1;
      return a.title.localeCompare(b.title); // alpha
    });
  })();

  const availableGenres = [...new Set(
    (activeStats?.exclusives ?? [])
      .filter(e => activeListId === "all" || (activeListId === "custom" ? !e.list_id : e.list_id === activeListId))
      .flatMap(e => e.genres)
  )].sort();

  async function deleteList(consoleId: string, listId: string) {
    const { deleteExclusiveList } = await import("../db");
    await deleteExclusiveList(consoleId, listId);
    await reload();
  }

  return {
    mode, setMode,
    allStats,
    loading,
    deleteList,
    activeConsoleId,
    setActiveConsoleId: handleSetConsole,
    activeListId, setActiveListId,
    sortKey, setSortKey,
    genreFilter, setGenreFilter,
    searchFilter, setSearchFilter,
    activeStats,
    availableLists,
    filteredExclusives,
    availableGenres,
    toggleOwned,
    removeExclusive,
    insertExclusives,
    importList,
    reload,
  };
}
