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
  | 'ehr_sei_dem_vater'
  
  // Bibellesungen (gelb/amber)
  | 'altes_testament'
  | 'epistel'
  | 'predigttext'
  | 'evangelium'
  | 'psalm'
  
  // Predigt (indigo/dunkelblau)
  | 'predigt'
  
  // Sakramente (rot)
  | 'abendmahl'
  | 'taufe'
  
  // Kasualien-spezifisch (teal/türkis)
  | 'trauversprechen'
  | 'taufformel'
  | 'trauerrede'
  | 'konfirmationssegen'
  | 'trauung_ringtausch'
  | 'bestattung_erdwurf'
  
  // Freie Komponenten (grau)
  | 'freie_komponente';

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
  category: 'sprechakte' | 'gebete' | 'lieder' | 'liturgien' | 'bibellesungen' | 'predigt' | 'sakramente' | 'kasualien' | 'frei';
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
    hasText: false,
    hasNumber: false,
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
    hasText: false,
    hasNumber: false,
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
    hasText: true,
    hasNumber: false,
    icon: '👨‍👧‍👦',
    category: 'liturgien',
    defaultDuration: 1
  },

  ehr_sei_dem_vater: {
    type: 'ehr_sei_dem_vater',
    label: 'Ehr sei dem Vater',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-900',
    hasText: false,
    hasNumber: false,
    icon: '✨',
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
  
  psalm: {
    type: 'psalm',
    label: 'Psalm',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    hasText: true,
    hasNumber: true,
    placeholder: 'Psalm 23',
    icon: '🎵',
    category: 'bibellesungen',
    defaultDuration: 4
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
  },

  // Kasualien-spezifisch (teal/türkis)
  trauversprechen: {
    type: 'trauversprechen',
    label: 'Trauversprechen',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Ich nehme dich an als meine Frau/meinen Mann...',
    icon: '💍',
    category: 'kasualien',
    defaultDuration: 3
  },

  taufformel: {
    type: 'taufformel',
    label: 'Taufformel',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Ich taufe dich im Namen des Vaters...',
    icon: '💦',
    category: 'kasualien',
    defaultDuration: 2
  },

  trauerrede: {
    type: 'trauerrede',
    label: 'Trauerrede',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Wir nehmen Abschied von...',
    icon: '🕊️',
    category: 'kasualien',
    defaultDuration: 10
  },

  konfirmationssegen: {
    type: 'konfirmationssegen',
    label: 'Konfirmationssegen',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Der Herr segne dich und behüte dich...',
    icon: '✝️',
    category: 'kasualien',
    defaultDuration: 5
  },

  trauung_ringtausch: {
    type: 'trauung_ringtausch',
    label: 'Ringtausch',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Trage diesen Ring als Zeichen...',
    icon: '💐',
    category: 'kasualien',
    defaultDuration: 2
  },

  bestattung_erdwurf: {
    type: 'bestattung_erdwurf',
    label: 'Erdwurf',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Erde zu Erde, Asche zu Asche...',
    icon: '⚱️',
    category: 'kasualien',
    defaultDuration: 2
  },

  // Freie Komponenten (grau)
  freie_komponente: {
    type: 'freie_komponente',
    label: 'Freie Komponente',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    hasText: true,
    hasNumber: false,
    placeholder: 'Benutzerdefinierte Inhalte...',
    icon: '📝',
    category: 'frei',
    defaultDuration: 3
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

// Vordefinierte Texte für liturgische Komponenten
export const LITURGICAL_TEXTS = {
  glaubensbekenntnis: {
    apostolisch: {
      title: 'Apostolisches Glaubensbekenntnis',
      text: `Ich glaube an Gott, den Vater,
den Allmächtigen,
den Schöpfer des Himmels und der Erde.

Und an Jesus Christus,
seinen eingeborenen Sohn, unsern Herrn,
empfangen durch den Heiligen Geist,
geboren von der Jungfrau Maria,
gelitten unter Pontius Pilatus,
gekreuzigt, gestorben und begraben,
hinabgestiegen in das Reich des Todes,
am dritten Tage auferstanden von den Toten,
aufgefahren in den Himmel;
er sitzt zur Rechten Gottes, des allmächtigen Vaters;
von dort wird er kommen,
zu richten die Lebenden und die Toten.

Ich glaube an den Heiligen Geist,
die heilige christliche Kirche,
Gemeinschaft der Heiligen,
Vergebung der Sünden,
Auferstehung der Toten
und das ewige Leben.
Amen.`,
      duration: 3
    },
    taufe: {
      title: 'Glaubensbekenntnis für Taufen',
      text: `Ich glaube an Gott.
Gott liebt uns wie ein Vater und eine Mutter,
Er hat uns und alles in der Welt geschaffen.
Wir vertrauen darauf, dass er immer und überall für uns da ist.

Ich glaube an Jesus Christus, den Sohn Gottes.
Sein Leben ist Vorbild für alle.
Durch sein Leiden und Sterben ist er uns auch in dunklen Zeiten nah.
Seine Auferstehung gibt Hoffnung,
dass es in unserem Leben immer wieder hell wird.

Ich glaube an die Heilige Geistkraft,
Gottes Kraft in uns.
Sie führt uns auf gute Wege,
schenkt Vergebung
und verbindet uns zu einer großen Gemeinschaft.
Amen.`,
      duration: 3
    },
    nizaenisch: {
      title: 'Nizänisches Glaubensbekenntnis',
      text: `Wir glauben an den einen Gott,
den Vater, den Allmächtigen,
der alles geschaffen hat,
Himmel und Erde,
die sichtbare und die unsichtbare Welt.

Und an den einen Herrn Jesus Christus,
Gottes eingeborenen Sohn,
aus dem Vater geboren vor aller Zeit,
Gott von Gott, Licht vom Licht,
wahrer Gott vom wahren Gott,
gezeugt, nicht geschaffen,
eines Wesens mit dem Vater;
durch ihn ist alles geschaffen.
Amen.`,
      duration: 4
    }
  },
  vater_unser: {
    standard: {
      title: 'Vater Unser',
      text: `Vater unser im Himmel,
geheiligt werde dein Name.
Dein Reich komme.
Dein Wille geschehe,
wie im Himmel so auf Erden.
Unser tägliches Brot gib uns heute.
Und vergib uns unsere Schuld,
wie auch wir vergeben unsern Schuldigern.
Und führe uns nicht in Versuchung,
sondern erlöse uns von dem Bösen.
Denn dein ist das Reich
und die Kraft
und die Herrlichkeit
in Ewigkeit.
Amen.`,
      duration: 2
    },
    gesungen: {
      title: 'Vater Unser (gesungen)',
      text: `Vater unser im Himmel,
geheiligt werde dein Name.
Dein Reich komme.
Dein Wille geschehe,
wie im Himmel so auf Erden.
Unser tägliches Brot gib uns heute.
Und vergib uns unsere Schuld,
wie auch wir vergeben unsern Schuldigern.
Und führe uns nicht in Versuchung,
sondern erlöse uns von dem Bösen.
Denn dein ist das Reich
und die Kraft
und die Herrlichkeit
in Ewigkeit.
Amen.`,
      duration: 3
    }
  },
  segen: {
    aaronitisch: {
      title: 'Aaronitischer Segen',
      text: `Der Herr segne dich und behüte dich.

Der Herr lasse leuchten sein Angesicht über dir
und sei dir gnädig.

Der Herr erhebe sein Angesicht auf dich
und schenke dir seinen Frieden.

Amen.`,
      duration: 2
    },
    trinitarisch: {
      title: 'Trinitarischer Segen',
      text: `Es segne euch der allmächtige Gott,
der Vater und der Sohn
und der Heilige Geist.

Amen.`,
      duration: 1
    }
  },
  psalm: {
    psalm63: {
      title: 'Psalm 63 (Wechselgebet)',
      text: `Gott, du bist mein Gott, den ich suche.

Es dürstet meine Seele nach dir,

mein ganzer Mensch verlangt nach dir
aus trockenem, dürrem Land, wo kein Wasser ist.

So schaue ich aus nach dir in deinem Heiligtum,
wollte gerne sehen deine Macht und Herrlichkeit.

Denn deine Güte ist besser als Leben;
meine Lippen preisen dich.

So will ich dich loben mein Leben lang
und meine Hände in deinem Namen aufheben.

Das ist meines Herzens Freude und Wonne,
wenn ich dich mit fröhlichem Munde loben kann;

wenn ich mich zu Bette lege, so denke ich an dich,
wenn ich wach liege, sinne ich über dich nach.

Denn du bist mein Helfer,
und unter dem Schatten deiner Flügel frohlocke ich.

Meine Seele hängt an dir;
deine rechte Hand hält mich.`,
      duration: 4
    },
    psalm23: {
      title: 'Psalm 23 (Wechselgebet)',
      text: `Der Herr ist mein Hirte,
mir wird nichts mangeln.

Er weidet mich auf einer grünen Aue
und führet mich zum frischen Wasser.

Er erquicket meine Seele.
Er führet mich auf rechter Straße
um seines Namens willen.

Und ob ich schon wanderte
im finstern Tal,
fürchte ich kein Unglück;

denn du bist bei mir,
dein Stecken und Stab trösten mich.

Du bereitest vor mir einen Tisch
im Angesicht meiner Feinde.
Du salbest mein Haupt mit Öl
und schenkest mir voll ein.

Gutes und Barmherzigkeit
werden mir folgen mein Leben lang,
und ich werde bleiben
im Hause des Herrn immerdar.`,
      duration: 3
    }
  }
};