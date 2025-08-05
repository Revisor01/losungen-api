import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  ShareIcon,
  ClockIcon,
  UsersIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { ServiceComponent } from './ServiceComponent';
import { ComponentSelector } from './ComponentSelector';
import { ComponentType, getComponentConfig, formatDuration } from '../../types/serviceComponents';

interface ServiceComponentData {
  id?: number;
  service_id: number;
  component_type: ComponentType;
  title: string;
  content?: string;
  bible_reference?: string;
  hymn_number?: string;
  order_position?: number;
  duration_minutes?: number;
  notes?: string;
}

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
  perikope_I?: string;
  perikope_II?: string;
  perikope_III?: string;
  perikope_IV?: string;
  perikope_V?: string;
  perikope_VI?: string;
  components: ServiceComponentData[];
  tags: string[];
}

export const ServiceEditorNew: React.FC = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serviceId) {
      loadService(parseInt(serviceId));
    }
  }, [serviceId]);

  const loadService = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiService.getService(id);
      if (response.success && response.data) {
        setService(response.data);
      } else {
        setError('Gottesdienst nicht gefunden');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const addComponent = async (type: ComponentType) => {
    if (!service) return;
    
    const config = getComponentConfig(type);
    const newComponent: ServiceComponentData = {
      service_id: service.id,
      component_type: type,
      title: config.label,
      order_position: service.components.length,
      duration_minutes: config.defaultDuration
    };

    try {
      setSaving(true);
      const response = await apiService.createServiceComponent(newComponent);
      if (response.success && response.data) {
        // Reload service to get the new component
        await loadService(service.id);
      }
    } catch (err) {
      console.error('Failed to add component:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateComponent = async (component: ServiceComponentData) => {
    // TODO: Implement update API call
    console.log('Update component:', component);
  };

  const deleteComponent = async (componentId: number) => {
    // TODO: Implement delete API call
    console.log('Delete component:', componentId);
  };

  const getTotalDuration = (): number => {
    return service?.components.reduce((total, comp) => 
      total + (comp.duration_minutes || 0), 0
    ) || 0;
  };

  const generateMusicianList = () => {
    if (!service) return '';
    
    const hymns = service.components
      .filter(c => c.component_type === 'lied' && c.hymn_number)
      .map((c, index) => `${index + 1}. ${c.title}: ${c.hymn_number}`)
      .join('\n');
    
    return `🎵 Gottesdienst ${service.title}
📅 ${service.date} um ${service.time}

Lieder:
${hymns || 'Keine Lieder eingetragen'}

Gesamtdauer: ca. ${formatDuration(getTotalDuration())}`;
  };

  const generateSextonList = () => {
    if (!service) return '';
    
    const hasAbendmahl = service.components.some(c => c.component_type === 'abendmahl');
    const hasTaufe = service.components.some(c => c.component_type === 'taufe');
    
    return `⛪ Gottesdienst ${service.title}
📅 ${service.date} um ${service.time}
👥 Erwartete Teilnehmer: ${service.congregation_size || 'Unbekannt'}

Besonderheiten:
${hasAbendmahl ? '🍞 Abendmahl vorbereiten' : ''}
${hasTaufe ? '💧 Taufe vorbereiten' : ''}

Dauer: ca. ${formatDuration(getTotalDuration())}`;
  };

  const shareWhatsApp = (text: string) => {
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const shareEmail = (text: string, subject: string) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedText = encodeURIComponent(text);
    window.open(`mailto:?subject=${encodedSubject}&body=${encodedText}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-8">
        <ErrorMessage message={error || 'Gottesdienst nicht gefunden'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/services')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-heading text-2xl font-bold text-gray-900">
                  {service.title}
                </h1>
                <div className="flex items-center space-x-4 text-gray-600 mt-1">
                  <span>
                    {new Date(service.date).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} um {service.time} Uhr
                  </span>
                  {service.congregation_size && (
                    <span className="flex items-center">
                      <UsersIcon className="w-4 h-4 mr-1" />
                      {service.congregation_size}
                    </span>
                  )}
                  <span className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {formatDuration(getTotalDuration())}
                  </span>
                </div>
              </div>
            </div>

            {/* Share Menu */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <ShareIcon className="w-4 h-4" />
                <span>Teilen</span>
              </motion.button>

              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                  >
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Auto-Share</h3>
                      
                      {/* Musiker */}
                      <div className="space-y-2 mb-4">
                        <h4 className="text-sm font-medium text-gray-700">🎵 Für Musiker</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => shareWhatsApp(generateMusicianList())}
                            className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            <DevicePhoneMobileIcon className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => shareEmail(generateMusicianList(), `Lieder für ${service.title}`)}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>Email</span>
                          </button>
                        </div>
                      </div>

                      {/* Küster */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">⛪ Für Küster</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => shareWhatsApp(generateSextonList())}
                            className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            <DevicePhoneMobileIcon className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => shareEmail(generateSextonList(), `Gottesdienst-Info: ${service.title}`)}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>Email</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Components List */}
        <div className="space-y-4">
          <AnimatePresence>
            {service.components
              .sort((a, b) => (a.order_position || 0) - (b.order_position || 0))
              .map((component) => (
                <ServiceComponent
                  key={component.id}
                  component={component}
                  onUpdate={updateComponent}
                  onDelete={deleteComponent}
                />
              ))}
          </AnimatePresence>

          {/* Add Component */}
          <ComponentSelector
            onSelectComponent={addComponent}
            existingComponents={service.components.map(c => c.component_type)}
          />
        </div>

        {/* Saving Indicator */}
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          >
            <LoadingSpinner size="sm" />
            <span>Speichere...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};