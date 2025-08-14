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
import { COMPONENT_CONFIGS, getComponentsByCategory, ComponentType } from '../../types/serviceComponents';

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

// Use the new component system from serviceComponents.ts

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
  const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set());
  const [componentStyles, setComponentStyles] = useState<{ [key: number]: { bold: boolean; italic: boolean } }>({});

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

  const addComponent = (type: ComponentType) => {
    const config = COMPONENT_CONFIGS[type];
    const newComponent: ServiceComponent = {
      component_type: type,
      title: config.label,
      order_position: components.length,
      duration_minutes: config.defaultDuration || 5
    };
    const newComponents = [...components, newComponent];
    setComponents(newComponents);
    // Neue Komponente automatisch ausklappen
    setExpandedComponents(prev => {
      const newSet = new Set(prev);
      newSet.add(newComponents.length - 1);
      return newSet;
    });
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

  const toggleComponentExpansion = (index: number) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedComponents(newExpanded);
  };

  const toggleComponentStyle = (index: number, style: 'bold' | 'italic') => {
    const currentStyles = componentStyles[index] || { bold: false, italic: false };
    setComponentStyles({
      ...componentStyles,
      [index]: {
        ...currentStyles,
        [style]: !currentStyles[style]
      }
    });
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
      // Erst alle bestehenden Komponenten löschen
      await apiService.deleteServiceComponents(service.id);
      
      // Dann alle Komponenten neu erstellen
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
              const config = COMPONENT_CONFIGS[component.component_type as ComponentType];
              const color = config?.color || 'gray';

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`mb-4 p-4 bg-white border-l-4 border-r border-t border-b rounded-lg shadow-sm ${config ? config.borderColor : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-xl mt-1">{config?.icon || '📄'}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={component.title}
                            onChange={(e) => updateComponent(index, { title: e.target.value })}
                            className="font-heading text-lg font-semibold text-gray-900 bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded w-full border-0"
                          />
                          <div className="flex items-center space-x-3">
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

                        {/* Type-specific fields - nur wenn expanded */}
                        {expandedComponents.has(index) && (
                          <div className="space-y-4">
                            {(component.component_type === 'lied' || config?.hasNumber) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Lied (Nummer und Titel)
                                </label>
                                <textarea
                                  value={component.hymn_number || ''}
                                  onChange={(e) => updateComponent(index, { hymn_number: e.target.value })}
                                  placeholder="z.B. EG 324, 1-3: Ich singe dir mit Herz und Mund"
                                  className="input-field text-sm resize-none min-h-[100px] font-sans"
                                  rows={4}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Format: Gesangbuch Nummer, Strophen: Titel
                                </p>
                              </div>
                            )}

                            {(component.component_type === 'predigttext' || 
                              component.component_type === 'altes_testament' || 
                              component.component_type === 'epistel' || 
                              component.component_type === 'evangelium' ||
                              component.component_type === 'psalm' ||
                              component.component_type === 'predigt') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Bibelstelle
                                </label>
                                <input
                                  type="text"
                                  value={component.bible_reference || ''}
                                  onChange={(e) => updateComponent(index, { bible_reference: e.target.value })}
                                  placeholder="z.B. Johannes 3,16"
                                  className="input-field text-sm font-sans"
                                />
                              </div>
                            )}

                            {(config?.hasText) && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Inhalt/Notizen
                                  </label>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleComponentStyle(index, 'bold')}
                                      className={`px-2 py-1 text-xs rounded border ${
                                        componentStyles[index]?.bold 
                                          ? 'bg-gray-800 text-white border-gray-800' 
                                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      <strong>B</strong>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleComponentStyle(index, 'italic')}
                                      className={`px-2 py-1 text-xs rounded border ${
                                        componentStyles[index]?.italic 
                                          ? 'bg-gray-800 text-white border-gray-800' 
                                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      <em>I</em>
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  id={`content-${index}`}
                                  value={component.content || ''}
                                  onChange={(e) => updateComponent(index, { content: e.target.value })}
                                  placeholder={config?.placeholder || 'Stichpunkte oder Text...'}
                                  className={`input-field text-sm resize-y font-sans ${
                                    componentStyles[index]?.bold ? 'font-bold' : 'font-normal'
                                  } ${
                                    componentStyles[index]?.italic ? 'italic' : 'not-italic'
                                  }`}
                                  rows={component.component_type === 'predigt' ? 15 : 8}
                                  style={{ 
                                    minHeight: component.component_type === 'predigt' ? '400px' : '200px',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                  }}
                                />
                                {component.component_type === 'predigt' && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    {(component.content || '').length} Zeichen, ~{Math.ceil((component.content || '').length / 100)} Min
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        type="button"
                        onClick={() => toggleComponentExpansion(index)}
                        className="p-2 hover:bg-gray-100 rounded text-gray-600" 
                        title={expandedComponents.has(index) ? "Einklappen" : "Ausklappen"}
                      >
                        {expandedComponents.has(index) ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                      <div className="border-l border-gray-200 h-6 mx-1"></div>
                      <button
                        onClick={() => moveComponent(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Nach oben"
                      >
                        <ChevronUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveComponent(index, 'down')}
                        disabled={index === components.length - 1}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Nach unten"
                      >
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeComponent(index)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                        title="Löschen"
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
            {(() => {
              const categories = getComponentsByCategory();
              return Object.entries(categories).map(([categoryName, configs]) => (
                <div key={categoryName} className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    {categoryName === 'sprechakte' && 'Sprechakte'}
                    {categoryName === 'gebete' && 'Gebete & Segen'}
                    {categoryName === 'lieder' && 'Lieder'}
                    {categoryName === 'liturgien' && 'Liturgien'}
                    {categoryName === 'bibellesungen' && 'Bibellesungen'}
                    {categoryName === 'predigt' && 'Predigt'}
                    {categoryName === 'sakramente' && 'Sakramente'}
                    {categoryName === 'kasualien' && 'Kasualien'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {configs.map(config => (
                      <motion.button
                        key={config.type}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addComponent(config.type)}
                        className={`flex items-center justify-center space-x-2 p-3 ${config.bgColor} hover:bg-${config.color}-200 ${config.textColor} rounded-lg transition-colors`}
                      >
                        <span className="text-lg">{config.icon}</span>
                        <span className="text-sm">{config.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ));
            })()}
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