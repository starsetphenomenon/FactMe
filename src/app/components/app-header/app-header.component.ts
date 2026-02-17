import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  standalone: false,
})
export class AppHeaderComponent {
  @Input() showSettingsButton = true;
  @Input() showBack = false;
  @Output() settingsClick = new EventEmitter<void>();
  @Output() backClick = new EventEmitter<void>();
}
