import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { ContentMetadataService } from '../../services/content-metadata.service';
import { COUNTRY_OPTIONS, CountryOption } from '../../shared/options/profile-options';

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
  idiomasDisponibles?: string[];
  idiomasExtraCount?: number;
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
  capituloVersionId?: number;
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
  private readonly countries: CountryOption[] = COUNTRY_OPTIONS;

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
        this.error = this.translationService.getTranslation('perfil.error.user_not_found');
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
        .slice(0, 12);
    }

    return this.obras;
  }

  get bannerUrl(): string {
    return this.imageUrl(this.user?.imgBanner, '/obras/paleta/portada.png');
  }

  get avatarUrl(): string {
    return this.imageUrl(this.user?.imgPerfil, '/obras/paleta/tres.png');
  }

  getNationalityLabel(): string {
    const nacionalidad = String(this.user?.nacionalidad || '').trim();

    if (!nacionalidad) {
      return this.translationService.getTranslation('perfil.user.no_nationality');
    }

    const country = this.findCountryByStoredValue(nacionalidad);

    if (!country) {
      return nacionalidad;
    }

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
              this.translationService.getTranslation('common.error.load_profile_failed');
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
            this.translationService.getTranslation('perfil.error.load_profile_error');

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
    const commands = [
      '/obra',
      capitulo.obraId,
      'capitulo',
      capitulo.numeroCapitulo
    ];

    if (capitulo.idioma) {
      this.router.navigate(commands, {
        queryParams: {
          idioma: capitulo.idioma
        }
      });
      return;
    }

    this.router.navigate(commands);
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
    return capitulo.capituloVersionId || capitulo.capituloId || index;
  }

  private findCountryByStoredValue(value: string): CountryOption | null {
    const raw = String(value || '').trim();

    if (!raw) {
      return null;
    }

    const upper = raw.toUpperCase();

    const codeMatch = this.countries.find(country => country.code === upper);

    if (codeMatch) {
      return codeMatch;
    }

    const normalized = this.normalizeCountryText(raw);

    return this.countries.find((country) => {
      if (this.normalizeCountryText(country.name) === normalized) {
        return true;
      }

      const englishName = this.getIntlRegionName(country.code, 'en');

      if (englishName && this.normalizeCountryText(englishName) === normalized) {
        return true;
      }

      const spanishName = this.getIntlRegionName(country.code, 'es');

      if (spanishName && this.normalizeCountryText(spanishName) === normalized) {
        return true;
      }

      return false;
    }) || null;
  }

  private getIntlRegionName(countryCode: string, locale: string): string {
    if (!countryCode || countryCode === 'OT') {
      return '';
    }

    try {
      const displayNames = new Intl.DisplayNames([locale], {
        type: 'region'
      });

      return displayNames.of(countryCode) || '';
    } catch {
      return '';
    }
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

  private normalizeCountryText(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
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
      idiomasDisponibles: obra.idiomasDisponibles || [],
      idiomasExtraCount: obra.idiomasExtraCount || 0,
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
      capituloVersionId: capitulo.capituloVersionId,
      numeroCapitulo: capitulo.numeroCapitulo,
      tituloCapitulo: capitulo.tituloCapitulo,
      descripcionCapitulo: capitulo.descripcionCapitulo,
      fechaCreacion: capitulo.fechaCreacion,

      autor: user.username,
      autorAvatar: user.imgPerfil
    };
  }
}