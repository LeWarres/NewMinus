import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../services/translation.service';
import { ContentMetadataService } from '../../../services/content-metadata.service';
import { getWorkCategoryLabel } from '../../../shared/options/profile-options';

export interface CapituloCardItem {
  tipo?: string;

  obraId: number;
  usuarioId: number | null;

  tituloObra: string;
  descripcionObra?: string;

  genero?: string;
  categorias?: string[];

  idioma?: string;

  portada?: string;
  portadaThumb?: string;

  tipoEntrega?: string;

  numVisitas: number;
  obraNumVisitas?: number;
  promedioCalificacion?: number;

  capituloId: number;
  capituloVersionId?: number;
  numeroCapitulo: number;
  tituloCapitulo?: string;
  descripcionCapitulo?: string;
  fechaCreacion?: string;

  autor: string;
  autorAvatar?: string;
}

@Component({
  selector: 'app-capitulo-card',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './capitulo-card.component.html',
  styleUrl: './capitulo-card.component.css'
})
export class CapituloCardComponent {
  @Input({ required: true }) item!: CapituloCardItem;

  @Input() showDescription = true;
  @Input() showActions = false;

  @Output() openCapitulo = new EventEmitter<CapituloCardItem>();
  @Output() openAutor = new EventEmitter<CapituloCardItem>();

  constructor(
    public translationService: TranslationService,
    public metadataService: ContentMetadataService
  ) {}

  onOpenCapitulo(): void {
    this.openCapitulo.emit(this.item);
  }

  onOpenAutor(event: Event): void {
    event.stopPropagation();
    this.openAutor.emit(this.item);
  }

  get mainCategoryLabel(): string {
    return getWorkCategoryLabel(
      this.mainCategoryValue,
      (key) => this.translationService.getTranslation(key),
      this.translationService.getTranslation('common.labels.no_category')
    );
  }

  get extraCategoryCount(): number {
    return Math.max(0, this.categoryValues.length - 1);
  }

  get displayLanguage(): string {
    return String(this.item.idioma || 'GLOBAL')
      .trim()
      .toUpperCase();
  }

  get languageLabel(): string {
    return this.metadataService.getLanguageLabel(this.displayLanguage);
  }

  get languageFlagUrl(): string {
    return this.metadataService.getLanguageFlagUrl(this.displayLanguage);
  }

  get languageCode(): string {
    return this.displayLanguage === 'GLOBAL'
      ? 'GL'
      : this.displayLanguage;
  }

  get languageBadgeTitle(): string {
    return this.languageLabel;
  }

  get coverUrl(): string {
    return this.metadataService.imageUrl(this.item.portadaThumb || this.item.portada);
  }

  get description(): string {
    return this.item.descripcionCapitulo || this.item.descripcionObra || '';
  }

  get chapterViews(): number {
    return this.item.numVisitas || 0;
  }

  get workTypeLabel(): string {
    const normalized = String(this.item.tipoEntrega || '')
      .trim()
      .toLowerCase();

    const labels: Record<string, string> = {
      comic: 'common.work_type.comic',
      manga: 'common.work_type.manga',
      libro: 'common.work_type.book',
      novela: 'common.work_type.novel',
      artwork: 'common.work_type.artwork'
    };

    const label = labels[normalized];

    if (!label) {
      return '';
    }

    return this.translationService.getTranslation(label);
  }

  get ratingAverage(): number {
    const value = Number(this.item.promedioCalificacion || 0);

    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.min(5, value));
  }

  get hasRating(): boolean {
    return this.ratingAverage > 0;
  }

  get ratingFillPercent(): number {
    return (this.ratingAverage / 5) * 100;
  }

  get ratingTitle(): string {
    return `${this.ratingAverage.toFixed(1)} / 5`;
  }

  private get categoryValues(): string[] {
    const valores: string[] = [];
    const categoriasRaw = (this.item as any).categorias;

    if (Array.isArray(categoriasRaw)) {
      categoriasRaw.forEach((categoria) => {
        valores.push(...this.splitCategoryValue(categoria));
      });
    } else {
      valores.push(...this.splitCategoryValue(categoriasRaw));
    }

    if (valores.length === 0) {
      valores.push(...this.splitCategoryValue(this.item.genero));
    }

    return Array.from(new Set(valores));
  }

  private get mainCategoryValue(): string {
    return this.categoryValues[0] || '';
  }

  private splitCategoryValue(value?: unknown): string[] {
    return String(value || '')
      .split(',')
      .map((categoria) => categoria.trim().toLowerCase())
      .filter(Boolean);
  }
}