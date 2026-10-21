-- ============================================================
-- MIGRATION 0008 : INVITÉS PAR LIEN DE PARTAGE & PARRAINAGE
-- ============================================================

ALTER TABLE guests ADD COLUMN invited_by TEXT;
ALTER TABLE guests ADD COLUMN registration_source TEXT DEFAULT 'direct';

CREATE INDEX IF NOT EXISTS idx_guests_reg_source ON guests(registration_source, created_at DESC);
