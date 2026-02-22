import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quiz-result-visual',
  templateUrl: './quiz-result-visual.component.html',
  styleUrls: ['./quiz-result-visual.component.scss'],
  standalone: false,
})
export class QuizResultVisualComponent {
  @Input() displayedProgress = 0;
  @Input() correctCount = 0;
  @Input() totalQuestions = 0;
  @Input() ringCircumference = 2 * Math.PI * 45;

  get ringOffset(): number {
    return this.ringCircumference * (1 - this.displayedProgress / 100);
  }

  get resultDots(): number[] {
    return Array.from({ length: this.totalQuestions }, (_, i) => i);
  }
}
