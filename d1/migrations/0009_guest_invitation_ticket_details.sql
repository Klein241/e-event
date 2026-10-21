-- ============================================================
-- MIGRATION 0009 : DÉTAILS BILLETS (GENRE, COUPLE, CONJOINT)
-- ============================================================

ALTER TABLE guests ADD COLUMN gender TEXT;
ALTER TABLE guests ADD COLUMN ticket_type TEXT DEFAULT 'seul';
ALTER TABLE guests ADD COLUMN partner_name TEXT;
ALTER TABLE guests ADD COLUMN couple_name TEXT;

-- Table de configuration dynamique des tables du Gala
CREATE TABLE IF NOT EXISTS event_tables (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    table_code TEXT UNIQUE NOT NULL,
    capacity INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des tables par défaut : A, D, F, G, H, I, J, K, L, M, O, P, Q, S, T, U, V, W, X, Z
INSERT OR IGNORE INTO event_tables (id, table_code) VALUES
('tbl-A', 'A'), ('tbl-D', 'D'), ('tbl-F', 'F'), ('tbl-G', 'G'),
('tbl-H', 'H'), ('tbl-I', 'I'), ('tbl-J', 'J'), ('tbl-K', 'K'),
('tbl-L', 'L'), ('tbl-M', 'M'), ('tbl-O', 'O'), ('tbl-P', 'P'),
('tbl-Q', 'Q'), ('tbl-S', 'S'), ('tbl-T', 'T'), ('tbl-U', 'U'),
('tbl-V', 'V'), ('tbl-W', 'W'), ('tbl-X', 'X'), ('tbl-Z', 'Z');
