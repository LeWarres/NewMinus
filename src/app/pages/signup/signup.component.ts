import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TurnstileWidgetComponent } from '../../components/turnstile-widget/turnstile-widget.component';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import {
  COUNTRY_OPTIONS,
  CountryOption,
  READING_LANGUAGE_OPTIONS,
  ReadingLanguageOption
} from '../../shared/options/profile-options';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TurnstileWidgetComponent
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  trackByCountryName(index: number, country: CountryOption): string {
    return country.code;
  }

  trackByLanguageValue(index: number, language: ReadingLanguageOption): string {
    return language.value;
  }

  @ViewChild(TurnstileWidgetComponent) turnstileWidget?: TurnstileWidgetComponent;

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  nacionalidad = '';

  website = '';
  turnstileToken = '';

  mostrarPassword = false;
  mostrarConfirmPassword = false;
  mostrarNsfw = false;
  aceptaTerminos = false;

  cargando = false;
  error = '';
  mensaje = '';
  registroCompletado = false;

  selectedReadingLanguages: string[] = [];

  countries: CountryOption[] = COUNTRY_OPTIONS;

  readingLanguages: ReadingLanguageOption[] = READING_LANGUAGE_OPTIONS;

  constructor(
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {
    this.selectedReadingLanguages = [
      this.getDefaultReadingLanguage()
    ];
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        registered: '1'
      }
    });
  }

  resetTurnstile(): void {
    this.turnstileToken = '';
    this.turnstileWidget?.reset();
  }

  isReadingLanguageSelected(value: string): boolean {
    return this.selectedReadingLanguages.includes(value);
  }

  toggleReadingLanguage(value: string): void {
    if (this.isReadingLanguageSelected(value)) {
      this.selectedReadingLanguages = this.selectedReadingLanguages.filter(
        idioma => idioma !== value
      );

      this.error = '';
      return;
    }

    this.selectedReadingLanguages = [
      ...this.selectedReadingLanguages,
      value
    ];

    this.error = '';
  }

  getCountryLabel(country: CountryOption): string {
    const locale = this.getCurrentLocale();

    try {
      const displayNames = new Intl.DisplayNames([locale], {
        type: 'region'
      });

      const localizedName = displayNames.of(country.code);

      if (localizedName) {
        return localizedName;
      }
    } catch {
      // Fallback para navegadores antiguos.
    }

    const translated = this.translationService.getTranslation(country.labelKey);

    if (!translated || translated === country.labelKey) {
      return country.name;
    }

    return translated;
  }

  private getCurrentLocale(): string {
    const currentLanguage = String(this.translationService.getCurrentLanguage() || 'en')
      .trim()
      .toLowerCase();

    const localeMap: Record<string, string> = {
      es: 'es',
      en: 'en',
      ja: 'ja',
      ko: 'ko',
      zh: 'zh',
      fr: 'fr',
      de: 'de',
      pt: 'pt',
      it: 'it',
      ru: 'ru',
      ar: 'ar',
      hi: 'hi',
      id: 'id',
      vi: 'vi',
      th: 'th',
      tr: 'tr',
      pl: 'pl',
      nl: 'nl'
    };

    return localeMap[currentLanguage] || 'en';
  }

  getReadingLanguageLabel(language: ReadingLanguageOption): string {
    const translated = this.translationService.getTranslation(language.labelKey);

    if (!translated || translated === language.labelKey) {
      return language.nativeLabel;
    }

    if (translated === language.nativeLabel) {
      return translated;
    }

    return `${translated} / ${language.nativeLabel}`;
  }

  register(): void {
    this.error = '';
    this.mensaje = '';

    const username = this.username.trim();
    const email = this.email.trim().toLowerCase();
    const password = this.password;
    const confirmPassword = this.confirmPassword;
    const nacionalidad = this.nacionalidad.trim();
    const idiomasLectura = this.getSelectedReadingLanguages();

    if (!username || !email || !password) {
      this.error = this.translationService.getTranslation('signup.error.complete_required_fields');
      return;
    }

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      this.error = this.translationService.getTranslation('common.validation.invalid_username');
      return;
    }

    if (password.length < 8) {
      this.error = this.translationService.getTranslation('common.validation.password_min_length');
      return;
    }

    if (password !== confirmPassword) {
      this.error = this.translationService.getTranslation('common.validation.passwords_mismatch');
      return;
    }

    if (idiomasLectura.length === 0) {
      this.error = this.translationService.getTranslation('common.validation.select_reading_language');
      return;
    }

    if (!this.aceptaTerminos) {
      this.error = this.translationService.getTranslation('signup.error.accept_terms_required');
      return;
    }

    if (!this.turnstileToken) {
      this.error = this.translationService.getTranslation('common.validation.turnstile_required');
      return;
    }

    this.cargando = true;

    this.authService.fetchCsrfToken().subscribe({
      next: (csrfRes) => {
        if (!csrfRes.success || !csrfRes.csrfToken) {
          this.cargando = false;
          this.error = this.translationService.getTranslation('signup.error.prepare_registration_failed');
          this.resetTurnstile();
          return;
        }

        this.authService.saveCsrfToken(csrfRes.csrfToken);

        this.authService.register({
          username,
          email,
          password,
          nacionalidad,
          idiomasLectura,
          idiomaInterfaz: this.translationService.getCurrentLanguage(),
          mostrarNsfw: this.mostrarNsfw,
          website: this.website,
          turnstileToken: this.turnstileToken
        }).subscribe({
          next: (res) => {
            this.cargando = false;

            if (!res.success) {
              this.error =
                res.error ||
                this.translationService.getTranslation('signup.error.registration_failed');

              this.resetTurnstile();
              return;
            }

            this.authService.clearSession();

            this.registroCompletado = true;
            this.mensaje =
              res.mensaje ||
              this.translationService.getTranslation(
                'common.notice.account_created'
              );

            this.username = '';
            this.email = '';
            this.password = '';
            this.confirmPassword = '';
            this.nacionalidad = '';
            this.mostrarNsfw = false;
            this.aceptaTerminos = false;
            this.selectedReadingLanguages = [
              this.getDefaultReadingLanguage()
            ];
            this.turnstileToken = '';
          },
          error: (err) => {
            this.cargando = false;
            this.error =
              err.error?.error ||
              this.translationService.getTranslation('signup.error.registration_error');

            this.resetTurnstile();
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.translationService.getTranslation('signup.error.prepare_registration_failed');
        this.resetTurnstile();
        console.error(err);
      }
    });
  }

  private getSelectedReadingLanguages(): string[] {
    const allowed = this.readingLanguages.map(language => language.value);

    return this.selectedReadingLanguages.filter(
      (language, index, array) =>
        allowed.includes(language) &&
        array.indexOf(language) === index
    );
  }

  private getDefaultReadingLanguage(): string {
    const currentLanguage = this.translationService.getCurrentLanguage();

    if (currentLanguage === 'es') {
      return 'ES';
    }

    return 'EN';
  }
}