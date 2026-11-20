/**
 * Dictionnaire et utilitaires d'assistance orthographique et d'accents
 * Style Microsoft Word pour la saisie du profil Campus France.
 */

// Dictionnaire de référence des mots académiques, géographiques et professionnels
// fréquemment saisis sans accents sur clavier mobile ou QWERTY.
export const FRENCH_ACADEMIC_DICTIONARY: Record<string, string> = {
  // Pays, villes et établissements
  senegal: 'Sénégal',
  'cote d\'ivoire': 'Côte d\'Ivoire',
  'cote divoire': 'Côte d\'Ivoire',
  cameroun: 'Cameroun',
  benin: 'Bénin',
  algerie: 'Algérie',
  guinee: 'Guinée',
  mauritanie: 'Mauritanie',
  tchad: 'Tchad',
  maroc: 'Maroc',
  tunisie: 'Tunisie',
  madagascar: 'Madagascar',
  'burkina faso': 'Burkina Faso',
  dakar: 'Dakar',
  yaounde: 'Yaoundé',
  lome: 'Lomé',
  paris: 'Paris',
  saclay: 'Saclay',
  'paris-saclay': 'Paris-Saclay',
  sorbonne: 'Sorbonne',

  // Cursus, diplômes & universités
  ingenieur: 'ingénieur',
  ingenieurs: 'ingénieurs',
  ingenierie: 'ingénierie',
  diplome: 'diplôme',
  diplomes: 'diplômes',
  diplomee: 'diplômée',
  etude: 'étude',
  etudes: 'études',
  etudiant: 'étudiant',
  etudiante: 'étudiante',
  etudiants: 'étudiants',
  etudiantes: 'étudiantes',
  licence: 'Licence',
  master: 'Master',
  doctorat: 'Doctorat',
  baccalaureat: 'Baccalauréat',
  universite: 'université',
  universites: 'universités',
  etablissement: 'établissement',
  etablissements: 'établissements',
  filiere: 'filière',
  filieres: 'filières',
  matiere: 'matière',
  matieres: 'matières',
  prepa: 'prépa',
  ecole: 'école',
  ecoles: 'écoles',
  reorientation: 'réorientation',
  cesure: 'césure',
  debouche: 'débouché',
  debouches: 'débouchés',
  reussite: 'réussite',
  reussir: 'réussir',
  memoire: 'mémoire',
  theorique: 'théorique',
  theoriques: 'théoriques',
  pedagogique: 'pédagogique',
  pedagogiques: 'pédagogiques',
  academique: 'académique',
  academiques: 'académiques',
  annee: 'année',
  annees: 'années',
  semestre: 'semestre',
  semestres: 'semestres',
  periode: 'période',
  periodes: 'périodes',

  // Métiers, technologies et compétences
  developpement: 'développement',
  developpeur: 'développeur',
  developpeuse: 'développeuse',
  developpeurs: 'développeurs',
  reseau: 'réseau',
  reseaux: 'réseaux',
  donnees: 'données',
  donnee: 'donnée',
  systeme: 'système',
  systemes: 'systèmes',
  metier: 'métier',
  metiers: 'métiers',
  carriere: 'carrière',
  carrieres: 'carrieres',
  competence: 'compétence',
  competences: 'compétences',
  creer: 'créer',
  creation: 'création',
  gerer: 'gérer',
  gestion: 'gestion',
  securite: 'sécurité',
  societe: 'société',
  evenement: 'événement',
  evenements: 'événements',
  francais: 'français',
  francaise: 'française',
  etranger: 'étranger',
  etrangere: 'étrangère',
  premiere: 'première',
  deuxieme: 'deuxième',
  troisieme: 'troisième',
  telecoms: 'télécoms',
  telecommunication: 'télécommunication',
  telecommunications: 'télécommunications',
  economie: 'économie',
  economique: 'économique',
  economiques: 'économiques',
  sante: 'santé',
  energie: 'énergie',
  energies: 'énergies',
  aeronautique: 'aéronautique',
  mecanique: 'mécanique',
  electrique: 'électrique',
  electronique: 'électronique',
  experience: 'expérience',
  experiences: 'expériences',
  specialisation: 'spécialisation',
  specialise: 'spécialisé',
  specialisee: 'spécialisée',
  specialises: 'spécialisés',
  professionnel: 'professionnel',
  professionnelle: 'professionnelle',
  professionnels: 'professionnels',
  professionnelles: 'professionnelles',
  interet: 'intérêt',
  interets: 'intérêts',
  modele: 'modèle',
  modeles: 'modèles',
  acces: 'accès',
  qualite: 'qualité',
  capacite: 'capacité',
  opportunite: 'opportunité',
  opportunites: 'opportunités',
  specialite: 'spécialité',
  specialites: 'spécialités',
  priorite: 'priorité',
  priorites: 'priorités',
  strategie: 'stratégie',
  strategies: 'stratégies',
  methodologie: 'méthodologie',
  coherence: 'cohérence',
  aussi: 'aussi',
  tres: 'très',
  deja: 'déjà',
  apres: 'après',
  grace: 'grâce',
  egalement: 'également',
  voila: 'voilà',
};

/**
 * Supprime les accents et met en minuscules pour comparaison neutre.
 */
export function normalizeForComparison(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface SpellingSuggestion {
  original: string;
  suggestion: string;
}

/**
 * Analyse un texte saisi et détecte les mots manquant d'accents ou mal orthographiés.
 */
export function findSpellingSuggestions(text: string): SpellingSuggestion[] {
  if (!text || text.trim().length < 2) return [];

  const found: SpellingSuggestion[] = [];
  const seenOriginals = new Set<string>();

  // 1. Détection des expressions multi-mots en priorité (ex: "cote d'ivoire", "burkina faso")
  const lowerText = text.toLowerCase();
  for (const [key, correctValue] of Object.entries(FRENCH_ACADEMIC_DICTIONARY)) {
    if (key.includes(' ') || key.includes('\'')) {
      const regex = new RegExp(`\\b${key.replace(/'/g, "['’]?")}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        for (const match of matches) {
          if (match !== correctValue && !seenOriginals.has(match.toLowerCase())) {
            seenOriginals.add(match.toLowerCase());
            found.push({ original: match, suggestion: correctValue });
          }
        }
      }
    }
  }

  // 2. Détection mot par mot
  const tokens = text.match(/\b[A-Za-zÀ-ÿ\-']+\b/g) || [];

  for (const token of tokens) {
    if (token.length < 3) continue;
    const normalizedToken = normalizeForComparison(token);
    const correctTarget = FRENCH_ACADEMIC_DICTIONARY[normalizedToken];

    if (correctTarget) {
      // Ajuster la casse : si le token commence par une majuscule, conserver la majuscule
      let adjustedTarget = correctTarget;
      if (token[0] === token[0].toUpperCase() && correctTarget[0] === correctTarget[0].toLowerCase()) {
        adjustedTarget = correctTarget.charAt(0).toUpperCase() + correctTarget.slice(1);
      }

      // Si le mot saisi diffère de la forme correcte (manque d'accent ou de majuscule)
      if (token !== adjustedTarget && !seenOriginals.has(token.toLowerCase())) {
        seenOriginals.add(token.toLowerCase());
        found.push({
          original: token,
          suggestion: adjustedTarget,
        });
      }
    }
  }

  return found.slice(0, 5); // Limiter à 5 suggestions simultanées pour lisibilité
}

/**
 * Remplace une occurrence précise d'un mot par sa suggestion correcte dans le texte.
 */
export function applySpellingCorrection(
  text: string,
  original: string,
  suggestion: string
): string {
  // Regex avec limites de mot strictes pour ne remplacer que le mot exact
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'g');
  return text.replace(regex, suggestion);
}

/**
 * Applique toutes les corrections disponibles d'un coup dans le texte (style "Tout corriger" de Word).
 */
export function applyAllSpellingCorrections(text: string): {
  correctedText: string;
  count: number;
} {
  const suggestions = findSpellingSuggestions(text);
  let updated = text;
  let count = 0;

  for (const item of suggestions) {
    const nextText = applySpellingCorrection(updated, item.original, item.suggestion);
    if (nextText !== updated) {
      updated = nextText;
      count++;
    }
  }

  return { correctedText: updated, count };
}

