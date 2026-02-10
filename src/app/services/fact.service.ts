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

// Cache facts per topic in memory after first load
interface TopicCacheEntry {
  loaded: boolean;
  data?: TopicFactsFile;
}

@Injectable({
  providedIn: 'root',
})
export class FactService {
  private cache = new Map<TopicKey, TopicCacheEntry>();

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService,
  ) {}

  async getRandomFactForDate(
    date: Date,
    topics: TopicKey[],
    excludeIds?: string[],
  ): Promise<Fact | null> {
    const dateKey = this.toMonthDayKey(date);
    const topicFiles = await Promise.all(
      topics.map((topic) => this.loadTopic(topic)),
    );

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
    return candidates[randomIndex];
  }

  /**
   * Resolve a fact by its id. If the topic is encoded as a prefix
   * like "science-0314-1" we can avoid loading every topic.
   */
  async getFactById(id: string, topics: TopicKey[]): Promise<Fact | null> {
    const topicFromId = this.extractTopicFromId(id);
    const candidateTopics: TopicKey[] =
      topicFromId && topics.includes(topicFromId)
        ? [topicFromId]
        : topics;

    for (const topic of candidateTopics) {
      const file = await this.loadTopic(topic);
      for (const [dateKey, entries] of Object.entries(file.facts)) {
        const match = (entries as FactJsonEntry[]).find((e) => e.id === id);
        if (match) {
          return {
            ...match,
            topic: file.topic,
          };
        }
      }
    }

    return null;
  }

  private async loadTopic(topic: TopicKey): Promise<TopicFactsFile> {
    const cached = this.cache.get(topic);
    if (cached?.loaded && cached.data) {
      return cached.data;
    }

    const lang = this.settingsService.getSettings().language || Language.English;

    let file: TopicFactsFile | undefined;
    try {
      file = await this.http
        .get<TopicFactsFile>(`assets/${lang}/facts/${topic}.json`)
        .toPromise();
    } catch {
      if (lang !== Language.English) {
        try {
          file = await this.http
            .get<TopicFactsFile>(`assets/en/facts/${topic}.json`)
            .toPromise();
        } catch {
          file = undefined;
        }
      }
    }

    const data: TopicFactsFile =
      file ?? ({
        topic,
        facts: {},
      } as TopicFactsFile);

    this.cache.set(topic, { loaded: true, data });
    return data;
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
