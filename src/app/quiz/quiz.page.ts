import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuizQuestion, QuizSet } from '../models/quiz.models';
import { QuizService } from '../services/quiz.service';
import { QuizUtils } from '../utils/quiz.utils';
import { TranslationService } from '../services/translation.service';

type QuizView = 'loading' | 'unavailable' | 'question' | 'result';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: false,
})
export class QuizPage implements OnInit, OnDestroy {
  view: QuizView = 'loading';
  quiz: QuizSet | null = null;
  currentIndex = 0;
  selectedIndex: number | null = null;
  correctCount = 0;
  displayedProgress = 0;
  displayedXp = 0;
  rankJustUpgraded = false;
  confettiParticles: { id: number; left: number; top: number; color: string; deg: number; delay: number; tx: number; ty: number }[] = [];
  private readonly destroy$ = new Subject<void>();
  readonly ringCircumference = 2 * Math.PI * 45;

  readonly optionLabels = ['A', 'B', 'C', 'D'];

  private static readonly CONFETTI_COLORS = [
    '#ffb457', '#ff9f43', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#14b8a6',
  ];
  private static readonly CONFETTI_COUNT = 55;

  get resultDots(): number[] {
    return Array.from({ length: this.totalQuestions }, (_, i) => i);
  }

  constructor(
    private quizService: QuizService,
    private navCtrl: NavController,
    private translation: TranslationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.quizService.getAvailableQuiz$().pipe(takeUntil(this.destroy$)).subscribe((quiz) => {
      if (!quiz) {
        this.view = this.quizService.canStartQuizToday() ? 'unavailable' : 'unavailable';
        return;
      }
      this.quiz = quiz;
      this.view = 'question';
      this.currentIndex = 0;
      this.selectedIndex = null;
      this.correctCount = 0;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentQuestion(): QuizQuestion | null {
    if (!this.quiz || this.currentIndex >= this.quiz.questions.length) {
      return null;
    }
    return this.quiz.questions[this.currentIndex];
  }

  get totalQuestions(): number {
    return this.quiz?.questions.length ?? 0;
  }

  get progressLabel(): string {
    return `${this.currentIndex + 1} / ${this.totalQuestions}`;
  }

  get questionProgressPercent(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round((100 * this.currentIndex) / this.totalQuestions);
  }

  selectOption(index: number): void {
    if (this.selectedIndex !== null || !this.quiz) return;
    this.selectedIndex = index;
    const q = this.currentQuestion;
    if (q && index === q.correctIndex) {
      this.correctCount++;
    }
  }

  isCorrect(index: number): boolean {
    const q = this.currentQuestion;
    return q !== null && index === q.correctIndex;
  }

  isWrong(index: number): boolean {
    return this.selectedIndex === index && !this.isCorrect(index);
  }

  next(): void {
    if (!this.quiz || this.selectedIndex === null) return;
    if (this.currentIndex + 1 >= this.quiz.questions.length) {
      const maxPossible = this.quizService.getMaxPossibleCorrect();
      const totalCorrectBefore = this.stats.totalCorrect;
      const rankBefore = QuizUtils.getRankInfo(totalCorrectBefore, maxPossible);

      this.quizService.markQuizCompleted(this.quiz.id, this.correctCount, this.totalQuestions);

      const totalCorrectAfter = this.stats.totalCorrect;
      const rankAfter = QuizUtils.getRankInfo(totalCorrectAfter, maxPossible);
      this.rankJustUpgraded = rankAfter.current.minPercent > rankBefore.current.minPercent;

      this.view = 'result';
      this.displayedProgress = 0;
      this.displayedXp = 0;
      const showConfetti = this.rankJustUpgraded || (this.correctCount >= this.totalQuestions && this.totalQuestions > 0);
      if (showConfetti) {
        this.confettiParticles = this.buildConfettiParticles();
      } else {
        this.confettiParticles = [];
      }
      this.cdr.detectChanges();
      setTimeout(() => {
        this.displayedProgress = this.resultPercent;
        this.cdr.detectChanges();
      }, 80);
      this.runXpCountUp();
      return;
    }
    this.currentIndex++;
    this.selectedIndex = null;
  }

  get xpForThisQuiz(): number {
    return QuizUtils.getXpForAttempt(this.correctCount, this.totalQuestions);
  }

  private runXpCountUp(): void {
    const target = this.xpForThisQuiz;
    const step = target <= 15 ? 60 : 50;
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      this.displayedXp = Math.min(current, target);
      this.cdr.detectChanges();
      if (this.displayedXp >= target) {
        clearInterval(id);
      }
    }, step);
  }

  get ringOffset(): number {
    return this.ringCircumference * (1 - this.displayedProgress / 100);
  }

  get resultScore(): string {
    return `${this.correctCount} / ${this.totalQuestions}`;
  }

  get resultPercent(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round((100 * this.correctCount) / this.totalQuestions);
  }

  get resultEmoji(): string {
    if (this.correctCount >= this.totalQuestions) return '🏆';
    if (this.correctCount >= 2) return '🔥';
    return '📘';
  }

  get resultTitleKey(): string {
    if (this.correctCount >= this.totalQuestions) return 'quiz.feedbackPerfect';
    if (this.correctCount >= 2) return 'quiz.feedbackNiceJob';
    return 'quiz.feedbackKeepLearning';
  }

  get resultSubtitleKey(): string {
    if (this.correctCount >= this.totalQuestions) return 'quiz.feedbackPerfectSub';
    if (this.correctCount >= 2) return 'quiz.feedbackNiceJobSub';
    return 'quiz.feedbackKeepLearningSub';
  }

  get resultScorePhrase(): string {
    const raw = this.translation.translate('quiz.youGotCorrect');
    return raw
      .replace(/\{\{count\}\}/g, String(this.correctCount))
      .replace(/\{\{total\}\}/g, String(this.totalQuestions));
  }

  get xpEarnedText(): string {
    return this.translation.translate('quiz.xpEarned').replace(/\{\{xp\}\}/g, String(this.displayedXp));
  }

  get dayStreakText(): string {
    return this.translation.translate('quiz.dayStreak').replace(/\{\{count\}\}/g, String(this.stats.streak));
  }

  get stats() {
    return this.quizService.getQuizStats();
  }

  get averagePercent(): number {
    const s = this.stats;
    if (s.totalQuestions === 0) return 0;
    return Math.round((100 * s.totalCorrect) / s.totalQuestions);
  }

  get daysActiveLabelKey(): string {
    return this.stats.daysActive === 1 ? 'quiz.dayActive' : 'quiz.daysActive';
  }

  get rankInfo() {
    return QuizUtils.getRankInfo(
      this.stats.totalCorrect,
      this.quizService.getMaxPossibleCorrect(),
    );
  }

  get rankUpMessage(): string {
    const raw = this.translation.translate('quiz.rankUpSub');
    return raw.replace(/\{\{rank\}\}/g, this.translation.translate(this.rankInfo.current.nameKey));
  }

  get xpToNextRankText(): string {
    const info = this.rankInfo;
    if (!info.next || info.xpToNext <= 0) return '';
    const raw = this.translation.translate('quiz.xpToNextRank');
    return raw
      .replace(/\{\{xp\}\}/g, String(info.xpToNext))
      .replace(/\{\{rank\}\}/g, this.translation.translate(info.next.nameKey));
  }

  goHome(): void {
    this.navCtrl.navigateBack('/home');
  }

  private buildConfettiParticles(): typeof QuizPage.prototype.confettiParticles {
    const particles: typeof this.confettiParticles = [];
    for (let i = 0; i < QuizPage.CONFETTI_COUNT; i++) {
      particles.push({
        id: i,
        left: 40 + Math.random() * 20,
        top: 25 + Math.random() * 15,
        color: QuizPage.CONFETTI_COLORS[Math.floor(Math.random() * QuizPage.CONFETTI_COLORS.length)],
        deg: Math.random() * 360,
        delay: Math.random() * 0.25,
        tx: (Math.random() - 0.5) * 280,
        ty: (Math.random() - 0.2) * 320,
      });
    }
    return particles;
  }
}
