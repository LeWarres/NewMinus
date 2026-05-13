import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
}

interface PerfilResponse {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

interface EditProfileResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  user?: CurrentUser;
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
export class EditProfileComponent implements OnInit {
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
    instagram: ''
  };

  currentUser: CurrentUser | null = null;

  selectedProfileImage: File | null = null;
  selectedBannerImage: File | null = null;

  profilePreviewUrl = '';
  bannerPreviewUrl = '';

  mensaje = '';
  error = '';
  cargando = false;

  maxFileSize = 10 * 1024 * 1024;

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

    this.cargarPerfil(id);
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
          this.error = res.error || this.translationService.getTranslation('No se pudo cargar el perfil');
          return;
        }

        this.profile = res.user;
      },
      error: (err) => {
        this.error = err.error?.error || this.translationService.getTranslation('Error al cargar perfil');
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

    if (!this.esImagenValida(file)) {
      this.error = this.translationService.getTranslation('La imagen de perfil debe ser una imagen válida');
      input.value = '';
      return;
    }

    if (this.profilePreviewUrl) {
      URL.revokeObjectURL(this.profilePreviewUrl);
    }

    this.selectedProfileImage = file;
    this.profilePreviewUrl = URL.createObjectURL(file);
    this.profile.imgPerfil = this.profilePreviewUrl;
    this.error = '';

    input.value = '';
  }

  onBannerImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file)) {
      this.error = this.translationService.getTranslation('El banner debe ser una imagen válida');
      input.value = '';
      return;
    }

    if (this.bannerPreviewUrl) {
      URL.revokeObjectURL(this.bannerPreviewUrl);
    }

    this.selectedBannerImage = file;
    this.bannerPreviewUrl = URL.createObjectURL(file);
    this.profile.imgBanner = this.bannerPreviewUrl;
    this.error = '';

    input.value = '';
  }

  onSubmit(): void {
    this.error = '';
    this.mensaje = '';

    const username = this.profile.username.trim();
    const email = this.profile.email.trim().toLowerCase();

    if (!username || !email) {
      this.error = this.translationService.getTranslation('Usuario y email son obligatorios');
      return;
    }

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      this.error = this.translationService.getTranslation('Usuario inválido');
      return;
    }

    const formData = new FormData();

    /*
      Ya NO mandamos:
      - id
      - current_user_id

      PHP obtiene el usuario real desde la sesión HttpOnly.
    */
    formData.append('username', username);
    formData.append('email', email);
    formData.append('nacionalidad', this.profile.nacionalidad || '');
    formData.append('facebook', this.profile.facebook || '');
    formData.append('twitter', this.profile.twitter || '');
    formData.append('instagram', this.profile.instagram || '');

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
            this.error = res.error || this.translationService.getTranslation('No se pudo actualizar el perfil');
            return;
          }

          this.mensaje = res.mensaje || this.translationService.getTranslation('Perfil actualizado');

          if (res.user) {
            this.authService.saveSession(res.user);
          }

          if (this.profilePreviewUrl) {
            URL.revokeObjectURL(this.profilePreviewUrl);
            this.profilePreviewUrl = '';
          }

          if (this.bannerPreviewUrl) {
            URL.revokeObjectURL(this.bannerPreviewUrl);
            this.bannerPreviewUrl = '';
          }

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
            this.error = err.error?.error || this.translationService.getTranslation('No tienes permiso para realizar esta acción');
            return;
          }

          if (err.status === 409) {
            this.error = err.error?.error || this.translationService.getTranslation('El email o usuario ya está en uso');
            return;
          }

          this.error = err.error?.error || this.translationService.getTranslation('Error al actualizar perfil');
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

  private esImagenValida(file: File): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= this.maxFileSize;
  }
}