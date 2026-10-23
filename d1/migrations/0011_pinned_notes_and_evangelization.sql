-- Migration 0011: Notes épinglées et Fiches d'Évangélisation
-- Permet à l'admin d'épingler des consignes et aux hôtesses/superviseurs de gérer les sans-billets et l'évangélisation

-- 1. Table des notes épinglées par l'administrateur
CREATE TABLE IF NOT EXISTS pinned_notes (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    content TEXT NOT NULL,
    author TEXT DEFAULT 'Régie Admin',
    target_role TEXT DEFAULT 'ALL', -- 'ALL', 'hostess', 'supervisor'
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pinned_notes_active ON pinned_notes(event_id, is_active);

-- 2. Table des fiches d'évangélisation remplies par le superviseur
CREATE TABLE IF NOT EXISTS evangelization_records (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    guest_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    residence_location TEXT,
    attends_church INTEGER DEFAULT 0, -- 1 = oui, 0 = non
    church_name TEXT,
    church_no_reason TEXT,
    is_baptized INTEGER DEFAULT 0, -- 1 = oui, 0 = non
    baptism_date TEXT,
    baptism_no_reason TEXT,
    last_church_attended TEXT,
    phone TEXT,
    profession TEXT,
    spiritual_decision TEXT, -- 'acceptation_christ', 'reconciliation', 'demande_priere', 'autre'
    notes TEXT,
    supervisor_name TEXT DEFAULT 'Superviseur',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evang_guest ON evangelization_records(guest_id);
CREATE INDEX IF NOT EXISTS idx_evang_event ON evangelization_records(event_id, created_at DESC);

-- 3. Colonnes complémentaires dans la table guests (compatibilité idempotente)
-- Note: Si déjà présentes, les requêtes dans le worker gèrent le fallback sécurisé
ALTER TABLE guests ADD COLUMN is_evangelized INTEGER DEFAULT 0;
ALTER TABLE guests ADD COLUMN evangelized_at DATETIME;
ALTER TABLE guests ADD COLUMN evangelized_by TEXT;
