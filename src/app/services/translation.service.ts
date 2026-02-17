import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
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
  private loadingStreams: Map<Language, Observable<TranslationDictionary>> = new Map();

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

  loadTranslations$(lang: Language): Observable<TranslationDictionary> {
    const cached = this.translationsCache.get(lang);
    if (cached) {
      return of(cached);
    }

    const existing = this.loadingStreams.get(lang);
    if (existing) {
      return existing;
    }

    const stream = this.http
      .get<Record<string, unknown>>(`assets/i18n/${lang}.json`)
      .pipe(
        map((data) => this.flattenDictionary(data)),
        catchError((error) => {
          console.error(`Failed to load translations for ${lang}:`, error);
          if (lang !== Language.English) {
            return this.loadTranslations$(Language.English);
          }
          return of({} as TranslationDictionary);
        }),
        tap((dict) => {
          this.translationsCache.set(lang, dict);
        }),
        shareReplay(1),
      );

    this.loadingStreams.set(lang, stream);
    return stream;
  }

  translate(key: string): string {
    const dict = this.translationsCache.get(this.currentLanguage);
    if (!dict) {
      return key;
    }
    return dict[key] ?? key;
  }

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
