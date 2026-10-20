-- ============================================================
-- Migration 0004: Programme de la Cérémonie & Bascule Direct
-- ============================================================

-- 1. Ajout de la colonne direct_feature_enabled dans events si pas encore présente
-- Note: SQLite supporte ALTER TABLE ADD COLUMN
ALTER TABLE events ADD COLUMN direct_feature_enabled INTEGER DEFAULT 1;

-- 2. Table des points du programme de la cérémonie
CREATE TABLE IF NOT EXISTS program_items (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    title TEXT NOT NULL,
    speaker TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_program_event ON program_items(event_id, order_index ASC);

-- 3. Insertion du programme initial (Dîner de Gala)
INSERT OR IGNORE INTO program_items (id, event_id, start_time, end_time, title, speaker, description, order_index)
VALUES 
('prog-1', 'default', '16:00', '17:00', 'Accueil des invités & Cocktail de bienvenue', 'Équipe d''accueil', 'Cocktail de bienvenue et installation conviviale', 1),
('prog-2', 'default', '17:00', '17:15', 'Ouverture officielle & Mot de bienvenue', 'Avec remerciement à la salle Le Rocher des Âges', 'Cérémonie d''ouverture et allocution d''accueil', 2),
('prog-3', 'default', '17:15', '17:45', 'Prestation artistique & témoignage inspirant', 'Artistes invités', 'Chants, louange et témoignages poignants', 3),
('prog-4', 'default', '17:45', '18:05', 'Message principal (20 min)', 'Pasteur KAMZOLES Charly Ingénu', 'Exhortation solennelle et vision d''excellence', 4),
('prog-5', 'default', '18:05', '18:20', 'Présentation des ouvrages & Dédicace', 'Pasteur KAMZOLES', 'Présentation spéciale des livres et signatures d''auteurs', 5),
('prog-6', 'default', '18:20', '19:15', 'Dîner convivial', 'La table des livres reste ouverte pendant le repas', 'Service du repas gastronomique et échanges fraternels', 6),
('prog-7', 'default', '19:15', '19:45', 'Prestation artistique & témoignage', 'Artistes invités', 'Deuxième partie musicale et partages d''impact', 7),
('prog-8', 'default', '19:45', '20:30', 'Duo artistique de clôture', 'Artistes invités', 'Prestation finale en duo et bénédiction de clôture', 8);
