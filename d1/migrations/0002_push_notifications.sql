-- Migration: Support des notifications Web Push (VAPID)
-- D1 Database Migration 0002

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
    target_type TEXT DEFAULT 'all',
    target_id TEXT,
    recipient_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subs_event ON push_subscriptions(event_id, guest_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_event ON push_notifications_log(event_id, created_at DESC);
