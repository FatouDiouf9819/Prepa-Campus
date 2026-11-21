import { AcademicProfileData } from './profile';

export type InterviewStatus =
  | 'PERMISSION_CHECK'
  | 'READY_TO_START'
  | 'AI_SPEAKING'
  | 'STUDENT_RECORDING'
  | 'TRANSCRIBING'
  | 'REVIEW_RESPONSE'
  | 'AI_EVALUATING'
  | 'FINAL_CONCLUDING'
  | 'GENERATING_REPORT'
  | 'COMPLETED'
  | 'ERROR_RECOVERY'
  | 'CREDIT_BLOCKED'
  | 'ABORTED_INSUFFICIENT_DATA';

export type JuryPersonality = 'BIENVEILLANT' | 'STANDARD' | 'CRASH_TEST';

export type TurnType = 'INITIAL' | 'FOLLOWUP' | 'REGULAR' | 'CONCLUSION';

export type EvaluationStatus = 'ANSWER_ACCEPTED' | 'FOLLOWUP_REQUIRED' | 'EVALUATING_ANSWER';

export type RelevanceCategory = 
  | 'PERTINENT_DEVELOPPED' 
  | 'PERTINENT_SHORT' 
  | 'PARTIALLY_PERTINENT' 
  | 'OFF_TOPIC' 
  | 'EMPTY_OR_INAUDIBLE' 
  | 'AMBIGUOUS';

export interface InterviewTurn {
  turnIndex: number;
  aiQuestion: string;
  pedagogicalIntent: string;
  studentTranscript: string;
  turnType: TurnType;
  durationSeconds: number;
  evaluationStatus?: EvaluationStatus;
  relevanceCategory?: RelevanceCategory;
  audioUrl?: string;
  timestamp: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  profileSnapshot: AcademicProfileData;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  turns: InterviewTurn[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
}

export interface CriterionScore {
  name: string;
  label: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface VerbatimFeedback {
  criterion: string;
  verbatimQuote: string;
  feedback: string;
  suggestedReformulation?: string;
}

export type EvaluationCompleteness = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';

export interface EvaluationReport {
  id: string;
  sessionId: string;
  overallScore: number; // 0 à 100 (indicatif)
  scoresByCriteria: CriterionScore[];
  strengths: VerbatimFeedback[];
  areasToImprove: VerbatimFeedback[];
  reformulationExamples: {
    originalContext: string;
    studentQuote: string;
    recommendedAnswer: string;
    explanation: string;
  }[];
  revisionTopics: string[];
  synthesisSummary: string;
  evaluationGridVersion: string;
  evaluationCompleteness?: EvaluationCompleteness;
  isTechnicalIssue?: boolean;
  createdAt: string;
}

