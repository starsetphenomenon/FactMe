import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-home-date-header',
  templateUrl: './home-date-header.component.html',
  styleUrls: ['./home-date-header.component.scss'],
  standalone: false,
})
export class HomeDateHeaderComponent {
  @Input() dateLabel = '';
  @Input() isLoading = false;
}
