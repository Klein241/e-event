-- Migration 0006: Table des messages privés Réseautage 1-à-1 avec pièces jointes et suppression
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

CREATE INDEX IF NOT EXISTS idx_private_msgs_users ON private_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_msgs_event ON private_messages(event_id, created_at DESC);
