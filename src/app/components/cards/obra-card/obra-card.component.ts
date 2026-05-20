import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../services/translation.service';
import { ContentMetadataService } from '../../../services/content-metadata.service';

export interface ObraCardItem {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  portada?: string;

  /*
    Tipo de obra:
    comic, manga, libro, novela, artwork.
  */
  tipoEntrega?: string;

  numVisitas: number;
  autor: string;

  /*
    Promedio de calificación de la obra.
    Viene desde los PHP como promedioCalificacion.
    Ejemplo: 4.3
  */
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
    return this.metadataService.getMainCategoryLabel(
      this.obra.genero,
      this.obra.categorias
    );
  }

  get extraCategoryCount(): number {
    return this.metadataService.getExtraCategoryCount(
      this.obra.genero,
      this.obra.categorias
    );
  }

  get languageLabel(): string {
    return this.metadataService.getLanguageLabel(this.obra.idioma);
  }

  get languageFlagUrl(): string {
    return this.metadataService.getLanguageFlagUrl(this.obra.idioma);
  }

  get coverUrl(): string {
    return this.metadataService.imageUrl(this.obra.portada);
  }

  get workTypeLabel(): string {
    const normalized = String(this.obra.tipoEntrega || '')
      .trim()
      .toLowerCase();

    const labels: Record<string, string> = {
      comic: 'Comic',
      manga: 'Manga',
      libro: 'Libro',
      novela: 'Novela',
      artwork: 'Artwork'
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
}