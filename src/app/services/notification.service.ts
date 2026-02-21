import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  FactMeNotification,
  NotificationFactEntry,
  NotificationFactsByDate,
} from '../plugins/fact-me-notification.plugin';
import { AppSettings, Fact, Weekday, ALL_TOPICS, TopicKey, Theme } from '../models/fact.models';
import { NotificationText } from '../enums/notification-text.enum';
import { Topic } from '../enums/topic.enum';
import { TranslationService } from './translation.service';
import { FactService } from './fact.service';
import { from, of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';

const DAILY_FACT_NOTIFICATION_IDS = [1, 2, 3, 4, 5, 6, 7];
const NOTIFICATION_FACTS_DAYS = 14;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private platform: Platform,
    private translationService: TranslationService,
    private factService: FactService,
  ) {}

  ensurePermissions$() {
    if (!this.platform.is('hybrid')) {
      return of(false);
    }

    return from(LocalNotifications.checkPermissions()).pipe(
      switchMap(({ display }) => {
        if (display === 'granted') {
          return of(true);
        }
        return from(LocalNotifications.requestPermissions()).pipe(
          map((result) => result.display === 'granted'),
        );
      }),
    );
  }

  rescheduleDailyNotification$(
    settings: AppSettings,
    fact?: Fact | null,
  ) {
    if (!this.platform.is('hybrid')) {
      return of(void 0);
    }

    const weekdays = settings.notificationWeekdays;
    const useNativeScheduling = Capacitor.getPlatform() === 'android';

    return from(
      LocalNotifications.cancel({
        notifications: DAILY_FACT_NOTIFICATION_IDS.map((id) => ({ id })),
      }),
    ).pipe(
      concatMap(() =>
        useNativeScheduling
          ? from(FactMeNotification.cancelDailyNotifications({
              ids: DAILY_FACT_NOTIFICATION_IDS,
            }))
          : of(void 0),
      ),
      concatMap(() => {
        if (weekdays.length === 0) {
          return of(void 0);
        }

        return this.getCurrentFactFromSettings$(settings, fact).pipe(
          concatMap((effectiveFact) => {
            if (!effectiveFact) {
              return of(void 0);
            }

            return this.ensurePermissions$().pipe(
              concatMap((hasPermission) => {
                if (!hasPermission) {
                  return of(void 0);
                }

                return this.translationService
                  .loadTranslations$(this.translationService.getLanguage())
                  .pipe(
                    concatMap(() => {
                      const title =
                        effectiveFact.title ??
                        this.translationService.translate(NotificationText.FallbackTitle);
                      const body =
                        effectiveFact.description ??
                        this.translationService.translate(NotificationText.FallbackBody);

                      const [hourStr, minuteStr] = settings.notificationTime.split(':');
                      const hour = Number(hourStr ?? 9);
                      const minute = Number(minuteStr ?? 0);

                      const largeIconDrawableName = this.getTopicLargeIconName(effectiveFact.topic);
                      const largeIconTintColor = this.getTopicColor(effectiveFact.topic, settings.theme);

                      if (useNativeScheduling) {
                        return from(
                          FactMeNotification.setNotificationSoundOptions({
                            soundEnabled: settings.notificationSoundEnabled,
                          }),
                        ).pipe(
                          concatMap(() => this.buildNotificationFactsByDate$(settings)),
                          concatMap((factsByDate) => {
                            const ops = [];
                            if (Object.keys(factsByDate).length > 0) {
                              ops.push(
                                from(FactMeNotification.setNotificationFacts({ facts: factsByDate })),
                              );
                            }

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

                            ops.push(
                              from(FactMeNotification.scheduleDailyNotifications({ notifications })),
                            );

                            return ops.length ? ops[ops.length - 1] : of(void 0);
                          }),
                        );
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

                      return from(LocalNotifications.schedule({ notifications }));
                    }),
                  );
              }),
            );
          }),
        );
      }),
      catchError(() => of(void 0)),
    );
  }

  showTestNotification$(settings: AppSettings) {
    if (!this.platform.is('hybrid')) {
      return of(false);
    }

    return this.ensurePermissions$().pipe(
      concatMap((hasPermission) => {
        if (!hasPermission) {
          return of(false);
        }
        return this.getCurrentFactFromSettings$(settings).pipe(
          concatMap((fact) => {
            if (!fact) {
              return of(false);
            }
            return this.translationService
              .loadTranslations$(this.translationService.getLanguage())
              .pipe(
                concatMap(() => {
                  const title =
                    fact.title ??
                    this.translationService.translate(NotificationText.FallbackTitle);
                  const body =
                    fact.description ??
                    this.translationService.translate(NotificationText.FallbackBody);
                  const largeIconDrawableName = this.getTopicLargeIconName(fact.topic);
                  const largeIconTintColor = this.getTopicColor(fact.topic, settings.theme);

                  return from(
                    FactMeNotification.setNotificationSoundOptions({
                      soundEnabled: settings.notificationSoundEnabled,
                    }),
                  ).pipe(
                    concatMap(() =>
                      from(
                        FactMeNotification.showTestNotification({
                          title,
                          body,
                          largeIconDrawableName,
                          largeIconTintColor,
                        }),
                      ),
                    ),
                    map(() => true),
                    catchError(() => of(false)),
                  );
                }),
              );
          }),
        );
      }),
    );
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
      [Topic.FilmTv]: '#ffe082',
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
      [Topic.FilmTv]: '#8b5cf6',
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
      Topic.FilmTv,
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

  private getCurrentFactFromSettings$(settings: AppSettings, override?: Fact | null) {
    if (override) {
      return of(override);
    }

    const currentId = settings.currentFactIds?.[0];
    if (!currentId) {
      return of(null);
    }
    const topics =
      settings.selectedTopics?.length > 0
        ? settings.selectedTopics
        : ALL_TOPICS;
    return this.factService.getFactById(currentId, topics);
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private buildNotificationFactsByDate$(
    settings: AppSettings,
  ) {
    const topics =
      settings.selectedTopics?.length > 0
        ? settings.selectedTopics
        : ALL_TOPICS;
    const result: NotificationFactsByDate = {};
    const fallbackTitle = this.translationService.translate(
      NotificationText.FallbackTitle,
    );
    const fallbackBody = this.translationService.translate(
      NotificationText.FallbackBody,
    );
    const start = new Date();

    return from(Array.from({ length: NOTIFICATION_FACTS_DAYS }, (_, i) => i)).pipe(
      concatMap((i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return this.factService.getRandomFactForDate$(d, topics).pipe(
          map((fact) => {
            const entry: NotificationFactEntry = {
              title: fact?.title ?? fallbackTitle,
              body: fact?.description ?? fallbackBody,
            };
            if (fact) {
              entry.largeIconDrawableName = this.getTopicLargeIconName(fact.topic);
              entry.largeIconTintColor = this.getTopicColor(fact.topic, settings.theme);
            }
            result[this.toIsoDate(d)] = entry;
          }),
        );
      }),
      map(() => result),
    );
  }
}
