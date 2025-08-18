import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon, 
  BookOpenIcon, 
  MusicalNoteIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { ICSParser, ChurchEvent } from '../../utils/icsParser';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ServiceModal } from '../services/ServiceModal';

export const ChurchYearCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todaysEvents, setTodaysEvents] = useState<ChurchEvent[]>([]);
  const [nextEvent, setNextEvent] = useState<ChurchEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Gottesdienst Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedPerikope, setSelectedPerikope] = useState<any>(null);
  const [creatingService, setCreatingService] = useState(false);
  const [perikopes, setPerikopes] = useState<any[]>([]);
  const [existingServices, setExistingServices] = useState<any[]>([]);

  useEffect(() => {
    loadChurchYearData();
    loadPerikopes();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const today = new Date();
      const todayEvents = ICSParser.findEventsForDate(events, today);
      const next = ICSParser.findNextEvent(events, today);
      
      setTodaysEvents(todayEvents);
      setNextEvent(next);
      
      // Auto-select today's event if available
      if (todayEvents.length > 0) {
        setSelectedEvent(todayEvents[0]);
      } else if (next) {
        setSelectedEvent(next);
      }
    }
  }, [events]);

  const loadChurchYearData = async () => {
    try {
      // Load events from database API
      const response = await apiService.getUpcomingChurchEvents(50); // Get more events for full year view
      if (response.success && response.data) {
        const churchEvents: ChurchEvent[] = response.data.map(event => ({
          uid: event.uid,
          summary: event.summary,
          description: '', // No longer stored in database
          date: new Date(event.event_date),
          url: event.url,
          liturgicalColor: event.liturgical_color,
          season: event.season,
          weeklyVerse: event.weekly_verse,
          weeklyVerseReference: event.weekly_verse_reference,
          psalm: event.psalm,
          psalm_eg: event.psalm_eg,
          oldTestamentReading: event.old_testament_reading,
          epistle: event.epistle,
          gospel: event.gospel,
          sermonText: event.sermon_text,
          hymn: event.hymn,
          hymn1: event.hymn1,
          hymn2: event.hymn2,
          hymn1_eg: event.hymn1_eg,
          hymn2_eg: event.hymn2_eg,
          perikopen: event.perikopen
        }));
        setEvents(churchEvents);
      } else {
        // Fallback: Create some mock events for demonstration
        createMockEvents();
      }
    } catch (error) {
      console.error('Failed to load church year data:', error);
      createMockEvents();
    }
    setLoading(false);
  };

  const loadPerikopes = async () => {
    try {
      const response = await apiService.getPerikopes();
      if (response.success && response.data) {
        setPerikopes(response.data);
      }
    } catch (error) {
      console.error('Failed to load perikopes:', error);
    }
  };

  const createMockEvents = () => {
    const mockEvents: ChurchEvent[] = [
      {
        uid: 'mock-1',
        summary: '1. Advent',
        description: 'Beginn der Adventszeit',
        date: new Date(2025, 11, 1), // December 1, 2025
        liturgicalColor: 'Violett',
        season: 'Adventszeit',
        weeklyVerse: 'Siehe, dein König kommt zu dir, ein Gerechter und ein Helfer. (Sach 9,9a)',
        psalm: 'Ps 24',
        epistle: 'Röm 13,8–12',
        gospel: 'Mt 21,1–11',
        sermonText: 'Mt 21,1–11',
        hymn: 'Nun komm, der Heiden Heiland',
        url: 'https://www.kirchenjahr-evangelisch.de/'
      },
      // Add more mock events as needed
    ];
    
    setEvents(mockEvents);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
    
    const dayEvents = ICSParser.findEventsForDate(events, newDate);
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
    } else {
      setSelectedEvent(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleBibleReferenceClick = (reference: string) => {
    // Navigate to search with pre-filled reference
    navigate(`/search?ref=${encodeURIComponent(reference)}`);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEvent({ ...selectedEvent });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEvent(null);
  };

  const handleSave = async () => {
    if (!editedEvent) return;
    
    setSaving(true);
    try {
      const response = await apiService.updateChurchEvent(editedEvent);
      if (response.success && response.data) {
        // Update local state
        const updatedEvents = events.map(e => 
          e.uid === response.data.uid ? { ...e, ...response.data } : e
        );
        setEvents(updatedEvents);
        setSelectedEvent({ ...selectedEvent, ...response.data });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateEditedField = (field: string, value: string) => {
    setEditedEvent({ ...editedEvent, [field]: value });
  };

  const loadExistingServices = async (eventName: string, eventDate: Date) => {
    try {
      const response = await apiService.getServices();
      if (response.success && response.data) {
        // Filter services by event name and date
        const dateStr = eventDate.toISOString().split('T')[0];
        const matchingServices = response.data.filter((service: any) => 
          service.title.includes(eventName) || service.date === dateStr
        );
        setExistingServices(matchingServices);
      }
    } catch (error) {
      console.error('Fehler beim Laden bestehender Gottesdienste:', error);
      setExistingServices([]);
    }
  };

  const handleCreateService = async (event?: ChurchEvent) => {
    if (event) {
      // Improved perikope matching - try exact match first, then fuzzy matching
      let matchingPerikope = perikopes.find(p => p.event_name === event.summary);
      
      if (!matchingPerikope) {
        // Try fuzzy matching for common differences
        const eventSummary = event.summary.toLowerCase().trim();
        matchingPerikope = perikopes.find(p => {
          const eventName = p.event_name.toLowerCase().trim();
          
          // Direct partial matches
          if (eventName.includes(eventSummary) || eventSummary.includes(eventName)) {
            return true;
          }
          
          // Handle Advent variations (1. Advent vs 4. Advent etc.)
          if (eventSummary.includes('advent') && eventName.includes('advent')) {
            return true;
          }
          
          // Handle Sunday variations (So. n. = Sonntag nach)
          if (eventSummary.includes('sonntag') && eventName.includes('so.')) {
            return true;
          }
          
          // Handle special cases
          if (eventSummary.includes('weihnacht') && eventName.includes('christfest')) {
            return true;
          }
          
          if (eventSummary.includes('ostern') && eventName.includes('ostern')) {
            return true;
          }
          
          return false;
        });
      }
      
      // Debugging: log the matching attempt
      console.log('Event summary:', event.summary);
      console.log('Available perikopes:', perikopes.map(p => p.event_name));
      console.log('Found matching perikope:', matchingPerikope?.event_name || 'None');
      
      setSelectedPerikope(matchingPerikope || null);
      setSelectedDate(event.date);
      
      // Load existing services for this event
      await loadExistingServices(event.summary, event.date);
    } else {
      setSelectedPerikope(null);
      setExistingServices([]);
    }
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (serviceData: any) => {
    setCreatingService(true);
    try {
      const response = await apiService.createService(serviceData);
      if (response.success && response.data) {
        setShowServiceModal(false);
        setSelectedPerikope(null);
        // Navigate to the service editor
        navigate(`/service/${response.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create service:', error);
    } finally {
      setCreatingService(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-royal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Kirchenjahr-Kalender wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="card p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                Kirchenjahr-Kalender
              </h1>
              <p className="text-gray-600">
                Liturgische Feste und Zeiten im evangelischen Kirchenjahr mit Perikopen und Wochensprüchen.
              </p>
            </div>
            <div className="text-right">
              <CalendarIcon className="w-12 h-12 text-royal-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Kirchenjahr</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Today & Navigation */}
          <div className="space-y-6">
            {/* Today's Events */}
            <div className="card p-6">
              <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                Heute
              </h3>
              
              {todaysEvents.length > 0 ? (
                <div className="space-y-3">
                  {todaysEvents.map((event) => (
                    <motion.div
                      key={event.uid}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedEvent(event)}
                      className="p-3 rounded-lg bg-royal-50 hover:bg-royal-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-royal-900">{event.summary}</h4>
                        {event.liturgicalColor && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ICSParser.getLiturgicalColorClass(event.liturgicalColor)
                          }`}>
                            {event.liturgicalColor}
                          </span>
                        )}
                      </div>
                      {event.season && (
                        <p className="text-sm text-royal-700 mt-1">{event.season}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Heute ist kein besonderer liturgischer Tag.</p>
              )}
            </div>

            {/* Next Event */}
            {nextEvent && (
              <div className="card p-6">
                <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                  Nächstes Fest
                </h3>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedEvent(nextEvent)}
                  className="p-3 rounded-lg bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-900">{nextEvent.summary}</h4>
                    {nextEvent.liturgicalColor && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ICSParser.getLiturgicalColorClass(nextEvent.liturgicalColor)
                      }`}>
                        {nextEvent.liturgicalColor}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-green-700">
                    {formatDate(nextEvent.date)}
                  </p>
                  {nextEvent.season && (
                    <p className="text-sm text-green-600 mt-1">{nextEvent.season}</p>
                  )}
                </motion.div>
              </div>
            )}

            {/* Date Navigation */}
            <div className="card p-6">
              <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                Datum durchsuchen
              </h3>
              
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedDate)}
                  </p>
                </div>
                
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
              
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setSelectedDate(newDate);
                  const dayEvents = ICSParser.findEventsForDate(events, newDate);
                  setSelectedEvent(dayEvents.length > 0 ? dayEvents[0] : null);
                }}
                className="input-field"
              />
            </div>
          </div>

          {/* Right Columns: Event Details */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedEvent ? (
                <motion.div
                  key={selectedEvent.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="card p-8"
                >
                  {/* Edit Controls - positioned bottom right */}
                  {isAuthenticated && (
                    <div className="absolute bottom-4 right-4 flex space-x-2">
                      {isEditing ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4 text-gray-600" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSave}
                            disabled={saving}
                            className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition-colors"
                          >
                            <CheckIcon className="w-4 h-4 text-green-600" />
                          </motion.button>
                        </>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleEdit}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* Event Header */}
                  <div className="mb-6 mt-2">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
                          {selectedEvent.summary}
                        </h2>
                        <p className="text-lg text-gray-600">
                          {formatDate(selectedEvent.date)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3" style={{ marginRight: '60px' }}>
                        {/* Gottesdienst anlegen Button */}
                        {isAuthenticated && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCreateService(selectedEvent)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                            title="Neuen Gottesdienst für diesen Feiertag anlegen"
                          >
                            <PlusIcon className="w-4 h-4" />
                            <span>Gottesdienst anlegen</span>
                          </motion.button>
                        )}
                        
                        {selectedEvent.liturgicalColor && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            ICSParser.getLiturgicalColorClass(selectedEvent.liturgicalColor)
                          }`}>
                            {selectedEvent.liturgicalColor}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {selectedEvent.season && (
                      <div className="inline-block bg-royal-100 text-royal-800 px-3 py-1 rounded-full text-sm font-medium">
                        {selectedEvent.season}
                      </div>
                    )}
                  </div>

                  {/* Edit Form - shown when editing */}
                  {isEditing && editedEvent && (
                    <div className="mb-8 bg-blue-50 rounded-lg p-6">
                      <h3 className="font-semibold text-blue-900 mb-4">Ereignis bearbeiten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Basic Fields */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                          <input
                            type="text"
                            value={editedEvent.summary || ''}
                            onChange={(e) => updateEditedField('summary', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Liturgische Farbe</label>
                          <input
                            type="text"
                            value={editedEvent.liturgicalColor || ''}
                            onChange={(e) => updateEditedField('liturgicalColor', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        
                        {/* Season and Verse */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kirchenjahreszeit</label>
                          <input
                            type="text"
                            value={editedEvent.season || ''}
                            onChange={(e) => updateEditedField('season', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wochenspruch Referenz</label>
                          <input
                            type="text"
                            value={editedEvent.weeklyVerseReference || ''}
                            onChange={(e) => updateEditedField('weeklyVerseReference', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        
                        {/* Weekly Verse - full width */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wochenspruch</label>
                          <textarea
                            value={editedEvent.weeklyVerse || ''}
                            onChange={(e) => updateEditedField('weeklyVerse', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                            rows={2}
                          />
                        </div>
                        
                        {/* Biblical Readings */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Psalm</label>
                          <input
                            type="text"
                            value={editedEvent.psalm || ''}
                            onChange={(e) => updateEditedField('psalm', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Psalm EG Nummer</label>
                          <input
                            type="text"
                            value={editedEvent.psalm_eg || ''}
                            onChange={(e) => updateEditedField('psalm_eg', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                            placeholder="z.B. EG 311"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">AT-Lesung</label>
                          <input
                            type="text"
                            value={editedEvent.oldTestamentReading || ''}
                            onChange={(e) => updateEditedField('oldTestamentReading', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Epistel</label>
                          <input
                            type="text"
                            value={editedEvent.epistle || ''}
                            onChange={(e) => updateEditedField('epistle', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Evangelium</label>
                          <input
                            type="text"
                            value={editedEvent.gospel || ''}
                            onChange={(e) => updateEditedField('gospel', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        
                        {/* Hymns */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lied 1</label>
                          <input
                            type="text"
                            value={editedEvent.hymn1 || ''}
                            onChange={(e) => updateEditedField('hymn1', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">EG Nummer 1</label>
                          <input
                            type="text"
                            value={editedEvent.hymn1_eg || ''}
                            onChange={(e) => updateEditedField('hymn1_eg', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lied 2</label>
                          <input
                            type="text"
                            value={editedEvent.hymn2 || ''}
                            onChange={(e) => updateEditedField('hymn2', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">EG Nummer 2</label>
                          <input
                            type="text"
                            value={editedEvent.hymn2_eg || ''}
                            onChange={(e) => updateEditedField('hymn2_eg', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wochenspruch - volle Breite */}
                  <div className="mb-4">
                    {selectedEvent.weeklyVerse && (
                      <motion.div
                        className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                        onClick={() => selectedEvent.weeklyVerseReference && handleBibleReferenceClick(selectedEvent.weeklyVerseReference)}
                        whileHover={{ scale: 1.01 }}
                      >
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <BookOpenIcon className="w-4 h-4 mr-2" />
                          Wochenspruch
                          {selectedEvent.weeklyVerseReference && (
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 ml-auto transition-colors" />
                          )}
                        </h4>
                        <p className="text-sm text-gray-700">{selectedEvent.weeklyVerse}</p>
                        {selectedEvent.weeklyVerseReference && (
                          <p className="text-xs text-gray-500 mt-1 italic">— {selectedEvent.weeklyVerseReference}</p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* 2x2 Grid: Psalm, AT, Epistel, Evangelium */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {selectedEvent.psalm && (
                      <BibleReferenceCard
                        title="Psalm"
                        reference={selectedEvent.psalm}
                        onClick={handleBibleReferenceClick}
                        badge={selectedEvent.psalm_eg ? selectedEvent.psalm_eg.toString() : undefined}
                      />
                    )}
                    
                    {selectedEvent.oldTestamentReading && (
                      <BibleReferenceCard
                        title="AT-Lesung"
                        reference={selectedEvent.oldTestamentReading}
                        onClick={handleBibleReferenceClick}
                      />
                    )}
                    
                    {selectedEvent.epistle && (
                      <BibleReferenceCard
                        title="Epistel"
                        reference={selectedEvent.epistle}
                        onClick={handleBibleReferenceClick}
                      />
                    )}
                    
                    {selectedEvent.gospel && (
                      <BibleReferenceCard
                        title="Evangelium"
                        reference={selectedEvent.gospel}
                        onClick={handleBibleReferenceClick}
                      />
                    )}
                  </div>

                  {/* Wochenlieder 1x2 Grid */}  
                  {(isEditing || selectedEvent.hymn1 || selectedEvent.hymn2 || selectedEvent.hymn) && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                        <MusicalNoteIcon className="w-4 h-4 mr-2" />
                        Wochenlieder
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Hymn 1 Card */}
                        {(selectedEvent.hymn1 || isEditing) && (
                          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <MusicalNoteIcon className="w-4 h-4 text-purple-600 mr-2" />
                                  <span className="text-sm font-medium text-purple-700">Lied 1</span>
                                  {selectedEvent.hymn1_eg && (
                                    <span className="ml-2 px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full">
                                      {selectedEvent.hymn1_eg}
                                    </span>
                                  )}
                                </div>
                                <p className="text-purple-900 font-medium">
                                  {selectedEvent.hymn1 || (isEditing ? '(Leer - Bitte bearbeiten)' : 'Nicht gesetzt')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Hymn 2 Card */}
                        {(selectedEvent.hymn2 || isEditing) && (
                          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <MusicalNoteIcon className="w-4 h-4 text-purple-600 mr-2" />
                                  <span className="text-sm font-medium text-purple-700">Lied 2</span>
                                  {selectedEvent.hymn2_eg && (
                                    <span className="ml-2 px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full">
                                      {selectedEvent.hymn2_eg}
                                    </span>
                                  )}
                                </div>
                                <p className="text-purple-900 font-medium">
                                  {selectedEvent.hymn2 || (isEditing ? '(Leer - Bitte bearbeiten)' : 'Nicht gesetzt')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Legacy hymn field - only show if no hymn1/hymn2 */}
                        {selectedEvent.hymn && !selectedEvent.hymn1 && !selectedEvent.hymn2 && (
                          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400 md:col-span-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <MusicalNoteIcon className="w-4 h-4 text-purple-600 mr-2" />
                                  <span className="text-sm font-medium text-purple-700">Lied</span>
                                </div>
                                <p className="text-purple-900 font-medium">{selectedEvent.hymn}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Perikopen */}
                  {selectedEvent.perikopen && Object.keys(selectedEvent.perikopen).length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Perikopenreihen</h4>
                        <span className="text-sm text-gray-600">Aktuell: Reihe I (bis 1. Advent 2025)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedEvent.perikopen).map(([reihe, text]) => {
                          // Current year's Perikope is Reihe I until Advent 2025
                          const isCurrentPerikope = reihe === 'I';
                          
                          return (
                            <motion.button
                              key={reihe}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleBibleReferenceClick(text)}
                              className={`${
                                isCurrentPerikope 
                                  ? 'bg-royal-100 hover:bg-royal-200 ring-2 ring-royal-400' 
                                  : 'bg-blue-50 hover:bg-blue-100'
                              } rounded-lg p-3 text-left transition-colors group`}
                            >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className={`font-medium text-sm block ${
                                  isCurrentPerikope ? 'text-royal-900' : 'text-blue-900'
                                }`}>
                                  Reihe {reihe} {isCurrentPerikope && '(Predigttext)'}
                                </span>
                                <span className={`text-sm ${
                                  isCurrentPerikope ? 'text-royal-800' : 'text-blue-800'
                                }`}>{text}</span>
                              </div>
                              <MagnifyingGlassIcon className={`w-4 h-4 ${
                                isCurrentPerikope ? 'text-royal-600' : 'text-blue-600'
                              } opacity-0 group-hover:opacity-100 transition-opacity`} />
                            </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Link */}
                  {selectedEvent.url && (
                    <div className="flex justify-center items-center">
                      <a
                          href={selectedEvent.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-royal-600 hover:text-royal-700 transition-colors"
                        >
                          <span>Mehr Informationen</span>
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-8 text-center"
                >
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-heading text-xl font-semibold text-gray-900 mb-2">
                    Kein Ereignis ausgewählt
                  </h3>
                  <p className="text-gray-600">
                    Wähle ein Datum oder klicke auf ein Ereignis, um Details anzuzeigen.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Service Modal */}
        <ServiceModal
          isOpen={showServiceModal}
          onClose={() => {
            setShowServiceModal(false);
            setSelectedPerikope(null);
            setExistingServices([]);
          }}
          onSubmit={handleServiceSubmit}
          preselectedPerikope={selectedPerikope}
          preselectedDate={selectedDate}
          existingServices={existingServices}
          loading={creatingService}
        />
      </div>
    </div>
  );
};

interface BibleReferenceCardProps {
  title: string;
  reference: string;
  onClick: (reference: string) => void;
  badge?: string;
}

const BibleReferenceCard: React.FC<BibleReferenceCardProps> = ({ title, reference, onClick, badge }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onClick(reference)}
    className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors group w-full"
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-700">
          {reference}
          {badge && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {badge}
            </span>
          )}
        </p>
      </div>
      <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </motion.button>
);