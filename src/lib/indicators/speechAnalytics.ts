/**
 * Module d'analyse de la parole et de fluidité vocale (Speech Analytics)
 * PrépaCampus — Détection des tics de langage, calcul du débit de parole et conseils d'élocution.
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
  if (!combinedText || totalDurationSeconds <= 0) {
    return {
      totalWords: 0,
      totalDurationSeconds: Math.max(0, totalDurationSeconds),
      wordsPerMinute: 0,
      paceRating: 'IDEAL',
      paceLabel: 'Non mesuré',
      paceColorClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
      fillerWordsCount: 0,
      fillerWordsDetail: [],
      feedback: 'Aucun enregistrement vocal disponible pour cette séance.',
    };
  }

  // Nettoyage et découpage en mots
  const words = combinedText.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  // Calcul du débit (Mots Par Minute)
  const durationMinutes = totalDurationSeconds / 60;
  const wordsPerMinute = Math.round(totalWords / Math.max(0.1, durationMinutes));

  // Évaluation du rythme
  let paceRating: 'TOO_SLOW' | 'IDEAL' | 'SLIGHTLY_FAST' | 'TOO_FAST' = 'IDEAL';
  let paceLabel = 'Débit posé et naturel';
  let paceColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let feedback = 'Votre débit de parole est parfaitement équilibré, clair et propice à une bonne écoute.';

  if (wordsPerMinute < 85) {
    paceRating = 'TOO_SLOW';
    paceLabel = 'Débit un peu lent ou hésitant';
    paceColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    feedback = 'Pensez à dynamiser votre intonation pour montrer votre motivation et éviter les silences prolongés.';
  } else if (wordsPerMinute > 175) {
    paceRating = 'TOO_FAST';
    paceLabel = 'Débit très rapide (stress)';
    paceColorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    feedback = 'Attention au stress qui accélère votre diction : respirez entre vos phrases et ménagez des silences stratégiques.';
  } else if (wordsPerMinute > 150) {
    paceRating = 'SLIGHTLY_FAST';
    paceLabel = 'Débit énergique';
    paceColorClass = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    feedback = 'Bonne énergie, veillez simplement à bien articuler les noms de vos universités et spécialités.';
  }

  // Détection des tics de langage
  const lowerText = ` ${combinedText.toLowerCase()} `;
  const fillerWordsDetail: FillerWordOccurrence[] = [];
  let fillerWordsCount = 0;

  for (const filler of COMMON_FILLER_WORDS) {
    // Regex avec frontières de mots
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

  // Trier les tics par fréquence
  fillerWordsDetail.sort((a, b) => b.count - a.count);

  return {
    totalWords,
    totalDurationSeconds,
    wordsPerMinute,
    paceRating,
    paceLabel,
    paceColorClass,
    fillerWordsCount,
    fillerWordsDetail,
    feedback,
  };
}
