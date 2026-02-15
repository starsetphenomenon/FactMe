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

interface TopicCacheEntry {
  loaded: boolean;
  data?: TopicFactsFile;
}

function topicCacheKey(topic: TopicKey, lang: Language): string {
  return `${lang}|${topic}`;
}

@Injectable({
  providedIn: 'root',
})
export class FactService {
  private cache = new Map<string, TopicCacheEntry>();

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
    const lang = this.settingsService.getSettings().language ?? Language.English;
    const key = topicCacheKey(topic, lang);
    const cached = this.cache.get(key);
    if (cached?.loaded && cached.data) {
      return cached.data;
    }

    let file: TopicFactsFile | undefined;
    try {
      file = await this.http
        .get<TopicFactsFile>(`assets/facts/${lang}/${topic}.json`)
        .toPromise();
    } catch {
      if (lang !== Language.English) {
        try {
          file = await this.http
            .get<TopicFactsFile>(`assets/facts/en/${topic}.json`)
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

    this.cache.set(key, { loaded: true, data });
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
