-- Emulator profiles: one row per emulator the user has configured
CREATE TABLE IF NOT EXISTS emulator_profiles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  exe_path     TEXT    NOT NULL,
  args         TEXT    NOT NULL DEFAULT '{rom}',  -- launch arg template; {rom} = filepath
  is_retroarch INTEGER NOT NULL DEFAULT 0,        -- 1 = RetroArch mode
  core_path    TEXT                               -- RetroArch core (.dll/.so), NULL if not RetroArch
);

-- Maps each console to its default emulator profile
CREATE TABLE IF NOT EXISTS console_emulators (
  console_id   TEXT    NOT NULL PRIMARY KEY,
  emulator_id  INTEGER NOT NULL REFERENCES emulator_profiles(id) ON DELETE CASCADE
);
