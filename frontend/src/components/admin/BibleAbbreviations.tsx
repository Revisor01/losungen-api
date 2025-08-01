import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';

interface Abbreviation {
  id?: number;
  book_name: string;
  abbreviations: string[];
}

export const BibleAbbreviations: React.FC = () => {
  const [abbreviations, setAbbreviations] = useState<Abbreviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newBook, setNewBook] = useState({ book_name: '', abbreviations: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAbbreviations();
  }, []);

  const loadAbbreviations = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual API call
      const mockData: Abbreviation[] = [
        { id: 1, book_name: '1. Mose', abbreviations: ['Gen', 'Genesis', '1Mo', '1M', '1Mose'] },
        { id: 2, book_name: '2. Mose', abbreviations: ['Ex', 'Exodus', '2Mo', '2M', '2Mose'] },
        { id: 3, book_name: 'Matthäus', abbreviations: ['Mt', 'Matt', 'Matthew'] },
        { id: 4, book_name: 'Markus', abbreviations: ['Mk', 'Mark'] },
        { id: 5, book_name: 'Lukas', abbreviations: ['Lk', 'Luke'] },
      ];
      setAbbreviations(mockData);
    } catch (err) {
      setError('Failed to load abbreviations');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!newBook.book_name || !newBook.abbreviations) return;
    
    const abbrevArray = newBook.abbreviations.split(',').map(a => a.trim()).filter(a => a);
    const newAbbrev: Abbreviation = {
      book_name: newBook.book_name,
      abbreviations: abbrevArray
    };
    
    setAbbreviations([...abbreviations, newAbbrev]);
    setNewBook({ book_name: '', abbreviations: '' });
  };

  const handleDelete = (id: number | undefined) => {
    if (!id) return;
    setAbbreviations(abbreviations.filter(a => a.id !== id));
  };

  const handleEdit = (abbrev: Abbreviation) => {
    setEditingId(abbrev.id || null);
  };

  const handleUpdate = (abbrev: Abbreviation, newAbbrevs: string) => {
    const abbrevArray = newAbbrevs.split(',').map(a => a.trim()).filter(a => a);
    const updated = abbreviations.map(a => 
      a.id === abbrev.id ? { ...a, abbreviations: abbrevArray } : a
    );
    setAbbreviations(updated);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
          Bibel-Abkürzungen verwalten
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Hier können Sie die Abkürzungen für Bibelbücher verwalten. Diese werden für die Bibelstellen-Suche verwendet.
        </p>

        {/* Add new book */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Neues Buch hinzufügen</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buchname (z.B. 1. Mose)"
              value={newBook.book_name}
              onChange={(e) => setNewBook({ ...newBook, book_name: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Abkürzungen (kommagetrennt)"
              value={newBook.abbreviations}
              onChange={(e) => setNewBook({ ...newBook, abbreviations: e.target.value })}
              className="input-field"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              disabled={!newBook.book_name || !newBook.abbreviations}
              className="btn-primary disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Hinzufügen
            </motion.button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Beispiel Abkürzungen: Gen, Genesis, 1Mo, 1M, 1Mose
          </p>
        </div>

        {/* Abbreviations list */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-royal-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <>
              {abbreviations.map((abbrev) => (
                <motion.div
                  key={abbrev.id || abbrev.book_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{abbrev.book_name}</h5>
                    {editingId === abbrev.id ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="text"
                          defaultValue={abbrev.abbreviations.join(', ')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdate(abbrev, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 input-field text-sm"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleUpdate(abbrev, input.value);
                          }}
                          className="p-1.5 rounded bg-green-100 hover:bg-green-200"
                        >
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          <XMarkIcon className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {abbrev.abbreviations.map((a, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(abbrev)}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(abbrev.id)}
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Hinweis für BIGS-URLs</h4>
        <p className="text-sm text-blue-800">
          Die Abkürzungen für die "Bibel in gerechter Sprache" (BIGS) sind fest einprogrammiert, 
          da sie für die korrekte URL-Generierung und das Scraping benötigt werden.
        </p>
      </div>
    </div>
  );
};