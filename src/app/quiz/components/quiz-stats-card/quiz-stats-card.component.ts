import { Component, Input } from '@angular/core';
import { QuizStats } from '../../../models/quiz.models';

@Component({
  selector: 'app-quiz-stats-card',
  templateUrl: './quiz-stats-card.component.html',
  styleUrls: ['./quiz-stats-card.component.scss'],
  standalone: false,
})
export class QuizStatsCardComponent {
  @Input() variant: 'compact' | 'simple' = 'simple';
  @Input() stats!: QuizStats;
  @Input() averagePercent = 0;
  @Input() daysActiveLabelKey = 'quiz.daysActive';
  @Input() rankNameKey = '';
}
