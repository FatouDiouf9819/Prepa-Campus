/**
 * Configuration centralisée du contact et support utilisateur.
 * Contient les paramètres du support WhatsApp officiel.
 */
export const CONTACT_CONFIG = {
  // Numéro WhatsApp au format international sans espace ni '+' (ex: '221764844051')
  // Configuré par défaut sur le numéro officiel du projet Campus France Prépa
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '221764844051',
  defaultMessage: "Bonjour, j'utilise Campus France Prepa et j'ai besoin d'aide.",
  helpText: "Besoin d'aide ? Une question ou une suggestion ? Contactez-nous.",
  actionLabel: "Nous contacter sur WhatsApp",
};
