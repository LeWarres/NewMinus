import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

interface FollowingItem {
  tipo: string;

  obraId: number;
  usuarioId: number | null;

  tituloObra: string;
  descripcionObra?: string;

  genero?: string;
  idioma?: string;
  portada?: string;
  numVisitas: number;

  capituloId: number;
  numeroCapitulo: number;
  tituloCapitulo?: string;
  descripcionCapitulo?: string;
  fechaCreacion: string;

  autor: string;
  autorAvatar?: string;
}

interface FollowingResponse {
  success: boolean;
  error?: string;
  items: FollowingItem[];
}

@Component({
  selector: 'app-following',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './following.component.html',
  styleUrl: './following.component.css'
})
export class FollowingComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/following.php';
  siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;

  items: FollowingItem[] = [];

  cargando = false;
  error = '';

  constructor(
    private http: HttpClient,
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

    this.cargarFollowing();
  }

  cargarFollowing(): void {
    this.cargando = true;
    this.error = '';

    /*
      Ya NO mandamos user_id.
      following.php usa la sesión HttpOnly para saber quién eres.
    */
    this.http
      .get<FollowingResponse>(
        `${this.apiUrl}?limite=50`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success) {
            this.error =
              res.error ||
              this.translationService.getTranslation('No se pudieron cargar las actualizaciones');
            return;
          }

          this.items = res.items || [];
        },
        error: (err) => {
          this.cargando = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.router.navigate(['/login']);
            return;
          }

          this.error =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar las actualizaciones');

          console.error(err);
        }
      });
  }

  abrirItem(item: FollowingItem): void {
    this.router.navigate([
      '/obra',
      item.obraId,
      'capitulo',
      item.numeroCapitulo
    ]);
  }

  abrirPerfil(event: Event, item: FollowingItem): void {
    event.stopPropagation();

    if (!item.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', item.usuarioId]);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }
}