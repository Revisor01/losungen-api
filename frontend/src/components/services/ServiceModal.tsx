import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon,
  BookOpenIcon,
  UserGroupIcon,
  TagIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

interface Perikope {
  id: number;
  event_name: string;
  event_type: string;
  liturgical_color?: string;
  season?: string;
  perikope_I?: string;
  perikope_II?: string;
  perikope_III?: string;
  perikope_IV?: string;
  perikope_V?: string;
  perikope_VI?: string;
  psalm?: string;
  weekly_verse?: string;
  weekly_verse_reference?: string;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serviceData: any) => Promise<void>;
  preselectedPerikope?: Perikope;
  preselectedDate?: Date;
  loading?: boolean;
  onServiceCreated?: (serviceId: number) => void;
  existingServices?: any[];
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedPerikope,
  preselectedDate,
  loading = false,
  onServiceCreated,
  existingServices = []
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: preselectedPerikope ? `${preselectedPerikope.event_name} ${(preselectedDate || new Date()).getFullYear()}` : '',
    service_type: 'regular',
    date: (preselectedDate || new Date()).toISOString().split('T')[0],
    time: '10:00',
    location: 'Hauptkirche',
    perikope_id: preselectedPerikope?.id || null,
    chosen_perikope: 'III', // Evangelium als Default
    congregation_size: '',
    notes: '',
    tags: [] as string[]
  });

  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Update form data when preselected props change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      title: preselectedPerikope ? `${preselectedPerikope.event_name} ${(preselectedDate || new Date()).getFullYear()}` : prev.title,
      date: (preselectedDate || new Date()).toISOString().split('T')[0],
      perikope_id: preselectedPerikope?.id || prev.perikope_id,
    }));
  }, [preselectedPerikope, preselectedDate]);

  const serviceTypes = [
    { value: 'regular', label: 'Regulärer Gottesdienst' },
    { value: 'wedding', label: 'Hochzeit' },
    { value: 'funeral', label: 'Beerdigung' },
    { value: 'baptism', label: 'Taufe' },
    { value: 'confirmation', label: 'Konfirmation' },
    { value: 'special', label: 'Besonderer Gottesdienst' }
  ];

  const perikopeOptions = [
    { value: 'I', label: 'Perikope I (AT-Lesung)', text: preselectedPerikope?.perikope_I },
    { value: 'II', label: 'Perikope II (Epistel)', text: preselectedPerikope?.perikope_II },
    { value: 'III', label: 'Perikope III (Evangelium)', text: preselectedPerikope?.perikope_III },
    { value: 'IV', label: 'Perikope IV', text: preselectedPerikope?.perikope_IV },
    { value: 'V', label: 'Perikope V', text: preselectedPerikope?.perikope_V },
    { value: 'VI', label: 'Perikope VI', text: preselectedPerikope?.perikope_VI }
  ].filter(option => option.text); // Nur Perikopen anzeigen die auch Text haben

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const serviceData = {
      ...formData,
      congregation_size: formData.congregation_size ? parseInt(formData.congregation_size) : null,
      tags: formData.tags.length > 0 ? formData.tags : undefined
    };

    await onSubmit(serviceData);
    
    // Reset form nach erfolgreichem Submit
    setFormData({
      title: preselectedPerikope ? `${preselectedPerikope.event_name} ${(preselectedDate || new Date()).getFullYear()}` : '',
      service_type: 'regular',
      date: (preselectedDate || new Date()).toISOString().split('T')[0],
      time: '10:00',
      location: 'Hauptkirche',
      perikope_id: preselectedPerikope?.id || null,
      chosen_perikope: 'III',
      congregation_size: '',
      notes: '',
      tags: []
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="font-heading text-xl font-semibold text-gray-900">
                  Neuen Gottesdienst anlegen
                </h3>
                {preselectedPerikope && (
                  <p className="text-sm text-gray-600 mt-1">
                    Für: {preselectedPerikope.event_name}
                    {preselectedPerikope.season && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {preselectedPerikope.season}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Services */}
            {existingServices.length > 0 && (
              <div className="px-6 pb-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Bestehende Gottesdienste zu diesem Feiertag:
                  </h4>
                  <div className="space-y-2">
                    {existingServices.map((service, index) => (
                      <div key={service.id || index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <span className="font-medium">{service.title}</span>
                          <div className="text-sm text-gray-600">
                            {new Date(service.date).toLocaleDateString('de-DE')} um {service.time || '10:00'} Uhr
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/service/${service.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Grunddaten */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Grunddaten
                </h4>

                {/* Titel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field"
                    placeholder="z.B. 1. Advent 2025"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Art des Gottesdienstes
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                    className="input-field"
                    disabled={loading}
                  >
                    {serviceTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Datum und Zeit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Datum *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="input-field"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <ClockIcon className="w-4 h-4 inline mr-1" />
                      Uhrzeit
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      className="input-field"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Ort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    Ort
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="input-field"
                    placeholder="Hauptkirche"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Perikope Auswahl */}
              {preselectedPerikope && perikopeOptions.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <BookOpenIcon className="w-5 h-5 mr-2" />
                    Perikope auswählen
                  </h4>
                  
                  <div className="grid gap-3">
                    {perikopeOptions.map(option => (
                      <label
                        key={option.value}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.chosen_perikope === option.value
                            ? 'border-royal-300 bg-royal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="chosen_perikope"
                          value={option.value}
                          checked={formData.chosen_perikope === option.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, chosen_perikope: e.target.value }))}
                          className="mt-1 mr-3"
                          disabled={loading}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{option.text}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Zusätzliche Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Zusätzliche Details</h4>

                {/* Teilnehmerzahl */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <UserGroupIcon className="w-4 h-4 inline mr-1" />
                    Geschätzte Teilnehmerzahl
                  </label>
                  <input
                    type="number"
                    value={formData.congregation_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, congregation_size: e.target.value }))}
                    className="input-field"
                    placeholder="z.B. 120"
                    min="1"
                    disabled={loading}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TagIcon className="w-4 h-4 inline mr-1" />
                    Tags (für bessere Suche)
                  </label>
                  
                  {/* Vorhandene Tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-500 hover:text-blue-700"
                            disabled={loading}
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag hinzufügen */}
                  {showTagInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="input-field flex-1"
                        placeholder="Tag eingeben..."
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="btn-primary px-4"
                        disabled={loading}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTagInput(false);
                          setNewTag('');
                        }}
                        className="btn-secondary px-4"
                        disabled={loading}
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTagInput(true)}
                      className="flex items-center text-sm text-royal-600 hover:text-royal-700"
                      disabled={loading}
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Tag hinzufügen
                    </button>
                  )}
                </div>

                {/* Notizen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notizen
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Besondere Anmerkungen zu diesem Gottesdienst..."
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !formData.title.trim()}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Erstelle...
                    </>
                  ) : (
                    'Gottesdienst erstellen'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};