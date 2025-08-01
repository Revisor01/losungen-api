import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon, 
  MagnifyingGlassIcon, 
  TagIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useFavorites } from '../../context/FavoritesContext';
import { BibleTextDisplay } from '../bible/BibleTextDisplay';

export const FavoritesList: React.FC = () => {
  const { 
    favorites, 
    removeFavorite, 
    updateFavorite, 
    searchFavorites, 
    getFavoritesByTag, 
    getAllTags 
  } = useFavorites();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  
  const allTags = getAllTags();
  
  // Filtered favorites based on search and tag
  const filteredFavorites = React.useMemo(() => {
    let filtered = favorites;
    
    if (searchQuery) {
      filtered = searchFavorites(searchQuery);
    }
    
    if (selectedTag) {
      filtered = filtered.filter(fav => 
        fav.tags?.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
      );
    }
    
    return filtered;
  }, [favorites, searchQuery, selectedTag, searchFavorites]);

  const handleEditNote = (id: string, currentNote: string = '') => {
    setEditingNote(id);
    setTempNote(currentNote);
  };

  const handleSaveNote = (id: string) => {
    updateFavorite(id, { note: tempNote.trim() || undefined });
    setEditingNote(null);
    setTempNote('');
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setTempNote('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="mb-8">
              <HeartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                Deine Favoriten
              </h1>
              <p className="text-gray-600">
                Du hast noch keine Lieblings-Bibelverse gespeichert.
              </p>
            </div>
            
            <div className="card p-8 max-w-md mx-auto">
              <BookOpenIcon className="w-12 h-12 text-royal-600 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">
                Wie speichere ich Verse?
              </h3>
              <p className="text-sm text-gray-600">
                Klicke auf das Herz-Symbol bei jedem Bibelvers, um ihn zu deinen Favoriten hinzuzufügen.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <HeartSolidIcon className="w-8 h-8 text-red-500" />
            <h1 className="font-heading text-3xl font-bold text-gray-900">
              Deine Favoriten
            </h1>
            <span className="bg-royal-100 text-royal-800 px-3 py-1 rounded-full text-sm font-medium">
              {favorites.length}
            </span>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Favoriten durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            
            {allTags.length > 0 && (
              <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="input-field pl-10 pr-8"
                >
                  <option value="">Alle Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Favorites List */}
        <div className="space-y-6">
          <AnimatePresence>
            {filteredFavorites.map((favorite) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card p-6"
              >
                {/* Header with actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatDate(favorite.addedAt)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditNote(favorite.id, favorite.note)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Notiz bearbeiten"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeFavorite(favorite.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Aus Favoriten entfernen"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Bible Text */}
                <BibleTextDisplay 
                  verse={favorite} 
                  showReference={true}
                  showSource={true}
                />

                {/* Tags */}
                {favorite.tags && favorite.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {favorite.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-royal-50 text-royal-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Note Section */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  {editingNote === favorite.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        placeholder="Füge eine persönliche Notiz hinzu..."
                        className="input-field resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={() => handleSaveNote(favorite.id)}
                          className="btn-primary text-sm px-3 py-1"
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  ) : favorite.note ? (
                    <div 
                      className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleEditNote(favorite.id, favorite.note)}
                    >
                      <div className="flex items-start space-x-2">
                        <PencilIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="italic">{favorite.note}</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditNote(favorite.id)}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span>Notiz hinzufügen...</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* No results message */}
        {filteredFavorites.length === 0 && (searchQuery || selectedTag) && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">
              Keine Ergebnisse gefunden
            </h3>
            <p className="text-gray-600">
              {searchQuery && selectedTag 
                ? `Keine Favoriten für "${searchQuery}" mit Tag "${selectedTag}" gefunden.`
                : searchQuery 
                ? `Keine Favoriten für "${searchQuery}" gefunden.`
                : `Keine Favoriten mit Tag "${selectedTag}" gefunden.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};