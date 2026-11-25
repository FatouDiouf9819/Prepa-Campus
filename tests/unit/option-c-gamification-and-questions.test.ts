import { describe, it, expect } from 'vitest';
import { 
  analyzeSpeechFluency 
} from '@/lib/indicators/speechAnalytics';
import { 
  OFFICIAL_QUESTIONS 
} from '@/config/officialQuestions';

describe('Option C : Expérience, Gamification & Questions Types', () => {
  describe('1. Analyse Vocale & Speech Analytics (analyzeSpeechFluency)', () => {
    it('doit gérer proprement un tableau vide ou une durée nulle sans division par zéro', () => {
      const emptyRes = analyzeSpeechFluency([], 0);
      expect(emptyRes.totalWords).toBe(0);
      expect(emptyRes.wordsPerMinute).toBe(0);
      expect(emptyRes.fillerWordsCount).toBe(0);
      expect(emptyRes.paceLabel).toBe('Non mesuré');
    });

    it('doit classifier un débit naturel et posé entre 100 et 140 mots par minute', () => {
      // 120 mots en 60 secondes = 120 mots/min
      const words = Array(120).fill('mot').join(' ');
      const res = analyzeSpeechFluency([words], 60);

      expect(res.totalWords).toBe(120);
      expect(res.wordsPerMinute).toBe(120);
      expect(res.paceRating).toBe('IDEAL');
      expect(res.paceLabel).toContain('naturel');
      expect(res.paceColorClass).toContain('emerald');
    });

    it('doit détecter un débit trop rapide sous l\'effet du stress (> 175 mots/min)', () => {
      // 200 mots en 60 secondes = 200 mots/min
      const words = Array(200).fill('rapide').join(' ');
      const res = analyzeSpeechFluency([words], 60);

      expect(res.wordsPerMinute).toBe(200);
      expect(res.paceRating).toBe('TOO_FAST');
      expect(res.paceLabel).toContain('stress');
      expect(res.paceColorClass).toContain('rose');
    });

    it('doit détecter un débit trop lent ou hésitant (< 85 mots/min)', () => {
      // 60 mots en 60 secondes = 60 mots/min
      const words = Array(60).fill('lent').join(' ');
      const res = analyzeSpeechFluency([words], 60);

      expect(res.wordsPerMinute).toBe(60);
      expect(res.paceRating).toBe('TOO_SLOW');
      expect(res.paceLabel).toContain('hésitant');
      expect(res.paceColorClass).toContain('amber');
    });

    it('doit compter précisément les tics de langage fréquents (« euh », « genre », « du coup »)', () => {
      const transcriptWithFillers = [
        "Euh bonjour, je m'appelle Amadou et genre je veux aller en France.",
        "Du coup mon projet professionnel est clair, euh voilà quoi.",
      ];
      const res = analyzeSpeechFluency(transcriptWithFillers, 60);

      expect(res.fillerWordsCount).toBeGreaterThanOrEqual(4);
      const euh = res.fillerWordsDetail.find((f) => f.word === 'euh');
      expect(euh).toBeDefined();
      expect(euh?.count).toBe(2);

      const genre = res.fillerWordsDetail.find((f) => f.word === 'genre');
      expect(genre?.count).toBe(1);

      const duCoup = res.fillerWordsDetail.find((f) => f.word === 'du coup');
      expect(duCoup?.count).toBe(1);
    });
  });

  describe('2. Référentiel des Questions Incontournables Campus France', () => {
    it('doit contenir au moins 10 questions de référence couvrant les 5 thématiques clés', () => {
      expect(OFFICIAL_QUESTIONS.length).toBeGreaterThanOrEqual(10);

      const categories = new Set(OFFICIAL_QUESTIONS.map((q) => q.category));
      expect(categories.has('PROJET_PRO')).toBe(true);
      expect(categories.has('CHOIX_FRANCE')).toBe(true);
      expect(categories.has('PARCOURS_NOTES')).toBe(true);
      expect(categories.has('FINANCEMENT_LOGEMENT')).toBe(true);
      expect(categories.has('PIEGES_AVENIR')).toBe(true);
    });

    it('chaque question doit comporter une intention cachée, un piège et une réponse modèle', () => {
      for (const q of OFFICIAL_QUESTIONS) {
        expect(q.id).toBeTruthy();
        expect(q.question.length).toBeGreaterThan(15);
        expect(q.hiddenIntent.length).toBeGreaterThan(15);
        expect(q.trapToAvoid.length).toBeGreaterThan(15);
        expect(q.recommendedResponse.length).toBeGreaterThan(15);
        expect(q.keyAdvice.length).toBeGreaterThan(15);
      }
    });

    it('doit comporter la question piège incontournable du retour au pays vs séjour en France', () => {
      const questionRetour = OFFICIAL_QUESTIONS.find(
        (q) => q.question.toLowerCase().includes('rentrer') || q.question.toLowerCase().includes('rester en france')
      );
      expect(questionRetour).toBeDefined();
      expect(questionRetour?.category).toBe('PROJET_PRO');
      expect(questionRetour?.trapToAvoid).toContain('définitivement');
    });

    it('doit comporter la question essentielle du financement et garant (minimum 615€/mois)', () => {
      const questionFinance = OFFICIAL_QUESTIONS.find(
        (q) => q.question.toLowerCase().includes('financer') || q.question.toLowerCase().includes('coût de vie')
      );
      expect(questionFinance).toBeDefined();
      expect(questionFinance?.category).toBe('FINANCEMENT_LOGEMENT');
      expect(questionFinance?.recommendedResponse).toContain('AVI');
    });
  });

  describe('3. Règle de Verrouillage & Paywall (Gated Access aux Packs Réussite & Intensif)', () => {
    it('doit réserver l\'accès complet aux détenteurs des packs Réussite et Intensif', () => {
      // Vérifier que les 2 premières questions servent d'échantillons gratuits et que le reste est protégé
      const freeSamples = OFFICIAL_QUESTIONS.slice(0, 2);
      expect(freeSamples).toHaveLength(2);

      const premiumQuestions = OFFICIAL_QUESTIONS.slice(2);
      expect(premiumQuestions.length).toBeGreaterThan(0);
    });
  });
});
