-- PostgreSQL Schema für Gottesdienst-Management
-- Erstellt: 2025-08-16

-- Perikopen-Tabelle (Kirchenjahr-Ereignisse)
CREATE TABLE IF NOT EXISTS perikopes (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'sunday', 'holiday', 'season_start'
    liturgical_color VARCHAR(50),
    season VARCHAR(50),
    perikope_I TEXT,
    perikope_II TEXT,
    perikope_III TEXT,
    perikope_IV TEXT,
    perikope_V TEXT,
    perikope_VI TEXT,
    psalm TEXT,
    weekly_verse TEXT,
    weekly_verse_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gottesdienste Tabelle
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- 'regular', 'wedding', 'funeral', 'baptism', 'confirmation', 'special'
    date DATE NOT NULL,
    time TIME DEFAULT '10:00:00',
    location VARCHAR(255) DEFAULT 'Hauptkirche',
    perikope_id INTEGER REFERENCES perikopes(id) ON DELETE SET NULL,
    chosen_perikope VARCHAR(10), -- 'I', 'II', 'III', 'IV', 'V', 'VI'
    congregation_size INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gottesdienst-Komponenten Tabelle
CREATE TABLE IF NOT EXISTS service_components (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    bible_reference VARCHAR(255),
    bible_translation VARCHAR(20),
    bible_text TEXT, -- JSON storage für Bible verses
    hymn_number VARCHAR(50),
    order_position INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags für Gottesdienste
CREATE TABLE IF NOT EXISTS service_tags (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, tag)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_services_date ON services(date);
CREATE INDEX IF NOT EXISTS idx_services_perikope ON services(perikope_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_components_service ON service_components(service_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON service_components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_order ON service_components(service_id, order_position);
CREATE INDEX IF NOT EXISTS idx_tags_service ON service_tags(service_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON service_tags(tag);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_services_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_perikopes_updated_at BEFORE UPDATE ON perikopes
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

CREATE TRIGGER update_service_components_updated_at BEFORE UPDATE ON service_components
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

-- Church Events Tabelle
CREATE TABLE IF NOT EXISTS church_events (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    weekday VARCHAR(20),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50),
    liturgical_color VARCHAR(50),
    season VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_date, event_name)
);

CREATE INDEX IF NOT EXISTS idx_church_events_date ON church_events(event_date);
CREATE INDEX IF NOT EXISTS idx_church_events_type ON church_events(event_type);

CREATE TRIGGER update_church_events_updated_at BEFORE UPDATE ON church_events
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

-- Bible Abbreviations Tabelle
CREATE TABLE IF NOT EXISTS bible_abbreviations (
    id SERIAL PRIMARY KEY,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    german_name VARCHAR(100) NOT NULL,
    english_name VARCHAR(100),
    testament VARCHAR(2) NOT NULL, -- 'AT' oder 'NT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Losungen Tabelle
CREATE TABLE IF NOT EXISTS losungen (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    weekday VARCHAR(20),
    holiday VARCHAR(100),
    ot_text TEXT NOT NULL,
    ot_reference VARCHAR(100) NOT NULL,
    nt_text TEXT NOT NULL,
    nt_reference VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_losungen_date ON losungen(date);

CREATE TRIGGER update_losungen_updated_at BEFORE UPDATE ON losungen
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

-- Kommentare
COMMENT ON TABLE perikopes IS 'Kirchenjahr-Perikopen und liturgische Texte';
COMMENT ON TABLE services IS 'Gottesdienste mit Datum, Zeit und Ort';
COMMENT ON TABLE service_components IS 'Einzelne Komponenten eines Gottesdienstes';
COMMENT ON TABLE service_tags IS 'Tags/Kategorien für Gottesdienste';
COMMENT ON TABLE church_events IS 'Kirchenjahr-Ereignisse und Feiertage';
COMMENT ON TABLE bible_abbreviations IS 'Bibelbuch-Abkürzungen für Referenz-Parsing';
COMMENT ON TABLE losungen IS 'Herrnhuter Losungen Tagesinhalte';