import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../services/translation.service';
import { ContentMetadataService } from '../../../services/content-metadata.service';
import { getWorkCategoryLabel } from '../../../shared/options/profile-options';

export interface ObraCardItem {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  idiomasDisponibles?: string[];
  idiomasExtraCount?: number;
  portada?: string;
  tipoEntrega?: string;
  numVisitas: number;
  autor: string;
  promedioCalificacion?: number;
}

@Component({
  selector: 'app-obra-card',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './obra-card.component.html',
  styleUrl: './obra-card.component.css'
})
export class ObraCardComponent {
  @Input({ required: true }) obra!: ObraCardItem;

  @Input() label = '';
  @Input() showDescription = true;
  @Input() showActions = false;

  @Output() openObra = new EventEmitter<ObraCardItem>();
  @Output() openAutor = new EventEmitter<ObraCardItem>();

  constructor(
    public translationService: TranslationService,
    public metadataService: ContentMetadataService
  ) {}

  onOpenObra(): void {
    this.openObra.emit(this.obra);
  }

  onOpenAutor(event: Event): void {
    event.stopPropagation();
    this.openAutor.emit(this.obra);
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
    const idioma = this.normalizarIdioma(this.obra.idioma);

    if (idioma) {
      return idioma;
    }

    return this.availableLanguages[0] || 'GLOBAL';
  }

  get availableLanguages(): string[] {
    const idiomas = this.obra.idiomasDisponibles || [];
    const normalizados = idiomas
      .map(idioma => this.normalizarIdioma(idioma))
      .filter(Boolean);

    const unicos = Array.from(new Set(normalizados));

    if (unicos.length > 0) {
      return unicos;
    }

    const idiomaBase = this.normalizarIdioma(this.obra.idioma);
    return idiomaBase ? [idiomaBase] : [];
  }

  get languageLabel(): string {
    return this.metadataService.getLanguageLabel(this.displayLanguage);
  }

  get languageFlagUrl(): string {
    return this.metadataService.getLanguageFlagUrl(this.displayLanguage);
  }

  get languageExtraCount(): number {
    const explicitCount = Number(this.obra.idiomasExtraCount);

    if (!Number.isNaN(explicitCount) && explicitCount > 0) {
      return explicitCount;
    }

    const shown = this.displayLanguage;
    return this.availableLanguages.filter(idioma => idioma !== shown).length;
  }

  get hasMultipleLanguages(): boolean {
    return this.languageExtraCount > 0;
  }

  get languageBadgeTitle(): string {
    const labels = this.availableLanguages.map(idioma => {
      return this.metadataService.getLanguageLabel(idioma);
    });

    if (labels.length <= 1) {
      return this.languageLabel;
    }

    return `${this.languageLabel} · ${labels.join(', ')}`;
  }

  get coverUrl(): string {
    return this.metadataService.imageUrl(this.obra.portada);
  }

  get workTypeLabel(): string {
    const normalized = String(this.obra.tipoEntrega || '')
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
    const value = Number(this.obra.promedioCalificacion || 0);

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
    const categoriasRaw = (this.obra as any).categorias;

    if (Array.isArray(categoriasRaw)) {
      categoriasRaw.forEach((categoria) => {
        valores.push(...this.splitCategoryValue(categoria));
      });
    } else {
      valores.push(...this.splitCategoryValue(categoriasRaw));
    }

    if (valores.length === 0) {
      valores.push(...this.splitCategoryValue(this.obra.genero));
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

  private normalizarIdioma(value?: string | null): string {
    return String(value || '')
      .trim()
      .toUpperCase();
  }
}