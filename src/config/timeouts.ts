/**
 * Configuration centralisée des délais d'attente (timeouts) applicatifs.
 * 
 * Les timeouts sont calibrés selon la nature de chaque opération :
 * - Les requêtes d'authentification et de validation de profil sont rapides (10s).
 * - La génération textuelle par LLM bénéficie d'un délai suffisant (20s).
 * - Le transfert réseau d'un enregistrement audio (MediaRecorder) tient compte des connexions 3G/4G (45s).
 * - La transcription audio Whisper traite des fichiers pouvant atteindre plusieurs mégaoctets (60s).
 * - Le rapport final de synthèse Campus France analyse l'ensemble des tours de parole (45s).
 */

export const TIMEOUTS = {
  /** Timeout pour les requêtes d'authentification et sessions (10s) */
  AUTH_REQUEST_MS: 10_000,
  
  /** Timeout pour les requêtes de base de données standard (10s) */
  DB_QUERY_MS: 10_000,
  
  /** Timeout pour la génération d'un tour de parole IA (20s) */
  AI_TURN_GENERATION_MS: 20_000,
  
  /** Timeout pour le téléversement du flux audio de l'étudiant (45s) */
  AUDIO_UPLOAD_MS: 45_000,
  
  /** Timeout pour la transcription STT Whisper côté serveur (60s) */
  AUDIO_TRANSCRIPTION_MS: 60_000,
  
  /** Timeout pour la génération du rapport final détaillé d'évaluation (45s) */
  FINAL_REPORT_GENERATION_MS: 45_000,
} as const;

/**
 * Crée un contrôleur d'annulation (AbortController) avec un timeout défini.
 * Permet d'éviter que des requêtes restent bloquées indéfiniment tout en
 * garantissant que les transferts audio légitimes ne soient pas coupés arbitrairement.
 */
export function createTimeoutSignal(timeoutMs: number): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Opération interrompue après expiration du délai de ${timeoutMs}ms.`));
  }, timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timer),
  };
}
