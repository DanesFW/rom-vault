/**
 * db.ts — thin wrapper around @tauri-apps/plugin-sql
 *
 * All DB operations go through this module. In dev (browser preview),
 * functions are no-ops so the React UI can still render.
 */

import type { RomEntry, Console, Company, Exclusive, BacklogStatus, Tag, SmartList, Playlist, EmulatorProfile } from "./types";

// Dynamic import so Vite doesn't break in plain browser mode
async function getDb() {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  return Database.load("sqlite:romvault.db");
}

const IS_TAURI = "__TAURI_INTERNALS__" in window;

// ── Init ─────────────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await seedBuiltins(db);
}

async function seedBuiltins(db: Awaited<ReturnType<typeof getDb>>) {
  const { BUILT_IN_COMPANIES, BUILT_IN_CONSOLES } = await import("./types");
  for (const c of BUILT_IN_COMPANIES) {
    await db.execute(
      `INSERT OR IGNORE INTO companies(id, name, color, "order", custom)
       VALUES (?, ?, ?, ?, 0)`,
      [c.id, c.name, c.color, c.order]
    );
  }
  for (const c of BUILT_IN_CONSOLES) {
    await db.execute(
      `INSERT OR IGNORE INTO consoles(id, company_id, name, short_name, generation, release_year, "order", custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [c.id, c.company_id, c.name, c.short_name, c.generation, c.release_year, c.order]
    );
  }
}

// ── Companies ─────────────────────────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select<Company[]>(`SELECT * FROM companies ORDER BY "order", name`);
}

export async function addCompany(c: Omit<Company, "id">): Promise<string> {
  if (!IS_TAURI) return "";
  const id = c.name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
  const db = await getDb();
  await db.execute(
    `INSERT INTO companies(id, name, color, "order", custom) VALUES (?, ?, ?, ?, 1)`,
    [id, c.name, c.color, c.order]
  );
  return id;
}

/** Insert a company with a specific id (INSERT OR IGNORE) -- used by catalog additions. */
export async function ensureCompany(id: string, name: string, color: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR IGNORE INTO companies(id, name, color, "order", custom) VALUES (?, ?, ?, 99, 1)`,
    [id, name, color]
  );
}

export async function addConsole(c: Omit<Console, "id">, explicitId?: string): Promise<string> {
  if (!IS_TAURI) return "";
  // Use the provided explicit ID (e.g. from catalogue — ensures art lookup works)
  // or fall back to a generated one for fully custom consoles
  const id = explicitId ?? (c.name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now());
  const db = await getDb();
  await db.execute(
    `INSERT INTO consoles(id, company_id, name, short_name, generation, release_year, "order", custom)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, c.company_id, c.name, c.short_name, c.generation ?? 0, c.release_year ?? 0, c.order ?? 99]
  );
  return id;
}

// ── Consoles ──────────────────────────────────────────────────────────────────

export async function getConsoles(companyId?: string): Promise<Console[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  if (companyId) {
    return db.select<Console[]>(
      `SELECT * FROM consoles WHERE company_id = ? ORDER BY release_year, "order", name`,
      [companyId]
    );
  }
  return db.select<Console[]>(`SELECT * FROM consoles ORDER BY release_year, "order", name`);
}

// ── ROMs ──────────────────────────────────────────────────────────────────────

export interface RomFilter {
  consoleId: string;  // pass "all" for global cross-console search
  genre?: string;
  backlogStatus?: BacklogStatus | "all";
  era?: string;          // generation number as string
  search?: string;
  tagIds?: number[];
  playlistId?: number;  // when set, filter to this playlist's ROMs
  page?: number;
  pageSize?: number;
}

export async function getRoms(filter: RomFilter): Promise<{ rows: RomEntry[]; total: number }> {
  if (!IS_TAURI) return { rows: [], total: 0 };
  const db = await getDb();

  // ── Virtual "Recently Played" playlist (id = -1) ──────────────────────────
  if (filter.playlistId === -1) {
    const [{ count }] = await db.select<[{ count: number }]>(
      `SELECT COUNT(*) as count FROM roms WHERE last_played_at IS NOT NULL`
    );
    const rows = await db.select<RomEntry[]>(
      `SELECT r.*, COALESCE(_ps.total_play_seconds, 0) as total_play_seconds,
              con.name as console_name, com.color as company_color
       FROM roms r
       JOIN consoles con ON con.id = r.console_id
       JOIN companies com ON com.id = con.company_id
       LEFT JOIN (SELECT rom_id, SUM(duration_seconds) as total_play_seconds FROM play_sessions GROUP BY rom_id) _ps ON _ps.rom_id = r.id
       WHERE r.last_played_at IS NOT NULL
       ORDER BY r.last_played_at DESC
       LIMIT 15`
    );
    for (const row of rows) {
      if (row.discs && typeof row.discs === "string") {
        try { (row as any).discs = JSON.parse(row.discs as any); } catch { (row as any).discs = []; }
      }
      row.tags = [];
    }
    return { rows, total: Math.min(count, 15) };
  }

  const page = filter.page ?? 0;
  const pageSize = filter.pageSize ?? 100;
  const isGlobal = filter.consoleId === "all" || filter.playlistId !== undefined;

  // Build joins / where
  const joins: string[] = [];
  let where = isGlobal ? "WHERE 1=1" : "WHERE r.console_id = ?";
  const params: unknown[] = isGlobal ? [] : [filter.consoleId];

  if (filter.playlistId !== undefined) {
    joins.push(`JOIN playlist_roms _pr ON _pr.rom_id = r.id AND _pr.playlist_id = ?`);
    params.unshift(filter.playlistId);
  }

  if (filter.backlogStatus && filter.backlogStatus !== "all") {
    where += " AND r.backlog_status = ?";
    params.push(filter.backlogStatus);
  }
  if (filter.search) {
    where += " AND r.title LIKE ?";
    params.push(`%${filter.search}%`);
  }
  if (filter.tagIds && filter.tagIds.length > 0) {
    joins.push(`JOIN rom_tags rt ON rt.rom_id = r.id`);
    where += ` AND rt.tag_id IN (${filter.tagIds.map(() => "?").join(",")})`;
    params.push(...filter.tagIds);
  }

  const joinStr = joins.join(" ");

  const [{ count }] = await db.select<[{ count: number }]>(
    `SELECT COUNT(DISTINCT r.id) as count FROM roms r ${joinStr} ${where}`,
    params
  );

  // For global search / playlist include console name + company color for display
  const selectExtra = isGlobal
    ? `, con.name as console_name, com.color as company_color`
    : "";
  const fromExtra = isGlobal
    ? `JOIN consoles con ON con.id = r.console_id JOIN companies com ON com.id = con.company_id`
    : "";

  const rows = await db.select<RomEntry[]>(
    `SELECT DISTINCT r.*, COALESCE(_ps.total_play_seconds, 0) as total_play_seconds${selectExtra}
     FROM roms r
     LEFT JOIN (SELECT rom_id, SUM(duration_seconds) as total_play_seconds FROM play_sessions GROUP BY rom_id) _ps ON _ps.rom_id = r.id
     ${fromExtra} ${joinStr} ${where} ORDER BY r.title LIMIT ? OFFSET ?`,
    [...params, pageSize, page * pageSize]
  );

  // SQLite returns JSON columns as strings — parse discs back to array
  for (const row of rows) {
    if (row.discs && typeof row.discs === "string") {
      try { (row as any).discs = JSON.parse(row.discs as any); }
      catch { (row as any).discs = []; }
    }
  }

  // Attach tags for all returned rows in one query (safe — table may not exist on older DBs)
  if (rows.length > 0) {
    try {
      const ids = rows.map(r => r.id);
      const tagRows = await db.select<{ rom_id: number; id: number; name: string; color: string }[]>(
        `SELECT rt.rom_id, t.id, t.name, t.color FROM rom_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.rom_id IN (${ids.map(() => "?").join(",")})`,
        ids
      );
      const tagMap = new Map<number, Tag[]>();
      for (const tr of tagRows) {
        const arr = tagMap.get(tr.rom_id) ?? [];
        arr.push({ id: tr.id, name: tr.name, color: tr.color });
        tagMap.set(tr.rom_id, arr);
      }
      for (const row of rows) {
        row.tags = tagMap.get(row.id) ?? [];
      }
    } catch {
      // tags table not yet migrated — leave tags empty, ROMs still show
      for (const row of rows) { row.tags = []; }
    }
  }

  return { rows, total: count };
}

export async function insertRom(rom: Omit<RomEntry, "id" | "added_at">): Promise<number> {
  if (!IS_TAURI) return 0;
  const db = await getDb();
  const result = await db.execute(
    `INSERT OR REPLACE INTO roms(console_id, title, filename, filepath, file_size, format, region, revision, backlog_status, note, is_exclusive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rom.console_id, rom.title, rom.filename, rom.filepath, rom.file_size,
     rom.format, rom.region ?? null, rom.revision ?? null,
     rom.backlog_status ?? null, rom.note ?? null, rom.is_exclusive ? 1 : 0]
  );
  return result.lastInsertId ?? 0;
}

/** Returns { added, updated } counts. */
export async function insertRomsBatch(roms: Omit<RomEntry, "id" | "added_at">[]): Promise<{ added: number; updated: number }> {
  if (!IS_TAURI || roms.length === 0) return { added: 0, updated: 0 };
  const db = await getDb();

  // Fetch all existing filepaths in one query for fast lookup
  const filepaths = roms.map(r => r.filepath);
  const placeholders = filepaths.map(() => "?").join(",");
  const existing = await db.select<{ filepath: string }[]>(
    `SELECT filepath FROM roms WHERE filepath IN (${placeholders})`,
    filepaths
  );
  const existingSet = new Set(existing.map(r => r.filepath));

  let added = 0, updated = 0;
  for (const rom of roms) {
    await db.execute(
      `INSERT OR REPLACE INTO roms(console_id, title, filename, filepath, file_size, format, region, revision, is_exclusive, discs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [rom.console_id, rom.title, rom.filename, rom.filepath, rom.file_size,
       rom.format, rom.region ?? null, rom.revision ?? null,
       rom.discs && rom.discs.length > 0 ? JSON.stringify(rom.discs) : null]
    );
    if (existingSet.has(rom.filepath)) updated++; else added++;
  }
  return { added, updated };
}


export async function updateBacklogBulk(romIds: number[], status: BacklogStatus | null): Promise<void> {
  if (!IS_TAURI || romIds.length === 0) return;
  const db = await getDb();
  const placeholders = romIds.map(() => "?").join(",");
  await db.execute(
    `UPDATE roms SET backlog_status = ? WHERE id IN (${placeholders})`,
    [status ?? null, ...romIds]
  );
}

export async function updateBacklog(romId: number, status: BacklogStatus | null): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`UPDATE roms SET backlog_status = ? WHERE id = ?`, [status, romId]);
}

export async function updateTitle(romId: number, title: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute("UPDATE roms SET title = ? WHERE id = ?", [title, romId]);
}

export async function updateNote(romId: number, note: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`UPDATE roms SET note = ? WHERE id = ?`, [note || null, romId]);
}

export async function saveRomHashes(romId: number, crc32: string, md5: string, sha1: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`UPDATE roms SET crc32 = ?, md5 = ?, sha1 = ? WHERE id = ?`, [crc32, md5, sha1, romId]);
}

export async function saveHasheousResult(
  romId: number,
  title: string | null,
  platform: string | null,
  region: string | null,
  source: string | null,
): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `UPDATE roms SET hasheous_title = ?, hasheous_platform = ?, hasheous_region = ?, hasheous_source = ? WHERE id = ?`,
    [title, platform, region, source, romId],
  );
}

export async function deleteRom(romId: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM roms WHERE id = ?`, [romId]);
}

// ── Duplicates ────────────────────────────────────────────────────────────────

export interface DuplicateGroup {
  normalizedTitle: string;
  entries: RomEntry[];
}

export async function findDuplicates(consoleId: string | "all"): Promise<DuplicateGroup[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();

  const where = consoleId === "all" ? "" : "WHERE console_id = ?";
  const params = consoleId === "all" ? [] : [consoleId];

  const rows = await db.select<RomEntry[]>(
    `SELECT * FROM roms ${where} ORDER BY title`,
    params
  );

  // Group by normalized title (lowercase, strip region/revision/junk)
  const groups = new Map<string, RomEntry[]>();
  for (const rom of rows) {
    const key = normalizeTitle(rom.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rom);
  }

  return Array.from(groups.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([normalizedTitle, entries]) => ({ normalizedTitle, entries }));
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")   // strip (USA), (Rev A), etc.
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ── Exclusives ────────────────────────────────────────────────────────────────

export async function getExclusives(consoleId?: string): Promise<Exclusive[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  if (consoleId) {
    return db.select<Exclusive[]>(
      `SELECT * FROM exclusives WHERE console_id = ? ORDER BY title`,
      [consoleId]
    );
  }
  return db.select<Exclusive[]>(`SELECT * FROM exclusives ORDER BY title`);
}

export async function toggleExclusiveOwned(id: number, owned: boolean): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`UPDATE exclusives SET owned = ? WHERE id = ?`, [owned ? 1 : 0, id]);
}

export async function addExclusive(exc: Omit<Exclusive, "id">): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR IGNORE INTO exclusives(console_id, title, publisher, note, genres, owned, user_added, list_id, list_label)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [exc.console_id, exc.title, exc.publisher ?? "", exc.note, JSON.stringify(exc.genres),
     exc.owned ? 1 : 0, exc.list_id ?? null, exc.list_label ?? null]
  );
}

// ── On This Day ──────────────────────────────────────────────────────────────

/** Returns the id, filepath and backlog_status of any ROM whose title fuzzy-matches
 *  the given title on the given console, so it can be launched directly. */
export async function findRomForOnThisDay(
  consoleId: string,
  title: string,
): Promise<{ id: number; filepath: string; backlog_status: string | null } | null> {
  if (!IS_TAURI) return null;
  const db = await getDb();
  const rows = await db.select<{ id: number; filepath: string; backlog_status: string | null }[]>(
    `SELECT id, filepath, backlog_status FROM roms WHERE console_id = ? AND title LIKE ? LIMIT 1`,
    [consoleId, `%${title.replace(/[:.!?']/g, "%")}%`]
  );
  return rows[0] ?? null;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getLibraryStats() {
  if (!IS_TAURI) return { totalRoms: 0, systems: 0, beaten: 0 };
  const db = await getDb();
  const [{ total }] = await db.select<[{ total: number }]>(`SELECT COUNT(*) as total FROM roms`);
  const [{ systems }] = await db.select<[{ systems: number }]>(
    `SELECT COUNT(DISTINCT console_id) as systems FROM roms`
  );
  const [{ beaten }] = await db.select<[{ beaten: number }]>(
    `SELECT COUNT(*) as beaten FROM roms WHERE backlog_status IN ('beaten','completed')`
  );
  return { totalRoms: total, systems, beaten };
}

export async function getConsoleStats() {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select<{
    console_id: string;
    rom_count: number;
    beaten_count: number;
    completed_count: number;
    in_progress_count: number;
    total_size: number;
  }[]>(`
    SELECT
      console_id,
      COUNT(*) as rom_count,
      SUM(CASE WHEN backlog_status='beaten'      THEN 1 ELSE 0 END) as beaten_count,
      SUM(CASE WHEN backlog_status='completed'   THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN backlog_status='in-progress' THEN 1 ELSE 0 END) as in_progress_count,
      SUM(file_size) as total_size
    FROM roms
    GROUP BY console_id
  `);
}

// ── Export / Import ───────────────────────────────────────────────────────────

export async function exportJson(): Promise<string> {
  if (!IS_TAURI) return "{}";
  const db = await getDb();
  const roms          = await db.select(`SELECT * FROM roms`);
  const exclusives    = await db.select(`SELECT * FROM exclusives`);
  const customConsoles  = await db.select(`SELECT * FROM consoles  WHERE custom = 1`);
  const customCompanies = await db.select(`SELECT * FROM companies WHERE custom = 1`);
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), roms, exclusives, customConsoles, customCompanies },
    null, 2
  );
}

export interface ImportResult {
  romsRestored: number;
  exclusivesRestored: number;
  errors: string[];
}

export async function importJson(raw: string): Promise<ImportResult> {
  if (!IS_TAURI) return { romsRestored: 0, exclusivesRestored: 0, errors: ["Not running in Tauri"] };

  const result: ImportResult = { romsRestored: 0, exclusivesRestored: 0, errors: [] };

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...result, errors: ["Invalid JSON file"] };
  }

  const db = await getDb();

  // ── Custom companies ──────────────────────────────────────────────────────
  if (Array.isArray(data.customCompanies)) {
    for (const c of data.customCompanies as Record<string, unknown>[]) {
      try {
        await db.execute(
          `INSERT OR REPLACE INTO companies(id, name, color, "order", custom)
           VALUES (?, ?, ?, ?, 1)`,
          [c.id, c.name, c.color, c.order]
        );
      } catch (e) { result.errors.push(`Company ${c.id}: ${e}`); }
    }
  }

  // ── Custom consoles ───────────────────────────────────────────────────────
  if (Array.isArray(data.customConsoles)) {
    for (const c of data.customConsoles as Record<string, unknown>[]) {
      try {
        await db.execute(
          `INSERT OR REPLACE INTO consoles(id, company_id, name, short_name, generation, release_year, "order", custom)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [c.id, c.company_id, c.name, c.short_name, c.generation, c.release_year, c.order]
        );
      } catch (e) { result.errors.push(`Console ${c.id}: ${e}`); }
    }
  }

  // ── ROMs — upsert preserving filepath uniqueness ──────────────────────────
  if (Array.isArray(data.roms)) {
    for (const r of data.roms as Record<string, unknown>[]) {
      try {
        await db.execute(
          `INSERT OR REPLACE INTO roms
             (console_id, title, filename, filepath, file_size, format,
              region, revision, backlog_status, note, is_exclusive, added_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.console_id, r.title, r.filename, r.filepath, r.file_size,
           r.format, r.region ?? null, r.revision ?? null,
           r.backlog_status ?? null, r.note ?? null,
           r.is_exclusive ? 1 : 0,
           r.added_at ?? new Date().toISOString()]
        );
        result.romsRestored++;
      } catch (e) { result.errors.push(`ROM ${r.title}: ${e}`); }
    }
  }

  // ── Exclusives — merge by console_id + title ──────────────────────────────
  if (Array.isArray(data.exclusives)) {
    for (const e of data.exclusives as Record<string, unknown>[]) {
      try {
        // Check if one already exists with same console + title
        const existing = await db.select<[{ id: number }?]>(
          `SELECT id FROM exclusives WHERE console_id = ? AND title = ? LIMIT 1`,
          [e.console_id, e.title]
        );
        if (existing.length > 0 && existing[0]) {
          // Update owned status and note only
          await db.execute(
            `UPDATE exclusives SET owned = ?, note = ? WHERE id = ?`,
            [e.owned ? 1 : 0, e.note ?? "", existing[0].id]
          );
        } else {
          await db.execute(
            `INSERT INTO exclusives(console_id, title, note, genres, owned, user_added)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [e.console_id, e.title, e.note ?? "",
             typeof e.genres === "string" ? e.genres : JSON.stringify(e.genres ?? []),
             e.owned ? 1 : 0, e.user_added ? 1 : 0]
          );
        }
        result.exclusivesRestored++;
      } catch (err) { result.errors.push(`Exclusive ${e.title}: ${err}`); }
    }
  }

  return result;
}


export async function deleteExclusiveList(consoleId: string, listId: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  if (listId === "custom") {
    // Custom tab = games with no list_id
    await db.execute(
      `DELETE FROM exclusives WHERE console_id = ? AND list_id IS NULL`,
      [consoleId]
    );
  } else {
    await db.execute(
      `DELETE FROM exclusives WHERE console_id = ? AND list_id = ?`,
      [consoleId, listId]
    );
  }
}

export async function deleteExclusive(id: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM exclusives WHERE id = ?`, [id]);
}



/** Wipe all user data — ROMs, exclusives, notes, backlog. Keeps schema intact. */
// ── Cover art cache ───────────────────────────────────────────────────────────

export async function getCoverArtPath(romId: number): Promise<string | null> {
  if (!IS_TAURI) return null;
  const db = await getDb();
  const rows = await db.select<[{ local_path: string }]>(
    `SELECT local_path FROM box_art WHERE rom_id = ?`, [romId]
  );
  return rows[0]?.local_path ?? null;
}

export async function saveCoverArtRecord(romId: number, localPath: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO box_art(rom_id, local_path) VALUES (?, ?)`,
    [romId, localPath]
  );
}

export async function deleteCoverArtRecords(consoleId?: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  if (consoleId) {
    await db.execute(
      `DELETE FROM box_art WHERE rom_id IN (SELECT id FROM roms WHERE console_id = ?)`,
      [consoleId]
    );
  } else {
    await db.execute(`DELETE FROM box_art`);
  }
}

export async function getCoverArtDbStats(): Promise<{
  totalCount: number;
  byConsole: { consoleId: string; count: number }[];
}> {
  if (!IS_TAURI) return { totalCount: 0, byConsole: [] };
  const db = await getDb();
  const [totRow] = await db.select<[{ c: number }]>(`SELECT COUNT(*) as c FROM box_art`);
  const byConsole = await db.select<{ consoleId: string; count: number }[]>(`
    SELECT r.console_id as consoleId, COUNT(*) as count
    FROM box_art ba JOIN roms r ON ba.rom_id = r.id
    GROUP BY r.console_id
  `);
  return { totalCount: totRow?.c ?? 0, byConsole };
}

export async function getRomsWithoutArt(consoleId?: string): Promise<
  { id: number; title: string; console_id: string; region: string | null; filename: string }[]
> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  const where = consoleId ? "AND r.console_id = ?" : "";
  const params = consoleId ? [consoleId] : [];
  return db.select<{ id: number; title: string; console_id: string; region: string | null; filename: string }[]>(
    `SELECT r.id, r.title, r.console_id, r.region, r.filename FROM roms r
     LEFT JOIN box_art ba ON ba.rom_id = r.id
     WHERE ba.rom_id IS NULL ${where}
     ORDER BY r.console_id, r.title`,
    params
  );
}

export async function getRecentlyAdded(limit = 15): Promise<RomEntry[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  const rows = await db.select<RomEntry[]>(
    `SELECT r.* FROM roms r ORDER BY r.added_at DESC LIMIT ?`,
    [limit]
  );
  for (const row of rows) {
    if (row.discs && typeof row.discs === "string") {
      try { (row as any).discs = JSON.parse(row.discs as any); } catch { (row as any).discs = []; }
    }
  }
  return rows;
}

export interface RandomRomFilter {
  consoleId?: string;
  companyId?: string;
  backlogStatus?: BacklogStatus | "any";
  tagIds?: number[];
}

export async function getRandomRom(filter: RandomRomFilter | string = {}): Promise<RomEntry | null> {
  if (!IS_TAURI) return null;
  const db = await getDb();

  // Legacy: accept plain string consoleId
  const f: RandomRomFilter = typeof filter === "string" ? { consoleId: filter } : filter;

  const joins: string[] = [];
  const wheres: string[] = [];
  const params: unknown[] = [];

  if (f.consoleId) {
    wheres.push("r.console_id = ?");
    params.push(f.consoleId);
  } else if (f.companyId) {
    joins.push("JOIN consoles con ON con.id = r.console_id");
    wheres.push("con.company_id = ?");
    params.push(f.companyId);
  }

  if (f.backlogStatus && f.backlogStatus !== "any") {
    wheres.push("r.backlog_status = ?");
    params.push(f.backlogStatus);
  }

  if (f.tagIds && f.tagIds.length > 0) {
    joins.push("JOIN rom_tags rt ON rt.rom_id = r.id");
    wheres.push(`rt.tag_id IN (${f.tagIds.map(() => "?").join(",")})`);
    params.push(...f.tagIds);
  }

  const whereStr = wheres.length > 0 ? `WHERE ${wheres.join(" AND ")}` : "";
  const joinStr  = joins.join(" ");

  const rows = await db.select<RomEntry[]>(
    `SELECT DISTINCT r.* FROM roms r ${joinStr} ${whereStr} ORDER BY RANDOM() LIMIT 1`,
    params
  );
  if (!rows[0]) return null;
  const row = rows[0];
  if (row.discs && typeof row.discs === "string") {
    try { (row as any).discs = JSON.parse(row.discs as any); } catch { (row as any).discs = []; }
  }
  return row;
}


// ── Delete console + its ROMs, exclusives, and optionally box art ─────────────



// ── Game title lookup (GameTDB) ──────────────────────────────────────────────

export async function saveGameTitles(
  entries: { gameId: string; title: string; platform: string }[]
): Promise<void> {
  if (!IS_TAURI || entries.length === 0) return;
  const db = await getDb();
  for (const e of entries) {
    await db.execute(
      `INSERT OR REPLACE INTO game_title_lookup(game_id, title, platform) VALUES (?, ?, ?)`,
      [e.gameId, e.title, e.platform]
    );
  }
}

export async function lookupGameTitle(gameId: string): Promise<string | null> {
  if (!IS_TAURI) return null;
  const db = await getDb();
  const rows = await db.select<{ title: string }[]>(
    `SELECT title FROM game_title_lookup WHERE game_id = ? LIMIT 1`,
    [gameId]
  );
  return rows[0]?.title ?? null;
}

export async function getGameDbMeta(): Promise<{
  platform: string; downloadedAt: string; entryCount: number;
}[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select(
    `SELECT platform, downloaded_at as downloadedAt, entry_count as entryCount
     FROM game_db_meta ORDER BY platform`
  );
}

export async function saveGameDbMeta(
  platform: string, entryCount: number
): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO game_db_meta(platform, downloaded_at, entry_count)
     VALUES (?, datetime('now'), ?)`,
    [platform, entryCount]
  );
}

export async function clearGameTitles(platform?: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  if (platform) {
    await db.execute(`DELETE FROM game_title_lookup WHERE platform = ?`, [platform]);
    await db.execute(`DELETE FROM game_db_meta WHERE platform = ?`, [platform]);
  } else {
    await db.execute(`DELETE FROM game_title_lookup`);
    await db.execute(`DELETE FROM game_db_meta`);
  }
}

export async function updateCompanyColor(companyId: string, color: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `UPDATE companies SET color = ? WHERE id = ?`,
    [color, companyId]
  );
}

export async function deleteConsole(
  consoleId: string,
  opts: { deleteBoxArt?: boolean } = {}
): Promise<{ romsDeleted: number }> {
  if (!IS_TAURI) return { romsDeleted: 0 };
  const db = await getDb();

  // Count ROMs first for the return value
  const countResult = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) as n FROM roms WHERE console_id = ?`, [consoleId]
  );
  const romsDeleted = countResult[0]?.n ?? 0;

  if (opts.deleteBoxArt) {
    // Delete cover art files via Rust then records
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_cover_art_for_console", { consoleId });
    } catch (e) {
      console.warn("Could not delete box art files:", e);
    }
    await db.execute(
      `DELETE FROM box_art WHERE rom_id IN (SELECT id FROM roms WHERE console_id = ?)`,
      [consoleId]
    );
  }

  await db.execute(`DELETE FROM exclusives   WHERE console_id = ?`, [consoleId]);
  await db.execute(`DELETE FROM roms         WHERE console_id = ?`, [consoleId]);
  await db.execute(`DELETE FROM consoles     WHERE id = ?`,         [consoleId]);

  return { romsDeleted };
}

// ── Delete company + all its consoles/ROMs/exclusives/box art ────────────────

export async function deleteCompany(
  companyId: string,
  opts: { deleteBoxArt?: boolean } = {}
): Promise<{ consolesDeleted: number; romsDeleted: number }> {
  if (!IS_TAURI) return { consolesDeleted: 0, romsDeleted: 0 };
  const db = await getDb();

  const consoles = await db.select<{ id: string }[]>(
    `SELECT id FROM consoles WHERE company_id = ?`, [companyId]
  );

  let romsDeleted = 0;
  for (const con of consoles) {
    const res = await deleteConsole(con.id, opts);
    romsDeleted += res.romsDeleted;
  }

  await db.execute(`DELETE FROM companies WHERE id = ?`, [companyId]);

  return { consolesDeleted: consoles.length, romsDeleted };
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<Tag[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  try {
    return await db.select<Tag[]>(`SELECT * FROM tags ORDER BY name COLLATE NOCASE`);
  } catch { return []; }
}

export async function createTag(name: string, color: string): Promise<Tag> {
  if (!IS_TAURI) return { id: 0, name, color };
  const db = await getDb();
  const result = await db.execute(`INSERT INTO tags(name, color) VALUES (?, ?)`, [name, color]);
  return { id: result.lastInsertId as number, name, color };
}

export async function updateTag(id: number, name: string, color: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`UPDATE tags SET name = ?, color = ? WHERE id = ?`, [name, color, id]);
}

export async function deleteTag(id: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM tags WHERE id = ?`, [id]);
}

export async function setRomTags(romId: number, tagIds: number[]): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM rom_tags WHERE rom_id = ?`, [romId]);
  for (const tagId of tagIds) {
    await db.execute(`INSERT OR IGNORE INTO rom_tags(rom_id, tag_id) VALUES (?, ?)`, [romId, tagId]);
  }
}

// ── Smart Lists ───────────────────────────────────────────────────────────────

export async function getSmartLists(): Promise<SmartList[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  try {
    const rows = await db.select<(Omit<SmartList, "tag_ids"> & { tag_ids: string })[]>(
      `SELECT * FROM smart_lists ORDER BY sort_order, name`
    );
    return rows.map(r => ({
      ...r,
      tag_ids: (() => { try { return JSON.parse(r.tag_ids); } catch { return []; } })(),
    }));
  } catch { return []; }
}

export async function createSmartList(list: Omit<SmartList, "id">): Promise<SmartList> {
  if (!IS_TAURI) return { ...list, id: 0 };
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO smart_lists(name, color, console_id, backlog_status, search, tag_ids, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [list.name, list.color, list.console_id, list.backlog_status, list.search, JSON.stringify(list.tag_ids), list.sort_order]
  );
  return { ...list, id: result.lastInsertId as number };
}

export async function updateSmartList(list: SmartList): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `UPDATE smart_lists SET name=?, color=?, console_id=?, backlog_status=?, search=?, tag_ids=?, sort_order=? WHERE id=?`,
    [list.name, list.color, list.console_id, list.backlog_status, list.search, JSON.stringify(list.tag_ids), list.sort_order, list.id]
  );
}

export async function deleteSmartList(id: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM smart_lists WHERE id = ?`, [id]);
}

// ── Playlists ─────────────────────────────────────────────────────────────────

export async function getPlaylists(): Promise<Playlist[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  try {
    // Get playlists with rom count
    const rows = await db.select<{ id: number; name: string; sort_order: number; rom_count: number }[]>(`
      SELECT p.id, p.name, p.sort_order, COUNT(pr.rom_id) as rom_count
      FROM playlists p
      LEFT JOIN playlist_roms pr ON pr.playlist_id = p.id
      GROUP BY p.id
      ORDER BY p.sort_order, p.name COLLATE NOCASE
    `);

    // Get company colors per playlist in one query
    let colorMap: Map<number, string[]> = new Map();
    try {
      const colorRows = await db.select<{ playlist_id: number; color: string }[]>(`
        SELECT pr.playlist_id, com.color
        FROM playlist_roms pr
        JOIN roms r ON r.id = pr.rom_id
        JOIN consoles con ON con.id = r.console_id
        JOIN companies com ON com.id = con.company_id
        GROUP BY pr.playlist_id, com.color
      `);
      for (const cr of colorRows) {
        const arr = colorMap.get(cr.playlist_id) ?? [];
        if (!arr.includes(cr.color)) arr.push(cr.color);
        colorMap.set(cr.playlist_id, arr);
      }
    } catch { /* playlists table may be fresh */ }

    return rows.map(r => ({
      id: r.id, name: r.name, sort_order: r.sort_order,
      rom_count: r.rom_count,
      company_colors: colorMap.get(r.id) ?? [],
    }));
  } catch { return []; }
}

export async function createPlaylist(name: string): Promise<Playlist> {
  if (!IS_TAURI) return { id: 0, name, sort_order: 99, rom_count: 0, company_colors: [] };
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO playlists(name, sort_order) VALUES (?, 99)`, [name]
  );
  return { id: result.lastInsertId as number, name, sort_order: 99, rom_count: 0, company_colors: [] };
}

export async function renamePlaylist(id: number, name: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`UPDATE playlists SET name = ? WHERE id = ?`, [name, id]);
}

export async function deletePlaylist(id: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM playlists WHERE id = ?`, [id]);
}

export async function addRomToPlaylist(playlistId: number, romId: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR IGNORE INTO playlist_roms(playlist_id, rom_id) VALUES (?, ?)`,
    [playlistId, romId]
  );
}

export async function addRomsToPlaylist(playlistId: number, romIds: number[]): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  for (const romId of romIds) {
    await db.execute(
      `INSERT OR IGNORE INTO playlist_roms(playlist_id, rom_id) VALUES (?, ?)`,
      [playlistId, romId]
    );
  }
}

export async function removeRomFromPlaylist(playlistId: number, romId: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `DELETE FROM playlist_roms WHERE playlist_id = ? AND rom_id = ?`,
    [playlistId, romId]
  );
}

// ── Emulators ─────────────────────────────────────────────────────────────────

export async function getEmulatorProfiles(): Promise<EmulatorProfile[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  const rows = await db.select<{ id: number; name: string; exe_path: string; args: string; is_retroarch: number; core_path: string | null }[]>(
    `SELECT id, name, exe_path, args, is_retroarch, core_path FROM emulator_profiles ORDER BY name`
  );
  return rows.map(r => ({ ...r, is_retroarch: r.is_retroarch === 1 }));
}

export async function createEmulatorProfile(p: Omit<EmulatorProfile, "id">): Promise<number> {
  if (!IS_TAURI) return 0;
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO emulator_profiles(name, exe_path, args, is_retroarch, core_path) VALUES (?, ?, ?, ?, ?)`,
    [p.name, p.exe_path, p.args, p.is_retroarch ? 1 : 0, p.core_path ?? null]
  );
  return result.lastInsertId as number;
}

export async function updateEmulatorProfile(p: EmulatorProfile): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `UPDATE emulator_profiles SET name=?, exe_path=?, args=?, is_retroarch=?, core_path=? WHERE id=?`,
    [p.name, p.exe_path, p.args, p.is_retroarch ? 1 : 0, p.core_path ?? null, p.id]
  );
}

export async function deleteEmulatorProfile(id: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  // console_emulators rows cascade-delete via ON DELETE CASCADE
  await db.execute(`DELETE FROM emulator_profiles WHERE id=?`, [id]);
}

// Returns a map of console_id → emulator profile for all consoles that have one set
export async function getConsoleEmulators(): Promise<Map<string, EmulatorProfile>> {
  if (!IS_TAURI) return new Map();
  const db = await getDb();
  const rows = await db.select<{ console_id: string; id: number; name: string; exe_path: string; args: string; is_retroarch: number; core_path: string | null }[]>(
    `SELECT ce.console_id, ep.id, ep.name, ep.exe_path, ep.args, ep.is_retroarch, ep.core_path
     FROM console_emulators ce
     JOIN emulator_profiles ep ON ep.id = ce.emulator_id`
  );
  const map = new Map<string, EmulatorProfile>();
  for (const r of rows) {
    map.set(r.console_id, { id: r.id, name: r.name, exe_path: r.exe_path, args: r.args, is_retroarch: r.is_retroarch === 1, core_path: r.core_path });
  }
  return map;
}

export async function setConsoleEmulator(consoleId: string, emulatorId: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO console_emulators(console_id, emulator_id) VALUES (?, ?)`,
    [consoleId, emulatorId]
  );
}

export async function clearConsoleEmulator(consoleId: string): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM console_emulators WHERE console_id=?`, [consoleId]);
}

// ── Play tracking ─────────────────────────────────────────────────────────────

export async function recordPlay(romId: number, currentStatus: string | null): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  // Auto-nudge: untracked/unplayed → in-progress
  const newStatus = (!currentStatus || currentStatus === "unplayed") ? "in-progress" : currentStatus;
  await db.execute(
    `UPDATE roms SET last_played_at = datetime('now'), play_count = play_count + 1, backlog_status = ? WHERE id = ?`,
    [newStatus, romId]
  );
}

// ── Play sessions ─────────────────────────────────────────────────────────────

export async function recordSessionStart(romId: number): Promise<number> {
  if (!IS_TAURI) return 0;
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO play_sessions(rom_id, started_at) VALUES (?, datetime('now'))`,
    [romId]
  );
  return result.lastInsertId as number;
}

export async function recordSessionEnd(sessionId: number, durationSeconds: number): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(
    `UPDATE play_sessions SET ended_at = datetime('now'), duration_seconds = ? WHERE id = ?`,
    [durationSeconds, sessionId]
  );
}

export async function getSessionsForRom(romId: number): Promise<import("./types").PlaySession[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select<import("./types").PlaySession[]>(
    `SELECT * FROM play_sessions WHERE rom_id = ? ORDER BY started_at DESC LIMIT 100`,
    [romId]
  );
}

export async function getActivityData(): Promise<{ date: string; sessions: number; duration_seconds: number }[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select<{ date: string; sessions: number; duration_seconds: number }[]>(
    `SELECT date(started_at) as date,
            COUNT(*) as sessions,
            COALESCE(SUM(duration_seconds), 0) as duration_seconds
     FROM play_sessions
     WHERE started_at >= date('now', '-364 days')
     GROUP BY date(started_at)
     ORDER BY date`
  );
}

export async function deleteAllSessions(): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM play_sessions`);
  await db.execute(`UPDATE roms SET last_played_at = NULL`);
}

export async function getActivityByConsole(): Promise<{ week: string; console_id: string; sessions: number; duration_seconds: number }[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select<{ week: string; console_id: string; sessions: number; duration_seconds: number }[]>(
    `SELECT
       date(started_at, '-' || ((strftime('%w', started_at) + 6) % 7) || ' days') as week,
       r.console_id,
       COUNT(*) as sessions,
       COALESCE(SUM(ps.duration_seconds), 0) as duration_seconds
     FROM play_sessions ps
     JOIN roms r ON r.id = ps.rom_id
     WHERE ps.started_at >= date('now', '-84 days')
     GROUP BY week, r.console_id
     ORDER BY week, r.console_id`
  );
}

export async function getPlayStats(romId: number): Promise<{ sessions: number; total_seconds: number }> {
  if (!IS_TAURI) return { sessions: 0, total_seconds: 0 };
  const db = await getDb();
  const rows = await db.select<[{ sessions: number; total_seconds: number }]>(
    `SELECT COUNT(*) as sessions, COALESCE(SUM(duration_seconds), 0) as total_seconds
     FROM play_sessions WHERE rom_id = ?`,
    [romId]
  );
  return rows[0] ?? { sessions: 0, total_seconds: 0 };
}

export async function getRecentlyPlayed(limit = 20): Promise<(RomEntry & { total_play_seconds: number })[]> {
  if (!IS_TAURI) return [];
  const db = await getDb();
  return db.select<(RomEntry & { total_play_seconds: number })[]>(
    `SELECT r.*, COALESCE(ps.total_seconds, 0) as total_play_seconds
     FROM roms r
     LEFT JOIN (
       SELECT rom_id, SUM(duration_seconds) as total_seconds FROM play_sessions GROUP BY rom_id
     ) ps ON ps.rom_id = r.id
     WHERE r.last_played_at IS NOT NULL
     ORDER BY r.last_played_at DESC LIMIT ?`,
    [limit]
  );
}

// ── Collection export helpers ─────────────────────────────────────────────────

interface ExportGroup {
  company: { id: string; name: string; color: string };
  consoles: { id: string; name: string; short_name: string; roms: RomEntry[] }[];
}

async function buildExportGroups(): Promise<{ groups: ExportGroup[]; generatedAt: string }> {
  const db = await getDb();

  const companies = await db.select<{ id: string; name: string; color: string; order: number }[]>(
    `SELECT id, name, color, "order" FROM companies ORDER BY "order"`
  );
  const consoles = await db.select<{ id: string; company_id: string; name: string; short_name: string; order: number }[]>(
    `SELECT id, company_id, name, short_name, "order" FROM consoles ORDER BY "order"`
  );
  const roms = await db.select<RomEntry[]>(
    `SELECT * FROM roms ORDER BY console_id, title COLLATE NOCASE`
  );

  const romsByConsole = new Map<string, RomEntry[]>();
  for (const rom of roms) {
    const arr = romsByConsole.get(rom.console_id) ?? [];
    arr.push(rom);
    romsByConsole.set(rom.console_id, arr);
  }

  const groups: ExportGroup[] = [];
  for (const company of companies) {
    const companyCons = consoles.filter(c => c.company_id === company.id);
    const conGroups = companyCons
      .map(con => ({ id: con.id, name: con.name, short_name: con.short_name, roms: romsByConsole.get(con.id) ?? [] }))
      .filter(g => g.roms.length > 0);
    if (conGroups.length > 0) {
      groups.push({ company: { id: company.id, name: company.name, color: company.color }, consoles: conGroups });
    }
  }

  return { groups, generatedAt: new Date().toLocaleString() };
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
}

function statusLabel(s?: string): string {
  if (!s || s === "unplayed") return "";
  if (s === "in-progress") return "Playing";
  if (s === "beaten") return "Beaten";
  if (s === "completed") return "Completed";
  return s;
}

export async function exportHtml(): Promise<string> {
  if (!IS_TAURI) return "";
  const { groups, generatedAt } = await buildExportGroups();

  const totalRoms = groups.reduce((a, g) => a + g.consoles.reduce((b, c) => b + c.roms.length, 0), 0);

  const companySections = groups.map(({ company, consoles }) => {
    const consoleSections = consoles.map(con => {
      const rows = con.roms.map((rom, i) => {
        const status = statusLabel(rom.backlog_status);
        const statusColor = rom.backlog_status === "completed" ? "#a78bfa"
          : rom.backlog_status === "beaten" ? "#4ade80"
          : rom.backlog_status === "in-progress" ? "#f59e0b" : "";
        return `
          <tr>
            <td class="num">${i + 1}</td>
            <td class="title">${rom.title.replace(/</g, "&lt;")}</td>
            <td class="fmt">${rom.format ?? ""}</td>
            <td class="region">${rom.region ?? ""}</td>
            <td class="size">${rom.file_size ? formatBytes(rom.file_size) : ""}</td>
            <td class="status"${statusColor ? ` style="color:${statusColor}"` : ""}>${status}</td>
            <td class="note">${(rom.note ?? "").replace(/</g, "&lt;")}</td>
          </tr>`;
      }).join("");

      return `
        <div class="console-block">
          <h3 class="console-name" style="border-color:${company.color}44">${con.name}
            <span class="count">${con.roms.length} ROM${con.roms.length !== 1 ? "s" : ""}</span>
          </h3>
          <table>
            <thead><tr>
              <th class="num">#</th><th class="title">Title</th><th class="fmt">Format</th>
              <th class="region">Region</th><th class="size">Size</th>
              <th class="status">Status</th><th class="note">Note</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join("");

    const companyTotal = consoles.reduce((a, c) => a + c.roms.length, 0);
    return `
      <section class="company-section">
        <h2 class="company-heading" style="color:${company.color};border-color:${company.color}33">
          ${company.name.toUpperCase()}
          <span class="company-count">${companyTotal.toLocaleString()} ROMs</span>
        </h2>
        ${consoleSections}
      </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ROM Vault — Collection Export</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080810; color: #eeeef8; font-family: 'JetBrains Mono', 'Fira Mono', Consolas, monospace; font-size: 13px; padding: 32px 24px; }
  a { color: inherit; }
  .header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #1e1e36; }
  .header h1 { font-size: 24px; font-weight: 800; letter-spacing: 0.12em; }
  .header h1 span { color: #52C060; }
  .header-meta { font-size: 11px; color: #606080; margin-left: auto; }
  .summary { display: flex; gap: 24px; margin-bottom: 32px; }
  .summary-stat { background: #0e0e1c; border: 1px solid #1e1e36; border-radius: 8px; padding: 12px 20px; }
  .summary-stat .val { font-size: 22px; font-weight: 800; color: #52C060; }
  .summary-stat .lbl { font-size: 10px; color: #606080; letter-spacing: 0.1em; margin-top: 2px; }
  .company-section { margin-bottom: 40px; }
  .company-heading { font-size: 13px; font-weight: 800; letter-spacing: 0.14em; padding-bottom: 8px; margin-bottom: 16px; border-bottom: 1px solid; display: flex; align-items: center; gap: 12px; }
  .company-count { font-size: 11px; font-weight: 400; color: #9898b8; margin-left: auto; }
  .console-block { margin-bottom: 24px; }
  .console-name { font-size: 12px; font-weight: 700; color: #9898b8; letter-spacing: 0.08em; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid; display: flex; align-items: center; gap: 10px; }
  .count { font-weight: 400; font-size: 11px; color: #606080; margin-left: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { border-bottom: 1px solid #1e1e36; }
  th { text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: #606080; padding: 4px 8px 6px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #0e0e1c; color: #9898b8; vertical-align: top; }
  td.title { color: #eeeef8; font-weight: 500; }
  td.num { color: #606080; text-align: right; width: 36px; }
  td.fmt, td.region { width: 70px; }
  td.size { width: 80px; text-align: right; }
  td.status { width: 90px; font-weight: 600; font-size: 11px; }
  td.note { color: #7878a0; font-style: italic; max-width: 260px; }
  tr:hover td { background: #0e0e1c; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #1e1e36; font-size: 10px; color: #606080; letter-spacing: 0.08em; }
  @media (prefers-color-scheme: light) {
    body { background: #f4f4fa; color: #18182e; }
    .summary-stat { background: #ebebf5; border-color: #c8c8e0; }
    .summary-stat .val { color: #2a8a38; }
    .summary-stat .lbl { color: #888aaa; }
    thead tr { border-color: #c8c8e0; }
    td { border-color: #e4e4f0; color: #44446a; }
    td.title { color: #18182e; }
    td.num { color: #888aaa; }
    td.note { color: #888aaa; }
    tr:hover td { background: #ebebf5; }
    .footer { border-color: #c8c8e0; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>ROM <span>VAULT</span></h1>
  <div class="header-meta">Generated ${generatedAt}</div>
</div>
<div class="summary">
  <div class="summary-stat"><div class="val">${totalRoms.toLocaleString()}</div><div class="lbl">TOTAL ROMS</div></div>
  <div class="summary-stat"><div class="val">${groups.length}</div><div class="lbl">PLATFORMS</div></div>
  <div class="summary-stat"><div class="val">${groups.reduce((a, g) => a + g.consoles.length, 0)}</div><div class="lbl">CONSOLES</div></div>
</div>
${companySections}
<div class="footer">ROM VAULT &mdash; Personal ROM Backup Database &mdash; ${generatedAt}</div>
</body>
</html>`;
}

export async function exportMarkdown(): Promise<string> {
  if (!IS_TAURI) return "";
  const { groups, generatedAt } = await buildExportGroups();

  const totalRoms = groups.reduce((a, g) => a + g.consoles.reduce((b, c) => b + c.roms.length, 0), 0);
  const lines: string[] = [];

  lines.push(`# ROM Vault — Collection Export`);
  lines.push(`*Generated ${generatedAt}*`);
  lines.push(``);
  lines.push(`**${totalRoms.toLocaleString()} ROMs** across **${groups.length} platforms**`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  for (const { company, consoles } of groups) {
    const companyTotal = consoles.reduce((a, c) => a + c.roms.length, 0);
    lines.push(`## ${company.name} *(${companyTotal.toLocaleString()} ROMs)*`);
    lines.push(``);

    for (const con of consoles) {
      lines.push(`### ${con.name} — ${con.roms.length} ROM${con.roms.length !== 1 ? "s" : ""}`);
      lines.push(``);
      lines.push(`| # | Title | Format | Region | Size | Status |`);
      lines.push(`|---|-------|--------|--------|------|--------|`);

      con.roms.forEach((rom, i) => {
        const status = statusLabel(rom.backlog_status) || "—";
        const size   = rom.file_size ? formatBytes(rom.file_size) : "—";
        const region = rom.region ?? "—";
        const fmt    = rom.format ?? "—";
        const title  = rom.title.replace(/\|/g, "\\|");
        lines.push(`| ${i + 1} | ${title} | ${fmt} | ${region} | ${size} | ${status} |`);
      });

      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(`*ROM Vault — Personal ROM Backup Database*`);

  return lines.join("\n");
}

export async function deleteAllData(): Promise<void> {
  if (!IS_TAURI) return;
  const db = await getDb();
  await db.execute(`DELETE FROM roms`);
  await db.execute(`DELETE FROM exclusives`);
  // Reset any sqlite sequences so IDs restart from 1
  await db.execute(`DELETE FROM sqlite_sequence WHERE name IN ('roms','exclusives')`);
}
