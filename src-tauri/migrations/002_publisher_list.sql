-- Migration 002: add publisher and list tracking to exclusives
ALTER TABLE exclusives ADD COLUMN publisher TEXT NOT NULL DEFAULT '';
ALTER TABLE exclusives ADD COLUMN list_id    TEXT;
ALTER TABLE exclusives ADD COLUMN list_label TEXT;
