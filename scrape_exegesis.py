#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
from bs4 import BeautifulSoup
import psycopg2
import os
import re
import time

def connect_db():
    """Verbindung zur PostgreSQL-Datenbank"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'losungen_db'),
            user=os.getenv('DB_USER', 'losungen_user'),
            password=os.getenv('DB_PASSWORD', '')
        )
        return conn
    except Exception as e:
        print(f"Datenbankverbindung fehlgeschlagen: {e}")
        return None

def scrape_exegesis_url(church_event_url):
    """Scrappt die Exegese-URL von einer Kirchenjahr-Seite"""
    try:
        response = requests.get(church_event_url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Suche nach dem Pattern "Exegese zur Auslegung des Predigttextes"
        for link in soup.find_all('a', href=True):
            link_text = link.get_text(strip=True)
            if 'exegese' in link_text.lower() and 'auslegung' in link_text.lower():
                href = link['href']
                # Relative URLs zu absoluten URLs machen
                if href.startswith('/'):
                    return f"https://kirchenjahr-evangelisch.de{href}"
                elif href.startswith('http'):
                    return href
                else:
                    return f"https://kirchenjahr-evangelisch.de/{href}"
        
        return None
        
    except Exception as e:
        print(f"Fehler beim Scrapen von {church_event_url}: {e}")
        return None

def update_exegesis_urls():
    """Aktualisiert alle Exegese-URLs in der Datenbank"""
    conn = connect_db()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Hole alle Events mit URLs aber ohne Exegese-URL
        cursor.execute("""
            SELECT id, uid, summary, url 
            FROM church_events 
            WHERE url IS NOT NULL 
            AND (exegesis_url IS NULL OR exegesis_url = '')
            ORDER BY event_date
        """)
        
        events = cursor.fetchall()
        print(f"Gefunden: {len(events)} Events ohne Exegese-URL")
        
        updated_count = 0
        
        for event_id, uid, summary, url in events:
            print(f"Verarbeite: {summary} ({uid})")
            
            exegesis_url = scrape_exegesis_url(url)
            
            if exegesis_url:
                # Update der Datenbank
                cursor.execute("""
                    UPDATE church_events 
                    SET exegesis_url = %s, updated_at = NOW() 
                    WHERE id = %s
                """, (exegesis_url, event_id))
                
                print(f"  ✓ Gefunden: {exegesis_url}")
                updated_count += 1
            else:
                print(f"  ✗ Keine Exegese gefunden")
            
            # Höfliche Pause zwischen Requests
            time.sleep(1)
        
        conn.commit()
        print(f"\nFertig! {updated_count} Exegese-URLs hinzugefügt.")
        
    except Exception as e:
        print(f"Fehler bei der Verarbeitung: {e}")
        conn.rollback()
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starte Exegese-URL Scraping...")
    update_exegesis_urls()