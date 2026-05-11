import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  role?: string;
  imgPerfil?: string;
}

interface Capitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
}

interface ObraPreview {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;

  autor: string;
  autorAvatar?: string;
  autorRole?: string;
  autorNacionalidad?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  totalSuscriptores: number;
  estaSuscrito: boolean;

  capitulos: Capitulo[];
}

interface ObraPreviewResponse {
  success: boolean;
  error?: string;
  obra?: ObraPreview;
}

interface SuscripcionResponse {
  success: boolean;
  suscrito?: boolean;
  mensaje?: string;
  error?: string;
}

@Component({
  selector: 'app-manga-preview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './manga-preview.component.html',
  styleUrl: './manga-preview.component.css'
})
export class MangaPreviewComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/obra_preview.php';
  suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';
  siteUrl = 'https://minuscreators.com';

  obra: ObraPreview | null = null;
  currentUser: CurrentUser | null = null;

  isMobileView = false;
  isCurrentUser = false;

  cargando = false;
  error = '';
  mensaje = '';

  showDetails = true;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.getCurrentUser();
    this.checkScreenSize();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.error = 'No se encontró la obra';
        return;
      }

      this.cargarPreview(id);
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth <= 1200;
  }

  cargarPreview(id: string): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    const viewerId = this.currentUser?.id || 0;

    this.http
      .get<ObraPreviewResponse>(`${this.apiUrl}?id=${id}&viewer_id=${viewerId}`)
      .subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success || !res.obra) {
            this.error = res.error || 'No se pudo cargar la obra';
            return;
          }

          this.obra = res.obra;
          this.isCurrentUser = this.currentUser?.id === this.obra.usuarioId;
        },
        error: (err) => {
          this.cargando = false;
          this.error = err.error?.error || 'Error al cargar la obra';
          console.error(err);
        }
      });
  }

  abrirCapitulo(capitulo: Capitulo): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate([
      '/obra',
      this.obra.id,
      'capitulo',
      capitulo.numeroCapitulo
    ]);
  }

  leerPrimerCapitulo(): void {
    if (!this.obra || this.obra.capitulos.length === 0) {
      return;
    }

    this.abrirCapitulo(this.obra.capitulos[0]);
  }

  leerUltimoCapitulo(): void {
    if (!this.obra || this.obra.capitulos.length === 0) {
      return;
    }

    this.abrirCapitulo(this.obra.capitulos[this.obra.capitulos.length - 1]);
  }

  subirCapitulo(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id, 'subir-capitulo']);
  }

  abrirPerfilAutor(): void {
    if (!this.obra?.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', this.obra.usuarioId]);
  }

  toggleSubscription(): void {
    if (!this.obra || !this.obra.usuarioId) {
      return;
    }

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.currentUser.id === this.obra.usuarioId) {
      return;
    }

    this.http
      .post<SuscripcionResponse>(this.suscripcionUrl, {
        seguidor_id: this.currentUser.id,
        seguido_id: this.obra.usuarioId
      })
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.mensaje = res.error || 'No se pudo actualizar la suscripción';
            return;
          }

          if (!this.obra) {
            return;
          }

          this.obra.estaSuscrito = !!res.suscrito;
          this.mensaje = res.mensaje || '';

          const totalActual = this.obra.totalSuscriptores || 0;

          if (res.suscrito) {
            this.obra.totalSuscriptores = totalActual + 1;
          } else {
            this.obra.totalSuscriptores = Math.max(totalActual - 1, 0);
          }
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al actualizar suscripción';
          console.error(err);
        }
      });
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
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

  get coverUrl(): string {
    return this.imageUrl(this.obra?.portada, '/obras/paleta/portada.png');
  }

  private getCurrentUser(): CurrentUser | null {
    const userRaw = localStorage.getItem('user');

    if (!userRaw) {
      return null;
    }

    try {
      return JSON.parse(userRaw) as CurrentUser;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }
}