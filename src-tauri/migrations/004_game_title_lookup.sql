-- Game title lookup table — populated from GameTDB databases
-- Maps disc IDs (e.g. SMNE01) to canonical English titles
CREATE TABLE IF NOT EXISTS game_title_lookup (
    game_id  TEXT NOT NULL,
    title    TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (game_id, platform)
);

-- Track when databases were last downloaded
CREATE TABLE IF NOT EXISTS game_db_meta (
    platform    TEXT PRIMARY KEY,
    downloaded_at TEXT NOT NULL,
    entry_count INTEGER NOT NULL DEFAULT 0
);
