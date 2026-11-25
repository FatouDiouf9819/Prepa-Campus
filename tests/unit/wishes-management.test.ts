import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock de createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GET as getProfileRoute, POST as postProfileRoute } from '@/app/api/profile/route';
import { 
  TargetWish, 
  MAX_TARGET_WISHES 
} from '@/types/profile';
import { 
  createEmptyWish, 
  wishesToSerializedText, 
  parseLegacyOrStoredWishes 
} from '@/lib/profile/wishes';
import { 
  TargetWishSchema, 
  DraftTargetWishSchema, 
  Step2Schema,
  DraftAcademicProfileSchema 
} from '@/lib/validations/profile';

describe('Gestion dynamique des Vœux de Formations — Étape 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Création, Modification, Suppression et Renumérotation des Vœux', () => {
    it('doit générer un vœu vierge avec un identifiant unique et stable', () => {
      const wish1 = createEmptyWish(1);
      const wish2 = createEmptyWish(2);

      expect(wish1.id).toBeDefined();
      expect(wish2.id).toBeDefined();
      expect(wish1.id).not.toBe(wish2.id);
      expect(wish1.programName).toBe('');
      expect(wish1.institutionName).toBe('');
      expect(wish1.status).toBe('DRAFT');
    });

    it('doit permettre la modification indépendante d un vœu sans altérer les autres', () => {
      const initialWishes: TargetWish[] = [
        { id: 'wish_1', programName: 'Master MIAGE', institutionName: 'Université Paris-Saclay', status: 'DRAFT' },
        { id: 'wish_2', programName: 'Master Big Data', institutionName: 'Université de Lille', status: 'DRAFT' },
      ];

      // Modifier uniquement le vœu 2
      const updatedWishes = initialWishes.map((w) =>
        w.id === 'wish_2' ? { ...w, programName: 'Master Cloud & DevOps' } : w
      );

      // Le vœu 1 reste strictement inchangé
      expect(updatedWishes[0].programName).toBe('Master MIAGE');
      expect(updatedWishes[0].institutionName).toBe('Université Paris-Saclay');

      // Le vœu 2 a bien été modifié
      expect(updatedWishes[1].programName).toBe('Master Cloud & DevOps');
      expect(updatedWishes[1].institutionName).toBe('Université de Lille');
    });

    it('doit recalculer automatiquement la numérotation après suppression d un vœu', () => {
      const wishes: TargetWish[] = [
        { id: 'w1', programName: 'Vœu 1 Formation', institutionName: 'Univ 1' },
        { id: 'w2', programName: 'Vœu 2 Formation', institutionName: 'Univ 2' },
        { id: 'w3', programName: 'Vœu 3 Formation', institutionName: 'Univ 3' },
      ];

      // Suppression du deuxième vœu (w2)
      const afterDeletion = wishes.filter((w) => w.id !== 'w2');

      expect(afterDeletion).toHaveLength(2);
      expect(afterDeletion[0].id).toBe('w1');
      expect(afterDeletion[1].id).toBe('w3');

      // Dans l'interface, afterDeletion[1] est indexé à 1, donc affiché comme « Vœu 2 »
      const indexDisplay = afterDeletion.map((_, idx) => `Vœu ${idx + 1}`);
      expect(indexDisplay).toEqual(['Vœu 1', 'Vœu 2']);
    });

    it('doit préserver au minimum un bloc de vœu si tous les vœux sont supprimés', () => {
      const wishes: TargetWish[] = [
        { id: 'single_wish', programName: 'Master Test', institutionName: 'Univ Test' }
      ];

      let updated = wishes.filter((w) => w.id !== 'single_wish');
      if (updated.length === 0) {
        updated = [createEmptyWish(1)];
      }

      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBeDefined();
      expect(updated[0].programName).toBe('');
    });
  });

  describe('2. Respect de la limite configurée (MAX_TARGET_WISHES = 7)', () => {
    it('doit valider jusqu à 7 vœux et rejeter tout dépassement dans Step2Schema', () => {
      expect(MAX_TARGET_WISHES).toBe(7);

      const sevenWishes: TargetWish[] = Array.from({ length: 7 }, (_, i) => ({
        id: `wish_${i + 1}`,
        programName: `Master Formation ${i + 1}`,
        institutionName: `Université ${i + 1}`,
      }));

      const validPayload = {
        targetWishes: sevenWishes,
        targetPrograms: sevenWishes.map((w) => w.programName).join(', '),
        targetInstitutions: sevenWishes.map((w) => w.institutionName).join(', '),
        reasonsForPrograms: 'Cette justification détaillée explique clairement le choix des 7 formations visées en France.',
      };

      const result = Step2Schema.safeParse(validPayload);
      expect(result.success).toBe(true);

      // Tentative avec 8 vœux
      const eightWishes = [
        ...sevenWishes,
        { id: 'wish_8', programName: 'Master 8 Exclus', institutionName: 'Univ 8' },
      ];

      const invalidPayload = {
        ...validPayload,
        targetWishes: eightWishes,
      };

      const invalidResult = Step2Schema.safeParse(invalidPayload);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.issues[0].message).toMatch(/7 vœux/i);
      }
    });
  });

  describe('3. Validation des champs et gestion des erreurs ciblées', () => {
    it('doit valider un vœu complet et rejeter un intitulé trop court', () => {
      const validWish = {
        id: 'wish-ok',
        programName: 'Master Informatique Big Data',
        institutionName: 'Université de Lille',
      };
      expect(TargetWishSchema.safeParse(validWish).success).toBe(true);

      const shortProgram = {
        id: 'wish-bad',
        programName: 'M1', // Trop court (< 3 car)
        institutionName: 'Université de Lille',
      };
      const result = TargetWishSchema.safeParse(shortProgram);
      expect(result.success).toBe(false);
    });

    it('doit accepter un vœu partiel dans un schéma de brouillon sans lever d erreur bloquante', () => {
      const draftWish = {
        id: 'draft-1',
        programName: 'Licence en cours',
        institutionName: '', // Non encore renseigné
      };

      const draftResult = DraftTargetWishSchema.safeParse(draftWish);
      expect(draftResult.success).toBe(true);
    });

    it('doit valider un profil brouillon avec des vœux partiels via DraftAcademicProfileSchema', () => {
      const partialDraft = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Informatique',
        targetWishes: [
          { id: 'w1', programName: 'Master IA', institutionName: '' },
        ],
        isCompleted: false,
      };

      const result = DraftAcademicProfileSchema.safeParse(partialDraft);
      expect(result.success).toBe(true);
    });
  });

  describe('4. Association stricte Formation ↔ Université et Sérialisation', () => {
    it('doit associer fidèlement chaque formation à sa propre université sans désynchronisation', () => {
      const wishes: TargetWish[] = [
        { id: 'w1', programName: 'Master MIAGE', institutionName: 'Université Paris-Saclay' },
        { id: 'w2', programName: 'Master Big Data', institutionName: 'Université de Lille' },
        { id: 'w3', programName: 'Licence Pro Réseaux', institutionName: 'Université Côte d\'Azur' },
      ];

      const serialized = wishesToSerializedText(wishes);
      expect(serialized.targetPrograms).toBe('Master MIAGE, Master Big Data, Licence Pro Réseaux');
      expect(serialized.targetInstitutions).toBe('Université Paris-Saclay, Université de Lille, Université Côte d\'Azur');

      // Reconstitution à partir des textes
      const reconstructed = parseLegacyOrStoredWishes(serialized.targetPrograms, serialized.targetInstitutions);
      expect(reconstructed).toHaveLength(3);
      expect(reconstructed[0].programName).toBe('Master MIAGE');
      expect(reconstructed[0].institutionName).toBe('Université Paris-Saclay');
      expect(reconstructed[1].programName).toBe('Master Big Data');
      expect(reconstructed[1].institutionName).toBe('Université de Lille');
      expect(reconstructed[2].programName).toBe('Licence Pro Réseaux');
      expect(reconstructed[2].institutionName).toBe('Université Côte d\'Azur');
    });

    it('doit recharger avec 100% de fidélité les vœux stockés sous forme de JSON sérialisé', () => {
      const wishes: TargetWish[] = [
        { id: 'w_stable_1', programName: 'Master 1 IA', institutionName: 'Sorbonne Université', entryLevel: 'M1' },
        { id: 'w_stable_2', programName: 'Master 2 Cyber', institutionName: 'INSA Lyon', entryLevel: 'M2' },
      ];

      const storedJson = JSON.stringify(wishes);

      // Rechargement direct depuis le JSON stocké dans target_institutions
      const loaded = parseLegacyOrStoredWishes('Master 1 IA, Master 2 Cyber', storedJson);
      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('w_stable_1');
      expect(loaded[0].programName).toBe('Master 1 IA');
      expect(loaded[0].institutionName).toBe('Sorbonne Université');
      expect(loaded[0].entryLevel).toBe('M1');

      expect(loaded[1].id).toBe('w_stable_2');
      expect(loaded[1].programName).toBe('Master 2 Cyber');
      expect(loaded[1].institutionName).toBe('INSA Lyon');
      expect(loaded[1].entryLevel).toBe('M2');
    });

    it('doit assurer la rétro-compatibilité totale avec les anciens profils sans perte de données', () => {
      // Ancien profil enregistré avant la refonte (chaînes simples avec virgules)
      const legacyPrograms = 'Master Bio-Informatique, Licence Pro Biotechnologies';
      const legacyInstitutions = 'Université de Montpellier, Université de Strasbourg';

      const reconstructed = parseLegacyOrStoredWishes(legacyPrograms, legacyInstitutions);
      expect(reconstructed).toHaveLength(2);
      expect(reconstructed[0].programName).toBe('Master Bio-Informatique');
      expect(reconstructed[0].institutionName).toBe('Université de Montpellier');
      expect(reconstructed[1].programName).toBe('Licence Pro Biotechnologies');
      expect(reconstructed[1].institutionName).toBe('Université de Strasbourg');
    });
  });

  describe('5. Sauvegarde et Isolation des Données (/api/profile)', () => {
    it('doit renvoyer HTTP 401 sur POST /api/profile si utilisateur non authentifié', async () => {
      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Session invalide') }),
        },
      });

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify({
          targetWishes: [{ id: 'w1', programName: 'Master MIAGE', institutionName: 'Paris' }],
          isCompleted: false,
        }),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Non authentifié/i);
    });

    it('doit enregistrer les vœux et renvoyer la liste structurée avec targetPrograms dérivé', async () => {
      const mockUser = { id: 'user_dynamic_wishes_123' };
      const savedDbRow = {
        id: 'prof_1',
        user_id: mockUser.id,
        country_residence: 'Sénégal',
        current_diploma: 'Licence 3',
        field_of_study: 'Informatique',
        target_programs: 'Master MIAGE, Master Big Data',
        target_institutions: JSON.stringify([
          { id: 'w1', programName: 'Master MIAGE', institutionName: 'Université Paris-Saclay' },
          { id: 'w2', programName: 'Master Big Data', institutionName: 'Université de Lille' },
        ]),
        reason_france: 'Recherche de laboratoires de pointe.',
        professional_goal: 'Devenir Lead Architect.',
        is_completed: false,
      };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          abortSignal: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: savedDbRow, error: null }),
        }),
      });

      const payload = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3',
        fieldOfStudy: 'Informatique',
        targetWishes: [
          { id: 'w1', programName: 'Master MIAGE', institutionName: 'Université Paris-Saclay' },
          { id: 'w2', programName: 'Master Big Data', institutionName: 'Université de Lille' },
        ],
        isCompleted: false,
      };

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.profile.targetWishes).toHaveLength(2);
      expect(json.profile.targetWishes[0].programName).toBe('Master MIAGE');
      expect(json.profile.targetWishes[0].institutionName).toBe('Université Paris-Saclay');
      expect(json.profile.targetPrograms).toBe('Master MIAGE, Master Big Data');
      expect(json.profile.targetInstitutions).toBe('Université Paris-Saclay, Université de Lille');
    });

    it('doit restituer fidèlement les vœux via GET /api/profile après reconnexion', async () => {
      const mockUser = { id: 'user_dynamic_wishes_123' };
      const savedDbRow = {
        id: 'prof_1',
        user_id: mockUser.id,
        country_residence: 'Sénégal',
        current_diploma: 'Licence 3',
        field_of_study: 'Informatique',
        target_programs: 'Master MIAGE',
        target_institutions: JSON.stringify([
          { id: 'w1', programName: 'Master MIAGE', institutionName: 'Université Paris-Saclay' },
        ]),
        is_completed: false,
      };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          abortSignal: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: savedDbRow, error: null }),
        }),
      });

      const res = await getProfileRoute();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.profile).toBeDefined();
      expect(json.profile.targetWishes).toHaveLength(1);
      expect(json.profile.targetWishes[0].programName).toBe('Master MIAGE');
      expect(json.profile.targetWishes[0].institutionName).toBe('Université Paris-Saclay');
      expect(json.profile.targetPrograms).toBe('Master MIAGE');
      expect(json.profile.targetInstitutions).toBe('Université Paris-Saclay');
    });
  });
});
