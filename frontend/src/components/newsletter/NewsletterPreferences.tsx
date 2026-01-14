import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cog6ToothIcon,
  CheckIcon,
  ArrowPathIcon,
  BookOpenIcon,
  SunIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { NewsletterPreferences as Preferences } from '../../types/newsletter';

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' }
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 5); // 5:00 - 18:00

export const NewsletterPreferences: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const availableTranslations = apiService.getAvailableTranslations();
  const germanTranslations = availableTranslations.filter(t => t.language === 'German');

  useEffect(() => {
    const loadPreferences = async () => {
      if (!token) {
        setError('Ungültiger Link');
        setLoading(false);
        return;
      }

      try {
        const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';
        const response = await fetch(`${baseUrl}/newsletter.php?action=preferences&token=${token}`);
        const data = await response.json();

        if (data.success) {
          setEmail(data.data.email);
          setName(data.data.name || '');
          setPreferences(data.data.preferences);
        } else {
          setError(data.error || 'Fehler beim Laden');
        }
      } catch (err) {
        setError('Verbindungsfehler');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [token]);

  const handleSave = async () => {
    if (!token || !preferences) return;

    setSaving(true);
    setError(null);

    try {
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';
      const response = await fetch(`${baseUrl}/newsletter.php?action=preferences&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...preferences
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Fehler beim Speichern');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof Preferences, value: any) => {
    if (preferences) {
      setPreferences({ ...preferences, [key]: value });
    }
  };

  const toggleTranslation = (code: string) => {
    if (!preferences) return;
    const current = preferences.translations;
    if (current.includes(code)) {
      if (current.length > 1) {
        updatePreference('translations', current.filter(t => t !== code));
      }
    } else {
      updatePreference('translations', [...current, code]);
    }
  };

  const toggleDay = (day: number, type: 'tageslosung' | 'sonntag') => {
    if (!preferences) return;
    const key = type === 'tageslosung' ? 'delivery_days_tageslosung' : 'delivery_days_sonntag';
    const current = preferences[key];
    if (current.includes(day)) {
      updatePreference(key, current.filter(d => d !== day));
    } else {
      updatePreference(key, [...current, day].sort());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle py-12 flex items-center justify-center">
        <ArrowPathIcon className="w-8 h-8 text-royal-600 animate-spin" />
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="min-h-screen bg-gradient-subtle py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="card p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link to="/newsletter" className="btn-primary">
              Neu anmelden
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-royal-100 rounded-full flex items-center justify-center">
              <Cog6ToothIcon className="w-6 h-6 text-royal-600" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                Newsletter-Einstellungen
              </h1>
              <p className="text-gray-500 text-sm">{email}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center"
            >
              <CheckIcon className="w-5 h-5 mr-2" />
              Einstellungen gespeichert
            </motion.div>
          )}

          {preferences && (
            <div className="space-y-8">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  className="input-field w-full max-w-xs"
                />
              </div>

              {/* Content Types */}
              <div>
                <h2 className="font-heading text-lg font-semibold mb-4">Inhalte</h2>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    preferences.include_tageslosung ? 'border-royal-500 bg-royal-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preferences.include_tageslosung}
                      onChange={(e) => updatePreference('include_tageslosung', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                      preferences.include_tageslosung ? 'border-royal-500 bg-royal-500' : 'border-gray-300'
                    }`}>
                      {preferences.include_tageslosung && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <BookOpenIcon className="w-5 h-5 text-royal-600 mr-2" />
                    <span className="font-medium">Tageslosung</span>
                  </label>

                  <label className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    preferences.include_sonntagstexte ? 'border-royal-500 bg-royal-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preferences.include_sonntagstexte}
                      onChange={(e) => updatePreference('include_sonntagstexte', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                      preferences.include_sonntagstexte ? 'border-royal-500 bg-royal-500' : 'border-gray-300'
                    }`}>
                      {preferences.include_sonntagstexte && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <SunIcon className="w-5 h-5 text-royal-600 mr-2" />
                    <span className="font-medium">Sonntagstexte</span>
                  </label>
                </div>
              </div>

              {/* Translations */}
              <div>
                <h2 className="font-heading text-lg font-semibold mb-4">Übersetzungen</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {germanTranslations.map((trans) => (
                    <button
                      key={trans.code}
                      onClick={() => toggleTranslation(trans.code)}
                      className={`p-2 rounded-lg border-2 text-center transition-all ${
                        preferences.translations.includes(trans.code)
                          ? 'border-royal-500 bg-royal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-sm">{trans.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-6">
                <h2 className="font-heading text-lg font-semibold">Versand</h2>

                {preferences.include_tageslosung && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Tageslosung an welchen Tagen?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleDay(day.value, 'tageslosung')}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            preferences.delivery_days_tageslosung.includes(day.value)
                              ? 'bg-royal-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {preferences.include_sonntagstexte && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Sonntagsvorschau an welchen Tagen?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.filter(d => d.value !== 0).map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleDay(day.value, 'sonntag')}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            preferences.delivery_days_sonntag.includes(day.value)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    Versandzeit (Uhr)
                  </p>
                  <select
                    value={preferences.delivery_hour}
                    onChange={(e) => updatePreference('delivery_hour', parseInt(e.target.value))}
                    className="input-field w-32"
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}:00
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Zeitzone: Europe/Berlin
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Link
                  to={`/newsletter/unsubscribe/${token}`}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Newsletter abbestellen
                </Link>

                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : saved ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Gespeichert
                    </>
                  ) : (
                    'Speichern'
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
