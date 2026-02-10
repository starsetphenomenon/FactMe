import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HomeText } from '../../enums/home-text.enum';

@Component({
  selector: 'app-home-next-fact-button',
  templateUrl: './home-next-fact-button.component.html',
  styleUrls: ['./home-next-fact-button.component.scss'],
  standalone: false,
})
export class HomeNextFactButtonComponent {
  @Input() isVisible = false;
  @Input() isRefreshing = false;
  @Input() homeText!: typeof HomeText;

  @Output() nextFact = new EventEmitter<void>();
}
