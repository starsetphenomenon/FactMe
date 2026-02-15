import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FactMeNotification } from '../plugins/fact-me-notification.plugin';
import { AppSettings, Fact, Weekday, ALL_TOPICS, TopicKey, Theme } from '../models/fact.models';
import { NotificationText } from '../enums/notification-text.enum';
import { Topic } from '../enums/topic.enum';
import { TranslationService } from './translation.service';
import { FactService } from './fact.service';

const DAILY_FACT_NOTIFICATION_IDS = [1, 2, 3, 4, 5, 6, 7];
const TEST_NOTIFICATION_ID = 999;

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

    const weekdays = settings.notificationWeekdays;
    const useNativeScheduling = Capacitor.getPlatform() === 'android';

    await LocalNotifications.cancel({
      notifications: DAILY_FACT_NOTIFICATION_IDS.map((id) => ({ id })),
    });
    if (useNativeScheduling) {
      await FactMeNotification.cancelDailyNotifications({
        ids: DAILY_FACT_NOTIFICATION_IDS,
      });
    }

    if (weekdays.length === 0) {
      return;
    }

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

    const largeIconDrawableName = this.getTopicLargeIconName(effectiveFact.topic);
    const largeIconTintColor = this.getTopicColor(effectiveFact.topic, settings.theme);

    if (useNativeScheduling) {
      const notifications = weekdays.map((weekday: Weekday, index: number) => ({
        id: DAILY_FACT_NOTIFICATION_IDS[index] ?? DAILY_FACT_NOTIFICATION_IDS[0],
        title,
        body,
        largeIconDrawableName,
        largeIconTintColor,
        weekday: weekday as number,
        hour,
        minute,
      }));
      await FactMeNotification.scheduleDailyNotifications({ notifications });
      return;
    }

    const smallIcon = 'ic_launcher_small';
    const largeIcon = largeIconDrawableName;
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

  async showTestNotification(settings: AppSettings): Promise<boolean> {
    if (!this.platform.is('hybrid')) {
      return false;
    }
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      return false;
    }
    const fact = await this.getCurrentFactFromSettings(settings);
    if (!fact) {
      return false;
    }
    await this.translationService.loadTranslations(
      this.translationService.getLanguage(),
    );
    const title =
      fact.title ??
      this.translationService.translate(NotificationText.FallbackTitle);
    const body =
      fact.description ??
      this.translationService.translate(NotificationText.FallbackBody);
    const largeIconDrawableName = this.getTopicLargeIconName(fact.topic);
    const largeIconTintColor = this.getTopicColor(fact.topic, settings.theme);

    try {
      await FactMeNotification.showTestNotification({
        title,
        body,
        largeIconDrawableName,
        largeIconTintColor,
      });
      return true;
    } catch {
      return false;
    }
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

  private getTopicColor(topic: TopicKey, theme: Theme): string {
    const dark: Record<string, string> = {
      [Topic.History]: '#ffb457',
      [Topic.Science]: '#66bbff',
      [Topic.WorldEvents]: '#22c55e',
      [Topic.Technology]: '#9fa8da',
      [Topic.Music]: '#f48fb1',
      [Topic.Movies]: '#ffe082',
      [Topic.Sports]: '#f97316',
      [Topic.FunFacts]: '#14b8a6',
      [Topic.Literature]: '#ba68c8',
      [Topic.Psychology]: '#80deea',
    };
    const light: Record<string, string> = {
      [Topic.History]: '#fbbf24',
      [Topic.Science]: '#0284c7',
      [Topic.WorldEvents]: '#22c55e',
      [Topic.Technology]: '#4f46e5',
      [Topic.Music]: '#be185d',
      [Topic.Movies]: '#8b5cf6',
      [Topic.Sports]: '#fb923c',
      [Topic.FunFacts]: '#5eead4',
      [Topic.Literature]: '#ba68c8',
      [Topic.Psychology]: '#3b82f6',
    };
    const colors = theme === 'light' ? light : dark;
    return colors[topic] ?? '#26A69A';
  }

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
