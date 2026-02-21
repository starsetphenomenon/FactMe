import { Component, EventEmitter, Input, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Fact } from '../../models/fact.models';
import { HomeText } from '../../enums/home-text.enum';

export const factItemEnterAnimation = trigger('factItemEnter', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(24px)' }),
    animate('280ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
]);

@Component({
  selector: 'app-home-fact-list',
  templateUrl: './home-fact-list.component.html',
  styleUrls: ['./home-fact-list.component.scss'],
  standalone: false,
  animations: [factItemEnterAnimation],
})
export class HomeFactListComponent {
  @Input() dateLabel = '';
  @Input() facts: Fact[] = [];
  @Input() isLoading = false;
  @Input() error: string | null = null;
  @Input() homeText!: typeof HomeText;
  @Output() factSwipeLeft = new EventEmitter<number>();
  @Output() factSwipeRight = new EventEmitter<number>();

  readonly skeletonCards = [1, 2, 3];

  get hasFacts(): boolean {
    return !!this.facts.length;
  }

  trackByFactId(_index: number, fact: Fact): string {
    return fact.id;
  }

  onSwipeLeft(index: number): void {
    this.factSwipeLeft.emit(index);
  }

  onSwipeRight(index: number): void {
    this.factSwipeRight.emit(index);
  }
}
