-- Fix formatting issues in perikopen JSON field

-- Fix "Hebr 13, 1-3" -> "Hebr 13,1-3" pattern
UPDATE church_events 
SET perikopen = REPLACE(perikopen, 'Hebr 13, 1–3', 'Hebr 13,1–3')
WHERE perikopen LIKE '%Hebr 13, 1–3%';

-- Fix other common spacing issues in perikopen
UPDATE church_events 
SET perikopen = REPLACE(perikopen, ', 1–', ',1–')
WHERE perikopen LIKE '%, 1–%';

UPDATE church_events 
SET perikopen = REPLACE(perikopen, ', 2–', ',2–')
WHERE perikopen LIKE '%, 2–%';

UPDATE church_events 
SET perikopen = REPLACE(perikopen, ', 3–', ',3–')
WHERE perikopen LIKE '%, 3–%';

UPDATE church_events 
SET perikopen = REPLACE(perikopen, ', 4–', ',4–')
WHERE perikopen LIKE '%, 4–%';

UPDATE church_events 
SET perikopen = REPLACE(perikopen, ', 5–', ',5–')
WHERE perikopen LIKE '%, 5–%';

-- Show fixed count
SELECT 'Perikopen formatting fixed' as status, COUNT(*) as total FROM church_events;