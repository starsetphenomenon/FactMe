import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ALL_TOPICS, Fact, TopicKey } from '../models/fact.models';
import { FactService } from '../services/fact.service';
import { SettingsService } from '../services/settings.service';
import { NotificationService } from '../services/notification.service';
import { HomeText } from '../enums/home-text.enum';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  today = new Date();
  facts: Fact[] = [];
  isLoading = true;
  error: string | null = null;
  isRefreshing = false;
  homeText = HomeText;
  private settingsSub?: Subscription;
  private lastSettingsKey?: string;

  constructor(
    private factService: FactService,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
  ) {}

  async ngOnInit(): Promise<void> {
    const initialSettings = this.settingsService.getSettings();
    this.lastSettingsKey = this.buildSettingsKey(
      initialSettings.selectedTopics,
      initialSettings.onePerTopic,
    );

    this.settingsSub = this.settingsService.settingsChanges$.subscribe(
      (settings) => {
        if (!settings) {
          return;
        }
        const key = this.buildSettingsKey(
          settings.selectedTopics,
          settings.onePerTopic,
        );
        if (key !== this.lastSettingsKey) {
          this.lastSettingsKey = key;
          void this.loadTodayFact();
        }
      },
    );

    await this.loadTodayFact();
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
  }

  get fact(): Fact | null {
    return this.facts.length ? this.facts[0] : null;
  }

  get dateLabel(): string {
    return this.today.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get topicLabel(): string {
    return this.fact?.topic
      ? this.fact.topic.charAt(0).toUpperCase() + this.fact.topic.slice(1)
      : '';
  }

  getTopicIcon(topic: TopicKey): string {
    switch (topic) {
      case 'history':
        return 'time-outline';
      case 'science':
        return 'flask-outline';
      case 'world-events':
        return 'earth-outline';
      case 'technology':
        return 'cog-outline';
      case 'music':
        return 'musical-notes-outline';
      case 'movies':
        return 'film-outline';
      case 'sports':
        return 'trophy-outline';
      case 'fun-facts':
        return 'bulb-outline';
      case 'literature':
        return 'book-outline';
      case 'psychology':
        return 'pulse-outline';
      default:
        return 'pricetag-outline';
    }
  }

  private async loadTodayFact(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const onePerTopic = settings.onePerTopic;

    try {
      const alreadyShownIds = this.settingsService.getShownFactIdsForDate(
        todayIso,
      );

      if (!onePerTopic) {
        // Single-fact mode: try to reuse stored fact for today
        if (settings.lastShownDate === todayIso && settings.lastShownFactId) {
          const existing = await this.factService.getFactById(
            settings.lastShownFactId,
            settings.selectedTopics,
          );
          if (existing) {
            this.facts = [existing];
            this.settingsService.addShownFactIdForDate(todayIso, existing.id);
            await this.notificationService.rescheduleDailyNotification(
              this.settingsService.getSettings(),
              existing,
            );
            this.isLoading = false;
            return;
          }
        }

        const topics =
          settings.selectedTopics.length > 0
            ? settings.selectedTopics
            : ALL_TOPICS;

        const fact = await this.factService.getRandomFactForDate(
          this.today,
          topics,
          alreadyShownIds,
        );

        if (!fact) {
          this.facts = [];
          this.error = HomeText.EmptyMessage;
          this.isLoading = false;
          return;
        }

        this.facts = [fact];
        this.settingsService.addShownFactIdForDate(todayIso, fact.id);
        await this.notificationService.rescheduleDailyNotification(
          this.settingsService.getSettings(),
          fact,
        );
      } else {
        // One-fact-per-topic mode
        const newFacts: Fact[] = [];
        const shownSet = new Set(alreadyShownIds);

        const topics =
          settings.selectedTopics.length > 0
            ? settings.selectedTopics
            : ALL_TOPICS;

        for (const topic of topics) {
          const next = await this.factService.getRandomFactForDate(
            this.today,
            [topic],
            Array.from(shownSet),
          );
          if (next) {
            newFacts.push(next);
            shownSet.add(next.id);
            this.settingsService.addShownFactIdForDate(todayIso, next.id);
          }
        }

        if (!newFacts.length) {
          this.facts = [];
          this.error = HomeText.EmptyMessage;
          this.isLoading = false;
          return;
        }

        this.facts = newFacts;
        await this.notificationService.rescheduleDailyNotification(
          this.settingsService.getSettings(),
          this.facts[0],
        );
      }
    } catch (e) {
      this.error = HomeText.LoadErrorMessage;
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private buildSettingsKey(selectedTopics: string[], onePerTopic: boolean): string {
    const topicsKey = [...selectedTopics].sort().join(',');
    return `${onePerTopic ? '1' : '0'}|${topicsKey}`;
  }

  async onNextFact(): Promise<void> {
    if (!this.fact || this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const onePerTopic = settings.onePerTopic;

    const alreadyShownIds = this.settingsService.getShownFactIdsForDate(
      todayIso,
    );

    try {
    if (!onePerTopic) {
      const topics =
        settings.selectedTopics.length > 0
          ? settings.selectedTopics
          : ALL_TOPICS;

      const next = await this.factService.getRandomFactForDate(
          this.today,
        topics,
          alreadyShownIds,
        );

        if (!next) {
          this.error = HomeText.AllSeenMessage;
          return;
        }

        this.facts = [next];
        this.settingsService.addShownFactIdForDate(todayIso, next.id);
        await this.notificationService.rescheduleDailyNotification(
          this.settingsService.getSettings(),
          next,
        );
        this.error = null;
      } else {
        const newFacts: Fact[] = [];
        const shownSet = new Set(alreadyShownIds);

      const topics =
        settings.selectedTopics.length > 0
          ? settings.selectedTopics
          : ALL_TOPICS;

      for (const topic of topics) {
          const next = await this.factService.getRandomFactForDate(
            this.today,
            [topic],
            Array.from(shownSet),
          );
          if (next) {
            newFacts.push(next);
            shownSet.add(next.id);
            this.settingsService.addShownFactIdForDate(todayIso, next.id);
          }
        }

        if (!newFacts.length) {
          this.facts = [];
          this.error = HomeText.AllSeenMessage;
          return;
        }

        this.facts = newFacts;
        await this.notificationService.rescheduleDailyNotification(
          this.settingsService.getSettings(),
          this.facts[0],
        );
        this.error = null;
      }
    } finally {
      this.isRefreshing = false;
    }
  }
}

