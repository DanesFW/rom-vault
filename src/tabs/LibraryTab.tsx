import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Settings } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar";
import { useRoms } from "../hooks/useRoms";
import { useSmartLists } from "../hooks/useSmartLists";
import { usePlaylists } from "../hooks/usePlaylists";
import { useFolderScan } from "../hooks/useFolderScan";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { useEmulators } from "../hooks/useEmulators";
import Sidebar from "../components/Sidebar";
import ConsolePicker from "../components/ConsolePicker";
import RomList from "../components/RomList";
import DuplicateCleaner from "../components/DuplicateCleaner";
import ScanResultPanel from "../components/ScanResultPanel";
import SurpriseModal from "../components/SurpriseModal";
import PlaySplash from "../components/PlaySplash";
import { getRandomRom, setRomTags, recordPlay, recordSessionStart, recordSessionEnd } from "../db";
import { BUILT_IN_COMPANIES, BUILT_IN_CONSOLES } from "../types";
import type { RomEntry, Playlist } from "../types";
import { useGamepadAction, useGamepadConnected } from "../hooks/useGamepad";
import { useAppSettings } from "../hooks/useAppSettings";

interface Props {
  activeCompanyId: string | null;
  activeConsoleId: string | null;
  totalRoms: number;
  reloadKey: number;
  onSelectConsole: (companyId: string, consoleId: string) => void;
  onLibraryChanged: () => void;
}

function HudHint({ btn, label }: { btn: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{
        fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
        color: "var(--accent)", background: "var(--accent)1a",
        border: "1px solid var(--accent)55",
        borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em",
      }}>{btn}</span>
      <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

export default function LibraryTab({
  activeCompanyId, activeConsoleId, totalRoms, reloadKey, onSelectConsole, onLibraryChanged,
}: Props) {
  const { companies, reload: reloadSidebar, toggleCompany } = useSidebar(activeConsoleId, reloadKey);
  const { tags } = useSmartLists(reloadKey);
  const { playlists, addPlaylist, editPlaylist, removePlaylist, addRom: addRomToPlaylist, addRoms: addRomsToPlaylist } = usePlaylists(reloadKey);

  const { consoleMap } = useEmulators();

  const [showDupeCleaner,  setShowDupeCleaner]  = useState(false);
  const [surpriseRom,      setSurpriseRom]      = useState<RomEntry | null>(null);
  const [isGlobalSearch,   setIsGlobalSearch]   = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [noEmulatorFor,    setNoEmulatorFor]    = useState<RomEntry | null>(null);
  const [splashRom,        setSplashRom]        = useState<RomEntry | null>(null);
  const { narrowLayout } = useWindowWidth();
  const { settings, updateSettings } = useAppSettings();

  // ── Controller state ─────────────────────────────────────────────────────────
  const [ctrlFocus,    setCtrlFocus]    = useState<"sidebar" | "romlist">("sidebar");
  const [romCursor,    setRomCursor]    = useState<number | null>(null);
  const [romCardOpen,  setRomCardOpen]  = useState(false);
  const gridColumnsRef    = useRef(1);
  const controllerConnected = useGamepadConnected();

  // Flat ordered list of all navigable consoles (respects hideEmptyConsoles)
  const flatConsoles = useMemo(() => {
    const hideEmpty = settings.hideEmptyConsoles ?? false;
    return companies.flatMap(c =>
      c.consoles
        .filter(con => !hideEmpty || con.romCount > 0)
        .map(con => ({ companyId: c.id, consoleId: con.id }))
    );
  }, [companies, settings.hideEmptyConsoles]);

  // consoleId = "all" when global search OR when viewing a playlist (cross-console)
  const effectiveConsoleId = (isGlobalSearch || activePlaylistId !== null) ? "all" : activeConsoleId;

  const {
    rows, total, page, pageCount, loading,
    filters, sort,
    setFilters, setPage, toggleSort,
    cycleBacklog, saveNote, renameRom, removeRom,
    reload: reloadRoms,
  } = useRoms(effectiveConsoleId, reloadKey);

  // Listen for session-ended events from the Rust process watcher
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ session_id: number; duration_seconds: number }>("session-ended", async ({ payload }) => {
        await recordSessionEnd(payload.session_id, payload.duration_seconds);
      }).then(fn => { unlisten = fn; });
    });
    return () => { unlisten?.(); };
  }, []);

  const handleCycleBacklog = useCallback(async (rom: RomEntry) => {
    await cycleBacklog(rom);
    onLibraryChanged();
  }, [cycleBacklog, onLibraryChanged]);

  const handleSetTags = useCallback(async (romId: number, tagIds: number[]) => {
    await setRomTags(romId, tagIds);
    reloadRoms();
  }, [reloadRoms]);

  const handleSelectPlaylist = useCallback((playlist: Playlist) => {
    setActivePlaylistId(playlist.id);
    setIsGlobalSearch(false);
    setFilters(prev => ({ ...prev, search: "", backlogStatus: "all", tagIds: [], playlistId: playlist.id }));
  }, [setFilters]);

  const handleAddToPlaylist = useCallback(async (romId: number, playlistId: number) => {
    await addRomToPlaylist(playlistId, romId);
  }, [addRomToPlaylist]);

  const handleAddSelectedToPlaylist = useCallback(async (romIds: number[], playlistId: number) => {
    await addRomsToPlaylist(playlistId, romIds);
  }, [addRomsToPlaylist]);

  const onScanComplete = useCallback(() => {
    reloadSidebar(); reloadRoms(); onLibraryChanged();
  }, [reloadSidebar, reloadRoms, onLibraryChanged]);

  const onDupeRemoved = useCallback(() => {
    reloadSidebar(); reloadRoms(); onLibraryChanged();
  }, [reloadSidebar, reloadRoms, onLibraryChanged]);

  const { progress: scanProgress, scan, scanResult, clearScanResult } = useFolderScan(onScanComplete);

  const activeConsole = activeConsoleId
    ? BUILT_IN_CONSOLES.find(c => c.id === activeConsoleId) ?? null
    : null;
  const activeCompany = activeCompanyId
    ? BUILT_IN_COMPANIES.find(c => c.id === activeCompanyId) ?? null
    : null;

  const handleSurprise = useCallback(async () => {
    const rom = await getRandomRom(activeConsoleId ?? undefined);
    if (rom) setSurpriseRom(rom);
  }, [activeConsoleId]);

  const handlePlay = useCallback(async (rom: RomEntry) => {
    const emulator = consoleMap.get(rom.console_id);
    if (!emulator) {
      setNoEmulatorFor(rom);
      return;
    }
    // Start session record before launch
    const sessionId = await recordSessionStart(rom.id);
    // Show splash immediately
    setSplashRom(rom);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("launch_rom", {
        exePath:   emulator.exe_path,
        args:      emulator.is_retroarch
                     ? `-L {core} {rom}`
                     : emulator.args,
        romPath:   rom.filepath,
        corePath:  emulator.is_retroarch ? (emulator.core_path ?? null) : null,
        sessionId,
      });
      // Record play & auto-nudge backlog status
      await recordPlay(rom.id, rom.backlog_status ?? null);
      reloadRoms();
      onLibraryChanged();
    } catch (e) {
      setSplashRom(null);
      alert(`Could not launch emulator:\n${e}`);
    }
  }, [consoleMap, reloadRoms, onLibraryChanged]);

  const handleSelectConsole = useCallback((companyId: string, consoleId: string) => {
    setShowDupeCleaner(false);
    setIsGlobalSearch(false);
    setActivePlaylistId(null);
    setFilters(prev => ({ ...prev, backlogStatus: "all", search: "", tagIds: [], playlistId: undefined }));
    onSelectConsole(companyId, consoleId);
  }, [onSelectConsole, setFilters]);

  // Reset rom cursor when console changes
  useEffect(() => {
    setRomCursor(null);
    setRomCardOpen(false);
    setCtrlFocus("sidebar");
  }, [activeConsoleId]);

  useGamepadAction((action) => {
    // LB/RB are handled by App.tsx (tab switching) — ignore here
    if (action === "lb" || action === "rb") return;

    // Select cycles density view (1→2→3→4→1) from anywhere
    if (action === "select") {
      const d = settings.density ?? 1;
      updateSettings({ density: ((d % 4) + 1) as import("../hooks/useAppSettings").Density });
      return;
    }

    if (ctrlFocus === "sidebar") {
      if (action === "up" || action === "down") {
        const delta = action === "up" ? -1 : 1;
        const idx   = flatConsoles.findIndex(c => c.consoleId === activeConsoleId);
        const next  = flatConsoles[Math.max(0, Math.min(flatConsoles.length - 1, idx + delta))];
        if (next && next.consoleId !== activeConsoleId) {
          handleSelectConsole(next.companyId, next.consoleId);
        }
      } else if (action === "right" || action === "confirm") {
        if (activeConsoleId && rows.length > 0) {
          setCtrlFocus("romlist");
          setRomCursor(0);
        }
      }
    } else {
      // romlist focus
      if (romCardOpen) {
        if (action === "cancel") {
          setRomCardOpen(false);
        }
      } else {
        if (action === "up" || action === "down") {
          const density = settings.density ?? 1;
          const step    = density >= 3 ? gridColumnsRef.current : 1;
          const delta   = action === "up" ? -step : step;
          setRomCursor(prev => {
            const cur  = prev ?? 0;
            const next = cur + delta;
            if (next < 0) {
              if (page > 0) { setPage(page - 1); return Math.max(0, rows.length - step); }
              return 0;
            }
            if (next >= rows.length) {
              if (page < pageCount - 1) { setPage(page + 1); return 0; }
              return rows.length - 1;
            }
            return next;
          });
        } else if (action === "left") {
          const density = settings.density ?? 1;
          if (density >= 3) {
            // Left/right move by 1 in card grid
            setRomCursor(prev => Math.max(0, (prev ?? 0) - 1));
          } else {
            setCtrlFocus("sidebar");
            setRomCursor(null);
          }
        } else if (action === "right") {
          const density = settings.density ?? 1;
          if (density >= 3) {
            setRomCursor(prev => Math.min(rows.length - 1, (prev ?? 0) + 1));
          }
        } else if (action === "confirm") {
          if (romCursor !== null) setRomCardOpen(true);
        } else if (action === "cancel") {
          setCtrlFocus("sidebar");
          setRomCursor(null);
          setRomCardOpen(false);
        }
      }
    }
  });

// Derive the display name for the ROM list header
  const activePlaylist = activePlaylistId !== null
    ? playlists.find(p => p.id === activePlaylistId) ?? null
    : null;

  const consoleName = activePlaylist
    ? activePlaylist.name.toUpperCase()
    : isGlobalSearch
      ? "ALL CONSOLES"
      : (activeConsole?.name ?? "");

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "column", minWidth: 0, width: "100%" }}>

      {/* ── Narrow layout: top picker bar ── */}
      {narrowLayout && (
        <ConsolePicker
          companies={companies}
          activeCompanyId={activeCompanyId}
          activeConsoleId={activeConsoleId}
          onSelectConsole={handleSelectConsole}
        />
      )}

      {/* ── Main row: sidebar (wide) + ROM list ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Sidebar — fixed width, never grows */}
        {!narrowLayout && (
          <Sidebar
            companies={companies}
            activeConsoleId={isGlobalSearch || activePlaylistId !== null ? null : activeConsoleId}
            activePlaylistId={activePlaylistId}
            playlists={playlists}
            companyColor={activeCompany?.color ?? "var(--accent)"}
            controllerFocused={ctrlFocus === "sidebar"}
            onSelectConsole={handleSelectConsole}
            onToggleCompany={toggleCompany}
            onReload={reloadSidebar}
            onSelectPlaylist={handleSelectPlaylist}
            onAddPlaylist={addPlaylist}
            onRemovePlaylist={removePlaylist}
            onRenamePlaylist={editPlaylist}
          />
        )}

        {/* ROM list — takes all remaining space */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", position: "relative", borderLeft: ctrlFocus === "romlist" ? `2px solid ${activeCompany?.color ?? "var(--accent)"}66` : "2px solid transparent", transition: "border-color 0.2s" }}>
          {/* Company colour glow — bottom-right corner */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            background: `radial-gradient(ellipse 70% 60% at 100% 100%, ${activeCompany?.color ?? "transparent"}55 0%, ${activeCompany?.color ?? "transparent"}22 40%, transparent 70%)`,
            transition: "background 0.5s ease",
          }} />
          <RomList
            key={`${effectiveConsoleId ?? "all"}-${activePlaylistId ?? "none"}`}
            consoleId={effectiveConsoleId}
            consoleName={consoleName}
            companyColor={activeCompany?.color ?? "var(--accent)"}
            totalRomsVault={totalRoms}
            rows={rows}
            total={total}
            page={page}
            pageCount={pageCount}
            loading={loading}
            controllerCursor={ctrlFocus === "romlist" ? romCursor : null}
            controllerCardOpen={romCardOpen}
            onControllerCardClose={() => setRomCardOpen(false)}
            onColumnsChange={(cols) => { gridColumnsRef.current = cols; }}
            filters={filters}
            sort={sort}
            scanProgress={scanProgress}
            showDupeCleaner={showDupeCleaner}
            allTags={tags}
            playlists={playlists}
            isGlobalSearch={isGlobalSearch}
            onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
            onTagFilterChange={tagIds => setFilters(prev => ({ ...prev, tagIds }))}
            onScopeChange={global => { setIsGlobalSearch(global); setActivePlaylistId(null); setFilters(prev => ({ ...prev, playlistId: undefined })); }}
            onSortToggle={toggleSort}
            onPageChange={setPage}
            onNavigateToConsole={handleSelectConsole}
            onScan={() => scan(activeConsoleId ?? undefined)}
            onScanAll={() => scan(undefined)}
            onToggleDupeCleaner={() => setShowDupeCleaner(p => !p)}
            onSurprise={handleSurprise}
            onBulkStatusChange={reloadRoms}
            onCycleBacklog={handleCycleBacklog}
            onSaveNote={saveNote}
            onRenameRom={renameRom}
            onDelete={id => { removeRom(id); onLibraryChanged(); }}
            onSetTags={handleSetTags}
            onAddToPlaylist={handleAddToPlaylist}
            onAddSelectedToPlaylist={handleAddSelectedToPlaylist}
            onPlay={handlePlay}
          />

          {/* Dupe cleaner — only on wide layout */}
          {showDupeCleaner && !narrowLayout && (
            <div style={{ width: 420, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <DuplicateCleaner
                consoleId={activeConsoleId}
                consoleName={activeConsole?.name ?? "All Consoles"}
                companyColor={activeCompany?.color ?? "var(--accent)"}
                onRemovedRom={onDupeRemoved}
                onClose={() => setShowDupeCleaner(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Scan result review panel */}
      {scanResult && (
        <ScanResultPanel
          result={scanResult}
          companyColor={activeCompany?.color ?? "var(--tab-library)"}
          onClose={clearScanResult}
          onAdded={() => { onScanComplete(); }}
        />
      )}

      {surpriseRom && (
        <SurpriseModal
          rom={surpriseRom}
          companies={companies}
          allTags={tags}
          onClose={() => setSurpriseRom(null)}
          onNavigate={(companyId, consoleId) => {
            setSurpriseRom(null);
            handleSelectConsole(companyId, consoleId);
          }}
        />
      )}

      {splashRom && (
        <PlaySplash rom={splashRom} onDone={() => setSplashRom(null)} />
      )}

      {/* ── Controller HUD ── */}
      {controllerConnected && (
        <div style={{
          position: "absolute", bottom: 14, right: 16,
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
          border: "1px solid var(--border-lit)",
          borderRadius: 8, padding: "6px 12px",
          pointerEvents: "none", zIndex: 50,
          transition: "opacity 0.2s",
        }}>
          {ctrlFocus === "sidebar" && (<>
            <HudHint btn="↕" label="Console" />
            <HudHint btn="▶ / A" label="ROM list" />
            <HudHint btn="LB/RB" label="Tabs" />
          </>)}
          {ctrlFocus === "romlist" && !romCardOpen && (<>
            <HudHint btn="↕" label="Navigate" />
            {(settings.density ?? 1) >= 3 && <HudHint btn="↔" label="Navigate" />}
            <HudHint btn="A" label="Open" />
            <HudHint btn="B" label="Sidebar" />
          </>)}
          {ctrlFocus === "romlist" && romCardOpen && (<>
            <HudHint btn="↕" label="Actions" />
            <HudHint btn="A" label="Select" />
            <HudHint btn="B" label="Close" />
          </>)}
        </div>
      )}

      {/* No emulator configured modal */}
      {noEmulatorFor && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setNoEmulatorFor(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            width: 420, background: "var(--bg-surface)",
            borderRadius: 12, border: "1px solid var(--border-lit)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            padding: "28px 28px 24px",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "var(--accent)18", border: "1px solid var(--accent)44",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Settings size={18} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  No emulator configured
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {BUILT_IN_CONSOLES.find(c => c.id === noEmulatorFor.console_id)?.name ?? noEmulatorFor.console_id}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7, margin: 0 }}>
              To launch <strong style={{ color: "var(--text)" }}>{noEmulatorFor.title}</strong>, you need to set up an emulator for this console.
            </p>

            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {[
                { n: "1", text: "Open Settings → Emulators" },
                { n: "2", text: "Add a profile for the emulator you have installed" },
                { n: "3", text: "Go to Console Mapping and assign it to this console" },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: "var(--accent)",
                    background: "var(--accent)18", border: "1px solid var(--accent)44",
                    borderRadius: "50%", width: 18, height: 18, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 1,
                  }}>{step.n}</span>
                  <span style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{step.text}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setNoEmulatorFor(null)}
                style={{
                  background: "none", border: "1px solid var(--border-lit)", color: "var(--text-muted)",
                  fontFamily: "var(--font)", fontSize: 11, padding: "7px 16px", borderRadius: 5, cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
