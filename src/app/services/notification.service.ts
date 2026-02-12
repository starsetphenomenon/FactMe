import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppSettings, Fact, Weekday, ALL_WEEKDAYS } from '../models/fact.models';
import { NotificationText } from '../enums/notification-text.enum';
import { TranslationService } from './translation.service';

const DAILY_FACT_NOTIFICATION_IDS = [1, 2, 3, 4, 5, 6, 7];

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
      return;
    }

    await LocalNotifications.cancel({
      notifications: DAILY_FACT_NOTIFICATION_IDS.map((id) => ({ id })),
    });

    const weekdays = settings.notificationWeekdays;

    if (!settings.notificationsEnabled || weekdays.length === 0) {
      return;
    }

    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      return;
    }

    const triggerTime = this.getNextTriggerDate(settings.notificationTime);

    await this.translationService.loadTranslations(
      this.translationService.getLanguage(),
    );

    const title = fact?.title ?? this.translationService.translate(NotificationText.FallbackTitle);
    const body = this.translationService.translate(NotificationText.BodyFullStory);

    const [hourStr, minuteStr] = settings.notificationTime.split(':');
    const hour = Number(hourStr ?? 9);
    const minute = Number(minuteStr ?? 0);

    const notifications = weekdays.map((weekday: Weekday, index: number) => ({
      id: DAILY_FACT_NOTIFICATION_IDS[index] ?? DAILY_FACT_NOTIFICATION_IDS[0],
      title,
      body,
      schedule: {
        at: this.getNextWeekdayTriggerDate(weekday as Weekday, hour, minute),
        repeats: true,
        every: 'week' as const,
        on: {
          weekday,
          hour,
          minute,
        },
      },
      smallIcon: 'ic_stat_icon',
    }));

    await LocalNotifications.schedule({
      notifications,
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
      trigger.setDate(trigger.getDate() + 1);
    }
    return trigger;
  }

  private getNextWeekdayTriggerDate(weekday: Weekday, hour: number, minute: number): Date {
    const now = new Date();
    const result = new Date(now);
    result.setHours(hour, minute, 0, 0);

    const todayJs = now.getDay();
    const targetJs = (weekday + 6) % 7;

    let diff = targetJs - todayJs;
    if (diff < 0 || (diff === 0 && result <= now)) {
      diff += 7;
    }

    result.setDate(now.getDate() + diff);
    return result;
  }
}

