import { QuizAttempt } from "./fact.models";

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export interface QuizSet {
  id: string;
  questions: QuizQuestion[];
}

export interface QuizData {
  quizzes: QuizSet[];
}

export interface QuizStats {
  totalQuizzes: number;
  totalCorrect: number;
  totalQuestions: number;
  attempts: QuizAttempt[];
  daysActive: number;
  streak: number;
  totalXp: number;
}

export interface RankTier {
  nameKey: string;
  minPercent: number;
}

export interface RankInfo {
  current: RankTier;
  next: RankTier | null;
  progressToNext: number;
  correctToNext: number;
  xpToNext: number;
  progressPercent: number;
}
