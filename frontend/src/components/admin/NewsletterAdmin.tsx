import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  EnvelopeIcon,
  UserGroupIcon,
  ChartBarIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { NewsletterStats, NewsletterSubscriber } from '../../types/newsletter';

export const NewsletterAdmin: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState<'tageslosung' | 'sonntagsvorschau'>('tageslosung');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const apiKey = user?.apiKey || 'ksadh8324oijcff45rfdsvcvhoids44';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';

      // Stats laden
      const statsResponse = await fetch(`${baseUrl}/newsletter.php?action=admin_stats&api_key=${apiKey}`);
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Subscriber laden
      const subsResponse = await fetch(`${baseUrl}/newsletter.php?action=admin_list&api_key=${apiKey}&limit=20`);
      const subsData = await subsResponse.json();
      if (subsData.success) {
        setSubscribers(subsData.data.subscribers);
      }
    } catch (error) {
      console.error('Failed to load newsletter data:', error);
    }
    setLoading(false);
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';
      const response = await fetch(`${baseUrl}/newsletter.php?action=admin_send_test&api_key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, type: testType })
      });
      const data = await response.json();

      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Test-E-Mail gesendet' : 'Fehler beim Senden')
      });
    } catch (error) {
      setTestResult({ success: false, message: 'Verbindungsfehler' });
    }
    setTestLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'unsubscribed':
        return <XCircleIcon className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <EnvelopeIcon className="w-6 h-6 text-royal-600" />
            <h2 className="font-heading text-xl font-semibold">Newsletter-Verwaltung</h2>
          </div>
          <motion.button
            onClick={loadData}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Aktualisieren</span>
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.subscribers.confirmed}</p>
                <p className="text-sm text-gray-500">Bestätigt</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.subscribers.pending}</p>
                <p className="text-sm text-gray-500">Ausstehend</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-royal-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="w-5 h-5 text-royal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.content_preferences.with_tageslosung}</p>
                <p className="text-sm text-gray-500">Tageslosung</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.content_preferences.with_sonntagstexte}</p>
                <p className="text-sm text-gray-500">Sonntagstexte</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Email */}
      <div className="card p-6">
        <h3 className="font-heading text-lg font-semibold mb-4 flex items-center">
          <PaperAirplaneIcon className="w-5 h-5 mr-2 text-royal-600" />
          Test-E-Mail senden
        </h3>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
              className="input-field"
            >
              <option value="tageslosung">Tageslosung</option>
              <option value="sonntagsvorschau">Sonntagsvorschau</option>
            </select>
          </div>

          <motion.button
            onClick={sendTestEmail}
            disabled={testLoading || !testEmail}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center space-x-2"
          >
            {testLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
            <span>Senden</span>
          </motion.button>
        </div>

        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-3 rounded-lg ${
              testResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {testResult.message}
          </motion.div>
        )}
      </div>

      {/* Subscriber List */}
      <div className="card p-6">
        <h3 className="font-heading text-lg font-semibold mb-4 flex items-center">
          <UserGroupIcon className="w-5 h-5 mr-2 text-royal-600" />
          Neueste Abonnenten
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : subscribers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Abonnenten vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">E-Mail</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Inhalte</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Angemeldet</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(sub.status)}
                        <span className="capitalize text-xs">{sub.status}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-medium">{sub.email}</td>
                    <td className="py-2 px-2 text-gray-600">{sub.name || '-'}</td>
                    <td className="py-2 px-2">
                      <div className="flex space-x-1">
                        {sub.include_tageslosung && (
                          <span className="px-1.5 py-0.5 bg-royal-100 text-royal-700 rounded text-xs">TL</span>
                        )}
                        {sub.include_sonntagstexte && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">ST</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">
                      {formatDate(sub.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Stats */}
      {stats && stats.sends.length > 0 && (
        <div className="card p-6">
          <h3 className="font-heading text-lg font-semibold mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-royal-600" />
            Versand-Statistiken (letzte 7 Tage)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Datum</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Typ</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Gesendet</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Fehlgeschlagen</th>
                </tr>
              </thead>
              <tbody>
                {stats.sends.map((send, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">{send.date}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        send.email_type === 'tageslosung'
                          ? 'bg-royal-100 text-royal-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {send.email_type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-green-600 font-medium">{send.sent}</td>
                    <td className="py-2 px-2 text-right text-red-600">{send.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
