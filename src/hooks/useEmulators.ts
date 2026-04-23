import { useState, useEffect, useCallback } from "react";
import type { EmulatorProfile } from "../types";
import {
  getEmulatorProfiles, getConsoleEmulators,
  createEmulatorProfile, updateEmulatorProfile, deleteEmulatorProfile,
  setConsoleEmulator, clearConsoleEmulator,
} from "../db";

export function useEmulators() {
  const [profiles,        setProfiles]        = useState<EmulatorProfile[]>([]);
  const [consoleMap,      setConsoleMap]      = useState<Map<string, EmulatorProfile>>(new Map());
  const [loading,         setLoading]         = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [p, m] = await Promise.all([getEmulatorProfiles(), getConsoleEmulators()]);
    setProfiles(p);
    setConsoleMap(m);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addProfile = useCallback(async (p: Omit<EmulatorProfile, "id">) => {
    await createEmulatorProfile(p);
    await reload();
  }, [reload]);

  const editProfile = useCallback(async (p: EmulatorProfile) => {
    await updateEmulatorProfile(p);
    await reload();
  }, [reload]);

  const removeProfile = useCallback(async (id: number) => {
    await deleteEmulatorProfile(id);
    await reload();
  }, [reload]);

  const assignConsole = useCallback(async (consoleId: string, emulatorId: number) => {
    await setConsoleEmulator(consoleId, emulatorId);
    await reload();
  }, [reload]);

  const unassignConsole = useCallback(async (consoleId: string) => {
    await clearConsoleEmulator(consoleId);
    await reload();
  }, [reload]);

  return {
    profiles,
    consoleMap,
    loading,
    reload,
    addProfile,
    editProfile,
    removeProfile,
    assignConsole,
    unassignConsole,
  };
}
