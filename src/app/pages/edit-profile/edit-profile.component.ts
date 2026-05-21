import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role?: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  idiomasLectura?: string[];
  mostrarNsfw?: boolean;
}

interface PerfilResponse {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

interface EditProfileUser extends CurrentUser {
  idiomasLectura?: string[];
  mostrarNsfw?: boolean;
}

interface EditProfileResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  user?: EditProfileUser;
}

interface ReadingLanguageOption {
  value: string;
  labelKey: string;
  nativeLabel: string;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css'
})
export class EditProfileComponent implements OnInit, OnDestroy {
    // trackBy para países
    trackByCountryName(index: number, country: { name: string }): string {
      return country.name;
    }

    // trackBy para idiomas de lectura
    trackByLanguageValue(index: number, language: ReadingLanguageOption): string {
      return language.value;
    }
  apiPerfilUrl = 'https://minuscreators.com/api/perfil.php';
  apiEditarUrl = 'https://minuscreators.com/api/editar_perfil.php';
  siteUrl = 'https://minuscreators.com';

  profile: UserProfile = {
    id: 0,
    username: '',
    email: '',
    nacionalidad: '',
    imgPerfil: '',
    imgBanner: '',
    facebook: '',
    twitter: '',
    instagram: '',
    idiomasLectura: [],
    mostrarNsfw: false
  };

  currentUser: CurrentUser | null = null;

  selectedProfileImage: File | null = null;
  selectedBannerImage: File | null = null;

  profilePreviewUrl = '';
  bannerPreviewUrl = '';

  selectedReadingLanguages: string[] = [];

  mensaje = '';
  error = '';
  cargando = false;

  maxProfileFileSize = 3 * 1024 * 1024;
  maxBannerFileSize = 5 * 1024 * 1024;

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
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    if (this.currentUser.id !== id) {
      this.router.navigate(['/perfil', id]);
      return;
    }

    this.selectedReadingLanguages = [
      this.getDefaultReadingLanguage()
    ];

    this.cargarPerfil(id);
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
  }

  cargarPerfil(id: number): void {
    this.error = '';

    this.http.get<PerfilResponse>(
      `${this.apiPerfilUrl}?id=${id}`,
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        if (!res.success || !res.user) {
          this.error =
            res.error ||
            this.translationService.getTranslation('No se pudo cargar el perfil');
          return;
        }

        this.profile = {
          ...res.user,
          mostrarNsfw: Boolean(res.user.mostrarNsfw)
        };

        this.selectedReadingLanguages = this.resolveInitialReadingLanguages(res.user);
      },
      error: (err) => {
        this.error =
          err.error?.error ||
          this.translationService.getTranslation('Error al cargar perfil');

        console.error(err);
      }
    });
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file, this.maxProfileFileSize)) {
      this.error =
        this.translationService.getTranslation('La imagen de perfil debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxProfileFileSize)}`;
      input.value = '';
      return;
    }

    if (this.profilePreviewUrl) {
      URL.revokeObjectURL(this.profilePreviewUrl);
    }

    this.selectedProfileImage = file;
    this.profilePreviewUrl = URL.createObjectURL(file);
    this.error = '';

    input.value = '';
  }

  onBannerImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file, this.maxBannerFileSize)) {
      this.error =
        this.translationService.getTranslation('El banner debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxBannerFileSize)}`;
      input.value = '';
      return;
    }

    if (this.bannerPreviewUrl) {
      URL.revokeObjectURL(this.bannerPreviewUrl);
    }

    this.selectedBannerImage = file;
    this.bannerPreviewUrl = URL.createObjectURL(file);
    this.error = '';

    input.value = '';
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

  onSubmit(): void {
    this.error = '';
    this.mensaje = '';

    const username = this.profile.username.trim();
    const email = this.profile.email.trim().toLowerCase();
    const idiomasLectura = this.getSelectedReadingLanguages();

    if (!username || !email) {
      this.error = this.translationService.getTranslation('Usuario y email son obligatorios');
      return;
    }

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      this.error = this.translationService.getTranslation('Usuario inválido');
      return;
    }

    if (idiomasLectura.length === 0) {
      this.error = this.translationService.getTranslation('Selecciona al menos un idioma de lectura');
      return;
    }

    if (this.selectedProfileImage && !this.esImagenValida(this.selectedProfileImage, this.maxProfileFileSize)) {
      this.error =
        this.translationService.getTranslation('La imagen de perfil debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxProfileFileSize)}`;
      return;
    }

    if (this.selectedBannerImage && !this.esImagenValida(this.selectedBannerImage, this.maxBannerFileSize)) {
      this.error =
        this.translationService.getTranslation('El banner debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxBannerFileSize)}`;
      return;
    }

    const formData = new FormData();

    formData.append('username', username);
    formData.append('email', email);
    formData.append('nacionalidad', this.profile.nacionalidad || '');
    formData.append('facebook', this.profile.facebook || '');
    formData.append('twitter', this.profile.twitter || '');
    formData.append('instagram', this.profile.instagram || '');
    formData.append('idiomasLectura', JSON.stringify(idiomasLectura));
    formData.append('mostrarNsfw', this.profile.mostrarNsfw ? '1' : '0');

    if (this.selectedProfileImage) {
      formData.append('imgPerfil', this.selectedProfileImage);
    }

    if (this.selectedBannerImage) {
      formData.append('imgBanner', this.selectedBannerImage);
    }

    this.cargando = true;

    this.ensureCsrfAndRun(() => {
      this.http.post<EditProfileResponse>(
        this.apiEditarUrl,
        formData,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success) {
            this.error =
              res.error ||
              this.translationService.getTranslation('No se pudo actualizar el perfil');
            return;
          }

          this.mensaje =
            res.mensaje ||
            this.translationService.getTranslation('Perfil actualizado');

          if (res.user) {
            this.authService.saveSession(res.user);
          }

          this.revokePreviewUrls();

          this.selectedProfileImage = null;
          this.selectedBannerImage = null;

          const userId = res.user?.id || this.profile.id;
          this.router.navigate(['/perfil', userId]);
        },
        error: (err) => {
          this.cargando = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.router.navigate(['/login']);
            return;
          }

          if (err.status === 403) {
            this.error =
              err.error?.error ||
              this.translationService.getTranslation('No tienes permiso para realizar esta acción');
            return;
          }

          if (err.status === 409) {
            this.error =
              err.error?.error ||
              this.translationService.getTranslation('El email o usuario ya está en uso');
            return;
          }

          this.error =
            err.error?.error ||
            this.translationService.getTranslation('Error al actualizar perfil');

          console.error(err);
        }
      });
    }, () => {
      this.cargando = false;
      this.error = this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/tres.png'): string {
    const finalPath = path || fallback;

    if (
      finalPath.startsWith('http') ||
      finalPath.startsWith('blob:') ||
      finalPath.startsWith('/')
    ) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  private resolveInitialReadingLanguages(user: UserProfile): string[] {
    const fromProfile = this.normalizeReadingLanguages(user.idiomasLectura);

    if (fromProfile.length > 0) {
      return fromProfile;
    }

    const cachedUser = this.authService.getCurrentUser();

    const fromSession = this.normalizeReadingLanguages(cachedUser?.idiomasLectura);

    if (fromSession.length > 0) {
      return fromSession;
    }

    return [
      this.getDefaultReadingLanguage()
    ];
  }

  private normalizeReadingLanguages(idiomas?: string[] | null): string[] {
    if (!Array.isArray(idiomas)) {
      return [];
    }

    const allowed = this.readingLanguages.map(language => language.value);
    const normalizados: string[] = [];

    for (const idioma of idiomas) {
      const valor = String(idioma || '').trim().toUpperCase();

      if (!allowed.includes(valor)) {
        continue;
      }

      if (!normalizados.includes(valor)) {
        normalizados.push(valor);
      }
    }

    return normalizados;
  }

  private getSelectedReadingLanguages(): string[] {
    return this.normalizeReadingLanguages(this.selectedReadingLanguages);
  }

  private getDefaultReadingLanguage(): string {
    const currentLanguage = this.translationService.getCurrentLanguage();

    if (currentLanguage === 'es') {
      return 'ES';
    }

    return 'EN';
  }

  private ensureCsrfAndRun(action: () => void, onFail?: () => void): void {
    if (this.authService.getCsrfToken()) {
      action();
      return;
    }

    this.authService.fetchCsrfToken().subscribe({
      next: (res) => {
        if (!res.success || !res.csrfToken) {
          onFail?.();
          return;
        }

        this.authService.saveCsrfToken(res.csrfToken);
        action();
      },
      error: (err) => {
        onFail?.();
        console.error(err);
      }
    });
  }

  private revokePreviewUrls(): void {
    if (this.profilePreviewUrl) {
      URL.revokeObjectURL(this.profilePreviewUrl);
      this.profilePreviewUrl = '';
    }

    if (this.bannerPreviewUrl) {
      URL.revokeObjectURL(this.bannerPreviewUrl);
      this.bannerPreviewUrl = '';
    }
  }

  private esImagenValida(file: File, maxSize: number): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= maxSize;
  }
}