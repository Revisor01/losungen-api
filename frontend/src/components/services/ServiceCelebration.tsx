import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { COMPONENT_CONFIGS, ComponentType } from '../../types/serviceComponents';
import { 
  ArrowLeftIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ServiceComponent {
  id: number;
  component_type: string;
  title: string;
  content?: string;
  bible_reference?: string;
  bible_translation?: string;
  bible_text?: string;
  hymn_number?: string;
  duration_minutes?: number;
  order_position: number;
}

interface Service {
  id: number;
  title: string;
  service_type: string;
  date: string;
  time: string;
  location: string;
  components: ServiceComponent[];
}

export const ServiceCelebration: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentComponentIndex, setCurrentComponentIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [componentStartTime, setComponentStartTime] = useState<number | null>(null);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  // Timer für die Gottesdienst-Zeit
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadService = async () => {
    if (!serviceId) return;
    
    setLoading(true);
    try {
      const response = await apiService.getService(parseInt(serviceId));
      if (response.success) {
        setService(response.data);
      } else {
        setError('Gottesdienst nicht gefunden');
      }
    } catch (err) {
      setError('Fehler beim Laden des Gottesdienstes');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const nextComponent = () => {
    if (service && currentComponentIndex < service.components.length - 1) {
      setCurrentComponentIndex(currentComponentIndex + 1);
      setComponentStartTime(Date.now());
    }
  };

  const prevComponent = () => {
    if (currentComponentIndex > 0) {
      setCurrentComponentIndex(currentComponentIndex - 1);
      setComponentStartTime(Date.now());
    }
  };

  const toggleTimer = () => {
    if (!isTimerRunning && !componentStartTime) {
      setComponentStartTime(Date.now());
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const renderBibleText = (component: ServiceComponent) => {
    if (!component.bible_text) return null;

    try {
      const bibleData = JSON.parse(component.bible_text);
      
      return (
        <div className="mt-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <h3 className="font-semibold text-blue-900 mb-4 text-lg">
              {component.bible_reference} ({component.bible_translation || 'LUT'})
            </h3>
            
            {bibleData.verses && bibleData.verses.length > 0 ? (
              <div className="space-y-4">
                {bibleData.verses.map((verse: any, index: number) => (
                  <div key={verse.number || index} className="flex space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                      {verse.number}
                    </span>
                    <p className="text-gray-800 leading-relaxed text-lg pt-1">
                      {verse.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-800 leading-relaxed text-lg">
                {bibleData.text || component.bible_text}
              </p>
            )}
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
          <h3 className="font-semibold text-blue-900 mb-4 text-lg">
            {component.bible_reference} ({component.bible_translation || 'LUT'})
          </h3>
          <p className="text-gray-800 leading-relaxed text-lg">
            {component.bible_text}
          </p>
        </div>
      );
    }
  };

  const renderContent = (component: ServiceComponent) => {
    if (!component.content) return null;

    // Format text with bold and italic
    const formattedContent = component.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    return (
      <div 
        className="mt-6 text-gray-800 leading-relaxed text-lg whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage message={error || 'Gottesdienst nicht gefunden'} />
      </div>
    );
  }

  const currentComponent = service.components[currentComponentIndex];
  const config = currentComponent ? COMPONENT_CONFIGS[currentComponent.component_type as ComponentType] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/service/${serviceId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{service.title}</h1>
            <p className="text-sm text-gray-600">
              {new Date(service.date).toLocaleDateString('de-DE')} um {service.time} - {service.location}
            </p>
          </div>
        </div>

        {/* Timer und Navigation */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-lg font-mono">
            <ClockIcon className="w-5 h-5 text-gray-600" />
            <span className={`font-bold ${isTimerRunning ? 'text-green-600' : 'text-gray-600'}`}>
              {formatTime(elapsedTime)}
            </span>
            <button
              onClick={toggleTimer}
              className="ml-2 p-1 hover:bg-gray-100 rounded"
            >
              {isTimerRunning ? (
                <PauseIcon className="w-4 h-4 text-gray-600" />
              ) : (
                <PlayIcon className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{currentComponentIndex + 1} / {service.components.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {currentComponent && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {/* Component Header */}
              <div className="flex items-center space-x-4 mb-6">
                <div className={`p-3 rounded-lg ${config?.bgColor || 'bg-gray-100'}`}>
                  <span className="text-2xl">{config?.icon || '📄'}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {currentComponent.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="capitalize">{config?.label || currentComponent.component_type}</span>
                    {currentComponent.duration_minutes && (
                      <span>⏱️ {currentComponent.duration_minutes} Min</span>
                    )}
                    {currentComponent.hymn_number && (
                      <span>🎵 Nr. {currentComponent.hymn_number}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bible Text */}
              {renderBibleText(currentComponent)}

              {/* Content */}
              {renderContent(currentComponent)}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-center space-x-6">
        <button
          onClick={prevComponent}
          disabled={currentComponentIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Vorherige</span>
        </button>

        <div className="text-sm text-gray-600 font-medium">
          {currentComponent?.title}
        </div>

        <button
          onClick={nextComponent}
          disabled={currentComponentIndex === service.components.length - 1}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <span>Nächste</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};