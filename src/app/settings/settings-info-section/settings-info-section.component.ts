import { Component, Input } from '@angular/core';
import { SettingsText } from '../../enums/settings-text.enum';

@Component({
  selector: 'app-settings-info-section',
  templateUrl: './settings-info-section.component.html',
  styleUrls: ['./settings-info-section.component.scss'],
  standalone: false,
})
export class SettingsInfoSectionComponent {
  @Input() settingsText!: typeof SettingsText;
}
