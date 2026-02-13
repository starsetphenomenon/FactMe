import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppSettings, Fact, Weekday, ALL_TOPICS, TopicKey } from '../models/fact.models';
import { NotificationText } from '../enums/notification-text.enum';
import { Topic } from '../enums/topic.enum';
import { TranslationService } from './translation.service';
import { FactService } from './fact.service';

const DAILY_FACT_NOTIFICATION_IDS = [1, 2, 3, 4, 5, 6, 7];

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private platform: Platform,
    private translationService: TranslationService,
    private factService: FactService,
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

    // Use passed fact, or current fact from home page (settings.currentFactIds). No current fact = cancel only.
    const effectiveFact =
      fact ?? (await this.getCurrentFactFromSettings(settings));
    if (!effectiveFact) {
      return;
    }

    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      return;
    }

    await this.translationService.loadTranslations(
      this.translationService.getLanguage(),
    );
    const title =
      effectiveFact?.title ??
      this.translationService.translate(NotificationText.FallbackTitle);
    const body =
      effectiveFact?.description ??
      this.translationService.translate(NotificationText.FallbackBody);

    const [hourStr, minuteStr] = settings.notificationTime.split(':');
    const hour = Number(hourStr ?? 9);
    const minute = Number(minuteStr ?? 0);

    const smallIcon = 'ic_stat_icon';
    const largeIcon = effectiveFact
      ? this.getTopicLargeIconName(effectiveFact.topic)
      : undefined;

    const notifications = weekdays.map((weekday: Weekday, index: number) => ({
      id: DAILY_FACT_NOTIFICATION_IDS[index] ?? DAILY_FACT_NOTIFICATION_IDS[0],
      title,
      body,
      smallIcon,
      ...(largeIcon && { largeIcon }),
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

  /** Android drawable name (no extension) for notification large icon by topic. */
  private getTopicLargeIconName(topic: TopicKey): string {
    const slug = topic.replace(/-/g, '_');
    const known: TopicKey[] = [
      Topic.History,
      Topic.Science,
      Topic.WorldEvents,
      Topic.Technology,
      Topic.Music,
      Topic.Movies,
      Topic.Sports,
      Topic.FunFacts,
      Topic.Literature,
      Topic.Psychology,
    ];
    if (known.includes(topic)) {
      return `ic_topic_${slug}`;
    }
    return 'ic_topic_default';
  }

  /** Resolve current fact from home page state (currentFactIds). Returns null if home has no facts. */
  private async getCurrentFactFromSettings(settings: AppSettings): Promise<Fact | null> {
    const currentId = settings.currentFactIds?.[0];
    if (!currentId) {
      return null;
    }
    const topics =
      settings.selectedTopics?.length > 0
        ? settings.selectedTopics
        : ALL_TOPICS;
    return this.factService.getFactById(currentId, topics);
  }
}
