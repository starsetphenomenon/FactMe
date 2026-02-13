import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
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
  private readonly destroy$ = new Subject<void>();
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

    this.settingsService.settingsChanges$
      .pipe(
        takeUntil(this.destroy$),
        tap((settings) => {
          if (!settings) return;
          const key = this.buildSettingsKey(
            settings.selectedTopics ?? [],
            settings.onePerTopic,
          );
          if (key !== this.lastSettingsKey) {
            this.lastSettingsKey = key;
            void this.loadTodayFact();
          }
        }),
      )
      .subscribe();

    await this.restoreFromStorage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    void this.restoreFromStorage();
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

  private async restoreFromStorage(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);

    try {
      if (settings.lastShownDate !== todayIso) {
        await this.loadTodayFact();
        return;
      }

      const currentKey = this.buildSettingsKey(
        settings.selectedTopics ?? [],
        settings.onePerTopic,
      );

      if (
        settings.currentFactsSettingsKey &&
        settings.currentFactsSettingsKey !== currentKey
      ) {
        await this.loadTodayFact();
        return;
      }

      if (!settings.onePerTopic) {
        if (settings.lastShownFactId) {
          const topics =
            settings.selectedTopics?.length > 0
              ? settings.selectedTopics
              : ALL_TOPICS;
          const fact = await this.factService.getFactById(
            settings.lastShownFactId,
            topics,
          );
          this.facts = fact ? [fact] : [];
        } else {
          this.facts = [];
        }
      } else {
        const ids = settings.currentFactIds.length
          ? settings.currentFactIds
          : settings.shownFactIds;

        const topics =
          settings.selectedTopics?.length > 0
            ? settings.selectedTopics
            : ALL_TOPICS;
        const restored: Fact[] = [];
        for (const id of ids) {
          const fact = await this.factService.getFactById(id, topics);
          if (fact) restored.push(fact);
        }
        this.facts = restored;
      }

      this.error = settings.currentErrorKey ?? null;

      this.settingsService.setLastFactsLoadSettingsKey(
        this.buildSettingsKey(settings.selectedTopics ?? [], settings.onePerTopic),
      );
    } finally {
      this.isLoading = false;
    }
  }

  private async loadTodayFact(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const onePerTopic = settings.onePerTopic;
    const settingsKey = this.buildSettingsKey(
      settings.selectedTopics ?? [],
      settings.onePerTopic,
    );

    try {
      let alreadyShownIds = this.settingsService.getShownFactIdsForDate(
        todayIso,
      );

      if (settings.currentFactsSettingsKey && settings.currentFactsSettingsKey !== settingsKey) {
        alreadyShownIds = [];
      }

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
          this.settingsService.update({
            currentFactIds: [],
            currentErrorKey: HomeText.EmptyMessage,
            currentFactsSettingsKey: settingsKey,
          });
          this.settingsService.setLastFactsLoadSettingsKey(settingsKey);
          return;
        }

        this.facts = [fact];
        this.settingsService.addShownFactIdForDate(todayIso, fact.id);
        this.settingsService.update({
          currentFactIds: [fact.id],
          currentErrorKey: null,
          currentFactsSettingsKey: settingsKey,
        });
        this.settingsService.setLastFactsLoadSettingsKey(
          settingsKey,
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
          this.settingsService.update({
            currentFactIds: [],
            currentErrorKey: HomeText.EmptyMessage,
            currentFactsSettingsKey: settingsKey,
          });
          this.settingsService.setLastFactsLoadSettingsKey(settingsKey);
          return;
        }

        this.facts = newFacts;
        this.settingsService.update({
          currentFactIds: newFacts.map((f) => f.id),
          currentErrorKey: null,
          currentFactsSettingsKey: settingsKey,
        });
        this.settingsService.setLastFactsLoadSettingsKey(
          settingsKey,
        );
        await this.notificationService.rescheduleDailyNotification(
          this.settingsService.getSettings(),
          this.facts[0],
        );
      }
    } catch (e) {
      this.error = HomeText.LoadErrorMessage;
      this.settingsService.update({
        currentErrorKey: HomeText.LoadErrorMessage,
        currentFactsSettingsKey: settingsKey,
      });
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
    const settingsKey = this.buildSettingsKey(
      settings.selectedTopics ?? [],
      settings.onePerTopic,
    );

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
          this.settingsService.update({
            currentFactIds: this.facts.map((f) => f.id),
            currentErrorKey: HomeText.AllSeenMessage,
            currentFactsSettingsKey: settingsKey,
          });
          this.settingsService.setLastFactsLoadSettingsKey(settingsKey);
          return;
        }

        this.facts = [next];
        this.settingsService.addShownFactIdForDate(todayIso, next.id);
        this.settingsService.update({
          currentFactIds: [next.id],
          currentErrorKey: null,
          currentFactsSettingsKey: settingsKey,
        });
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
          this.settingsService.update({
            currentFactIds: [],
            currentErrorKey: HomeText.AllSeenMessage,
            currentFactsSettingsKey: settingsKey,
          });
          this.settingsService.setLastFactsLoadSettingsKey(settingsKey);
          return;
        }

        this.facts = newFacts;
        this.settingsService.update({
          currentFactIds: newFacts.map((f) => f.id),
          currentErrorKey: null,
          currentFactsSettingsKey: settingsKey,
        });
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

