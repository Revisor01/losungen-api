import { ApiResponse, DailyLosung, BibleSearchRequest, BibleSearchResult } from '../types';

class ApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // API URL basierend auf Environment
    this.baseUrl = process.env.REACT_APP_API_URL || (
      process.env.NODE_ENV === 'production' 
        ? window.location.origin 
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
    // Format: "Freitag, 01.08.2025"
    const match = dateString.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return null;
  }
}

export const apiService = new ApiService();