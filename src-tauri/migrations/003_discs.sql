-- Migration 003: multi-disc support
ALTER TABLE roms ADD COLUMN discs TEXT; -- JSON array of extra disc filepaths
