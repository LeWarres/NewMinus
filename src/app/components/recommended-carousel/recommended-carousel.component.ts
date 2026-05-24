import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { WORK_CATEGORY_OPTIONS, getWorkCategoryLabel } from '../../shared/options/profile-options';
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
  private readonly storagePrefix = 'minus_recommended_categories_v3';

  @Input() context: 'home' | 'reader' = 'home';
  @Input() initialCategory = 'todos';
  @Input() resetKey = 0;
  @Input() excludeObraId: number | null = null;

  @Input() titleKey = 'recommendedCarousel.title';
  @Input() subtitleKey = 'recommendedCarousel.subtitle';
  @Input() viewMoreLabelKey = 'common.actions.view_more';

  @Output() openObra = new EventEmitter<ObraCardItem>();
  @Output() openAutor = new EventEmitter<ObraCardItem>();
  @Output() viewMore = new EventEmitter<void>();
  @Output() recommendationsChange = new EventEmitter<ObraCardItem[]>();

  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  obrasRecomendadas: ObraCardItem[] = [];
  cargandoRecomendadas = false;
  errorRecomendadas = '';

  categoriaRecomendadaSeleccionada = 'todos';
  recommendedCategories: RecommendedCategory[] = [];

  private rawRecomendadas: ObraCardItem[] = [];
  private languageSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.buildRecommendedCategories(false);
    this.categoriaRecomendadaSeleccionada = this.normalizeCategory(this.initialCategory);

    if (!this.recommendedCategories.some((category) => category.value === this.categoriaRecomendadaSeleccionada)) {
      this.categoriaRecomendadaSeleccionada = 'todos';
    }

    this.languageSubscription = this.translationService.currentLanguage$.subscribe(() => {
      this.cargarRecomendadasPorCategoria();
    });
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetKey'] && !changes['resetKey'].firstChange) {
      this.buildRecommendedCategories(false);
      this.categoriaRecomendadaSeleccionada = this.normalizeCategory(this.initialCategory);

      if (!this.recommendedCategories.some((category) => category.value === this.categoriaRecomendadaSeleccionada)) {
        this.categoriaRecomendadaSeleccionada = 'todos';
      }

      this.cargarRecomendadasPorCategoria();
      return;
    }

    if (changes['initialCategory'] && !changes['initialCategory'].firstChange) {
      this.buildRecommendedCategories(false);
      this.categoriaRecomendadaSeleccionada = this.normalizeCategory(this.initialCategory);

      if (!this.recommendedCategories.some((category) => category.value === this.categoriaRecomendadaSeleccionada)) {
        this.categoriaRecomendadaSeleccionada = 'todos';
      }

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
              this.translationService.getTranslation('recommendedCarousel.load_error');
            return;
          }

          this.rawRecomendadas = res.obras || [];
          this.applyExcludedObraFilter();
        },
        error: (err) => {
          this.cargandoRecomendadas = false;
          this.errorRecomendadas =
            err.error?.error ||
            this.translationService.getTranslation('recommendedCarousel.error');

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

  cambiarCategoriasAleatorias(): void {
    this.buildRecommendedCategories(true);

    if (!this.recommendedCategories.some((category) => category.value === this.categoriaRecomendadaSeleccionada)) {
      const initial = this.normalizeCategory(this.initialCategory);
      this.categoriaRecomendadaSeleccionada = this.recommendedCategories.some((category) => category.value === initial)
        ? initial
        : 'todos';
    }

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
      return this.translationService.getTranslation('common.labels.all');
    }

    return getWorkCategoryLabel(
      value,
      (key) => this.translationService.getTranslation(key),
      this.translationService.getTranslation('common.labels.no_category')
    );
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

  private buildRecommendedCategories(forceNew: boolean): void {
    const initial = this.normalizeCategory(this.initialCategory);
    const storageKey = this.getStorageKey(initial);
    let selected = forceNew ? [] : this.readStoredCategories(storageKey);

    if (selected.length === 0) {
      selected = this.pickRandomCategories(this.categoryLimit, initial);
      this.saveStoredCategories(storageKey, selected);
    }

    const values = this.uniqueValues([
      'todos',
      initial !== 'todos' ? initial : '',
      ...selected
    ]).filter(Boolean);

    this.recommendedCategories = values.map((value) => ({ value }));
  }

  private get categoryLimit(): number {
    return this.context === 'reader' ? 4 : 6;
  }

  private pickRandomCategories(limit: number, preferredCategory: string): string[] {
    const pool = this.catalogCategoryValues.filter((category) => {
      return category !== 'todos' && category !== 'nsfw' && category !== preferredCategory;
    });

    const extraSlots = preferredCategory !== 'todos'
      ? Math.max(0, limit - 1)
      : Math.max(0, limit);

    const shuffled = this.shuffle(pool);
    const selected = shuffled.slice(0, extraSlots);

    if (preferredCategory !== 'todos') {
      return this.uniqueValues([preferredCategory, ...selected]).slice(0, limit);
    }

    return selected;
  }

  private get catalogCategoryValues(): string[] {
    return WORK_CATEGORY_OPTIONS
      .map((category) => String(category.value || '').trim().toLowerCase())
      .filter(Boolean);
  }

  private normalizeCategory(value?: string): string {
    const normalized = String(value || 'todos').trim().toLowerCase();

    if (normalized === 'todos') {
      return 'todos';
    }

    return this.catalogCategoryValues.includes(normalized)
      ? normalized
      : 'todos';
  }

  private shuffle(values: string[]): string[] {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }

    return result;
  }

  private uniqueValues(values: string[]): string[] {
    const unique: string[] = [];

    for (const value of values) {
      const normalized = String(value || '').trim().toLowerCase();

      if (!normalized || unique.includes(normalized)) {
        continue;
      }

      unique.push(normalized);
    }

    return unique;
  }

  private getStorageKey(initialCategory: string): string {
    return `${this.storagePrefix}_${this.context}_${initialCategory}`;
  }

  private readStoredCategories(storageKey: string): string[] {
    try {
      const raw = sessionStorage.getItem(storageKey);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((category) => this.normalizeCategory(category))
        .filter((category) => category !== 'todos')
        .slice(0, this.categoryLimit);
    } catch {
      return [];
    }
  }

  private saveStoredCategories(storageKey: string, values: string[]): void {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // Si el navegador bloquea sessionStorage, el carrusel sigue funcionando sin persistencia.
    }
  }
}
