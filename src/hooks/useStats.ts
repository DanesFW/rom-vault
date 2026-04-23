import { useState, useEffect, useCallback } from "react";
import { BUILT_IN_COMPANIES, BUILT_IN_CONSOLES } from "../types";
import type { Company, Console } from "../types";
import { getLibraryStats, getConsoleStats, getCompanies, getConsoles } from "../db";

export interface ConsoleStatRow {
  consoleId: string;
  consoleName: string;
  shortName: string;
  companyId: string;
  companyColor: string;
  romCount: number;
  beatenCount: number;
  completedCount: number;
  inProgressCount: number;
  unplayedCount: number;
  totalSize: number;
}

export interface CompanyStatGroup {
  company: Company;
  consoles: ConsoleStatRow[];
  totalRoms: number;
  totalSize: number;
}

export interface StatsData {
  totalRoms: number;
  totalSystems: number;
  totalBeaten: number;
  totalCompleted: number;
  totalInProgress: number;
  totalUnplayed: number;
  groups: CompanyStatGroup[];
}

const IS_TAURI = "__TAURI_INTERNALS__" in window;

// Preview data — built-ins only, all zeros
function buildPreview(): StatsData {
  const groups = BUILT_IN_COMPANIES.map(company => ({
    company: { ...company, custom: false },
    consoles: BUILT_IN_CONSOLES
      .filter(c => c.company_id === company.id)
      .map(c => ({
        consoleId: c.id,
        consoleName: c.name,
        shortName: c.short_name,
        companyId: company.id,
        companyColor: company.color,
        romCount: 0,
        beatenCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        unplayedCount: 0,
        totalSize: 0,
      })),
    totalRoms: 0,
    totalSize: 0,
  }));
  return {
    totalRoms: 0, totalSystems: 0,
    totalBeaten: 0, totalCompleted: 0,
    totalInProgress: 0, totalUnplayed: 0,
    groups,
  };
}

export function useStats() {
  const [data, setData]       = useState<StatsData>(buildPreview);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (!IS_TAURI) { setLoading(false); return; }

      // Pull everything from the DB — includes custom companies & consoles
      const [summary, consoleRows, allCompanies, allConsoles] = await Promise.all([
        getLibraryStats(),
        getConsoleStats(),
        getCompanies(),
        getConsoles(),
      ]);

      const statMap = new Map(consoleRows.map(r => [r.console_id, r]));

      // Build a lookup of companyId -> color from DB (covers custom companies)
      const companyColorMap = new Map(allCompanies.map(c => [c.id, c.color]));

      let totalBeaten = 0, totalCompleted = 0, totalInProgress = 0, totalUnplayed = 0;

      // Group all consoles by company — using DB data as the source of truth
      const consolesByCompany = new Map<string, Console[]>();
      for (const con of allConsoles) {
        if (!consolesByCompany.has(con.company_id)) {
          consolesByCompany.set(con.company_id, []);
        }
        consolesByCompany.get(con.company_id)!.push(con);
      }

      const groups: CompanyStatGroup[] = allCompanies.map(company => {
        const companyCons = consolesByCompany.get(company.id) ?? [];

        const consoles: ConsoleStatRow[] = companyCons.filter(c => (statMap.get(c.id)?.rom_count ?? 0) > 0).map(c => {
          const s = statMap.get(c.id);
          const romCount        = s?.rom_count         ?? 0;
          const beatenCount     = s?.beaten_count      ?? 0;
          const completedCount  = s?.completed_count   ?? 0;
          const inProgressCount = s?.in_progress_count ?? 0;
          const unplayedCount   = romCount - beatenCount - completedCount - inProgressCount;

          totalBeaten     += beatenCount;
          totalCompleted  += completedCount;
          totalInProgress += inProgressCount;
          totalUnplayed   += Math.max(0, unplayedCount);

          return {
            consoleId: c.id,
            consoleName: c.name,
            shortName: c.short_name,
            companyId: company.id,
            companyColor: companyColorMap.get(company.id) ?? company.color,
            romCount,
            beatenCount,
            completedCount,
            inProgressCount,
            unplayedCount: Math.max(0, unplayedCount),
            totalSize: s?.total_size ?? 0,
          };
        });

        return {
          company,
          consoles,
          totalRoms: consoles.reduce((s, c) => s + c.romCount, 0),
          totalSize: consoles.reduce((s, c) => s + c.totalSize, 0),
        };
      });

      // Filter out companies with no ROMs
      const nonEmptyGroups = groups.filter(g => g.totalRoms > 0);

      setData({
        totalRoms: summary.totalRoms,
        totalSystems: summary.systems,
        totalBeaten,
        totalCompleted,
        totalInProgress,
        totalUnplayed,
        groups: nonEmptyGroups,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, reload };
}
