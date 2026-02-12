import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of, firstValueFrom, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Language } from '../enums/language.enum';

type TranslationDictionary = Record<string, string>;

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private currentLanguage: Language = Language.English;
  private languageSubject = new BehaviorSubject<Language>(this.currentLanguage);
  readonly languageChanges$ = this.languageSubject.asObservable();

  private translationsCache: Map<Language, TranslationDictionary> = new Map();
  private loadingPromises: Map<Language, Promise<TranslationDictionary>> = new Map();

  constructor(private http: HttpClient) {}

  setLanguage(lang: Language): void {
    if (this.currentLanguage !== lang) {
      this.currentLanguage = lang;
      this.languageSubject.next(lang);
    }
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Load translations for a specific language.
   * Returns a Promise that resolves when translations are loaded.
   */
  async loadTranslations(lang: Language): Promise<TranslationDictionary> {
    if (this.translationsCache.has(lang)) {
      return Promise.resolve(this.translationsCache.get(lang)!);
    }

    if (this.loadingPromises.has(lang)) {
      return this.loadingPromises.get(lang)!;
    }

    const loadPromise = firstValueFrom(
      this.http.get<Record<string, unknown>>(`assets/i18n/${lang}.json`).pipe(
        map((data) => this.flattenDictionary(data)),
        catchError((error) => {
          console.error(`Failed to load translations for ${lang}:`, error);
          if (lang !== Language.English && !this.loadingPromises.has(Language.English)) {
            return from(this.loadTranslations(Language.English));
          }
          return of({} as TranslationDictionary);
        }),
      ),
    ).then((dict) => {
      this.translationsCache.set(lang, dict);
      this.loadingPromises.delete(lang);
      return dict;
    });

    this.loadingPromises.set(lang, loadPromise);
    return loadPromise;
  }

  /**
   * Get translation for a key. Supports dot notation for nested keys.
   * Example: 'header.appTitleHome' or 'settings.topicsSectionTitle'
   */
  translate(key: string): string {
    const dict = this.translationsCache.get(this.currentLanguage);
    if (!dict) {
      return key;
    }
    return dict[key] ?? key;
  }

  /**
   * Get translation for a key, ensuring translations are loaded first.
   * Use this when translations might not be loaded yet.
   */
  async tAsync(key: string): Promise<string> {
    await this.loadTranslations(this.currentLanguage);
    return this.translate(key);
  }

  /**
   * Flatten nested object into dot-notation keys
   * Example: { header: { appTitle: "Title" } } -> { "header.appTitle": "Title" }
   */
  private flattenDictionary(
    obj: Record<string, unknown>,
    prefix = '',
  ): TranslationDictionary {
    const result: TranslationDictionary = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenDictionary(value as Record<string, unknown>, newKey));
      } else {
        result[newKey] = String(value ?? '');
      }
    }

    return result;
  }
}
