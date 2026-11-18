/**
 * Configuration officielle des offres tarifaires et opérateurs Mobile Money
 * PrépaCampus — Préparation à la mobilité étudiante Campus France
 */

export interface PricingPack {
  id: 'pack_decouverte' | 'pack_essentiel' | 'pack_reussite' | 'pack_intensif';
  name: string;
  nameEn?: string;
  credits: number;
  priceCFA: number;
  priceEUR: number;
  popular?: boolean;
  tagline: string;
  taglineEn?: string;
  description: string;
  descriptionEn?: string;
  features: string[];
  featuresEn?: string[];
  badge?: string;
  badgeEn?: string;
}

export interface MobileOperator {
  id: string;
  name: string;
  country: string;
  countryCode: 'SN' | 'CI' | 'CM' | 'ML' | 'GN' | 'BJ';
  flag: string;
  currency: string;
  brandColor: string;
  prefixExample: string;
  instructions: string;
}

export const PRICING_PACKS: PricingPack[] = [
  {
    id: 'pack_decouverte',
    name: 'Pack Découverte',
    nameEn: 'Starter Pack',
    credits: 1,
    priceCFA: 0,
    priceEUR: 0,
    tagline: 'Offert à l\'inscription',
    taglineEn: 'Free upon registration',
    description: 'Une première simulation complète de 5 minutes pour tester votre niveau de départ.',
    descriptionEn: 'One complete 5-minute practice interview to gauge your initial level.',
    features: [
      '1 simulation vocale en direct (5 min chrono)',
      'Questions personnalisées selon votre cursus',
      'Bilan pédagogique verbatim immédiat',
      'Accès immédiat sans aucun moyen de paiement',
    ],
    featuresEn: [
      '1 live voice simulation (5 min timer)',
      'Custom questions tailored to your field',
      'Instant verbatim pedagogical report',
      'Instant access without payment details',
    ],
    badge: 'Offert',
    badgeEn: 'Free',
  },
  {
    id: 'pack_essentiel',
    name: 'Pack Essentiel',
    nameEn: 'Essential Pack',
    credits: 1,
    priceCFA: 2000,
    priceEUR: 3,
    tagline: 'Recharge ponctuelle',
    taglineEn: 'One-off top-up',
    description: 'Idéal pour un passage rapide de consolidation avant un rendez-vous consulaire.',
    descriptionEn: 'Perfect for a targeted brush-up before your consular appointment.',
    features: [
      '1 simulation vocale complète supplémentaire',
      'Nouvelle série de questions d\'approfondissement',
      'Rapport d\'évaluation et pistes d\'amélioration',
      'Crédit utilisable sans limitation de durée',
    ],
    featuresEn: [
      '1 extra complete voice simulation',
      'New series of in-depth consular questions',
      'Evaluation report with concrete tips',
      'Credits never expire',
    ],
  },
  {
    id: 'pack_reussite',
    name: 'Pack Réussite',
    nameEn: 'Success Pack',
    credits: 3,
    priceCFA: 5000,
    priceEUR: 7.5,
    popular: true,
    badge: 'Recommandé',
    badgeEn: 'Recommended',
    tagline: 'Le plus choisi par les étudiants',
    taglineEn: 'Most popular among students',
    description: 'La formule complète pour mesurer sa progression, corriger ses hésitations et valider son projet.',
    descriptionEn: 'The full package to track progress, eliminate hesitations, and secure your project.',
    features: [
      '3 simulations vocales complètes',
      'Accès complet à la Bibliothèque des 50 Questions Pièges & Réponses Modèles',
      'Courbe d\'évolution de vos scores (+pts)',
      'Détection des incohérences de projet d\'études',
      'Exemples de reformulation verbatim réutilisables',
      'Économisez 1 000 FCFA par rapport au pack unitaire',
    ],
    featuresEn: [
      '3 complete voice simulations',
      'Full access to 50 Trick Questions & Model Answers Bank',
      'Score progression curve (+pts tracking)',
      'Consular inconsistency detection',
      'Verbatim reformulation templates',
      'Save 1,000 CFA compared to single packs',
    ],
  },
  {
    id: 'pack_intensif',
    name: 'Pack Intensif',
    nameEn: 'Intensive Pack',
    credits: 6,
    priceCFA: 9000,
    priceEUR: 13.5,
    badge: 'Excellence',
    badgeEn: 'Excellence',
    tagline: 'Préparation maximale',
    taglineEn: 'Maximum preparation',
    description: 'Entraînement approfondi pour les dossiers sélectifs (Master, écoles d\'ingénieurs, bourses Eiffel).',
    descriptionEn: 'In-depth practice for competitive programs (Master, engineering degrees, Eiffel scholarships).',
    features: [
      '6 simulations vocales complètes',
      'Accès complet à la Bibliothèque des 50 Questions Pièges & Réponses Modèles',
      'Historique et analyse comparative complète',
      'Confrontation aux questions pièges fréquentes',
      'Conseils de débit de parole et gestion du stress',
      'Économisez 3 000 FCFA sur vos entraînements',
    ],
    featuresEn: [
      '6 complete voice simulations',
      'Full access to 50 Trick Questions & Model Answers Bank',
      'Comprehensive session history & comparison',
      'Practice against high-frequency trick questions',
      'Speech pace and stress management tips',
      'Save 3,000 CFA on your training sessions',
    ],
  },
];

export const SUPPORTED_OPERATORS: MobileOperator[] = [
  {
    id: 'wave_sn',
    name: 'Wave Sénégal',
    country: 'Sénégal',
    countryCode: 'SN',
    flag: '🇸🇳',
    currency: 'FCFA',
    brandColor: '#1DA1F2',
    prefixExample: '+221 77 000 00 00',
    instructions: 'Validation instantanée sans frais via votre application mobile Wave.',
  },
  {
    id: 'om_sn',
    name: 'Orange Money Sénégal',
    country: 'Sénégal',
    countryCode: 'SN',
    flag: '🇸🇳',
    currency: 'FCFA',
    brandColor: '#FF6600',
    prefixExample: '+221 77 / 78 000 00 00',
    instructions: 'Composez #144# ou confirmez la notification Orange Money sur votre téléphone.',
  },
  {
    id: 'free_sn',
    name: 'Free Money Sénégal',
    country: 'Sénégal',
    countryCode: 'SN',
    flag: '🇸🇳',
    currency: 'FCFA',
    brandColor: '#CC0000',
    prefixExample: '+221 76 000 00 00',
    instructions: 'Validation par SMS sécurisé Free Money.',
  },
  {
    id: 'wave_ci',
    name: 'Wave Côte d\'Ivoire',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
    flag: '🇨🇮',
    currency: 'FCFA',
    brandColor: '#1DA1F2',
    prefixExample: '+225 07 00 00 00 00',
    instructions: 'Validation instantanée sans frais via votre compte Wave.',
  },
  {
    id: 'om_ci',
    name: 'Orange Money Côte d\'Ivoire',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
    flag: '🇨🇮',
    currency: 'FCFA',
    brandColor: '#FF6600',
    prefixExample: '+225 07 00 00 00 00',
    instructions: 'Générez votre code temporaire de validation via #144*82#.',
  },
  {
    id: 'mtn_ci',
    name: 'MTN MoMo Côte d\'Ivoire',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
    flag: '🇨🇮',
    currency: 'FCFA',
    brandColor: '#FFCC00',
    prefixExample: '+225 05 00 00 00 00',
    instructions: 'Tapez *133# ou validez l\'invite push MTN reçue à l\'écran.',
  },
  {
    id: 'om_cm',
    name: 'Orange Money Cameroun',
    country: 'Cameroun',
    countryCode: 'CM',
    flag: '🇨🇲',
    currency: 'FCFA',
    brandColor: '#FF6600',
    prefixExample: '+237 6 90 00 00 00',
    instructions: 'Tapez #150# pour autoriser le paiement sécurisé.',
  },
  {
    id: 'mtn_cm',
    name: 'MTN MoMo Cameroun',
    country: 'Cameroun',
    countryCode: 'CM',
    flag: '🇨🇲',
    currency: 'FCFA',
    brandColor: '#FFCC00',
    prefixExample: '+237 6 70 00 00 00',
    instructions: 'Tapez *126# pour confirmer avec votre code secret MoMo.',
  },
];
