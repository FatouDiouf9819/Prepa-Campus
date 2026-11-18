'use client';

import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Lock,
  Globe2
} from 'lucide-react';
import { PRICING_PACKS, SUPPORTED_OPERATORS } from '@/config/pricing';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPackId?: string;
  onPaymentSuccess?: (newBalance: number) => void;
}

export function MobileMoneyModal({
  isOpen,
  onClose,
  defaultPackId = 'pack_reussite',
  onPaymentSuccess,
}: PaymentModalProps) {
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card');
  const [selectedPackId, setSelectedPackId] = useState<string>(defaultPackId);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('wave_sn');
  
  // États Mobile Money
  const [phoneNumber, setPhoneNumber] = useState('');

  // États Carte Bancaire (Visa / Mastercard)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    credits: number;
    newBalance: number;
    transactionId: string;
    method: 'card' | 'mobile_money';
    brandOrOperator?: string;
  } | null>(null);

  const handleQuickTestRecharge = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10 }),
      });
      const data = await res.json();
      if (typeof data.balance === 'number') {
        setSuccessData({
          credits: 10,
          newBalance: data.balance,
          transactionId: `TEST_${Date.now()}`,
          method: 'mobile_money',
          brandOrOperator: 'Mode Test Gratuit',
        });
        onPaymentSuccess?.(data.balance);
      } else {
        setErrorMessage(data.error || 'Erreur lors de la recharge');
      }
    } catch {
      setErrorMessage('Erreur réseau lors de la recharge');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPack = PRICING_PACKS.find((p) => p.id === selectedPackId) || PRICING_PACKS[2];
  const currentOperator = SUPPORTED_OPERATORS.find((op) => op.id === selectedOperatorId) || SUPPORTED_OPERATORS[0];

  // Formatage en direct du numéro de carte (groupes de 4 chiffres)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Formatage de la date d'expiration MM/AA
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    setCardExpiry(raw);
  };

  // Paiement Carte Bancaire
  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentPack.priceCFA <= 0) {
      setErrorMessage(isEn ? 'This free pack does not require any payment.' : 'Ce pack gratuit ne nécessite aucun paiement.');
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setErrorMessage(isEn ? 'Invalid bank card number.' : 'Numéro de carte bancaire incomplet.');
      return;
    }

    if (!cardHolder.trim()) {
      setErrorMessage(isEn ? 'Please enter the cardholder name.' : 'Veuillez saisir le nom du titulaire.');
      return;
    }

    if (cardExpiry.length < 5) {
      setErrorMessage(isEn ? 'Invalid expiry date (MM/YY).' : 'Date d\'expiration invalide (MM/AA).');
      return;
    }

    if (cardCvc.length < 3) {
      setErrorMessage(isEn ? 'Invalid security code (CVC).' : 'Cryptogramme visuel (CVC) invalide.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payments/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: currentPack.id,
          cardNumber: cleanCard,
          cardHolder: cardHolder.trim(),
          cardExpiry,
          cardCvc,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || (isEn ? 'Card payment failed.' : 'Échec du paiement par carte bancaire.'));
        setLoading(false);
        return;
      }

      setSuccessData({
        credits: data.creditedAmount,
        newBalance: data.newBalance,
        transactionId: data.transactionId,
        method: 'card',
        brandOrOperator: data.card?.brand || 'Visa / Mastercard',
      });

      if (typeof window !== 'undefined' && typeof data.newBalance === 'number') {
        localStorage.setItem('campus_france_credits_balance', data.newBalance.toString());
      }

      if (onPaymentSuccess && typeof data.newBalance === 'number') {
        onPaymentSuccess(data.newBalance);
      }
    } catch {
      setErrorMessage(isEn ? 'Network error. Please check your connection.' : 'Erreur réseau. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  };

  // Paiement Mobile Money
  const handleMobileMoneyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentPack.priceCFA <= 0) {
      setErrorMessage(isEn ? 'This free pack does not require any payment.' : 'Ce pack gratuit ne nécessite aucun paiement.');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage(isEn ? 'Please enter your phone number.' : 'Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payments/mobile-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: currentPack.id,
          operatorId: currentOperator.id,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || (isEn ? 'Mobile Money payment failed.' : 'Échec de l\'opération de paiement Mobile Money.'));
        setLoading(false);
        return;
      }

      setSuccessData({
        credits: data.creditedAmount,
        newBalance: data.newBalance,
        transactionId: data.transactionId,
        method: 'mobile_money',
        brandOrOperator: currentOperator.name,
      });

      if (typeof window !== 'undefined' && typeof data.newBalance === 'number') {
        localStorage.setItem('campus_france_credits_balance', data.newBalance.toString());
      }

      if (onPaymentSuccess && typeof data.newBalance === 'number') {
        onPaymentSuccess(data.newBalance);
      }
    } catch {
      setErrorMessage(isEn ? 'Network error. Please check your connection.' : 'Erreur réseau. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMessage(null);
    setPhoneNumber('');
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCvc('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
      <div 
        className="bg-[#0D121F] border border-white/10 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton Fermeture */}
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          aria-label={t('payment.close')}
        >
          <X className="w-4 h-4" />
        </button>

        {successData ? (
          /* Écran de Succès */
          <div className="py-6 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-2">
                {isEn ? 'Payment Confirmed' : 'Paiement Confirmé'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {isEn ? 'Top-Up Successful!' : 'Recharge Réussie !'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm mx-auto">
                <strong className="text-[#38BDF8] font-bold">+{successData.credits} {isEn ? 'simulation(s)' : 'simulation(s)'}</strong> {isEn ? 'added to your account.' : 'ajoutée(s) avec succès à votre compte.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#121827] border border-white/10 text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-400">
                <span>{isEn ? 'Method:' : 'Moyen de paiement :'}</span>
                <span className="text-white font-semibold flex items-center gap-1.5">
                  {successData.method === 'card' ? <CreditCard className="w-3.5 h-3.5 text-[#38BDF8]" /> : <Smartphone className="w-3.5 h-3.5 text-[#38BDF8]" />}
                  {successData.brandOrOperator}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{isEn ? 'New balance available:' : 'Nouveau solde disponible :'}</span>
                <strong className="text-white font-bold">{successData.newBalance} simulation(s)</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{isEn ? 'Transaction Ref:' : 'Réf. transaction :'}</span>
                <span className="font-mono text-slate-300 text-[11px]">{successData.transactionId}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 transition cursor-pointer"
              >
                {isEn ? 'Start an interview' : 'Démarrer une simulation'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire de Paiement : Choix Carte Bancaire ou Mobile Money */
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-xs font-semibold mb-3">
                <Globe2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Pan-African & International Payment' : 'Paiement Panafricain & International'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {t('payment.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isEn 
                  ? 'Accepting Bank Cards (Visa/Mastercard) across all Africa & Mobile Money.'
                  : 'Cartes bancaires (Visa/Mastercard) pour toute l\'Afrique & Mobile Money.'}
              </p>
            </div>

            {/* Onglets Méthodes de Paiement (Carte vs Mobile Money) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#05070E] rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => { setPaymentMethod('card'); setErrorMessage(null); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{isEn ? 'Bank Card (Visa / MC)' : 'Carte Bancaire (Visa/MC)'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod('mobile_money'); setErrorMessage(null); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMethod === 'mobile_money'
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile Money</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Choix du Pack */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                {isEn ? '1. Select your package' : '1. Choisissez votre formule'}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {PRICING_PACKS.filter((p) => p.priceCFA > 0).map((pack) => {
                  const isSelected = pack.id === selectedPackId;
                  return (
                    <button
                      type="button"
                      key={pack.id}
                      onClick={() => setSelectedPackId(pack.id)}
                      className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/20 border-2 border-[#0066FF] shadow-xs'
                          : 'bg-[#121827] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0066FF] text-white">
                          {isEn ? 'Popular' : 'Populaire'}
                        </span>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {pack.credits} Simu{pack.credits > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-[#38BDF8] font-extrabold mt-1">
                          {pack.priceCFA.toLocaleString('fr-FR')} F
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">
                        ~{pack.priceEUR} €
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FORMULAIRE 1 : CARTE BANCAIRE (VISA / MASTERCARD) */}
            {paymentMethod === 'card' && (
              <form onSubmit={handleCardPayment} className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 rounded-2xl bg-[#121827] border border-white/10 text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Globe2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {isEn ? 'Anglophone Africa, Diaspora & Worldwide' : 'Afrique anglophone, diaspora & international'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[10px] font-bold text-[#38BDF8]">VISA</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-300">MC</span>
                  </div>
                </div>

                {/* Numéro de carte */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('payment.card_number')}
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 •••• •••• ••••"
                      maxLength={19}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm font-mono focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Nom du titulaire */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t('payment.card_holder')}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="ex. Kofi Mensah ou Fatima Diallo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-500"
                  />
                </div>

                {/* Expiration + CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {t('payment.card_expiry')}
                    </label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm font-mono focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>{t('payment.card_cvc')}</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="password"
                      required
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm font-mono focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-500 text-center"
                    />
                  </div>
                </div>

                {/* Bouton Validation Carte */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isEn ? 'Processing card payment...' : 'Traitement du paiement par carte...'}
                    </>
                  ) : (
                    <>
                      <span>{isEn ? 'Pay' : 'Payer'} {currentPack.priceCFA.toLocaleString('fr-FR')} FCFA (~{currentPack.priceEUR} €) {isEn ? 'by Card' : 'par Carte'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    3D Secure • Cryptage 256 bits
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {isEn ? 'Instant Credit' : 'Crédit immédiat'}
                  </span>
                </div>

                <div className="pt-2 text-center border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleQuickTestRecharge}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold underline transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isEn ? '🎁 Activate 10 test simulations (Free)' : '🎁 Activer 10 simulations de test gratuites'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORMULAIRE 2 : MOBILE MONEY */}
            {paymentMethod === 'mobile_money' && (
              <form onSubmit={handleMobileMoneyPayment} className="space-y-4 animate-in fade-in duration-150">
                {/* Choix de l'opérateur */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    {isEn ? '2. Select your Mobile Money operator' : '2. Choisissez votre opérateur Mobile Money'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SUPPORTED_OPERATORS.map((op) => {
                      const isSelected = op.id === selectedOperatorId;
                      return (
                        <button
                          type="button"
                          key={op.id}
                          onClick={() => setSelectedOperatorId(op.id)}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-500/20 border-2 border-[#0066FF] text-white shadow-xs'
                              : 'bg-[#121827] border-white/10 text-slate-300 hover:border-white/20'
                          }`}
                        >
                          <span className="text-base">{op.flag}</span>
                          <div className="truncate">
                            <div className="text-xs font-bold leading-tight truncate text-white">{op.name.split(' ')[0]}</div>
                            <div className="text-[10px] text-slate-400 leading-tight">{op.country}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#121827] border border-white/10 text-xs text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                    <span>{currentOperator.instructions}</span>
                  </div>
                </div>

                {/* Saisie du Numéro de Téléphone */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isEn ? `3. Your ${currentOperator.name} number` : `3. Votre numéro ${currentOperator.name}`}
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={currentOperator.prefixExample}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Bouton de Validation Mobile Money */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isEn ? 'Validating Mobile Money payment...' : 'Validation du paiement en cours...'}
                    </>
                  ) : (
                    <>
                      <span>{isEn ? 'Pay' : 'Payer'} {currentPack.priceCFA.toLocaleString('fr-FR')} FCFA {isEn ? 'with' : 'avec'} {currentOperator.name.split(' ')[0]}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {isEn ? 'Encrypted & Secure' : 'Paiement chiffré & sécurisé'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {isEn ? 'Instant Top-Up' : 'Activation instantanée'}
                  </span>
                </div>

                <div className="pt-2 text-center border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleQuickTestRecharge}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold underline transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isEn ? '🎁 Activate 10 test simulations (Free)' : '🎁 Activer 10 simulations de test gratuites'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Alias PaymentModal pour usage moderne
export const PaymentModal = MobileMoneyModal;
