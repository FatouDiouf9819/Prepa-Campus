import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CompleteAcademicProfileSchema, DraftAcademicProfileSchema } from '@/lib/validations/profile';
import { TIMEOUTS, createTimeoutSignal } from '@/config/timeouts';
import { AcademicProfileData, TargetWish } from '@/types/profile';

import { parseLegacyOrStoredWishes, wishesToSerializedText } from '@/lib/profile/wishes';

interface DbAcademicProfileRow {
  id?: string;
  user_id?: string;
  country_residence?: string | null;
  academic_status?: string | null;
  current_diploma?: string | null;
  field_of_study?: string | null;
  current_institution?: string | null;
  study_particularities?: string | null;
  target_programs?: string | null;
  target_institutions?: string | null;
  reasons_for_programs?: string | null;
  reason_france?: string | null;
  professional_goal?: string | null;
  strong_skills?: string | null;
  weaknesses_to_work?: string | null;
  is_completed?: boolean | null;
  created_at?: string;
  updated_at?: string;
  target_wishes?: TargetWish[] | null;
}

/**
 * Normalise un enregistrement PostgreSQL snake_case en objet TypeScript camelCase.
 * Reconstitue la liste structurée des vœux et garantit la rétro-compatibilité.
 */
function mapDbProfileToAcademicProfile(row: DbAcademicProfileRow): AcademicProfileData {
  const targetWishes = parseLegacyOrStoredWishes(
    row.target_programs,
    row.target_institutions,
    row.target_wishes as TargetWish[] | null | undefined
  );
  const serialized = wishesToSerializedText(targetWishes);

  return {
    id: row.id,
    userId: row.user_id,
    countryResidence: row.country_residence || 'Sénégal',
    academicStatus: row.academic_status || 'STUDYING',
    currentDiploma: row.current_diploma || '',
    fieldOfStudy: row.field_of_study || '',
    currentInstitution: row.current_institution || '',
    studyParticularities: row.study_particularities || '',
    targetWishes,
    targetPrograms: serialized.targetPrograms || row.target_programs || '',
    targetInstitutions: serialized.targetInstitutions || row.target_institutions || '',
    reasonsForPrograms: row.reasons_for_programs || row.reason_france || '',
    reasonFrance: row.reason_france || '',
    professionalGoal: row.professional_goal || '',
    strongSkills: row.strong_skills || '',
    weaknessesToWork: row.weaknesses_to_work || '',
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/profile
 * Récupère le profil académique de l'utilisateur authentifié.
 */
export async function GET() {
  const { controller, cleanup } = createTimeoutSignal(TIMEOUTS.DB_QUERY_MS);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      cleanup();
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter pour accéder à votre profil.' },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from('academic_profiles')
      .select('*')
      .eq('user_id', user.id)
      .abortSignal(controller.signal)
      .maybeSingle();

    cleanup();

    if (!error && profile) {
      return NextResponse.json({
        profile: mapDbProfileToAcademicProfile(profile),
      });
    }

    // Repli de secours indestructible : charger depuis user_metadata si la table est absente (404) ou vide
    if (user.user_metadata?.academic_profile) {
      return NextResponse.json({
        profile: user.user_metadata.academic_profile,
      });
    }

    return NextResponse.json({ profile: null });
  } catch (err: unknown) {
    cleanup();
    console.warn('[Profile GET Catch]', err);
    return NextResponse.json({ profile: null });
  }
}

/**
 * POST /api/profile
 * Sauvegarde (progressive ou finale) du profil académique de l'utilisateur.
 */
export async function POST(request: NextRequest) {
  const { controller, cleanup } = createTimeoutSignal(TIMEOUTS.DB_QUERY_MS);

  try {
    const rawBody = await request.json();

    // Prétraitement tolérant : nettoyer les vœux et pré-sérialiser pour synchronisation
    const rawWishes = Array.isArray(rawBody.targetWishes) ? rawBody.targetWishes : [];
    const cleanedWishes = rawWishes.filter(
      (w: any) =>
        (typeof w?.programName === 'string' && w.programName.trim().length > 0) ||
        (typeof w?.institutionName === 'string' && w.institutionName.trim().length > 0)
    );
    const serialized = wishesToSerializedText(cleanedWishes);

    const body = {
      ...rawBody,
      countryResidence: (rawBody.countryResidence || 'Sénégal').trim(),
      academicStatus: rawBody.academicStatus || 'STUDYING',
      currentDiploma: (rawBody.currentDiploma || '').trim(),
      fieldOfStudy: (rawBody.fieldOfStudy || '').trim(),
      targetWishes: cleanedWishes.length > 0 ? cleanedWishes : (rawBody.targetWishes || []),
      targetPrograms: (rawBody.targetPrograms || '').trim() || serialized.targetPrograms || '',
      targetInstitutions: (rawBody.targetInstitutions || '').trim() || serialized.targetInstitutions || '',
      reasonsForPrograms: (rawBody.reasonsForPrograms || rawBody.reasonFrance || '').trim(),
      reasonFrance: (rawBody.reasonFrance || rawBody.reasonsForPrograms || '').trim(),
      professionalGoal: (rawBody.professionalGoal || '').trim(),
    };

    // Vérifier si c'est une soumission finale ou une sauvegarde de brouillon
    const isFinalSubmission = body.isCompleted === true;
    const validationResult = isFinalSubmission
      ? CompleteAcademicProfileSchema.safeParse(body)
      : DraftAcademicProfileSchema.safeParse(body);

    if (!validationResult.success) {
      cleanup();
      return NextResponse.json(
        {
          error: 'Données de profil non conformes.',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      cleanup();
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter pour enregistrer votre profil.' },
        { status: 401 }
      );
    }

    // Si targetWishes est fourni, sérialiser pour synchroniser target_programs et target_institutions
    const effectiveWishes = validatedData.targetWishes && validatedData.targetWishes.length > 0
      ? validatedData.targetWishes
      : parseLegacyOrStoredWishes(validatedData.targetPrograms, validatedData.targetInstitutions);

    const serializedWishes = wishesToSerializedText(effectiveWishes);
    const finalTargetPrograms = serializedWishes.targetPrograms || validatedData.targetPrograms || '';
    // Pour target_institutions dans PostgreSQL, on stocke le JSON sérialisé des vœux afin de préserver
    // fidèlement les paires formation/université et leurs identifiants stables sans désynchronisation.
    const finalStoredInstitutions = effectiveWishes.length > 0
      ? JSON.stringify(effectiveWishes)
      : (serializedWishes.targetInstitutions || validatedData.targetInstitutions || '');

    // Base 001 colonnes essentielles
    const basePayload: Record<string, string | boolean | null> = {
      user_id: user.id,
      country_residence: validatedData.countryResidence,
      current_diploma: validatedData.currentDiploma,
      field_of_study: validatedData.fieldOfStudy,
      current_institution: validatedData.currentInstitution || null,
      target_programs: finalTargetPrograms,
      target_institutions: finalStoredInstitutions,
      reason_france: validatedData.reasonFrance,
      professional_goal: validatedData.professionalGoal,
      strong_skills: validatedData.strongSkills || null,
      weaknesses_to_work: validatedData.weaknessesToWork || null,
      is_completed: validatedData.isCompleted,
      updated_at: new Date().toISOString(),
    };

    // Colonnes étendues (target_wishes, reasons_for_programs, academic_status, study_particularities)
    const extendedPayload = {
      ...basePayload,
      target_wishes: effectiveWishes,
      reasons_for_programs: validatedData.reasonsForPrograms,
      academic_status: validatedData.academicStatus || 'STUDYING',
      study_particularities: validatedData.studyParticularities || null,
    };

    // Tenter l'upsert complet
    let { data: savedProfile, error: upsertError } = await supabase
      .from('academic_profiles')
      .upsert(extendedPayload, { onConflict: 'user_id' })
      .select()
      .abortSignal(controller.signal)
      .single();

    if (upsertError && (('code' in upsertError && (upsertError as { code?: string }).code === '42703') || upsertError.message?.includes('column') || upsertError.message?.includes('reasons_for_programs') || upsertError.message?.includes('target_wishes') || upsertError.message?.includes('academic_status') || upsertError.message?.includes('study_particularities'))) {
      // Repli immédiat sur le schéma de base 001 si une des colonnes additionnelles n'est pas encore migrée
      const fallback = await supabase
        .from('academic_profiles')
        .upsert(basePayload, { onConflict: 'user_id' })
        .select()
        .abortSignal(controller.signal)
        .single();
      savedProfile = fallback.data;
      upsertError = fallback.error;
    }

    cleanup();

    if (upsertError || !savedProfile) {
      console.error('[Supabase Profile Upsert Error]', upsertError?.message);
      return NextResponse.json(
        {
          error: "Erreur lors de l'enregistrement de votre profil sur le serveur. Vos modifications n'ont pas pu être persistées en base de données.",
          details: upsertError?.message || 'Aucune donnée retournée par la base de données.',
        },
        { status: 500 }
      );
    }

    const savedRow = savedProfile as DbAcademicProfileRow;

    const returnProfile: AcademicProfileData = {
      ...mapDbProfileToAcademicProfile(savedRow),
      academicStatus: savedRow.academic_status || validatedData.academicStatus || 'STUDYING',
      studyParticularities: savedRow.study_particularities || validatedData.studyParticularities || '',
    };

    // Synchroniser également dans user_metadata pour redondance
    try {
      await supabase.auth.updateUser({
        data: {
          academic_profile: returnProfile,
          profile_saved_at: new Date().toISOString(),
          is_profile_completed: validatedData.isCompleted,
        },
      });
    } catch (metaErr) {
      console.warn('[User Metadata Profile Sync Warning]', metaErr);
    }

    return NextResponse.json({
      success: true,
      profile: returnProfile,
      message: isFinalSubmission
        ? 'Profil validé avec succès. Vous pouvez maintenant accéder aux simulations.'
        : 'Brouillon sauvegardé avec succès.',
    });
  } catch (err: unknown) {
    cleanup();
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
