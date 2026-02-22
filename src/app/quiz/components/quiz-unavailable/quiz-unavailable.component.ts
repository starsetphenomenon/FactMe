import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RankInfo } from '../../../models/quiz.models';
import { QuizStats } from '../../../models/quiz.models';

@Component({
  selector: 'app-quiz-unavailable',
  templateUrl: './quiz-unavailable.component.html',
  styleUrls: ['./quiz-unavailable.component.scss'],
  standalone: false,
})
export class QuizUnavailableComponent {
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
