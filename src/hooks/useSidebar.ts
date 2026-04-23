import { useState, useEffect, useCallback } from "react";
import type { Company, Console } from "../types";
import { BUILT_IN_COMPANIES, BUILT_IN_CONSOLES } from "../types";
import { getConsoles, getConsoleStats } from "../db";

export interface SidebarCompany extends Company {
  consoles: SidebarConsole[];
  isOpen: boolean;
}

export interface SidebarConsole extends Console {
  romCount: number;
}

const IS_TAURI = "__TAURI_INTERNALS__" in window;

// Fallback data for browser preview
function buildPreviewData(): SidebarCompany[] {
  return BUILT_IN_COMPANIES.map((c, i) => ({
    ...c,
    custom: false,
    isOpen: i === 0,
    consoles: BUILT_IN_CONSOLES
      .filter(con => con.company_id === c.id)
      .map(con => ({ ...con, custom: false, romCount: 0 })),
  }));
}

export function useSidebar(activeConsoleId: string | null, reloadKey = 0) {
  const [companies, setCompanies] = useState<SidebarCompany[]>(buildPreviewData);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!IS_TAURI) return;
    setLoading(true);
    try {
      const { getCompanies } = await import("../db");
      const [rawCompanies, rawConsoles, stats] = await Promise.all([
        getCompanies(),
        getConsoles(),
        getConsoleStats(),
      ]);

      const statMap = new Map(stats.map(s => [s.console_id, s.rom_count]));

      const built: SidebarCompany[] = (rawCompanies.length > 0 ? rawCompanies : BUILT_IN_COMPANIES.map(c => ({ ...c, custom: false }))).map(company => ({
        ...company,
        isOpen: false,
        consoles: (rawConsoles.length > 0
          ? rawConsoles.filter(con => con.company_id === company.id)
          : BUILT_IN_CONSOLES.filter(c => c.company_id === company.id).map(c => ({ ...c, custom: false }))
        ).map(con => ({ ...con, romCount: statMap.get(con.id) ?? 0 })),
      }));

      const withRoms = built.filter(c => c.consoles.some(con => con.romCount > 0));

      setCompanies(prev => withRoms.map(c => ({
        ...c,
        isOpen: prev.find(p => p.id === c.id)?.isOpen ?? false,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload, reloadKey]);

  // Auto-open the company containing the active console, close all others
  useEffect(() => {
    if (!activeConsoleId) return;
    setCompanies(prev => prev.map(c => ({
      ...c,
      isOpen: c.consoles.some(con => con.id === activeConsoleId),
    })));
  }, [activeConsoleId]);

  const toggleCompany = useCallback((companyId: string) => {
    setCompanies(prev => prev.map(c => ({
      ...c,
      // If clicking the already-open company, close it. Otherwise open it and close all others.
      isOpen: c.id === companyId ? !c.isOpen : false,
    })));
  }, []);

  return { companies, loading, reload, toggleCompany };
}
