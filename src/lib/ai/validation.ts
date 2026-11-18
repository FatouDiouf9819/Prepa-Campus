/**
 * Module de validation et d'assainissement des réponses du candidat.
 * RÈGLE ABSOLUE : Aucun message de statut, accusé de réception ou texte technique
 * ne doit jamais être traité, persisté ou évalué comme une réponse académique d'un candidat.
 */

/**
 * Détecte si une chaîne correspond à un message technique de confirmation,
 * un statut d'enregistrement ou une valeur vide/invalide.
 */
export function isTechnicalOrInvalidAnswer(text?: string | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Normalisation (minuscules, sans accents)
  const normalized = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Phrases techniques exactes et variantes
  const technicalPhrases = [
    'reponse enregistree avec succes',
    'reponse envoyee avec succes',
    'reponse enregistree',
    'reponse envoyee',
    'reponse validee',
    'reponse transcrite',
    'enregistrement avec succes',
    'enregistrement en cours',
    'chargement en cours',
    'traitement en cours',
    'aucune parole reconnue',
    'aucune parole distincte reconnue',
    'aucune parole detectee',
    'donnees orales insuffisantes',
    'microphone non detecte',
    'acces refuse',
    'succes',
    'erreur',
    'null',
    'undefined',
    'none',
    'nan',
    'n/a',
  ];

  for (const phrase of technicalPhrases) {
    if (normalized === phrase || normalized === phrase + '.') {
      return true;
    }
  }

  // Si le texte commence par l'une des expressions techniques strictes
  if (
    normalized.startsWith('reponse enregistree avec succes') ||
    normalized.startsWith('reponse envoyee avec succes')
  ) {
    return true;
  }

  return false;
}

/**
 * Nettoie le texte d'une transcription candidate pour éviter toute injection accidentelle
 * de messages de statut au début ou à la fin.
 */
export function sanitizeCandidateTranscript(text?: string | null): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (isTechnicalOrInvalidAnswer(trimmed)) return '';
  return trimmed;
}
