export interface ChurchEvent {
  uid: string;
  summary: string;
  description: string;
  date: Date;
  url?: string;
  liturgicalColor?: string;
  season?: string;
  weeklyVerse?: string;
  psalm?: string;
  epistle?: string;
  gospel?: string;
  sermonText?: string;
  hymn?: string;
  perikopen?: {
    [key: string]: string; // I, II, III, IV, V, VI
  };
}

export class ICSParser {
  /**
   * Parst ICS-Kalender-Daten für Kirchenjahr-Events
   */
  static parseICS(icsContent: string): ChurchEvent[] {
    const events: ChurchEvent[] = [];
    const lines = icsContent.split('\n').map(line => line.trim());
    
    let currentEvent: Partial<ChurchEvent> | null = null;
    let currentProperty = '';
    let currentValue = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
        continue;
      }
      
      if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.uid && currentEvent.summary && currentEvent.date) {
          events.push(currentEvent as ChurchEvent);
        }
        currentEvent = null;
        continue;
      }
      
      if (!currentEvent) continue;
      
      // Handle multi-line properties (starting with space or tab)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        currentValue += line.substring(1);
        continue;
      }
      
      // Process previous property if we have one
      if (currentProperty && currentValue !== '') {
        this.setEventProperty(currentEvent, currentProperty, currentValue);
      }
      
      // Parse new property
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      currentProperty = line.substring(0, colonIndex);
      currentValue = line.substring(colonIndex + 1);
    }
    
    // Process last property if any
    if (currentEvent && currentProperty && currentValue !== '') {
      this.setEventProperty(currentEvent, currentProperty, currentValue);
    }
    
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  private static setEventProperty(event: Partial<ChurchEvent>, property: string, value: string) {
    switch (property) {
      case 'UID':
        event.uid = value;
        break;
        
      case 'SUMMARY':
        event.summary = value;
        break;
        
      case 'DESCRIPTION':
        event.description = value;
        // Parse structured description for liturgical data
        this.parseDescription(event, value);
        break;
        
      case 'DTSTART;VALUE=DATE':
      case 'DTSTART':
        event.date = this.parseDate(value);
        break;
        
      case 'URL;VALUE=URI':
      case 'URL':
        event.url = value;
        break;
    }
  }
  
  private static parseDate(dateString: string): Date {
    // Handle different date formats from ICS
    // Format: 20181202 00:00:00 or 20181202
    const cleanDate = dateString.replace(/\s+.*$/, '').replace(/[^\d]/g, '');
    
    if (cleanDate.length >= 8) {
      const year = parseInt(cleanDate.substring(0, 4), 10);
      const month = parseInt(cleanDate.substring(4, 6), 10) - 1; // Month is 0-indexed
      const day = parseInt(cleanDate.substring(6, 8), 10);
      
      return new Date(year, month, day);
    }
    
    return new Date();
  }
  
  private static parseDescription(event: Partial<ChurchEvent>, description: string) {
    // The actual ICS format has literal \n characters and continued lines with tabs
    console.log('Raw description:', description); // Debug
    
    // Clean up the description: handle multi-line values and tab continuations
    const cleanedDescription = description
      .replace(/\\n/g, '\n')  // Convert literal \n to actual newlines
      .replace(/\n\t/g, ' ')  // Join tab-continued lines
      .replace(/\n /g, ' ');  // Join space-continued lines
    
    console.log('Cleaned description:', cleanedDescription); // Debug
    
    const lines = cleanedDescription.split('\n').map(l => l.trim()).filter(l => l);
    
    const perikopen: { [key: string]: string } = {};
    let inPerikopenSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log('Processing line:', line); // Debug
      
      // Parse key-value pairs with colon separator
      if (line.includes(':') && !inPerikopenSection) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        switch (key) {
          case 'liturgische Farbe':
            event.liturgicalColor = value;
            break;
          case 'Festzeit':
            event.season = value;
            break;
          case 'Wochenspruch':
            event.weeklyVerse = value;
            break;
          case 'Wochenpsalm':
          case 'Eingangspsalm':
            event.psalm = value;
            break;
          case 'Epistel':
            event.epistle = value;
            break;
          case 'Evangelium':
            event.gospel = value;
            break;
          case 'Predigttext':
            event.sermonText = value;
            break;
          case 'Wochenlied':
            event.hymn = value;
            break;
        }
      }
      
      // Detect Perikopen section
      if (line.includes('Erklärung zu den Perikopen:')) {
        inPerikopenSection = true;
        continue;
      }
      
      // Parse Perikopen (I-VI)
      if (inPerikopenSection) {
        const perikopenMatch = line.match(/^([IVX]+):\s*(.+)$/);
        if (perikopenMatch) {
          const [, reihe, text] = perikopenMatch;
          perikopen[reihe] = text.trim();
          console.log(`Found Perikope ${reihe}: ${text.trim()}`); // Debug
        }
      }
    }
    
    if (Object.keys(perikopen).length > 0) {
      event.perikopen = perikopen;
      console.log('All Perikopen:', event.perikopen); // Debug
    }
    
    console.log('Parsed event data:', {
      liturgicalColor: event.liturgicalColor,
      season: event.season,
      weeklyVerse: event.weeklyVerse,
      psalm: event.psalm,
      epistle: event.epistle,
      gospel: event.gospel,
      sermonText: event.sermonText,
      hymn: event.hymn,
      perikopen: event.perikopen
    }); // Debug
  }
  
  /**
   * Findet Events für ein bestimmtes Datum
   */
  static findEventsForDate(events: ChurchEvent[], date: Date): ChurchEvent[] {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === targetDate.getTime();
    });
  }
  
  /**
   * Findet das nächste Event nach einem Datum
   */
  static findNextEvent(events: ChurchEvent[], fromDate: Date = new Date()): ChurchEvent | null {
    const today = new Date(fromDate);
    today.setHours(0, 0, 0, 0);
    
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() >= today.getTime();
    });
    
    return futureEvents.length > 0 ? futureEvents[0] : null;
  }
  
  /**
   * Findet Events in einem Datumsbereich
   */
  static findEventsInRange(events: ChurchEvent[], startDate: Date, endDate: Date): ChurchEvent[] {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= start && eventDate <= end;
    });
  }
  
  /**
   * Gruppiert Events nach liturgischen Zeiten
   */
  static groupEventsBySeason(events: ChurchEvent[]): { [season: string]: ChurchEvent[] } {
    const grouped: { [season: string]: ChurchEvent[] } = {};
    
    for (const event of events) {
      const season = event.season || 'Unbekannt';
      if (!grouped[season]) {
        grouped[season] = [];
      }
      grouped[season].push(event);
    }
    
    return grouped;
  }
  
  /**
   * Formatiert Datum für Anzeige
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  /**
   * Bestimmt Farbe für liturgische Farbe
   */
  static getLiturgicalColorClass(color?: string): string {
    if (!color) return 'bg-gray-100 text-gray-800';
    
    const normalizedColor = color.toLowerCase();
    
    switch (normalizedColor) {
      case 'violett':
        return 'bg-purple-100 text-purple-800';
      case 'weiß':
      case 'weiss':
        return 'bg-gray-50 text-gray-800 border border-gray-200';
      case 'rot':
        return 'bg-red-100 text-red-800';
      case 'grün':
      case 'gruen':
        return 'bg-green-100 text-green-800';
      case 'schwarz':
        return 'bg-gray-800 text-white';
      case 'rosa':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }
}