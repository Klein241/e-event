-- ============================================================
-- MIGRATION 0010 : TRACKING RÉEL DES CLICS SUR LE LIEN D'INVITATION (PAR IP)
-- ============================================================

CREATE TABLE IF NOT EXISTS invitation_link_clicks (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    referer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clicks_ip ON invitation_link_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON invitation_link_clicks(created_at);
