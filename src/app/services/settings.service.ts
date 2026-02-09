import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSettings, ALL_TOPICS, TopicKey } from '../models/fact.models';
import { Language } from '../enums/language.enum';

const SETTINGS_KEY = 'dailyFactsSettings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settings: AppSettings | null = null;

  private settingsSubject = new BehaviorSubject<AppSettings | null>(null);
  settingsChanges$ = this.settingsSubject.asObservable();

  getSettings(): AppSettings {
    if (!this.settings) {
      this.settings = this.loadFromStorage();
      this.settingsSubject.next(this.settings);
    }
    return this.settings;
  }

  update(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const merged: AppSettings = {
      ...current,
      ...partial,
    };
    this.settings = merged;
    this.saveToStorage(merged);
    this.settingsSubject.next(merged);
    return merged;
  }

  setLastShown(dateIso: string, factId: string): void {
    this.addShownFactIdForDate(dateIso, factId);
  }

  getShownFactIdsForDate(dateIso: string): string[] {
    const current = this.getSettings();
    if (current.lastShownDate !== dateIso || !Array.isArray(current.shownFactIds)) {
      return [];
    }
    return current.shownFactIds;
  }

  addShownFactIdForDate(dateIso: string, factId: string): AppSettings {
    const current = this.getSettings();
    const isSameDay = current.lastShownDate === dateIso;
    const existing = isSameDay && Array.isArray(current.shownFactIds)
      ? current.shownFactIds
      : [];

    if (existing.includes(factId)) {
      return this.update({
        lastShownDate: dateIso,
        lastShownFactId: factId,
        shownFactIds: existing,
      });
    }

    return this.update({
      lastShownDate: dateIso,
      lastShownFactId: factId,
      shownFactIds: [...existing, factId],
    });
  }

  private loadFromStorage(): AppSettings {
    if (typeof window === 'undefined') {
      return this.defaultSettings();
    }
return this.defaultSettings();
    /* try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return this.defaultSettings();
      }
      const parsed = JSON.parse(raw) as AppSettings;
      return {
        ...this.defaultSettings(),
        ...parsed,
      };
    } catch {
      return this.defaultSettings();
    } */
  }

  private saveToStorage(settings: AppSettings): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }

  private defaultSettings(): AppSettings {
    return {
      selectedTopics: [...ALL_TOPICS],
      notificationsEnabled: true,
      notificationTime: '09:00',
      lastShownDate: undefined,
      lastShownFactId: undefined,
      shownFactIds: [],
      onePerTopic: false,
      language: Language.English,
    };
  }

  toggleTopic(topic: TopicKey, enabled: boolean): AppSettings {
    const current = this.getSettings();
    const set = new Set<TopicKey>(current.selectedTopics);
    if (enabled) {
      set.add(topic);
    } else {
      set.delete(topic);
    }
    const nextTopics = Array.from(set);
    return this.update({ selectedTopics: nextTopics });
  }
}

