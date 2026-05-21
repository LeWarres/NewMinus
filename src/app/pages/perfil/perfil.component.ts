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

import {
  SubscribeButtonComponent,
  SubscriptionChange
} from '../../components/subscribe-button/subscribe-button.component';

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
  promedioCalificacion?: number;
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
  descripcionObra?: string;
  portada?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  tipoEntrega?: string;
  numVisitas: number;
  obraNumVisitas?: number;
  promedioCalificacion?: number;
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

type PerfilTab = 'news' | 'obras' | 'popular';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ObraCardComponent,
    CapituloCardComponent,
    SubscribeButtonComponent
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  private apiUrl = 'https://minuscreators.com/api/perfil.php';

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

  get bannerUrl(): string {
    return this.imageUrl(this.user?.imgBanner, '/obras/paleta/portada.png');
  }

  get avatarUrl(): string {
    return this.imageUrl(this.user?.imgPerfil, '/obras/paleta/tres.png');
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

  onSubscriptionChange(event: SubscriptionChange): void {
    this.estaSuscrito = event.isSubscribed;
    this.mensaje = event.message || '';

    if (this.user) {
      this.user.totalSuscriptores = event.totalSubscribers;
    }
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

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return this.metadataService.imageUrl(path, fallback);
  }

  trackByObra(index: number, obra: PerfilObra): number {
    return obra.id || index;
  }

  trackByCapitulo(index: number, capitulo: PerfilCapitulo): number {
    return capitulo.capituloId || index;
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
      promedioCalificacion: obra.promedioCalificacion || 0,
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
      descripcionObra: capitulo.descripcionObra || '',

      genero: capitulo.genero,
      categorias: capitulo.categorias,
      idioma: capitulo.idioma,
      portada: capitulo.portada,
      tipoEntrega: capitulo.tipoEntrega,

      numVisitas: capitulo.numVisitas || 0,
      obraNumVisitas: capitulo.obraNumVisitas || 0,
      promedioCalificacion: capitulo.promedioCalificacion || 0,

      capituloId: capitulo.capituloId,
      numeroCapitulo: capitulo.numeroCapitulo,
      tituloCapitulo: capitulo.tituloCapitulo,
      descripcionCapitulo: capitulo.descripcionCapitulo,
      fechaCreacion: capitulo.fechaCreacion,

      autor: user.username,
      autorAvatar: user.imgPerfil
    };
  }
}