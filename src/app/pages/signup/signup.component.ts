import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TurnstileWidgetComponent } from '../../components/turnstile-widget/turnstile-widget.component';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

interface ReadingLanguageOption {
  value: string;
  labelKey: string;
  nativeLabel: string;
}

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

  cargando = false;
  error = '';
  mensaje = '';
  registroCompletado = false;

  selectedReadingLanguages: string[] = [];

  countries = [
    { name: 'México' },
    { name: 'Argentina' },
    { name: 'Colombia' },
    { name: 'Chile' },
    { name: 'Perú' },
    { name: 'España' },
    { name: 'Estados Unidos' },
    { name: 'Otro' }
  ];

  readingLanguages: ReadingLanguageOption[] = [
    { value: 'ES', labelKey: 'idioma_es', nativeLabel: 'Español' },
    { value: 'EN', labelKey: 'idioma_en', nativeLabel: 'English' },
    { value: 'JA', labelKey: 'idioma_ja', nativeLabel: '日本語' },
    { value: 'KO', labelKey: 'idioma_ko', nativeLabel: '한국어' },
    { value: 'ZH', labelKey: 'idioma_zh', nativeLabel: '中文' },
    { value: 'FR', labelKey: 'idioma_fr', nativeLabel: 'Français' },
    { value: 'DE', labelKey: 'idioma_de', nativeLabel: 'Deutsch' },
    { value: 'PT', labelKey: 'idioma_pt', nativeLabel: 'Português' },
    { value: 'IT', labelKey: 'idioma_it', nativeLabel: 'Italiano' },
    { value: 'RU', labelKey: 'idioma_ru', nativeLabel: 'Русский' },
    { value: 'AR', labelKey: 'idioma_ar', nativeLabel: 'العربية' },
    { value: 'HI', labelKey: 'idioma_hi', nativeLabel: 'हिन्दी' },
    { value: 'ID', labelKey: 'idioma_id', nativeLabel: 'Bahasa Indonesia' },
    { value: 'VI', labelKey: 'idioma_vi', nativeLabel: 'Tiếng Việt' },
    { value: 'TH', labelKey: 'idioma_th', nativeLabel: 'ไทย' },
    { value: 'TR', labelKey: 'idioma_tr', nativeLabel: 'Türkçe' },
    { value: 'PL', labelKey: 'idioma_pl', nativeLabel: 'Polski' },
    { value: 'NL', labelKey: 'idioma_nl', nativeLabel: 'Nederlands' }
  ];

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
      this.error = this.translationService.getTranslation('Completa usuario, email y contraseña');
      return;
    }

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      this.error = this.translationService.getTranslation('Usuario inválido');
      return;
    }

    if (password.length < 8) {
      this.error = this.translationService.getTranslation('La contraseña debe tener mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      this.error = this.translationService.getTranslation('Las contraseñas no coinciden');
      return;
    }

    if (idiomasLectura.length === 0) {
      this.error = this.translationService.getTranslation('Selecciona al menos un idioma de lectura');
      return;
    }

    if (!this.turnstileToken) {
      this.error = this.translationService.getTranslation('Completa la verificación anti-bot');
      return;
    }

    this.cargando = true;

    this.authService.fetchCsrfToken().subscribe({
      next: (csrfRes) => {
        if (!csrfRes.success || !csrfRes.csrfToken) {
          this.cargando = false;
          this.error = this.translationService.getTranslation('No se pudo preparar el registro');
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
                this.translationService.getTranslation('No fue posible hacer el registro');

              this.resetTurnstile();
              return;
            }

            this.authService.clearSession();

            this.registroCompletado = true;
            this.mensaje =
              res.mensaje ||
              this.translationService.getTranslation(
                'Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesión.'
              );

            this.username = '';
            this.email = '';
            this.password = '';
            this.confirmPassword = '';
            this.nacionalidad = '';
            this.mostrarNsfw = false;
            this.selectedReadingLanguages = [
              this.getDefaultReadingLanguage()
            ];
            this.turnstileToken = '';
          },
          error: (err) => {
            this.cargando = false;
            this.error =
              err.error?.error ||
              this.translationService.getTranslation('Error al registrar usuario');

            this.resetTurnstile();
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.translationService.getTranslation('No se pudo preparar el registro');
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