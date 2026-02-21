import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { Language } from '../enums/language.enum';
import { QuizAttempt } from '../models/fact.models';
import { QuizData, QuizSet, QuizStats } from '../models/quiz.models';
import { QuizUtils } from '../utils/quiz.utils';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private cache = new Map<Language, Observable<QuizData>>();
  private cachedMaxPossibleCorrect = 0;

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService,
  ) {}

  loadQuizData$(): Observable<QuizData> {
    const lang = this.settingsService.getSettings().language ?? Language.English;
    const cached = this.cache.get(lang);
    if (cached) {
      return cached;
    }
    const stream = this.http
      .get<QuizData>(`assets/quiz/${lang}.json`)
      .pipe(
        catchError(() => {
          if (lang !== Language.English) {
            return this.http.get<QuizData>('assets/quiz/en.json');
          }
          return of({ quizzes: [] });
        }),
        tap((data) => {
          this.cachedMaxPossibleCorrect = (data.quizzes ?? []).reduce(
            (sum, q) => sum + (q.questions?.length ?? 0),
            0,
          );
        }),
        shareReplay(1),
      );
    this.cache.set(lang, stream);
    return stream;
  }

  getMaxPossibleCorrect(): number {
    return this.cachedMaxPossibleCorrect || 0;
  }

  canStartQuizToday(): boolean {
    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(new Date());

    if (!settings.lastQuizCompletedDate) {
      return true;
    }
    return settings.lastQuizCompletedDate !== todayIso;
  }

  getAvailableQuiz$(): Observable<QuizSet | null> {
    return this.loadQuizData$().pipe(
      map((data) => {
        if (!this.canStartQuizToday()) return null;
        const quizzes = data.quizzes ?? [];
        if (quizzes.length === 0) return null;
        const completed = new Set(
          this.settingsService.getSettings().completedQuizIds ?? [],
        );
        const available = quizzes.filter((q) => !completed.has(q.id));
        const pool = available.length > 0 ? available : quizzes;
        const index = Math.floor(Math.random() * pool.length);
        return pool[index] ?? null;
      }),
    );
  }

  markQuizCompleted(quizId: string, correctCount: number, totalCount: number): void {
    const todayIso = this.toIsoDate(new Date());
    const settings = this.settingsService.getSettings();
    const completed = [...(settings.completedQuizIds ?? [])];
    if (!completed.includes(quizId)) {
      completed.push(quizId);
    }
    const attempt: QuizAttempt = {
      dateIso: todayIso,
      quizId,
      correctCount,
      totalCount,
    };
    const history = [...(settings.quizHistory ?? []), attempt];
    this.settingsService.update({
      lastQuizCompletedDate: todayIso,
      completedQuizIds: completed,
      quizHistory: history,
    });
  }

  getQuizStats(): QuizStats {
    const attempts = [...(this.settingsService.getSettings().quizHistory ?? [])];
    attempts.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correctCount, 0);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalCount, 0);
    const uniqueDates = [...new Set(attempts.map((a) => a.dateIso))].sort((a, b) => b.localeCompare(a));
    const streak = this.computeStreak(uniqueDates);
    const totalXp = attempts.reduce((sum, a) => sum + QuizUtils.getXpForAttempt(a.correctCount, a.totalCount), 0);
    return {
      totalQuizzes: attempts.length,
      totalCorrect,
      totalQuestions,
      attempts,
      daysActive: uniqueDates.length,
      streak,
      totalXp,
    };
  }

  private computeStreak(sortedDatesDesc: string[]): number {
    if (sortedDatesDesc.length === 0) return 0;
    const today = this.toIsoDate(new Date());
    if (sortedDatesDesc[0] !== today) return 0;
    let streak = 0;
    let expected = today;
    for (const d of sortedDatesDesc) {
      if (d !== expected) break;
      streak++;
      expected = this.previousDayIso(d);
    }
    return streak;
  }

  private previousDayIso(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
