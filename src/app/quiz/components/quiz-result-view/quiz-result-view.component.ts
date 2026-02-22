import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RankInfo } from '../../../models/quiz.models';
import { QuizStats } from '../../../models/quiz.models';

@Component({
  selector: 'app-quiz-result-view',
  templateUrl: './quiz-result-view.component.html',
  styleUrls: ['./quiz-result-view.component.scss'],
  standalone: false,
})
export class QuizResultViewComponent {
  @Input() resultEmoji = '📘';
  @Input() resultTitleKey = 'quiz.feedbackKeepLearning';
  @Input() resultSubtitleKey = 'quiz.feedbackKeepLearningSub';
  @Input() resultScorePhrase = '';
  @Input() isPerfect = false;
  @Input() displayedProgress = 0;
  @Input() correctCount = 0;
  @Input() totalQuestions = 0;
  @Input() ringCircumference = 2 * Math.PI * 45;
  @Input() dayStreakText = '';
  @Input() xpEarnedText = '';
  @Input() showStreak = false;
  @Input() rankJustUpgraded = false;
  @Input() rankUpMessage = '';
  @Input() rankInfo!: RankInfo;
  @Input() xpToNextRankText = '';
  @Input() stats!: QuizStats;
  @Input() averagePercent = 0;
  @Input() daysActiveLabelKey = 'quiz.daysActive';

  @Output() goHome = new EventEmitter<void>();

  onGoHome(): void {
    this.goHome.emit();
  }
}
