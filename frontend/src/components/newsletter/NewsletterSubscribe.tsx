import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  EnvelopeIcon,
  CheckIcon,
  BookOpenIcon,
  SunIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';

type Step = 'email' | 'content' | 'translations' | 'schedule' | 'success';

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

export const NewsletterSubscribe: React.FC = () => {
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [includeTageslosung, setIncludeTageslosung] = useState(true);
  const [includeSonntagstexte, setIncludeSonntagstexte] = useState(true);
  const [translations, setTranslations] = useState<string[]>(['LUT']);
  const [deliveryDaysTageslosung, setDeliveryDaysTageslosung] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [deliveryDaysSonntag, setDeliveryDaysSonntag] = useState<number[]>([4, 6]);
  const [deliveryHour, setDeliveryHour] = useState(6);

  const availableTranslations = apiService.getAvailableTranslations();
  const germanTranslations = availableTranslations.filter(t => t.language === 'German');

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';
      const response = await fetch(`${baseUrl}/newsletter.php?action=subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          include_tageslosung: includeTageslosung,
          include_sonntagstexte: includeSonntagstexte,
          translations,
          delivery_days_tageslosung: deliveryDaysTageslosung,
          delivery_days_sonntag: deliveryDaysSonntag,
          delivery_hour: deliveryHour
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTranslation = (code: string) => {
    if (translations.includes(code)) {
      if (translations.length > 1) {
        setTranslations(translations.filter(t => t !== code));
      }
    } else {
      setTranslations([...translations, code]);
    }
  };

  const toggleDay = (day: number, type: 'tageslosung' | 'sonntag') => {
    if (type === 'tageslosung') {
      if (deliveryDaysTageslosung.includes(day)) {
        setDeliveryDaysTageslosung(deliveryDaysTageslosung.filter(d => d !== day));
      } else {
        setDeliveryDaysTageslosung([...deliveryDaysTageslosung, day].sort());
      }
    } else {
      if (deliveryDaysSonntag.includes(day)) {
        setDeliveryDaysSonntag(deliveryDaysSonntag.filter(d => d !== day));
      } else {
        setDeliveryDaysSonntag([...deliveryDaysSonntag, day].sort());
      }
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'email':
        return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      case 'content':
        return includeTageslosung || includeSonntagstexte;
      case 'translations':
        return translations.length > 0;
      case 'schedule':
        return (includeTageslosung && deliveryDaysTageslosung.length > 0) ||
               (includeSonntagstexte && deliveryDaysSonntag.length > 0) ||
               (!includeTageslosung && !includeSonntagstexte);
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['email', 'content', 'translations', 'schedule'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['email', 'content', 'translations', 'schedule'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-subtle py-12">
        <div className="max-w-lg mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckIcon className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">
              Fast geschafft!
            </h1>
            <p className="text-gray-600 mb-6">
              Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
              Bitte klicke auf den Link in der E-Mail, um deine Anmeldung abzuschließen.
            </p>
            <p className="text-sm text-gray-500">
              Keine E-Mail erhalten? Prüfe deinen Spam-Ordner oder{' '}
              <button
                onClick={() => { setStep('email'); setError(null); }}
                className="text-royal-600 hover:underline"
              >
                versuche es erneut
              </button>
              .
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12">
      <div className="max-w-lg mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-royal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <EnvelopeIcon className="w-8 h-8 text-royal-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              Newsletter abonnieren
            </h1>
            <p className="text-gray-600 mt-2">
              Erhalte die Tageslosung und Gottesdienst-Texte per E-Mail
            </p>
          </div>

          {/* Progress */}
          <div className="flex justify-center mb-8">
            {['email', 'content', 'translations', 'schedule'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${
                  step === s ? 'bg-royal-600' :
                  ['email', 'content', 'translations', 'schedule'].indexOf(step) > i
                    ? 'bg-royal-400' : 'bg-gray-300'
                }`} />
                {i < 3 && <div className={`w-12 h-0.5 ${
                  ['email', 'content', 'translations', 'schedule'].indexOf(step) > i
                    ? 'bg-royal-400' : 'bg-gray-300'
                }`} />}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Step: Email */}
          {step === 'email' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  className="input-field w-full"
                />
              </div>
            </motion.div>
          )}

          {/* Step: Content */}
          {step === 'content' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-600 mb-4">
                Welche Inhalte möchtest du erhalten?
              </p>

              <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                includeTageslosung ? 'border-royal-500 bg-royal-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={includeTageslosung}
                  onChange={(e) => setIncludeTageslosung(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 flex items-center justify-center ${
                  includeTageslosung ? 'border-royal-500 bg-royal-500' : 'border-gray-300'
                }`}>
                  {includeTageslosung && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="flex items-center">
                    <BookOpenIcon className="w-5 h-5 text-royal-600 mr-2" />
                    <span className="font-medium">Tageslosung</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Die tägliche Losung mit Losung und Lehrtext
                  </p>
                </div>
              </label>

              <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                includeSonntagstexte ? 'border-royal-500 bg-royal-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={includeSonntagstexte}
                  onChange={(e) => setIncludeSonntagstexte(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 flex items-center justify-center ${
                  includeSonntagstexte ? 'border-royal-500 bg-royal-500' : 'border-gray-300'
                }`}>
                  {includeSonntagstexte && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="flex items-center">
                    <SunIcon className="w-5 h-5 text-royal-600 mr-2" />
                    <span className="font-medium">Sonntagstexte</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Predigttext, Lesungen und Wochenpsalm vor dem Sonntag
                  </p>
                </div>
              </label>
            </motion.div>
          )}

          {/* Step: Translations */}
          {step === 'translations' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-sm text-gray-600 mb-4">
                Wähle deine bevorzugten Übersetzungen:
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {germanTranslations.map((trans) => (
                  <button
                    key={trans.code}
                    onClick={() => toggleTranslation(trans.code)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      translations.includes(trans.code)
                        ? 'border-royal-500 bg-royal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{trans.code}</span>
                    <span className="text-xs text-gray-500 block truncate">{trans.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Ausgewählt: {translations.join(', ')}
              </p>
            </motion.div>
          )}

          {/* Step: Schedule */}
          {step === 'schedule' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {includeTageslosung && (
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
                          deliveryDaysTageslosung.includes(day.value)
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

              {includeSonntagstexte && (
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
                          deliveryDaysSonntag.includes(day.value)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tipp: Donnerstag und Samstag sind ideal zur Vorbereitung
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Versandzeit (Uhr)
                </p>
                <select
                  value={deliveryHour}
                  onChange={(e) => setDeliveryHour(parseInt(e.target.value))}
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
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step !== 'email' ? (
              <button
                onClick={prevStep}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Zurück
              </button>
            ) : (
              <div />
            )}

            <motion.button
              onClick={nextStep}
              disabled={!canProceed() || loading}
              whileHover={{ scale: canProceed() ? 1.02 : 1 }}
              whileTap={{ scale: canProceed() ? 0.98 : 1 }}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Wird gesendet...'
              ) : step === 'schedule' ? (
                <>
                  Anmelden
                  <CheckIcon className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Weiter
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Privacy note */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Deine Daten werden nur für den Newsletter-Versand verwendet.
          Du kannst dich jederzeit abmelden.
        </p>
      </div>
    </div>
  );
};
