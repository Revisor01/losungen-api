import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { 
  ComponentType, 
  getComponentsByCategory, 
  getComponentConfig,
  ComponentConfig
} from '../../types/serviceComponents';

interface ComponentSelectorProps {
  onSelectComponent: (type: ComponentType) => void;
  existingComponents?: ComponentType[];
}

export const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  onSelectComponent,
  existingComponents = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = getComponentsByCategory();
  const categoryNames = {
    'sprechakte': '🎙️ Sprechakte',
    'gebete': '🙏 Gebete & Segen',
    'lieder': '🎵 Lieder',
    'liturgien': '🎼 Liturgien',
    'bibellesungen': '📖 Bibellesungen',
    'predigt': '🗣️ Predigt',
    'sakramente': '✝️ Sakramente'
  };

  const handleSelectComponent = (type: ComponentType) => {
    onSelectComponent(type);
    setIsOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="relative">
      {/* Add Component Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300 hover:border-green-400 rounded-lg flex items-center justify-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        <span className="font-medium">Komponente hinzufügen</span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 md:w-4xl md:max-w-4xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Komponente auswählen
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {selectedCategory ? (
                  /* Component List */
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {categoryNames[selectedCategory as keyof typeof categoryNames]}
                      </h3>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        ← Zurück zu Kategorien
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories[selectedCategory]?.map((config: ComponentConfig) => {
                        const isUsed = existingComponents.includes(config.type);
                        return (
                          <motion.button
                            key={config.type}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectComponent(config.type)}
                            disabled={isUsed}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              isUsed 
                                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                : `${config.borderColor} ${config.bgColor} hover:shadow-md`
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{config.icon}</span>
                              <div>
                                <h4 className={`font-semibold ${config.textColor}`}>
                                  {config.label}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {config.hasText && 'Text-Eingabe'}
                                  {config.hasNumber && 'Nummer/Referenz'}
                                  {config.defaultDuration && ` • ${config.defaultDuration} Min`}
                                </p>
                                {isUsed && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Bereits hinzugefügt
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Category Selection */
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Kategorie wählen
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(categoryNames).map(([key, name]) => {
                        const componentCount = categories[key]?.length || 0;
                        const usedCount = categories[key]?.filter(c => 
                          existingComponents.includes(c.type)
                        ).length || 0;
                        
                        return (
                          <motion.button
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedCategory(key)}
                            className="p-6 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-left transition-all"
                          >
                            <div className="text-center">
                              <h4 className="font-semibold text-gray-900 mb-2">
                                {name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {componentCount} Komponenten
                              </p>
                              {usedCount > 0 && (
                                <p className="text-xs text-green-600 mt-1">
                                  {usedCount} bereits hinzugefügt
                                </p>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};