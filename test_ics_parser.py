#!/usr/bin/env python3
"""
ICS Parser Test Script
Analysiert die kirchenjahr-evangelisch-2025-2026.ics Datei
"""

import re
from datetime import datetime

def parse_ics_file(filename):
    """Parse ICS file and extract event data"""
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    events = []
    
    # Split into individual events
    event_blocks = re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', content, re.DOTALL)
    
    for i, block in enumerate(event_blocks[:3]):  # Only first 3 events for testing
        event = {}
        
        # Extract basic properties
        uid_match = re.search(r'UID:([^\n]+)', block)
        if uid_match:
            event['uid'] = uid_match.group(1)
            
        summary_match = re.search(r'SUMMARY:([^\n]+)', block)
        if summary_match:
            event['summary'] = summary_match.group(1)
            
        dtstart_match = re.search(r'DTSTART;VALUE=DATE:([^\n]+)', block)
        if dtstart_match:
            event['date'] = dtstart_match.group(1)
            
        url_match = re.search(r'URL;VALUE=URI:([^\n]+)', block)
        if url_match:
            event['url'] = url_match.group(1)
        
        # Extract description (handle multi-line)
        desc_match = re.search(r'DESCRIPTION:(.*?)(?=\n[A-Z]|\nEND:|$)', block, re.DOTALL)
        if desc_match:
            # Join continuation lines (lines starting with tab/space)
            raw_desc = desc_match.group(1)
            # Remove line breaks that are followed by whitespace (continuation lines)
            desc_joined = re.sub(r'\n\s+', ' ', raw_desc)
            event['raw_description'] = desc_joined
            
            # Parse the description content
            liturgical_data = parse_description(desc_joined)
            event.update(liturgical_data)
        
        events.append(event)
        
        print(f"\n{'='*60}")
        print(f"EVENT {i+1}: {event.get('summary', 'Unknown')}")
        print(f"{'='*60}")
        print(f"UID: {event.get('uid', 'N/A')}")
        print(f"Date: {event.get('date', 'N/A')}")
        print(f"URL: {event.get('url', 'N/A')}")
        print(f"\nRAW DESCRIPTION:")
        print(f"{event.get('raw_description', 'N/A')}")
        print(f"\nPARSED DATA:")
        
        for key, value in event.items():
            if key not in ['uid', 'summary', 'date', 'url', 'raw_description']:
                print(f"  {key}: {value}")
    
    return events

def parse_description(description):
    """Parse the liturgical description"""
    
    data = {}
    
    # Convert literal \n to actual newlines 
    clean_desc = description.replace('\\n', '\n')
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
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            
            if key == 'liturgische Farbe':
                data['liturgicalColor'] = value
            elif key == 'Festzeit':
                data['season'] = value
            elif key == 'Wochenspruch':
                data['weeklyVerse'] = value
                # Extract reference
                ref_match = re.search(r'\(([^)]+)\)$', value)
                if ref_match:
                    data['weeklyVerseReference'] = ref_match.group(1)
            elif key == 'Wochenpsalm':
                data['psalm'] = value
            elif key == 'Eingangspsalm':
                if 'psalm' not in data:
                    data['psalm'] = value
            elif key == 'AT-Lesung':
                data['oldTestamentReading'] = value
            elif key == 'Epistel':
                data['epistle'] = value
            elif key == 'Evangelium':
                data['gospel'] = value
            elif key == 'Predigttext':
                data['sermonText'] = value
            elif key == 'Wochenlied':
                data['hymn'] = value
    
    if perikopen:
        data['perikopen'] = perikopen
        
    return data

if __name__ == "__main__":
    filename = "kirchenjahr-evangelisch-2025-2026.ics"
    try:
        events = parse_ics_file(filename)
        print(f"\n\n{'='*60}")
        print(f"SUMMARY: Parsed {len(events)} events successfully")
        print(f"{'='*60}")
    except FileNotFoundError:
        print(f"Error: File {filename} not found")
    except Exception as e:
        print(f"Error: {e}")