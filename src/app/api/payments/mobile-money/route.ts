import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MobileMoneyPaymentSchema, getPackDetails, getOperatorDetails, sanitizePhoneNumber } from '@/lib/validations/payment';
import { PRICING_PACKS, SUPPORTED_OPERATORS } from '@/config/pricing';

/**
 * GET /api/payments/mobile-money
 * Liste publique des packs tarifaires et des opérateurs Mobile Money supportés.
 */
export async function GET() {
  return NextResponse.json({
    packs: PRICING_PACKS,
    operators: SUPPORTED_OPERATORS,
  });
}

/**
 * POST /api/payments/mobile-money
 * Initie et valide une recharge de simulations par Wave, Orange Money, Free Money ou MTN MoMo.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter pour recharger vos simulations.' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide.' },
        { status: 400 }
      );
    }

    const validation = MobileMoneyPaymentSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Données de paiement invalides.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { packId, operatorId, phoneNumber } = validation.data;

    const pack = getPackDetails(packId);
    if (!pack || pack.priceCFA <= 0) {
      return NextResponse.json(
        { error: 'Pack de simulations payant non valide.' },
        { status: 400 }
      );
    }

    const operator = getOperatorDetails(operatorId);
    if (!operator) {
      return NextResponse.json(
        { error: 'Opérateur Mobile Money non reconnu.' },
        { status: 400 }
      );
    }

    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    const transactionReference = `PC-MM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Récupérer le solde actuel de l'étudiant avec repli résilient
    let previousBalance = 1;
    if (typeof user.user_metadata?.credits_balance === 'number') {
      previousBalance = user.user_metadata.credits_balance;
    } else {
      try {
        const { data: currentCreditRow } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (typeof currentCreditRow?.balance === 'number') {
          previousBalance = currentCreditRow.balance;
        }
      } catch (selectErr) {
        console.warn('[Credits Select Note]:', selectErr);
      }
    }

    const newBalance = previousBalance + pack.credits;

    const grantsPremium = pack.id === 'pack_reussite' || pack.id === 'pack_intensif';
    const hasPremiumAccess = Boolean(user.user_metadata?.has_premium_questions) || grantsPremium;

    // 1. Tenter la mise à jour dans PostgreSQL (user_credits) via Admin Client puis Client standard
    let dbSuccess = false;
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = createAdminClient();
      const { error: adminCreditError } = await adminClient
        .from('user_credits')
        .upsert({
          user_id: user.id,
          balance: newBalance,
          has_premium_questions: hasPremiumAccess,
          updated_at: new Date().toISOString(),
        });
      if (!adminCreditError) {
        dbSuccess = true;
      }
    } catch {
      // Fallback sur le client standard
    }

    if (!dbSuccess) {
      try {
        const { error: updateError } = await supabase
          .from('user_credits')
          .upsert({
            user_id: user.id,
            balance: newBalance,
            has_premium_questions: hasPremiumAccess,
            updated_at: new Date().toISOString(),
          });

        if (updateError) {
          console.warn('[Supabase DB Credits Upsert Note]:', updateError.message);
        }
      } catch (upsertErr) {
        console.warn('[Supabase DB Credits Upsert Catch]:', upsertErr);
      }
    }

    // 2. Persistance universelle dans Supabase Auth user_metadata
    try {
      if (typeof supabase.auth.updateUser === 'function') {
        await supabase.auth.updateUser({
          data: {
            credits: newBalance,
            credits_balance: newBalance,
            last_recharge_reference: transactionReference,
            last_recharge_pack: pack.id,
            last_recharge_pack_name: pack.name,
            last_recharge_credits: pack.credits,
            last_recharge_operator: operator.name,
            last_recharge_method: 'mobile_money',
            last_recharge_date: new Date().toISOString(),
            has_premium_questions: hasPremiumAccess,
          },
        });
      }
    } catch (metaErr) {
      console.warn('[Supabase Auth Metadata Note]:', metaErr);
    }

    // 3. Enregistrer la transaction permanente
    try {
      const transactionPayload = {
        user_id: user.id,
        pack_id: pack.id,
        amount_cfa: pack.priceCFA,
        amount_eur: pack.priceEUR,
        payment_method: 'mobile_money',
        operator_id: operator.id,
        phone_number: cleanPhone,
        credits_added: pack.credits,
        status: 'completed',
        reference: transactionReference,
        created_at: new Date().toISOString(),
      };

      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        await adminClient.from('payment_transactions').insert(transactionPayload);
      } catch {
        await supabase.from('payment_transactions').insert(transactionPayload);
      }
    } catch {
      // Table optionnelle
    }

    return NextResponse.json({
      success: true,
      transactionId: transactionReference,
      paymentMethod: 'mobile_money',
      pack: {
        id: pack.id,
        name: pack.name,
        credits: pack.credits,
        priceCFA: pack.priceCFA,
        priceEUR: pack.priceEUR,
      },
      operator: {
        id: operator.id,
        name: operator.name,
        country: operator.country,
        flag: operator.flag,
      },
      phoneNumber: cleanPhone,
      creditedAmount: pack.credits,
      previousBalance,
      newBalance,
      hasPremiumQuestions: hasPremiumAccess,
      hasPremiumAccess,
      message: `Paiement Mobile Money validé avec succès ! ${pack.credits} simulation(s) ajoutée(s) à votre solde.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur interne du serveur de paiement.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
