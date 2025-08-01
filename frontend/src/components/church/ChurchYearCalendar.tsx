import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon, 
  BookOpenIcon, 
  MusicalNoteIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { ICSParser, ChurchEvent } from '../../utils/icsParser';
import { useNavigate } from 'react-router-dom';

export const ChurchYearCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todaysEvents, setTodaysEvents] = useState<ChurchEvent[]>([]);
  const [nextEvent, setNextEvent] = useState<ChurchEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  useEffect(() => {
    loadChurchYearData();
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
      // In real app, this would load from the ICS file
      // For now, we'll use a mock implementation or fetch from public folder
      const response = await fetch('/kirchenjahr-evangelisch-all.ics');
      if (response.ok) {
        const icsContent = await response.text();
        const parsedEvents = ICSParser.parseICS(icsContent);
        setEvents(parsedEvents);
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
                  {/* Event Header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
                          {selectedEvent.summary}
                        </h2>
                        <p className="text-lg text-gray-600">
                          {formatDate(selectedEvent.date)}
                        </p>
                      </div>
                      
                      {selectedEvent.liturgicalColor && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          ICSParser.getLiturgicalColorClass(selectedEvent.liturgicalColor)
                        }`}>
                          {selectedEvent.liturgicalColor}
                        </span>
                      )}
                    </div>
                    
                    {selectedEvent.season && (
                      <div className="inline-block bg-royal-100 text-royal-800 px-3 py-1 rounded-full text-sm font-medium">
                        {selectedEvent.season}
                      </div>
                    )}
                  </div>

                  {/* Biblical Texts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {selectedEvent.weeklyVerse && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <BookOpenIcon className="w-4 h-4 mr-2" />
                          Wochenspruch
                        </h4>
                        <p className="text-sm text-gray-700">{selectedEvent.weeklyVerse}</p>
                      </div>
                    )}
                    
                    {selectedEvent.psalm && (
                      <BibleReferenceCard
                        title="Psalm"
                        reference={selectedEvent.psalm}
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

                  {/* Perikopen */}
                  {selectedEvent.perikopen && Object.keys(selectedEvent.perikopen).length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Perikopenreihen</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedEvent.perikopen).map(([reihe, text]) => (
                          <motion.button
                            key={reihe}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleBibleReferenceClick(text)}
                            className="bg-blue-50 hover:bg-blue-100 rounded-lg p-3 text-left transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-blue-900 text-sm block">
                                  Reihe {reihe}
                                </span>
                                <span className="text-blue-800 text-sm">{text}</span>
                              </div>
                              <MagnifyingGlassIcon className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedEvent.hymn && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-2 flex items-center">
                          <MusicalNoteIcon className="w-4 h-4 mr-2" />
                          Wochenlied
                        </h4>
                        <p className="text-sm text-purple-800">{selectedEvent.hymn}</p>
                      </div>
                    )}
                    
                    {selectedEvent.url && (
                      <div className="flex justify-center md:justify-start items-center">
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
                  </div>
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
      </div>
    </div>
  );
};

interface BibleReferenceCardProps {
  title: string;
  reference: string;
  onClick: (reference: string) => void;
}

const BibleReferenceCard: React.FC<BibleReferenceCardProps> = ({ title, reference, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onClick(reference)}
    className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors group w-full"
  >
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-700">{reference}</p>
      </div>
      <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </motion.button>
);