import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  TrashIcon,
  ClockIcon,
  BookOpenIcon,
  MusicalNoteIcon,
  UsersIcon,
  DocumentTextIcon,
  ShareIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface ServiceComponent {
  id?: number;
  component_type: string;
  title: string;
  content?: string;
  bible_reference?: string;
  hymn_number?: string;
  order_position: number;
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
  perikope_id?: number;
  chosen_perikope?: string;
  congregation_size?: number;
  notes?: string;
  components?: ServiceComponent[];
  tags?: string[];
  // Perikope data
  event_name?: string;
  liturgical_color?: string;
  season?: string;
}

const COMPONENT_TYPES = [
  { value: 'opening', label: 'Eingangswort', icon: BookOpenIcon, color: 'blue' },
  { value: 'opening_prayer', label: 'Eingangsgebet', icon: BookOpenIcon, color: 'blue' },
  { value: 'hymn', label: 'Lied', icon: MusicalNoteIcon, color: 'purple' },
  { value: 'reading', label: 'Schriftlesung', icon: BookOpenIcon, color: 'green' },
  { value: 'sermon', label: 'Predigt', icon: DocumentTextIcon, color: 'orange' },
  { value: 'creed', label: 'Glaubensbekenntnis', icon: BookOpenIcon, color: 'indigo' },
  { value: 'intercession', label: 'Fürbitten', icon: UsersIcon, color: 'pink' },
  { value: 'communion', label: 'Abendmahl', icon: BookOpenIcon, color: 'red' },
  { value: 'offering', label: 'Kollekte', icon: UsersIcon, color: 'yellow' },
  { value: 'blessing', label: 'Segen', icon: BookOpenIcon, color: 'green' },
  { value: 'announcements', label: 'Abkündigungen', icon: DocumentTextIcon, color: 'gray' }
];

export const ServiceEditor: React.FC = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [components, setComponents] = useState<ServiceComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  const loadService = async () => {
    try {
      const response = await apiService.getService(parseInt(serviceId!));
      if (response.success && response.data) {
        setService(response.data);
        setComponents(response.data.components || []);
      }
    } catch (err) {
      setError('Fehler beim Laden des Gottesdienstes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!serviceId) return;
    
    setDeleting(true);
    try {
      const response = await apiService.deleteService(parseInt(serviceId));
      if (response.success) {
        navigate('/services');
      } else {
        setError('Fehler beim Löschen des Gottesdienstes');
      }
    } catch (err) {
      setError('Fehler beim Löschen des Gottesdienstes');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const addComponent = (type: string) => {
    const typeInfo = COMPONENT_TYPES.find(t => t.value === type);
    const newComponent: ServiceComponent = {
      component_type: type,
      title: typeInfo?.label || type,
      order_position: components.length,
      duration_minutes: type === 'sermon' ? 20 : 5
    };
    setComponents([...components, newComponent]);
  };

  const updateComponent = (index: number, updates: Partial<ServiceComponent>) => {
    const updated = [...components];
    updated[index] = { ...updated[index], ...updates };
    setComponents(updated);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
    // Update order positions
    setComponents(prev => prev.map((comp, i) => ({ ...comp, order_position: i })));
  };

  const moveComponent = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === components.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...components];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // Update order positions
    updated.forEach((comp, i) => {
      comp.order_position = i;
    });
    
    setComponents(updated);
  };

  const saveComponents = async () => {
    if (!service) return;
    
    setSaving(true);
    try {
      // Save each component
      for (const component of components) {
        await apiService.createServiceComponent({
          service_id: service.id,
          ...component
        });
      }
      
      // Reload service to get fresh data
      await loadService();
    } catch (err) {
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const generateMusicianList = () => {
    const hymns = components
      .filter(c => c.component_type === 'hymn' && c.hymn_number)
      .map((c, index) => `${index + 1}. ${c.title}: ${c.hymn_number}`)
      .join('\n');
    
    return `🎵 Gottesdienst ${service?.title}\n📅 ${service?.date} um ${service?.time}\n\nLieder:\n${hymns || 'Keine Lieder eingetragen'}`;
  };

  const generateSextonInfo = () => {
    const hasCommunnion = components.some(c => c.component_type === 'communion');
    
    return `⛪ Gottesdienst ${service?.title}
📅 ${service?.date} um ${service?.time}
📍 ${service?.location}
👥 Erwartete Teilnehmer: ${service?.congregation_size || '?'}
${hasCommunnion ? '🍷 Abendmahl: JA' : ''}
${service?.notes ? `\n📝 Hinweise: ${service.notes}` : ''}`;
  };

  const shareViaWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = (subject: string, body: string) => {
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const calculateTotalDuration = () => {
    return components.reduce((total, comp) => total + (comp.duration_minutes || 0), 0);
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
                onClick={() => navigate('/church-year')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-heading text-2xl font-bold text-gray-900">
                  {service.title}
                </h1>
                <p className="text-gray-600">
                  {new Date(service.date).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} um {service.time} Uhr
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {/* Delete Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Löschen</span>
              </motion.button>

              {/* Share Menu */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span>Teilen</span>
                </motion.button>

                <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                  >
                    <div className="p-2">
                      <button
                        onClick={() => {
                          const text = generateMusicianList();
                          shareViaWhatsApp(text);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 rounded-lg flex items-center space-x-3"
                      >
                        <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">Liederliste für Musiker</div>
                          <div className="text-xs text-gray-600">Via WhatsApp</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const text = generateSextonInfo();
                          shareViaWhatsApp(text);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 rounded-lg flex items-center space-x-3"
                      >
                        <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">Info für Küster</div>
                          <div className="text-xs text-gray-600">Via WhatsApp</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const subject = `Gottesdienst ${service.title}`;
                          const body = `${generateMusicianList()}\n\n---\n\n${generateSextonInfo()}`;
                          shareViaEmail(subject, body);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg flex items-center space-x-3"
                      >
                        <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Komplett-Info</div>
                          <div className="text-xs text-gray-600">Via E-Mail</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          // TODO: PDF Export implementieren
                          alert('PDF Export kommt bald!');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center space-x-3"
                      >
                        <DocumentArrowDownIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="font-medium">Ablaufplan PDF</div>
                          <div className="text-xs text-gray-600">Zum Ausdrucken</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{components.length}</div>
              <div className="text-sm text-gray-600">Komponenten</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{calculateTotalDuration()}</div>
              <div className="text-sm text-gray-600">Minuten gesamt</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {components.filter(c => c.component_type === 'hymn').length}
              </div>
              <div className="text-sm text-gray-600">Lieder</div>
            </div>
          </div>
        </motion.div>

        {/* Component List */}
        <div className="card p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">
            Gottesdienst-Ablauf
          </h2>

          <AnimatePresence>
            {components.map((component, index) => {
              const typeInfo = COMPONENT_TYPES.find(t => t.value === component.component_type);
              const Icon = typeInfo?.icon || DocumentTextIcon;
              const color = typeInfo?.color || 'gray';

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`mb-4 p-4 border rounded-lg bg-${color}-50 border-${color}-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className={`w-5 h-5 text-${color}-600 mt-1`} />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={component.title}
                          onChange={(e) => updateComponent(index, { title: e.target.value })}
                          className={`font-medium text-${color}-900 bg-transparent border-b border-${color}-300 focus:outline-none focus:border-${color}-500 mb-2`}
                        />

                        {/* Type-specific fields */}
                        {component.component_type === 'hymn' && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              EG-Nummer
                            </label>
                            <input
                              type="text"
                              value={component.hymn_number || ''}
                              onChange={(e) => updateComponent(index, { hymn_number: e.target.value })}
                              placeholder="z.B. EG 322"
                              className="input-field text-sm"
                            />
                          </div>
                        )}

                        {component.component_type === 'reading' && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bibelstelle
                            </label>
                            <input
                              type="text"
                              value={component.bible_reference || ''}
                              onChange={(e) => updateComponent(index, { bible_reference: e.target.value })}
                              placeholder="z.B. Johannes 3,16"
                              className="input-field text-sm"
                            />
                          </div>
                        )}

                        {['sermon', 'intercession', 'opening_prayer'].includes(component.component_type) && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Inhalt/Notizen
                            </label>
                            <textarea
                              value={component.content || ''}
                              onChange={(e) => updateComponent(index, { content: e.target.value })}
                              placeholder="Stichpunkte oder Text..."
                              className="input-field text-sm resize-none"
                              rows={3}
                            />
                          </div>
                        )}

                        {/* Duration */}
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={component.duration_minutes || 0}
                              onChange={(e) => updateComponent(index, { duration_minutes: parseInt(e.target.value) || 0 })}
                              className="w-16 text-sm border-gray-300 rounded"
                              min="0"
                            />
                            <span className="text-sm text-gray-600">Min.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => moveComponent(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveComponent(index, 'down')}
                        disabled={index === components.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeComponent(index)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add Component Buttons */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Komponente hinzufügen:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMPONENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addComponent(type.value)}
                    className={`flex items-center justify-center space-x-2 p-3 bg-${type.color}-100 hover:bg-${type.color}-200 text-${type.color}-700 rounded-lg transition-colors`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveComponents}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <CheckIcon className="w-5 h-5" />
              )}
              <span>Änderungen speichern</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Gottesdienst löschen?
              </h3>
              <p className="text-gray-600 mb-6">
                Möchten Sie den Gottesdienst "{service.title}" wirklich löschen? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={deleting}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Löschen...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-4 h-4" />
                      <span>Löschen</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};