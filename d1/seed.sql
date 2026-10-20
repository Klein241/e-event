-- ============================================================
-- Données Initiales de Démonstration (Seed Data)
-- ============================================================

INSERT OR REPLACE INTO events (id, name, event_type, subtitle, event_date, venue, admin_pin, is_active)
VALUES (
    'default',
    'Soirée de Célébration & Gala Royal',
    'gala',
    'Une soirée d''amour, d''excellence et de communion fraternelle',
    '2026-10-18',
    'Le Grand Salon des Étoiles',
    '7777',
    1
);

-- Invités de démonstration
INSERT OR REPLACE INTO guests (id, event_id, name, table_number, avatar_emoji, role) VALUES
('guest-1', 'default', 'Pasteur David M.', 'Table d''Honneur', '👑', 'hote'),
('guest-2', 'default', 'Sarah & Kevin (Mariés)', 'Table 1 - Royale', '💍', 'vip'),
('guest-3', 'default', 'Dr. Emmanuel Kouadio', 'Table 3', '💼', 'invite'),
('guest-4', 'default', 'Grâce N''Guessan', 'Table 4', '🌟', 'invite'),
('guest-5', 'default', 'Maître de Cérémonie Alex', 'Régie', '🎤', 'animateur');

-- Messages du chat en direct
INSERT OR REPLACE INTO chat_messages (id, event_id, guest_id, guest_name, table_number, message, message_type, is_pinned, is_moderated) VALUES
('msg-1', 'default', 'guest-5', 'MC Alex', 'Régie', 'Bienvenue à tous ! Flashez le QR code sur votre table et participez en direct ! 🥂', 'announcement', 1, 1),
('msg-2', 'default', 'guest-3', 'Dr. Emmanuel', 'Table 3', 'Félicitations aux hôtes, la salle est tout simplement magnifique ! ✨', 'text', 0, 1),
('msg-3', 'default', 'guest-4', 'Grâce N.', 'Table 4', 'La Table 4 est prête pour le grand Quiz ! Qui relève le défi ? 🔥', 'text', 0, 1);

-- Questions de Quiz en direct
INSERT OR REPLACE INTO quiz_questions (id, event_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, duration_seconds, points, status) VALUES
('quiz-1', 'default', 'Où les organisateurs se sont-ils rencontrés pour la toute première fois ?', 'À l''université', 'Lors d''une conférence à Abidjan', 'À la chorale de l''église', 'Dans un aéroport', 'C', 'C''était en 2018 lors des répétitions de la chorale !', 20, 100, 'active'),
('quiz-2', 'default', 'Quelle est la citation ou devise favorite des hôtes ?', 'L''impossible est le commencement de Dieu', 'Toujours plus haut', 'Carpe Diem', 'Le travail paie toujours', 'A', 'Leur verset et devise phare !', 20, 100, 'pending');

-- Sondage en direct
INSERT OR REPLACE INTO live_polls (id, event_id, question, options_json, status) VALUES
('poll-1', 'default', 'Quelle table mettra le plus d''ambiance sur la piste ce soir ?', '["Table 1 - Les Mariés / Hôtes", "Table 2 & 3 - Les Amis d''Enfance", "Table 4 & 5 - La Team Dynamique", "Table d''Honneur"]', 'active');

-- Profils de Réseautage
INSERT OR REPLACE INTO networking_profiles (id, event_id, guest_id, full_name, profession, company, bio, interests_tags, looking_for, offering, whatsapp, linkedin, table_number) VALUES
('net-1', 'default', 'guest-3', 'Dr. Emmanuel Kouadio', 'Directeur Médical & Consultant', 'HealthTech Africa', 'Passionné de santé publique, d''innovation et d''entrepreneuriat à impact.', 'Santé, Tech, Leadership, Investissement', 'Partenariats avec des développeurs et investisseurs', 'Conseil stratégique et mentorat', '+225 07 00 00 01', 'linkedin.com/in/ekouadio', 'Table 3'),
('net-2', 'default', 'guest-4', 'Grâce N''Guessan', 'Architecte d''Intérieur & Event Designer', 'Grace Studio', 'Je transforme les espaces de fête et les intérieurs d''exception.', 'Design, Événementiel, Art, Foi', 'Collaborations avec des agences et clients exigeants', 'Conception scénographique 3D', '+225 05 00 00 02', '', 'Table 4');

-- Requêtes de Prières & Bénédictions
INSERT OR REPLACE INTO prayer_requests (id, event_id, guest_id, author_name, table_number, is_anonymous, category, title, content, prayer_count, is_moderated) VALUES
('pray-1', 'default', 'guest-2', 'Sarah & Kevin', 'Table 1 - Royale', 0, 'benediction', 'Action de grâce pour cette union sacrée', 'Que le Seigneur bénisse chaque foyer représenté ici et fasse déborder sa paix dans vos vies.', 14, 1),
('pray-2', 'default', 'guest-1', 'Frère anonyme', 'Table 6', 1, 'priere', 'Succès pour le projet d''orphelinat', 'Prions pour que les portes s''ouvrent pour le financement du centre d''accueil des enfants.', 8, 1);
