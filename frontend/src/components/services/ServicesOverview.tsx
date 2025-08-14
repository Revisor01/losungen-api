import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UsersIcon,
  MusicalNoteIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { ServiceModal } from './ServiceModal';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

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

interface ServicesByPerikope {
  id: number;
  title: string;
  date: string;
  time: string;
  chosen_perikope?: string;
  congregation_size?: number;
  year: number;
  component_count: number;
}

export const ServicesOverview: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [creatingService, setCreatingService] = useState(false);

  useEffect(() => {
    loadServices();
  }, [filterYear]);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, filterType]);

  const handleServiceSubmit = async (serviceData: any) => {
    setCreatingService(true);
    try {
      const response = await apiService.createService(serviceData);
      
      if (response.success && response.data?.id) {
        setShowServiceModal(false);
        // Navigate to the service editor
        navigate(`/service/${response.data.id}`);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Gottesdienstes:', error);
    } finally {
      setCreatingService(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await apiService.getServices({
        year: filterYear,
        limit: 100
      });
      if (response.success && response.data) {
        setServices(response.data);
      }
    } catch (err) {
      setError('Fehler beim Laden der Gottesdienste');
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(s => s.service_type === filterType);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(term) ||
        s.event_name?.toLowerCase().includes(term) ||
        s.location.toLowerCase().includes(term)
      );
    }

    setFilteredServices(filtered);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                Meine Gottesdienste
              </h1>
              <p className="text-gray-600">
                Verwalte und plane deine Gottesdienste
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowServiceModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Neuer Gottesdienst</span>
            </motion.button>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suche..."
                className="input-field pl-10"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field"
            >
              <option value="all">Alle Typen</option>
              <option value="regular">Regulär</option>
              <option value="wedding">Hochzeit</option>
              <option value="funeral">Beerdigung</option>
              <option value="baptism">Taufe</option>
              <option value="confirmation">Konfirmation</option>
              <option value="special">Besonderer</option>
            </select>

            {/* Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="input-field"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </motion.div>

        {/* Services Grid */}
        {error ? (
          <ErrorMessage message={error} />
        ) : filteredServices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card p-8 text-center"
          >
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-semibold text-gray-900 mb-2">
              Keine Gottesdienste gefunden
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all' 
                ? 'Versuche andere Filtereinstellungen'
                : 'Erstelle deinen ersten Gottesdienst über den Kirchenjahr-Kalender'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredServices.map((service, index) => {
                const color = getServiceTypeColor(service.service_type);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/service/${service.id}`)}
                    className="card p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    {/* Type Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 bg-${color}-100 text-${color}-700 rounded-full text-xs font-medium`}>
                        {getServiceTypeLabel(service.service_type)}
                      </span>
                      {service.liturgical_color && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          service.liturgical_color === 'Violett' ? 'bg-purple-100 text-purple-700' :
                          service.liturgical_color === 'Weiß' ? 'bg-gray-100 text-gray-700' :
                          service.liturgical_color === 'Rot' ? 'bg-red-100 text-red-700' :
                          service.liturgical_color === 'Grün' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {service.liturgical_color}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">
                      {service.title}
                    </h3>

                    {/* Event Name */}
                    {service.event_name && (
                      <p className="text-sm text-gray-600 mb-3">
                        {service.event_name}
                      </p>
                    )}

                    {/* Date & Time */}
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {new Date(service.date).toLocaleDateString('de-DE', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {service.time && ` um ${service.time}`}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <DocumentTextIcon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-600">{service.component_count}</div>
                      </div>
                      <div className="text-center">
                        <UsersIcon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-600">{service.congregation_size || '?'}</div>
                      </div>
                      <div className="text-center">
                        <ClockIcon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-600">{service.time}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Service Modal */}
      <ServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSubmit={handleServiceSubmit}
        loading={creatingService}
      />
    </div>
  );
};