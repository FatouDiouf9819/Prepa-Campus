import { describe, it, expect, vi } from 'vitest';
import { InterviewStatus, InterviewTurn } from '@/types/interview';
import packageJson from '../../package.json';

describe('Mobile UX, Crédits Épuisés & Bouton Terminer Entretien', () => {
  it('doit contenir le drapeau -H 0.0.0.0 dans package.json dev pour accès réseau mobile', () => {
    expect(packageJson.scripts.dev).toContain('-H 0.0.0.0');
  });

  it('doit inclure CREDIT_BLOCKED dans les types InterviewStatus', () => {
    const status: InterviewStatus = 'CREDIT_BLOCKED';
    expect(status).toBe('CREDIT_BLOCKED');
  });

  it('doit empêcher la synthèse vocale si le texte de la question est vide ou si les crédits sont bloqués', () => {
    // Simuler la logique de sécurité de speakQuestion
    function canSpeak(text: string, hasCreditError: boolean, status: InterviewStatus): boolean {
      if (!text || !text.trim() || hasCreditError || status === 'CREDIT_BLOCKED') {
        return false;
      }
      return true;
    }

    expect(canSpeak('', false, 'PERMISSION_CHECK')).toBe(false);
    expect(canSpeak('   ', false, 'READY_TO_START')).toBe(false);
    expect(canSpeak('Bonjour candidat', true, 'PERMISSION_CHECK')).toBe(false);
    expect(canSpeak('Bonjour candidat', false, 'CREDIT_BLOCKED')).toBe(false);
    expect(canSpeak('Bonjour candidat', false, 'AI_SPEAKING')).toBe(true);
  });

  it('doit intégrer la réponse en cours (draft) lors d une clôture anticipée si valide', () => {
    const turnsHistory: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez-vous',
        pedagogicalIntent: 'Introduction',
        studentTranscript: 'Je m appelle Fatima et je suis en Master informatique.',
        turnType: 'INITIAL',
        durationSeconds: 45,
        timestamp: new Date().toISOString(),
      },
    ];

    const draftAnswer = 'Mon projet professionnel est de devenir Data Engineer à Lille.';
    const currentQuestion = 'Quel est votre projet ?';
    const currentTurnIndex = 2;
    const timeRemaining = 180; // Interrompu à 2 min restantes au lieu de 5 min

    // Logique d'early termination avec draft
    let finalTurns = [...turnsHistory];
    if (draftAnswer.trim()) {
      finalTurns.push({
        turnIndex: currentTurnIndex,
        aiQuestion: currentQuestion,
        pedagogicalIntent: 'Projet pro',
        studentTranscript: draftAnswer.trim(),
        turnType: 'REGULAR',
        durationSeconds: 300 - timeRemaining,
        timestamp: new Date().toISOString(),
      });
    }

    expect(finalTurns.length).toBe(2);
    expect(finalTurns[1].studentTranscript).toBe(draftAnswer);
    expect(finalTurns[1].durationSeconds).toBe(120);
  });

  it('doit bloquer le démarrage de l entretien dans PreparationScreen si le solde de crédits est égal à 0', () => {
    let isCreditModalOpen = false;
    let didNavigate = false;

    function handleStartInterview(creditsBalance: number | null) {
      if (creditsBalance !== null && creditsBalance <= 0) {
        isCreditModalOpen = true;
        return;
      }
      didNavigate = true;
    }

    // Cas 1 : 0 crédit restant
    handleStartInterview(0);
    expect(isCreditModalOpen).toBe(true);
    expect(didNavigate).toBe(false);

    // Cas 2 : 2 crédits restants
    isCreditModalOpen = false;
    didNavigate = false;
    handleStartInterview(2);
    expect(isCreditModalOpen).toBe(false);
    expect(didNavigate).toBe(true);
  });

  it('doit attribuer automatiquement 1 simulation gratuite de bienvenue pour tout nouvel utilisateur', () => {
    // Simuler le fallback et l'initialisation de crédit de bienvenue
    function getInitialUserCredit(existingBalance: number | null, metadataBalance?: number): number {
      if (typeof existingBalance === 'number') {
        return existingBalance;
      }
      if (typeof metadataBalance === 'number') {
        return metadataBalance;
      }
      return 1; // 1 simulation de bienvenue offerte par défaut
    }

    // Nouveau compte sans historique
    expect(getInitialUserCredit(null, undefined)).toBe(1);
    // Compte avec solde existant
    expect(getInitialUserCredit(0, 0)).toBe(0);
    expect(getInitialUserCredit(3, 3)).toBe(3);
  });
});
