import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { CardPaymentSchema } from '@/lib/validations/payment';
import { POST } from '@/app/api/payments/card/route';
import { TRANSLATIONS } from '@/lib/i18n/LanguageContext';

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

describe('Paiements par Carte Bancaire Internationale & Bilinguisme FR/EN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation du Schéma Carte Bancaire (CardPaymentSchema)', () => {
    it('doit valider une carte Visa valide avec date future et CVC', () => {
      const validCard = {
        packId: 'pack_reussite',
        cardNumber: '4532 1234 5678 9010',
        cardHolder: 'Fatima Traore',
        expiry: '12/28',
        cvc: '123',
      };

      const result = CardPaymentSchema.safeParse(validCard);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cardNumber).toBe('4532123456789010');
      }
    });

    it('doit valider une carte Mastercard valide', () => {
      const validMastercard = {
        packId: 'pack_intensif',
        cardNumber: '5105 1051 0510 5100',
        cardHolder: 'Kwame Mensah',
        expiry: '08/29',
        cvc: '888',
      };

      const result = CardPaymentSchema.safeParse(validMastercard);
      expect(result.success).toBe(true);
    });

    it('doit rejeter un numéro de carte trop court ou invalide', () => {
      const invalidCard = {
        packId: 'pack_reussite',
        cardNumber: '1234',
        cardHolder: 'Fatima Traore',
        expiry: '12/28',
        cvc: '123',
      };

      const result = CardPaymentSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });

    it('doit rejeter une date d expiration au mauvais format', () => {
      const invalidExpiry = {
        packId: 'pack_reussite',
        cardNumber: '4532 1234 5678 9010',
        cardHolder: 'Fatima Traore',
        expiry: '2028/12',
        cvc: '123',
      };

      const result = CardPaymentSchema.safeParse(invalidExpiry);
      expect(result.success).toBe(false);
    });

    it('doit rejeter un code CVC invalide', () => {
      const invalidCvc = {
        packId: 'pack_reussite',
        cardNumber: '4532 1234 5678 9010',
        cardHolder: 'Fatima Traore',
        expiry: '12/28',
        cvc: '12',
      };

      const result = CardPaymentSchema.safeParse(invalidCvc);
      expect(result.success).toBe(false);
    });
  });

  describe('API Endpoint POST /api/payments/card', () => {
    it('doit retourner 401 si l utilisateur n est pas connecté', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Non authentifié') });

      const req = new NextRequest('http://localhost:3000/api/payments/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: 'pack_reussite',
          cardNumber: '4532 1234 5678 9010',
          cardHolder: 'Fatima Traore',
          expiry: '12/28',
          cvc: '123',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe('AUTH_REQUIRED');
    });

    it('doit retourner 400 si l utilisateur tente d acheter le pack gratuit', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-fatima-123', email: 'fatima@prepacampus.com' } },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/payments/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: 'pack_decouverte',
          cardNumber: '4532 1234 5678 9010',
          cardHolder: 'Fatima Traore',
          expiry: '12/28',
          cvc: '123',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('doit créditer le compte et activer les questions premium pour Pack Réussite', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-fatima-123',
            email: 'fatima@prepacampus.com',
            user_metadata: { credits: 2, has_premium_questions: false },
          },
        },
        error: null,
      });

      // Mock user_credits query
      const mockSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'user-fatima-123', balance: 2, has_premium_questions: false },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_credits') {
          return {
            select: mockSelect,
            upsert: mockUpsert,
          };
        }
        if (table === 'payment_transactions') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      const req = new NextRequest('http://localhost:3000/api/payments/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: 'pack_reussite',
          cardNumber: '4532 1234 5678 9010',
          cardHolder: 'Fatima Traore',
          expiry: '12/28',
          cvc: '123',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.paymentMethod).toBe('credit_card');
      expect(json.cardBrand).toBe('Visa');
      expect(json.creditsAdded).toBe(3);
      expect(json.newBalance).toBe(5);
      expect(json.hasPremiumQuestions).toBe(true);
      expect(mockUpsert).toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalled();
    });
  });

  describe('Dictionnaire de Langue i18n FR / EN', () => {
    it('doit contenir toutes les clés de navigation en français et anglais', () => {
      const keys = ['nav.home', 'nav.dashboard', 'nav.history', 'nav.questions', 'nav.pricing', 'nav.profile'];
      for (const key of keys) {
        expect(TRANSLATIONS[key]).toBeDefined();
        expect(TRANSLATIONS[key].fr.length).toBeGreaterThan(0);
        expect(TRANSLATIONS[key].en.length).toBeGreaterThan(0);
        expect(TRANSLATIONS[key].fr).not.toEqual(TRANSLATIONS[key].en);
      }
    });

    it('doit supporter les traductions pour les cartes bancaires et la couverture panafricaine', () => {
      expect(TRANSLATIONS['payment.tab_card']).toBeDefined();
      expect(TRANSLATIONS['payment.tab_card'].fr).toContain('Carte Bancaire');
      expect(TRANSLATIONS['payment.tab_card'].en).toContain('Credit Card');

      expect(TRANSLATIONS['payment.tab_momo']).toBeDefined();
      expect(TRANSLATIONS['payment.pan_africa_banner_desc']).toBeDefined();
      expect(TRANSLATIONS['payment.pan_africa_banner_desc'].en).toContain('Nigeria');
    });
  });
});
