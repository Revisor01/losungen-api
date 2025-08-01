#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ICS to SQL Converter
Parst die kirchenjahr-evangelisch-2025-2026.ics Datei und generiert SQL INSERT Statements
"""

import re
import codecs
from datetime import datetime

def parse_ics_to_sql(filename, output_file='church_events.sql'):
    """Parse ICS file and generate SQL statements"""
    
    with codecs.open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create table SQL
    create_table_sql = """-- Church Events Table
CREATE TABLE IF NOT EXISTS church_events (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    event_date DATE NOT NULL,
    url TEXT,
    liturgical_color VARCHAR(50),
    season VARCHAR(100),
    weekly_verse TEXT,
    weekly_verse_reference VARCHAR(100),
    psalm VARCHAR(100),
    old_testament_reading VARCHAR(100),
    epistle VARCHAR(100), 
    gospel VARCHAR(100),
    sermon_text VARCHAR(100),
    hymn TEXT,
    perikopen JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing data
DELETE FROM church_events;

-- Insert events
"""
    
    events = []
    
    # Split into individual events
    event_blocks = re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', content, re.DOTALL)
    
    print("Found {} events in ICS file".format(len(event_blocks)))
    
    for i, block in enumerate(event_blocks):
        event = {}
        
        # Extract basic properties
        uid_match = re.search(r'UID:([^\n]+)', block)
        if uid_match:
            event['uid'] = uid_match.group(1).strip()
            
        summary_match = re.search(r'SUMMARY:([^\n]+)', block)
        if summary_match:
            event['summary'] = summary_match.group(1).strip()
            
        dtstart_match = re.search(r'DTSTART;VALUE=DATE:([^\n]+)', block)
        if dtstart_match:
            event['date'] = parse_ics_date(dtstart_match.group(1).strip())
            
        url_match = re.search(r'URL;VALUE=URI:([^\n]+)', block)
        if url_match:
            event['url'] = url_match.group(1).strip()
        
        # Extract description and parse liturgical data (but don't store raw description)
        desc_match = re.search(r'DESCRIPTION:(.*?)(?=\n[A-Z]|$)', block, re.DOTALL)
        if desc_match:
            # Join continuation lines (lines starting with tab/space)
            raw_desc = desc_match.group(1)
            # Remove line breaks that are followed by whitespace (continuation lines)
            desc_joined = re.sub(r'\n\s+', ' ', raw_desc)
            
            # Parse the description content and add to event
            liturgical_data = parse_description(desc_joined)
            event.update(liturgical_data)
        
        if event.get('uid') and event.get('summary') and event.get('date'):
            events.append(event)
        
        # Progress indicator
        if (i + 1) % 50 == 0:
            print("Processed {} events...".format(i + 1))
    
    print("\nSuccessfully parsed {} valid events".format(len(events)))
    
    # Generate SQL
    with codecs.open(output_file, 'w', encoding='utf-8') as f:
        f.write(create_table_sql)
        
        for event in events:
            sql = generate_insert_sql(event)
            f.write(sql + '\n')
        
        f.write('\n-- End of inserts\n')
    
    print("SQL file generated: {}".format(output_file))
    
    # Show some sample events
    print("\nSample events:")
    for i, event in enumerate(events[:3]):
        print("\nEvent {}:".format(i+1))
        print("  Summary: {}".format(event.get('summary', 'N/A')))
        print("  Date: {}".format(event.get('date', 'N/A')))
        print("  Season: {}".format(event.get('season', 'N/A')))
        print("  Liturgical Color: {}".format(event.get('liturgical_color', 'N/A')))
        print("  Weekly Verse Ref: {}".format(event.get('weekly_verse_reference', 'N/A')))
        print("  Psalm: {}".format(event.get('psalm', 'N/A')))
        print("  AT-Lesung: {}".format(event.get('old_testament_reading', 'N/A')))
        print("  Epistel: {}".format(event.get('epistle', 'N/A')))
        print("  Gospel: {}".format(event.get('gospel', 'N/A')))
        print("  Perikopen: {}".format('Yes' if event.get('perikopen') else 'No'))
    
    return events

def parse_ics_date(date_string):
    """Convert ICS date to SQL date format"""
    # Format: 20181202
    clean_date = re.sub(r'[^0-9]', '', date_string)
    
    if len(clean_date) >= 8:
        year = clean_date[:4]
        month = clean_date[4:6]
        day = clean_date[6:8]
        return "{}-{}-{}".format(year, month, day)
    
    return "2025-01-01"  # fallback

def parse_description(description):
    """Parse liturgical description"""
    
    data = {}
    
    # Convert literal \n to actual newlines 
    clean_desc = description.replace('\\n', '\n')
    
    # Fix broken words
    clean_desc = re.sub(r'Ep\s+istel', 'Epistel', clean_desc)
    clean_desc = re.sub(r'J\s+es\s+', 'Jes ', clean_desc)
    clean_desc = re.sub(r'J\s+ak\s+', 'Jak ', clean_desc)
    clean_desc = re.sub(r'W\s+ochenlied', 'Wochenlied', clean_desc)
    clean_desc = re.sub(r'D\s+ie\s+einzelnen', 'Die einzelnen', clean_desc)
    clean_desc = re.sub(r'ilt\s+in\s+die', 'ilt in die', clean_desc)
    clean_desc = re.sub(r'gil\s+t\s+-\s+beginnend', 'gilt - beginnend', clean_desc)
    
    lines = [line.strip() for line in clean_desc.split('\n') if line.strip()]
    
    perikopen = {}
    in_perikopen_section = False
    
    for line in lines:
        # Skip explanation text
        if ('Erklärung zu den Perikopen:' in line or 
            'Die biblischen Predigttexte sind aufgeteilt' in line or
            'Jede Reihe gilt' in line or
            'Die einzelnen Reihen haben' in line):
            in_perikopen_section = True
            continue
            
        # Parse Perikopen (I-VI)
        if in_perikopen_section:
            perikopen_match = re.match(r'^([IVX]+):\s*(.+)$', line)
            if perikopen_match:
                reihe, text = perikopen_match.groups()
                perikopen[reihe] = text.strip()
                continue
        
        # Parse key-value pairs
        if ':' in line and not in_perikopen_section:
            parts = line.split(':', 1)
            key = parts[0].strip()
            value = parts[1].strip()
            
            if key == 'liturgische Farbe':
                data['liturgical_color'] = value
            elif key == 'Festzeit':
                data['season'] = value
            elif key == 'Wochenspruch':
                data['weekly_verse'] = value
                # Extract reference
                ref_match = re.search(r'\(([^)]+)\)$', value)
                if ref_match:
                    data['weekly_verse_reference'] = ref_match.group(1)
            elif key == 'Wochenpsalm':
                data['psalm'] = value
            elif key == 'Eingangspsalm':
                if 'psalm' not in data:
                    data['psalm'] = value
            elif key == 'AT-Lesung':
                data['old_testament_reading'] = value
            elif key == 'Epistel':
                data['epistle'] = value
            elif key == 'Evangelium':
                data['gospel'] = value
            elif key == 'Predigttext':
                data['sermon_text'] = value
            elif key == 'Wochenlied':
                data['hymn'] = value
    
    if perikopen:
        import json
        data['perikopen'] = json.dumps(perikopen, ensure_ascii=False)
        
    return data

def generate_insert_sql(event):
    """Generate SQL INSERT statement for an event"""
    
    def escape_sql(value):
        if value is None:
            return 'NULL'
        return "'" + str(value).replace("'", "''") + "'"
    
    sql = """INSERT INTO church_events (
    uid, summary, event_date, url,
    liturgical_color, season, weekly_verse, weekly_verse_reference,
    psalm, old_testament_reading, epistle, gospel, sermon_text, hymn, perikopen
) VALUES (
    {},{},{},{},{},{},{},{},{},{},{},{},{},{},{}
);""".format(
        escape_sql(event.get('uid')),
        escape_sql(event.get('summary')),
        "'{}'".format(event.get('date')),
        escape_sql(event.get('url')),
        escape_sql(event.get('liturgical_color')),
        escape_sql(event.get('season')),
        escape_sql(event.get('weekly_verse')),
        escape_sql(event.get('weekly_verse_reference')),
        escape_sql(event.get('psalm')),
        escape_sql(event.get('old_testament_reading')),
        escape_sql(event.get('epistle')),
        escape_sql(event.get('gospel')),
        escape_sql(event.get('sermon_text')),
        escape_sql(event.get('hymn')),
        escape_sql(event.get('perikopen'))
    )
    
    return sql

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python parse_ics_to_sql.py <ics_file> [output_sql_file]")
        sys.exit(1)
    
    ics_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'church_events.sql'
    
    try:
        events = parse_ics_to_sql(ics_file, output_file)
        print("\n✅ Successfully converted {} events to SQL!".format(len(events)))
        print("📄 Output file: {}".format(output_file))
    except IOError:
        print("❌ Error: File {} not found".format(ics_file))
    except Exception as e:
        print("❌ Error: {}".format(e))