'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Info,
  Plus,
  Trash2
} from 'lucide-react';
import { AcademicProfileData, ProfileStep, TargetWish, MAX_TARGET_WISHES } from '@/types/profile';
import { createEmptyWish, wishesToSerializedText, parseLegacyOrStoredWishes } from '@/lib/profile/wishes';
import { ProfileStepIndicator } from './ProfileStepIndicator';
import { 
  Step1Schema, 
  Step3Schema, 
  Step4Schema, 
  CompleteAcademicProfileSchema 
} from '@/lib/validations/profile';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const INITIAL_PROFILE: AcademicProfileData = {
  countryResidence: 'Sénégal',
  academicStatus: 'STUDYING',
  currentDiploma: '',
  fieldOfStudy: '',
  currentInstitution: '',
  studyParticularities: '',
  targetWishes: [createEmptyWish(1)],
  targetPrograms: '',
  targetInstitutions: '',
  reasonsForPrograms: '',
  reasonFrance: '',
  professionalGoal: '',
  strongSkills: '',
  weaknessesToWork: '',
  isCompleted: false,
};

export function AcademicProfileForm() {
  const { language } = useLanguage();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ProfileStep>(1);
  const [formData, setFormData] = useState<AcademicProfileData>(INITIAL_PROFILE);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [wishToDelete, setWishToDelete] = useState<TargetWish | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  // Charger les données sauvegardées (localement et depuis le serveur lors d'une reconnexion)
  useEffect(() => {
    let isMounted = true;

    // A. Chargement immédiat du brouillon local
    try {
      const savedDraft = localStorage.getItem('campus_france_profile_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        const restoredWishes = parseLegacyOrStoredWishes(
          parsed.targetPrograms,
          parsed.targetInstitutions,
          parsed.targetWishes
        );
        const serialized = wishesToSerializedText(restoredWishes);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          targetWishes: restoredWishes,
          targetPrograms: serialized.targetPrograms || parsed.targetPrograms || '',
          targetInstitutions: serialized.targetInstitutions || parsed.targetInstitutions || '',
        }));
      }
    } catch {
      // Ignorer les erreurs de lecture du stockage local
    }

    // B. Récupération des données enregistrées côté serveur (reconnexion / nouvel appareil)
    async function loadServerProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile && isMounted) {
            const serverWishes = parseLegacyOrStoredWishes(
              data.profile.targetPrograms,
              data.profile.targetInstitutions,
              data.profile.targetWishes
            );
            const serialized = wishesToSerializedText(serverWishes);

            setFormData((prev) => ({
              ...prev,
              ...data.profile,
              targetWishes: serverWishes,
              targetPrograms: serialized.targetPrograms || data.profile.targetPrograms || '',
              targetInstitutions: serialized.targetInstitutions || data.profile.targetInstitutions || '',
              reasonsForPrograms: data.profile.reasonsForPrograms || prev.reasonsForPrograms || '',
            }));

            // Identifier les étapes déjà complètes
            const completed: number[] = [];
            if (data.profile.countryResidence && data.profile.currentDiploma && data.profile.fieldOfStudy) {
              completed.push(1);
            }
            const hasValidWishes = serverWishes.some((w: TargetWish) => w.programName.trim().length > 0 && w.institutionName.trim().length > 0);
            if ((hasValidWishes || (data.profile.targetPrograms && data.profile.targetInstitutions)) && data.profile.reasonsForPrograms) {
              completed.push(2);
            }
            if (data.profile.professionalGoal && data.profile.reasonFrance) {
              completed.push(3);
            }
            if (data.profile.isCompleted) {
              completed.push(4);
            }
            setCompletedSteps(completed);

            // Synchroniser le stockage local
            try {
              localStorage.setItem('campus_france_profile_draft', JSON.stringify({
                ...data.profile,
                targetWishes: serverWishes,
              }));
              if (data.profile.isCompleted) {
                localStorage.setItem('campus_france_profile_completed', 'true');
              }
            } catch {
              // Ignorer
            }
          }
        }
      } catch {
        // En cas de coupure réseau, les données locales restent actives
      }
    }

    loadServerProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Vérification pure des erreurs d'une étape donnée
  const checkStepErrors = (step: ProfileStep, data: AcademicProfileData): Record<string, string> => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 1: {
        const country = (data.countryResidence || '').trim();
        const diploma = (data.currentDiploma || '').trim();
        const field = (data.fieldOfStudy || '').trim();

        if (country.length < 2) {
          stepErrors.countryResidence = 'Le pays de résidence est obligatoire.';
        }
        if (diploma.length < 2) {
          stepErrors.currentDiploma = 'Veuillez préciser votre diplôme actuel ou récent (au moins 2 caractères).';
        }
        if (field.length < 2) {
          stepErrors.fieldOfStudy = "Veuillez préciser votre filière d'études (au moins 2 caractères).";
        }
        break;
      }
      case 2: {
        const wishes = data.targetWishes || [];
        // Filtrer les entrées complètement blanches ajoutées par mégarde
        const activeWishes = wishes.filter(
          (w) => w.programName.trim().length > 0 || w.institutionName.trim().length > 0
        );

        if (activeWishes.length === 0 && !data.targetPrograms?.trim()) {
          stepErrors.targetWishes = 'Veuillez renseigner au moins un vœu de formation complet (formation et établissement).';
        } else {
          activeWishes.forEach((w, idx) => {
            const prog = w.programName.trim();
            const inst = w.institutionName.trim();

            if (prog.length > 0 && inst.length === 0) {
              stepErrors[`wish_${w.id}_institutionName`] = `Veuillez indiquer l'université pour le vœu ${idx + 1}.`;
            } else if (prog.length === 0 && inst.length > 0) {
              stepErrors[`wish_${w.id}_programName`] = `Veuillez préciser la formation pour le vœu ${idx + 1}.`;
            } else if (prog.length > 0 && inst.length > 0) {
              if (prog.length < 2) {
                stepErrors[`wish_${w.id}_programName`] = 'L\'intitulé doit comporter au moins 2 caractères.';
              }
              if (inst.length < 2) {
                stepErrors[`wish_${w.id}_institutionName`] = 'L\'établissement doit comporter au moins 2 caractères.';
              }
            }
          });
        }

        const reasons = (data.reasonsForPrograms || data.reasonFrance || '').trim();
        if (!reasons || reasons.length < 3) {
          stepErrors.reasonsForPrograms = 'Veuillez expliquer brièvement vos choix de formations.';
        }
        break;
      }
      case 3: {
        const goal = (data.professionalGoal || '').trim();
        const reason = (data.reasonFrance || data.reasonsForPrograms || '').trim();

        if (goal.length < 3) {
          stepErrors.professionalGoal = 'Veuillez préciser votre projet professionnel ou le métier visé.';
        }
        if (reason.length < 3) {
          stepErrors.reasonFrance = 'Veuillez expliquer vos motivations pour étudier en France.';
        }
        break;
      }
      case 4:
        // L'auto-évaluation à l'étape 4 est optionnelle
        break;
    }

    return stepErrors;
  };

  // Validation d'une étape donnée
  const validateStep = (step: ProfileStep): boolean => {
    const stepErrors = checkStepErrors(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    // Effacer les erreurs de l'étape courante
    setErrors({});
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }

    return true;
  };

  const handleWishChange = (id: string, field: 'programName' | 'institutionName', value: string) => {
    setFormData((prev) => {
      const currentWishes = prev.targetWishes || [];
      const updatedWishes = currentWishes.map((w) =>
        w.id === id ? { ...w, [field]: value } : w
      );
      const serialized = wishesToSerializedText(updatedWishes);
      const updated = {
        ...prev,
        targetWishes: updatedWishes,
        targetPrograms: serialized.targetPrograms,
        targetInstitutions: serialized.targetInstitutions,
      };

      try {
        localStorage.setItem('campus_france_profile_draft', JSON.stringify(updated));
      } catch {
        // Ignorer
      }

      return updated;
    });

    const errorKey = `wish_${id}_${field}`;
    if (errors[errorKey] || errors.targetWishes) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[errorKey];
        delete copy.targetWishes;
        return copy;
      });
    }
  };

  const handleAddWish = () => {
    if ((formData.targetWishes?.length || 0) >= MAX_TARGET_WISHES) {
      return;
    }

    setFormData((prev) => {
      const currentWishes = prev.targetWishes || [];
      const newWish = createEmptyWish(currentWishes.length + 1);
      const updatedWishes = [...currentWishes, newWish];
      const serialized = wishesToSerializedText(updatedWishes);
      const updated = {
        ...prev,
        targetWishes: updatedWishes,
        targetPrograms: serialized.targetPrograms,
        targetInstitutions: serialized.targetInstitutions,
      };

      try {
        localStorage.setItem('campus_france_profile_draft', JSON.stringify(updated));
      } catch {
        // Ignorer
      }

      return updated;
    });
  };

  const handleRequestDeleteWish = (wish: TargetWish) => {
    if (!wish.programName.trim() && !wish.institutionName.trim()) {
      executeDeleteWish(wish.id);
    } else {
      setWishToDelete(wish);
    }
  };

  const executeDeleteWish = (id: string) => {
    setFormData((prev) => {
      const currentWishes = prev.targetWishes || [];
      let updatedWishes = currentWishes.filter((w) => w.id !== id);
      if (updatedWishes.length === 0) {
        updatedWishes = [createEmptyWish(1)];
      }
      const serialized = wishesToSerializedText(updatedWishes);
      const updated = {
        ...prev,
        targetWishes: updatedWishes,
        targetPrograms: serialized.targetPrograms,
        targetInstitutions: serialized.targetInstitutions,
      };

      try {
        localStorage.setItem('campus_france_profile_draft', JSON.stringify(updated));
      } catch {
        // Ignorer
      }

      return updated;
    });

    setWishToDelete(null);
  };

  const handleInputChange = (field: keyof AcademicProfileData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }

    // Sauvegarde automatique du brouillon dans localStorage
    try {
      localStorage.setItem('campus_france_profile_draft', JSON.stringify(updated));
    } catch {
      // Ignorer
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as ProfileStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as ProfileStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    // Conserver localement le brouillon pour ne rien perdre de la saisie utilisateur
    try {
      localStorage.setItem('campus_france_profile_draft', JSON.stringify({ ...formData, isCompleted: false }));
    } catch {
      // Ignorer erreur de stockage local
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isCompleted: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveStatus({
          type: 'error',
          message: data.error || "Impossible d'enregistrer le brouillon sur le serveur. Vos données restent conservées sur votre appareil.",
        });
      } else {
        setSaveStatus({
          type: 'success',
          message: data.message || 'Brouillon enregistré avec succès sur votre compte.',
        });
      }
    } catch {
      setSaveStatus({
        type: 'error',
        message: "Erreur de connexion. Vos données restent conservées localement dans votre navigateur, mais n'ont pas pu être synchronisées sur le serveur.",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Filtrer les vœux complètement vides pour ne pas pénaliser l'utilisateur
    const currentWishes = formData.targetWishes || [];
    const activeWishes = currentWishes.filter(
      (w) => w.programName.trim().length > 0 || w.institutionName.trim().length > 0
    );
    const cleanedWishes = activeWishes.length > 0 ? activeWishes : currentWishes;
    const serialized = wishesToSerializedText(cleanedWishes);

    const dataToSave: AcademicProfileData = {
      ...formData,
      targetWishes: cleanedWishes,
      targetPrograms: serialized.targetPrograms || formData.targetPrograms || '',
      targetInstitutions: serialized.targetInstitutions || formData.targetInstitutions || '',
      reasonsForPrograms: (formData.reasonsForPrograms || formData.reasonFrance || '').trim(),
      reasonFrance: (formData.reasonFrance || formData.reasonsForPrograms || '').trim(),
      professionalGoal: (formData.professionalGoal || '').trim(),
      isCompleted: true,
    };

    // 2. Contrôler rigoureusement les 4 étapes sans écraser les messages d'erreur
    const err1 = checkStepErrors(1, dataToSave);
    const err2 = checkStepErrors(2, dataToSave);
    const err3 = checkStepErrors(3, dataToSave);
    const err4 = checkStepErrors(4, dataToSave);
    const combinedErrors = { ...err1, ...err2, ...err3, ...err4 };

    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);

      // Identifier précisément la première étape nécessitant une correction
      let firstErrorStep: ProfileStep = 1;
      let firstErrorMessage = '';

      if (Object.keys(err1).length > 0) {
        firstErrorStep = 1;
        firstErrorMessage = Object.values(err1)[0];
      } else if (Object.keys(err2).length > 0) {
        firstErrorStep = 2;
        firstErrorMessage = Object.values(err2)[0];
      } else if (Object.keys(err3).length > 0) {
        firstErrorStep = 3;
        firstErrorMessage = Object.values(err3)[0];
      } else if (Object.keys(err4).length > 0) {
        firstErrorStep = 4;
        firstErrorMessage = Object.values(err4)[0];
      }

      setCurrentStep(firstErrorStep);
      setSaveStatus({
        type: 'error',
        message: `Veuillez renseigner les informations requises à l'étape ${firstErrorStep} : ${firstErrorMessage}`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 3. Tout est valide : persistance immédiate et envoi
    setFormData(dataToSave);
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    // Conserver localement le profil complet pour garantir la pérennité immédiate
    try {
      localStorage.setItem('campus_france_profile_draft', JSON.stringify(dataToSave));
      localStorage.setItem('campus_france_profile_completed', 'true');
    } catch {
      // Ignorer erreur localStorage
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveStatus({
          type: 'error',
          message: data.error || "Échec de l'enregistrement sur le serveur. Vos informations restent conservées ci-dessous, veuillez réessayer.",
        });
        setIsSaving(false);
        return;
      }

      // Succès réel confirmé par le serveur : déverrouillage et redirection instantanée
      localStorage.setItem('campus_france_profile_completed', 'true');
      setSaveStatus({
        type: 'success',
        message: data.message || 'Profil validé avec succès ! Redirection vers votre tableau de bord...',
      });

      // Redirection instantanée zéro pause
      router.push('/dashboard');
      router.refresh();
    } catch {
      setSaveStatus({
        type: 'error',
        message: 'Erreur de communication avec le serveur. Vos saisies sont conservées en mémoire locale.',
      });
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* En-tête du formulaire */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-medium mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{language === 'fr' ? 'Fiche Parcours & Projet Officiel' : 'Official Academic Record & Career Project'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {language === 'fr' ? 'Votre Profil Académique Campus France' : 'Your Campus France Academic Profile'}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300">
          {language === 'fr'
            ? 'Ces informations permettront à l\'IA d\'adapter ses questions et ses relances à vos vœux réels, exactement comme un jury officiel.'
            : 'This information enables the AI to calibrate questions and follow-ups to your exact program choices, just like an official jury.'}
        </p>
      </div>

      {/* Avertissement déontologique */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 mb-6 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200">
            {language === 'fr' ? 'Protection des données : ' : 'Data Protection: '}
          </strong>
          {language === 'fr'
            ? 'Vos informations sont strictement utilisées pour calibrer la simulation. Elles ne sont ni partagées ni commercialisées. Vous pouvez les modifier ou les supprimer à tout moment.'
            : 'Your data is strictly used to calibrate the voice simulation. It is never shared or sold. You can edit or delete it anytime.'}
        </p>
      </div>

      {/* Barre d'étapes */}
      <ProfileStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => {
          if (step < currentStep || validateStep(currentStep)) {
            setCurrentStep(step);
          }
        }}
      />

      {/* Alertes de statut */}
      {saveStatus.message && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm animate-in fade-in duration-300 ${
            saveStatus.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Formulaire principal */}
      <form onSubmit={handleFinalSubmit} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* ÉTAPE 1 : Parcours actuel */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-semibold text-white">1. Parcours actuel</h2>
              <p className="text-xs text-slate-400 mt-1">
                Présentez votre situation académique réelle, votre dernier diplôme et les spécificités de votre cursus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Pays de résidence <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={formData.countryResidence}
                  onChange={(e) => handleInputChange('countryResidence', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                >
                  <option value="Sénégal">Sénégal</option>
                  <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
                  <option value="Cameroun">Cameroun</option>
                  <option value="Bénin">Bénin</option>
                  <option value="Togo">Togo</option>
                  <option value="Guinée">Guinée</option>
                  <option value="Mali">Mali</option>
                  <option value="Maroc">Maroc</option>
                  <option value="Algérie">Algérie</option>
                  <option value="Tunisie">Tunisie</option>
                  <option value="Gabon">Gabon</option>
                  <option value="Congo (Brazzaville)">Congo (Brazzaville)</option>
                  <option value="République Démocratique du Congo">République Démocratique du Congo</option>
                  <option value="Madagascar">Madagascar</option>
                  <option value="Burkina Faso">Burkina Faso</option>
                  <option value="Niger">Niger</option>
                  <option value="Mauritanie">Mauritanie</option>
                  <option value="Autre pays francophone">Autre pays francophone</option>
                </select>
                {errors.countryResidence && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.countryResidence}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Situation académique actuelle <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={formData.academicStatus || 'STUDYING'}
                  onChange={(e) => handleInputChange('academicStatus', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                >
                  <option value="STUDYING">Études en cours (formation ou diplôme en préparation)</option>
                  <option value="GRADUATED">Diplômé(e) (cursus terminé, en attente de poursuite d&apos;études)</option>
                  <option value="EMPLOYED_OR_INTERN">En stage ou activité professionnelle</option>
                  <option value="GAP_YEAR">En césure ou interruption d&apos;études</option>
                  <option value="REORIENTATION">En cours de réorientation de cursus</option>
                  <option value="OTHER">Autre situation académique</option>
                </select>
                {errors.academicStatus && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.academicStatus}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dernier diplôme préparé ou obtenu <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Licence 3 Informatique, Baccalauréat Scientifique, BTS Comptabilité, Master 1..."
                  value={formData.currentDiploma}
                  onChange={(e) => handleInputChange('currentDiploma', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
                {errors.currentDiploma && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.currentDiploma}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Filière / Domaine d&apos;études <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Génie Logiciel, Économie-Gestion, Droit Privé, Biologie..."
                  value={formData.fieldOfStudy}
                  onChange={(e) => handleInputChange('fieldOfStudy', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
                {errors.fieldOfStudy && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.fieldOfStudy}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Établissement fréquenté (actuel ou le plus récent) <span className="text-slate-500 font-normal">(Optionnel)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Université Cheikh Anta Diop (UCAD), Université Félix Houphouët-Boigny, ESP Dakar..."
                  value={formData.currentInstitution || ''}
                  onChange={(e) => handleInputChange('currentInstitution', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
                {errors.currentInstitution && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.currentInstitution}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Particularité ou précision sur votre parcours <span className="text-slate-500 font-normal">(Optionnel)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {(formData.studyParticularities || '').length}/500 caractères
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Ex : Césure après la L2, réorientation vers l'informatique, retard de soutenance de stage... Expliquez avec vos propres mots pour que l'examinatrice comprenne votre évolution avec bienveillance."
                  value={formData.studyParticularities || ''}
                  onChange={(e) => handleInputChange('studyParticularities', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Facultatif • Ces détails permettent d&apos;adapter les questions de l&apos;entretien oral sans jugement ni a priori.
                </p>
                {errors.studyParticularities && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.studyParticularities}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Formation visée (Liste dynamique de vœux) */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-semibold text-white">2. Formation visée</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ajoutez vos formations une par une pour préparer vos candidatures Campus France.
              </p>
            </div>

            {errors.targetWishes && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errors.targetWishes}</span>
              </div>
            )}

            {/* Liste dynamique des vœux */}
            <div className="space-y-4">
              {formData.targetWishes?.map((wish, index) => (
                <div
                  key={wish.id}
                  className="bg-slate-900/60 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/70">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        Vœu {index + 1}
                      </span>
                      {index === 0 && (
                        <span className="text-[11px] text-slate-500 hidden sm:inline">Vœu principal</span>
                      )}
                    </div>

                    {(formData.targetWishes?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteWish(wish)}
                        className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition flex items-center gap-1.5"
                        title="Supprimer ce vœu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Supprimer</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Formation souhaitée <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex : Master 1 Informatique parcours Big Data"
                        value={wish.programName}
                        onChange={(e) => handleWishChange(wish.id, 'programName', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                      />
                      {errors[`wish_${wish.id}_programName`] && (
                        <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors[`wish_${wish.id}_programName`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Université ou établissement <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex : Université de Lille, Université Paris-Saclay"
                        value={wish.institutionName}
                        onChange={(e) => handleWishChange(wish.id, 'institutionName', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                      />
                      {errors[`wish_${wish.id}_institutionName`] && (
                        <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors[`wish_${wish.id}_institutionName`]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton d'ajout d'un vœu ou message de limite atteinte */}
            <div>
              {(formData.targetWishes?.length || 0) < MAX_TARGET_WISHES ? (
                <button
                  type="button"
                  onClick={handleAddWish}
                  className="w-full py-3 px-4 border border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-xl bg-cyan-950/20 hover:bg-cyan-950/30 text-cyan-300 text-sm font-medium transition flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  + Ajouter un vœu ({formData.targetWishes?.length || 0} / {MAX_TARGET_WISHES})
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    Limite de {MAX_TARGET_WISHES} vœux atteinte pour cette étape. Vous pouvez modifier ou supprimer les vœux existants ci-dessus.
                  </p>
                </div>
              )}
            </div>

            {/* Justification pédagogique des vœux */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Pourquoi avez-vous choisi ces formations en particulier ? <span className="text-cyan-400">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Précisez les matières clés, les modules de spécialisation ou les laboratoires de recherche qui justifient votre choix..."
                value={formData.reasonsForPrograms}
                onChange={(e) => handleInputChange('reasonsForPrograms', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                <span>Motivation synthétique et précise</span>
                <span>{formData.reasonsForPrograms.length}/1000</span>
              </div>
              {errors.reasonsForPrograms && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.reasonsForPrograms}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Projet Professionnel & Choix de la France */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-semibold text-white">3. Projet Professionnel & Motivations</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Le conseiller Campus France cherche à comprendre la cohérence globale de votre parcours : le métier visé, vos motivations pour étudier en France et vos atouts personnels.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Métier cible ou projet professionnel <span className="text-cyan-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Précisez la fonction visée (à court ou moyen terme), le secteur d&apos;activité et la finalité de votre projet.
                </p>
                <textarea
                  rows={3}
                  placeholder="Ex : Je souhaite devenir Ingénieur Cloud / DevOps dans le secteur bancaire ou des télécoms. À court terme après l'obtention de mon diplôme, je vise un poste d'administrateur infrastructure pour automatiser les déploiements, avec pour objectif d'évoluer vers le conseil en architecture logicielle."
                  value={formData.professionalGoal}
                  onChange={(e) => handleInputChange('professionalGoal', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                />
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                  <span>Métier, fonction ou spécialisation visée</span>
                  <span>{formData.professionalGoal.length}/1000</span>
                </div>
                {errors.professionalGoal && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.professionalGoal}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pourquoi choisir la France pour vos études ? <span className="text-cyan-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Expliquez la valeur ajoutée académique, les spécificités pédagogiques ou les opportunités concrètes que vous recherchez en France.
                </p>
                <textarea
                  rows={3}
                  placeholder="Ex : La France dispose d'un écosystème de formation d'excellence dans mon domaine, associant des cours théoriques pointus, des travaux pratiques sur des technologies récentes et des opportunités d'alternance en entreprise. Ce cadre me permettra d'acquérir une méthode de travail et une expertise reconnue internationalement."
                  value={formData.reasonFrance}
                  onChange={(e) => handleInputChange('reasonFrance', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                />
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                  <span>Raisons de la mobilité en France</span>
                  <span>{formData.reasonFrance.length}/1000</span>
                </div>
                {errors.reasonFrance && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.reasonFrance}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Compétences clés, expériences et atouts personnels <span className="text-slate-500 font-normal">(Optionnel)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {(formData.strongSkills || '').length}/500 caractères
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Stages, projets universitaires ou personnels, certifications, outils techniques maîtrisés ou engagement associatif.
                </p>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Ex : Stage de 3 mois en développement Python/Django chez Orange ; Certification AWS Cloud Practitioner ; Réalisation d'une application de gestion en React ; Membre actif du club informatique universitaire."
                  value={formData.strongSkills || ''}
                  onChange={(e) => handleInputChange('strongSkills', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Facultatif • Ces informations permettent à l&apos;examinatrice de vous poser des questions pertinentes sur vos réalisations concrètes.
                </p>
                {errors.strongSkills && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.strongSkills}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Évaluation & Validation du Dossier */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-semibold text-white">4. Évaluation & Validation du Dossier</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Auto-évaluez vos points à travailler et vérifiez l&apos;ensemble de vos réponses avant la validation finale.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Quels points souhaitez-vous particulièrement travailler ? (Optionnel)
              </label>
              <textarea
                rows={4}
                placeholder="Ex : Questions que vous redoutez, difficultés à justifier votre parcours ou une réorientation, manque de confiance à l'oral, présentation synthétique de votre projet professionnel..."
                value={formData.weaknessesToWork || ''}
                onChange={(e) => handleInputChange('weaknessesToWork', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                L&apos;IA prendra en compte ces indications pour orienter ses questions sans vous pénaliser.
              </p>
            </div>

            {/* Récapitulatif structuré et vérifiable avant validation */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Récapitulatif complet de votre candidature
                </span>
                <span className="text-[11px] text-slate-400">Vérifiez vos informations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                {/* Étape 1 : Cursus actuel */}
                <div className="space-y-1.5 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-medium">1. Cursus actuel :</span>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-[11px] text-cyan-400 hover:underline">Modifier</button>
                  </div>
                  <p className="font-medium text-white">{formData.currentDiploma || 'Non renseigné'} ({formData.fieldOfStudy || 'Général'})</p>
                  <p className="text-[11px] text-slate-400">{formData.currentInstitution || 'Établissement non précisé'} — {formData.countryResidence}</p>
                  <p className="text-[11px] text-cyan-300">
                    Situation : {
                      formData.academicStatus === 'STUDYING' ? 'Études en cours' :
                      formData.academicStatus === 'GRADUATED' ? 'Diplôme obtenu' :
                      formData.academicStatus === 'EMPLOYED_OR_INTERN' ? 'En stage / emploi' :
                      formData.academicStatus === 'GAP_YEAR' ? 'En césure' :
                      formData.academicStatus === 'REORIENTATION' ? 'En réorientation' : 'Autre'
                    }
                  </p>
                  {formData.studyParticularities?.trim() ? (
                    <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-900/80 p-2 rounded border border-slate-800 line-clamp-2">
                      Précision : {formData.studyParticularities}
                    </p>
                  ) : null}
                </div>

                {/* Étape 2 : Formations visées en France */}
                <div className="space-y-1.5 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-medium">2. Formations visées en France :</span>
                    <button type="button" onClick={() => setCurrentStep(2)} className="text-[11px] text-cyan-400 hover:underline">Modifier</button>
                  </div>
                  {formData.targetWishes && formData.targetWishes.filter((w) => w.programName.trim() || w.institutionName.trim()).length > 0 ? (
                    <div className="space-y-1.5 mt-1">
                      {formData.targetWishes.filter((w) => w.programName.trim() || w.institutionName.trim()).map((w, idx) => (
                        <div key={w.id} className="text-xs flex items-baseline gap-2">
                          <span className="font-semibold text-cyan-300 shrink-0">Vœu {idx + 1} :</span>
                          <span className="text-white font-medium">{w.programName || 'Formation non précisée'}</span>
                          <span className="text-slate-400 text-[11px]">({w.institutionName || 'Établissement non précisé'})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-white">{formData.targetPrograms || 'Non renseigné'}</p>
                      <p className="text-[11px] text-slate-400">{formData.targetInstitutions || 'Universités non précisées'}</p>
                    </div>
                  )}
                  {formData.reasonsForPrograms?.trim() ? (
                    <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-900/80 p-2 rounded border border-slate-800 line-clamp-2">
                      Motifs du choix : {formData.reasonsForPrograms}
                    </p>
                  ) : null}
                </div>

                {/* Étape 3 : Projet professionnel & Motivations France */}
                <div className="sm:col-span-2 space-y-2 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">3. Projet professionnel & Mobilité :</span>
                    <button type="button" onClick={() => setCurrentStep(3)} className="text-[11px] text-cyan-400 hover:underline">Modifier</button>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-semibold">Projet cible :</span>
                    <p className="font-medium text-white">{formData.professionalGoal || 'Non renseigné'}</p>
                  </div>
                  {formData.reasonFrance?.trim() ? (
                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">Motifs du choix de la France :</span>
                      <p className="text-slate-200">{formData.reasonFrance}</p>
                    </div>
                  ) : null}
                  {formData.strongSkills?.trim() ? (
                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">Compétences clés & expériences notables :</span>
                      <p className="text-slate-300 italic">{formData.strongSkills}</p>
                    </div>
                  ) : null}
                </div>

                {/* Étape 4 : Axes d'entraînement (Optionnel) */}
                {formData.weaknessesToWork?.trim() ? (
                  <div className="sm:col-span-2 space-y-1 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 font-medium">Axes d&apos;entraînement déclarés (Optionnel) :</span>
                    <p className="text-slate-300 italic">{formData.weaknessesToWork}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'actions et navigation */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/60 transition text-sm font-medium w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'fr' ? 'Précédent' : 'Previous'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{language === 'fr' ? 'Sauvegarder le brouillon' : 'Save draft'}</span>
            </button>
          </div>

          <div className="w-full sm:w-auto flex justify-end">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition w-full sm:w-auto"
              >
                <span>{language === 'fr' ? 'Suivant' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'fr' ? 'Enregistrement...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === 'fr' ? 'Valider mon profil académique' : 'Save & Validate Profile'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Modal de confirmation de suppression d'un vœu */}
      {wishToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Supprimer ce vœu ?
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Ce vœu contient déjà des informations (<span className="text-white font-medium">{wishToDelete.programName || 'Formation'}</span>{wishToDelete.institutionName ? ` — ${wishToDelete.institutionName}` : ''}). Êtes-vous sûr de vouloir le supprimer ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWishToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => executeDeleteWish(wishToDelete.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-900/20 transition"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
