import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ALL_TOPICS, Fact, TopicKey } from '../models/fact.models';
import { Topic } from '../enums/topic.enum';
import { TopicIcon } from '../enums/topic-icon.enum';
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
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
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
      initialSettings.selectedTopics ?? [],
      initialSettings.onePerTopic,
    );

    this.settingsSub = this.settingsService.settingsChanges$.subscribe(
      (settings) => {
        if (!settings) return;
        const key = this.buildSettingsKey(
          settings.selectedTopics ?? [],
          settings.onePerTopic,
        );
        if (key !== this.lastSettingsKey) {
          this.lastSettingsKey = key;
          void this.loadTodayFact();
        }
      },
    );

    await this.restoreFromStorage();
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
  }

  ionViewWillEnter(): void {
    const settings = this.settingsService.getSettings();
    const currentKey = this.buildSettingsKey(
      settings.selectedTopics ?? [],
      settings.onePerTopic,
    );
    const lastKey = this.settingsService.getLastFactsLoadSettingsKey();
    // Refetch when user changed topics/onePerTopic on Settings and came back
    if (lastKey !== undefined && currentKey !== lastKey) {
      void this.loadTodayFact();
    }
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

  getTopicIcon(topic: TopicKey): TopicIcon {
    switch (topic) {
      case Topic.History:
        return TopicIcon.History;
      case Topic.Science:
        return TopicIcon.Science;
      case Topic.WorldEvents:
        return TopicIcon.WorldEvents;
      case Topic.Technology:
        return TopicIcon.Technology;
      case Topic.Music:
        return TopicIcon.Music;
      case Topic.Movies:
        return TopicIcon.Movies;
      case Topic.Sports:
        return TopicIcon.Sports;
      case Topic.FunFacts:
        return TopicIcon.FunFacts;
      case Topic.Literature:
        return TopicIcon.Literature;
      case Topic.Psychology:
        return TopicIcon.Psychology;
      default:
        return TopicIcon.Default;
    }
  }

  /**
   * Restore previously shown fact(s) for today from storage. Does not fetch new facts.
   */
  private async restoreFromStorage(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);

    try {
      // New day: load facts for today (user should see the new day's facts)
      if (settings.lastShownDate !== todayIso) {
        await this.loadTodayFact();
        return;
      }

      const topics =
        settings.selectedTopics?.length > 0
          ? settings.selectedTopics
          : ALL_TOPICS;

      if (!settings.onePerTopic) {
        if (settings.lastShownFactId) {
          const fact = await this.factService.getFactById(
            settings.lastShownFactId,
            topics,
          );
          this.facts = fact ? [fact] : [];
        } else {
          this.facts = [];
        }
      } else {
        const ids = settings.shownFactIds ?? [];
        const restored: Fact[] = [];
        for (const id of ids) {
          const fact = await this.factService.getFactById(id, topics);
          if (fact) restored.push(fact);
        }
        this.facts = restored;
      }

      // If restored data doesn't match current mode (e.g. user toggled multiple facts in Settings),
      // refetch so the list matches onePerTopic and selected topics.
      if (this.factsStaleForCurrentSettings(settings)) {
        await this.loadTodayFact();
      } else {
        this.settingsService.setLastFactsLoadSettingsKey(
          this.buildSettingsKey(settings.selectedTopics ?? [], settings.onePerTopic),
        );
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * True when displayed facts don't match current settings (onePerTopic / selected topics).
   * Used after restore so we refetch when user changed settings on another page.
   */
  private factsStaleForCurrentSettings(settings: { onePerTopic: boolean; selectedTopics?: TopicKey[] }): boolean {
    const selected = settings.selectedTopics ?? [];
    const topics: TopicKey[] = selected.length > 0 ? selected : ALL_TOPICS;
    if (!settings.onePerTopic) {
      return this.facts.length > 1;
    }
    const factTopics = new Set(this.facts.map((f) => f.topic));
    return (
      this.facts.length !== topics.length ||
      !topics.every((t) => factTopics.has(t))
    );
  }

  /**
   * Fetch new fact(s) for today. Only called when the user taps the refresh button.
   */
  private async loadTodayFact(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const onePerTopic = settings.onePerTopic;

    try {
      let alreadyShownIds = this.settingsService.getShownFactIdsForDate(
        todayIso,
      );

      // When reloading due to settings change, keep currently displayed facts in the pool
      // so the list doesn't go empty (e.g. when switching to multiple facts).
      if (this.facts.length > 0) {
        const currentIds = new Set(this.facts.map((f) => f.id));
        alreadyShownIds = alreadyShownIds.filter((id) => !currentIds.has(id));
      }

      if (!onePerTopic) {
        const topics =
          settings.selectedTopics?.length > 0
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
        this.settingsService.setLastFactsLoadSettingsKey(
          this.buildSettingsKey(settings.selectedTopics ?? [], settings.onePerTopic),
        );
        await this.notificationService.rescheduleDailyNotification(
          this.settingsService.getSettings(),
          fact,
        );
      } else {
        const newFacts: Fact[] = [];
        const shownSet = new Set(alreadyShownIds);

        const topics =
          settings.selectedTopics?.length > 0
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
        this.settingsService.setLastFactsLoadSettingsKey(
          this.buildSettingsKey(settings.selectedTopics ?? [], settings.onePerTopic),
        );
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

  private buildSettingsKey(selectedTopics: TopicKey[], onePerTopic: boolean): string {
    const topicsKey = [...selectedTopics].sort().join(',');
    return `${onePerTopic ? '1' : '0'}|${topicsKey}`;
  }

  async onNextFact(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      // First tap of the day: load initial fact(s) instead of "next"
      if (this.facts.length === 0) {
        await this.loadTodayFact();
        this.isRefreshing = false;
        return;
      }
    } catch {
      this.isRefreshing = false;
      return;
    }

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

