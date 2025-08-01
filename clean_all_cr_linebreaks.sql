-- Bereinigung aller \r Zeilenumbrüche in church_events

-- Clean all text fields that might have \r
UPDATE church_events SET summary = REPLACE(summary, E'\r', '') WHERE summary LIKE '%' || E'\r' || '%';
UPDATE church_events SET liturgical_color = REPLACE(liturgical_color, E'\r', '') WHERE liturgical_color LIKE '%' || E'\r' || '%';
UPDATE church_events SET season = REPLACE(season, E'\r', '') WHERE season LIKE '%' || E'\r' || '%';
UPDATE church_events SET weekly_verse = REPLACE(weekly_verse, E'\r', '') WHERE weekly_verse LIKE '%' || E'\r' || '%';
UPDATE church_events SET weekly_verse_reference = REPLACE(weekly_verse_reference, E'\r', '') WHERE weekly_verse_reference LIKE '%' || E'\r' || '%';
UPDATE church_events SET psalm = REPLACE(psalm, E'\r', '') WHERE psalm LIKE '%' || E'\r' || '%';
UPDATE church_events SET psalm_eg = REPLACE(psalm_eg, E'\r', '') WHERE psalm_eg LIKE '%' || E'\r' || '%';
UPDATE church_events SET old_testament_reading = REPLACE(old_testament_reading, E'\r', '') WHERE old_testament_reading LIKE '%' || E'\r' || '%';
UPDATE church_events SET epistle = REPLACE(epistle, E'\r', '') WHERE epistle LIKE '%' || E'\r' || '%';
UPDATE church_events SET gospel = REPLACE(gospel, E'\r', '') WHERE gospel LIKE '%' || E'\r' || '%';
UPDATE church_events SET sermon_text = REPLACE(sermon_text, E'\r', '') WHERE sermon_text LIKE '%' || E'\r' || '%';
UPDATE church_events SET hymn = REPLACE(hymn, E'\r', '') WHERE hymn LIKE '%' || E'\r' || '%';
UPDATE church_events SET hymn1 = REPLACE(hymn1, E'\r', '') WHERE hymn1 LIKE '%' || E'\r' || '%';
UPDATE church_events SET hymn2 = REPLACE(hymn2, E'\r', '') WHERE hymn2 LIKE '%' || E'\r' || '%';
UPDATE church_events SET hymn1_eg = REPLACE(hymn1_eg, E'\r', '') WHERE hymn1_eg LIKE '%' || E'\r' || '%';
UPDATE church_events SET hymn2_eg = REPLACE(hymn2_eg, E'\r', '') WHERE hymn2_eg LIKE '%' || E'\r' || '%';

-- Clean perikopen JSON field (more complex due to JSON structure)
UPDATE church_events 
SET perikopen = REPLACE(perikopen, E'\r', '') 
WHERE perikopen LIKE '%' || E'\r' || '%';

-- Show results
SELECT 'Clean \r linebreaks completed' as status, COUNT(*) as total_events FROM church_events;

-- Show any remaining \r characters (should be 0)
SELECT 'Fields with remaining \r:' as check_type, COUNT(*) as count FROM church_events WHERE 
    summary LIKE '%' || E'\r' || '%' OR
    liturgical_color LIKE '%' || E'\r' || '%' OR 
    season LIKE '%' || E'\r' || '%' OR
    weekly_verse LIKE '%' || E'\r' || '%' OR
    weekly_verse_reference LIKE '%' || E'\r' || '%' OR
    psalm LIKE '%' || E'\r' || '%' OR
    psalm_eg LIKE '%' || E'\r' || '%' OR
    old_testament_reading LIKE '%' || E'\r' || '%' OR
    epistle LIKE '%' || E'\r' || '%' OR
    gospel LIKE '%' || E'\r' || '%' OR
    sermon_text LIKE '%' || E'\r' || '%' OR
    hymn LIKE '%' || E'\r' || '%' OR
    hymn1 LIKE '%' || E'\r' || '%' OR
    hymn2 LIKE '%' || E'\r' || '%' OR
    hymn1_eg LIKE '%' || E'\r' || '%' OR
    hymn2_eg LIKE '%' || E'\r' || '%' OR
    perikopen LIKE '%' || E'\r' || '%';