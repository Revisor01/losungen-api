import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BibleVerse } from '../types';

interface FavoriteVerse extends BibleVerse {
  id: string;
  addedAt: string;
  tags?: string[];
  note?: string;
}

interface FavoritesContextType {
  favorites: FavoriteVerse[];
  addFavorite: (verse: BibleVerse, note?: string, tags?: string[]) => void;
  removeFavorite: (id: string) => void;
  removeFavoriteByReference: (reference: string) => void;
  updateFavorite: (id: string, updates: Partial<FavoriteVerse>) => void;
  isFavorite: (reference: string) => boolean;
  getFavoriteById: (id: string) => FavoriteVerse | undefined;
  searchFavorites: (query: string) => FavoriteVerse[];
  getFavoritesByTag: (tag: string) => FavoriteVerse[];
  getAllTags: () => string[];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem('biblescraper_favorites');
    if (storedFavorites) {
      try {
        const parsed = JSON.parse(storedFavorites);
        setFavorites(parsed);
      } catch (error) {
        console.error('Failed to parse stored favorites:', error);
        localStorage.removeItem('biblescraper_favorites');
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('biblescraper_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (verse: BibleVerse, note?: string, tags?: string[]) => {
    const newFavorite: FavoriteVerse = {
      ...verse,
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      note,
      tags: tags || []
    };

    setFavorites(prev => [newFavorite, ...prev]);
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };

  const updateFavorite = (id: string, updates: Partial<FavoriteVerse>) => {
    setFavorites(prev => prev.map(fav => 
      fav.id === id ? { ...fav, ...updates } : fav
    ));
  };

  const isFavorite = (reference: string) => {
    return favorites.some(fav => fav.reference === reference);
  };

  const removeFavoriteByReference = (reference: string) => {
    setFavorites(prev => prev.filter(fav => fav.reference !== reference));
  };

  const getFavoriteById = (id: string) => {
    return favorites.find(fav => fav.id === id);
  };

  const searchFavorites = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return favorites.filter(fav => 
      fav.text.toLowerCase().includes(lowerQuery) ||
      fav.reference.toLowerCase().includes(lowerQuery) ||
      fav.note?.toLowerCase().includes(lowerQuery) ||
      fav.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  };

  const getFavoritesByTag = (tag: string) => {
    return favorites.filter(fav => 
      fav.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  };

  const getAllTags = () => {
    const allTags = favorites.flatMap(fav => fav.tags || []);
    return Array.from(new Set(allTags)).sort();
  };

  const value: FavoritesContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    removeFavoriteByReference,
    updateFavorite,
    isFavorite,
    getFavoriteById,
    searchFavorites,
    getFavoritesByTag,
    getAllTags
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};