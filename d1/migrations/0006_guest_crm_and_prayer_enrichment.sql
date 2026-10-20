-- ============================================================
-- MIGRATION 0006 : CRM INVITÉS COMPLET & ENRICHISSEMENT PRIÈRE
-- ============================================================

-- 1. Champs enrichis dans la table guests
ALTER TABLE guests ADD COLUMN profession TEXT;
ALTER TABLE guests ADD COLUMN company TEXT;
ALTER TABLE guests ADD COLUMN residence_location TEXT;
ALTER TABLE guests ADD COLUMN phone TEXT;
ALTER TABLE guests ADD COLUMN has_church INTEGER DEFAULT 0;
ALTER TABLE guests ADD COLUMN church_name TEXT;
ALTER TABLE guests ADD COLUMN church_duration TEXT;

-- 2. Champs enrichis dans la table prayer_requests
ALTER TABLE prayer_requests ADD COLUMN target_person TEXT;
ALTER TABLE prayer_requests ADD COLUMN residence_location TEXT;
ALTER TABLE prayer_requests ADD COLUMN has_church INTEGER DEFAULT 0;
ALTER TABLE prayer_requests ADD COLUMN church_name TEXT;
ALTER TABLE prayer_requests ADD COLUMN church_duration TEXT;
ALTER TABLE prayer_requests ADD COLUMN full_name TEXT;
