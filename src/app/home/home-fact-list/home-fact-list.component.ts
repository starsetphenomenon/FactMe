import { Component, Input } from '@angular/core';
import { Fact } from '../../models/fact.models';
import { HomeText } from '../../enums/home-text.enum';

@Component({
  selector: 'app-home-fact-list',
  templateUrl: './home-fact-list.component.html',
  styleUrls: ['./home-fact-list.component.scss'],
  standalone: false,
})
export class HomeFactListComponent {
  @Input() dateLabel = '';
  @Input() facts: Fact[] = [];
  @Input() isLoading = false;
  @Input() error: string | null = null;
  @Input() homeText!: typeof HomeText;

  get hasFacts(): boolean {
    return !!this.facts.length;
  }
}
