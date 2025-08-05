import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { SearchInterface } from './components/search/SearchInterface';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { AdminPanel } from './components/admin/AdminPanel';
import { FavoritesList } from './components/favorites/FavoritesList';
import { ChurchYearCalendar } from './components/church/ChurchYearCalendar';
import { ServiceEditor } from './components/services/ServiceEditor';
import { ServicesOverview } from './components/services/ServicesOverview';
import { ServicesHub } from './components/services/ServicesHub';
import './styles/globals.css';

function AppContent() {
  const { isAuthenticated, login, user } = useAuth();
  const [loginError, setLoginError] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = (username: string, password: string) => {
    const success = login(username, password);
    if (!success) {
      setLoginError('Ungültige Anmeldedaten. Bitte versuche es erneut.');
    } else {
      setLoginError('');
    }
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleRouteChange = () => {
    setIsMenuOpen(false);
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={loginError} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-subtle">
        <Header
          isMenuOpen={isMenuOpen}
          onMenuToggle={handleMenuToggle}
          user={{ username: user?.username || 'Unbekannt' }}
        />
        
        <main onClick={handleRouteChange}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchInterface />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/favorites" element={<FavoritesList />} />
            <Route path="/kirchenjahr" element={<ChurchYearCalendar />} />
            <Route path="/services" element={<ServicesHub />} />
            <Route path="/services/overview" element={<ServicesOverview />} />
            <Route path="/service/:serviceId" element={<ServiceEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <AppContent />
      </FavoritesProvider>
    </AuthProvider>
  );
}


export default App;