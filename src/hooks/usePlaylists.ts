import { useState, useEffect, useCallback } from "react";
import type { Playlist } from "../types";
import { RECENTLY_PLAYED_PLAYLIST } from "../types";
import {
  getPlaylists, createPlaylist, renamePlaylist, deletePlaylist,
  addRomToPlaylist, addRomsToPlaylist, removeRomFromPlaylist,
} from "../db";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

export function usePlaylists(reloadKey = 0) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const reload = useCallback(async () => {
    if (!IS_TAURI) return;
    const db = await getPlaylists();
    setPlaylists([RECENTLY_PLAYED_PLAYLIST, ...db]);
  }, []);

  useEffect(() => { reload(); }, [reload, reloadKey]);

  const addPlaylist = useCallback(async (name: string): Promise<Playlist> => {
    const p = await createPlaylist(name);
    setPlaylists(prev => [...prev, p]);
    return p;
  }, []);

  const editPlaylist = useCallback(async (id: number, name: string) => {
    await renamePlaylist(id, name);
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const removePlaylist = useCallback(async (id: number) => {
    await deletePlaylist(id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const addRom = useCallback(async (playlistId: number, romId: number) => {
    await addRomToPlaylist(playlistId, romId);
    // Reload to get fresh counts + colors
    await reload();
  }, [reload]);

  const addRoms = useCallback(async (playlistId: number, romIds: number[]) => {
    await addRomsToPlaylist(playlistId, romIds);
    await reload();
  }, [reload]);

  const removeRom = useCallback(async (playlistId: number, romId: number) => {
    await removeRomFromPlaylist(playlistId, romId);
    await reload();
  }, [reload]);

  return { playlists, reload, addPlaylist, editPlaylist, removePlaylist, addRom, addRoms, removeRom };
}
