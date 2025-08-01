#!/usr/bin/env python3
import xml.etree.ElementTree as ET
import re
from datetime import datetime
import codecs

def parse_losungen_xml(filename, output_file='losungen_2025.sql'):
    """Parse Losungen XML file and generate SQL statements"""
    
    print(f"Parsing {filename}...")
    
    try:
        # Parse XML file
        tree = ET.parse(filename)
        root = tree.getroot()
        
        # Find all Losungen entries
        losungen_entries = root.findall('Losungen')
        print(f"Found {len(losungen_entries)} Losungen entries")
        
        # Generate SQL
        sql_statements = []
        sql_statements.append("-- Losungen for 2025")
        sql_statements.append("-- Generated from Losungen Free 2025.xml")
        sql_statements.append("")
        
        # Create table
        sql_statements.append("""CREATE TABLE IF NOT EXISTS losungen (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    weekday VARCHAR(20) NOT NULL,
    holiday VARCHAR(200),
    
    -- Old Testament (Losung)
    ot_text TEXT NOT NULL,
    ot_reference VARCHAR(100) NOT NULL,
    
    -- New Testament (Lehrtext)
    nt_text TEXT NOT NULL,
    nt_reference VARCHAR(100) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);""")
        sql_statements.append("")
        
        # Clear existing data for 2025
        sql_statements.append("DELETE FROM losungen WHERE date >= '2025-01-01' AND date <= '2025-12-31';")
        sql_statements.append("")
        
        # Insert statements
        sql_statements.append("INSERT INTO losungen (date, weekday, holiday, ot_text, ot_reference, nt_text, nt_reference) VALUES")
        
        insert_values = []
        processed = 0
        
        for entry in losungen_entries:
            try:
                # Extract data
                datum = entry.find('Datum').text
                date_obj = datetime.fromisoformat(datum.replace('T00:00:00.000', ''))
                date_str = date_obj.strftime('%Y-%m-%d')
                
                wtag = entry.find('Wtag').text
                sonntag_elem = entry.find('Sonntag')
                sonntag = sonntag_elem.text if sonntag_elem is not None else None
                
                losungstext = entry.find('Losungstext').text
                losungsvers = entry.find('Losungsvers').text
                lehrtext = entry.find('Lehrtext').text
                lehrtextvers = entry.find('Lehrtextvers').text
                
                # Clean texts (remove /.../ annotations from Lehrtext)
                if lehrtext:
                    lehrtext = re.sub(r'^/[^/]+/\s*', '', lehrtext)
                
                # Escape single quotes for SQL
                def escape_sql(text):
                    if text is None:
                        return None
                    return text.replace("'", "''")
                
                # Create insert value
                holiday_val = f"'{escape_sql(sonntag)}'" if sonntag else 'NULL'
                
                insert_value = f"('{date_str}', '{escape_sql(wtag)}', {holiday_val}, '{escape_sql(losungstext)}', '{escape_sql(losungsvers)}', '{escape_sql(lehrtext)}', '{escape_sql(lehrtextvers)}')"
                insert_values.append(insert_value)
                
                processed += 1
                if processed % 50 == 0:
                    print(f"Processed {processed} entries...")
                    
            except Exception as e:
                print(f"Error processing entry: {e}")
                continue
        
        # Add all insert values
        sql_statements.append(',\n'.join(insert_values) + ';')
        sql_statements.append("")
        
        # Write to file
        with codecs.open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_statements))
        
        print(f"✅ Successfully processed {processed} Losungen entries")
        print(f"📄 SQL file generated: {output_file}")
        
        # Show sample entries
        if losungen_entries:
            print("\nSample entries:")
            for i, entry in enumerate(losungen_entries[:3]):
                datum = entry.find('Datum').text
                date_obj = datetime.fromisoformat(datum.replace('T00:00:00.000', ''))
                sonntag_elem = entry.find('Sonntag')
                holiday = sonntag_elem.text if sonntag_elem is not None else ""
                
                print(f"\nEntry {i+1}:")
                print(f"  Date: {date_obj.strftime('%Y-%m-%d')} ({entry.find('Wtag').text})")
                if holiday:
                    print(f"  Holiday: {holiday}")
                print(f"  OT: {entry.find('Losungsvers').text}")
                print(f"  NT: {entry.find('Lehrtextvers').text}")
        
        return processed
        
    except Exception as e:
        print(f"❌ Error parsing XML: {e}")
        return 0

def main():
    filename = 'Losungen Free 2025.xml'
    processed = parse_losungen_xml(filename)
    
    if processed > 0:
        print(f"\n🎉 Success! Parsed {processed} Losungen entries")
        print("Next steps:")
        print("1. Upload losungen_2025.sql to the server")
        print("2. Execute in PostgreSQL database")
        print("3. Update API to use database instead of scraping")
    else:
        print("❌ Failed to parse XML file")

if __name__ == "__main__":
    main()