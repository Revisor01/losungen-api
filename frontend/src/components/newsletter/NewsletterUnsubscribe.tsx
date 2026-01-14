import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

type Status = 'confirm' | 'loading' | 'success' | 'error';

export const NewsletterUnsubscribe: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('confirm');
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Ungültiger Abmeldelink');
      return;
    }

    setStatus('loading');

    try {
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8374';
      const response = await fetch(`${baseUrl}/newsletter.php?action=unsubscribe&token=${token}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Du wurdest erfolgreich abgemeldet');
      } else {
        setStatus('error');
        setMessage(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Verbindungsfehler. Bitte versuche es später erneut.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 text-center"
        >
          {status === 'confirm' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExclamationTriangleIcon className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">
                Newsletter abbestellen?
              </h1>
              <p className="text-gray-600 mb-6">
                Möchtest du den Losungen Newsletter wirklich abbestellen?
                Du erhältst dann keine E-Mails mehr von uns.
              </p>
              <div className="space-y-3">
                <motion.button
                  onClick={handleUnsubscribe}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Ja, abmelden
                </motion.button>
                <Link
                  to={`/newsletter/preferences/${token}`}
                  className="btn-secondary w-full block"
                >
                  Nein, Einstellungen anpassen
                </Link>
              </div>
            </>
          )}

          {status === 'loading' && (
            <>
              <ArrowPathIcon className="w-16 h-16 text-royal-600 mx-auto mb-4 animate-spin" />
              <h1 className="font-heading text-xl font-bold text-gray-900">
                Wird verarbeitet...
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">
                Abmeldung erfolgreich
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Du kannst dich jederzeit wieder anmelden.
              </p>
              <div className="space-y-3">
                <Link to="/newsletter" className="btn-primary w-full block">
                  Wieder anmelden
                </Link>
                <Link to="/" className="btn-secondary w-full block">
                  Zur Startseite
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-gray-900 mb-4">
                Fehler
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStatus('confirm')}
                  className="btn-primary w-full"
                >
                  Erneut versuchen
                </button>
                <Link to="/" className="btn-secondary w-full block">
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
