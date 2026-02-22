import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quiz-result-rewards',
  templateUrl: './quiz-result-rewards.component.html',
  styleUrls: ['./quiz-result-rewards.component.scss'],
  standalone: false,
})
export class QuizResultRewardsComponent {
  @Input() dayStreakText = '';
  @Input() xpEarnedText = '';
  @Input() showStreak = false;
}
