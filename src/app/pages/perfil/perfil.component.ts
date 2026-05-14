import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { ContentMetadataService } from '../../services/content-metadata.service';

import {
  ObraCardComponent,
  ObraCardItem
} from '../../components/cards/obra-card/obra-card.component';

import {
  CapituloCardComponent,
  CapituloCardItem
} from '../../components/cards/capitulo-card/capitulo-card.component';

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

interface PerfilObraApi {
  id: number;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
}

interface PerfilCapituloApi {
  capituloId: number;
  obraId: number;
  numeroCapitulo: number;
  tituloCapitulo?: string;
  descripcionCapitulo?: string;
  fechaCreacion: string;
  tituloObra: string;
  portada?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  numVisitas: number;
}

interface PerfilObra extends ObraCardItem {
  tipoEntrega?: string;
  serieConcluida?: boolean;
  fechaCreacion: string;
}

interface PerfilCapitulo extends CapituloCardItem {
  fechaCreacion: string;
}

interface PerfilResponse {
  success: boolean;
  error?: string;
  user?: User;
  obras?: PerfilObraApi[];
  capitulos?: PerfilCapituloApi[];
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
    RouterModule,
    ObraCardComponent,
    CapituloCardComponent
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/perfil.php';
  suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';

  user: User | null = null;
  currentUser: CurrentUser | null = null;

  obras: PerfilObra[] = [];
  capitulos: PerfilCapitulo[] = [];

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
    private metadataService: ContentMetadataService,
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

  get displayedCapitulos(): PerfilCapitulo[] {
    return [...this.capitulos]
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, 8);
  }

  get displayedObras(): PerfilObra[] {
    if (this.activeTab === 'popular') {
      return [...this.obras]
        .sort((a, b) => (b.numVisitas || 0) - (a.numVisitas || 0))
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
            this.error =
              res.error ||
              this.translationService.getTranslation('No se pudo cargar el perfil');
            return;
          }

          this.user = res.user;
          this.currentUser = this.authService.getCurrentUser();
          this.isCurrentUser = this.currentUser?.id === this.user.id;

          this.obras = (res.obras || []).map((obra) => this.mapObra(obra, this.user!));
          this.capitulos = (res.capitulos || []).map((capitulo) => this.mapCapitulo(capitulo, this.user!));

          this.estaSuscrito = !!res.estaSuscrito;
        },
        error: (err) => {
          this.error =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar el perfil');

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

  abrirObra(obra: { id: number }): void {
    this.router.navigate(['/obra', obra.id]);
  }

  abrirCapitulo(capitulo: CapituloCardItem): void {
    this.router.navigate([
      '/obra',
      capitulo.obraId,
      'capitulo',
      capitulo.numeroCapitulo
    ]);
  }

  abrirPerfilAutor(): void {
    if (!this.user) {
      return;
    }

    this.router.navigate(['/perfil', this.user.id]);
  }

  subirCapitulo(event: Event, obraId: number): void {
    event.stopPropagation();

    this.router.navigate([
      '/obra',
      obraId,
      'subir-capitulo'
    ]);
  }

  administrarObra(event: Event, obraId: number): void {
    event.stopPropagation();

    this.router.navigate([
      '/obra',
      obraId,
      'admin'
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

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return this.metadataService.imageUrl(path, fallback);
  }

  private mapObra(obra: PerfilObraApi, user: User): PerfilObra {
    return {
      id: obra.id,
      usuarioId: user.id,
      titulo: obra.titulo,
      descripcion: obra.descripcion,
      genero: obra.genero,
      categorias: obra.categorias,
      idioma: obra.idioma,
      tipoEntrega: obra.tipoEntrega,
      serieConcluida: obra.serieConcluida,
      portada: obra.portada,
      numVisitas: obra.numVisitas || 0,
      fechaCreacion: obra.fechaCreacion,
      autor: user.username
    };
  }

  private mapCapitulo(capitulo: PerfilCapituloApi, user: User): PerfilCapitulo {
    return {
      tipo: 'capitulo',
      obraId: capitulo.obraId,
      usuarioId: user.id,
      tituloObra: capitulo.tituloObra,
      descripcionObra: '',
      genero: capitulo.genero,
      categorias: capitulo.categorias,
      idioma: capitulo.idioma,
      portada: capitulo.portada,
      numVisitas: capitulo.numVisitas || 0,
      capituloId: capitulo.capituloId,
      numeroCapitulo: capitulo.numeroCapitulo,
      tituloCapitulo: capitulo.tituloCapitulo,
      descripcionCapitulo: capitulo.descripcionCapitulo,
      fechaCreacion: capitulo.fechaCreacion,
      autor: user.username,
      autorAvatar: user.imgPerfil
    };
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
}