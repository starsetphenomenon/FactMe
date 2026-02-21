import { RankTier } from "../models/quiz.models";

export const XP_BASE = 10;
export const XP_PER_CORRECT = 5;
export const RANK_TIERS: RankTier[] = [
  { nameKey: 'quiz.rankBeginner', minPercent: 0 },
  { nameKey: 'quiz.rankLearner', minPercent: 20 },
  { nameKey: 'quiz.rankExplorer', minPercent: 40 },
  { nameKey: 'quiz.rankExpert', minPercent: 60 },
  { nameKey: 'quiz.rankMaster', minPercent: 80 },
];
