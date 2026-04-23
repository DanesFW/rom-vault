-- ROM Vault SQLite Schema
-- Run via Tauri SQL plugin on first launch

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT '#888888',
  "order"   INTEGER NOT NULL DEFAULT 99,
  custom    INTEGER NOT NULL DEFAULT 0  -- boolean
);

-- ── Consoles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consoles (
  id                         TEXT PRIMARY KEY,
  company_id                 TEXT NOT NULL REFERENCES companies(id),
  name                       TEXT NOT NULL,
  short_name                 TEXT NOT NULL,
  generation                 INTEGER,
  release_year               INTEGER,
  "order"                    INTEGER NOT NULL DEFAULT 99,
  custom                     INTEGER NOT NULL DEFAULT 0,
  primary_emulator_desktop   TEXT,
  primary_emulator_android   TEXT,
  alt_emulators              TEXT,     -- JSON array
  recommended_formats        TEXT,     -- JSON array
  hardware_notes             TEXT,     -- newline-separated
  pro_tips                   TEXT      -- newline-separated
);

-- ── ROMs (library) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roms (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  console_id     TEXT NOT NULL REFERENCES consoles(id),
  title          TEXT NOT NULL,
  filename       TEXT NOT NULL,
  filepath       TEXT NOT NULL UNIQUE,
  file_size      INTEGER NOT NULL DEFAULT 0,
  format         TEXT NOT NULL,         -- file extension e.g. ".chd"
  region         TEXT,
  revision       TEXT,
  backlog_status TEXT,                  -- NULL | 'unplayed' | 'in-progress' | 'beaten' | 'completed'
  note           TEXT,
  is_exclusive   INTEGER NOT NULL DEFAULT 0,
  added_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roms_console ON roms(console_id);
CREATE INDEX IF NOT EXISTS idx_roms_title   ON roms(title);

-- ── Exclusives list ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exclusives (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  console_id   TEXT NOT NULL REFERENCES consoles(id),
  title        TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  genres       TEXT NOT NULL DEFAULT '[]', -- JSON array
  owned        INTEGER NOT NULL DEFAULT 0,
  user_added   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exclusives_console ON exclusives(console_id);

-- ── Box art cache ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS box_art (
  rom_id       INTEGER PRIMARY KEY REFERENCES roms(id) ON DELETE CASCADE,
  local_path   TEXT NOT NULL,
  fetched_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── App settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings(key, value) VALUES
  ('schema_version', '1'),
  ('last_scan_path',  '');
