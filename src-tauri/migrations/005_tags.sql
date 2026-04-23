-- Tags: user-defined labels for ROMs (e.g. "co-op", "childhood", "replay")

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#888888'
);

CREATE TABLE IF NOT EXISTS rom_tags (
  rom_id INTEGER NOT NULL REFERENCES roms(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (rom_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_rom_tags_rom ON rom_tags(rom_id);
CREATE INDEX IF NOT EXISTS idx_rom_tags_tag ON rom_tags(tag_id);

-- Smart lists: saved filter presets stored in the sidebar
CREATE TABLE IF NOT EXISTS smart_lists (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#888888',
  console_id    TEXT,    -- NULL = all consoles
  backlog_status TEXT,   -- NULL = all
  search        TEXT,    -- NULL = no search filter
  tag_ids       TEXT NOT NULL DEFAULT '[]',  -- JSON array of tag IDs
  sort_order    INTEGER NOT NULL DEFAULT 99
);
