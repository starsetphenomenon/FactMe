import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SettingsText } from '../../enums/settings-text.enum';
import { Language } from '../../enums/language.enum';

@Component({
  selector: 'app-settings-theme-language-section',
  templateUrl: './settings-theme-language-section.component.html',
  styleUrls: ['./settings-theme-language-section.component.scss'],
  standalone: false,
})
export class SettingsThemeLanguageSectionComponent {
  @Input() settingsText!: typeof SettingsText;
  @Input() isLightTheme = false;
  @Input() language!: Language | null;
  @Input() defaultLanguage!: Language;
  @Input() languages: { code: Language; label: string; flag: string }[] = [];

  @Output() themeToggleChange = new EventEmitter<boolean>();
  @Output() languageChange = new EventEmitter<Language>();
}
