#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
from datetime import datetime

def extract_field(description, field_name):
    """Extrahiert ein Feld aus der Description"""
    pattern = f'{field_name}: ([^\\n]+?)(?=\\n|$)'
    match = re.search(pattern, description)
    return match.group(1).strip() if match else None

def extract_bible_reference(text):
    """Extrahiert Bibelreferenz aus Text"""
    if not text:
        return None, None
    
    # Suche nach Referenz in Klammern am Ende
    match = re.search(r'\(([^)]+)\)\s*$', text)
    if match:
        ref = match.group(1).strip()
        text_only = re.sub(r'\s*\([^)]+\)\s*$', '', text).strip()
        return text_only, ref
    
    return text, None

def parse_perikopen(description):
    """Parst Perikopen-Abschnitt"""
    perikopen = {}
    
    # Suche nach dem Perikopen-Abschnitt
    perikopen_start = description.find('I:')
    if perikopen_start == -1:
        return {}
    
    perikopen_text = description[perikopen_start:]
    
    # Extrahiere alle Reihen
    pattern = r'([IVX]+):\s*([^\n]+?)(?=\s*[IVX]+:|$)'
    matches = re.findall(pattern, perikopen_text)
    
    for reihe, text in matches:
        cleaned = text.strip()
        if cleaned:
            perikopen[reihe] = cleaned
    
    return perikopen

def parse_hymns(hymn_text):
    """Parst Lieder-Text"""
    if not hymn_text:
        return None, None
    
    # Teile bei " / " auf
    parts = [part.strip() for part in hymn_text.split(' / ')]
    
    hymn1 = parts[0] if len(parts) > 0 and parts[0] else None
    hymn2 = parts[1] if len(parts) > 1 and parts[1] else None
    
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
    
    # Parse Datum
    date_str = dtstart_match.group(1)
    event_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
    
    # Parse Description (entferne ICS-Zeilenumbrüche)
    description = description_match.group(1)
    description = re.sub(r'\n\s+', '', description)  # ICS-Fortsetzungszeilen
    description = description.strip()
    
    # Extrahiere alle Felder
    event = {
        'uid': uid_match.group(1),
        'summary': summary_match.group(1),
        'event_date': event_date,
        'url': url_match.group(1) if url_match else None
    }
    
    # Liturgische Farbe
    liturgical_color = extract_field(description, 'liturgische Farbe')
    if liturgical_color:
        event['liturgical_color'] = liturgical_color
    
    # Festzeit/Season
    season = extract_field(description, 'Festzeit')
    if season:
        event['season'] = season
    
    # Wochenspruch
    wochenspruch = extract_field(description, 'Wochenspruch')
    if wochenspruch:
        text, ref = extract_bible_reference(wochenspruch)
        event['weekly_verse'] = text
        if ref:
            event['weekly_verse_reference'] = ref
    
    # Psalm
    psalm = extract_field(description, 'Wochenpsalm') or extract_field(description, 'Eingangspsalm')
    if psalm:
        event['psalm'] = psalm
    
    # Lesungen
    at_reading = extract_field(description, 'AT-Lesung')
    if at_reading:
        event['old_testament_reading'] = at_reading
    
    epistel = extract_field(description, 'Epistel')
    if epistel:
        event['epistle'] = epistel
    
    evangelium = extract_field(description, 'Evangelium')
    if evangelium:
        event['gospel'] = evangelium
    
    predigttext = extract_field(description, 'Predigttext')
    if predigttext:
        event['sermon_text'] = predigttext
    
    # Lieder
    wochenlied = extract_field(description, 'Wochenlied')
    if wochenlied:
        hymn1, hymn2 = parse_hymns(wochenlied)
        if hymn1:
            event['hymn1'] = hymn1
        if hymn2:
            event['hymn2'] = hymn2
        # Kombiniertes Feld
        event['hymn'] = wochenlied
    
    # Perikopen
    perikopen = parse_perikopen(description)
    if perikopen:
        event['perikopen'] = perikopen
    
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
    sql_statements.append("-- Kirchenjahr ICS Data Updates - Korrekte Parsing")
    sql_statements.append("-- Generiert: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    sql_statements.append("")
    
    for event in events:
        uid = event['uid']
        updates = []
        
        # Alle Felder prüfen
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
                value = str(event[event_key]).replace("'", "''").replace('\\', '\\\\')  # SQL escape
                updates.append(f"{db_field} = '{value}'")
        
        # Perikopen als JSON
        if 'perikopen' in event and event['perikopen']:
            perikopen_json = json.dumps(event['perikopen'], ensure_ascii=False).replace("'", "''")
            updates.append(f"perikopen = '{perikopen_json}'")
        
        if updates:
            sql = f"UPDATE church_events SET {', '.join(updates)} WHERE uid = '{uid}';"
            sql_statements.append(sql)
            sql_statements.append("")  # Leerzeile für Lesbarkeit
    
    return sql_statements

if __name__ == "__main__":
    print("Parsing kirchenjahr-evangelisch-2024-2025.ics...")
    
    events = parse_kirchenjahr_ics('kirchenjahr-evangelisch-2024-2025.ics')
    print(f"Parsed {len(events)} events")
    
    # Generiere SQL
    sql_statements = generate_sql_updates(events)
    
    # Schreibe SQL-Datei
    with open('update_kirchenjahr_correct.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print("SQL file generated: update_kirchenjahr_correct.sql")
    
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
        if 'perikopen' in event:
            print(f"   Perikopen: {len(event['perikopen'])} Reihen")