-- ============================================================
-- Migration 0005: Espaces Publicitaires, Sponsors & Vitrine 3D
-- ============================================================

CREATE TABLE IF NOT EXISTS ads_sponsors (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    brand TEXT,
    tagline TEXT,
    description TEXT,
    image_url TEXT,
    redirect_url TEXT,
    theme_color TEXT DEFAULT 'peach', -- 'sage', 'peach', 'honey', 'blue', 'gold'
    icon_emoji TEXT DEFAULT '🛍️',
    price_tag TEXT,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ads_event ON ads_sponsors(event_id, is_active, order_index ASC);

-- Insertion des 4 cartes partenaires / produits initiales (inspirées du modèle pastel 3D)
INSERT OR IGNORE INTO ads_sponsors (id, event_id, title, brand, tagline, description, image_url, redirect_url, theme_color, icon_emoji, price_tag, views_count, clicks_count, is_active, order_index)
VALUES 
('ad-1', 'default', 'Ouvrages & Dédicaces', 'Pasteur KAMZOLES', 'Dédicace Spéciale', 'Découvrez les livres d''impact et d''exhortation du Pasteur KAMZOLES Charly Ingénu. Disponibles à la table d''honneur avec signatures personnalisées.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', 'https://wa.me/?text=Bonjour%20je%20souhaite%20r%C3%A9server%20un%20livre%20du%20Pasteur%20KAMZOLES', 'sage', '📚', 'Disponible ce soir', 142, 28, 1, 1),
('ad-2', 'default', 'Le Rocher des Âges', 'Salle de Réception Royale', 'Partenaire Hôte', 'Cadre d''exception pour vos mariages, banquets et galas prestigieux. Salons climatisés, acoustique feutrée et service d''honneur.', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80', 'https://wa.me/?text=Bonjour%20je%20souhaite%20des%20informations%20sur%20la%20salle%20Le%20Rocher%20des%20Ages', 'peach', '🏰', 'Partenaire Officiel', 198, 45, 1, 2),
('ad-3', 'default', 'Parfums & Parures', 'Maison Prestige Gala', 'Élégance Royale', 'Essences rares, coffrets d''exception et tenues d''apparat sur mesure créés pour illuminer vos grands rendez-vous de fête.', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80', 'https://wa.me/?text=Bonjour%20je%20souhaite%20d%C3%A9couvrir%20les%20parfums%20Prestige%20Gala', 'honey', '👑', 'Offre Privilège', 165, 39, 1, 3),
('ad-4', 'default', 'Orfèvrerie & Cadeaux', 'Atelier Céleste', 'Souvenirs d''Art', 'Bijoux symboliques en or et argent, gravures d''alliance et objets d''art créés pour perpétuer la mémoire de ce dîner de gala.', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80', 'https://wa.me/?text=Bonjour%20je%20souhaite%20consulter%20le%20catalogue%20d%27orf%C3%A8vrerie', 'blue', '💎', 'Collection 2026', 110, 22, 1, 4);
