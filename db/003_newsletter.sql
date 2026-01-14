-- Migration 003: Newsletter-System
-- Datum: 2026-01-14

-- UUID Extension (falls noch nicht vorhanden)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper Function für updated_at (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Newsletter-Abonnenten
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),

    -- Double Opt-In Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
    confirmation_token UUID DEFAULT uuid_generate_v4(),
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,

    -- Unsubscribe Token (separater Token für Abmeldung)
    unsubscribe_token UUID DEFAULT uuid_generate_v4(),

    -- Tracking
    ip_address VARCHAR(45),
    user_agent TEXT,
    source VARCHAR(100) DEFAULT 'website',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Abonnenten-Präferenzen
CREATE TABLE IF NOT EXISTS newsletter_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,

    -- Inhaltstypen
    include_tageslosung BOOLEAN DEFAULT TRUE,
    include_sonntagstexte BOOLEAN DEFAULT FALSE,

    -- Sonntagstext-Optionen (falls include_sonntagstexte = true)
    include_predigttext BOOLEAN DEFAULT TRUE,
    include_lesungen BOOLEAN DEFAULT TRUE,
    include_psalm BOOLEAN DEFAULT TRUE,
    include_wochenspruch BOOLEAN DEFAULT TRUE,

    -- Übersetzungen (JSON-Array)
    translations JSONB DEFAULT '["LUT"]'::jsonb,

    -- Versandtage (0=So, 1=Mo, ..., 6=Sa)
    -- Für Tageslosung: z.B. [1,2,3,4,5,6] = Mo-Sa
    -- Für Sonntagsvorschau: z.B. [4,6] = Do, Sa
    delivery_days_tageslosung JSONB DEFAULT '[1,2,3,4,5,6]'::jsonb,
    delivery_days_sonntag JSONB DEFAULT '[4,6]'::jsonb,

    -- Versandzeit (UTC Stunde, 0-23)
    delivery_hour INTEGER DEFAULT 6 CHECK (delivery_hour >= 0 AND delivery_hour <= 23),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(subscriber_id)
);

-- 3. Versand-Log
CREATE TABLE IF NOT EXISTS newsletter_send_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,

    -- Email-Details
    email_type VARCHAR(50) NOT NULL CHECK (email_type IN ('tageslosung', 'sonntagsvorschau', 'confirmation', 'welcome', 'unsubscribe')),
    subject VARCHAR(500),
    content_date DATE,

    -- Versand-Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- Tracking (optional für spätere Erweiterung)
    message_id VARCHAR(255),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmation_token ON newsletter_subscribers(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_preferences_subscriber ON newsletter_preferences(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_send_log_subscriber ON newsletter_send_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_send_log_date ON newsletter_send_log(content_date);
CREATE INDEX IF NOT EXISTS idx_send_log_status ON newsletter_send_log(status);
CREATE INDEX IF NOT EXISTS idx_send_log_type_date ON newsletter_send_log(email_type, content_date);

-- Trigger für updated_at
DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at
    BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletter_preferences_updated_at ON newsletter_preferences;
CREATE TRIGGER update_newsletter_preferences_updated_at
    BEFORE UPDATE ON newsletter_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View für aktive Abonnenten mit Präferenzen
CREATE OR REPLACE VIEW newsletter_active_subscribers AS
SELECT
    s.id,
    s.email,
    s.name,
    s.confirmed_at,
    p.include_tageslosung,
    p.include_sonntagstexte,
    p.include_predigttext,
    p.include_lesungen,
    p.include_psalm,
    p.include_wochenspruch,
    p.translations,
    p.delivery_days_tageslosung,
    p.delivery_days_sonntag,
    p.delivery_hour
FROM newsletter_subscribers s
JOIN newsletter_preferences p ON s.id = p.subscriber_id
WHERE s.status = 'confirmed';

-- View für Versandstatistiken
CREATE OR REPLACE VIEW newsletter_stats AS
SELECT
    DATE(created_at) as date,
    email_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'bounced') as bounced
FROM newsletter_send_log
GROUP BY DATE(created_at), email_type
ORDER BY date DESC, email_type;
