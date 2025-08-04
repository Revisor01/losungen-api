# Gottesdienst-Content-Management-System (CMS)

## Vision
Ein vollständiges CMS für Pastoren zur Verwaltung aller Gottesdienste, Predigten und Kasualien. Integration in das bestehende Losungen-API System mit Kirchenjahr und Bibeltext-Suche.

## Kernfunktionen

### 1. Gottesdienst-Verwaltung
- **Reguläre Gottesdienste**: Verknüpfung mit Kirchenjahr und Perikopen
- **Kasualien**: Hochzeiten, Beerdigungen, Taufen, Konfirmationen
- **Besondere Gottesdienste**: Einschulung, Erntedank, etc.
- **Modularer Aufbau**: Jeder Gottesdienst besteht aus einzelnen Komponenten

### 2. Historische Übersicht
- **"Was habe ich 2031 zu 1. Advent gepredigt?"** → Zeigt alle Jahre
- **Wiederverwendung**: Alte Predigten/Gebete als Basis für neue
- **Entwicklung sichtbar**: Wie haben sich deine Predigten entwickelt?

### 3. Durchsuchbare Inhalte
- **Nach Bibeltext**: "Alle Gottesdienste mit Johannes 3,16"
- **Nach Thema/Tags**: #hoffnung #trauer #freude #taufe
- **Nach Typ**: Alle Beerdigungen, alle Hochzeiten
- **Volltext-Suche**: In allen Predigten und Gebeten

## Datenbank-Struktur

### Perikopen-Refactoring (zeitlos, einmalig)
```sql
CREATE TABLE perikopes (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) UNIQUE, -- "1. Advent", "Karfreitag"
  event_type VARCHAR(100), -- "sunday", "holiday", "season_start"
  liturgical_color VARCHAR(50),
  season VARCHAR(100), -- "Advent", "Passionszeit"
  perikope_I VARCHAR(255),   -- AT-Lesung
  perikope_II VARCHAR(255),  -- Epistel  
  perikope_III VARCHAR(255), -- Evangelium
  perikope_IV VARCHAR(255),  -- Weitere Texte
  perikope_V VARCHAR(255),
  perikope_VI VARCHAR(255),
  psalm VARCHAR(255),
  weekly_verse TEXT,
  weekly_verse_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Gottesdienst-Haupttabelle
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500), -- "1. Advent 2025", "Hochzeit Müller/Schmidt"
  service_type VARCHAR(100), -- "regular", "wedding", "funeral", "baptism", "special"
  date DATE NOT NULL,
  time TIME, -- Uhrzeit
  location VARCHAR(255) DEFAULT 'Hauptkirche',
  perikope_id INTEGER REFERENCES perikopes(id), -- NULL für Kasualien
  chosen_perikope VARCHAR(10), -- I, II, III, IV, V, VI
  congregation_size INTEGER, -- Geschätzte Teilnehmerzahl
  weather VARCHAR(100), -- Für Erinnerungen/Kontext
  notes TEXT, -- Allgemeine Notizen
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Gottesdienst-Komponenten (modular)
```sql
CREATE TABLE service_components (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL, -- Siehe Komponenten-Types
  title VARCHAR(255), -- "Predigt", "1. Lied", "Eingangsgebet"
  content TEXT, -- Text-Inhalt (für kurze Texte)
  file_path VARCHAR(500), -- Word/PDF-Dokument Pfad
  bible_reference VARCHAR(255), -- Falls Bibeltext
  hymn_number VARCHAR(20), -- EG-Nummer
  order_position INTEGER DEFAULT 0, -- Reihenfolge im Gottesdienst
  duration_minutes INTEGER, -- Geschätzte Dauer
  notes TEXT, -- Notizen zu dieser Komponente
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tags für Durchsuchbarkeit
```sql
CREATE TABLE service_tags (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  UNIQUE(service_id, tag)
);

CREATE INDEX idx_service_tags_tag ON service_tags(tag);
CREATE INDEX idx_service_tags_service ON service_tags(service_id);
```

### Datei-Uploads
```sql
CREATE TABLE service_files (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  component_id INTEGER REFERENCES service_components(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50), -- "word", "pdf", "image"
  file_size INTEGER,
  upload_date TIMESTAMP DEFAULT NOW()
);
```

## Komponenten-Types

### Liturgische Komponenten
- `opening` - Eingangswort/Begrüßung
- `opening_prayer` - Eingangsgebet
- `hymn` - Lied/Gesang
- `reading` - Schriftlesung
- `sermon` - Predigt
- `creed` - Glaubensbekenntnis
- `intercession` - Fürbitten
- `communion` - Abendmahl
- `offering` - Kollekte/Opfer
- `blessing` - Segen
- `announcements` - Abkündigungen

### Kasualien-spezifisch
- `wedding_vows` - Trauversprechen
- `baptism_formula` - Taufformel
- `funeral_eulogy` - Trauerrede
- `confirmation_blessing` - Konfirmationssegen

## UI-Flows

### Flow 1: Neuer Gottesdienst aus Kirchenjahr
```
Kirchenjahr → "1. Advent" → [Neuen Gottesdienst anlegen]
↓
Modal: Gottesdienst erstellen
├─ Grunddaten: Datum, Uhrzeit, Ort
├─ Perikope wählen: I, II, III, IV, V, VI oder "Eigene Texte"
├─ Gottesdienst-Typ: Regular/Special
└─ [Erstellen] → Öffnet Gottesdienst-Editor
```

### Flow 2: Gottesdienst aus Bibeltext-Suche
```
Bibeltext-Suche → Johannes 3,16 → [Gottesdienst planen]
↓
Modal: Anlass wählen
├─ Anlass: Dropdown (Sonntage, Kasualien, Besondere)
├─ Datum wählen
├─ Text automatisch als "reading" hinzugefügt
└─ [Erstellen] → Öffnet Gottesdienst-Editor
```

### Flow 3: Gottesdienst-Editor
```
┌─ Gottesdienst Editor ─────────────────────────────────┐
│ 📋 Grunddaten                                         │
│   • Titel: "1. Advent 2025"                          │
│   • Datum: 01.12.2025, 10:00                         │
│   • Ort: Hauptkirche                                  │
│   • Teilnehmer: ~120                                  │
│                                                       │
│ 📖 Texte & Perikopen                                 │
│   • Perikope III: Markus 11,1-10                     │
│   • Zusätzlich: Johannes 3,16                        │
│                                                       │
│ 🎼 Gottesdienst-Ablauf                               │
│   1. Eingangswort [Text eingeben] [Word hochladen]   │
│   2. Lied: EG 1 "Macht hoch die Tür"                 │
│   3. Eingangsgebet [Vorlage wählen] [Neu schreiben]  │
│   4. Schriftlesung: Markus 11,1-10                   │
│   5. Lied: EG 11 "Wie soll ich dich empfangen"      │
│   6. Predigt [Word hochladen] [Notizen]              │
│   7. Glaubensbekenntnis                               │
│   8. Fürbitten [Vorlage] [Eigene]                    │
│   9. Vaterunser                                       │
│   10. Segen                                           │
│                                                       │
│ 🏷️ Tags: #advent #hoffnung #erwartung                │
│                                                       │
│ 💾 [Speichern] [Vorschau] [Drucken]                  │
└───────────────────────────────────────────────────────┘
```

## Such- und Filter-Features

### Intelligente Suche
- **Volltext**: "hoffnung" → Alle Gottesdienste mit dem Wort
- **Bibeltext**: "Johannes 3,16" → Alle Verwendungen
- **Datum**: "Dezember 2024" → Alle Gottesdienste im Zeitraum
- **Typ**: "Beerdigung" → Alle Beerdigungen
- **Tags**: "#taufe" → Alle Tauf-Gottesdienste

### Filter-Kombinationen
- "Alle Advents-Gottesdienste der letzten 5 Jahre"
- "Beerdigungen mit Psalm 23"
- "Hochzeiten im Sommer 2024"
- "Gottesdienste mit EG 1"

## Kalender-Integration

### Monatsansicht
```
November 2025
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │  5  │  6  │  7  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  8  │ 🕊️  │ 10  │ 11  │ 12  │ 13  │ 14  │
│     │Taufe│     │     │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │ 21  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 22  │⛪️  │ 24  │ 25  │ 26  │ 27  │ 28  │
│     │Ewig.│     │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

### Gottesdienst-Historie
```
📅 1. Advent - Historische Übersicht
┌────────────────────────────────────────────────┐
│ 2025: "Hoffnung in dunkler Zeit"               │
│   📝 Predigt: Jesaja 64,1-4                   │
│   🎵 Lieder: EG 1, EG 11, EG 13               │
│   👥 ~130 Teilnehmer                          │
│                                                │
│ 2022: "Warten auf den Herrn"                  │  
│   📝 Predigt: Markus 11,1-10                  │
│   🎵 Lieder: EG 1, EG 10, EG 14               │
│   👥 ~95 Teilnehmer (Corona)                  │
│                                                │
│ 2019: "Macht hoch die Tür"                    │
│   📝 Predigt: Römer 13,11-14                  │
│   🎵 Lieder: EG 1, EG 8, EG 11                │
│   👥 ~140 Teilnehmer                          │
└────────────────────────────────────────────────┘
```

## Export-Funktionen

### Predigtvorbereitung (PDF)
- Alle Texte des Gottesdienstes
- Deine bisherigen Predigten zu den Texten
- Liturgie-Vorschläge
- Lied-Vorschläge basierend auf Kirchenjahr

### Statistiken
- "Deine Top 10 Bibelstellen 2024"
- "Meist verwendete Lieder"
- "Entwicklung deiner Predigten über die Jahre"

## Migration Plan

### Phase 1: Datenbank & Grundfunktionen
1. Perikopen-Tabelle erstellen und migrieren
2. Service-Tabellen erstellen
3. Basis-CRUD APIs implementieren

### Phase 2: UI Integration
1. "Neuen Gottesdienst" Modal im Kirchenjahr
2. Basis Gottesdienst-Editor
3. File-Upload für Word-Dokumente

### Phase 3: Such- & Filter-Features
1. Volltext-Suche implementieren
2. Tag-System ausbauen
3. Erweiterte Filter-Optionen

### Phase 4: Kalender & Historie
1. Kalender-Ansicht mit Gottesdiensten
2. Historische Übersicht pro Feiertag
3. Statistiken und Reports

## Technische Implementierung

### Backend (PHP)
- Neue API-Endpoints für CRUD-Operationen
- File-Upload Handler für Word/PDF
- Volltext-Suche mit PostgreSQL
- Migration-Scripts für Perikopen-Überführung

### Frontend (React)
- Gottesdienst-Editor Komponente
- Kalender-Ansicht (FullCalendar.js?)
- File-Upload Komponente
- Erweiterte Such-UI

### File-Storage
- `/uploads/services/{service_id}/{component_id}/` Struktur
- Word/PDF-Dokumente
- Thumbnail-Generierung für PDFs

## Warum dieses System?

✅ **Bestehende Integration**: Kirchenjahr + Bibelsuche bereits vorhanden  
✅ **Skalierbar**: Von einzelnen Predigten bis Jahresplanung  
✅ **Durchsuchbar**: Finde alles wieder  
✅ **Praktisch**: Direkt aus der Arbeit heraus nutzbar  
✅ **Zukunftssicher**: Alle Daten strukturiert und exportierbar  

---

**Das ist ein komplettes Gottesdienst-Ökosystem für Pastoren!** 🚀