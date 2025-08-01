#!/usr/bin/env python3
import re

def parse_hymn_index(filename='Inhalt Nordelbien.txt'):
    """Parse the hymn book index and create a dictionary mapping titles to EG numbers"""
    hymn_mapping = {}
    
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or not line[0].isdigit():
                continue
                
            # Pattern: number title verses
            # Examples: "4 Nun komm, der Heiden Heiland 5"
            match = re.match(r'^(\d+)\s+(.+?)\s+(\d+)$', line)
            if match:
                eg_number = match.group(1)
                title = match.group(2)
                verses = match.group(3)
                
                # Store variations of the title
                hymn_mapping[title] = eg_number
                # Also store without punctuation for fuzzy matching
                clean_title = re.sub(r'[^\w\s]', '', title).strip()
                if clean_title != title:
                    hymn_mapping[clean_title] = eg_number
                    
    return hymn_mapping

def generate_update_sql(hymn_mapping):
    """Generate SQL statements to update hymn EG numbers"""
    sql_statements = []
    
    for title, eg_number in hymn_mapping.items():
        # Escape single quotes for SQL
        escaped_title = title.replace("'", "''")
        
        # Update hymn1_eg where hymn1 matches
        sql_statements.append(f"""
UPDATE church_events 
SET hymn1_eg = 'EG {eg_number}' 
WHERE LOWER(TRIM(hymn1)) = LOWER('{escaped_title}');""")
        
        # Update hymn2_eg where hymn2 matches
        sql_statements.append(f"""
UPDATE church_events 
SET hymn2_eg = 'EG {eg_number}' 
WHERE LOWER(TRIM(hymn2)) = LOWER('{escaped_title}');""")
    
    return sql_statements

def main():
    print("Parsing hymn index...")
    hymn_mapping = parse_hymn_index()
    print(f"Found {len(hymn_mapping)} hymn entries")
    
    # Generate SQL
    sql_statements = generate_update_sql(hymn_mapping)
    
    # Write to file
    with open('update_hymn_eg_numbers.sql', 'w', encoding='utf-8') as f:
        f.write("-- Update hymn EG numbers from Nordelbien hymn book\n")
        f.write("-- Generated from Inhalt Nordelbien.txt\n\n")
        
        for stmt in sql_statements:
            f.write(stmt + "\n")
        
        # Also add fuzzy matching for common variations
        f.write("\n-- Additional fuzzy matching for common variations\n")
        
        # Special cases we know from the data
        special_cases = [
            ("Nun komm, der Heiden Heiland", "EG 4"),
            ("Wie soll ich dich empfangen", "EG 11"),
            ("O Heiland, reiß die Himmel auf", "EG 7"),
            ("Mit Ernst, o Menschenkinder", "EG 10"),
            ("Die Nacht ist vorgedrungen", "EG 16"),
            ("Nun jauchzet, all ihr Frommen", "EG 9"),
            ("O komm, o komm, du Morgenstern", "EG 19"),
            ("Vom Himmel hoch", "EG 24"),
            ("Lobt Gott, ihr Christen alle gleich", "EG 27"),
            ("Gelobet seist du, Jesu Christ", "EG 23"),
            ("Es ist ein Ros entsprungen", "EG 30"),
            ("Ich steh an deiner Krippen hier", "EG 37"),
            ("Herbei, o ihr Gläub'gen", "EG 45"),
            ("Zu Bethlehem geboren", "EG 32"),
            ("Kommt und lasst uns Christus ehren", "EG 39"),
            ("Nun lasst uns gehn und treten", "EG 58"),
            ("Von guten Mächten", "EG 65"),
            ("Wachet auf, ruft uns die Stimme", "EG 147"),
            ("Herr, mach uns stark im Mut, der dich bekennt", "EG 154"),
            ("Die Heiligen, uns weit voran", "EG 154"),
            ("Bewahre uns, Gott", "EG 171"),
            ("Macht hoch die Tür", "EG 1"),
            ("Herr, stärke mich, dein Leiden zu bedenken", "EG 91"),
            ("Dein König kommt in niedern Hüllen", "EG 14"),
            ("Es kommt die Zeit, in der die Träume sich erfüllen", "EG 18"),
            ("Such, wer da will, ein ander Ziel", "EG 346"),
            ("Mit dir, o Herr, die Grenzen überschreiten", "EG 225"),
            ("Der Himmel, der ist, ist nicht der Himmel, der kommt", "EG 153")
        ]
        
        for title, eg in special_cases:
            escaped_title = title.replace("'", "''")
            f.write(f"""
UPDATE church_events 
SET hymn1_eg = '{eg}' 
WHERE hymn1_eg IS NULL AND LOWER(hymn1) LIKE LOWER('%{escaped_title}%');

UPDATE church_events 
SET hymn2_eg = '{eg}' 
WHERE hymn2_eg IS NULL AND LOWER(hymn2) LIKE LOWER('%{escaped_title}%');
""")
    
    print(f"Generated {len(sql_statements)} SQL update statements")
    print("SQL file created: update_hymn_eg_numbers.sql")
    
    # Also create a summary of hymns that might need manual review
    print("\nChecking current hymns in database that might need matching...")

if __name__ == "__main__":
    main()