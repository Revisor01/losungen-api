import { ApiResponse, DailyLosung, BibleSearchRequest, BibleSearchResult } from '../types';

class ApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // API URL basierend auf Environment
    this.baseUrl = process.env.REACT_APP_API_URL || (
      process.env.NODE_ENV === 'production' 
        ? '/api' 
        : 'http://localhost:8374'
    );
    this.apiKey = process.env.REACT_APP_API_KEY || 'ksadh8324oijcff45rfdsvcvhoids44';
  }

  // Allow dynamic API key updates
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get current API key (for auth context)
  getApiKey(): string {
    return (window as any).__BIBLESCRAPER_API_KEY__ || this.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.getApiKey(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Hole heutige Tageslosung
  async getTodayLosung(translation: string = 'LUT'): Promise<ApiResponse<DailyLosung>> {
    const apiKey = this.getApiKey();
    return this.request<DailyLosung>(`/?api_key=${apiKey}&translation=${translation}`);
  }

  // Hole Tageslosung für spezifisches Datum
  async getLosung(date: string, translation: string = 'LUT'): Promise<ApiResponse<DailyLosung>> {
    const apiKey = this.getApiKey();
    return this.request<DailyLosung>(`/?api_key=${apiKey}&date=${date}&translation=${translation}`);
  }

  // Suche nach beliebiger Bibelstelle
  async searchBibleText(request: BibleSearchRequest): Promise<ApiResponse<BibleSearchResult>> {
    const apiKey = this.getApiKey();
    const params = new URLSearchParams({
      api_key: apiKey,
      reference: request.reference,
      translation: request.translation,
      format: request.format || 'json'
    });

    // Für text/markdown/html Format direkte Response behandeln
    if (request.format && ['text', 'markdown', 'html'].includes(request.format)) {
      try {
        const response = await fetch(`${this.baseUrl}/bible_search.php?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const textContent = await response.text();
        
        // Parse translation info from available translations
        const translationInfo = this.getAvailableTranslations().find(t => t.code === request.translation) || {
          code: request.translation,
          name: request.translation,
          language: 'German'
        };
        
        // Formatiere als BibleSearchResult für einheitliche Verwendung
        const result: BibleSearchResult = {
          text: textContent,
          reference: request.reference,
          translation: translationInfo,
          source: `Bible Search API (${request.format})`,
          url: ''
        };

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        throw error;
      }
    }

    return this.request<BibleSearchResult>(`/bible_search.php?${params}`);
  }

  // Hole alle verfügbaren Übersetzungen (aus lokaler Liste)
  getAvailableTranslations() {
    return [
      { code: 'LUT', name: 'Lutherbibel 2017', language: 'German' },
      { code: 'ELB', name: 'Elberfelder Bibel', language: 'German' },
      { code: 'HFA', name: 'Hoffnung für alle', language: 'German' },
      { code: 'SLT', name: 'Schlachter 2000', language: 'German' },
      { code: 'ZB', name: 'Zürcher Bibel', language: 'German' },
      { code: 'GNB', name: 'Gute Nachricht Bibel 2018', language: 'German' },
      { code: 'NGÜ', name: 'Neue Genfer Übersetzung', language: 'German' },
      { code: 'EU', name: 'Einheitsübersetzung 2016', language: 'German' },
      { code: 'NLB', name: 'Neues Leben. Die Bibel', language: 'German' },
      { code: 'VXB', name: 'Volxbibel', language: 'German' },
      { code: 'NeÜ', name: 'Neue evangelistische Übersetzung', language: 'German' },
      { code: 'BIGS', name: 'Bibel in gerechter Sprache', language: 'German' },
      { code: 'NIV', name: 'New International Version', language: 'English' },
      { code: 'ESV', name: 'English Standard Version', language: 'English' },
      { code: 'LSG', name: 'Louis Segond 1910', language: 'French' },
      { code: 'NLT', name: 'New Living Translation', language: 'English' },
      { code: 'MSG', name: 'The Message', language: 'English' },
      { code: 'CEV', name: 'Contemporary English Version', language: 'English' },
      { code: 'GNT', name: 'Good News Translation', language: 'English' },
      { code: 'NKJV', name: 'New King James Version', language: 'English' },
      { code: 'KJV', name: 'King James Version', language: 'English' },
      { code: 'NASB', name: 'New American Standard Bible', language: 'English' },
      { code: 'CSB', name: 'Christian Standard Bible', language: 'English' },
      { code: 'BDS', name: 'Bible du Semeur', language: 'French' },
      { code: 'S21', name: 'Segond 21', language: 'French' },
      { code: 'RVR60', name: 'Reina-Valera 1960', language: 'Spanish' },
      { code: 'NVI', name: 'Nueva Versión Internacional', language: 'Spanish' },
      { code: 'DHH', name: 'Dios Habla Hoy', language: 'Spanish' },
      { code: 'RVR95', name: 'Reina-Valera 1995', language: 'Spanish' },
      { code: 'LBLA', name: 'La Biblia de las Américas', language: 'Spanish' },
      { code: 'NVT', name: 'Nueva Traducción Viviente', language: 'Spanish' },
    ];
  }

  // Formatiere Datum für API
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Parse deutsche Datumsstring (von Losungen API)
  parseGermanDate(dateString: string): Date | null {
    // Format: "Freitag, 01.08.2025" oder ISO Format "2025-08-01"
    
    // ISO Format (YYYY-MM-DD)
    const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Deutsches Format (DD.MM.YYYY)
    const germanMatch = dateString.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  }

  // Kirchenjahr API Methoden
  async getChurchEvents(action: 'today' | 'next' | 'upcoming' | 'date' | 'range' = 'upcoming', params?: any): Promise<ApiResponse<any[]>> {
    try {
      let url = `/church_events.php?action=${action}`;
      
      if (params) {
        if (params.date) url += `&date=${params.date}`;
        if (params.start) url += `&start=${params.start}`;
        if (params.end) url += `&end=${params.end}`;
        if (params.limit) url += `&limit=${params.limit}`;
      }
      
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: {
          'X-API-Key': this.getApiKey(),
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch church events');
      }
      
      return {
        success: true,
        data: data.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Church events API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  async getTodaysChurchEvents(): Promise<ApiResponse<any[]>> {
    return this.getChurchEvents('today');
  }

  async getNextChurchEvent(): Promise<ApiResponse<any[]>> {
    return this.getChurchEvents('next');
  }

  async getUpcomingChurchEvents(limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.getChurchEvents('upcoming', { limit });
  }

  async getChurchEventsForDate(date: string): Promise<ApiResponse<any[]>> {
    return this.getChurchEvents('date', { date });
  }

  async updateChurchEvent(event: any): Promise<ApiResponse<any>> {
    return this.request<any>('/church_events_update.php', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  // Gottesdienst-Management API Methoden
  
  // Alle Perikopen abrufen
  async getPerikopes(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/services.php?path=perikopes');
  }

  // Gottesdienste abrufen (mit Filtern)
  async getServices(filters?: {
    limit?: number;
    offset?: number;
    year?: number;
    type?: string;
  }): Promise<ApiResponse<any[]>> {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.type) params.append('type', filters.type);
      query = '&' + params.toString();
    }
    return this.request<any[]>(`/services.php?path=services${query}`);
  }

  // Einzelnen Gottesdienst abrufen
  async getService(serviceId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/services.php?path=service&id=${serviceId}`);
  }

  // Gottesdienste nach Perikope abrufen (historische Übersicht)
  async getServicesByPerikope(perikopeId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/services.php?path=services/by-perikope&perikope_id=${perikopeId}`);
  }

  // Kalender-Ansicht der Gottesdienste
  async getServicesCalendar(year: number, month?: number): Promise<ApiResponse<any[]>> {
    let query = `year=${year}`;
    if (month) query += `&month=${month}`;
    return this.request<any[]>(`/services.php?path=services/calendar&${query}`);
  }

  // Gottesdienste durchsuchen
  async searchServices(query: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/services.php?path=search&q=${encodeURIComponent(query)}`);
  }

  // Gottesdienst löschen
  async deleteService(serviceId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/services.php?path=service&id=${serviceId}`, {
      method: 'DELETE'
    });
  }

  // Neuen Gottesdienst erstellen
  async createService(serviceData: {
    title: string;
    service_type: string;
    date: string;
    time?: string;
    location?: string;
    perikope_id?: number;
    chosen_perikope?: string;
    congregation_size?: number;
    notes?: string;
    tags?: string[];
  }): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>('/services.php?path=service', {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
  }

  // Gottesdienst-Komponente erstellen
  async createServiceComponent(componentData: {
    service_id: number;
    component_type: string;
    title: string;
    content?: string;
    bible_reference?: string;
    bible_translation?: string;
    bible_text?: string;
    hymn_number?: string;
    order_position?: number;
    duration_minutes?: number;
    notes?: string;
  }): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>('/services.php?path=service/component', {
      method: 'POST',
      body: JSON.stringify(componentData)
    });
  }

  // Alle Komponenten eines Gottesdienstes löschen
  async deleteServiceComponents(serviceId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/services.php?path=service/components&service_id=${serviceId}`, {
      method: 'DELETE'
    });
  }
}

export const apiService = new ApiService();