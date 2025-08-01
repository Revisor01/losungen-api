-- Fix space issues in weekly_verse and weekly_verse_reference

-- Fix weekly_verse spaces
UPDATE church_events SET weekly_verse = REPLACE(weekly_verse, 'Mt  5', 'Mt 5') WHERE weekly_verse LIKE '%Mt  5%';
UPDATE church_events SET weekly_verse = REPLACE(weekly_verse, 'barmherz ige', 'barmherzige') WHERE weekly_verse LIKE '%barmherz ige%';
UPDATE church_events SET weekly_verse = REPLACE(weekly_verse, 'Gerechti gkeit', 'Gerechtigkeit') WHERE weekly_verse LIKE '%Gerechti gkeit%';
UPDATE church_events SET weekly_verse = REPLACE(weekly_verse, 'Jes 40 ,3', 'Jes 40,3') WHERE weekly_verse LIKE '%Jes 40 ,3%';

-- Fix weekly_verse_reference spaces  
UPDATE church_events SET weekly_verse_reference = REPLACE(weekly_verse_reference, 'Mt  5', 'Mt 5') WHERE weekly_verse_reference LIKE '%Mt  5%';
UPDATE church_events SET weekly_verse_reference = REPLACE(weekly_verse_reference, 'Jes 40 ,3', 'Jes 40,3') WHERE weekly_verse_reference LIKE '%Jes 40 ,3%';

-- Additional common space fixes
UPDATE church_events SET weekly_verse = REPLACE(weekly_verse, '  ', ' ') WHERE weekly_verse LIKE '%  %';
UPDATE church_events SET weekly_verse_reference = REPLACE(weekly_verse_reference, '  ', ' ') WHERE weekly_verse_reference LIKE '%  %';

-- Show fixed entries
SELECT 'Fixed weekly verses:' as status, COUNT(*) FROM church_events WHERE weekly_verse IS NOT NULL;

-- Show sample results
SELECT summary, weekly_verse, weekly_verse_reference 
FROM church_events 
WHERE weekly_verse IS NOT NULL 
ORDER BY event_date ASC 
LIMIT 5;