import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quiz-result-hero',
  templateUrl: './quiz-result-hero.component.html',
  styleUrls: ['./quiz-result-hero.component.scss'],
  standalone: false,
})
export class QuizResultHeroComponent {
  @Input() emoji = '📘';
  @Input() titleKey = 'quiz.feedbackKeepLearning';
  @Input() subtitleKey = 'quiz.feedbackKeepLearningSub';
  @Input() scorePhrase = '';
  @Input() isPerfect = false;
}
