export interface NewsletterSubscription {
  email: string;
  name?: string;
  include_tageslosung: boolean;
  include_sonntagstexte: boolean;
  translations: string[];
  delivery_days_tageslosung: number[];
  delivery_days_sonntag: number[];
  delivery_hour: number;
}

export interface NewsletterPreferences {
  include_tageslosung: boolean;
  include_sonntagstexte: boolean;
  include_predigttext: boolean;
  include_lesungen: boolean;
  include_psalm: boolean;
  include_wochenspruch: boolean;
  translations: string[];
  delivery_days_tageslosung: number[];
  delivery_days_sonntag: number[];
  delivery_hour: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  created_at: string;
  confirmed_at: string | null;
  include_tageslosung: boolean;
  include_sonntagstexte: boolean;
  translations: string;
}

export interface NewsletterStats {
  subscribers: {
    confirmed: number;
    pending: number;
    unsubscribed: number;
    total: number;
  };
  sends: Array<{
    date: string;
    email_type: string;
    total: number;
    sent: number;
    failed: number;
  }>;
  content_preferences: {
    with_tageslosung: number;
    with_sonntagstexte: number;
  };
}
