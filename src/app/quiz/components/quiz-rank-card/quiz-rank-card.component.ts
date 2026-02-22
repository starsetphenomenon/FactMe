import { Component, Input } from '@angular/core';
import { RankInfo } from '../../../models/quiz.models';

@Component({
  selector: 'app-quiz-rank-card',
  templateUrl: './quiz-rank-card.component.html',
  styleUrls: ['./quiz-rank-card.component.scss'],
  standalone: false,
})
export class QuizRankCardComponent {
  @Input() rankInfo!: RankInfo;
  @Input() xpToNextRankText = '';
}
