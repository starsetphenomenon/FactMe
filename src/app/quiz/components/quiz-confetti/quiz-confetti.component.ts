import { Component, Input } from '@angular/core';

export interface ConfettiParticle {
  id: number;
  left: number;
  top: number;
  color: string;
  deg: number;
  delay: number;
  tx: number;
  ty: number;
}

@Component({
  selector: 'app-quiz-confetti',
  templateUrl: './quiz-confetti.component.html',
  styleUrls: ['./quiz-confetti.component.scss'],
  standalone: false,
})
export class QuizConfettiComponent {
  @Input() particles: ConfettiParticle[] = [];
}
