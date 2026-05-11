import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

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

  currentUser: any = null;

  selectedProfileImage: File | null = null;
  selectedBannerImage: File | null = null;

  mensaje = '';
  error = '';
  cargando = false;

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
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');

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
    this.http.get<any>(`${this.apiPerfilUrl}?id=${id}&viewer_id=${this.currentUser.id}`).subscribe({
      next: (res) => {
        if (!res.success || !res.user) {
          this.error = res.error || 'No se pudo cargar el perfil';
          return;
        }

        this.profile = res.user;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al cargar perfil';
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
      this.error = 'La imagen de perfil debe ser JPG, PNG o WEBP y pesar máximo 5 MB';
      return;
    }

    this.selectedProfileImage = file;
    this.profile.imgPerfil = URL.createObjectURL(file);
  }

  onBannerImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file)) {
      this.error = 'El banner debe ser JPG, PNG o WEBP y pesar máximo 5 MB';
      return;
    }

    this.selectedBannerImage = file;
    this.profile.imgBanner = URL.createObjectURL(file);
  }

  onSubmit(): void {
    if (!this.profile.username.trim() || !this.profile.email.trim()) {
      this.error = 'Usuario y email son obligatorios';
      return;
    }

    const formData = new FormData();

    formData.append('id', String(this.profile.id));
    formData.append('current_user_id', String(this.currentUser.id));
    formData.append('username', this.profile.username || '');
    formData.append('email', this.profile.email || '');
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
    this.error = '';
    this.mensaje = '';

    this.http.post<any>(this.apiEditarUrl, formData).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.error = res.error || 'No se pudo actualizar el perfil';
          return;
        }

        this.mensaje = res.mensaje || 'Perfil actualizado';

        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
        }

        this.router.navigate(['/perfil', this.profile.id]);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Error al actualizar perfil';
        console.error(err);
      }
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

  private esImagenValida(file: File): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= 5 * 1024 * 1024;
  }
}