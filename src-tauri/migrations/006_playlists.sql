CREATE TABLE IF NOT EXISTS playlists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 99
);

CREATE TABLE IF NOT EXISTS playlist_roms (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  rom_id      INTEGER NOT NULL REFERENCES roms(id)      ON DELETE CASCADE,
  added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (playlist_id, rom_id)
);
