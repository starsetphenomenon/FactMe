import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppSettings, Fact } from '../models/fact.models';
import { NotificationText } from '../enums/notification-text.enum';
import { TranslationService } from './translation.service';

const DAILY_FACT_NOTIFICATION_ID = 1;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private platform: Platform,
    private translationService: TranslationService,
  ) {}

  async ensurePermissions(): Promise<boolean> {
    if (!this.platform.is('hybrid')) {
      // Browser: don't request native permissions
      return false;
    }

    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') {
      return true;
    }
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }

  async rescheduleDailyNotification(
    settings: AppSettings,
    fact?: Fact | null,
  ): Promise<void> {
    if (!this.platform.is('hybrid')) {
      // In the browser we simply no-op; scheduling happens only on device.
      return;
    }

    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_FACT_NOTIFICATION_ID }],
    });

    if (!settings.notificationsEnabled) {
      return;
    }

    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      return;
    }

    const triggerTime = this.getNextTriggerDate(settings.notificationTime);

    // Ensure translations are loaded before getting notification text
    await this.translationService.loadTranslations(
      this.translationService.getLanguage(),
    );

    const title = fact?.title ?? this.translationService.t(NotificationText.FallbackTitle);
    const body = this.translationService.t(NotificationText.BodyFullStory);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_FACT_NOTIFICATION_ID,
          title,
          body,
          schedule: {
            at: triggerTime,
            repeats: true,
            every: 'day',
          },
          smallIcon: 'ic_stat_icon',
        },
      ],
    });
  }

  private getNextTriggerDate(time: string): Date {
    const [hourStr, minuteStr] = time.split(':');
    const hour = Number(hourStr ?? 9);
    const minute = Number(minuteStr ?? 0);

    const now = new Date();
    const trigger = new Date();
    trigger.setHours(hour, minute, 0, 0);

    if (trigger <= now) {
      // If time already passed today, schedule for tomorrow
      trigger.setDate(trigger.getDate() + 1);
    }
    return trigger;
  }
}

