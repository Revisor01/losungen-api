import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { SearchInterface } from './components/search/SearchInterface';
import './styles/globals.css';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Später durch echte Authentifizierung ersetzen
  const [user] = useState({
    username: 'Demo User'
  });

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Schließe Menu bei Route-Wechsel
  const handleRouteChange = () => {
    setIsMenuOpen(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-subtle">
        <Header
          isMenuOpen={isMenuOpen}
          onMenuToggle={handleMenuToggle}
          user={user}
        />
        
        <main onClick={handleRouteChange}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchInterface />} />
            <Route path="/favorites" element={<FavoritesPlaceholder />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Placeholder-Komponente für Favoriten
const FavoritesPlaceholder: React.FC = () => (
  <div className="min-h-screen bg-gradient-subtle">
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold gradient-text mb-4">
          Favoriten
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Diese Funktion wird bald verfügbar sein.
        </p>
        <div className="card p-12">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="font-heading text-xl font-semibold text-gray-900 mb-2">
            Deine Lieblings-Bibelverse
          </h2>
          <p className="text-gray-600">
            Hier werden bald deine gespeicherten Bibelverse angezeigt.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default App;