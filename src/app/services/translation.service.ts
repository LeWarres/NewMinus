import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

type TranslationDictionary = Record<string, string>;

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly i18nBasePath = '/i18n';
  private readonly fallbackLanguage = 'en';

  private readonly supportedLanguages = [
    'es',
    'en',
    'ja',
    'ko',
    'zh',
    'fr',
    'de',
    'pt',
    'it',
    'ru',
    'ar',
    'hi',
    'id',
    'vi',
    'th',
    'tr',
    'pl',
    'nl'
  ];

  private translations: Record<string, TranslationDictionary> = {};
  private loadingLanguages = new Set<string>();

  private languageSubject = new BehaviorSubject<string>(
    this.getInitialLanguage()
  );

  currentLanguage$ = this.languageSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {
    this.loadLanguage(this.fallbackLanguage).subscribe();

    const initialLanguage = this.languageSubject.value;

    if (initialLanguage !== this.fallbackLanguage) {
      this.loadLanguage(initialLanguage).subscribe();
    }
  }

  getCurrentLanguage(): string {
    return this.languageSubject.value;
  }

  getTranslation(key: string): string {
    const currentLanguage = this.normalizeLanguage(this.languageSubject.value);

    return (
      this.translations[currentLanguage]?.[key] ||
      this.translations[this.fallbackLanguage]?.[key] ||
      key
    );
  }

  setLanguage(language: string): void {
    const normalizedLanguage = this.normalizeLanguage(language);

    localStorage.setItem('language', normalizedLanguage);
    localStorage.setItem('contentLanguage', normalizedLanguage.toUpperCase());

    if (this.translations[normalizedLanguage]) {
      this.languageSubject.next(normalizedLanguage);
      this.dispatchContentLanguageChanged(normalizedLanguage);
      return;
    }

    this.loadLanguage(normalizedLanguage).subscribe({
      next: () => {
        this.languageSubject.next(normalizedLanguage);
        this.dispatchContentLanguageChanged(normalizedLanguage);
      }
    });
  }

  isLanguageSupported(language: string): boolean {
    const normalizedLanguage = this.normalizeLanguage(language);
    return this.supportedLanguages.includes(normalizedLanguage);
  }

  private loadLanguage(language: string): Observable<TranslationDictionary> {
    const normalizedLanguage = this.normalizeLanguage(language);

    const existingDictionary = this.translations[normalizedLanguage];

    if (existingDictionary) {
      return of<TranslationDictionary>(existingDictionary);
    }

    if (this.loadingLanguages.has(normalizedLanguage)) {
      const emptyDictionary: TranslationDictionary = {};
      return of<TranslationDictionary>(emptyDictionary);
    }

    this.loadingLanguages.add(normalizedLanguage);

    return this.http
      .get<TranslationDictionary>(`${this.i18nBasePath}/${normalizedLanguage}.json`)
      .pipe(
        tap((dictionary) => {
          this.translations[normalizedLanguage] = dictionary || {};
          this.loadingLanguages.delete(normalizedLanguage);
        }),
        map((dictionary) => {
          return dictionary || {};
        }),
        catchError((error) => {
          this.loadingLanguages.delete(normalizedLanguage);

          console.warn(
            `No se pudo cargar el idioma ${normalizedLanguage}. Se usará fallback.`,
            error
          );

          const emptyDictionary: TranslationDictionary = {};
          return of<TranslationDictionary>(emptyDictionary);
        })
      );
  }

  private getInitialLanguage(): string {
    const savedLanguage =
      localStorage.getItem('language') ||
      localStorage.getItem('contentLanguage') ||
      this.getBrowserLanguage() ||
      this.fallbackLanguage;

    return this.normalizeLanguage(savedLanguage);
  }

  private getBrowserLanguage(): string {
    const browserLanguage = navigator.language || this.fallbackLanguage;
    return browserLanguage.split('-')[0] || this.fallbackLanguage;
  }

  private normalizeLanguage(language: string): string {
    const normalizedLanguage = String(language || '')
      .trim()
      .toLowerCase();

    if (this.supportedLanguages.includes(normalizedLanguage)) {
      return normalizedLanguage;
    }

    return this.fallbackLanguage;
  }

  private dispatchContentLanguageChanged(language: string): void {
    window.dispatchEvent(
      new CustomEvent('contentLanguageChanged', {
        detail: {
          language: language.toUpperCase()
        }
      })
    );
  }
}
