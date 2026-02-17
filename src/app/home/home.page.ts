import { Component, OnDestroy, OnInit } from '@angular/core';
import { RefresherCustomEvent, ViewWillEnter } from '@ionic/angular';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
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
  private lastHasHistory = false;

  constructor(
    private factService: FactService,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    const initialSettings = this.settingsService.getSettings();
    this.lastHasHistory = this.settingsService.hasShownFactsHistory(initialSettings);
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

          const hasHistory = this.settingsService.hasShownFactsHistory(settings);
          const key = this.buildSettingsKey(
            settings.selectedTopics ?? [],
            settings.onePerTopic,
            settings.language ?? null,
          );
          const historyCleared = this.lastHasHistory && !hasHistory;

          if (key !== this.lastSettingsKey || historyCleared) {
            this.lastSettingsKey = key;
            this.lastHasHistory = hasHistory;
            this.runLoadTodayFact$()
              .pipe(takeUntil(this.destroy$))
              .subscribe();
            return;
          }

          this.lastHasHistory = hasHistory;
        }),
      )
      .subscribe();

    this.restoreFromStorage$()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
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
      this.runLoadTodayFact$()
        .pipe(takeUntil(this.destroy$))
        .subscribe();
      return;
    }
    this.restoreFromStorage$()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
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

  private restoreFromStorage$() {
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);

    if (settings.lastShownDate !== todayIso) {
      return this.runLoadTodayFact$();
    }

    if (
      settings.currentFactsSettingsKey &&
      settings.currentFactsSettingsKey !== this.getCurrentSettingsKey()
    ) {
      return this.runLoadTodayFact$();
    }

    const topics = this.getTopics(settings);
    this.isLoading = true;

    if (!settings.onePerTopic) {
      if (settings.lastShownFactId) {
        return this.factService
          .getFactById(settings.lastShownFactId, topics)
          .pipe(
            tap((fact) => {
              this.facts = fact ? [fact] : [];
              this.error = settings.currentErrorKey ?? null;
              this.settingsService.setLastFactsLoadSettingsKey(this.getCurrentSettingsKey());
            }),
            switchMap(() => {
              if (this.facts.length > 0) {
                return this.notificationService
                  .rescheduleDailyNotification$(
                    this.settingsService.getSettings(),
                    this.facts[0],
                  )
                  .pipe(
                    catchError((e) => {
                      console.warn('Could not reschedule notification:', e);
                      return of(void 0);
                    }),
                  );
              }
              return of(void 0);
            }),
            finalize(() => {
              this.isLoading = false;
            }),
          );
      }

      this.facts = [];
      this.error = settings.currentErrorKey ?? null;
      this.settingsService.setLastFactsLoadSettingsKey(this.getCurrentSettingsKey());
      this.isLoading = false;
      return of(void 0);
    }

    const ids = settings.currentFactIds.length
      ? settings.currentFactIds
      : settings.shownFactIds;
    if (!ids.length) {
      this.facts = [];
      this.error = settings.currentErrorKey ?? null;
      this.settingsService.setLastFactsLoadSettingsKey(this.getCurrentSettingsKey());
      this.isLoading = false;
      return of(void 0);
    }

    return forkJoin(ids.map((id) => this.factService.getFactById(id, topics))).pipe(
      tap((facts) => {
        this.facts = (facts.filter((f): f is Fact => !!f));
        this.error = settings.currentErrorKey ?? null;
        this.settingsService.setLastFactsLoadSettingsKey(this.getCurrentSettingsKey());
      }),
      switchMap(() => {
        if (this.facts.length > 0) {
          return this.notificationService
            .rescheduleDailyNotification$(
              this.settingsService.getSettings(),
              this.facts[0],
            )
            .pipe(
              catchError((e) => {
                console.warn('Could not reschedule notification:', e);
                return of(void 0);
              }),
            );
        }
        return of(void 0);
      }),
      finalize(() => {
        this.isLoading = false;
      }),
    );
  }

  private runLoadTodayFact$() {
    this.isLoading = true;
    this.error = null;

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const settingsKey = this.getCurrentSettingsKey();

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

    const settingsSnapshot = { ...settings };

    if (!settingsSnapshot.onePerTopic) {
      const topics = this.getTopics(settingsSnapshot);
      return this.factService
        .getRandomFactForDate$(this.today, topics, alreadyShownIds)
        .pipe(
          switchMap((fact) => {
            if (!fact) {
              return this.applyStateAndPersist$(
                [],
                this.getMessageKeyForNoFacts(alreadyShownIds.length, settingsSnapshot),
                settingsKey,
              );
            }
            this.settingsService.addShownFactIdForDate(todayIso, fact.id);
            return this.applyStateAndPersist$([fact], null, settingsKey);
          }),
          catchError((e) => {
            this.error = HomeText.LoadErrorMessage;
            this.settingsService.update({
              currentErrorKey: HomeText.LoadErrorMessage,
              currentFactsSettingsKey: settingsKey,
            });
            console.error(e);
            return of(void 0);
          }),
          finalize(() => {
            this.isLoading = false;
          }),
        );
    }

    return this.loadFactsOnePerTopic$(todayIso, alreadyShownIds, settingsSnapshot, settingsKey).pipe(
      catchError((e) => {
        this.error = HomeText.LoadErrorMessage;
        this.settingsService.update({
          currentErrorKey: HomeText.LoadErrorMessage,
          currentFactsSettingsKey: settingsKey,
        });
        console.error(e);
        return of(void 0);
      }),
      finalize(() => {
        this.isLoading = false;
      }),
    );
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

  private applyStateAndPersist$(
    facts: Fact[],
    errorKey: HomeText | null,
    settingsKey: string,
  ) {
    this.facts = facts;
    this.error = errorKey;
    this.settingsService.update({
      currentFactIds: facts.map((f) => f.id),
      currentErrorKey: errorKey,
      currentFactsSettingsKey: settingsKey,
    });
    this.settingsService.setLastFactsLoadSettingsKey(settingsKey);

    return this.notificationService
      .rescheduleDailyNotification$(
        this.settingsService.getSettings(),
        facts.length > 0 ? facts[0] : undefined,
      )
      .pipe(
        catchError((e) => {
          console.warn('Could not reschedule notification:', e);
          return of(void 0);
        }),
      );
  }

  private loadFactsOnePerTopic$(
    todayIso: string,
    alreadyShownIds: string[],
    settings: AppSettings,
    settingsKey: string,
  ) {
    const topics = this.getTopics(settings);
    const shownSet = new Set(alreadyShownIds);

    return forkJoin(
      topics.map((topic) =>
        this.factService.getRandomFactForDate$(this.today, [topic], Array.from(shownSet)),
      ),
    ).pipe(
      switchMap((facts) => {
        const newFacts: Fact[] = [];
        facts.forEach((next) => {
          if (next) {
            newFacts.push(next);
            shownSet.add(next.id);
            this.settingsService.addShownFactIdForDate(todayIso, next.id);
          }
        });

        const messageKey = this.getMessageKeyForNoFacts(alreadyShownIds.length, settings);
        if (!newFacts.length) {
          return this.applyStateAndPersist$([], messageKey, settingsKey);
        }
        return this.applyStateAndPersist$(newFacts, null, settingsKey);
      }),
    );
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
  onFactSwipeLeft(index: number): void {
    if (index < 0 || index >= this.facts.length) return;
    const fact = this.facts[index];
    this.settingsService.addShownFactIdForDate(this.toIsoDate(this.today), fact.id);
    const newFacts = this.facts.filter((_, i) => i !== index);
    const errorKey = newFacts.length ? null : HomeText.AllSeenMessage;
    this.applyStateAndPersist$(
      newFacts,
      errorKey,
      this.getCurrentSettingsKey(),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  onFactSwipeRight(index: number): void {
    if (index < 0 || index >= this.facts.length) return;
    const fact = this.facts[index];
    const todayIso = this.toIsoDate(this.today);
    this.settingsService.addShownFactIdForDate(todayIso, fact.id);
    const alreadyShownIds = this.settingsService.getShownFactIdsForDate(todayIso);

    this.factService
      .getRandomFactForDate$(this.today, [fact.topic], alreadyShownIds)
      .pipe(
        switchMap((replacement) => {
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
          return this.applyStateAndPersist$(
            newFacts,
            errorKey,
            this.getCurrentSettingsKey(),
          );
        }),
        catchError(() => of(void 0)),
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  onPullRefresh(event: RefresherCustomEvent): void {
    this.onNextFact$()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => event.target.complete()),
      )
      .subscribe();
  }

  private onNextFact$() {
    if (this.isRefreshing) {
      return of(void 0);
    }

    if (this.error === HomeText.AllSeenMessage) {
      return of(void 0);
    }

    this.isRefreshing = true;

    if (this.facts.length === 0) {
      return this.runLoadTodayFact$().pipe(
        finalize(() => {
          this.isRefreshing = false;
        }),
      );
    }

    const settings = this.settingsService.getSettings();
    const todayIso = this.toIsoDate(this.today);
    const settingsKey = this.getCurrentSettingsKey();
    const alreadyShownIds = this.settingsService.getShownFactIdsForDate(todayIso);

    const settingsSnapshot = { ...settings };

    if (!settingsSnapshot.onePerTopic) {
      const topics = this.getTopics(settingsSnapshot);
      return this.factService
        .getRandomFactForDate$(this.today, topics, alreadyShownIds)
        .pipe(
          switchMap((next) => {
            if (!next) {
              return this.applyStateAndPersist$(
                this.facts,
                HomeText.AllSeenMessage,
                settingsKey,
              );
            }
            this.settingsService.addShownFactIdForDate(todayIso, next.id);
            return this.applyStateAndPersist$([next], null, settingsKey);
          }),
          finalize(() => {
            this.isRefreshing = false;
          }),
        );
    }

    return this.loadFactsOnePerTopic$(todayIso, alreadyShownIds, settingsSnapshot, settingsKey).pipe(
      finalize(() => {
        this.isRefreshing = false;
      }),
    );
  }
}
