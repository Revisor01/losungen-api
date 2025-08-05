import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PencilIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { 
  ComponentType, 
  getComponentConfig, 
  calculateDuration, 
  formatDuration 
} from '../../types/serviceComponents';

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

interface ServiceComponentProps {
  component: ServiceComponentData;
  onUpdate: (component: ServiceComponentData) => void;
  onDelete: (componentId: number) => void;
  isEditing?: boolean;
}

export const ServiceComponent: React.FC<ServiceComponentProps> = ({
  component,
  onUpdate,
  onDelete,
  isEditing = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [localComponent, setLocalComponent] = useState(component);
  
  const config = getComponentConfig(component.component_type);
  
  // Automatische Zeitberechnung für Textfelder
  const calculatedDuration = config.hasText && localComponent.content 
    ? calculateDuration(localComponent.content)
    : config.defaultDuration || 0;
  
  const displayDuration = localComponent.duration_minutes || calculatedDuration;

  const handleSave = () => {
    // Automatische Dauer setzen wenn nicht manuell gesetzt
    if (!localComponent.duration_minutes && config.hasText && localComponent.content) {
      localComponent.duration_minutes = calculatedDuration;
    }
    
    onUpdate(localComponent);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setLocalComponent(component);
    setIsEditMode(false);
  };

  const updateField = (field: keyof ServiceComponentData, value: any) => {
    setLocalComponent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`card ${config.bgColor} ${config.borderColor} border-l-4`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold ${config.textColor}`}>
                {config.label}
              </h3>
              {displayDuration > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3" />
                  <span>{formatDuration(displayDuration)}</span>
                </div>
              )}
            </div>
            
            {/* Kurzer Inhalt oder Nummer anzeigen */}
            <div className="text-sm text-gray-600 mt-1">
              {config.hasNumber && localComponent.hymn_number && (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                  {localComponent.hymn_number}
                </span>
              )}
              {config.hasNumber && localComponent.bible_reference && (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                  {localComponent.bible_reference}
                </span>
              )}
              {config.hasText && localComponent.content && !isExpanded && (
                <span className="line-clamp-1">
                  {localComponent.content.slice(0, 100)}
                  {localComponent.content.length > 100 && '...'}
                </span>
              )}
              {!localComponent.content && !localComponent.hymn_number && !localComponent.bible_reference && (
                <span className="text-gray-400 italic">Noch nicht ausgefüllt</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bearbeiten Button */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Bearbeiten"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          
          {/* Expandieren Button (nur bei Text) */}
          {config.hasText && localComponent.content && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? "Einklappen" : "Ausklappen"}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          )}
          
          {/* Löschen Button */}
          <button
            onClick={() => component.id && onDelete(component.id)}
            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
            title="Löschen"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bearbeitungsmodus */}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 p-4 space-y-4"
        >
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={localComponent.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="input-field"
              placeholder={`${config.label} Titel`}
            />
          </div>

          {/* Nummer (für Lieder/Bibelstellen) */}
          {config.hasNumber && (
            <div className="grid grid-cols-2 gap-4">
              {config.type === 'lied' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lied-Nummer
                  </label>
                  <input
                    type="text"
                    value={localComponent.hymn_number || ''}
                    onChange={(e) => updateField('hymn_number', e.target.value)}
                    className="input-field"
                    placeholder="EG 123, HELM 45, ..."
                  />
                </div>
              )}
              
              {config.category === 'bibellesungen' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bibelstelle
                  </label>
                  <input
                    type="text"
                    value={localComponent.bible_reference || ''}
                    onChange={(e) => updateField('bible_reference', e.target.value)}
                    className="input-field"
                    placeholder={config.placeholder}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dauer (Min)
                </label>
                <input
                  type="number"
                  value={localComponent.duration_minutes || ''}
                  onChange={(e) => updateField('duration_minutes', parseInt(e.target.value) || undefined)}
                  className="input-field"
                  placeholder={`Auto: ${calculatedDuration}`}
                  min="1"
                />
              </div>
            </div>
          )}

          {/* Text-Inhalt */}
          {config.hasText && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Text-Inhalt
                </label>
                {localComponent.content && (
                  <span className="text-xs text-gray-500">
                    {calculateDuration(localComponent.content)} Min (bei 110 Wörtern/Min)
                  </span>
                )}
              </div>
              <textarea
                value={localComponent.content || ''}
                onChange={(e) => updateField('content', e.target.value)}
                className="input-field min-h-[120px] font-mono text-sm"
                placeholder={config.placeholder}
                rows={6}
              />
            </div>
          )}

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notizen
            </label>
            <textarea
              value={localComponent.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="input-field"
              placeholder="Zusätzliche Notizen..."
              rows={2}
            />
          </div>

          {/* Aktionen */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              Speichern
            </button>
          </div>
        </motion.div>
      )}

      {/* Erweiterte Textansicht */}
      {isExpanded && config.hasText && localComponent.content && !isEditMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 p-4"
        >
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap font-serif leading-relaxed">
              {localComponent.content}
            </div>
          </div>
          
          {localComponent.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Notizen:</h4>
              <p className="text-sm text-gray-600 italic">{localComponent.notes}</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};