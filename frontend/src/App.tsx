import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { ServiceCelebration } from './components/services/ServiceCelebration';
import { ServicesOverview } from './components/services/ServicesOverview';
import { ServicesHub } from './components/services/ServicesHub';
import { NewsletterSubscribe } from './components/newsletter/NewsletterSubscribe';
import { NewsletterConfirm } from './components/newsletter/NewsletterConfirm';
import { NewsletterPreferences } from './components/newsletter/NewsletterPreferences';
import { NewsletterUnsubscribe } from './components/newsletter/NewsletterUnsubscribe';
import './styles/globals.css';

// Wrapper für geschützte Routen
function ProtectedRoutes() {
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
          <Route path="/service/:serviceId/celebrate" element={<ServiceCelebration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppContent() {
  const location = useLocation();

  // Newsletter-Routen sind öffentlich (ohne Auth)
  const isNewsletterRoute = location.pathname.startsWith('/newsletter');

  if (isNewsletterRoute) {
    return (
      <Routes>
        <Route path="/newsletter" element={<NewsletterSubscribe />} />
        <Route path="/newsletter/confirm/:token" element={<NewsletterConfirm />} />
        <Route path="/newsletter/preferences/:token" element={<NewsletterPreferences />} />
        <Route path="/newsletter/unsubscribe/:token" element={<NewsletterUnsubscribe />} />
      </Routes>
    );
  }

  return <ProtectedRoutes />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </AuthProvider>
    </Router>
  );
}


export default App;