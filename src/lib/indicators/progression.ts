/**
 * Module centralisé de calcul d'indicateurs et de progression pour Campus France Prépa.
 * RÈGLE FONDAMENTALE : Aucun chiffre inventé, aucun pourcentage fictif, aucune fausse progression.
 * Tout indicateur doit découler strictement de données réelles, enregistrées et vérifiables.
 */

export interface EvaluationRecord {
  id: string;
  overall_score?: number | null;
  overallScore?: number | null;
  created_at?: string;
  createdAt?: string;
  synthesis_summary?: string;
  synthesisSummary?: string;
  evaluation_completeness?: string | null;
  evaluationCompleteness?: string | null;
  is_technical_issue?: boolean | null;
  isTechnicalIssue?: boolean | null;
  scores_by_criteria?: Array<{
    name: string;
    label: string;
    score: number;
    maxScore?: number;
    max_score?: number;
    comment?: string;
  }>;
  scoresByCriteria?: Array<{
    name: string;
    label: string;
    score: number;
    maxScore?: number;
    max_score?: number;
    comment?: string;
  }>;
  strengths?: Array<{
    criterion?: string;
    verbatimQuote?: string;
    verbatim_quote?: string;
    feedback?: string;
    suggestedReformulation?: string;
  }>;
  areas_to_improve?: Array<{
    criterion?: string;
    verbatimQuote?: string;
    verbatim_quote?: string;
    feedback?: string;
    suggestedReformulation?: string;
  }>;
  areasToImprove?: Array<{
    criterion?: string;
    verbatimQuote?: string;
    verbatim_quote?: string;
    feedback?: string;
    suggestedReformulation?: string;
  }>;
  reformulation_examples?: Array<{
    originalContext?: string;
    studentQuote?: string;
    recommendedAnswer?: string;
    explanation?: string;
  }>;
  reformulationExamples?: Array<{
    originalContext?: string;
    studentQuote?: string;
    recommendedAnswer?: string;
    explanation?: string;
  }>;
  revision_topics?: string[];
  revisionTopics?: string[];
}

export interface SessionRecord {
  id: string;
  status: string;
  duration_seconds?: number;
  durationSeconds?: number;
  started_at?: string;
  startedAt?: string;
  created_at?: string;
  createdAt?: string;
  ended_at?: string;
  endedAt?: string;
  evaluation_reports?: EvaluationRecord[];
}

export interface ProgressionMetrics {
  hasSufficientData: boolean;
  sessionsCount: number;
  evaluatedSessionsCount: number;
  latestScore: number | null;
  previousScore: number | null;
  diff: number | null;
  progressionLabel: string | null;
  status: 'NO_SESSIONS' | 'SINGLE_SESSION' | 'PROGRESSION_AVAILABLE' | 'INSUFFICIENT_DATA';
}

export interface TimelinePoint {
  sessionId: string;
  reportId: string;
  date: string;
  formattedDate: string;
  score: number;
  synthesisSummary?: string;
  index: number;
}

export interface GlobalProgressionStats {
  totalSessions: number;
  completedSessions: number;
  evaluatedSessions: number;
  initialScore: number | null;
  latestScore: number | null;
  highestScore: number | null;
  averageScore: number | null;
  totalProgression: number | null; // latest - initial
}

export interface CriterionComparisonItem {
  name: string;
  label: string;
  scoreA: number | null;
  scoreB: number | null;
  maxScore: number;
  diff: number | null; // scoreB - scoreA
}

export interface SessionComparisonResult {
  sessionA: {
    id: string;
    date: string;
    score: number | null;
    duration: number;
    summary?: string;
  };
  sessionB: {
    id: string;
    date: string;
    score: number | null;
    duration: number;
    summary?: string;
  };
  scoreDiff: number | null; // B - A
  criteria: CriterionComparisonItem[];
  strengthsB: Array<{ criterion?: string; verbatimQuote?: string; feedback?: string }>;
  areasToImproveB: Array<{ criterion?: string; verbatimQuote?: string; feedback?: string }>;
  reformulationsB: Array<{ studentQuote?: string; recommendedAnswer?: string; explanation?: string }>;
}

export interface RevisionMemo {
  evaluatedCount: number;
  latestScore: number | null;
  highestScore: number | null;
  averageScore: number | null;
  strengths: Array<{ criterion: string; quote: string; comment: string }>;
  areasToImprove: Array<{ criterion: string; quote: string; comment: string }>;
  topReformulations: Array<{ quote: string; recommended: string; explanation: string }>;
  recommendedTopics: string[];
}

/**
 * Détermine l'état de complétude d'une évaluation pour garantir qu'aucune session
 * technique ou interrompue ne soit traitée comme une note académique de zéro.
 */
export function inferEvaluationCompleteness(
  record?: {
    overall_score?: number | null;
    overallScore?: number | null;
    synthesis_summary?: string | null;
    synthesisSummary?: string | null;
    evaluation_completeness?: string | null;
    evaluationCompleteness?: string | null;
    is_technical_issue?: boolean | null;
    isTechnicalIssue?: boolean | null;
  } | null
): 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' {
  if (!record) return 'UNAVAILABLE';

  // 1. Valeur explicite si renseignée
  const explicit = record.evaluationCompleteness || record.evaluation_completeness;
  if (explicit === 'UNAVAILABLE' || explicit === 'PARTIAL' || explicit === 'COMPLETE') {
    return explicit;
  }

  // 2. Incident technique flagué
  const isTech = record.isTechnicalIssue ?? record.is_technical_issue;
  if (isTech === true) {
    return 'UNAVAILABLE';
  }

  const rawScore = record.overallScore !== undefined ? record.overallScore : record.overall_score;
  const summary = (record.synthesisSummary || record.synthesis_summary || '').toLowerCase();

  // 3. Détection des marqueurs de session indisponible ou incident technique
  const hasTechnicalMarkers =
    summary.includes('données orales insuffisantes') ||
    summary.includes('évaluation indisponible') ||
    summary.includes('aucune prise de parole') ||
    summary.includes('incident technique') ||
    summary.includes('microphone');

  if (rawScore === 0 || hasTechnicalMarkers) {
    return 'UNAVAILABLE';
  }

  if (summary.includes('évaluation partielle') || summary.includes('partielle')) {
    return 'PARTIAL';
  }

  return 'COMPLETE';
}

/**
 * Calcule la progression réelle entre les deux dernières simulations valides.
 * Exclut toute session technique ou incomplète afin de ne produire aucun résultat faussé.
 */
export function calculateRealProgression(sessions: SessionRecord[] = []): ProgressionMetrics {
  const sessionsCount = sessions.length;

  if (sessionsCount === 0) {
    return {
      hasSufficientData: false,
      sessionsCount: 0,
      evaluatedSessionsCount: 0,
      latestScore: null,
      previousScore: null,
      diff: null,
      progressionLabel: null,
      status: 'NO_SESSIONS',
    };
  }

  // Extraire uniquement les évaluations pédagogiquement valides (exclut UNAVAILABLE)
  const validEvaluations: { score: number; date: string; id: string }[] = [];

  for (const session of sessions) {
    const reports = session.evaluation_reports;
    if (reports && Array.isArray(reports) && reports.length > 0) {
      for (const rep of reports) {
        // Exclure rigoureusement les sessions indisponibles ou interrompues
        const completeness = inferEvaluationCompleteness(rep);
        if (completeness === 'UNAVAILABLE') {
          continue;
        }

        const rawScore = rep.overall_score !== undefined ? rep.overall_score : rep.overallScore;
        if (typeof rawScore === 'number' && !isNaN(rawScore) && rawScore >= 0 && rawScore <= 100) {
          validEvaluations.push({
            score: Math.round(rawScore),
            date: rep.created_at || rep.createdAt || session.started_at || new Date().toISOString(),
            id: rep.id,
          });
        }
      }
    }
  }

  // Si aucun rapport valide n'est présent
  if (validEvaluations.length === 0) {
    return {
      hasSufficientData: false,
      sessionsCount,
      evaluatedSessionsCount: 0,
      latestScore: null,
      previousScore: null,
      diff: null,
      progressionLabel: 'Données insuffisantes',
      status: 'INSUFFICIENT_DATA',
    };
  }

  // 1 seul rapport disponible : score réel sans progression simulée
  if (validEvaluations.length === 1) {
    return {
      hasSufficientData: true,
      sessionsCount,
      evaluatedSessionsCount: 1,
      latestScore: validEvaluations[0].score,
      previousScore: null,
      diff: null,
      progressionLabel: null, // Pas de variation à afficher
      status: 'SINGLE_SESSION',
    };
  }

  // 2 rapports ou plus : calcul de la différence réelle
  const latest = validEvaluations[0].score;
  const previous = validEvaluations[1].score;
  const diff = latest - previous;

  let progressionLabel = 'Score stable';
  if (diff > 0) {
    progressionLabel = `+${diff} pts`;
  } else if (diff < 0) {
    progressionLabel = `${diff} pts`;
  }

  return {
    hasSufficientData: true,
    sessionsCount,
    evaluatedSessionsCount: validEvaluations.length,
    latestScore: latest,
    previousScore: previous,
    diff,
    progressionLabel,
    status: 'PROGRESSION_AVAILABLE',
  };
}

/**
 * Extrait les points de progression chronologiques (du plus ancien au plus récent)
 * pour tracer la courbe de progression visuelle.
 */
export function getTimelineData(sessions: SessionRecord[] = []): TimelinePoint[] {
  const points: TimelinePoint[] = [];

  for (const session of sessions) {
    const report = session.evaluation_reports?.[0];
    if (!report) continue;

    const completeness = inferEvaluationCompleteness(report);
    if (completeness === 'UNAVAILABLE') continue;

    const rawScore = report.overall_score !== undefined ? report.overall_score : report.overallScore;
    if (typeof rawScore !== 'number' || isNaN(rawScore) || rawScore < 0 || rawScore > 100) continue;

    const dateStr = report.created_at || report.createdAt || session.started_at || session.startedAt || new Date().toISOString();
    let formattedDate = 'Simulation';
    try {
      const d = new Date(dateStr);
      formattedDate = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      // fallback
    }

    points.push({
      sessionId: session.id,
      reportId: report.id,
      date: dateStr,
      formattedDate,
      score: Math.round(rawScore),
      synthesisSummary: report.synthesis_summary || report.synthesisSummary,
      index: 0,
    });
  }

  // Trier du plus ancien au plus récent pour l'abscisse temporelle
  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Assigner l'index séquentiel (Simulation 1, Simulation 2, etc.)
  return points.map((p, idx) => ({ ...p, index: idx + 1 }));
}

/**
 * Calcule l'ensemble des métriques globales de l'étudiant pour le tableau de bord de progression.
 */
export function getGlobalProgressionStats(sessions: SessionRecord[] = []): GlobalProgressionStats {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
  const timeline = getTimelineData(sessions);
  const evaluatedSessions = timeline.length;

  if (evaluatedSessions === 0) {
    return {
      totalSessions,
      completedSessions,
      evaluatedSessions: 0,
      initialScore: null,
      latestScore: null,
      highestScore: null,
      averageScore: null,
      totalProgression: null,
    };
  }

  const initialScore = timeline[0].score;
  const latestScore = timeline[timeline.length - 1].score;
  const highestScore = Math.max(...timeline.map((t) => t.score));
  const sumScores = timeline.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = Math.round(sumScores / evaluatedSessions);
  const totalProgression = evaluatedSessions > 1 ? latestScore - initialScore : 0;

  return {
    totalSessions,
    completedSessions,
    evaluatedSessions,
    initialScore,
    latestScore,
    highestScore,
    averageScore,
    totalProgression,
  };
}

/**
 * Compare deux simulations pédagogiques (Session A vs Session B) critère par critère.
 */
export function compareTwoSessions(
  sessionA: SessionRecord,
  sessionB: SessionRecord
): SessionComparisonResult {
  const repA = sessionA.evaluation_reports?.[0];
  const repB = sessionB.evaluation_reports?.[0];

  const scoreA =
    repA && inferEvaluationCompleteness(repA) !== 'UNAVAILABLE'
      ? Math.round(repA.overall_score ?? repA.overallScore ?? 0)
      : null;

  const scoreB =
    repB && inferEvaluationCompleteness(repB) !== 'UNAVAILABLE'
      ? Math.round(repB.overall_score ?? repB.overallScore ?? 0)
      : null;

  const scoreDiff = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;

  const criteriaA = repA?.scores_by_criteria || repA?.scoresByCriteria || [];
  const criteriaB = repB?.scores_by_criteria || repB?.scoresByCriteria || [];

  // Indexer les critères de B par nom/label normalisé
  const criteriaMapB = new Map<string, { name: string; label: string; score: number; maxScore: number }>();
  for (const c of criteriaB) {
    const key = (c.name || c.label).toLowerCase().trim();
    criteriaMapB.set(key, {
      name: c.name || c.label,
      label: c.label || c.name,
      score: c.score,
      maxScore: c.maxScore || c.max_score || 20,
    });
  }

  const comparedCriteria: CriterionComparisonItem[] = [];

  // Parcourir les critères de A et matcher avec B
  for (const cA of criteriaA) {
    const key = (cA.name || cA.label).toLowerCase().trim();
    const matchB = criteriaMapB.get(key);
    const maxScore = cA.maxScore || cA.max_score || matchB?.maxScore || 20;

    comparedCriteria.push({
      name: cA.name || cA.label,
      label: cA.label || cA.name,
      scoreA: cA.score,
      scoreB: matchB ? matchB.score : null,
      maxScore,
      diff: matchB ? matchB.score - cA.score : null,
    });

    if (matchB) {
      criteriaMapB.delete(key);
    }
  }

  // Ajouter les critères restants de B qui n'étaient pas dans A
  for (const matchB of Array.from(criteriaMapB.values())) {
    comparedCriteria.push({
      name: matchB.name,
      label: matchB.label,
      scoreA: null,
      scoreB: matchB.score,
      maxScore: matchB.maxScore,
      diff: null,
    });
  }

  const strengthsB = (repB?.strengths || []).map((s) => ({
    criterion: s.criterion,
    verbatimQuote: s.verbatimQuote || s.verbatim_quote,
    feedback: s.feedback,
  }));

  const areasToImproveB = (repB?.areas_to_improve || repB?.areasToImprove || []).map((a) => ({
    criterion: a.criterion,
    verbatimQuote: a.verbatimQuote || a.verbatim_quote,
    feedback: a.feedback,
  }));

  const reformulationsB = (repB?.reformulation_examples || repB?.reformulationExamples || []).map((r) => ({
    studentQuote: r.studentQuote,
    recommendedAnswer: r.recommendedAnswer,
    explanation: r.explanation,
  }));

  return {
    sessionA: {
      id: sessionA.id,
      date: sessionA.started_at || sessionA.startedAt || '',
      score: scoreA,
      duration: sessionA.duration_seconds || sessionA.durationSeconds || 0,
      summary: repA?.synthesis_summary || repA?.synthesisSummary,
    },
    sessionB: {
      id: sessionB.id,
      date: sessionB.started_at || sessionB.startedAt || '',
      score: scoreB,
      duration: sessionB.duration_seconds || sessionB.durationSeconds || 0,
      summary: repB?.synthesis_summary || repB?.synthesisSummary,
    },
    scoreDiff,
    criteria: comparedCriteria,
    strengthsB,
    areasToImproveB,
    reformulationsB,
  };
}

/**
 * Génère une synthèse mémo (« Fiche Réflexe Campus France ») consolidant les forces,
 * les pièges à éviter et les meilleures reformulations issues de toutes les simulations.
 */
export function generateRevisionMemo(sessions: SessionRecord[] = []): RevisionMemo {
  const stats = getGlobalProgressionStats(sessions);

  const strengthsList: Array<{ criterion: string; quote: string; comment: string }> = [];
  const areasList: Array<{ criterion: string; quote: string; comment: string }> = [];
  const reformulationsList: Array<{ quote: string; recommended: string; explanation: string }> = [];
  const topicsSet = new Set<string>();

  for (const session of sessions) {
    const report = session.evaluation_reports?.[0];
    if (!report || inferEvaluationCompleteness(report) === 'UNAVAILABLE') continue;

    // Forces
    const strengths = report.strengths || [];
    for (const s of strengths) {
      const quote = s.verbatimQuote || s.verbatim_quote || '';
      const comment = s.feedback || '';
      if (quote || comment) {
        strengthsList.push({
          criterion: s.criterion || 'Aisance générale',
          quote,
          comment,
        });
      }
    }

    // Points d'attention
    const areas = report.areas_to_improve || report.areasToImprove || [];
    for (const a of areas) {
      const quote = a.verbatimQuote || a.verbatim_quote || '';
      const comment = a.feedback || '';
      if (quote || comment) {
        areasList.push({
          criterion: a.criterion || 'Argumentation',
          quote,
          comment,
        });
      }
    }

    // Reformulations
    const ref = report.reformulation_examples || report.reformulationExamples || [];
    for (const r of ref) {
      if (r.studentQuote && r.recommendedAnswer) {
        reformulationsList.push({
          quote: r.studentQuote,
          recommended: r.recommendedAnswer,
          explanation: r.explanation || '',
        });
      }
    }

    // Thèmes à réviser
    const topics = report.revision_topics || report.revisionTopics || [];
    for (const t of topics) {
      if (t) topicsSet.add(t);
    }
  }

  return {
    evaluatedCount: stats.evaluatedSessions,
    latestScore: stats.latestScore,
    highestScore: stats.highestScore,
    averageScore: stats.averageScore,
    strengths: strengthsList.slice(0, 4),
    areasToImprove: areasList.slice(0, 4),
    topReformulations: reformulationsList.slice(0, 3),
    recommendedTopics: Array.from(topicsSet).slice(0, 6),
  };
}

export interface CampusReadinessIndicator {
  score: number;
  level: 'READY' | 'IMPROVEMENT_NEEDED' | 'AT_RISK';
  label: string;
  badgeClass: string;
  shortSummary: string;
}

/**
 * Calcule l'indice d'admissibilité Campus Readiness Score™ (CRS) selon les critères consulaires réels.
 */
export function getCampusReadinessIndicator(score?: number | null): CampusReadinessIndicator {
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;

  if (safeScore >= 75) {
    return {
      score: safeScore,
      level: 'READY',
      label: 'Prêt pour l\'entretien consulaire',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      shortSummary: 'Cohérence solide du projet d\'études et des motivations.',
    };
  }
  if (safeScore >= 60) {
    return {
      score: safeScore,
      level: 'IMPROVEMENT_NEEDED',
      label: 'Ajustements recommandés',
      badgeClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      shortSummary: 'Dossier prometteur : consolidez la justification de vos universités.',
    };
  }
  return {
    score: safeScore,
    level: 'AT_RISK',
    label: safeScore === 0 ? 'En attente d\'évaluation' : 'Risque d\'incohérence détecté',
    badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    shortSummary: safeScore === 0 
      ? 'Effectuez une première simulation pour calculer votre score d\'admissibilité.'
      : 'Attention : retravaillez vos reformulations pour lever les doutes.',
  };
}
