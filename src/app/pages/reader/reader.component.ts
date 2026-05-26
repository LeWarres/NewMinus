import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { combineLatest } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { RecommendedCarouselComponent } from '../../components/recommended-carousel/recommended-carousel.component';

import { ObraCardItem } from '../../components/cards/obra-card/obra-card.component';

import {
  SubscribeButtonComponent,
  SubscriptionChange
} from '../../components/subscribe-button/subscribe-button.component';

import { CommentsSectionComponent } from '../../components/comments-section/comments-section.component';
import {
  ReportarContenidoComponent,
  ReporteContenidoPayload
} from '../../components/reportar-contenido/reportar-contenido.component';

interface Capitulo {
  id: number;
  capituloVersionId?: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  idioma?: string;
  numVisitas?: number;
  creadoEn: string;
}

interface ObraPagina {
  id: number;
  numeroPagina: number;
  imagen: string;
  creadoEn: string;
}

interface IdiomaDisponibleCapitulo {
  idioma: string;
}

interface ObraDetalle {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  idioma?: string;
  idiomaActual?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;

  autor: string;
  autorAvatar?: string;
  autorRole?: string;
  autorNacionalidad?: string;
  totalSuscriptores?: number;
  estaSuscrito?: boolean;

  idiomasDisponiblesCapitulo?: IdiomaDisponibleCapitulo[];
  capitulos: Capitulo[];
  capituloActual: Capitulo;
  paginas: ObraPagina[];
}

interface ObraDetalleResponse {
  success: boolean;
  error?: string;
  obra?: ObraDetalle;
}

type ReadingMode = 'strip' | 'single' | 'double';
type ImageLoadingMode = 'eager' | 'lazy';
type FetchPriorityMode = 'high' | 'low' | 'auto';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    RecommendedCarouselComponent,
    SubscribeButtonComponent,
    CommentsSectionComponent,
    ReportarContenidoComponent
  ],
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.css'
})
export class ReaderComponent implements OnInit {
  private apiUrl = 'https://minuscreators.com/api/obra_detalle.php';
  private registrarVistaUrl = 'https://minuscreators.com/api/registrar_vista.php';

  siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;
  obra: ObraDetalle | null = null;

  images: string[] = [];
  hiddenPageIndexes: number[] = [];

  cargando = false;
  error = '';

  selectedChapter = 1;
  selectedLanguage = 'GLOBAL';
  isFavorite = false;

  readingMode: ReadingMode = 'strip';
  isDoublePageSwapped = false;
  currentPageIndex = 0;
  scrollProgress = 0;

  imageZoom = 100;
  readonly minImageZoom = 100;
  readonly maxImageZoom = 250;
  readonly imageZoomStep = 10;

  isPanningImage = false;
  private panViewport: HTMLElement | null = null;
  private panPointerId: number | null = null;
  private panStartX = 0;
  private panStartY = 0;
  private panStartScrollLeft = 0;
  private panStartScrollTop = 0;

  reporteEnviando = false;
  recommendationsResetKey = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).subscribe(([params, queryParams]) => {
      const id = params.get('id');
      const capitulo = params.get('capitulo');
      const idioma = queryParams.get('idioma') || queryParams.get('lang') || undefined;

      if (!id) {
        this.error = this.translationService.getTranslation('common.error.work_not_found');
        return;
      }

      this.cargarObra(id, capitulo || undefined, idioma);
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollProgress();
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: PointerEvent): void {
    this.stopImagePan(event);
  }

  @HostListener('window:pointercancel', ['$event'])
  onWindowPointerCancel(event: PointerEvent): void {
    this.stopImagePan(event);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyboardNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const tagName = target?.tagName?.toLowerCase();

    const isTyping =
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target?.isContentEditable;

    if (isTyping || this.cargando || !this.obra) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextPage();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousPage();
    }
  }

  get isCurrentAuthor(): boolean {
    return !!this.currentUser && !!this.obra && this.currentUser.id === this.obra.usuarioId;
  }

  get hasPreviousChapter(): boolean {
    if (!this.obra) {
      return false;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    return index > 0;
  }

  get hasNextChapter(): boolean {
    if (!this.obra) {
      return false;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    return index >= 0 && index < this.obra.capitulos.length - 1;
  }

  get currentPageNumber(): number {
    return this.currentPageIndex + 1;
  }

  get totalPages(): number {
    return this.images.length;
  }

  get currentSpreadImages(): string[] {
    if (this.readingMode === 'double') {
      const spread = [
        this.images[this.currentPageIndex],
        this.images[this.currentPageIndex + 1]
      ].filter(Boolean);

      return this.isDoublePageSwapped ? [...spread].reverse() : spread;
    }

    return [
      this.images[this.currentPageIndex]
    ].filter(Boolean);
  }

  get readingProgress(): number {
    if (this.readingMode === 'strip') {
      return this.scrollProgress;
    }

    if (this.totalPages <= 1) {
      return 100;
    }

    return Math.min(
      100,
      Math.round(((this.currentPageIndex + 1) / this.totalPages) * 100)
    );
  }

  get idiomasDisponiblesCapitulo(): IdiomaDisponibleCapitulo[] {
    return this.obra?.idiomasDisponiblesCapitulo || [];
  }

  get imageZoomLabel(): string {
    return `${this.imageZoom}%`;
  }

  get imageZoomCanvasSize(): string {
    return `${this.imageZoom}%`;
  }

  get urlReporteActual(): string {
    if (!this.obra) {
      return '';
    }

    return `${this.siteUrl}/obra/${this.obra.id}/capitulo/${this.obra.capituloActual.numeroCapitulo}?idioma=${this.selectedLanguage}`;
  }

  get contextoReporteCapitulo(): string {
    if (!this.obra) {
      return '';
    }

    return `Capítulo ${this.obra.capituloActual.numeroCapitulo}: ${this.obra.capituloActual.titulo} (${this.selectedLanguage})`;
  }

  cargarObra(id: string, capitulo?: string, idioma?: string): void {
    this.cargando = true;
    this.error = '';

    this.hiddenPageIndexes = [];
    this.currentPageIndex = 0;
    this.scrollProgress = 0;
    this.resetImageZoom();

    const params = new URLSearchParams();
    params.set('id', id);

    if (capitulo) {
      params.set('capitulo', capitulo);
    }

    if (idioma) {
      params.set('idioma', this.normalizarIdiomaLectura(idioma));
    }

    const url = `${this.apiUrl}?${params.toString()}`;

    this.http.get<ObraDetalleResponse>(
      url,
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.obra) {
          this.error =
            res.error ||
            this.translationService.getTranslation('common.error.load_work_failed');
          return;
        }

        this.obra = res.obra;
        this.currentUser = this.authService.getCurrentUser();
        this.selectedChapter = this.obra.capituloActual.numeroCapitulo;
        this.selectedLanguage = this.normalizarIdiomaLectura(
          this.obra.idiomaActual || this.obra.capituloActual.idioma || this.obra.idioma || idioma || 'GLOBAL'
        );
        this.recommendationsResetKey += 1;

        this.images = this.obra.paginas.map((pagina) => {
          return this.imageUrl(pagina.imagen);
        });

        this.registrarVista(
          this.obra.id,
          this.obra.capituloActual.id,
          this.obra.capituloActual.numeroCapitulo,
          this.obra.capituloActual.capituloVersionId,
          this.selectedLanguage
        );

        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto'
        });

        setTimeout(() => {
          this.updateScrollProgress();
          this.centerZoomViewportsSoon();
        }, 300);
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

  registrarVista(
    obraId: number,
    capituloId: number,
    numeroCapitulo: number,
    capituloVersionId?: number,
    idioma?: string
  ): void {
    this.http.post(
      this.registrarVistaUrl,
      {
        obra_id: obraId,
        capitulo_id: capituloId,
        capitulo_version_id: capituloVersionId || null,
        numero_capitulo: numeroCapitulo,
        idioma: idioma || this.selectedLanguage
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: () => {},
      error: (err) => {
        console.error('No se pudo registrar vista del capítulo', err);
      }
    });
  }

  onSubscriptionChange(event: SubscriptionChange): void {
    if (!this.obra) {
      return;
    }

    this.obra.estaSuscrito = event.isSubscribed;
    this.obra.totalSuscriptores = event.totalSubscribers;
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idioma = this.normalizarIdiomaLectura(select.value);

    if (!this.obra) {
      return;
    }

    this.router.navigate(
      [
        '/obra',
        this.obra.id,
        'capitulo',
        this.obra.capituloActual.numeroCapitulo
      ],
      {
        queryParams: {
          idioma
        }
      }
    );
  }

  setReadingMode(mode: ReadingMode): void {
    this.readingMode = mode;
    this.currentPageIndex = 0;
    this.resetImageZoom();

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });

    setTimeout(() => {
      this.updateScrollProgress();
      this.centerZoomViewportsSoon();
    }, 100);
  }

  nextPage(): void {
    if (this.readingMode === 'strip') {
      window.scrollBy({
        top: window.innerHeight * 0.85,
        behavior: 'smooth'
      });
      return;
    }

    const step = this.readingMode === 'double' ? 2 : 1;

    this.currentPageIndex = Math.min(
      this.currentPageIndex + step,
      this.totalPages - 1
    );

    this.centerZoomViewportsSoon();
  }

  previousPage(): void {
    if (this.readingMode === 'strip') {
      window.scrollBy({
        top: -window.innerHeight * 0.85,
        behavior: 'smooth'
      });
      return;
    }

    const step = this.readingMode === 'double' ? 2 : 1;
    this.currentPageIndex = Math.max(this.currentPageIndex - step, 0);

    this.centerZoomViewportsSoon();
  }

  onChapterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const numeroCapitulo = Number(select.value);

    if (!this.obra) {
      return;
    }

    this.router.navigate(
      [
        '/obra',
        this.obra.id,
        'capitulo',
        numeroCapitulo
      ],
      {
        queryParams: {
          idioma: this.selectedLanguage
        }
      }
    );
  }

  previousChapter(): void {
    if (!this.obra) {
      return;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    if (index <= 0) {
      return;
    }

    const previousChapter = this.obra.capitulos[index - 1];

    this.router.navigate(
      [
        '/obra',
        this.obra.id,
        'capitulo',
        previousChapter.numeroCapitulo
      ],
      {
        queryParams: {
          idioma: this.selectedLanguage
        }
      }
    );
  }

  nextChapter(): void {
    if (!this.obra) {
      return;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    if (index < 0 || index >= this.obra.capitulos.length - 1) {
      return;
    }

    const nextChapter = this.obra.capitulos[index + 1];

    this.router.navigate(
      [
        '/obra',
        this.obra.id,
        'capitulo',
        nextChapter.numeroCapitulo
      ],
      {
        queryParams: {
          idioma: this.selectedLanguage
        }
      }
    );
  }

  toggleDoublePageSwap(): void {
    if (this.readingMode !== 'double') {
      return;
    }

    this.isDoublePageSwapped = !this.isDoublePageSwapped;
    this.centerZoomViewportsSoon();
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  abrirPerfilAutor(): void {
    if (!this.obra?.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', this.obra.usuarioId]);
  }

  volverDetalleObra(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(
      ['/obra', this.obra.id],
      {
        queryParams: {
          idioma: this.selectedLanguage
        }
      }
    );
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

  getIdiomaLabel(value?: string): string {
    const normalized = this.normalizarIdiomaLectura(value || 'GLOBAL');

    const labels: Record<string, string> = {
      GLOBAL: 'Global',
      ES: 'Español / Spanish',
      EN: 'English',
      JA: '日本語 / Japanese',
      KO: '한국어 / Korean',
      ZH: '中文 / Chinese',
      FR: 'Français / French',
      DE: 'Deutsch / German',
      PT: 'Português / Portuguese',
      IT: 'Italiano / Italian',
      RU: 'Русский / Russian',
      AR: 'العربية / Arabic',
      HI: 'हिन्दी / Hindi',
      ID: 'Bahasa Indonesia',
      VI: 'Tiếng Việt / Vietnamese',
      TH: 'ไทย / Thai',
      TR: 'Türkçe / Turkish',
      PL: 'Polski / Polish',
      NL: 'Nederlands / Dutch'
    };

    return labels[normalized] || normalized;
  }

  verMasCategoriaRecomendada(): void {
    this.router.navigate(['/categorias'], {
      queryParams: {
        idioma: 'preferidos'
      }
    });
  }

  abrirObraRecomendada(obra: ObraCardItem): void {
    this.router.navigate(
      ['/obra', obra.id],
      {
        queryParams: obra.idioma
          ? { idioma: obra.idioma }
          : {}
      }
    );
  }

  abrirAutorRecomendado(obra: ObraCardItem): void {
    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  getReaderImageLoading(index: number): ImageLoadingMode {
    return index < 2 ? 'eager' : 'lazy';
  }

  getReaderImageFetchPriority(index: number): FetchPriorityMode {
    return index === 0 ? 'high' : 'auto';
  }

  trackByImage(index: number, image: string): string {
    return `${index}-${image}`;
  }

  trackBySpreadImage(index: number, image: string): string {
    return `${this.currentPageIndex}-${index}-${image}`;
  }

  trackByChapter(index: number, chapter: Capitulo): number {
    return chapter.id || chapter.numeroCapitulo || index;
  }

  trackByIdioma(index: number, idioma: IdiomaDisponibleCapitulo): string {
    return idioma.idioma || String(index);
  }

  enviarReporteDesdeReader(payload: ReporteContenidoPayload): void {
    console.log('Reporte listo para enviar:', payload);
  }

  onPageImageError(index: number): void {
    this.hidePage(index);
  }

  onPageImageLoad(event: Event, index: number): void {
    const img = event.target as HTMLImageElement;

    if (img.naturalWidth <= 10) {
      this.hidePage(index);
      return;
    }

    this.centerZoomViewportsSoon();
  }

  isPageHidden(index: number): boolean {
    return this.hiddenPageIndexes.includes(index);
  }

  onImageZoomChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    if (Number.isNaN(value)) {
      return;
    }

    this.imageZoom = Math.min(
      this.maxImageZoom,
      Math.max(this.minImageZoom, value)
    );

    this.centerZoomViewportsSoon();
  }

  resetImageZoom(): void {
    this.imageZoom = 100;
    this.centerZoomViewportsSoon();
  }

  centerZoomViewportsSoon(): void {
    requestAnimationFrame(() => {
      const viewports = document.querySelectorAll<HTMLElement>('.reader-pan-viewport');

      viewports.forEach((viewport) => {
        viewport.scrollLeft = Math.max(
          0,
          Math.round((viewport.scrollWidth - viewport.clientWidth) / 2)
        );

        viewport.scrollTop = Math.max(
          0,
          Math.round((viewport.scrollHeight - viewport.clientHeight) / 2)
        );
      });
    });
  }

  startImagePan(event: PointerEvent): void {
    if (this.imageZoom <= 100) {
      return;
    }

    const viewport = event.currentTarget as HTMLElement;

    this.isPanningImage = true;
    this.panViewport = viewport;
    this.panPointerId = event.pointerId;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.panStartScrollLeft = viewport.scrollLeft;
    this.panStartScrollTop = viewport.scrollTop;

    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  moveImagePan(event: PointerEvent): void {
    if (!this.isPanningImage || !this.panViewport) {
      return;
    }

    const deltaX = event.clientX - this.panStartX;
    const deltaY = event.clientY - this.panStartY;

    this.panViewport.scrollLeft = this.panStartScrollLeft - deltaX;
    this.panViewport.scrollTop = this.panStartScrollTop - deltaY;

    event.preventDefault();
  }

  stopImagePan(event?: PointerEvent): void {
    if (this.panViewport && this.panPointerId !== null && event) {
      try {
        this.panViewport.releasePointerCapture(this.panPointerId);
      } catch {
        // El pointer pudo haberse liberado antes. No pasa nada.
      }
    }

    this.isPanningImage = false;
    this.panViewport = null;
    this.panPointerId = null;
  }

  private hidePage(index: number): void {
    if (!this.hiddenPageIndexes.includes(index)) {
      this.hiddenPageIndexes.push(index);
    }
  }

  private updateScrollProgress(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (docHeight <= 0) {
      this.scrollProgress = 100;
      return;
    }

    this.scrollProgress = Math.min(
      100,
      Math.max(0, Math.round((scrollTop / docHeight) * 100))
    );
  }

  private normalizarIdiomaLectura(value: string): string {
    const normalized = String(value || 'GLOBAL').trim().toUpperCase();

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
}