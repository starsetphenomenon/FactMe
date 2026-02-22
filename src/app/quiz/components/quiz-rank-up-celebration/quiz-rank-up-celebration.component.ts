import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quiz-rank-up-celebration',
  templateUrl: './quiz-rank-up-celebration.component.html',
  styleUrls: ['./quiz-rank-up-celebration.component.scss'],
  standalone: false,
})
export class QuizRankUpCelebrationComponent {
  @Input() rankUpMessage = '';
}
