import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { ContentMetadataService } from '../../services/content-metadata.service';
import { RatingStarsComponent } from '../../components/rating-stars/rating-stars.component';

import {
  SubscribeButtonComponent,
  SubscriptionChange
} from '../../components/subscribe-button/subscribe-button.component';

import {
  ReportarContenidoComponent,
  ReporteContenidoPayload
} from '../../components/reportar-contenido/reportar-contenido.component';

import { CommentsSectionComponent } from '../../components/comments-section/comments-section.component';

interface Capitulo {
  id: number;
  versionId?: number;
  idioma?: string;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
  numVisitas?: number;
  portada?: string;
}

interface CategoriaPreviewItem {
  value: string;
  label: string;
}

interface IdiomaPreviewItem {
  value: string;
  label: string;
}

interface ObraPreview {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  idiomaOriginal?: string;
  idiomaActual?: string;
  idiomasDisponibles?: string[];
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

type ImageLoadingMode = 'eager' | 'lazy';
type FetchPriorityMode = 'high' | 'low' | 'auto';

@Component({
  selector: 'app-manga-preview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SubscribeButtonComponent,
    CommentsSectionComponent,
    RatingStarsComponent,
    ReportarContenidoComponent
  ],
  templateUrl: './manga-preview.component.html',
  styleUrl: './manga-preview.component.css'
})
export class MangaPreviewComponent implements OnInit {
  private apiUrl = 'https://minuscreators.com/api/obra_preview.php';
  private registrarVistaUrl = 'https://minuscreators.com/api/registrar_vista.php';

  obra: ObraPreview | null = null;
  currentUser: CurrentUser | null = null;

  selectedLanguage = 'GLOBAL';

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
    private authService: AuthService,
    private metadataService: ContentMetadataService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.checkScreenSize();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.error = this.translationService.getTranslation('common.error.work_not_found');
        return;
      }

      const idiomaQuery =
        this.route.snapshot.queryParamMap.get('idioma') ||
        this.route.snapshot.queryParamMap.get('lang') ||
        '';

      this.cargarPreview(id, idiomaQuery);

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
      });
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth <= 1200;
  }

  cargarPreview(id: string, idioma?: string): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.http
      .get<ObraPreviewResponse>(
        this.buildPreviewUrl(id, idioma),
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success || !res.obra) {
            this.error =
              res.error ||
              this.translationService.getTranslation('common.error.load_work_failed');
            return;
          }

          this.obra = {
            ...res.obra,
            capitulos: [...(res.obra.capitulos || [])].sort(
              (a, b) => a.numeroCapitulo - b.numeroCapitulo
            )
          };

          this.currentUser = this.authService.getCurrentUser();
          this.isCurrentUser = this.currentUser?.id === this.obra.usuarioId;
          this.selectedLanguage = this.normalizarIdiomaBusqueda(
            this.obra.idiomaActual || this.obra.idioma || idioma || 'GLOBAL'
          );

          this.registrarVista(this.obra.id);
        },
        error: (err) => {
          this.cargando = false;
          this.error =
            err.error?.error ||
            this.translationService.getTranslation('common.error.load_work_error');

          console.error(err);
        }
      });
  }

  registrarVista(obraId: number): void {
    this.http.post(
      this.registrarVistaUrl,
      {
        obra_id: obraId
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: () => {},
      error: (err) => {
        console.error('No se pudo registrar vista de la obra', err);
      }
    });
  }

  abrirCapitulo(capitulo: Capitulo): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(
      [
        '/obra',
        this.obra.id,
        'capitulo',
        capitulo.numeroCapitulo
      ],
      {
        queryParams: {
          idioma: this.selectedLanguage
        }
      }
    );
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

    this.router.navigate(
      ['/obra', this.obra.id, 'subir-capitulo'],
      {
        queryParams: {
          idioma: this.selectedLanguage
        }
      }
    );
  }

  abrirPerfilAutor(): void {
    if (!this.obra?.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', this.obra.usuarioId]);
  }

  abrirCategoria(categoria: string): void {
    const categoriaNormalizada = categoria.trim().toLowerCase();

    if (!categoriaNormalizada) {
      return;
    }

    this.router.navigate(['/categorias'], {
      queryParams: {
        categoria: categoriaNormalizada,
        idioma: 'preferidos',
        nsfw: categoriaNormalizada === 'nsfw' ? 'solo' : 'incluir'
      }
    });
  }

  abrirIdiomaObra(idioma?: string): void {
    const idiomaNormalizado = this.normalizarIdiomaBusqueda(idioma);

    this.router.navigate(['/categorias'], {
      queryParams: {
        idioma: idiomaNormalizado,
        nsfw: 'incluir'
      }
    });
  }

  abrirTipoObra(tipoEntrega?: string): void {
    const tipoNormalizado = this.normalizarTipoObra(tipoEntrega);

    if (!tipoNormalizado) {
      return;
    }

    this.router.navigate(['/categorias'], {
      queryParams: {
        tipo: tipoNormalizado,
        idioma: 'preferidos',
        nsfw: 'incluir'
      }
    });
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idioma = this.normalizarIdiomaBusqueda(select.value);

    if (!this.obra || idioma === this.selectedLanguage) {
      return;
    }

    this.selectedLanguage = idioma;

    this.router.navigate(
      ['/obra', this.obra.id],
      {
        queryParams: {
          idioma
        },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }
    );

    this.cargarPreview(String(this.obra.id), idioma);
  }

  getIdiomasDisponibles(): IdiomaPreviewItem[] {
    const idiomas = this.obra?.idiomasDisponibles?.length
      ? this.obra.idiomasDisponibles
      : [this.obra?.idioma || 'GLOBAL'];

    return Array.from(new Set(
      idiomas
        .map(idioma => this.normalizarIdiomaBusqueda(idioma))
        .filter(Boolean)
    )).map(value => ({
      value,
      label: this.getIdiomaLabel(value)
    }));
  }

  trackByIdioma(index: number, idioma: IdiomaPreviewItem): string {
    return idioma.value || String(index);
  }

  getSelectedLanguageLabel(): string {
    return this.getIdiomaLabel(this.selectedLanguage || this.obra?.idioma || 'GLOBAL');
  }

  onSubscriptionChange(event: SubscriptionChange): void {
    if (!this.obra) {
      return;
    }

    this.obra.estaSuscrito = event.isSubscribed;
    this.obra.totalSuscriptores = event.totalSubscribers;
    this.mensaje = event.message || '';
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return this.metadataService.imageUrl(path, fallback);
  }

  get coverUrl(): string {
    return this.imageUrl(this.obra?.portada, '/obras/paleta/portada.png');
  }

  getCategoriasObra(): string[] {
    if (!this.obra) {
      return [];
    }

    const categorias: string[] = [];

    if (this.obra.genero) {
      categorias.push(
        ...this.obra.genero
          .split(',')
          .map(item => item.trim().toLowerCase())
          .filter(Boolean)
      );
    }

    if (this.obra.categorias && this.obra.categorias.length > 0) {
      categorias.push(
        ...this.obra.categorias
          .map(categoria => String(categoria || '').trim().toLowerCase())
          .filter(Boolean)
      );
    }

    return Array.from(new Set(categorias));
  }

  getCategoriaItems(max: number = 3): CategoriaPreviewItem[] {
    return this.getCategoriasObra()
      .slice(0, max)
      .map(value => ({
        value,
        label: this.getCategoriaLabel(value)
      }));
  }

  getCategoriaLabel(value: string): string {
    return this.metadataService.getCategoryLabel(value);
  }

  getIdiomaLabel(value?: string): string {
    return this.metadataService.getLanguageLabel(value || 'GLOBAL');
  }

  getTipoEntregaLabel(value?: string): string {
    const normalized = String(value || '').trim().toLowerCase();

    const labels: Record<string, string> = {
      comic: 'common.work_type.comic',
      manga: 'common.work_type.manga',
      libro: 'common.work_type.book',
      novela: 'common.work_type.novel',
      artwork: 'common.work_type.artwork'
    };

    return this.translationService.getTranslation(labels[normalized] || 'common.work_type.manga');
  }

  getCapituloTitulo(capitulo: Capitulo): string {
    if (capitulo.titulo) {
      return capitulo.titulo;
    }

    return `${this.translationService.getTranslation('common.labels.chapter')} ${capitulo.numeroCapitulo}`;
  }

  getCapituloDescripcion(capitulo: Capitulo): string {
    return (
      capitulo.descripcion ||
      this.obra?.descripcion ||
      this.translationService.getTranslation('mangaPreview.chapter.no_description')
    );
  }

  getCapituloImagen(capitulo: Capitulo): string {
    return this.imageUrl(
      capitulo.portada || this.obra?.portada,
      '/obras/paleta/portada.png'
    );
  }

  getCapituloVisitas(capitulo: Capitulo): number {
    return Number(capitulo.numVisitas || 0);
  }

  getEpisodeImageLoading(index: number): ImageLoadingMode {
    if (this.isMobileView) {
      return 'lazy';
    }

    return index < 2 ? 'eager' : 'lazy';
  }

  getEpisodeImageFetchPriority(index: number): FetchPriorityMode {
    if (this.isMobileView) {
      return 'auto';
    }

    return index === 0 ? 'high' : 'auto';
  }

  trackByCapitulo(index: number, capitulo: Capitulo): number {
    return capitulo.id || capitulo.numeroCapitulo || index;
  }

  trackByCategoria(index: number, categoria: CategoriaPreviewItem): string {
    return categoria.value || String(index);
  }

  getObraDescripcion(): string {
    return (
      this.obra?.descripcion ||
      this.translationService.getTranslation('mangaPreview.work.no_description')
    );
  }

  get urlReporteObra(): string {
    if (!this.obra) {
      return '';
    }
    return `https://minuscreators.com/obra/${this.obra.id}`;
  }

  get contextoReporteObra(): string {
    if (!this.obra) {
      return '';
    }

    return `Obra de ${this.obra.autor}`;
  }

  enviarReporteDesdeObra(payload: ReporteContenidoPayload): void {
    console.log('Reporte de obra enviado:', payload);
  }

  private buildPreviewUrl(id: string, idioma?: string): string {
    const params = new URLSearchParams();
    params.set('id', id);

    const idiomaNormalizado = this.normalizarIdiomaBusqueda(idioma || this.selectedLanguage || '');

    if (idiomaNormalizado) {
      params.set('idioma', idiomaNormalizado);
    }

    return `${this.apiUrl}?${params.toString()}`;
  }

  private normalizarIdiomaBusqueda(idioma?: string): string {
    const normalized = String(idioma || 'GLOBAL').trim().toUpperCase();

    const allowed = [
      'GLOBAL',
      'ES',
      'EN',
      'JA',
      'KO',
      'ZH',
      'FR',
      'DE',
      'PT',
      'IT',
      'RU',
      'AR',
      'HI',
      'ID',
      'VI',
      'TH',
      'TR',
      'PL',
      'NL'
    ];

    return allowed.includes(normalized)
      ? normalized
      : 'GLOBAL';
  }

  private normalizarTipoObra(tipoEntrega?: string): string {
    const normalized = String(tipoEntrega || '').trim().toLowerCase();

    const allowed = [
      'comic',
      'manga',
      'libro',
      'novela',
      'artwork'
    ];

    return allowed.includes(normalized)
      ? normalized
      : '';
  }
}