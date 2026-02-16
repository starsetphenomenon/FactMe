import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
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

  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private translationService: TranslationService,
    private toastController: ToastController,
  ) {}

  ngOnInit(): void {
    this.settings = this.settingsService.getSettings();
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

  async onLanguageChange(lang: Language): Promise<void> {
    this.settings = this.settingsService.update({ language: lang });
    this.translationService.setLanguage(lang);
    await this.translationService.loadTranslations(lang);
    await this.notificationService.rescheduleDailyNotification(this.settings);
  }

  async onNotificationsToggleChange(enabled: boolean): Promise<void> {
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
    await this.notificationService.rescheduleDailyNotification(this.settings);
  }

  async onTimeChanged(time: string | string[] | null): Promise<void> {
    const value = Array.isArray(time) ? time[0] ?? null : time ?? null;

    if (!value) {
      return;
    }
    this.settings = this.settingsService.update({
      notificationTime: value,
    });
    await this.notificationService.rescheduleDailyNotification(this.settings);
  }

  async onNotificationWeekdaysChanged(days: Weekday[]): Promise<void> {
    const hasDays = !!days?.length;
    this.settings = this.settingsService.update({
      notificationWeekdays: days,
      notificationsEnabled: hasDays,
    });
    await this.notificationService.rescheduleDailyNotification(this.settings);
  }

  async onTestNotification(): Promise<void> {
    await this.notificationService.showTestNotification(this.settings);
  }

  async onClearSeenFacts(): Promise<void> {
    if (!this.canClearSeenFacts) {
      return;
    }
    this.settings = this.settingsService.clearShownFactsHistory();
    await this.showDataClearedToast();
  }

  private async showDataClearedToast(): Promise<void> {
    const message = this.translationService.translate(SettingsText.DataClearedToast);
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'primary',
    });
    await toast.present();
  }
}

