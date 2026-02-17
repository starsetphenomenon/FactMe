import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Fact,
  FactJsonEntry,
  TopicFactsFile,
  TopicKey,
} from '../models/fact.models';
import { SettingsService } from './settings.service';
import { Language } from '../enums/language.enum';
import { Topic } from '../enums/topic.enum';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

function topicCacheKey(topic: TopicKey, lang: Language): string {
  return `${lang}|${topic}`;
}

@Injectable({
  providedIn: 'root',
})
export class FactService {
  private cache = new Map<string, TopicFactsFile>();
  private loadingStreams = new Map<string, Observable<TopicFactsFile>>();

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService,
  ) {}

  getRandomFactForDate$(
    date: Date,
    topics: TopicKey[],
    excludeIds?: string[],
  ): Observable<Fact | null> {
    const dateKey = this.toMonthDayKey(date);

    return forkJoin(
      topics.map((topic) => this.loadTopic$(topic)),
    ).pipe(
      map((topicFiles) => {
        const allFactsForDate: Fact[] = [];

        topicFiles.forEach((file) => {
          const entriesForDate = file.facts[dateKey] ?? [];
          entriesForDate.forEach((entry) => {
            allFactsForDate.push({
              ...entry,
              topic: file.topic,
            });
          });
        });

        if (allFactsForDate.length === 0) {
          return null;
        }

        const excludeSet = new Set(excludeIds ?? []);
        const candidates = excludeSet.size
          ? allFactsForDate.filter((f) => !excludeSet.has(f.id))
          : allFactsForDate;

        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex] ?? null;
      }),
    );
  }

  getFactById(id: string, topics: TopicKey[]): Observable<Fact | null> {
    const topicFromId = this.extractTopicFromId(id);
    const candidateTopics: TopicKey[] =
      topicFromId && topics.includes(topicFromId)
        ? [topicFromId]
        : topics;

    if (!candidateTopics.length) {
      return of(null);
    }

    return forkJoin(candidateTopics.map((topic) => this.loadTopic$(topic))).pipe(
      map((files) => {
        for (const file of files) {
          for (const [, entries] of Object.entries(file.facts)) {
            const match = (entries as FactJsonEntry[]).find((e) => e.id === id);
            if (match) {
              return {
                ...match,
                topic: file.topic,
              } as Fact;
            }
          }
        }
        return null;
      }),
    );
  }

  private loadTopic$(topic: TopicKey): Observable<TopicFactsFile> {
    const lang = this.settingsService.getSettings().language ?? Language.English;
    const key = topicCacheKey(topic, lang);

    const cached = this.cache.get(key);
    if (cached) {
      return of(cached);
    }

    const existing = this.loadingStreams.get(key);
    if (existing) {
      return existing;
    }

    const stream = this.http
      .get<TopicFactsFile>(`assets/facts/${lang}/${topic}.json`)
      .pipe(
        catchError(() => {
          if (lang !== Language.English) {
            return this.http.get<TopicFactsFile>(`assets/facts/en/${topic}.json`)
              .pipe(catchError(() =>
                of({
                  topic,
                  facts: {},
                } as TopicFactsFile),
              ));
          }
          return of({
            topic,
            facts: {},
          } as TopicFactsFile);
        }),
        map((file) => {
          const data: TopicFactsFile = file ?? ({
            topic,
            facts: {},
          } as TopicFactsFile);
          this.cache.set(key, data);
          return data;
        }),
        shareReplay(1),
      );

    this.loadingStreams.set(key, stream);
    return stream;
  }

  private toMonthDayKey(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  }

  private extractTopicFromId(id: string): TopicKey | null {
    const prefix = id.split('-')[0] as TopicKey | undefined;
    const validTopics = Object.values(Topic) as TopicKey[];
    return prefix && validTopics.includes(prefix) ? prefix : null;
  }
}
