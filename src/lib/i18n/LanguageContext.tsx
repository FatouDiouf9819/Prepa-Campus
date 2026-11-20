'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'en';

export interface Translations {
  [key: string]: {
    fr: string;
    en: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Navigation
  'nav.home': { fr: 'Accueil', en: 'Home' },
  'nav.dashboard': { fr: 'Tableau de bord', en: 'Dashboard' },
  'nav.history': { fr: 'Historique', en: 'History' },
  'nav.questions': { fr: 'Questions Types', en: 'Question Bank' },
  'nav.pricing': { fr: 'Tarifs & Packs', en: 'Pricing & Plans' },
  'nav.profile': { fr: 'Mon Dossier', en: 'My Profile' },
  'nav.login': { fr: 'Connexion', en: 'Sign In' },
  'nav.signup': { fr: 'Créer un compte', en: 'Create Account' },
  'nav.start': { fr: 'Commencer', en: 'Get Started' },
  'nav.signout': { fr: 'Déconnexion', en: 'Sign Out' },
  'nav.tagline': { fr: "Simulateur d'Entretien IA", en: 'AI Interview Simulator' },
  'nav.lang_switch': { fr: 'Langue', en: 'Language' },

  // Home Page
  'home.hero_badge': {
    fr: 'Outil Pédagogique Indépendant',
    en: 'Independent Pedagogical Tool'
  },
  'home.hero_title': { fr: 'Réussissez votre entretien', en: 'Ace your interview' },
  'home.hero_title_highlight': { fr: 'Campus France', en: 'Campus France' },
  'home.hero_title_suffix': { fr: 'avec l\'IA', en: 'with Voice AI' },
  'home.hero_subtitle': {
    fr: 'Une simulation vocale interactive de 5 minutes calibrée sur vos diplômes, vos formations ciblées et votre projet professionnel, suivie d\'un rapport pédagogique d\'amélioration.',
    en: 'An interactive 5-minute voice simulation tailored to your degrees, targeted programs in France, and career vision, followed by a personalized verbatim pedagogical report.'
  },
  'home.hero_cta': { fr: 'Commencer ma préparation', en: 'Start my preparation' },
  'home.disclaimer': {
    fr: 'Service indépendant. Ce simulateur ne remplace pas les démarches officielles et ne garantit pas d\'admission.',
    en: 'Independent educational tool. This simulator does not replace official Campus France procedures and does not guarantee admission.'
  },
  'home.how_it_works': { fr: 'Comment fonctionne la préparation ?', en: 'How does the preparation work?' },
  'home.pillar1_title': { fr: '1. Profilage Académique', en: '1. Academic Profiling' },
  'home.pillar1_desc': {
    fr: 'Renseignez vos études actuelles, vos formations visées en France et votre projet de carrière. L\'IA s\'appuie sur votre dossier réel.',
    en: 'Enter your current qualifications, target programs in France, and career goals. The AI simulates based on your real application file.'
  },
  'home.pillar2_title': { fr: '2. Entretien Vocal de 5 Min', en: '2. 5-Minute Voice Interview' },
  'home.pillar2_desc': {
    fr: 'Activez votre webcam locale et votre micro. L\'IA pose ses questions à voix haute et rebondit avec des relances adaptées à vos réponses.',
    en: 'Turn on your mic and local camera. The AI asks questions out loud and challenges you with contextual follow-ups in real time.'
  },
  'home.pillar3_title': { fr: '3. Bilan Pédagogique Verbatim', en: '3. Verbatim Pedagogical Report' },
  'home.pillar3_desc': {
    fr: 'Découvrez vos points forts, vos contradictions éventuelles et des reformulations concrètes basées sur vos réponses exactes.',
    en: 'Review your key strengths, inconsistencies to avoid, and tailored verbatim sentence improvements.'
  },
  'home.pricing_badge': {
    fr: 'Cartes Bancaires (Visa/Mastercard) & Mobile Money',
    en: 'Credit Cards (Visa/Mastercard) & Mobile Money'
  },
  'home.pricing_title': {
    fr: 'Des tarifs accessibles dans toute l\'Afrique et le monde',
    en: 'Accessible rates across all Africa and worldwide'
  },
  'home.pricing_desc': {
    fr: 'Paiement par Carte Bancaire pour l\'Afrique anglophone & le monde, ou Mobile Money (Wave, Orange Money, MTN) en FCFA.',
    en: 'Payment via Credit Card for Anglophone Africa & worldwide, or Mobile Money (Wave, Orange, MTN) in FCFA.'
  },
  'home.free_tag': { fr: 'Offert à la création de votre compte candidat.', en: 'Free upon creating your candidate account.' },
  'home.free_feature1': { fr: '1 simulation vocale complète (5 min)', en: '1 full 5-minute voice simulation' },
  'home.free_feature2': { fr: 'Bilan pédagogique verbatim immédiat', en: 'Immediate verbatim evaluation report' },
  'home.free_cta': { fr: 'Commencer gratuitement', en: 'Get started for free' },
  'home.popular_tag': { fr: 'Pour progresser et éliminer les erreurs éliminatoires.', en: 'To progress and eliminate disqualifying mistakes.' },
  'home.popular_feature1': { fr: '3 simulations vocales complètes', en: '3 full voice simulations' },
  'home.popular_feature2': { fr: 'Courbe d\'évolution de score (+pts)', en: 'Score progression tracker (+pts)' },
  'home.popular_feature3': { fr: '50 questions pièges & reformulations', en: '50 trick questions & sample answers' },
  'home.popular_cta': { fr: 'Choisir cette formule', en: 'Choose this plan' },
  'home.intensive_tag': { fr: 'Pour viser l\'excellence et les filières sélectives.', en: 'To target top-tier selective Master & engineering degrees.' },
  'home.intensive_feature1': { fr: '6 simulations vocales complètes', en: '6 full voice simulations' },
  'home.intensive_feature2': { fr: 'Historique complet et comparatif', en: 'Full history & progress comparison' },
  'home.intensive_feature3': { fr: 'Entraînement aux questions pièges', en: 'Intensive trick questions practice' },
  'home.intensive_cta': { fr: 'Voir tous les détails', en: 'View all details' },
  'home.privacy_title': { fr: 'Confidentialité & Respect de la vie privée', en: 'Privacy & Data Protection' },
  'home.privacy_desc': {
    fr: 'Le flux vidéo de votre webcam reste strictement local dans votre navigateur. Aucun enregistrement vidéo ni audio brut n\'est conservé sur nos serveurs. Vous conservez le contrôle total de vos données.',
    en: 'Your webcam stream remains strictly local inside your browser. No raw video or audio recording is stored on our servers. You keep full control of your personal data.'
  },
  'home.footer': {
    fr: 'PrépaCampus — Simulateur indépendant d\'entraînement aux entretiens. Non affilié à Campus France. Flux vidéo locaux sans enregistrement.',
    en: 'PrépaCampus — Independent simulation platform. Not affiliated with Campus France. Local video stream without recording.'
  },

  // Tarifs / Pricing Hero
  'pricing.title': { fr: 'Offres & Recharges de Simulations', en: 'Plans & Simulation Top-ups' },
  'pricing.hero_badge': {
    fr: 'Paiement Sécurisé : Cartes & Mobile Money',
    en: 'Secure Payment: Cards & Mobile Money'
  },
  'pricing.hero_title_1': { fr: 'Des tarifs adaptés pour', en: 'Tailored pricing for' },
  'pricing.hero_title_highlight': { fr: 'votre réussite consulaire', en: 'your consular success' },
  'pricing.hero_desc': {
    fr: 'Rechargez vos simulations via Carte Bancaire (Visa/Mastercard pour toute l\'Afrique anglophone et l\'international) ou Mobile Money (Wave, Orange, MTN). Vos crédits n\'expirent jamais.',
    en: 'Top up your simulations using Credit Card (Visa/Mastercard for Anglophone Africa & worldwide) or Mobile Money (Wave, Orange, MTN). Credits never expire.'
  },
  'pricing.free': { fr: 'Offert', en: 'Free' },
  'pricing.recommended': { fr: 'Recommandé', en: 'Recommended' },
  'pricing.excellence': { fr: 'Excellence', en: 'Excellence' },
  'pricing.recharge_btn': { fr: 'Recharger mes simulations', en: 'Top-up simulations' },
  'pricing.create_account': { fr: 'Créer mon compte', en: 'Create my account' },
  'pricing.cfa': { fr: 'FCFA', en: 'FCFA' },
  'pricing.approx': { fr: 'Soit environ', en: 'Approx.' },
  'pricing.no_commitment': { fr: 'Sans engagement', en: 'No commitment' },

  // Pack details
  'pack.decouverte.name': { fr: 'Pack Découverte', en: 'Starter Pack' },
  'pack.decouverte.desc': { fr: 'Idéal pour tester l\'IA vocale et faire votre premier entraînement.', en: 'Ideal to try out voice AI and run your first practice interview.' },
  'pack.essentiel.name': { fr: 'Pack Essentiel', en: 'Essential Pack' },
  'pack.essentiel.desc': { fr: 'Parfait pour corriger ses faiblesses et maîtriser son projet d\'études.', en: 'Perfect to fix weak spots and master your study plan.' },
  'pack.reussite.name': { fr: 'Pack Réussite', en: 'Success Pack' },
  'pack.reussite.desc': { fr: 'La formule plébiscitée par les candidats admis avec accès aux 50 questions pièges.', en: 'The most popular pack chosen by admitted candidates with 50 trick questions.' },
  'pack.intensif.name': { fr: 'Pack Intensif', en: 'Intensive Pack' },
  'pack.intensif.desc': { fr: 'L\'arsenal complet pour un entretien irréprochable et un coaching approfondi.', en: 'The ultimate kit for a flawless interview and deep personalized coaching.' },

  // Moyens de paiement / Payment methods
  'payment.title': { fr: 'Recharger mes simulations', en: 'Top-up my simulations' },
  'payment.tab_card': { fr: 'Carte Bancaire (Visa / Mastercard)', en: 'Credit Card (Visa / Mastercard)' },
  'payment.tab_card_desc': { fr: 'Toute l\'Afrique anglophone, diaspora & international', en: 'All Anglophone Africa, diaspora & worldwide' },
  'payment.tab_momo': { fr: 'Mobile Money', en: 'Mobile Money' },
  'payment.tab_momo_desc': { fr: 'Afrique francophone (Wave, Orange, MTN, Free)', en: 'Francophone Africa (Wave, Orange, MTN, Free)' },
  'payment.card_number': { fr: 'Numéro de carte bancaire', en: 'Card Number' },
  'payment.card_holder': { fr: 'Nom sur la carte', en: 'Name on Card' },
  'payment.card_expiry': { fr: 'Date d\'expiration (MM/AA)', en: 'Expiry Date (MM/YY)' },
  'payment.card_cvc': { fr: 'Code CVC / CVV', en: 'CVC / CVV' },
  'payment.card_btn': { fr: 'Payer par Carte Bancaire', en: 'Pay with Credit Card' },
  'payment.phone_number': { fr: 'Numéro de téléphone Mobile Money', en: 'Mobile Money Phone Number' },
  'payment.momo_btn': { fr: 'Confirmer le paiement Mobile Money', en: 'Confirm Mobile Money Payment' },
  'payment.secure_note': { fr: 'Paiement sécurisé crypté SSL 256 bits • Reçu immédiat', en: '256-bit SSL Encrypted Secure Payment • Instant Receipt' },
  'payment.pan_africa_banner_title': {
    fr: 'Moyens de paiement acceptés dans TOUTE l\'Afrique et à l\'international',
    en: 'Payment methods accepted across ALL Africa and internationally'
  },
  'payment.pan_africa_banner_desc': {
    fr: 'Cartes Visa, Mastercard & Cartes Internationales pour l\'Afrique anglophone (Nigeria 🇳🇬, Ghana 🇬🇭, Kenya 🇰🇪, Rwanda 🇷🇼, Afrique du Sud 🇿🇦) et la diaspora. Mobile Money (Wave, Orange, MTN, Free) pour l\'Afrique francophone.',
    en: 'Visa, Mastercard & International Cards for Anglophone Africa (Nigeria 🇳🇬, Ghana 🇬🇭, Kenya 🇰🇪, Rwanda 🇷🇼, South Africa 🇿🇦) & diaspora. Mobile Money (Wave, Orange, MTN, Free) for Francophone Africa.'
  },

  // Modal feedback
  'payment.success_title': { fr: 'Paiement Validé avec Succès !', en: 'Payment Successfully Completed!' },
  'payment.success_msg': { fr: 'Votre compte a été crédité immédiatement.', en: 'Your account has been credited instantly.' },
  'payment.close': { fr: 'Fermer', en: 'Close' },
  'payment.start_now': { fr: 'Lancer ma simulation maintenant', en: 'Start simulation now' },

  // FAQ
  'pricing.faq_title': { fr: 'Questions fréquentes', en: 'Frequently Asked Questions' },
  'pricing.faq_subtitle': { fr: 'Tout ce qu\'il faut savoir sur vos simulations et les paiements.', en: 'Everything you need to know about simulations and payments.' },
  'pricing.q1_q': { fr: 'Mes crédits de simulation expirent-ils ?', en: 'Do my simulation credits expire?' },
  'pricing.q1_a': {
    fr: 'Non. Vos simulations achetées n\'ont aucune date d\'expiration. Vous pouvez les utiliser à votre rythme tout au long de votre procédure Campus France.',
    en: 'No. Your purchased simulations have no expiration date. You can use them at your own pace throughout your entire Campus France procedure.'
  },
  'pricing.q2_q': {
    fr: 'Puis-je payer par carte bancaire depuis l\'Afrique anglophone ou la diaspora ?',
    en: 'Can I pay with a credit card from Anglophone Africa or worldwide?'
  },
  'pricing.q2_a': {
    fr: 'Oui ! Les cartes bancaires Visa et Mastercard internationales sont pleinement acceptées pour le Nigeria, le Ghana, le Kenya, le Rwanda, l\'Afrique du Sud et le monde entier avec crédit instantané.',
    en: 'Yes! International Visa and Mastercard credit cards are fully supported for Nigeria, Ghana, Kenya, Rwanda, South Africa, and worldwide, with instant top-up.'
  },
  'pricing.q3_q': {
    fr: 'Puis-je payer avec le compte Wave ou Orange Money d\'un proche ?',
    en: 'Can I pay using a relative\'s Wave or Orange Money account?'
  },
  'pricing.q3_a': {
    fr: 'Oui, absolument. Lors du paiement, vous pouvez saisir le numéro de votre parent ou tuteur. Il valide l\'opération sur son téléphone et vos crédits sont immédiatement crédités.',
    en: 'Yes, absolutely. During checkout, you can enter your parent or sponsor\'s phone number. They validate the payment on their phone and credits appear on your account.'
  },
  'pricing.q4_q': {
    fr: 'Que se passe-t-il si ma connexion coupe pendant l\'entretien ?',
    en: 'What happens if my connection drops during the interview?'
  },
  'pricing.q4_a': {
    fr: 'Grâce à notre protection atomique de session, si une simulation rencontre un incident technique ou une coupure réseau au démarrage, votre crédit n\'est jamais perdu et vous pouvez relancer sans frais.',
    en: 'Thanks to our atomic session guard, if a simulation encounters any network interruption at start, your credit is preserved and you can restart at no extra cost.'
  },
  'pricing.footer': {
    fr: 'PrépaCampus — Plateforme indépendante d\'aide et de simulation. Non affiliée à l\'agence Campus France.',
    en: 'PrépaCampus — Independent student preparation platform. Not affiliated with Campus France agency.'
  },

  // Dashboard translations
  'dashboard.title': { fr: 'Tableau de bord', en: 'Dashboard' },
  'dashboard.greeting': { fr: 'Bienvenue sur votre espace de préparation', en: 'Welcome to your preparation space' },
  'dashboard.credits_badge': { fr: 'Crédit(s) disponible(s)', en: 'Available credit(s)' },
  'dashboard.recharge_btn': { fr: 'Recharger', en: 'Top-up' },
  'dashboard.start_btn': { fr: 'Démarrer une simulation (5 min)', en: 'Start voice simulation (5 min)' },
  'dashboard.need_profile': { fr: 'Complétez votre dossier pour commencer', en: 'Complete your profile to start' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLang = localStorage.getItem('prepacampus_lang') as Language;
        if (savedLang === 'fr' || savedLang === 'en') {
          return savedLang;
        }
        const cookieMatch = document.cookie.match(/(?:^|; )prepacampus_lang=([^;]*)/);
        if (cookieMatch && (cookieMatch[1] === 'en' || cookieMatch[1] === 'fr')) {
          return cookieMatch[1] as Language;
        }
      } catch {
        // Ignorer
      }
    }
    return 'fr';
  });

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('prepacampus_lang') as Language;
      if (savedLang === 'fr' || savedLang === 'en') {
        setLanguageState((prev) => (prev !== savedLang ? savedLang : prev));
        document.documentElement.lang = savedLang;
      }
    } catch {
      // Ignorer si localStorage est inaccessible
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('prepacampus_lang', lang);
      document.cookie = `prepacampus_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = lang;
    } catch {
      // Ignorer
    }
  };

  const t = (key: string): string => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[language] || entry.fr || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
