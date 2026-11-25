import { describe, it, expect } from 'vitest';
import { TIMEOUTS, createTimeoutSignal } from '@/config/timeouts';

describe('Configuration et Comportement des Timeouts Applicatifs', () => {
  it('doit allouer des délais appropriés et différenciés par opération', () => {
    // Les requêtes d'authentification doivent être rapides
    expect(TIMEOUTS.AUTH_REQUEST_MS).toBeGreaterThanOrEqual(10_000);
    
    // La génération d'un tour IA doit disposer d'au moins 20s
    expect(TIMEOUTS.AI_TURN_GENERATION_MS).toBeGreaterThanOrEqual(20_000);

    // Le transfert d'audio mobile et la transcription Whisper ne doivent PAS être bridés à 12s
    expect(TIMEOUTS.AUDIO_UPLOAD_MS).toBeGreaterThanOrEqual(30_000);
    expect(TIMEOUTS.AUDIO_TRANSCRIPTION_MS).toBeGreaterThanOrEqual(45_000);
    
    // Le rapport final de synthèse Campus France doit avoir au moins 40s
    expect(TIMEOUTS.FINAL_REPORT_GENERATION_MS).toBeGreaterThanOrEqual(40_000);
  });

  it('doit déclencher l interruption via createTimeoutSignal après expiration', async () => {
    const shortTimeoutMs = 50;
    const { controller, cleanup } = createTimeoutSignal(shortTimeoutMs);

    expect(controller.signal.aborted).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(controller.signal.aborted).toBe(true);
    cleanup();
  });

  it('doit permettre de nettoyer le timer avant expiration sans avorter le signal', () => {
    const longTimeoutMs = 5_000;
    const { controller, cleanup } = createTimeoutSignal(longTimeoutMs);

    cleanup();
    expect(controller.signal.aborted).toBe(false);
  });
});
