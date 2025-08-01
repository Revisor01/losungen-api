#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Teste mit einem konkreten Event
test_event = """BEGIN:VEVENT
UID:1430@liturgischerkalender
DTSTAMP:20180101T130000Z
SUMMARY:7. So. n. Trinitatis
DESCRIPTION:liturgische Farbe: Grün\\nFestzeit: Trinitatiszeit\\nWochenspruc
	h: So seid ihr nun nicht mehr Gäste und Fremdlinge, sondern Mitbürger de
	r Heiligen und Gottes Hausgenossen. (Eph 2,19)\\nWochenpsalm: Ps 107,1–9\\
	nEingangspsalm: Ps 107,1–9\\nAT-Lesung: 2. Mose 16,2–3.11–18\\nEpistel
	: Apg 2,41–47\\nEvangelium: Joh 6,1–15\\nPredigttext: Joh 6,30–35\\nWoc
	henlied: Nun laßt uns Gott dem Herren Dank sagen und Ihn ehren / Brich de
	m Hungrigen dein Brot\\n\\nErklärung zu den Perikopen:\\nDie biblischen Pred
	igttexte sind aufgeteilt in die Perikopenreihen I bis VI. Jede Reihe gilt 
	- beginnend mit dem 1. Advent - fortlaufend für ein ganzes Kirchenjahr (a
	ktuelle Reihe = 1). Die einzelnen Reihen haben verschiedene Schwerpunkte (
	Evangelien, Briefe usw.).\\n\\nI: Joh 6,30–35\\nII: Hebr 13,1–3\\nIII: 1.
	 Kön 17,1–16\\nIV: Joh 6,1–15\\nV: Apg 2,41–47\\nVI: 2. Mose 16,2–3.
	11–18
CLASS:PUBLIC
DTSTART;VALUE=DATE:20250803
URL;VALUE=URI:https://kirchenjahr-evangelisch.de/article.php#1430
END:VEVENT"""

# Extrahiere Description
description_match = re.search(r'DESCRIPTION:(.*?)(?=\n[A-Z]+:|$)', test_event, re.DOTALL)
if description_match:
    description = description_match.group(1)
    # Entferne ICS-Fortsetzungszeilen (beginnen mit Tab oder Leerzeichen)
    description = re.sub(r'\n\s+', '', description)
    description = description.strip()
    
    print("Original Description:")
    print(repr(description))
    print("\nCleaned Description:")
    print(description)
    
    # Teste Wochenspruch-Extraktion
    wochenspruch_match = re.search(r'Wochenspruch: ([^\\]+?)(?=\\n|$)', description)
    if wochenspruch_match:
        wochenspruch = wochenspruch_match.group(1)
        print(f"\nWochenspruch gefunden: '{wochenspruch}'")
        
        # Referenz extrahieren
        ref_match = re.search(r'\(([^)]+)\)\s*$', wochenspruch)
        if ref_match:
            ref = ref_match.group(1)
            text = re.sub(r'\s*\([^)]+\)\s*$', '', wochenspruch).strip()
            print(f"Text: '{text}'")
            print(f"Referenz: '{ref}'")
    else:
        print("\nKein Wochenspruch gefunden!")