import { z } from 'zod';
import { PRICING_PACKS, SUPPORTED_OPERATORS } from '@/config/pricing';

export const MobileMoneyPaymentSchema = z.object({
  packId: z.enum(['pack_essentiel', 'pack_reussite', 'pack_intensif'], {
    errorMap: () => ({ message: 'Veuillez sélectionner un pack payant valide (Essentiel, Réussite ou Intensif).' }),
  }),
  operatorId: z.string().min(1, 'Veuillez sélectionner un opérateur de paiement.'),
  phoneNumber: z
    .string()
    .min(7, 'Le numéro de téléphone doit comporter au moins 7 chiffres.')
    .max(20, 'Format de numéro de téléphone trop long.')
    .regex(/^[+0-9\s-]+$/, 'Le numéro ne doit contenir que des chiffres et des espaces.'),
});

export type MobileMoneyPaymentInput = z.infer<typeof MobileMoneyPaymentSchema>;

export const CardPaymentSchema = z.object({
  packId: z.enum(['pack_essentiel', 'pack_reussite', 'pack_intensif'], {
    errorMap: () => ({ message: 'Veuillez sélectionner un pack payant valide (Essentiel, Réussite ou Intensif).' }),
  }),
  cardNumber: z
    .string()
    .transform((val) => val.replace(/[\s-]/g, ''))
    .refine((val) => /^[0-9]{13,19}$/.test(val), {
      message: 'Le numéro de carte doit comporter entre 13 et 19 chiffres.',
    }),
  cardHolder: z
    .string()
    .min(2, 'Veuillez saisir le nom complet figurant sur la carte.')
    .max(80, 'Nom de titulaire trop long.'),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Date d\'expiration invalide (format MM/AA requis, ex: 12/28).'),
  cvc: z
    .string()
    .min(3, 'Le code CVC / CVV doit comporter 3 ou 4 chiffres.')
    .max(4, 'Code CVC trop long.')
    .regex(/^[0-9]+$/, 'Le code CVC ne doit comporter que des chiffres.'),
});

export type CardPaymentInput = z.infer<typeof CardPaymentSchema>;

/**
 * Nettoie et standardise le numéro de téléphone pour les API des opérateurs.
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

/**
 * Retrouve les détails d'un pack à partir de son identifiant.
 */
export function getPackDetails(packId: string) {
  return PRICING_PACKS.find((p) => p.id === packId) || null;
}

/**
 * Retrouve l'opérateur à partir de son identifiant.
 */
export function getOperatorDetails(operatorId: string) {
  return SUPPORTED_OPERATORS.find((op) => op.id === operatorId) || null;
}
