-- Migration: Hôtesses et Émargement en Salle
ALTER TABLE guests ADD COLUMN arrived_at DATETIME;

CREATE TABLE IF NOT EXISTS hostesses (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    phone TEXT,
    assigned_tables TEXT DEFAULT 'ALL',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hostesses_event ON hostesses(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_arrived ON guests(is_arrived);
