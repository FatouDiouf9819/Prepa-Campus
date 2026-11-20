/**
 * Module d'analyse de la parole et de fluidité vocale (Speech Analytics)
 * PrépaCampus — Détection des tics de langage, calcul du débit de parole et conseils d'élocution.
 * 
 * Normes académiques pour un entretien oral Campus France :
 * - Débit moyen conversationnel naturel : 110 à 140 mots par minute (idéalement 120-130 mots/min).
 * - Débit posé : 85 à 109 mots/min (réfléchi, sans précipitation).
 * - Débit rapide : 141 à 165 mots/min (dynamique).
 * - Débit précipité : > 165 mots/min (signe de stress).
 */

export interface FillerWordOccurrence {
  word: string;
  count: number;
}

export interface SpeechAnalyticsResult {
  totalWords: number;
  totalDurationSeconds: number;
  wordsPerMinute: number;
  paceRating: 'TOO_SLOW' | 'IDEAL' | 'SLIGHTLY_FAST' | 'TOO_FAST';
  paceLabel: string;
  paceColorClass: string;
  fillerWordsCount: number;
  fillerWordsDetail: FillerWordOccurrence[];
  fluencyBadge: string;
  fluencyColorClass: string;
  feedback: string;
}

const COMMON_FILLER_WORDS = [
  'euh',
  'euuh',
  'genre',
  'en fait',
  'du coup',
  'voilà',
  'ben',
  'bah',
  'bon',
  'quoi',
];

/**
 * Analyse un ensemble de textes retranscrits et leur durée cumulée
 */
export function analyzeSpeechFluency(
  transcripts: string[],
  totalDurationSeconds: number
): SpeechAnalyticsResult {
  const combinedText = transcripts.join(' ').trim();
  
  // Si aucune prise de parole effective
  if (!combinedText || totalDurationSeconds <= 0) {
    return {
      totalWords: 0,
      totalDurationSeconds: Math.max(0, totalDurationSeconds),
      wordsPerMinute: 0,
      paceRating: 'IDEAL',
      paceLabel: 'Débit non mesuré',
      paceColorClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
      fillerWordsCount: 0,
      fillerWordsDetail: [],
      fluencyBadge: 'Données orales insuffisantes',
      fluencyColorClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
      feedback: 'Aucun enregistrement vocal disponible pour cette séance.',
    };
  }

  // Nettoyage et découpage en mots
  const words = combinedText.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  // Calcul du débit réel (Mots Par Minute)
  // Durée effective en minutes (minimum 15 secondes pour éviter les valeurs aberrantes lors d'un test très court)
  const effectiveSeconds = Math.max(15, totalDurationSeconds);
  const durationMinutes = effectiveSeconds / 60;
  let calculatedWpm = Math.round(totalWords / durationMinutes);

  // Calibration pour éviter les artefacts de découpage court :
  // Si le candidat a dit quelques phrases cohérentes, borner dans une plage réaliste
  const wordsPerMinute = Math.max(15, Math.min(240, calculatedWpm));

  // Évaluation du rythme selon les standards officiels d'éloquence orale (120-130 mots/min optimal)
  let paceRating: 'TOO_SLOW' | 'IDEAL' | 'SLIGHTLY_FAST' | 'TOO_FAST' = 'IDEAL';
  let paceLabel = 'Débit naturel & équilibré';
  let paceColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let feedback = 'Votre débit de parole est équilibré (autour de 120-130 mots/min), propice à une écoute attentive du jury.';

  if (wordsPerMinute < 85) {
    paceRating = 'TOO_SLOW';
    paceLabel = 'Débit posé (temps de réflexion)';
    paceColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    feedback = 'Votre rythme est très calme. Pensez à dynamiser votre intonation pour communiquer davantage d\'enthousiasme au jury.';
  } else if (wordsPerMinute > 165) {
    paceRating = 'TOO_FAST';
    paceLabel = 'Débit très rapide';
    paceColorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    feedback = 'Attention au débit précipité sous l\'effet du stress : ménagez de courtes respirations entre chaque argument.';
  } else if (wordsPerMinute > 140) {
    paceRating = 'SLIGHTLY_FAST';
    paceLabel = 'Débit énergique & dynamique';
    paceColorClass = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    feedback = 'Bonne énergie et enthousiasme communicatif. Veillez à bien articuler les intitulés d\'universités.';
  } else {
    // 85 à 140 mots/min : plage idéale centrée sur 120-130 mots/min
    paceRating = 'IDEAL';
    paceLabel = 'Débit idéal (120-130 mots/min)';
    paceColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    feedback = 'Rythme oral parfait : posé, clair et propice à une compréhension immédiate de votre argumentation.';
  }

  // Détection des tics de langage
  const lowerText = ` ${combinedText.toLowerCase()} `;
  const fillerWordsDetail: FillerWordOccurrence[] = [];
  let fillerWordsCount = 0;

  for (const filler of COMMON_FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerWordsCount += matches.length;
      fillerWordsDetail.push({
        word: filler,
        count: matches.length,
      });
    }
  }

  fillerWordsDetail.sort((a, b) => b.count - a.count);

  // Cohérence sémantique stricte pour éviter les contradictions (ex: débit hésitant à côté d'élocution fluide)
  let fluencyBadge = 'Élocution fluide';
  let fluencyColorClass = 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';

  if (fillerWordsCount > 0) {
    fluencyBadge = `${fillerWordsCount} tic${fillerWordsCount > 1 ? 's' : ''} verbal${fillerWordsCount > 1 ? 'aux' : ''}`;
    fluencyColorClass = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  } else if (paceRating === 'TOO_SLOW') {
    // Évite d'écrire "Élocution fluide" en contradiction avec un débit trop lent
    fluencyBadge = 'Discours sans tics de langage';
    fluencyColorClass = 'text-slate-300 bg-slate-800/60 border-slate-700/40';
  }

  return {
    totalWords,
    totalDurationSeconds,
    wordsPerMinute,
    paceRating,
    paceLabel,
    paceColorClass,
    fillerWordsCount,
    fillerWordsDetail,
    fluencyBadge,
    fluencyColorClass,
    feedback,
  };
}
