-- ============================================================
-- MIGRATION 0007 : SUPPORT IMAGE_DATA BASE64 POUR LES ANNONCES
-- ============================================================

-- Ajout colonne image_data pour stocker les images en base64 uploadees localement
ALTER TABLE ads_sponsors ADD COLUMN image_data TEXT;

-- Remise a zero des statistiques pour n'avoir QUE de vraies statistiques de clics et vues reelles
UPDATE ads_sponsors SET views_count = 0, clicks_count = 0;

