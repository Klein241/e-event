-- Migration: Ajout des champs whatsapp et is_private pour la confidentialité des prières
ALTER TABLE prayer_requests ADD COLUMN whatsapp TEXT;
ALTER TABLE prayer_requests ADD COLUMN is_private INTEGER DEFAULT 1;
