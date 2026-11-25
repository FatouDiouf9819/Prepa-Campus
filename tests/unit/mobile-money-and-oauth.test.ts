import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PRICING_PACKS, SUPPORTED_OPERATORS } from '@/config/pricing';
import { 
  MobileMoneyPaymentSchema, 
  sanitizePhoneNumber, 
  getPackDetails, 
  getOperatorDetails 
} from '@/lib/validations/payment';
import { GET, POST } from '@/app/api/payments/mobile-money/route';

// Mocks Supabase Server Client
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn().mockResolvedValue({ data: { user: {} }, error: null });
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
    from: mockFrom,
  })),
}));

describe('Paiements Mobile Money & Offres Tarifaires (Option A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration des Offres Tarifaires et Opérateurs', () => {
    it('doit contenir les 4 packs officiels avec les crédits et tarifs en FCFA appropriés', () => {
      expect(PRICING_PACKS).toHaveLength(4);

      const decouverte = PRICING_PACKS.find((p) => p.id === 'pack_decouverte');
      expect(decouverte).toBeDefined();
      expect(decouverte?.credits).toBe(1);
      expect(decouverte?.priceCFA).toBe(0);

      const essentiel = PRICING_PACKS.find((p) => p.id === 'pack_essentiel');
      expect(essentiel?.credits).toBe(1);
      expect(essentiel?.priceCFA).toBe(2000);

      const reussite = PRICING_PACKS.find((p) => p.id === 'pack_reussite');
      expect(reussite?.credits).toBe(3);
      expect(reussite?.priceCFA).toBe(5000);
      expect(reussite?.popular).toBe(true);

      const intensif = PRICING_PACKS.find((p) => p.id === 'pack_intensif');
      expect(intensif?.credits).toBe(6);
      expect(intensif?.priceCFA).toBe(9000);
    });

    it('doit supporter Wave, Orange Money, Free Money et MTN MoMo pour le Sénégal, Côte d\'Ivoire et Cameroun', () => {
      const operatorIds = SUPPORTED_OPERATORS.map((op) => op.id);
      expect(operatorIds).toContain('wave_sn');
      expect(operatorIds).toContain('om_sn');
      expect(operatorIds).toContain('free_sn');
      expect(operatorIds).toContain('wave_ci');
      expect(operatorIds).toContain('om_ci');
      expect(operatorIds).toContain('mtn_ci');
      expect(operatorIds).toContain('om_cm');
      expect(operatorIds).toContain('mtn_cm');
    });
  });

  describe('Validation des Données de Paiement (Zod & Utilitaires)', () => {
    it('doit nettoyer convenablement les numéros de téléphone avec espaces et tirets', () => {
      expect(sanitizePhoneNumber('+221 77 123 45 67')).toBe('+221771234567');
      expect(sanitizePhoneNumber('07-00-11-22-33')).toBe('0700112233');
    });

    it('doit valider une charge utile correcte pour Wave Sénégal', () => {
      const result = MobileMoneyPaymentSchema.safeParse({
        packId: 'pack_reussite',
        operatorId: 'wave_sn',
        phoneNumber: '+221 77 987 65 43',
      });

      expect(result.success).toBe(true);
    });

    it('doit refuser le pack gratuit pack_decouverte en paiement payant', () => {
      const result = MobileMoneyPaymentSchema.safeParse({
        packId: 'pack_decouverte',
        operatorId: 'wave_sn',
        phoneNumber: '+221 77 987 65 43',
      });

      expect(result.success).toBe(false);
    });

    it('doit refuser un numéro de téléphone invalide ou trop court', () => {
      const result = MobileMoneyPaymentSchema.safeParse({
        packId: 'pack_essentiel',
        operatorId: 'om_sn',
        phoneNumber: '1234',
      });

      expect(result.success).toBe(false);
    });

    it('doit retrouver correctement les détails de pack et d\'opérateur', () => {
      expect(getPackDetails('pack_reussite')?.name).toBe('Pack Réussite');
      expect(getPackDetails('inconnu')).toBeNull();

      expect(getOperatorDetails('wave_sn')?.name).toBe('Wave Sénégal');
      expect(getOperatorDetails('inconnu')).toBeNull();
    });
  });

  describe('Route API GET /api/payments/mobile-money', () => {
    it('doit renvoyer la liste des packs et des opérateurs disponibles', async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.packs).toHaveLength(4);
      expect(json.operators.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Route API POST /api/payments/mobile-money (Sécurité & Transaction)', () => {
    it('doit refuser la transaction avec HTTP 401 si l\'utilisateur n\'est pas connecté', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Non authentifié') });

      const req = new NextRequest('http://localhost:3000/api/payments/mobile-money', {
        method: 'POST',
        body: JSON.stringify({
          packId: 'pack_reussite',
          operatorId: 'wave_sn',
          phoneNumber: '+221 77 123 45 67',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Non authentifié');
    });

    it('doit rejeter une charge utile JSON malformée avec HTTP 400', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-123' } }, error: null });

      const req = new NextRequest('http://localhost:3000/api/payments/mobile-money', {
        method: 'POST',
        body: 'invalid-json{',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('doit rejeter un opérateur Mobile Money inconnu avec HTTP 400', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-123' } }, error: null });

      const req = new NextRequest('http://localhost:3000/api/payments/mobile-money', {
        method: 'POST',
        body: JSON.stringify({
          packId: 'pack_reussite',
          operatorId: 'operateur_inexistant',
          phoneNumber: '+221 77 123 45 67',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Opérateur Mobile Money non reconnu');
    });

    it('doit créditer atomiquement le compte de l\'étudiant pour un paiement valide (ex: Pack Réussite +3)', async () => {
      const mockUserId = 'usr-fatima-test-456';
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: mockUserId } }, error: null });

      // Simule la lecture du solde existant (1 crédit disponible)
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: { balance: 1 }, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      // Simule l'écriture du nouveau solde (1 + 3 = 4 crédits)
      const mockUpsert = vi.fn().mockResolvedValueOnce({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_credits') {
          return {
            select: mockSelect,
            upsert: mockUpsert,
          };
        }
        return {};
      });

      const req = new NextRequest('http://localhost:3000/api/payments/mobile-money', {
        method: 'POST',
        body: JSON.stringify({
          packId: 'pack_reussite',
          operatorId: 'wave_sn',
          phoneNumber: '+221 77 000 11 22',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.creditedAmount).toBe(3);
      expect(json.previousBalance).toBe(1);
      expect(json.newBalance).toBe(4);
      expect(json.operator.name).toBe('Wave Sénégal');
      expect(json.transactionId).toMatch(/^PC-MM-/);

      // Vérifie l'appel d'écriture en base
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          balance: 4,
        })
      );
    });
  });
});
