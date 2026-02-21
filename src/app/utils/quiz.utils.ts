import { XP_BASE, XP_PER_CORRECT, RANK_TIERS } from '../constants/quiz.constants';
import { RankInfo, RankTier } from '../models/quiz.models';

export class QuizUtils {
  static getXpForAttempt(correctCount: number, _totalCount: number): number {
    return XP_BASE + correctCount * XP_PER_CORRECT;
  }

  static getRankInfo(totalCorrect: number, maxPossibleCorrect: number): RankInfo {
    const progressPercent =
      maxPossibleCorrect <= 0
        ? 0
        : Math.min(100, Math.round((100 * totalCorrect) / maxPossibleCorrect));
    const safeMax = Math.max(1, maxPossibleCorrect);

    let current: RankTier = RANK_TIERS[0];
    let next: RankTier | null = null;
    for (let i = 0; i < RANK_TIERS.length; i++) {
      if (progressPercent >= RANK_TIERS[i].minPercent) {
        current = RANK_TIERS[i];
        next = RANK_TIERS[i + 1] ?? null;
      }
    }

    const currentMin = current.minPercent;
    const nextMin = next ? next.minPercent : 100;
    const range = nextMin - currentMin;
    const progressToNext =
      range <= 0 ? 100 : Math.min(100, Math.round((100 * (progressPercent - currentMin)) / range));

    const correctForNext = next ? Math.ceil((nextMin / 100) * safeMax) : totalCorrect;
    const correctToNext = next ? Math.max(0, correctForNext - totalCorrect) : 0;
    const xpToNext = correctToNext * XP_PER_CORRECT;

    return { current, next, progressToNext, correctToNext, xpToNext, progressPercent };
  }
}
