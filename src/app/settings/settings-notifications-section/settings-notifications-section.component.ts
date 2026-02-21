import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SettingsText } from '../../enums/settings-text.enum';
import { Weekday } from '../../models/fact.models';

@Component({
  selector: 'app-settings-notifications-section',
  templateUrl: './settings-notifications-section.component.html',
  styleUrls: ['./settings-notifications-section.component.scss'],
  standalone: false,
})
export class SettingsNotificationsSectionComponent {
  @Input() settingsText!: typeof SettingsText;
  @Input() notificationsEnabled = false;
  @Input() notificationTime!: string | null;
  @Input() notificationWeekdays: Weekday[] = [];
  @Input() notificationSoundEnabled = true;

  @Output() notificationsToggleChange = new EventEmitter<boolean>();
  @Output() timeChanged = new EventEmitter<string | string[] | null>();
  @Output() weekdaysChanged = new EventEmitter<Weekday[]>();
  @Output() soundToggleChange = new EventEmitter<boolean>();
  @Output() testNotification = new EventEmitter<void>();

  readonly weekdayOptions: { value: Weekday; labelKey: string }[] = [
    { value: 2, labelKey: 'settings.weekdayMonShort' },
    { value: 3, labelKey: 'settings.weekdayTueShort' },
    { value: 4, labelKey: 'settings.weekdayWedShort' },
    { value: 5, labelKey: 'settings.weekdayThuShort' },
    { value: 6, labelKey: 'settings.weekdayFriShort' },
    { value: 7, labelKey: 'settings.weekdaySatShort' },
    { value: 1, labelKey: 'settings.weekdaySunShort' },
  ];

  isWeekdaySelected(value: Weekday): boolean {
    return this.notificationWeekdays.includes(value);
  }

  toggleWeekday(value: Weekday): void {
    const next = new Set(this.notificationWeekdays);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const updated = Array.from(next).sort();
    this.notificationWeekdays = updated;
    this.weekdaysChanged.emit(updated);
  }
}
