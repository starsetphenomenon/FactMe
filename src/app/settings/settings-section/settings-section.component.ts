import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-settings-section',
  templateUrl: './settings-section.component.html',
  styleUrls: ['./settings-section.component.scss'],
  standalone: false,
})
export class SettingsSectionComponent {
  @Input() title = '';
  @Input() subtitle: string | null = null;
}

