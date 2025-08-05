import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  DocumentTextIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Service {
  id: number;
  title: string;
  service_type: string;
  date: string;
  time: string;
  location: string;
  congregation_size?: number;
  event_name?: string;
  liturgical_color?: string;
  component_count: number;
}

export const ServicesHub: React.FC = () => {
  const navigate = useNavigate();
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [upcomingServices, setUpcomingServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalServices: 0,
    thisMonth: 0,
    thisYear: 0
  });

  useEffect(() => {
    loadServicesData();
  }, []);

  const loadServicesData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Load all services for this year
      const response = await apiService.getServices({
        year: currentYear,
        limit: 50
      });
      
      if (response.success && response.data) {
        const allServices = response.data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Separate upcoming and recent services
        const upcoming = allServices
          .filter(s => new Date(s.date) >= today)
          .slice(0, 3);
          
        const recent = allServices
          .filter(s => new Date(s.date) < today)
          .slice(0, 3);

        setUpcomingServices(upcoming);
        setRecentServices(recent);

        // Calculate stats
        const thisMonth = allServices.filter(s => {
          const serviceDate = new Date(s.date);
          return serviceDate.getMonth() === today.getMonth() && 
                 serviceDate.getFullYear() === today.getFullYear();
        }).length;

        setStats({
          totalServices: allServices.length,
          thisMonth,
          thisYear: allServices.length
        });
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      regular: 'blue',
      wedding: 'pink',
      funeral: 'gray',
      baptism: 'cyan',
      confirmation: 'green',
      special: 'purple'
    };
    return colors[type] || 'gray';
  };

  const getServiceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      regular: 'Regulär',
      wedding: 'Hochzeit',
      funeral: 'Beerdigung',
      baptism: 'Taufe',
      confirmation: 'Konfirmation',
      special: 'Besonderer'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                Gottesdienst-Verwaltung
              </h1>
              <p className="text-gray-600">
                Plane, verwalte und teile deine Gottesdienste
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/kirchenjahr')}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Neuer Gottesdienst</span>
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.thisYear}</div>
              <div className="text-sm text-blue-700">Gottesdienste {new Date().getFullYear()}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{stats.thisMonth}</div>
              <div className="text-sm text-green-700">Diesen Monat</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {upcomingServices.length}
              </div>
              <div className="text-sm text-purple-700">Kommende Gottesdienste</div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/services/overview')}
            className="card p-6 hover:shadow-lg transition-all group"
          >
            <ListBulletIcon className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 mb-2">Alle Gottesdienste</h3>
            <p className="text-sm text-gray-600">Übersicht und Verwaltung</p>
            <ArrowRightIcon className="w-4 h-4 text-gray-400 mt-2 group-hover:text-blue-600 transition-colors" />
           </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/services?view=calendar')}
            className="card p-6 hover:shadow-lg transition-all group"
          >
            <CalendarIcon className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 mb-2">Kalender-Ansicht</h3>
            <p className="text-sm text-gray-600">Monats- und Jahresübersicht</p>
            <ArrowRightIcon className="w-4 h-4 text-gray-400 mt-2 group-hover:text-green-600 transition-colors" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/services?search=true')}
            className="card p-6 hover:shadow-lg transition-all group"
          >
            <MagnifyingGlassIcon className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 mb-2">Suche & Filter</h3>
            <p className="text-sm text-gray-600">Nach Typ, Text oder Tag</p>
            <ArrowRightIcon className="w-4 h-4 text-gray-400 mt-2 group-hover:text-purple-600 transition-colors" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/kirchenjahr')}
            className="card p-6 hover:shadow-lg transition-all group"
          >
            <ViewColumnsIcon className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 mb-2">Kirchenjahr</h3>
            <p className="text-sm text-gray-600">Feste und Perikopen</p>
            <ArrowRightIcon className="w-4 h-4 text-gray-400 mt-2 group-hover:text-orange-600 transition-colors" />
          </motion.button>
        </motion.div>

        {/* Upcoming Services */}
        {upcomingServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-semibold text-gray-900">
                Kommende Gottesdienste
              </h2>
              <button
                onClick={() => navigate('/services/overview')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Alle anzeigen →
              </button>
            </div>

            <div className="grid gap-4">
              {upcomingServices.map((service, index) => {
                const color = getServiceTypeColor(service.service_type);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/service/${service.id}`)}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 bg-${color}-500 rounded-full`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{service.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {new Date(service.date).toLocaleDateString('de-DE')}
                          </span>
                          <span className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {service.time}
                          </span>
                          {service.congregation_size && (
                            <span className="flex items-center">
                              <UsersIcon className="w-4 h-4 mr-1" />
                              {service.congregation_size}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 bg-${color}-100 text-${color}-700 rounded text-xs font-medium`}>
                        {getServiceTypeLabel(service.service_type)}
                      </span>
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                        {service.component_count} Komponenten
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent Services */}
        {recentServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-semibold text-gray-900">
                Kürzlich abgehalten
              </h2>
              <button
                onClick={() => navigate('/services/overview')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Alle anzeigen →
              </button>
            </div>

            <div className="grid gap-4">
              {recentServices.map((service, index) => {
                const color = getServiceTypeColor(service.service_type);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/service/${service.id}`)}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors opacity-75 hover:opacity-100"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 bg-${color}-400 rounded-full`}></div>
                      <div>
                        <h3 className="font-medium text-gray-800">{service.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {new Date(service.date).toLocaleDateString('de-DE')}
                          </span>
                          <span className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {service.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 bg-${color}-100 text-${color}-600 rounded text-xs font-medium`}>
                        {getServiceTypeLabel(service.service_type)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* No Services State */}
        {upcomingServices.length === 0 && recentServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-12 text-center"
          >
            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-semibold text-gray-900 mb-2">
              Noch keine Gottesdienste
            </h3>
            <p className="text-gray-600 mb-6">
              Beginne mit der Planung deines ersten Gottesdienstes über das Kirchenjahr
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/kirchenjahr')}
              className="btn-primary"
            >
              Ersten Gottesdienst erstellen
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};