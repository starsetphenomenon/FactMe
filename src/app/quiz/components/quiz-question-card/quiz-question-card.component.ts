import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QuizQuestion } from '../../../models/quiz.models';
import { QuizStats } from '../../../models/quiz.models';
import { RankInfo } from '../../../models/quiz.models';

@Component({
  selector: 'app-quiz-question-card',
  templateUrl: './quiz-question-card.component.html',
  styleUrls: ['./quiz-question-card.component.scss'],
  standalone: false,
})
export class QuizQuestionCardComponent {
  @Input() question!: QuizQuestion;
  @Input() currentIndex = 0;
  @Input() totalQuestions = 0;
  @Input() selectedIndex: number | null = null;
  @Input() optionLabels: string[] = ['A', 'B', 'C', 'D'];
  @Input() questionProgressPercent = 0;
  @Input() stats!: QuizStats;
  @Input() rankInfo!: RankInfo;
  @Input() averagePercent = 0;
  @Input() daysActiveLabelKey = 'quiz.daysActive';

  @Output() selectOption = new EventEmitter<number>();
  @Output() next = new EventEmitter<void>();

  isCorrect(index: number): boolean {
    return index === this.question.correctIndex;
  }

  isWrong(index: number): boolean {
    return this.selectedIndex === index && !this.isCorrect(index);
  }

  onSelectOption(index: number): void {
    this.selectOption.emit(index);
  }

  onNext(): void {
    this.next.emit();
  }
}
