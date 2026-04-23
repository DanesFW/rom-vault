import { useState, useEffect, useCallback } from "react";
import type { SmartList, Tag } from "../types";
import { getSmartLists, createSmartList, updateSmartList, deleteSmartList, getTags, createTag, updateTag, deleteTag } from "../db";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

export function useSmartLists(reloadKey = 0) {
  const [lists,   setLists]   = useState<SmartList[]>([]);
  const [tags,    setTags]    = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!IS_TAURI) return;
    setLoading(true);
    try {
      const [l, t] = await Promise.all([getSmartLists(), getTags()]);
      setLists(l);
      setTags(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload, reloadKey]);

  // ── Smart List mutations ──────────────────────────────────────────────────

  const addList = useCallback(async (list: Omit<SmartList, "id">) => {
    const created = await createSmartList(list);
    setLists(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
    return created;
  }, []);

  const saveList = useCallback(async (list: SmartList) => {
    await updateSmartList(list);
    setLists(prev => prev.map(l => l.id === list.id ? list : l));
  }, []);

  const removeList = useCallback(async (id: number) => {
    await deleteSmartList(id);
    setLists(prev => prev.filter(l => l.id !== id));
  }, []);

  // ── Tag mutations ─────────────────────────────────────────────────────────

  const addTag = useCallback(async (name: string, color: string) => {
    const tag = await createTag(name, color);
    setTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    return tag;
  }, []);

  const saveTag = useCallback(async (id: number, name: string, color: string) => {
    await updateTag(id, name, color);
    setTags(prev => prev.map(t => t.id === id ? { ...t, name, color } : t));
  }, []);

  const removeTag = useCallback(async (id: number) => {
    await deleteTag(id);
    setTags(prev => prev.filter(t => t.id !== id));
    // Remove deleted tag from all lists
    setLists(prev => prev.map(l => ({ ...l, tag_ids: l.tag_ids.filter(tid => tid !== id) })));
  }, []);

  return { lists, tags, loading, reload, addList, saveList, removeList, addTag, saveTag, removeTag };
}
