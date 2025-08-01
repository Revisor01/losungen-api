-- Umfassendes Fix für alle Lieder-Probleme
-- Behebt Leerzeichen-Probleme und mappt EG-Nummern

-- Fix broken spaces in hymn1
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'preis et', 'preiset') WHERE hymn1 LIKE '%preis et%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'leuchte t', 'leuchtet') WHERE hymn1 LIKE '%leuchte t%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'mic h', 'mich') WHERE hymn1 LIKE '%mic h%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'Bethleh em', 'Bethlehem') WHERE hymn1 LIKE '%Bethleh em%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'Heilge r', 'Heilger') WHERE hymn1 LIKE '%Heilge r%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'ic h', 'ich') WHERE hymn1 LIKE '%ic h%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'aller  Schöpfung', 'aller Schöpfung') WHERE hymn1 LIKE '%aller  Schöpfung%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'ma ch', 'mach') WHERE hymn1 LIKE '%ma ch%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'bedenk en', 'bedenken') WHERE hymn1 LIKE '%bedenk en%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'vo n', 'von') WHERE hymn1 LIKE '%vo n%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'Wi r', 'Wir') WHERE hymn1 LIKE '%Wi r%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'hö chstes', 'höchstes') WHERE hymn1 LIKE '%hö chstes%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'de m', 'dem') WHERE hymn1 LIKE '%de m%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'Sei nen', 'Seinen') WHERE hymn1 LIKE '%Sei nen%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, 'He rr', 'Herr') WHERE hymn1 LIKE '%He rr%';

-- Fix broken spaces in hymn2
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'preis et', 'preiset') WHERE hymn2 LIKE '%preis et%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'leuchte t', 'leuchtet') WHERE hymn2 LIKE '%leuchte t%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'mic h', 'mich') WHERE hymn2 LIKE '%mic h%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'Bethleh em', 'Bethlehem') WHERE hymn2 LIKE '%Bethleh em%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'Heilge r', 'Heilger') WHERE hymn2 LIKE '%Heilge r%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'ic h', 'ich') WHERE hymn2 LIKE '%ic h%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'aller  Schöpfung', 'aller Schöpfung') WHERE hymn2 LIKE '%aller  Schöpfung%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'ma ch', 'mach') WHERE hymn2 LIKE '%ma ch%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'bedenk en', 'bedenken') WHERE hymn2 LIKE '%bedenk en%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'vo n', 'von') WHERE hymn2 LIKE '%vo n%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'Wi r', 'Wir') WHERE hymn2 LIKE '%Wi r%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'hö chstes', 'höchstes') WHERE hymn2 LIKE '%hö chstes%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'de m', 'dem') WHERE hymn2 LIKE '%de m%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'Sei nen', 'Seinen') WHERE hymn2 LIKE '%Sei nen%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, 'He rr', 'Herr') WHERE hymn2 LIKE '%He rr%';

-- Comprehensive EG mapping for hymn1 (case-insensitive)
UPDATE church_events SET hymn1_eg = 'EG 116' WHERE LOWER(hymn1) LIKE '%wir stehen im morgen%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 47' WHERE LOWER(hymn1) LIKE '%du höchstes licht%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 271' WHERE LOWER(hymn1) LIKE '%lobe den herrn%meine seele%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 223' WHERE LOWER(hymn1) LIKE '%das wort geht von dem vater aus%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 499' WHERE LOWER(hymn1) LIKE '%ich bin das brot%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 262' WHERE LOWER(hymn1) LIKE '%es kennt der herr die seinen%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 432' WHERE LOWER(hymn1) LIKE '%gott gab uns atem%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 409' WHERE LOWER(hymn1) LIKE '%die ganze welt%herr jesu christ%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 299' WHERE LOWER(hymn1) LIKE '%aus tiefer not%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 394' WHERE LOWER(hymn1) LIKE '%danket dem herrn%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 450' WHERE LOWER(hymn1) LIKE '%morgenglanz der ewigkeit%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 1' WHERE LOWER(hymn1) LIKE '%macht hoch die tür%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 36' WHERE LOWER(hymn1) LIKE '%fröhlich soll mein herze springen%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 40' WHERE LOWER(hymn1) LIKE '%zu bethlehem geboren%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 72' WHERE LOWER(hymn1) LIKE '%o dass doch bald dein feuer brennte%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 124' WHERE LOWER(hymn1) LIKE '%nun danket%erhebt und preiset%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 456' WHERE LOWER(hymn1) LIKE '%herr%stärke mich%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 136' WHERE LOWER(hymn1) LIKE '%heilger geist%tröster%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 365' WHERE LOWER(hymn1) LIKE '%von gott will ich nicht lassen%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 446' WHERE LOWER(hymn1) LIKE '%wachet auf%ruft uns die stimme%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 76' WHERE LOWER(hymn1) LIKE '%wie schön leuchtet der morgenstern%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 504' WHERE LOWER(hymn1) LIKE '%himmel%erde%luft und meer%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 165' WHERE LOWER(hymn1) LIKE '%gott ist gegenwärtig%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 316' WHERE LOWER(hymn1) LIKE '%liebe%die du mich zum bilde%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 395' WHERE LOWER(hymn1) LIKE '%vertraut den neuen wegen%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 140' WHERE LOWER(hymn1) LIKE '%gott%aller schöpfung heilger herr%' AND hymn1_eg IS NULL;
UPDATE church_events SET hymn1_eg = 'EG 241' WHERE LOWER(hymn1) LIKE '%herr%mach uns stark im mut%' AND hymn1_eg IS NULL;

-- Comprehensive EG mapping for hymn2 (case-insensitive)
UPDATE church_events SET hymn2_eg = 'EG 116' WHERE LOWER(hymn2) LIKE '%wir stehen im morgen%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 47' WHERE LOWER(hymn2) LIKE '%du höchstes licht%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 271' WHERE LOWER(hymn2) LIKE '%lobe den herrn%meine seele%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 428' WHERE LOWER(hymn2) LIKE '%komm in unsre stolze welt%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 534' WHERE LOWER(hymn2) LIKE '%meine engen grenzen%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 165' WHERE LOWER(hymn2) LIKE '%gott ist gegenwärtig%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 262' WHERE LOWER(hymn2) LIKE '%es kennt der herr die seinen%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 432' WHERE LOWER(hymn2) LIKE '%gott gab uns atem%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 409' WHERE LOWER(hymn2) LIKE '%die ganze welt%herr jesu christ%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 299' WHERE LOWER(hymn2) LIKE '%aus tiefer not%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 394' WHERE LOWER(hymn2) LIKE '%danket dem herrn%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 450' WHERE LOWER(hymn2) LIKE '%morgenglanz der ewigkeit%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 1' WHERE LOWER(hymn2) LIKE '%macht hoch die tür%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 36' WHERE LOWER(hymn2) LIKE '%fröhlich soll mein herze springen%' AND hymn2_eg IS NULL;
UPDATE church_events SET hymn2_eg = 'EG 40' WHERE LOWER(hymn2) LIKE '%zu bethlehem geboren%' AND hymn2_eg IS NULL;

-- Check results
SELECT 'Hymns with EG numbers mapped' as status, 
       COUNT(*) FILTER (WHERE hymn1_eg IS NOT NULL) as hymn1_mapped,
       COUNT(*) FILTER (WHERE hymn2_eg IS NOT NULL) as hymn2_mapped,
       COUNT(*) FILTER (WHERE hymn1 IS NOT NULL) as total_hymn1,
       COUNT(*) FILTER (WHERE hymn2 IS NOT NULL) as total_hymn2
FROM church_events;

-- Show remaining unmapped hymns
SELECT 'Remaining unmapped hymn1:' as type, hymn1 as title FROM church_events 
WHERE hymn1 IS NOT NULL AND hymn1_eg IS NULL 
UNION ALL
SELECT 'Remaining unmapped hymn2:' as type, hymn2 as title FROM church_events 
WHERE hymn2 IS NOT NULL AND hymn2_eg IS NULL 
ORDER BY type, title;