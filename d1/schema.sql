-- ============================================================
-- COMPAGNON DE CÉRÉMONIE - Schéma Cloudflare D1 (SQLite)
-- Version: 1.0.0
-- ============================================================

-- 1. Configuration & Événement
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_type TEXT DEFAULT 'mariage', -- 'mariage', 'gala', 'ceremonie', 'conference'
    subtitle TEXT,
    event_date TEXT,
    venue TEXT,
    admin_pin TEXT DEFAULT '7777',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Invités enregistrés (Onboarding express en 15 secondes)
CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    table_number TEXT DEFAULT '1',
    avatar_emoji TEXT DEFAULT '🎉',
    photo_url TEXT,
    role TEXT DEFAULT 'invite', -- 'invite', 'hote', 'vip', 'temoin', 'animateur'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Messages du Chat en Direct
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    guest_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    table_number TEXT DEFAULT '1',
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'announcement', 'photo'
    media_url TEXT,
    reactions_json TEXT DEFAULT '{"heart":0,"applause":0,"fire":0,"pray":0}',
    is_pinned INTEGER DEFAULT 0,
    is_moderated INTEGER DEFAULT 1, -- 1 = visible, 0 = masqué
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Questions des Jeux en Ligne (Quiz Interactif)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
    explanation TEXT,
    duration_seconds INTEGER DEFAULT 20,
    points INTEGER DEFAULT 100,
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'ended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Réponses des Invités au Quiz
CREATE TABLE IF NOT EXISTS quiz_answers (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    guest_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    table_number TEXT DEFAULT '1',
    selected_option TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
    is_correct INTEGER NOT NULL,
    response_time_ms INTEGER DEFAULT 0,
    points_awarded INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, guest_id)
);

-- 6. Sondages en Direct (Live Polls)
CREATE TABLE IF NOT EXISTS live_polls (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    question TEXT NOT NULL,
    options_json TEXT NOT NULL, -- '["Option 1", "Option 2", "Option 3"]'
    status TEXT DEFAULT 'active', -- 'active', 'closed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Votes aux Sondages
CREATE TABLE IF NOT EXISTS poll_votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL,
    guest_id TEXT NOT NULL,
    table_number TEXT DEFAULT '1',
    option_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, guest_id)
);

-- 8. Rubrique Réseautage & Mise en Relation (Networking)
CREATE TABLE IF NOT EXISTS networking_profiles (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    guest_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    profession TEXT,
    company TEXT,
    bio TEXT,
    interests_tags TEXT, -- 'Tech, Business, Musique, Foi, Éducation'
    looking_for TEXT,   -- 'Partenariats, Conseils, Nouveaux amis'
    offering TEXT,      -- 'Expertise Web, Mentorat, Investissement'
    whatsapp TEXT,
    linkedin TEXT,
    table_number TEXT DEFAULT '1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Demandes de contact / Icebreakers (Réseautage)
CREATE TABLE IF NOT EXISTS networking_greetings (
    id TEXT PRIMARY KEY,
    from_guest_id TEXT NOT NULL,
    from_name TEXT NOT NULL,
    to_guest_id TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Rubrique Demandes de Prière & Vœux / Bénédictions
CREATE TABLE IF NOT EXISTS prayer_requests (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    guest_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    table_number TEXT,
    is_anonymous INTEGER DEFAULT 0,
    category TEXT DEFAULT 'priere', -- 'priere', 'benediction', 'grace'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    prayer_count INTEGER DEFAULT 0,
    is_moderated INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Soutiens de Prière ("Amen / Je prie avec vous")
CREATE TABLE IF NOT EXISTS prayer_supports (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    guest_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(request_id, guest_id)
);

-- 12. Souscriptions aux Notifications Web Push (VAPID)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    guest_id TEXT,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Historique & Journal des Notifications Push envoyées
CREATE TABLE IF NOT EXISTS push_notifications_log (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/',
    tag TEXT DEFAULT 'gala-alert',
    icon TEXT DEFAULT '/icon.svg',
    badge TEXT DEFAULT '/favicon.svg',
    sent_by TEXT DEFAULT 'admin',
    target_type TEXT DEFAULT 'all', -- 'all', 'guest', 'table'
    target_id TEXT,
    recipient_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Messages privés 1-à-1 (Réseautage)
CREATE TABLE IF NOT EXISTS private_messages (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL DEFAULT 'default',
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT,
    message TEXT,
    media_url TEXT,
    message_type TEXT DEFAULT 'text',
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour accélérer les requêtes de direct
CREATE INDEX IF NOT EXISTS idx_chat_event ON chat_messages(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_active ON quiz_questions(event_id, status);
CREATE INDEX IF NOT EXISTS idx_prayers_event ON prayer_requests(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_networking_event ON networking_profiles(event_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_event ON push_subscriptions(event_id, guest_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_event ON push_notifications_log(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_msgs_users ON private_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_msgs_event ON private_messages(event_id, created_at DESC);

