import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AppSettings,
  ALL_TOPICS,
  ALL_WEEKDAYS,
  TopicKey,
  Weekday,
} from '../models/fact.models';
import { SettingsService } from '../services/settings.service';
import { NotificationService } from '../services/notification.service';
import { SettingsText } from '../enums/settings-text.enum';
import { TranslationService } from '../services/translation.service';
import { Language } from '../enums/language.enum';
import { ToastController } from '@ionic/angular';
import { Subject, EMPTY, from } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {
  topics = ALL_TOPICS;
  settings!: AppSettings;
  settingsText = SettingsText;
  defaultLanguage = Language.English;
  languages = [
    { code: Language.English, label: 'English', flag: '🇺🇸' },
    { code: Language.German, label: 'Deutsch', flag: '🇩🇪' },
    { code: Language.Ukrainian, label: 'Українська', flag: '🇺🇦' },
    { code: Language.Hungarian, label: 'Magyar', flag: '🇭🇺' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private translationService: TranslationService,
    private toastController: ToastController,
  ) {}

  ngOnInit(): void {
    this.settings = this.settingsService.getSettings();

    this.settingsService.settingsChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => {
        if (s) {
          this.settings = s;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canClearSeenFacts(): boolean {
    return this.settingsService.hasShownFactsHistory(this.settings);
  }

  isTopicSelected(topic: TopicKey): boolean {
    return this.settings.selectedTopics.includes(topic);
  }

  isAllTopicsSelected(): boolean {
    return (
      this.settings.selectedTopics.length === this.topics.length &&
      this.topics.every((t) => this.settings.selectedTopics.includes(t))
    );
  }

  get allTopicsLabel(): string {
    return this.isAllTopicsSelected()
      ? SettingsText.TopicsAllChipUnselect
      : SettingsText.TopicsAllChipAll;
  }

  toggleAllTopics(): void {
    if (this.isAllTopicsSelected()) {
      this.settings = this.settingsService.update({
        selectedTopics: [],
      });
    } else {
      this.settings = this.settingsService.update({
        selectedTopics: [...ALL_TOPICS],
      });
    }
  }

  onTopicChipClicked(topic: TopicKey): void {
    const current = new Set<TopicKey>(this.settings.selectedTopics);
    if (current.has(topic)) {
      current.delete(topic);
    } else {
      current.add(topic);
    }

    this.settings = this.settingsService.update({
      selectedTopics: Array.from(current) as TopicKey[],
    });
  }

  onOnePerTopicChange(enabled: boolean): void {
    this.settings = this.settingsService.update({
      onePerTopic: enabled,
    });
  }

  onThemeToggleChange(enabled: boolean): void {
    this.settings = this.settingsService.update({
      theme: enabled ? 'light' : 'dark',
    });
  }

  onLanguageChange(lang: Language): void {
    this.settings = this.settingsService.update({ language: lang });
    this.translationService.setLanguage(lang);

    this.translationService
      .loadTranslations$(lang)
      .pipe(
        switchMap(() =>
          this.notificationService.rescheduleDailyNotification$(this.settings),
        ),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  onNotificationsToggleChange(enabled: boolean): void {
    if (enabled) {
      this.settings = this.settingsService.update({
        notificationsEnabled: true,
        notificationWeekdays: [...ALL_WEEKDAYS],
      });
    } else {
      this.settings = this.settingsService.update({
        notificationsEnabled: false,
        notificationWeekdays: [],
      });
    }

    this.notificationService
      .rescheduleDailyNotification$(this.settings)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  onTimeChanged(time: string | string[] | null): void {
    const value = Array.isArray(time) ? time[0] ?? null : time ?? null;

    if (!value) {
      return;
    }
    this.settings = this.settingsService.update({
      notificationTime: value,
    });

    this.notificationService
      .rescheduleDailyNotification$(this.settings)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  onNotificationWeekdaysChanged(days: Weekday[]): void {
    const hasDays = !!days?.length;
    this.settings = this.settingsService.update({
      notificationWeekdays: days,
      notificationsEnabled: hasDays,
    });

    this.notificationService
      .rescheduleDailyNotification$(this.settings)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  onTestNotification(): void {
    this.notificationService
      .showTestNotification$(this.settings)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  onClearSeenFacts(): void {
    if (!this.canClearSeenFacts) {
      return;
    }
    this.settings = this.settingsService.clearShownFactsHistory();

    this.showDataClearedToast()
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  private showDataClearedToast() {
    const message = this.translationService.translate(SettingsText.DataClearedToast);
    return from(
      this.toastController.create({
        message,
        duration: 2000,
        position: 'bottom',
        color: 'primary',
      }),
    ).pipe(
      switchMap((toast) => from(toast.present())),
    );
  }
}

