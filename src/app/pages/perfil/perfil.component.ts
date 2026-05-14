import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  totalSuscriptores?: number;
}

interface Obra {
  id: number;
  titulo: string;
  descripcion?: string;
  genero?: string;
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
}

interface CapituloPerfil {
  capituloId: number;
  obraId: number;
  numeroCapitulo: number;
  tituloCapitulo?: string;
  descripcionCapitulo?: string;
  fechaCreacion: string;
  tituloObra: string;
  portada?: string;
  genero?: string;
  idioma?: string;
  numVisitas: number;
}

interface PerfilResponse {
  success: boolean;
  error?: string;
  user?: User;
  obras?: Obra[];
  capitulos?: CapituloPerfil[];
  estaSuscrito?: boolean;
}

interface SuscripcionResponse {
  success: boolean;
  suscrito?: boolean;
  mensaje?: string;
  error?: string;
}

type PerfilTab = 'news' | 'obras' | 'popular';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/perfil.php';
  suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';
  siteUrl = 'https://minuscreators.com';

  user: User | null = null;
  currentUser: CurrentUser | null = null;

  obras: Obra[] = [];
  capitulos: CapituloPerfil[] = [];

  activeTab: PerfilTab = 'news';

  isCurrentUser = false;
  estaSuscrito = false;

  error = '';
  mensaje = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.error = this.translationService.getTranslation('No se encontró el usuario');
        return;
      }

      this.cargarPerfil(id);
    });
  }

  get totalVisitas(): number {
    return this.obras.reduce((total, obra) => total + (obra.numVisitas || 0), 0);
  }

  get displayedCapitulos(): CapituloPerfil[] {
    return [...this.capitulos]
      .sort((a, b) => {
        return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
      })
      .slice(0, 8);
  }

  get displayedObras(): Obra[] {
    if (this.activeTab === 'popular') {
      return [...this.obras]
        .sort((a, b) => {
          return (b.numVisitas || 0) - (a.numVisitas || 0);
        })
        .slice(0, 3);
    }

    return this.obras;
  }

  setActiveTab(tab: PerfilTab): void {
    this.activeTab = tab;
  }

  cargarPerfil(id: string): void {
    this.error = '';
    this.mensaje = '';

    this.http
      .get<PerfilResponse>(
        `${this.apiUrl}?id=${id}`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          if (!res.success || !res.user) {
            this.error = res.error || this.translationService.getTranslation('No se pudo cargar el perfil');
            return;
          }

          this.user = res.user;
          this.obras = res.obras || [];
          this.capitulos = res.capitulos || [];
          this.estaSuscrito = !!res.estaSuscrito;

          this.currentUser = this.authService.getCurrentUser();
          this.isCurrentUser = this.currentUser?.id === this.user.id;
        },
        error: (err) => {
          this.error = err.error?.error || this.translationService.getTranslation('Error al cargar el perfil');
          console.error(err);
        }
      });
  }

  navigateToEditProfile(): void {
    if (!this.user) {
      return;
    }

    this.router.navigate(['/perfil', this.user.id, 'editar']);
  }

  abrirCapitulo(capitulo: CapituloPerfil): void {
    this.router.navigate([
      '/obra',
      capitulo.obraId,
      'capitulo',
      capitulo.numeroCapitulo
    ]);
  }

  toggleSubscription(): void {
  if (!this.user) {
    return;
  }

  this.currentUser = this.authService.getCurrentUser();

  if (!this.currentUser) {
    this.router.navigate(['/login']);
    return;
  }

  if (this.currentUser.id === this.user.id) {
    return;
  }

  this.mensaje = '';
  this.error = '';

  this.ensureCsrfAndRun(() => {
    this.http
      .post<SuscripcionResponse>(
        this.suscripcionUrl,
        {
          seguido_id: this.user?.id
        },
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      )
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.mensaje =
              res.error ||
              this.translationService.getTranslation('No se pudo actualizar la suscripción');
            return;
          }

          this.estaSuscrito = !!res.suscrito;
          this.mensaje = res.mensaje || '';

          if (this.user) {
            const totalActual = this.user.totalSuscriptores || 0;

            if (res.suscrito) {
              this.user.totalSuscriptores = totalActual + 1;
            } else {
              this.user.totalSuscriptores = Math.max(totalActual - 1, 0);
            }
          }
        },
        error: (err) => {
          if (err.status === 401) {
            this.authService.clearSession();
            this.router.navigate(['/login']);
            return;
          }

          this.mensaje =
            err.error?.error ||
            this.translationService.getTranslation('Error al actualizar suscripción');

          console.error(err);
        }
      });
  }, () => {
    this.mensaje = this.translationService.getTranslation('No se pudo preparar la acción');
  });
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

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('blob:')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }
}