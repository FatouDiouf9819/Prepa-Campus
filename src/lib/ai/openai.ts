import OpenAI from 'openai';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn, EvaluationReport, EvaluationCompleteness, JuryPersonality } from '@/types/interview';
import { isTechnicalOrInvalidAnswer } from '@/lib/ai/validation';

let cachedOpenAIClient: OpenAI | null = null;

/**
 * Initialise le client OpenAI côté serveur uniquement (Singleton avec réutilisation des connexions TCP).
 */
export function getOpenAIClient(): OpenAI | null {
  if (cachedOpenAIClient) {
    return cachedOpenAIClient;
  }

  const apiKey = (process.env.TCHAVI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('sk-proj-exemple') || apiKey === '') {
    return null;
  }

  // Support natif de Tchavi (gateway IA par Mobile Money) et des clés officielles OpenAI
  const isTchaviKey = Boolean(process.env.TCHAVI_API_KEY || apiKey.startsWith('tch-') || apiKey.startsWith('sk-tch-'));
  let baseURL = process.env.OPENAI_BASE_URL;

  // Si l'utilisateur utilise une vraie clé OpenAI (sk-proj-...) mais a laissé OPENAI_BASE_URL=tchavi, on ignore le proxy Tchavi
  if (apiKey.startsWith('sk-proj-') && baseURL?.includes('tchavi.com')) {
    baseURL = undefined;
  } else if (!baseURL && isTchaviKey) {
    baseURL = 'https://tchavi.com/api/v1';
  }

  cachedOpenAIClient = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    timeout: 15000,
    maxRetries: 2,
  });

  return cachedOpenAIClient;
}

/**
 * Guide le style et le degré d'exigence de l'examinatrice selon la personnalité choisie.
 */
export function getJuryPromptGuideline(juryPersonality?: JuryPersonality): string {
  switch (juryPersonality) {
    case 'BIENVEILLANT':
      return `POSTURE DE L'EXAMINATRICE : PÉDAGOGUE ET BIENVEILLANTE
- Ton chaleureux, rassurant et encourageant.
- Met le candidat en confiance, valorise ses efforts, reformule avec empathie s'il hésite.
- Pose des questions claires et ouvertes pour l'aider à structurer son parcours.`;
    case 'CRASH_TEST':
      return `POSTURE DE L'EXAMINATRICE : CRASH-TEST / TRÈS EXIGEANTE
- Ton direct, incisif, pointilleux et sans complaisance (style concours sélectif).
- Traque impitoyablement les incohérences, le manque de précision chiffrée, les choix de formations injustifiés ou le flou sur le budget.
- Pousse le candidat dans ses retranchements pour tester sa résistance au stress.`;
    case 'STANDARD':
    default:
      return `POSTURE DE L'EXAMINATRICE : STANDARD / OFFICIELLE CAMPUS FRANCE
- Ton neutre, posé, professionnel et impartial.
- Évalue avec rigueur et équilibre la cohérence du parcours, le réalisme du projet et la maîtrise de l'expression.`;
  }
}

/**
 * Formate les vœux de formations de manière claire pour l'analyse par l'IA.
 */
function formatWishesForPrompt(profile: AcademicProfileData): string {
  if (profile.targetWishes && profile.targetWishes.length > 0) {
    const valid = profile.targetWishes.filter((w) => w.programName.trim() || w.institutionName.trim());
    if (valid.length > 0) {
      return valid.map((w, idx) => `[Vœu ${idx + 1}] Formation : "${w.programName}" | Établissement : "${w.institutionName}"`).join('\n');
    }
  }
  return `Formations : "${profile.targetPrograms}" | Établissements : "${profile.targetInstitutions}"`;
}

function formatAcademicStatus(status?: string): string {
  switch (status) {
    case 'STUDYING':
      return 'Études en cours (formation ou diplôme en préparation)';
    case 'GRADUATED':
      return 'Diplômé(e) (cursus terminé, en transition)';
    case 'EMPLOYED_OR_INTERN':
      return 'En activité professionnelle ou stage';
    case 'GAP_YEAR':
      return 'En césure / interruption d\'études';
    case 'REORIENTATION':
      return 'En cours de réorientation de cursus';
    case 'OTHER':
      return 'Autre situation académique';
    default:
      return 'Étudiant(e)';
  }
}

function formatParticularitiesHint(particularities?: string): string {
  if (!particularities || !particularities.trim()) return '';
  return `- Précision ou particularité sur le parcours déclarée : "${particularities.trim()}" (Consigne bienveillante : aborder ce sujet avec empathie et sans jugement, ne pas considérer un parcours atypique comme une faiblesse)`;
}

function formatCandidateSkillsHint(skills?: string): string {
  if (!skills || !skills.trim()) return '';
  return `- Compétences, expériences ou atouts déclarés : "${skills.trim()}" (Consignes : vous pouvez vous appuyer sur ces éléments pour inviter le candidat à les illustrer concrètement, sans présumer qu'ils sont certifiés et sans inventer d'expérience non mentionnée)`;
}

/**
 * Génère la première question de l'entretien adaptée au profil réel de l'étudiant,
 * à la personnalité de jury sélectionnée et aux axes passés.
 */
export async function generateFirstQuestion(
  profile: AcademicProfileData,
  pastAreasToImprove?: string[],
  pastSessionsQuestions?: string[],
  juryPersonality?: JuryPersonality
): Promise<{
  question: string;
  pedagogicalIntent: string;
}> {
  const openai = getOpenAIClient();

  const weaknessesHint = profile.weaknessesToWork
    ? `Point particulier que le candidat souhaite travailler : "${profile.weaknessesToWork}".`
    : '';
  const historyHint = pastAreasToImprove && pastAreasToImprove.length > 0
    ? `Axes d'amélioration identifiés lors de sa précédente simulation : ${pastAreasToImprove.slice(0, 2).join(', ')}.`
    : '';
  const pastQuestionsHint = pastSessionsQuestions && pastSessionsQuestions.length > 0
    ? `Questions d'ouverture déjà posées lors de ses simulations antérieures (IMPORTANT : NE PAS répéter ces formulations mot pour mot, renouveler la manière d'introduire l'échange) :\n${pastSessionsQuestions.slice(0, 5).map((q) => `- "${q}"`).join('\n')}`
    : '';

  if (!openai) {
    // Mode moteur pédagogique déterministe avec adaptation au type de jury
    if (juryPersonality === 'BIENVEILLANT') {
      return {
        question: `Bonjour et bienvenue. Prenez tout votre temps : pour commencer notre échange en toute confiance, pourriez-vous vous présenter et m'expliquer ce qui vous passionne dans vos études en ${profile.fieldOfStudy || 'votre spécialité'} ?`,
        pedagogicalIntent: 'Mise en confiance initiale et présentation générale bienveillante.',
      };
    }
    if (juryPersonality === 'CRASH_TEST') {
      return {
        question: `Bonjour. Allons droit à l'essentiel : résumez de façon percutante et synthétique votre parcours en ${profile.fieldOfStudy || 'vos études'} et justifiez en quoi votre profil correspond aux exigences de votre projet en France.`,
        pedagogicalIntent: 'Test de synthèse immédiat et justification sous contrainte d\'exigence.',
      };
    }

    const defaultQuestions = [
      `Bonjour. Pour commencer cet entretien, pouvez-vous vous présenter brièvement, m'expliquer votre parcours actuel en ${profile.fieldOfStudy || 'vos études'} et les motivations qui guident votre projet ?`,
      `Bonjour et bienvenue. Pour débuter notre échange, pourriez-vous me résumer les moments clés de vos études en ${profile.fieldOfStudy || 'votre filière'} et ce qui a déclenché votre souhait d'étudier en France ?`,
      `Bonjour. Avant d'aborder vos candidatures spécifiques en France, je vous invite à vous présenter en mettant en avant les points forts de votre parcours en ${profile.fieldOfStudy || 'votre spécialité'}.`,
    ];
    const rotationIndex = (pastSessionsQuestions?.length || 0) % defaultQuestions.length;
    let question = defaultQuestions[rotationIndex];
    if (profile.weaknessesToWork && profile.weaknessesToWork.toLowerCase().includes('parcours')) {
      question = `Bonjour. Pour démarrer notre échange, pouvez-vous me présenter votre parcours académique en ${profile.fieldOfStudy || 'votre spécialité'} et ce qui a motivé vos étapes d'études jusqu'ici ?`;
    }
    return {
      question,
      pedagogicalIntent: 'Vérifier la capacité de synthèse et l\'élocution initiale du candidat.',
    };
  }

  const juryGuideline = getJuryPromptGuideline(juryPersonality);

  const prompt = `Tu es une examinatrice francophone expérimentée pour l'entretien officiel Campus France.
${juryGuideline}

Tu as sous les yeux le dossier réel du candidat :
- Pays de résidence : ${profile.countryResidence}
- Situation académique : ${formatAcademicStatus(profile.academicStatus)}
- Diplôme actuel ou préparé : ${profile.currentDiploma}
- Filière : ${profile.fieldOfStudy}
- Établissement : ${profile.currentInstitution || 'Non précisé'}
${formatParticularitiesHint(profile.studyParticularities)}
- Candidatures visées en France :
${formatWishesForPrompt(profile)}
- Projet professionnel : ${profile.professionalGoal}
${formatCandidateSkillsHint(profile.strongSkills)}
${weaknessesHint}
${historyHint}
${pastQuestionsHint}

CONSIGNES POUR LA VOIX FÉMININE NATURELLE :
1. Pose la TOUTE PREMIÈRE question d'ouverture de l'entretien, en adaptant le ton selon la posture du jury indiquée.
2. S'exprimer dans un français soigné, naturel et posé, avec des virgules et des pauses naturelles.
3. Inviter le candidat à se présenter en lien direct avec sa filière (${profile.fieldOfStudy}).
4. Si un axe d'amélioration antérieur est mentionné ci-dessus, adapter l'accroche pour voir si le candidat a progressé.
5. Une SEULE question principale.
6. Ne JAMAIS inventer d'expérience, d'entreprise ou de diplôme non expressément mentionné dans le dossier ci-dessus.
7. Ne JAMAIS reposer mot pour mot une question d'ouverture déjà posée lors d'un entretien antérieur.

Réponds UNIQUEMENT au format JSON strict :
{
  "question": "Texte exact de la question orale posée avec ponctuation naturelle",
  "pedagogicalIntent": "Objectif pédagogique évalué"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_INTERVIEW || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return {
      question: parsed.question || `Bonjour. Pouvez-vous vous présenter brièvement et détailler votre parcours en ${profile.fieldOfStudy} ?`,
      pedagogicalIntent: parsed.pedagogicalIntent || 'Introduction et élocution.',
    };
  } catch (error) {
    console.error('[OpenAI Error First Question]', error);
    return {
      question: `Bonjour. Pouvez-vous vous présenter brièvement, m'expliquer votre parcours actuel en ${profile.fieldOfStudy} et ce qui vous amène vers ces études ?`,
      pedagogicalIntent: 'Présentation initiale.',
    };
  }
}

export interface AdaptiveTurnResult {
  question: string;
  pedagogicalIntent: string;
  turnType: 'FOLLOWUP' | 'REGULAR' | 'CONCLUSION';
  evaluationStatus: 'ANSWER_ACCEPTED' | 'FOLLOWUP_REQUIRED';
  relevanceCategory: 'PERTINENT_DEVELOPPED' | 'PERTINENT_SHORT' | 'PARTIALLY_PERTINENT' | 'OFF_TOPIC' | 'EMPTY_OR_INAUDIBLE' | 'AMBIGUOUS';
  isConcluding: boolean;
}

/**
 * Analyse la réponse transcrite de l'étudiant et génère le tour suivant :
 * évalue la pertinence de la réponse par rapport à la question posée,
 * déclenche une relance si hors-sujet ou trop floue, ou passe à la suite.
 */
export async function generateAdaptiveTurn(
  profile: AcademicProfileData,
  turnsHistory: InterviewTurn[],
  lastTranscript: string,
  elapsedSeconds: number,
  pastAreasToImprove?: string[],
  pastSessionsQuestions?: string[],
  juryPersonality?: JuryPersonality,
  currentQuestionBeingAnswered?: string
): Promise<AdaptiveTurnResult> {
  const openai = getOpenAIClient();
  const currentTurnIndex = turnsHistory.length + 1;
  const timeRemainingSeconds = Math.max(0, 300 - elapsedSeconds);

  // Clôture automatique si le chronomètre atteint les 5 minutes (ou s'il reste moins de 40s)
  if (timeRemainingSeconds <= 40 || currentTurnIndex >= 7) {
    return {
      question: "Nous arrivons au terme de cet entretien de 5 minutes. Avez-vous un dernier point ou une précision que vous souhaiteriez ajouter pour conclure votre présentation ?",
      pedagogicalIntent: "Conclusion de l'entretien et mot de la fin du candidat.",
      turnType: 'CONCLUSION',
      evaluationStatus: 'ANSWER_ACCEPTED',
      relevanceCategory: 'PERTINENT_DEVELOPPED',
      isConcluding: true,
    };
  }

  const cleanedTranscript = (lastTranscript || '').trim();
  const words = cleanedTranscript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Calcul du nombre de relances consécutives déjà effectuées
  let consecutiveFollowups = 0;
  for (let i = turnsHistory.length - 1; i >= 0; i--) {
    if (turnsHistory[i].turnType === 'FOLLOWUP') {
      consecutiveFollowups++;
    } else {
      break;
    }
  }

  const lastTurn = turnsHistory[turnsHistory.length - 1];
  const lastQuestion = currentQuestionBeingAnswered || lastTurn?.aiQuestion || 'Présentation générale de votre parcours et de votre projet';

  // Liste de toutes les questions déjà posées dans la session pour interdiction absolue de répétition
  const allAskedQuestions = turnsHistory.map((t) => t.aiQuestion?.trim()).filter(Boolean) as string[];
  if (currentQuestionBeingAnswered && !allAskedQuestions.includes(currentQuestionBeingAnswered.trim())) {
    allAskedQuestions.push(currentQuestionBeingAnswered.trim());
  }

  // Mode déterministe hors ligne avec rotation sur les vœux
  if (!openai) {
    const isInvalidOrEmpty = isTechnicalOrInvalidAnswer(cleanedTranscript) || wordCount < 4;
    // 1. Réponse vide, inaudible ou message technique
    if (isInvalidOrEmpty) {
      if (consecutiveFollowups < 2) {
        const question = juryPersonality === 'CRASH_TEST'
          ? "Je ne vous entends pas distinctement. Articulez clairement ou complétez immédiatement par écrit."
          : juryPersonality === 'BIENVEILLANT'
          ? "Je n'ai pas bien perçu votre réponse. Prenez votre temps pour reformuler distinctement ou écrivez-la si besoin."
          : "Je n'ai pas pu entendre votre réponse. Pourriez-vous reprendre votre explication en parlant distinctement ou en saisissant votre réponse au clavier ?";
        return {
          question,
          pedagogicalIntent: "Demander une reformulation suite à une réponse inaudible ou techniquement vide.",
          turnType: 'FOLLOWUP',
          evaluationStatus: 'FOLLOWUP_REQUIRED',
          relevanceCategory: 'EMPTY_OR_INAUDIBLE',
          isConcluding: false,
        };
      }
    }

    // 2. Réponse trop courte ou élusive
    if (wordCount < 12 && consecutiveFollowups < 1) {
      const question = juryPersonality === 'CRASH_TEST'
        ? "Votre réponse est beaucoup trop succincte pour une candidature universitaire. Donnez-moi des éléments factuels précis et vérifiables."
        : juryPersonality === 'BIENVEILLANT'
        ? "C'est un bon début. Pourriez-vous m'en dire un peu plus et illustrer avec un exemple concret de votre parcours ?"
        : "Votre réponse est un peu brève. Pourriez-vous préciser davantage vos arguments et me donner un exemple concret issu de votre expérience ?";
      return {
        question,
        pedagogicalIntent: "Inciter le candidat à approfondir et à étayer son propos.",
        turnType: 'FOLLOWUP',
        evaluationStatus: 'FOLLOWUP_REQUIRED',
        relevanceCategory: 'PARTIALLY_PERTINENT',
        isConcluding: false,
      };
    }

    // 3. Question suivante selon le cycle thématique avec rotation sur les vœux
    const wishCount = profile.targetWishes && profile.targetWishes.length > 0 ? profile.targetWishes.length : 1;
    const wishIndex = ((pastSessionsQuestions?.length || 0) + (currentTurnIndex - 2)) % wishCount;
    const selectedWish = profile.targetWishes?.[wishIndex];
    const progText = selectedWish?.programName || profile.targetPrograms;
    const instText = selectedWish?.institutionName || profile.targetInstitutions;

    if (currentTurnIndex === 2 || (currentTurnIndex === 3 && consecutiveFollowups > 0)) {
      return {
        question: `Vous candidatez pour ${progText}. Pourquoi avez-vous sélectionné cette formation précise, et en quoi s'inscrit-elle dans la continuité de votre diplôme ?`,
        pedagogicalIntent: "Vérifier la justification académique des vœux formulés.",
        turnType: 'REGULAR',
        evaluationStatus: 'ANSWER_ACCEPTED',
        relevanceCategory: 'PERTINENT_DEVELOPPED',
        isConcluding: false,
      };
    }

    if (currentTurnIndex === 3 || currentTurnIndex === 4) {
      return {
        question: `Vous visez l'établissement suivant : ${instText}. Qu'est-ce qui a motivé ce choix plutôt qu'une autre université ou école ?`,
        pedagogicalIntent: "Évaluer la recherche documentaire et la pertinence du choix des universités.",
        turnType: 'REGULAR',
        evaluationStatus: 'ANSWER_ACCEPTED',
        relevanceCategory: 'PERTINENT_DEVELOPPED',
        isConcluding: false,
      };
    }

    return {
      question: `Parlons maintenant de votre projet professionnel. Vous visez l'objectif suivant : "${profile.professionalGoal}". Comment cette formation en France vous permettra-t-elle concrètement d'atteindre ce métier ?`,
      pedagogicalIntent: "Évaluer la cohérence entre le diplôme visé et l'insertion professionnelle.",
      turnType: 'REGULAR',
      evaluationStatus: 'ANSWER_ACCEPTED',
      relevanceCategory: 'PERTINENT_DEVELOPPED',
      isConcluding: false,
    };
  }

  // Moteur adaptatif avec IA OpenAI
  const pastIssuesText = pastAreasToImprove && pastAreasToImprove.length > 0
    ? `Points prioritaires à travailler identifiés lors des bilans passés : ${pastAreasToImprove.join(' ; ')}. (Consigne pédagogique : si l'étudiant a progressé sur ces aspects, valorisez-le avec bienveillance ; sinon, challengez-le subtilement sans le déstabiliser).`
    : '';

  const pastQuestionsText = pastSessionsQuestions && pastSessionsQuestions.length > 0
    ? `Questions déjà posées lors de ses simulations antérieures (INTERDICTION STRICTE DE LES RÉPÉTER MOT POUR MOT, explorer de nouveaux angles ou d'autres vœux) :\n${pastSessionsQuestions.slice(0, 10).map((q) => `- "${q}"`).join('\n')}`
    : '';

  const juryGuideline = getJuryPromptGuideline(juryPersonality);

  const prompt = `Tu es une examinatrice francophone expérimentée pour l'entretien officiel Campus France.
${juryGuideline}
Tu mènes un entretien de 5 minutes chrono (temps restant : ${timeRemainingSeconds} secondes).

Profil réel du candidat :
- Situation académique : ${formatAcademicStatus(profile.academicStatus)}
- Diplôme actuel ou préparé : ${profile.currentDiploma} (${profile.fieldOfStudy})
${formatParticularitiesHint(profile.studyParticularities)}
- Candidatures et vœux en France :
${formatWishesForPrompt(profile)}
- Projet professionnel : ${profile.professionalGoal}
- Motivations France : ${profile.reasonFrance}
${formatCandidateSkillsHint(profile.strongSkills)}
- Difficultés déclarées : ${profile.weaknessesToWork || 'Non renseigné'}
${pastIssuesText}
${pastQuestionsText}

QUESTIONS DÉJÀ POSÉES DANS CETTE SESSION (INTERDICTION ABSOLUE DE LES RÉPÉTER OU DE LES REFORMULER) :
${allAskedQuestions.map((q, idx) => `[Question ${idx + 1}] "${q}"`).join('\n')}

Dernière question à laquelle le candidat vient de répondre :
"${lastQuestion}"

Dernière réponse transcrite du candidat :
"${cleanedTranscript}" (Nombre de mots : ${wordCount})

Nombre de relances consécutives déjà faites sur ce même point : ${consecutiveFollowups}

ÉVALUATION DE LA PERTINENCE :
1. Catégories possibles pour relevanceCategory :
   - "PERTINENT_DEVELOPPED" : Répond précisément à la question avec des arguments solides.
   - "PERTINENT_SHORT" : Répond clairement au fond de la question, même si la réponse est courte.
   - "PARTIALLY_PERTINENT" : Reste vague ou n'aborde qu'une partie de la question.
   - "OFF_TOPIC" : Parle d'autre chose, élude la question ou digresse sans répondre.
   - "EMPTY_OR_INAUDIBLE" : Moins de 4 mots significatifs, bruit, message technique ou absence de réponse.
   - "AMBIGUOUS" : Contradiction patente entre la réponse et le dossier.

RÈGLES D'ADAPTATION DE L'EXAMINATRICE :
- Si (relevanceCategory === "OFF_TOPIC" ou "EMPTY_OR_INAUDIBLE" ou "PARTIALLY_PERTINENT") ET (consecutiveFollowups < 2) :
  * evaluationStatus = "FOLLOWUP_REQUIRED"
  * turnType = "FOLLOWUP"
  * Formuler UNE SEULE relance ciblée bienveillante pour creuser ou recadrer la question.
- Si consecutiveFollowups >= 2 :
  * Ne pas bloquer l'entretien ! Indiquer avec tact que ce point sera à approfondir, et passer au thème suivant :
  * evaluationStatus = "ANSWER_ACCEPTED"
  * turnType = "REGULAR"
- Sinon (réponse pertinente) :
  * evaluationStatus = "ANSWER_ACCEPTED"
  * turnType = "REGULAR"
  * Poser une NOUVELLE question différente parmi : les modules spécifiques du semestre, le projet professionnel et débouchés concrets, pourquoi la France et pas un autre pays, le financement du séjour, les stages prévus.

IMPORTANT :
- Une SEULE question à la fois.
- Français fluide, naturel, avec une ponctuation soignée (virgules, intonations) adaptée à une voix féminine posée.
- RÈGLE ABSOLUE ANTI-RÉPÉTITION : Ne repose JAMAIS la même question ni une question similaire à celles déjà posées ci-dessus. Explore un NOUVEL angle thématique différent.
- GESTION BIENVEILLANTE DU TEMPS DE PAROLE : Un court temps de réflexion (quelques secondes) ou des pauses posées entre deux phrases sont tout à fait normaux lors d'un entretien oral. Ne qualifie JAMAIS ces pauses d'hésitation ou de faiblesse si le fond de la réponse est constructif. Seules les réponses complètement vides, muettes ou hors-sujet font l'objet d'une relance.

Format JSON strict :
{
  "question": "Texte exact de la question ou de la relance",
  "pedagogicalIntent": "Objectif pédagogique testé",
  "turnType": "FOLLOWUP" ou "REGULAR",
  "evaluationStatus": "FOLLOWUP_REQUIRED" ou "ANSWER_ACCEPTED",
  "relevanceCategory": "PERTINENT_DEVELOPPED" | "PERTINENT_SHORT" | "PARTIALLY_PERTINENT" | "OFF_TOPIC" | "EMPTY_OR_INAUDIBLE" | "AMBIGUOUS",
  "isConcluding": false
}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_INTERVIEW || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const turnType = parsed.turnType === 'FOLLOWUP' ? 'FOLLOWUP' : 'REGULAR';
    const evaluationStatus = parsed.evaluationStatus === 'FOLLOWUP_REQUIRED' ? 'FOLLOWUP_REQUIRED' : 'ANSWER_ACCEPTED';

    return {
      question: parsed.question,
      pedagogicalIntent: parsed.pedagogicalIntent || 'Évaluation adaptative',
      turnType,
      evaluationStatus,
      relevanceCategory: parsed.relevanceCategory || 'PERTINENT_DEVELOPPED',
      isConcluding: false,
    };
  } catch (err) {
    console.error('[OpenAI Error Adaptive Turn]', err);
    return {
      question: `Pouvez-vous m'expliquer plus en détail comment vos vœux pour ${profile.targetPrograms} s'articulent avec votre projet de carrière ?`,
      pedagogicalIntent: 'Cohérence formation et projet professionnel.',
      turnType: 'REGULAR',
      evaluationStatus: 'ANSWER_ACCEPTED',
      relevanceCategory: 'PERTINENT_DEVELOPPED',
      isConcluding: false,
    };
  }
}

/**
 * Génère le rapport final pédagogique d'évaluation à partir des transcriptions réelles.
 * RÈGLE ABSOLUE :
 * 1. Aucun message technique ("Réponse enregistrée avec succès.", statut, etc.) ne peut figurer comme réponse ou citation.
 * 2. Si aucune réponse valide n'existe, l'évaluation est déclarée "UNAVAILABLE" avec explication déontologique sans note fictive.
 * 3. Le score global correspond rigoureusement à la somme exacte des 5 critères.
 */
export async function generateEvaluationReport(
  profile: AcademicProfileData,
  turns: InterviewTurn[]
): Promise<EvaluationReport> {
  const openai = getOpenAIClient();

  // Filtrage strict : éliminer les réponses vides et les messages techniques
  const validAcademicTurns = turns.filter(
    (t) => t.studentTranscript && !isTechnicalOrInvalidAnswer(t.studentTranscript)
  );

  // Cas 1 : Aucune réponse exploitable (problème technique, micro muet ou silence)
  if (validAcademicTurns.length === 0) {
    return {
      id: `report_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
      overallScore: 0,
      evaluationCompleteness: 'UNAVAILABLE',
      isTechnicalIssue: true,
      evaluationGridVersion: 'v1.0.0',
      createdAt: new Date().toISOString(),
      synthesisSummary:
        "Données orales insuffisantes (évaluation indisponible) : aucune prise de parole exploitable n'a été enregistrée durant cette simulation. Ce résultat est lié à une absence de réponse orale ou à un problème de capture du microphone, et ne constitue en aucun cas une évaluation de vos compétences académiques. Nous vous invitons à relancer une simulation en vérifiant l'autorisation de votre microphone ou en utilisant le mode secours clavier.",
      scoresByCriteria: [
        { name: 'parcours', label: 'Cohérence du parcours académique', score: 0, maxScore: 20, comment: 'Données orales insuffisantes.' },
        { name: 'formations', label: 'Justification des vœux et formations', score: 0, maxScore: 25, comment: 'Données orales insuffisantes.' },
        { name: 'projet_pro', label: 'Solidité du projet professionnel', score: 0, maxScore: 25, comment: 'Données orales insuffisantes.' },
        { name: 'argumentation', label: 'Capacité d\'argumentation sous relance', score: 0, maxScore: 20, comment: 'Données orales insuffisantes.' },
        { name: 'elocution', label: 'Clarté de l\'expression et structure', score: 0, maxScore: 10, comment: 'Données orales insuffisantes.' },
      ],
      strengths: [],
      areasToImprove: [
        {
          criterion: 'Prise de parole',
          verbatimQuote: 'Données orales non exploitables',
          feedback: 'Activez votre microphone et parlez distinctement, ou utilisez le mode secours clavier pour formuler vos réponses lors de votre prochain entraînement.',
        },
      ],
      reformulationExamples: [],
      revisionTopics: [
        'Vérifier l\'autorisation du microphone dans votre navigateur avant de démarrer',
        'Préparer votre présentation personnelle en 1 minute',
        'S\'entraîner à voix haute face à votre écran avant la prochaine session',
      ],
    };
  }

  const isPartial = validAcademicTurns.length < turns.length;
  const evaluationCompleteness: EvaluationCompleteness = isPartial ? 'PARTIAL' : 'COMPLETE';

  // Mode déterministe fondé rigoureusement sur les critères officiels et les propos réels
  const computeDeterministicReport = (): EvaluationReport => {
    const totalWords = validAcademicTurns.reduce(
      (sum, t) => sum + t.studentTranscript.split(/\s+/).filter(Boolean).length,
      0
    );
    const avgWords = totalWords / validAcademicTurns.length;
    const allTranscriptsText = validAcademicTurns.map((t) => t.studentTranscript).join(' ').toLowerCase();

    // Détection dynamique de pertinence et vocabulaire académique
    const mentionsProgram = profile.targetPrograms
      ? allTranscriptsText.includes(profile.targetPrograms.toLowerCase().slice(0, 10))
      : false;
    const mentionsProGoal = profile.professionalGoal
      ? allTranscriptsText.includes(profile.professionalGoal.toLowerCase().slice(0, 8))
      : false;
    const hasAcademicKeywords = /master|licence|ingénieur|cours|semestre|stage|compétence|projet|débouché|métier|carrière|université/i.test(
      allTranscriptsText
    );

    // Critère 1 : Parcours académique (max 20) — varie selon la consistance de la présentation
    let parcoursScore = 12;
    if (validAcademicTurns[0]?.studentTranscript.length > 70) parcoursScore += 4;
    else if (validAcademicTurns[0]?.studentTranscript.length > 30) parcoursScore += 2;
    if (hasAcademicKeywords) parcoursScore += 2;
    if (validAcademicTurns[0]?.studentTranscript.length < 25) parcoursScore -= 3;
    parcoursScore = Math.min(20, Math.max(6, parcoursScore));

    // Critère 2 : Justification des formations (max 25) — varie selon la précision des cours
    let formationsScore = 14;
    if (avgWords >= 22) formationsScore += 5;
    else if (avgWords >= 12) formationsScore += 2;
    else formationsScore -= 3;
    if (mentionsProgram) formationsScore += 4;
    formationsScore = Math.min(25, Math.max(7, formationsScore));

    // Critère 3 : Solidité du projet professionnel (max 25) — varie selon l'adéquation métier
    let projetProScore = 15;
    if (mentionsProGoal) projetProScore += 5;
    if (profile.professionalGoal.length > 25 && allTranscriptsText.length > 80) projetProScore += 2;
    if (avgWords < 10) projetProScore -= 4;
    projetProScore = Math.min(25, Math.max(7, projetProScore));

    // Critère 4 : Argumentation sous relance (max 20) — varie selon la réactivité
    let argumentationScore = 11;
    if (validAcademicTurns.length >= 3 && avgWords >= 18) argumentationScore += 5;
    else if (validAcademicTurns.length >= 2 && avgWords >= 10) argumentationScore += 2;
    else argumentationScore -= 2;
    argumentationScore = Math.min(20, Math.max(5, argumentationScore));

    // Critère 5 : Élocution et structure (max 10) — varie selon l'aisance
    let elocutionScore = 5;
    if (avgWords >= 15) elocutionScore += 2;
    if (validAcademicTurns.length >= 2) elocutionScore += 1;
    if (allTranscriptsText.length > 120) elocutionScore += 1;
    elocutionScore = Math.min(10, Math.max(3, elocutionScore));

    const calculatedTotal = parcoursScore + formationsScore + projetProScore + argumentationScore + elocutionScore;
    const firstTranscript = validAcademicTurns[0].studentTranscript;
    const lastTranscript = validAcademicTurns[validAcademicTurns.length - 1].studentTranscript;

    const partialNote = isPartial
      ? ` Note : Évaluation partielle basée sur ${validAcademicTurns.length} réponse(s) exploitable(s) sur ${turns.length} tour(s).`
      : '';

    return {
      id: `report_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
      overallScore: calculatedTotal,
      evaluationCompleteness,
      isTechnicalIssue: false,
      evaluationGridVersion: 'v1.0.0',
      createdAt: new Date().toISOString(),
      synthesisSummary: `Entretien de préparation de 5 minutes complété avec ${validAcademicTurns.length} réponse(s) enregistrée(s). Vous avez présenté votre profil en ${profile.fieldOfStudy} pour les formations ${profile.targetPrograms}. Vos réponses reflètent une motivation réelle qui peut être encore renforcée par des exemples précis lors des relances.${partialNote}`,
      scoresByCriteria: [
        {
          name: 'parcours',
          label: 'Cohérence du parcours académique',
          score: parcoursScore,
          maxScore: 20,
          comment: 'Présentation de votre parcours avec lien vers vos études en France.',
        },
        {
          name: 'formations',
          label: 'Justification des vœux et formations',
          score: formationsScore,
          maxScore: 25,
          comment: 'Connaissance des formations visées ; précisez les matières clés du semestre.',
        },
        {
          name: 'projet_pro',
          label: 'Solidité du projet professionnel',
          score: projetProScore,
          maxScore: 25,
          comment: 'Objectif professionnel identifié en cohérence avec les études visées.',
        },
        {
          name: 'argumentation',
          label: 'Capacité d\'argumentation sous relance',
          score: argumentationScore,
          maxScore: 20,
          comment: 'Effort d\'approfondissement ; veillez à donner des exemples concrets.',
        },
        {
          name: 'elocution',
          label: 'Clarté de l\'expression et structure',
          score: elocutionScore,
          maxScore: 10,
          comment: 'Expression compréhensible et respect du cadre temporel.',
        },
      ],
      strengths: [
        {
          criterion: 'Cohérence du parcours',
          verbatimQuote: firstTranscript.slice(0, 120),
          feedback: 'Présentation posée de votre situation démontrant un fil conducteur logique.',
        },
      ],
      areasToImprove: [
        {
          criterion: 'Précision sous relance',
          verbatimQuote: lastTranscript.slice(0, 120),
          feedback: 'Citez des unités d\'enseignement spécifiques et des compétences concrètes lors des relances.',
          suggestedReformulation: `Mon choix pour ${profile.targetPrograms} repose sur les modules pratiques qui répondent directement à mon projet de ${profile.professionalGoal}.`,
        },
      ],
      reformulationExamples: [
        {
          originalContext: 'Choix des études en France',
          studentQuote: firstTranscript.slice(0, 80),
          recommendedAnswer: `En France, les enseignements en ${profile.fieldOfStudy} associent théorie avancée et stages professionnalisants indispensables pour mon objectif.`,
          explanation: 'Remplacer une formule générale par un argument académique ciblé.',
        },
      ],
      revisionTopics: [
        'Relire la maquette pédagogique du premier semestre de vos formations visées',
        'Formuler en une phrase claire votre métier cible à l\'horizon 3 ans',
        'Préparer deux arguments distincts sur le choix de chaque ville ou université',
      ],
    };
  };

  // Si OpenAI n'est pas initialisé, calcul déterministe immédiat
  if (!openai) {
    return computeDeterministicReport();
  }

  const prompt = `Tu es l'évaluateur en chef officiel des entretiens Campus France.
Tu produis le BILAN PÉDAGOGIQUE de l'entraînement du candidat.

Dossier réel du candidat :
- Situation académique : ${formatAcademicStatus(profile.academicStatus)}
- Diplôme actuel ou préparé : ${profile.currentDiploma} (${profile.fieldOfStudy})
${formatParticularitiesHint(profile.studyParticularities)}
- Candidatures et vœux ciblés :
${formatWishesForPrompt(profile)}
- Projet professionnel : ${profile.professionalGoal}
- Motivations France : ${profile.reasonFrance}
${formatCandidateSkillsHint(profile.strongSkills)}

Transcriptions réelles des échanges oraux enregistrés :
${validAcademicTurns.map((t, idx) => `[Tour ${idx + 1} - ${t.turnType}]\nExaminatrice: "${t.aiQuestion}"\nCandidat: "${t.studentTranscript}"`).join('\n\n')}

CONSIGNES STRICTES D'ÉVALUATION ET DE NOTATION RÉELLE :
1. Chaque citation verbatim ("verbatimQuote") DOIT OBLIGATOIREMENT être extraite textuellement des propos réels du candidat ci-dessus.
2. Ne JAMAIS citer de message technique ou d'accusé de réception.
3. BARÈME ET NOTES RÉELLES :
   - Calcule des notes qui reflètent FIDÈLEMENT la qualité, la clarté et la pertinence des réponses du candidat.
   - Ne copie JAMAIS de notes fixes ou stéréotypées.
   - Si la prestation est riche, fluide et argumentée : note élevée (80 à 95 / 100).
   - Si la prestation est moyenne ou générale : note intermédiaire (60 à 78 / 100).
   - Si les réponses sont très courtes, vagues ou hésitantes : note basse (35 à 59 / 100).
   - Plafonds stricts par critère :
     * parcours : entier entre 0 et 20
     * formations : entier entre 0 et 25
     * projet_pro : entier entre 0 et 25
     * argumentation : entier entre 0 et 20
     * elocution : entier entre 0 et 10
4. Le score global ("overallScore") DOIT ÊTRE STRICTEMENT ÉGAL à la somme des 5 notes ci-dessus. Aucun score fictif !
5. Proposer des reformulations concrètes ("recommendedAnswer") adaptées au dossier.

Format JSON strict :
{
  "scoresByCriteria": [
    {"name": "parcours", "label": "Cohérence du parcours académique", "score": 14, "maxScore": 20, "comment": "Analyse personnalisée du parcours..."},
    {"name": "formations", "label": "Justification des vœux et formations", "score": 19, "maxScore": 25, "comment": "Analyse personnalisée des vœux..."},
    {"name": "projet_pro", "label": "Solidité du projet professionnel", "score": 17, "maxScore": 25, "comment": "Analyse personnalisée du projet..."},
    {"name": "argumentation", "label": "Capacité d'argumentation sous relance", "score": 13, "maxScore": 20, "comment": "Analyse personnalisée sous relance..."},
    {"name": "elocution", "label": "Clarté de l'expression et structure", "score": 8, "maxScore": 10, "comment": "Analyse personnalisée de l'élocution..."}
  ],
  "synthesisSummary": "Synthèse personnalisée, bienveillante et constructive...",
  "strengths": [
    {"criterion": "...", "verbatimQuote": "citation réelle...", "feedback": "pourquoi c'est pertinent"}
  ],
  "areasToImprove": [
    {"criterion": "...", "verbatimQuote": "citation réelle...", "feedback": "ce qui manquait", "suggestedReformulation": "exemple concret de ce qu'il fallait dire"}
  ],
  "reformulationExamples": [
    {"originalContext": "...", "studentQuote": "citation...", "recommendedAnswer": "...", "explanation": "..."}
  ],
  "revisionTopics": [
    "Conseil précis 1",
    "Conseil précis 2",
    "Conseil précis 3"
  ]
}

Attention : Les nombres de score dans l'exemple ci-dessus ne sont que des illustrations de format. Tu dois impérativement calculer les vraies notes correspondant aux réponses effectives du candidat !`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_REPORT || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    const criteria = parsed.scoresByCriteria || [];

    // Nettoyage et assainissement des citations du modèle
    const sanitizedStrengths = (parsed.strengths || []).filter(
      (s: { verbatimQuote?: string }) => !isTechnicalOrInvalidAnswer(s.verbatimQuote)
    );
    const sanitizedAreasToImprove = (parsed.areasToImprove || []).filter(
      (a: { verbatimQuote?: string }) => !isTechnicalOrInvalidAnswer(a.verbatimQuote)
    );
    const sanitizedReformulations = (parsed.reformulationExamples || []).filter(
      (r: { studentQuote?: string }) => !isTechnicalOrInvalidAnswer(r.studentQuote)
    );
    
    // Calcul strict et non arbitraire de la somme réelle
    const sumScores = criteria.reduce((sum: number, c: { score?: number }) => sum + (Number(c.score) || 0), 0);
    const overallScore = sumScores;

    return {
      id: `report_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
      overallScore,
      evaluationCompleteness,
      isTechnicalIssue: false,
      scoresByCriteria: criteria,
      strengths: sanitizedStrengths,
      areasToImprove: sanitizedAreasToImprove,
      reformulationExamples: sanitizedReformulations,
      revisionTopics: parsed.revisionTopics || [],
      synthesisSummary: parsed.synthesisSummary || 'Simulation complétée.',
      evaluationGridVersion: 'v1.0.0',
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[OpenAI Error Report Generation, falling back to deterministic evaluation]', err);
    // En cas d'indisponibilité momentanée ou de crédits épuisés, fallback déterministe rigoureux
    return computeDeterministicReport();
  }
}

