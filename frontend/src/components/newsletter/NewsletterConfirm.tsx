import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

type Status = 'loading' | 'success' | 'error';

export const NewsletterConfirm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [preferencesToken, setPreferencesToken] = useState<string | null>(null);

  useEffect(() => {
    const confirmSubscription = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Ungültiger Bestätigungslink');
        return;
      }

      try {
        const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';
        const response = await fetch(`${baseUrl}/newsletter.php?action=confirm&token=${token}`);
        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Deine Anmeldung wurde bestätigt!');
          if (data.data?.preferences_token) {
            setPreferencesToken(data.data.preferences_token);
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Ein Fehler ist aufgetreten');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Verbindungsfehler. Bitte versuche es später erneut.');
      }
    };

    confirmSubscription();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 text-center"
        >
          {status === 'loading' && (
            <>
              <ArrowPathIcon className="w-16 h-16 text-royal-600 mx-auto mb-4 animate-spin" />
              <h1 className="font-heading text-xl font-bold text-gray-900">
                Bestätigung wird verarbeitet...
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">
                Erfolgreich bestätigt!
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                {preferencesToken && (
                  <Link
                    to={`/newsletter/preferences/${preferencesToken}`}
                    className="btn-primary w-full block"
                  >
                    Einstellungen anpassen
                  </Link>
                )}
                <Link
                  to="/"
                  className="btn-secondary w-full block"
                >
                  Zur Startseite
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExclamationCircleIcon className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">
                Fehler
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  to="/newsletter"
                  className="btn-primary w-full block"
                >
                  Erneut anmelden
                </Link>
                <Link
                  to="/"
                  className="btn-secondary w-full block"
                >
                  Zur Startseite
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
