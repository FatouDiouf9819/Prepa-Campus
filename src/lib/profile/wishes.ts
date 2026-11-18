import { TargetWish, MAX_TARGET_WISHES } from '@/types/profile';

/**
 * Génère un vœu vierge avec un identifiant unique stable.
 */
export function createEmptyWish(indexHint?: number): TargetWish {
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now();
  return {
    id: `wish_${timestamp}_${uniqueSuffix}${indexHint !== undefined ? `_${indexHint}` : ''}`,
    programName: '',
    institutionName: '',
    entryLevel: '',
    motivation: '',
    status: 'DRAFT',
  };
}

/**
 * Convertit une liste de vœux structurés en chaînes lisibles pour la rétro-compatibilité
 * avec les affichages existants (dashboard, synthèse, etc.).
 */
export function wishesToSerializedText(wishes: TargetWish[]): {
  targetPrograms: string;
  targetInstitutions: string;
} {
  const validWishes = (wishes || []).filter(
    (w) => w.programName.trim().length > 0 || w.institutionName.trim().length > 0
  );

  if (validWishes.length === 0) {
    return {
      targetPrograms: '',
      targetInstitutions: '',
    };
  }

  const targetPrograms = validWishes
    .map((w) => w.programName.trim())
    .filter(Boolean)
    .join(', ');

  const targetInstitutions = validWishes
    .map((w) => w.institutionName.trim())
    .filter(Boolean)
    .join(', ');

  return {
    targetPrograms,
    targetInstitutions,
  };
}

/**
 * Analyse les données existantes (JSON stocké, données structurées ou anciennes chaînes avec virgules)
 * et reconstitue une liste propre de vœux structurés sans perte de données.
 */
export function parseLegacyOrStoredWishes(
  targetPrograms?: string | null,
  targetInstitutions?: string | null,
  existingWishes?: TargetWish[] | null
): TargetWish[] {
  // 1. Si des vœux structurés sont déjà fournis sous forme de tableau non vide
  if (Array.isArray(existingWishes) && existingWishes.length > 0) {
    return existingWishes.map((w, idx) => ({
      ...w,
      id: w.id || `wish_restored_${idx}_${Date.now()}`,
      programName: w.programName || '',
      institutionName: w.institutionName || '',
    }));
  }

  // 2. Vérifier si targetInstitutions contient un JSON sérialisé de vœux
  if (targetInstitutions && typeof targetInstitutions === 'string') {
    const trimmed = targetInstitutions.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: unknown, idx: number) => {
            const w = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
            return {
              id: typeof w.id === 'string' ? w.id : `wish_json_${idx}_${Date.now()}`,
              programName: typeof w.programName === 'string' ? w.programName : (typeof w.program === 'string' ? w.program : ''),
              institutionName: typeof w.institutionName === 'string' ? w.institutionName : (typeof w.institution === 'string' ? w.institution : ''),
              entryLevel: typeof w.entryLevel === 'string' ? w.entryLevel : '',
              motivation: typeof w.motivation === 'string' ? w.motivation : '',
              status: (w.status as 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED') || 'DRAFT',
            };
          });
        }
      } catch {
        // En cas d'erreur de parsing JSON, passer au repli rétro-compatible
      }
    }
  }

  // 3. Rétro-compatibilité : Découpage des anciennes chaînes séparées par des virgules ou points-virgules
  const programs = (targetPrograms || '')
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const institutions = (targetInstitutions || '')
    .split(/[,;\n]+/)
    .map((i) => i.trim())
    .filter(Boolean);

  const maxCount = Math.min(Math.max(programs.length, institutions.length), MAX_TARGET_WISHES);

  if (maxCount > 0) {
    const reconstructed: TargetWish[] = [];
    for (let i = 0; i < maxCount; i++) {
      reconstructed.push({
        id: `wish_legacy_${i + 1}`,
        programName: programs[i] || '',
        institutionName: institutions[i] || '',
        entryLevel: '',
        motivation: '',
        status: 'DRAFT',
      });
    }
    return reconstructed;
  }

  // 4. Par défaut : un vœu vide initial
  return [createEmptyWish(1)];
}
