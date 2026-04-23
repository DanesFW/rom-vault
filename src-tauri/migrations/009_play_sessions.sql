CREATE TABLE IF NOT EXISTS play_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  rom_id           INTEGER NOT NULL REFERENCES roms(id) ON DELETE CASCADE,
  started_at       TEXT    NOT NULL,
  ended_at         TEXT,
  duration_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_play_sessions_rom  ON play_sessions(rom_id);
CREATE INDEX IF NOT EXISTS idx_play_sessions_date ON play_sessions(date(started_at));
