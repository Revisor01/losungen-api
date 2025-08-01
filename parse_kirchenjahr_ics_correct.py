#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
from datetime import datetime

def clean_text(text):
    """Bereinigt Text von Zeilenumbrüchen und doppelten Leerzeichen"""
    if not text:
        return None
    
    # Entferne \n und \r, normalisiere Leerzeichen
    text = text.replace('\\n', ' ').replace('\\r', '').replace('\n', ' ').replace('\r', '')
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Entferne Tab-Zeichen
    text = text.replace('\t', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Entferne Klammern am Ende wenn sie nur Referenz enthalten
    text = re.sub(r'\s*\([^)]+\)\s*$', '', text).strip()
    
    return text if text else None

def extract_bible_reference(text):
    """Extrahiert Bibelreferenz aus Text"""
    if not text:
        return None
    
    # Suche nach Referenz in Klammern am Ende
    match = re.search(r'\(([^)]+)\)\s*$', text)
    if match:
        ref = match.group(1).strip()
        # Bereinige typische Formatierungsfehler
        ref = re.sub(r'\s*,\s*', ',', ref)  # "13, 1-3" -> "13,1-3"
        ref = re.sub(r'\s*–\s*', '–', ref)  # Geschützte Bindestriche
        ref = re.sub(r'\s*-\s*', '-', ref)  # Normale Bindestriche
        return ref
    
    return None

def parse_perikopen(perikopen_text):
    """Parst Perikopen-Abschnitt"""
    if not perikopen_text:
        return {}
    
    perikopen = {}
    # Suche nach "I: ...", "II: ...", etc.
    pattern = r'([IVX]+):\s*([^\n]+?)(?=\s*[IVX]+:|$)'
    matches = re.findall(pattern, perikopen_text, re.MULTILINE | re.DOTALL)
    
    for reihe, text in matches:
        cleaned = clean_text(text)
        if cleaned:
            perikopen[reihe] = cleaned
    
    return perikopen

def parse_hymns(hymn_text):
    """Parst Lieder-Text und trennt sie korrekt"""
    if not hymn_text:
        return None, None
    
    # Teile bei " / " auf
    parts = [part.strip() for part in hymn_text.split(' / ')]
    
    hymn1 = clean_text(parts[0]) if len(parts) > 0 else None
    hymn2 = clean_text(parts[1]) if len(parts) > 1 else None
    
    return hymn1, hymn2

def parse_ics_event(event_text):
    """Parst ein einzelnes VEVENT"""
    
    # Extrahiere Grunddaten
    uid_match = re.search(r'UID:([^\n]+)', event_text)
    summary_match = re.search(r'SUMMARY:([^\n]+)', event_text)
    dtstart_match = re.search(r'DTSTART;VALUE=DATE:(\d{8})', event_text)
    url_match = re.search(r'URL;VALUE=URI:([^\n]+)', event_text)
    description_match = re.search(r'DESCRIPTION:(.*?)(?=\n[A-Z]+:|$)', event_text, re.DOTALL)
    
    if not all([uid_match, summary_match, dtstart_match, description_match]):
        return None
    
    # Parse und bereinige Description (ICS kann mit Tabs umbrechen)
    description = description_match.group(1)
    # Entferne ICS-Fortsetzungszeilen (beginnen mit Tab oder Leerzeichen)
    description = re.sub(r'\n\s+', '', description)
    description = description.strip()
    
    # Parse Datum
    date_str = dtstart_match.group(1)
    event_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
    
    # Parse Description
    description = description_match.group(1).strip()
    
    # Extrahiere alle Felder aus der Description
    fields = {}
    
    # Liturgische Farbe
    color_match = re.search(r'liturgische Farbe:\s*([^\n]+)', description)
    if color_match:
        fields['liturgical_color'] = clean_text(color_match.group(1))
    
    # Festzeit/Season
    season_match = re.search(r'Festzeit:\s*([^\n]+)', description)
    if season_match:
        fields['season'] = clean_text(season_match.group(1))
    
    # Wochenspruch
    wochenspruch_match = re.search(r'Wochenspruch:\s*([^\\n]+(?:\\n\s*[^\\n]+)*)', description)
    if wochenspruch_match:
        full_verse = wochenspruch_match.group(1)
        fields['weekly_verse'] = clean_text(full_verse)
        fields['weekly_verse_reference'] = extract_bible_reference(full_verse)
    
    # Psalm
    psalm_match = re.search(r'(?:Wochenpsalm|Eingangspsalm):\s*([^\n\\]+)', description)
    if psalm_match:
        fields['psalm'] = clean_text(psalm_match.group(1))
    
    # Lesungen
    at_match = re.search(r'AT-Lesung:\s*([^\n\\]+)', description)
    if at_match:
        fields['old_testament_reading'] = clean_text(at_match.group(1))
    
    epistel_match = re.search(r'Epistel:\s*([^\n\\]+)', description)
    if epistel_match:
        fields['epistle'] = clean_text(epistel_match.group(1))
    
    evangelium_match = re.search(r'Evangelium:\s*([^\n\\]+)', description)
    if evangelium_match:
        fields['gospel'] = clean_text(evangelium_match.group(1))
    
    predigttext_match = re.search(r'Predigttext:\s*([^\n\\]+)', description)
    if predigttext_match:
        fields['sermon_text'] = clean_text(predigttext_match.group(1))
    
    # Lieder
    lied_match = re.search(r'Wochenlied:\s*([^\\n]+(?:\\n\s*[^\\n]+)*)', description)
    if lied_match:
        hymn_text = lied_match.group(1)
        hymn1, hymn2 = parse_hymns(hymn_text)
        if hymn1:
            fields['hymn1'] = hymn1
        if hymn2:
            fields['hymn2'] = hymn2
        # Kombiniertes Feld für Rückwärtskompatibilität
        if hymn1 and hymn2:
            fields['hymn'] = f"{hymn1} / {hymn2}"
        elif hymn1:
            fields['hymn'] = hymn1
    
    # Perikopen (komplexer)
    perikopen_start = description.find('I:')
    if perikopen_start != -1:
        perikopen_text = description[perikopen_start:]
        fields['perikopen'] = parse_perikopen(perikopen_text)
    
    # Event zusammenbauen
    event = {
        'uid': uid_match.group(1),
        'summary': clean_text(summary_match.group(1)),
        'event_date': event_date,
        'url': url_match.group(1) if url_match else None,
        **fields
    }
    
    return event

def parse_kirchenjahr_ics(filename):
    """Hauptfunktion zum Parsen der ICS-Datei"""
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Teile in Events auf
    events = []
    event_blocks = re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', content, re.DOTALL)
    
    for block in event_blocks:
        event = parse_ics_event(block)
        if event:
            events.append(event)
    
    return events

def generate_sql_updates(events):
    """Generiert SQL UPDATE-Statements"""
    
    sql_statements = []
    sql_statements.append("-- Kirchenjahr ICS Data Updates")
    sql_statements.append("-- Generiert: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    sql_statements.append("")
    
    for event in events:
        uid = event['uid']
        updates = []
        
        # Alle möglichen Felder prüfen
        field_mapping = {
            'liturgical_color': 'liturgical_color',
            'season': 'season', 
            'weekly_verse': 'weekly_verse',
            'weekly_verse_reference': 'weekly_verse_reference',
            'psalm': 'psalm',
            'old_testament_reading': 'old_testament_reading',
            'epistle': 'epistle',
            'gospel': 'gospel',
            'sermon_text': 'sermon_text',
            'hymn': 'hymn',
            'hymn1': 'hymn1',
            'hymn2': 'hymn2'
        }
        
        for event_key, db_field in field_mapping.items():
            if event_key in event and event[event_key]:
                value = event[event_key].replace("'", "''")  # SQL escape
                updates.append(f"{db_field} = '{value}'")
        
        # Perikopen als JSON
        if 'perikopen' in event and event['perikopen']:
            perikopen_json = json.dumps(event['perikopen'], ensure_ascii=False).replace("'", "''")
            updates.append(f"perikopen = '{perikopen_json}'")
        
        if updates:
            sql = f"UPDATE church_events SET {', '.join(updates)} WHERE uid = '{uid}';"
            sql_statements.append(sql)
    
    return sql_statements

if __name__ == "__main__":
    print("Parsing kirchenjahr-evangelisch-2024-2025.ics...")
    
    events = parse_kirchenjahr_ics('kirchenjahr-evangelisch-2024-2025.ics')
    print(f"Parsed {len(events)} events")
    
    # Generiere SQL
    sql_statements = generate_sql_updates(events)
    
    # Schreibe SQL-Datei
    with open('update_kirchenjahr_data.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print("SQL file generated: update_kirchenjahr_data.sql")
    
    # Zeige ein paar Beispiele
    print("\nBeispiel-Events:")
    for i, event in enumerate(events[:3]):
        print(f"\n{i+1}. {event['summary']} ({event['event_date']})")
        if 'weekly_verse' in event:
            print(f"   Wochenspruch: {event['weekly_verse']}")
            if 'weekly_verse_reference' in event:
                print(f"   Referenz: {event['weekly_verse_reference']}")
        if 'hymn1' in event:
            print(f"   Lied 1: {event['hymn1']}")
        if 'hymn2' in event:
            print(f"   Lied 2: {event['hymn2']}")