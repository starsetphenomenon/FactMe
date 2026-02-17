import { Component, OnDestroy, OnInit } from '@angular/core';
import { RefresherCustomEvent, ViewWillEnter } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { ALL_TOPICS, AppSettings, Fact, TopicKey } from '../models/fact.models';
import { FactService } from '../services/fact.service';
import { SettingsService } from '../services/settings.service';
import { NotificationService } from '../services/notification.service';
import { HomeText } from '../enums/home-text.enum';
import { Language } from '../enums/language.enum';

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
  private loadMutex: Promise<void> | null = null;

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
      initialSettings.language ?? null,
    );

    this.settingsService.settingsChanges$
      .pipe(
        takeUntil(this.destroy$),
        tap((settings) => {
          if (!settings) return;
          const key = this.buildSettingsKey(
            settings.selectedTopics ?? [],
            settings.onePerTopic,
            settings.language ?? null,
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
    const settings = this.settingsService.getSettings();
    const key = this.buildSettingsKey(
      settings.selectedTopics ?? [],
      settings.onePerTopic,
      settings.language ?? null,
    );
    if (key !== this.lastSettingsKey) {
      this.lastSettingsKey = key;
      void this.loadTodayFact();
      return;
    }
    void this.restoreFromStorage();
  }

  get fact(): Fact | null {
    return this.facts.length ? this.facts[0] : null;
  }

  /** Ukrainian is 'uk', not 'ua' locale for date formatting */
  private static readonly LANGUAGE_LOCALE: Record<Language, string> = {
    [Language.English]: 'en',
    [Language.German]: 'de',
    [Language.Ukrainian]: 'uk',
    [Language.Hungarian]: 'hu',
  };

  get dateLabel(): string {
    const lang = this.settingsService.getSettings().language;
    const locale = lang != null ? HomePage.LANGUAGE_LOCALE[lang] : undefined;
    return this.today.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private async restoreFromStorage(): Promise<void> {
    if (this.loadMutex) {
      await this.loadMutex;
      return;
    }
    const promise = this.doRestoreFromStorage();
    this.loadMutex = promise;
    try {
      await promise;
    } finally {
      this.loadMutex = null;
    }
  }

  private async doRestoreFromStorage(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);

    try {
      if (settings.lastShownDate !== todayIso) {
        await this.runLoadTodayFact();
        return;
      }

      if (
        settings.currentFactsSettingsKey &&
        settings.currentFactsSettingsKey !== this.getCurrentSettingsKey()
      ) {
        await this.runLoadTodayFact();
        return;
      }

      const topics = this.getTopics(settings);
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
        const ids = settings.currentFactIds.length
          ? settings.currentFactIds
          : settings.shownFactIds;
        const restored: Fact[] = [];
        for (const id of ids) {
          const fact = await this.factService.getFactById(id, topics);
          if (fact) restored.push(fact);
        }
        this.facts = restored;
      }

      this.error = settings.currentErrorKey ?? null;

      this.settingsService.setLastFactsLoadSettingsKey(this.getCurrentSettingsKey());

      if (this.facts.length > 0) {
        try {
          await this.notificationService.rescheduleDailyNotification(
            this.settingsService.getSettings(),
            this.facts[0],
          );
        } catch (e) {
          console.warn('Could not reschedule notification:', e);
        }
      }
    } finally {
      this.isLoading = false;
    }
  }

  private async loadTodayFact(): Promise<void> {
    if (this.loadMutex) {
      await this.loadMutex;
      return;
    }
    const promise = this.runLoadTodayFact();
    this.loadMutex = promise;
    try {
      await promise;
    } finally {
      this.loadMutex = null;
    }
  }

  private async runLoadTodayFact(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const settingsKey = this.getCurrentSettingsKey();

    try {
      if (settings.currentFactsSettingsKey && settings.currentFactsSettingsKey !== settingsKey && this.facts.length > 0) {
        this.settingsService.removeShownFactIdsForDate(
          todayIso,
          this.facts.map((f) => f.id),
        );
      }

      let alreadyShownIds = this.settingsService.getShownFactIdsForDate(
        todayIso,
      );

      if (this.facts.length > 0) {
        const currentIds = new Set(this.facts.map((f) => f.id));
        alreadyShownIds = alreadyShownIds.filter((id) => !currentIds.has(id));
      }

      if (!settings.onePerTopic) {
        const fact = await this.loadSingleRandomFact(alreadyShownIds, settings);
        if (!fact) {
          await this.applyStateAndPersist(
            [],
            this.getMessageKeyForNoFacts(alreadyShownIds.length, settings),
            settingsKey,
          );
          return;
        }
        this.settingsService.addShownFactIdForDate(todayIso, fact.id);
        await this.applyStateAndPersist([fact], null, settingsKey);
      } else {
        const newFacts = await this.loadFactsOnePerTopic(todayIso, alreadyShownIds, settings);
        if (!newFacts.length) {
          await this.applyStateAndPersist(
            [],
            this.getMessageKeyForNoFacts(alreadyShownIds.length, settings),
            settingsKey,
          );
          return;
        }
        await this.applyStateAndPersist(newFacts, null, settingsKey);
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

  private buildSettingsKey(selectedTopics: TopicKey[], onePerTopic: boolean, language: Language | null): string {
    const topicsKey = [...selectedTopics].sort().join(',');
    const lang = language ?? Language.English;
    return `${onePerTopic ? '1' : '0'}|${lang}|${topicsKey}`;
  }

  private getTopics(settings: AppSettings): TopicKey[] {
    return (settings.selectedTopics?.length ?? 0) > 0 ? settings.selectedTopics! : ALL_TOPICS;
  }

  private getCurrentSettingsKey(): string {
    const settings = this.settingsService.getSettings();
    return this.buildSettingsKey(
      settings.selectedTopics ?? [],
      settings.onePerTopic,
      settings.language ?? null,
    );
  }

  private getMessageKeyForNoFacts(alreadyShownCount: number, settings: AppSettings): HomeText {
    return alreadyShownCount > 0 ? HomeText.AllSeenMessage : this.getEmptyMessageKey(settings);
  }

  private async applyStateAndPersist(
    facts: Fact[],
    errorKey: HomeText | null,
    settingsKey: string,
  ): Promise<void> {
    this.facts = facts;
    this.error = errorKey;
    this.settingsService.update({
      currentFactIds: facts.map((f) => f.id),
      currentErrorKey: errorKey,
      currentFactsSettingsKey: settingsKey,
    });
    this.settingsService.setLastFactsLoadSettingsKey(settingsKey);
    try {
      await this.notificationService.rescheduleDailyNotification(
        this.settingsService.getSettings(),
        facts.length > 0 ? facts[0] : undefined,
      );
    } catch (e) {
      console.warn('Could not reschedule notification:', e);
    }
  }

  private async loadSingleRandomFact(
    alreadyShownIds: string[],
    settings: AppSettings,
  ): Promise<Fact | null> {
    const topics = this.getTopics(settings);
    return this.factService.getRandomFactForDate(this.today, topics, alreadyShownIds);
  }

  private async loadFactsOnePerTopic(
    todayIso: string,
    alreadyShownIds: string[],
    settings: AppSettings,
  ): Promise<Fact[]> {
    const topics = this.getTopics(settings);
    const newFacts: Fact[] = [];
    const shownSet = new Set(alreadyShownIds);
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
    return newFacts;
  }

  private hasAllTopicsEnabled(settings: AppSettings): boolean {
    const selected = settings.selectedTopics ?? [];
    if (selected.length === 0) return true;
    return (
      selected.length === ALL_TOPICS.length &&
      ALL_TOPICS.every((t) => selected.includes(t))
    );
  }

  private getEmptyMessageKey(settings: AppSettings): HomeText {
    return this.hasAllTopicsEnabled(settings)
      ? HomeText.EmptyMessageAllTopics
      : HomeText.EmptyMessage;
  }

  async onFactSwipeLeft(index: number): Promise<void> {
    if (index < 0 || index >= this.facts.length) return;
    const fact = this.facts[index];
    this.settingsService.addShownFactIdForDate(this.toIsoDate(this.today), fact.id);
    const newFacts = this.facts.filter((_, i) => i !== index);
    const errorKey = newFacts.length ? null : HomeText.AllSeenMessage;
    await this.applyStateAndPersist(newFacts, errorKey, this.getCurrentSettingsKey());
  }

  async onFactSwipeRight(index: number): Promise<void> {
    if (index < 0 || index >= this.facts.length) return;
    const fact = this.facts[index];
    const todayIso = this.toIsoDate(this.today);
    this.settingsService.addShownFactIdForDate(todayIso, fact.id);
    const alreadyShownIds = this.settingsService.getShownFactIdsForDate(todayIso);
    const replacement = await this.factService.getRandomFactForDate(
      this.today,
      [fact.topic],
      alreadyShownIds,
    );
    const newFacts = replacement
      ? [
          ...this.facts.slice(0, index),
          replacement,
          ...this.facts.slice(index + 1),
        ]
      : this.facts.filter((_, i) => i !== index);
    if (replacement) {
      this.settingsService.addShownFactIdForDate(todayIso, replacement.id);
    }
    const errorKey = newFacts.length ? null : HomeText.AllSeenMessage;
    await this.applyStateAndPersist(newFacts, errorKey, this.getCurrentSettingsKey());
  }

  async onPullRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.onNextFact();
    event.target.complete();
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
    const settingsKey = this.getCurrentSettingsKey();
    const alreadyShownIds = this.settingsService.getShownFactIdsForDate(todayIso);

    try {
      if (!settings.onePerTopic) {
        const next = await this.loadSingleRandomFact(alreadyShownIds, settings);
        if (!next) {
          await this.applyStateAndPersist(
            this.facts,
            HomeText.AllSeenMessage,
            settingsKey,
          );
          return;
        }
        this.settingsService.addShownFactIdForDate(todayIso, next.id);
        await this.applyStateAndPersist([next], null, settingsKey);
      } else {
        const newFacts = await this.loadFactsOnePerTopic(todayIso, alreadyShownIds, settings);
        if (!newFacts.length) {
          await this.applyStateAndPersist([], HomeText.AllSeenMessage, settingsKey);
          return;
        }
        await this.applyStateAndPersist(newFacts, null, settingsKey);
      }
    } finally {
      this.isRefreshing = false;
    }
  }
}
