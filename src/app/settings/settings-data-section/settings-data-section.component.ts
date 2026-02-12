import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SettingsText } from '../../enums/settings-text.enum';

@Component({
  selector: 'app-settings-data-section',
  templateUrl: './settings-data-section.component.html',
  styleUrls: ['./settings-data-section.component.scss'],
  standalone: false,
})
export class SettingsDataSectionComponent {
  @Input() settingsText!: typeof SettingsText;

  @Input() canClearSeenFacts = false;

  @Output() clearSeenFacts = new EventEmitter<void>();
}

