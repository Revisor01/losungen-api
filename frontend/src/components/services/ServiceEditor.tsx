import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  DocumentArrowDownIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { COMPONENT_CONFIGS, getComponentsByCategory, ComponentType, LITURGICAL_TEXTS } from '../../types/serviceComponents';

interface ServiceComponent {
  id?: number;
  component_type: string;
  title: string;
  content?: string;
  bible_reference?: string;
  bible_translation?: string;
  bible_text?: string;
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
  const [loadingBible, setLoadingBible] = useState<{ [key: number]: boolean }>({});
  const [wordsPerMinute, setWordsPerMinute] = useState<number>(() => {
    // Lade Sprechgeschwindigkeit aus localStorage oder nutze Default
    const saved = localStorage.getItem('wordsPerMinute');
    return saved ? parseInt(saved) : 110;
  });
  const [componentSearchTerm, setComponentSearchTerm] = useState('');

  useEffect(() => {
    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  // Speichere Sprechgeschwindigkeit in localStorage
  useEffect(() => {
    localStorage.setItem('wordsPerMinute', wordsPerMinute.toString());
  }, [wordsPerMinute]);

  // Automatische Zeitberechnung für Text-Komponenten in Minuten (für duration_minutes)
  const calculateTextDurationMinutes = (text: string): number => {
    if (!text || text.trim().length === 0) return 0;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Präzise Zeitberechnung für Anzeige in Minuten:Sekunden
  const calculateTextDurationFormatted = (text: string): string => {
    if (!text || text.trim().length === 0) return '0:00';
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const totalSeconds = Math.round((wordCount / wordsPerMinute) * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Aktualisiere Dauer automatisch wenn sich Text ändert
  const updateComponentWithAutoDuration = (index: number, updates: Partial<ServiceComponent>) => {
    const component = components[index];
    const config = COMPONENT_CONFIGS[component.component_type as ComponentType];
    
    // Automatische Dauer-Berechnung für Text-Komponenten
    if (updates.content !== undefined && config?.hasText) {
      const calculatedDuration = calculateTextDurationMinutes(updates.content);
      // Setze berechnete Dauer nur wenn keine manuelle Dauer gesetzt ist
      if (!component.duration_minutes || component.duration_minutes === calculateTextDurationMinutes(component.content || '')) {
        updates.duration_minutes = calculatedDuration;
      }
    }
    
    updateComponent(index, updates);
  };

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

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    const newComponents = Array.from(components);
    const [reorderedItem] = newComponents.splice(sourceIndex, 1);
    newComponents.splice(destinationIndex, 0, reorderedItem);

    // Update order positions
    const updatedComponents = newComponents.map((comp, index) => ({
      ...comp,
      order_position: index
    }));

    setComponents(updatedComponents);
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

  // Berechne kalkulierte Gesamtzeit basierend auf Text-Inhalten
  const calculateTotalCalculatedDuration = () => {
    let totalSeconds = 0;
    
    components.forEach(component => {
      // Für Predigt-Komponenten: Content + Bibeltext addieren (ohne Doppelzählung)
      if (component.component_type === 'predigt') {
        // Content-Zeit
        if (component.content) {
          const wordCount = component.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
          totalSeconds += Math.round((wordCount / wordsPerMinute) * 60);
        }
        // Bibeltext-Zeit
        if (component.bible_text) {
          try {
            const bibleData = JSON.parse(component.bible_text);
            const plainText = bibleData.text || (bibleData.verses?.map((v: any) => v.text).join(' ') || '');
            const wordCount = plainText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
            totalSeconds += Math.round((wordCount / wordsPerMinute) * 60);
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
      // Für Bibel-Komponenten (außer Psalm und Predigt)
      else if (component.bible_text && component.component_type !== 'psalm') {
        try {
          const bibleData = JSON.parse(component.bible_text);
          const plainText = bibleData.text || (bibleData.verses?.map((v: any) => v.text).join(' ') || '');
          const wordCount = plainText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
          totalSeconds += Math.round((wordCount / wordsPerMinute) * 60);
        } catch (error) {
          // Fallback zu content
        }
      }
      // Für alle anderen Text-Komponenten (außer Predigt - schon behandelt)
      else if (component.content && component.component_type !== 'predigt') {
        const wordCount = component.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
        totalSeconds += Math.round((wordCount / wordsPerMinute) * 60);
      }
    });
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{components.length}</div>
              <div className="text-sm text-gray-600">Komponenten</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{calculateTotalDuration()}</div>
              <div className="text-sm text-gray-600">Minuten gesamt</div>
              <div className="text-sm font-semibold text-green-600 mt-1">≈{calculateTotalCalculatedDuration()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {components.filter(c => c.component_type === 'lied').length}
              </div>
              <div className="text-sm text-gray-600">Lieder</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-center">
                <label className="block text-xs text-gray-600 mb-1">Sprechtempo</label>
                <input
                  type="number"
                  value={wordsPerMinute}
                  onChange={(e) => setWordsPerMinute(parseInt(e.target.value) || 110)}
                  className="w-16 text-center text-sm font-bold bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500"
                  min="80"
                  max="200"
                />
                <div className="text-xs text-gray-500 mt-1">Wörter/Min</div>
              </div>
            </div>
          </div>
          
          {/* Celebrate Button */}
          {components.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => navigate(`/service/${service.id}/celebrate`)}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Gottesdienst feiern</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* Component List */}
        <div className="card p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">
            Gottesdienst-Ablauf
          </h2>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="components">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <AnimatePresence>
                    {components.map((component, index) => {
                      const config = COMPONENT_CONFIGS[component.component_type as ComponentType];
                      const color = config?.color || 'gray';

                      return (
                        <Draggable 
                          key={`component-${index}-${component.component_type}-${component.title}`} 
                          draggableId={`component-${index}-${component.component_type}`} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                              className={`mb-4 p-4 bg-white border-l-4 border-r border-t border-b rounded-lg shadow-sm transition-all duration-200 ${config ? config.borderColor : 'border-gray-200'} ${
                                snapshot.isDragging ? 'shadow-xl transform scale-105 z-50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                  {/* Drag Handle */}
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="cursor-move p-1 text-gray-400 hover:text-gray-600 transition-colors mt-1"
                                    title="Komponente verschieben"
                                  >
                                    ⋮⋮
                                  </div>
                                  <span className="text-xl mt-1">{config?.icon || '📄'}</span>
                                  <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={component.title}
                            onChange={(e) => updateComponent(index, { title: e.target.value })}
                            className="font-heading text-lg font-semibold text-gray-900 bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded border-0 flex-1 min-w-0"
                          />
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              {/* Zeit-Anzeige: Berechnete + Manuelle Zeit */}
                              {(() => {
                                let calculatedTime = '';
                                let hasCalculation = false;
                                
                                // Für Predigt-Komponenten: Content + Bibeltext addieren
                                if (component.component_type === 'predigt' && (component.content || component.bible_text)) {
                                  let totalSeconds = 0;
                                  
                                  // Zeit für Content berechnen
                                  if (component.content) {
                                    const wordCount = component.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
                                    totalSeconds += Math.round((wordCount / wordsPerMinute) * 60);
                                  }
                                  
                                  // Zeit für Bibeltext berechnen
                                  if (component.bible_text) {
                                    try {
                                      const bibleData = JSON.parse(component.bible_text);
                                      const plainText = bibleData.text || (bibleData.verses?.map((v: any) => v.text).join(' ') || '');
                                      const wordCount = plainText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
                                      totalSeconds += Math.round((wordCount / wordsPerMinute) * 60);
                                    } catch (error) {
                                      // Ignore parsing errors
                                    }
                                  }
                                  
                                  if (totalSeconds > 0) {
                                    const minutes = Math.floor(totalSeconds / 60);
                                    const seconds = totalSeconds % 60;
                                    calculatedTime = seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes}:00`;
                                    hasCalculation = true;
                                  }
                                }
                                // Für Bibel-Komponenten (außer Psalm und Predigt)
                                else if (component.bible_text && component.component_type !== 'psalm' && component.component_type !== 'predigt') {
                                  try {
                                    const bibleData = JSON.parse(component.bible_text);
                                    const plainText = bibleData.text || (bibleData.verses?.map((v: any) => v.text).join(' ') || '');
                                    calculatedTime = calculateTextDurationFormatted(plainText);
                                    hasCalculation = calculatedTime !== '0:00';
                                  } catch (error) {
                                    // Fallback zu content
                                  }
                                }
                                // Für alle anderen Text-Komponenten
                                else if (component.content && config?.hasText) {
                                  calculatedTime = calculateTextDurationFormatted(component.content);
                                  hasCalculation = calculatedTime !== '0:00';
                                }
                                
                                // Anzeige je nach Komponententyp
                                if (component.component_type === 'lied') {
                                  // Lieder: Manuelle + berechnete Zeit
                                  const manual = component.duration_minutes || 0;
                                  if (hasCalculation && calculatedTime) {
                                    return (
                                      <span className="text-sm font-semibold text-purple-600 mr-2" title="Berechnete + Manuelle Zeit">
                                        {calculatedTime} + {manual} Min
                                      </span>
                                    );
                                  } else if (manual > 0) {
                                    return (
                                      <span className="text-sm font-semibold text-purple-600 mr-2" title="Manuelle Zeit">
                                        + {manual} Min
                                      </span>
                                    );
                                  }
                                } else if (hasCalculation) {
                                  // Komponenten mit Berechnung: Nur berechnete Zeit anzeigen
                                  const colorClass = component.component_type === 'predigt' ? 'text-purple-600' : 
                                                   component.bible_text ? 'text-blue-600' : 'text-green-600';
                                  return (
                                    <span className={`text-sm font-semibold ${colorClass} mr-2`} title="Berechnete Sprechdauer">
                                      {calculatedTime}
                                    </span>
                                  );
                                } else {
                                  // Komponenten ohne Berechnung: + XX Min für manuelle Zeit
                                  const manual = component.duration_minutes || 0;
                                  if (manual > 0) {
                                    return (
                                      <span className="text-sm font-semibold text-gray-600 mr-2" title="Manuelle Zeit">
                                        + {manual} Min
                                      </span>
                                    );
                                  }
                                }
                                
                                return null;
                              })()}
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
                            {component.component_type === 'lied' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Lied (Nummer und Titel)
                                </label>
                                <textarea
                                  value={component.hymn_number || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const updates: Partial<ServiceComponent> = { hymn_number: value };
                                    
                                    // Auto-Titel für Lieder: EG 324, 1-3 Format
                                    if (value && value.match(/^(EG|HELM|GL|F&L)\s*\d+/i)) {
                                      updates.title = value;
                                    }
                                    
                                    updateComponent(index, updates);
                                  }}
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
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Bibelstelle
                                  </label>
                                  <select
                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                    value={component.bible_translation || 'LUT'}
                                    onChange={(e) => updateComponent(index, { bible_translation: e.target.value })}
                                  >
                                    <option value="LUT">Luther 2017</option>
                                    <option value="HFA">Hoffnung für Alle</option>
                                    <option value="ELB">Elberfelder</option>
                                    <option value="EU">Einheitsübersetzung</option>
                                    <option value="NGÜ">Neue Genfer</option>
                                    <option value="GNB">Gute Nachricht</option>
                                    <option value="BIGS">Bibel in gerechter Sprache</option>
                                    <option value="NIV">New International</option>
                                  </select>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={component.bible_reference || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const updates: Partial<ServiceComponent> = { bible_reference: value };
                                      
                                      // Auto-Titel für Bibelstellen basierend auf Komponententyp
                                      if (value) {
                                        if (component.component_type === 'psalm') {
                                          updates.title = `Psalm ${value}`;
                                        } else if (component.component_type === 'predigttext') {
                                          updates.title = `Predigttext: ${value}`;
                                        } else if (component.component_type === 'evangelium') {
                                          updates.title = `Evangelium: ${value}`;
                                        } else if (component.component_type === 'epistel') {
                                          updates.title = `Epistel: ${value}`;
                                        } else if (component.component_type === 'altes_testament') {
                                          updates.title = `AT: ${value}`;
                                        } else {
                                          updates.title = value;
                                        }
                                      }
                                      
                                      updateComponent(index, updates);
                                    }}
                                    placeholder="z.B. Johannes 3,16"
                                    className="input-field text-sm font-sans flex-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const reference = component.bible_reference?.trim();
                                      const translation = component.bible_translation || 'LUT';
                                      
                                      if (!reference) {
                                        alert('Bitte erst eine Bibelstelle eingeben (z.B. Johannes 3,16)');
                                        return;
                                      }
                                      
                                      // Loading state für diesen Button setzen
                                      setLoadingBible(prev => ({ ...prev, [index]: true }));
                                      
                                      try {
                                        const response = await apiService.searchBibleText({
                                          reference: reference,
                                          translation: translation,
                                          format: 'json'
                                        });
                                        
                                        if (response.success && response.data) {
                                          // Auto-Titel generieren basierend auf Komponenten-Typ
                                          let autoTitle = component.title;
                                          if (component.component_type === 'altes_testament') {
                                            autoTitle = `Altes Testament: ${reference} (${translation})`;
                                          } else if (component.component_type === 'epistel') {
                                            autoTitle = `Epistel: ${reference} (${translation})`;
                                          } else if (component.component_type === 'evangelium') {
                                            autoTitle = `Evangelium: ${reference} (${translation})`;
                                          } else if (component.component_type === 'predigttext' || component.component_type === 'predigt') {
                                            autoTitle = `Predigttext: ${reference} (${translation})`;
                                          }
                                          
                                          // Für Psalm: Text ins content-Feld laden
                                          // Für AT/Epistel/Evangelium/Predigttext: vollständige Daten speichern
                                          if (component.component_type === 'psalm') {
                                            const plainText = response.data.text || (response.data.verses?.map(v => v.text).join(' ') || '');
                                            updateComponentWithAutoDuration(index, { 
                                              title: autoTitle,
                                              content: plainText,
                                              bible_translation: translation,
                                              bible_text: JSON.stringify(response.data)
                                            });
                                          } else {
                                            updateComponent(index, { 
                                              title: autoTitle,
                                              bible_translation: translation,
                                              bible_text: JSON.stringify(response.data)
                                            });
                                          }
                                        } else {
                                          alert('Bibeltext konnte nicht gefunden werden. Bitte Referenz überprüfen.');
                                        }
                                      } catch (error) {
                                        console.error('Bible search error:', error);
                                        alert('Fehler beim Laden der Bibelstelle: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
                                      } finally {
                                        setLoadingBible(prev => ({ ...prev, [index]: false }));
                                      }
                                    }}
                                    disabled={loadingBible[index]}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                  >
                                    {loadingBible[index] ? (
                                      <>
                                        <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full mr-1"></div>
                                        Laden...
                                      </>
                                    ) : (
                                      'Suche'
                                    )}
                                  </button>
                                </div>
                                
                                {/* Bibeltext-Anzeige für AT/Epistel/Evangelium/Predigttext */}
                                {component.bible_text && component.component_type !== 'psalm' && (() => {
                                  try {
                                    const bibleData = JSON.parse(component.bible_text);
                                    const plainText = bibleData.text || (bibleData.verses?.map((v: any) => v.text).join(' ') || '');
                                    const textDuration = calculateTextDurationFormatted(plainText);
                                    
                                    return (
                                      <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                          <h4 className="text-sm font-medium text-gray-900">
                                            {component.bible_reference} ({component.bible_translation || 'LUT'})
                                          </h4>
                                          <div className="flex items-center space-x-3">
                                            <span className="text-xs text-gray-500">⏱️ ~{textDuration} Min</span>
                                            <button
                                              type="button"
                                              onClick={() => updateComponent(index, { bible_text: undefined })}
                                              className="text-gray-400 hover:text-gray-600 text-xs"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {/* Verse mit Nummern wie in SearchInterface */}
                                        {bibleData.verses && bibleData.verses.length > 0 ? (
                                          <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {bibleData.verses.map((verse: any, verseIndex: number) => (
                                              <div key={verse.number || verseIndex} className="flex space-x-3 py-2 border-b border-gray-100 last:border-b-0">
                                                <span className="flex-shrink-0 min-w-[1.5rem] h-6 px-2 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-100 text-gray-700">
                                                  {verse.number}{verse.suffix && <span className="text-xs ml-0.5">{verse.suffix}</span>}
                                                </span>
                                                <p className="flex-1 leading-relaxed text-gray-700 text-sm">
                                                  {verse.text}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                                            {plainText}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } catch (error) {
                                    // Fallback für alten text-format
                                    return (
                                      <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="text-sm font-medium text-gray-900">
                                            {component.bible_reference} ({component.bible_translation || 'LUT'})
                                          </h4>
                                          <button
                                            type="button"
                                            onClick={() => updateComponent(index, { bible_text: undefined })}
                                            className="text-gray-400 hover:text-gray-600 text-xs"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                                          {component.bible_text}
                                        </div>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            )}

                            {(config?.hasText) && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Inhalt/Notizen
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const editor = document.getElementById(`editor-${index}`);
                                        if (editor) {
                                          document.execCommand('bold', false);
                                          editor.focus();
                                        }
                                      }}
                                      className="px-2 py-1 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                    >
                                      <strong>B</strong>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const editor = document.getElementById(`editor-${index}`);
                                        if (editor) {
                                          document.execCommand('italic', false);
                                          editor.focus();
                                        }
                                      }}
                                      className="px-2 py-1 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                    >
                                      <em>I</em>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const editor = document.getElementById(`editor-${index}`);
                                        if (editor) {
                                          document.execCommand('underline', false);
                                          editor.focus();
                                        }
                                      }}
                                      className="px-2 py-1 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                    >
                                      <u>U</u>
                                    </button>
                                    <div className="border-l border-gray-200 h-4 mx-1"></div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const editor = document.getElementById(`editor-${index}`);
                                        if (editor) {
                                          document.execCommand('removeFormat', false);
                                          editor.focus();
                                        }
                                      }}
                                      className="px-2 py-1 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                {/* Liturgische Text-Auswahl */}
                                {(component.component_type === 'glaubensbekenntnis' || component.component_type === 'segen') && (
                                  <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Text-Vorlage wählen
                                    </label>
                                    <select
                                      onChange={(e) => {
                                        const selectedKey = e.target.value;
                                        if (selectedKey && LITURGICAL_TEXTS[component.component_type as keyof typeof LITURGICAL_TEXTS]) {
                                          const categoryTexts = LITURGICAL_TEXTS[component.component_type as keyof typeof LITURGICAL_TEXTS];
                                          const selectedText = (categoryTexts as any)[selectedKey];
                                          if (selectedText) {
                                            updateComponent(index, { 
                                              content: selectedText.text,
                                              duration_minutes: selectedText.duration,
                                              title: selectedText.title
                                            });
                                          }
                                        }
                                      }}
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      defaultValue=""
                                    >
                                      <option value="">-- Text-Vorlage wählen --</option>
                                      {LITURGICAL_TEXTS[component.component_type as keyof typeof LITURGICAL_TEXTS] && Object.entries(LITURGICAL_TEXTS[component.component_type as keyof typeof LITURGICAL_TEXTS]).map(([key, template]) => (
                                        <option key={key} value={key}>
                                          {(template as any).title} ({(template as any).duration} Min)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                
                                {/* Vater Unser hardkodiert */}
                                {component.component_type === 'vater_unser' && (
                                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <h4 className="font-medium text-gray-700 mb-3">Vater Unser</h4>
                                    <div className="text-sm text-gray-700 font-serif leading-relaxed whitespace-pre-wrap">
                                      {LITURGICAL_TEXTS.vater_unser.standard.text}
                                    </div>
                                    <div className="mt-3 text-xs text-gray-500">
                                      Dauer: {LITURGICAL_TEXTS.vater_unser.standard.duration} Min
                                    </div>
                                  </div>
                                )}
                                
                                {/* Ausgewählter liturgischer Text anzeigen (read-only) */}
                                {(component.component_type === 'glaubensbekenntnis' || component.component_type === 'segen') && component.content && (
                                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <h4 className="font-medium text-gray-700 mb-3">{component.title || 'Ausgewählter Text'}</h4>
                                    <div className="text-sm text-gray-700 font-serif leading-relaxed whitespace-pre-wrap">
                                      {component.content}
                                    </div>
                                    <div className="mt-3 text-xs text-gray-500">
                                      Dauer: {component.duration_minutes} Min
                                    </div>
                                  </div>
                                )}
                                
                                {/* Normale Textarea für andere Komponenten */}
                                {!(component.component_type === 'vater_unser' || 
                                   component.component_type === 'glaubensbekenntnis' || 
                                   component.component_type === 'segen' ||
                                   component.component_type === 'kyrie' ||
                                   component.component_type === 'gloria') && (
                                  <textarea
                                    id={`editor-${index}`}
                                    value={component.content || ''}
                                    onChange={(e) => {
                                      updateComponentWithAutoDuration(index, { content: e.target.value });
                                    }}
                                    className="input-field text-sm font-sans border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    style={{ 
                                      minHeight: component.component_type === 'predigt' ? '400px' : '200px',
                                      height: 'auto',
                                      fontFamily: 'system-ui, -apple-system, sans-serif'
                                    }}
                                    rows={component.component_type === 'predigt' ? 20 : 8}
                                    onInput={(e) => {
                                      // Auto-resize basierend auf Inhalt
                                      const target = e.target as HTMLTextAreaElement;
                                      target.style.height = 'auto';
                                      target.style.height = `${Math.max(target.scrollHeight, component.component_type === 'predigt' ? 400 : 200)}px`;
                                    }}
                                  />
                                )}
                                <div className="mt-2 flex justify-between text-xs text-gray-500">
                                  <span>
                                    {(component.content || '').length} Zeichen, {(component.content || '').trim().split(/\s+/).filter(w => w.length > 0).length} Wörter
                                  </span>
                                  <span className="font-medium text-blue-600">
                                    ⏱️ ~{calculateTextDurationFormatted(component.content || '')} Min (bei {wordsPerMinute} Wörtern/Min)
                                  </span>
                                </div>
                                {component.content && component.content.length > 50 && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    💡 Markieren Sie Text und nutzen Sie die Buttons für Formatierung
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Improved Actions Bar */}
                    <div className="flex items-center ml-4">
                      {/* Primary Actions - Always Visible */}
                      <div className="flex items-center space-x-1">
                        {/* Expand Button - ausgeblendet für Kyrie und Gloria */}
                        {!(component.component_type === 'kyrie' || component.component_type === 'gloria') && (
                          <button
                            type="button"
                            onClick={() => toggleComponentExpansion(index)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-all duration-200 hover:scale-105" 
                            title={expandedComponents.has(index) ? "Einklappen" : "Ausklappen"}
                          >
                            {expandedComponents.has(index) ? (
                              <ChevronUpIcon className="w-5 h-5" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        
                        {/* Quick Delete - Always visible for efficiency */}
                        <button
                          onClick={() => removeComponent(index)}
                          className="p-2 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition-all duration-200 hover:scale-105"
                          title="Komponente löschen"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-l border-gray-200 h-8 mx-3"></div>
                      
                      {/* Secondary Actions - Compact Group */}
                      <div className="flex items-center bg-gray-50 rounded-lg p-1 space-x-1">
                        <button
                          onClick={() => moveComponent(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          title="Nach oben verschieben"
                        >
                          <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => moveComponent(index, 'down')}
                          disabled={index === components.length - 1}
                          className="p-1.5 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          title="Nach unten verschieben"
                        >
                          <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>


          {/* Enhanced Floating Actions Panel */}
          {components.length > 0 && (
            <div className="sticky bottom-4 left-0 right-0 z-10 mt-4">
              <div className="flex justify-center">
                <div className="flex items-center space-x-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-lg">
                  <span className="text-sm font-medium text-gray-600">
                    {components.length} Komponenten
                  </span>
                  
                  <div className="border-l border-gray-200 h-6"></div>
                  
                  {/* Add Component Quick Menu */}
                  <div className="relative group">
                    <button
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Komponente hinzufügen"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Hinzufügen</span>
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
                        <h4 className="font-medium text-gray-900 mb-3">Komponente hinzufügen</h4>
                        
                        {/* Suchfeld */}
                        <div className="relative mb-3">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={componentSearchTerm}
                            onChange={(e) => setComponentSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Komponente suchen..."
                          />
                        </div>
                        
                        {(() => {
                          const categories = getComponentsByCategory();
                          const searchTerm = componentSearchTerm.toLowerCase();
                          
                          return Object.entries(categories).map(([categoryName, configs]) => {
                            // Filtere Komponenten basierend auf Suchbegriff
                            const filteredConfigs = searchTerm 
                              ? configs.filter(config => 
                                  config.label.toLowerCase().includes(searchTerm) ||
                                  config.type.toLowerCase().includes(searchTerm)
                                )
                              : configs;
                            
                            // Zeige Kategorie nur wenn es gefilterte Komponenten gibt
                            if (filteredConfigs.length === 0) return null;
                            
                            return (
                              <div key={categoryName} className="mb-4 last:mb-0">
                                <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                  {categoryName === 'sprechakte' && 'Sprechakte'}
                                  {categoryName === 'gebete' && 'Gebete & Segen'}
                                  {categoryName === 'lieder' && 'Lieder'}
                                  {categoryName === 'liturgien' && 'Liturgien'}
                                  {categoryName === 'bibellesungen' && 'Bibellesungen'}
                                  {categoryName === 'predigt' && 'Predigt'}
                                  {categoryName === 'sakramente' && 'Sakramente'}
                                  {categoryName === 'kasualien' && 'Kasualien'}
                                  {categoryName === 'frei' && 'Freie Komponenten'}
                                </h5>
                                <div className="grid grid-cols-2 gap-1">
                                  {filteredConfigs.map(config => (
                                    <button
                                      key={config.type}
                                      onClick={() => addComponent(config.type)}
                                      className={`flex items-center space-x-2 p-2 ${config.bgColor} hover:bg-${config.color}-200 ${config.textColor} rounded-lg transition-colors text-xs truncate`}
                                    >
                                      <span className="flex-shrink-0">{config.icon}</span>
                                      <span className="truncate">{config.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-l border-gray-200 h-6"></div>
                  
                  <button
                    onClick={saveComponents}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" className="text-white" />
                    ) : (
                      <CheckIcon className="w-4 h-4" />
                    )}
                    <span>Speichern</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button - Regular positioned for shorter lists */}
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