import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { ContentMetadataService } from '../../services/content-metadata.service';
import {
  ObraCardComponent,
  ObraCardItem
} from '../cards/obra-card/obra-card.component';

interface ObrasResponse {
  success: boolean;
  error?: string;
  obras: ObraCardItem[];
}

interface RecommendedCategory {
  value: string;
}

@Component({
  selector: 'app-recommended-carousel',
  standalone: true,
  imports: [
    CommonModule,
    ObraCardComponent
  ],
  templateUrl: './recommended-carousel.component.html',
  styleUrl: './recommended-carousel.component.css'
})
export class RecommendedCarouselComponent implements OnInit, OnChanges, OnDestroy {
  private readonly recomendadasUrl = 'https://minuscreators.com/api/recomendadas_categoria.php';

  @Input() context: 'home' | 'reader' = 'home';
  @Input() initialCategory = 'todos';
  @Input() resetKey = 0;
  @Input() excludeObraId: number | null = null;

  @Input() titleKey = 'Recomendadas por categoría';
  @Input() subtitleKey = 'Cambia de categoría para descubrir obras aleatorias en tus idiomas.';
  @Input() viewMoreLabelKey = 'Ver mas';

  @Output() openObra = new EventEmitter<ObraCardItem>();
  @Output() openAutor = new EventEmitter<ObraCardItem>();
  @Output() viewMore = new EventEmitter<void>();
  @Output() recommendationsChange = new EventEmitter<ObraCardItem[]>();

  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  obrasRecomendadas: ObraCardItem[] = [];
  cargandoRecomendadas = false;
  errorRecomendadas = '';

  categoriaRecomendadaSeleccionada = 'todos';

  recommendedCategories: RecommendedCategory[] = [
    { value: 'todos' },
    { value: 'accion' },
    { value: 'romance' },
    { value: 'comedia' },
    { value: 'drama' },
    { value: 'fantasia' },
    { value: 'aventura' },
    { value: 'slice-of-life' },
    { value: 'terror' },
    { value: 'ciencia-ficcion' },
    { value: 'boys-love' },
    { value: 'girls-love' }
  ];

  private rawRecomendadas: ObraCardItem[] = [];
  private languageSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private metadataService: ContentMetadataService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.categoriaRecomendadaSeleccionada = this.normalizeCategory(this.initialCategory);

    this.languageSubscription = this.translationService.currentLanguage$.subscribe(() => {
      this.cargarRecomendadasPorCategoria();
    });
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetKey'] && !changes['resetKey'].firstChange) {
      this.categoriaRecomendadaSeleccionada = this.normalizeCategory(this.initialCategory);
      this.cargarRecomendadasPorCategoria();
      return;
    }

    if (changes['initialCategory'] && !changes['initialCategory'].firstChange) {
      this.categoriaRecomendadaSeleccionada = this.normalizeCategory(this.initialCategory);
      this.cargarRecomendadasPorCategoria();
      return;
    }

    if (changes['excludeObraId'] && !changes['excludeObraId'].firstChange) {
      this.applyExcludedObraFilter();
    }
  }

  cargarRecomendadasPorCategoria(): void {
    this.cargandoRecomendadas = true;
    this.errorRecomendadas = '';

    const params = this.carouselParams()
      .set('categoria', this.categoriaRecomendadaSeleccionada)
      .set('limite', '10');

    this.http
      .get<ObrasResponse>(this.recomendadasUrl, {
        params,
        withCredentials: true
      })
      .subscribe({
        next: (res) => {
          this.cargandoRecomendadas = false;

          if (!res.success) {
            this.errorRecomendadas =
              res.error ||
              this.translationService.getTranslation('No se pudieron cargar las recomendaciones');
            return;
          }

          this.rawRecomendadas = res.obras || [];
          this.applyExcludedObraFilter();
        },
        error: (err) => {
          this.cargandoRecomendadas = false;
          this.errorRecomendadas =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar recomendaciones');

          console.error(err);
        }
      });
  }

  cambiarCategoriaRecomendada(categoria: RecommendedCategory): void {
    if (this.categoriaRecomendadaSeleccionada === categoria.value) {
      return;
    }

    this.categoriaRecomendadaSeleccionada = categoria.value;
    this.cargarRecomendadasPorCategoria();

    setTimeout(() => {
      this.carouselTrack?.nativeElement.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }, 120);
  }

  onOpenObra(obra: ObraCardItem): void {
    this.openObra.emit(obra);
  }

  onOpenAutor(obra: ObraCardItem): void {
    this.openAutor.emit(obra);
  }

  onViewMore(): void {
    this.viewMore.emit();
  }

  nextCarousel(): void {
    this.scrollCarousel(1);
  }

  prevCarousel(): void {
    this.scrollCarousel(-1);
  }

  trackByRecommendedCategory(index: number, categoria: RecommendedCategory): string {
    return categoria.value || String(index);
  }

  trackByRecommendedObra(index: number, obra: ObraCardItem): number {
    return obra.id || index;
  }

  getCategoriaLabel(value?: string): string {
    if (!value || value === 'todos') {
      return this.translationService.getTranslation('Todos');
    }

    return this.metadataService.getCategoryLabel(value);
  }

  get categoriaRecomendadaLabel(): string {
    return this.getCategoriaLabel(this.categoriaRecomendadaSeleccionada);
  }

  private applyExcludedObraFilter(): void {
    const excludeId = Number(this.excludeObraId || 0);

    this.obrasRecomendadas = this.rawRecomendadas.filter((obra) => {
      return excludeId <= 0 || obra.id !== excludeId;
    });

    this.recommendationsChange.emit(this.obrasRecomendadas);
  }

  private scrollCarousel(direction: 1 | -1): void {
    const track = this.carouselTrack?.nativeElement;

    if (!track) {
      return;
    }

    track.scrollBy({
      left: direction * 320,
      behavior: 'smooth'
    });
  }

  private carouselParams(): HttpParams {
    return new HttpParams()
      .set('contexto', this.context)
      .set('idiomaInterfaz', this.getIdiomaInterfazContenido());
  }

  private getIdiomaInterfazContenido(): string {
    const currentLanguage = this.translationService
      .getCurrentLanguage()
      .trim()
      .toUpperCase();

    const allowedLanguages = [
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

    return allowedLanguages.includes(currentLanguage)
      ? currentLanguage
      : 'EN';
  }

  private normalizeCategory(value?: string): string {
    const normalized = String(value || 'todos').trim().toLowerCase();

    if (this.recommendedCategories.some((category) => category.value === normalized)) {
      return normalized;
    }

    return 'todos';
  }
}
