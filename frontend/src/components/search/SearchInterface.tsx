import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, BookOpenIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BibleTextDisplay } from '../bible/BibleTextDisplay';
import { TranslationSelector } from '../bible/TranslationSelector';
import { FormatSelector } from './FormatSelector';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { apiService } from '../../services/api';
import { BibleSearchRequest, BibleSearchResult } from '../../types';
import { BibleReferenceParser } from '../../utils/bibleParser';

export const SearchInterface: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState('LUT');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'text' | 'html' | 'markdown'>('json');
  const [searchResult, setSearchResult] = useState<BibleSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const availableTranslations = apiService.getAvailableTranslations();

  // Beispiel-Suchen für bessere UX (jetzt aus Parser)
  const exampleSearches = BibleReferenceParser.getExamples();

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    
    // Suggestions anzeigen
    if (value.length >= 2) {
      const bookSuggestions = BibleReferenceParser.getSuggestions(value);
      setSuggestions(bookSuggestions);
      setShowSuggestions(bookSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    // Parse und validiere Eingabe
    const parsed = BibleReferenceParser.parse(searchTerm.trim());
    const referenceToUse = parsed ? parsed.normalized : searchTerm.trim();

    const request: BibleSearchRequest = {
      reference: referenceToUse,
      translation: selectedTranslation,
      format: selectedFormat
    };

    try {
      const response = await apiService.searchBibleText(request);
      
      if (response.success && response.data) {
        setSearchResult(response.data);
        
        // Zur Suchhistorie hinzufügen
        setSearchHistory(prev => {
          const newHistory = [searchTerm.trim(), ...prev.filter(item => item !== searchTerm.trim())];
          return newHistory.slice(0, 5); // Nur die letzten 5 behalten
        });
      } else {
        setError(response.error || 'Bibelstelle nicht gefunden');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Suche');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setSearchTerm(example);
  };

  const handleHistoryClick = (historyItem: string) => {
    setSearchTerm(historyItem);
  };

  const clearSearch = () => {
    setSearchResult(null);
    setError(null);
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <BookOpenIcon className="w-8 h-8 text-royal-500 mr-3" />
            <h1 className="font-heading text-4xl font-bold gradient-text">
              Bibeltext-Suche
            </h1>
          </div>
          <p className="text-lg text-gray-600 font-body">
            Suche nach beliebigen Bibelversen in verschiedenen Übersetzungen
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Bibelstelle eingeben
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="z.B. Johannes 3,16 oder Psalm 23,1-6"
                  className="input-field pl-10 text-lg"
                  disabled={loading}
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Translation & Format Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Übersetzung
                </label>
                <TranslationSelector
                  selected={selectedTranslation}
                  onSelect={setSelectedTranslation}
                  available={availableTranslations}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <FormatSelector
                  selected={selectedFormat}
                  onSelect={(format) => setSelectedFormat(format as any)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading || !searchTerm.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Suche...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                    Suchen
                  </>
                )}
              </button>

              {(searchResult || error) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn-secondary"
                >
                  Neue Suche
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Example Searches */}
        {!searchResult && !error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
              Beispiel-Suchen
            </h3>
            <div className="flex flex-wrap gap-2">
              {exampleSearches.map((example, index) => (
                <motion.button
                  key={example}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-2 bg-royal-50 text-royal-700 rounded-lg text-sm font-medium hover:bg-royal-100 transition-colors"
                >
                  {example}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && !searchResult && !error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center mb-4">
              <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="font-heading text-lg font-semibold text-gray-900">
                Letzte Suchen
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, index) => (
                <motion.button
                  key={`${item}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleHistoryClick(item)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ErrorMessage
                message={error}
                onRetry={() => handleSearch({ preventDefault: () => {} } as any)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Result */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-6"
            >
              {/* Result Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl font-semibold text-gray-900">
                  Suchergebnis
                </h2>
                <div className="text-sm text-gray-500">
                  {searchResult.translation?.name} ({searchResult.translation?.code})
                </div>
              </div>

              {/* Bible Text Display */}
              <BibleTextDisplay
                verse={{
                  text: searchResult.text,
                  reference: searchResult.reference,
                  testament: searchResult.verses && searchResult.verses.length > 0 ? 'AT' : 'NT', // Vereinfacht
                  translation_source: searchResult.source,
                  bibleserver_url: searchResult.url
                }}
                showReference={true}
                showSource={true}
              />

              {/* Multiple Verses Display */}
              {searchResult.verses && searchResult.verses.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card p-6"
                >
                  <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                    Einzelverse im Detail
                  </h3>
                  <div className="space-y-4">
                    {searchResult.verses.map((verse, index) => (
                      <motion.div
                        key={verse.number}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex space-x-4 py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="flex-shrink-0 w-8 h-8 bg-royal-100 text-royal-700 rounded-full flex items-center justify-center text-sm font-semibold">
                          {verse.number}
                        </span>
                        <p className="flex-1 text-gray-700 leading-relaxed">
                          {verse.text}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Format Output (for non-JSON formats) */}
              {selectedFormat !== 'json' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="card p-6"
                >
                  <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                    {selectedFormat.toUpperCase()} Format
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {selectedFormat === 'text' ? searchResult.text :
                       selectedFormat === 'markdown' ? `## ${searchResult.reference}\n\n> ${searchResult.text}\n\n*— ${searchResult.translation?.name}*` :
                       selectedFormat === 'html' ? `<div class="bible-verse">\n  <h3>${searchResult.reference}</h3>\n  <blockquote>${searchResult.text}</blockquote>\n  <footer>${searchResult.translation?.name}</footer>\n</div>` :
                       JSON.stringify(searchResult, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};