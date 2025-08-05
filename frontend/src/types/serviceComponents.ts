// Gottesdienst-Komponenten Typen und Konfiguration

export type ComponentType = 
  // Sprechakte (blau)
  | 'votum'
  | 'begruessung'
  | 'abkuendigungen'
  | 'kollekte'
  
  // Gebete & Segen (grün)
  | 'eingangsgebet'
  | 'fuerbitten'
  | 'segen'
  
  // Lieder (purple/lila - wie bisher)
  | 'lied'
  
  // Liturgien (orange)
  | 'kyrie'
  | 'gloria'
  | 'glaubensbekenntnis'
  | 'vater_unser'
  
  // Bibellesungen (gelb/amber)
  | 'altes_testament'
  | 'epistel'
  | 'predigttext'
  | 'evangelium'
  
  // Predigt (indigo/dunkelblau)
  | 'predigt'
  
  // Sakramente (rot)
  | 'abendmahl'
  | 'taufe';

export interface ComponentConfig {
  type: ComponentType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hasText: boolean;
  hasNumber: boolean; // für EG-Nummern etc.
  placeholder?: string;
  icon: string;
  category: 'sprechakte' | 'gebete' | 'lieder' | 'liturgien' | 'bibellesungen' | 'predigt' | 'sakramente';
  defaultDuration?: number; // in Minuten
}

export const COMPONENT_CONFIGS: Record<ComponentType, ComponentConfig> = {
  // Sprechakte (blau)
  votum: {
    type: 'votum',
    label: 'Votum',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Im Namen des Vaters und des Sohnes...',
    icon: '🎙️',
    category: 'sprechakte',
    defaultDuration: 1
  },
  
  begruessung: {
    type: 'begruessung',
    label: 'Begrüßung',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Herzlich willkommen zum Gottesdienst...',
    icon: '👋',
    category: 'sprechakte',
    defaultDuration: 2
  },
  
  abkuendigungen: {
    type: 'abkuendigungen',
    label: 'Abkündigungen',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Hinweise und Ankündigungen...',
    icon: '📢',
    category: 'sprechakte',
    defaultDuration: 3
  },
  
  kollekte: {
    type: 'kollekte',
    label: 'Kollekte',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Die heutige Kollekte ist bestimmt für...',
    icon: '💰',
    category: 'sprechakte',
    defaultDuration: 2
  },

  // Gebete & Segen (grün)
  eingangsgebet: {
    type: 'eingangsgebet',
    label: 'Eingangsgebet',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Guter Gott, wir sind zusammengekommen...',
    icon: '🙏',
    category: 'gebete',
    defaultDuration: 2
  },
  
  fuerbitten: {
    type: 'fuerbitten',
    label: 'Fürbitten',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Barmherziger Gott, wir bitten dich...',
    icon: '🤲',
    category: 'gebete',
    defaultDuration: 3
  },
  
  segen: {
    type: 'segen',
    label: 'Segen',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Es segne euch der allmächtige Gott...',
    icon: '✋',
    category: 'gebete',
    defaultDuration: 1
  },

  // Lieder (purple - wie bisher)
  lied: {
    type: 'lied',
    label: 'Lied',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    hasText: false,
    hasNumber: true,
    placeholder: 'EG 123 oder HELM 45 oder...',
    icon: '🎵',
    category: 'lieder',
    defaultDuration: 4
  },

  // Liturgien (orange)
  kyrie: {
    type: 'kyrie',
    label: 'Kyrie',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Herr, erbarme dich...',
    icon: '🎼',
    category: 'liturgien',
    defaultDuration: 2
  },
  
  gloria: {
    type: 'gloria',
    label: 'Gloria',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Ehre sei Gott in der Höhe...',
    icon: '✨',
    category: 'liturgien',
    defaultDuration: 2
  },
  
  glaubensbekenntnis: {
    type: 'glaubensbekenntnis',
    label: 'Glaubensbekenntnis',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Ich glaube an Gott, den Vater...',
    icon: '📖',
    category: 'liturgien',
    defaultDuration: 2
  },
  
  vater_unser: {
    type: 'vater_unser',
    label: 'Vater Unser',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-900',
    hasText: false,
    hasNumber: false,
    icon: '👨‍👧‍👦',
    category: 'liturgien',
    defaultDuration: 1
  },

  // Bibellesungen (gelb/amber)
  altes_testament: {
    type: 'altes_testament',
    label: 'Altes Testament',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    hasText: false,
    hasNumber: true,
    placeholder: '1. Mose 1,1-31',
    icon: '📜',
    category: 'bibellesungen',
    defaultDuration: 3
  },
  
  epistel: {
    type: 'epistel',
    label: 'Epistel',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    hasText: false,
    hasNumber: true,
    placeholder: 'Röm 8,1-11',
    icon: '✉️',
    category: 'bibellesungen',
    defaultDuration: 3
  },
  
  predigttext: {
    type: 'predigttext',
    label: 'Predigttext',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    hasText: false,
    hasNumber: true,
    placeholder: 'Mt 5,1-12',
    icon: '📖',
    category: 'bibellesungen',
    defaultDuration: 4
  },
  
  evangelium: {
    type: 'evangelium',
    label: 'Evangelium',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    hasText: false,
    hasNumber: true,
    placeholder: 'Joh 3,16-21',
    icon: '✝️',
    category: 'bibellesungen',
    defaultDuration: 3
  },

  // Predigt (indigo)
  predigt: {
    type: 'predigt',
    label: 'Predigt',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Liebe Gemeinde, der heutige Predigttext...',
    icon: '🗣️',
    category: 'predigt',
    defaultDuration: 15
  },

  // Sakramente (rot)
  abendmahl: {
    type: 'abendmahl',
    label: 'Abendmahl',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Einsetzungsworte und Austeilung...',
    icon: '🍞',
    category: 'sakramente',
    defaultDuration: 10
  },
  
  taufe: {
    type: 'taufe',
    label: 'Taufe',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Taufhandlung und Taufspruch...',
    icon: '💧',
    category: 'sakramente',
    defaultDuration: 8
  }
};

// Hilfsfunktionen
export const getComponentConfig = (type: ComponentType): ComponentConfig => {
  return COMPONENT_CONFIGS[type];
};

export const calculateDuration = (text: string, wordsPerMinute: number = 110): number => {
  if (!text || text.trim().length === 0) return 0;
  
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

export const formatDuration = (minutes: number): string => {
  if (minutes === 0) return '0 Min';
  if (minutes === 1) return '1 Min';
  return `${minutes} Min`;
};

export const getComponentsByCategory = () => {
  const categories: Record<string, ComponentConfig[]> = {};
  
  Object.values(COMPONENT_CONFIGS).forEach(config => {
    if (!categories[config.category]) {
      categories[config.category] = [];
    }
    categories[config.category].push(config);
  });
  
  return categories;
};