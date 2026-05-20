import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../services/translation.service';
import { ContentMetadataService } from '../../../services/content-metadata.service';

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

  /*
    IMPORTANTE:
    En tarjetas de capítulo, numVisitas representa las vistas del capítulo,
    no las vistas globales de la obra.
  */
  numVisitas: number;

  /*
    Opcional:
    Si algún PHP también manda las vistas globales de la obra,
    las guardamos aparte para no confundirlas.
  */
  obraNumVisitas?: number;

  /*
    Promedio de calificación de la obra.
    Aunque esta tarjeta sea de capítulo, el rating pertenece a la obra.
    Viene desde los PHP como promedioCalificacion.
  */
  promedioCalificacion?: number;

  capituloId: number;
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
    return this.metadataService.getMainCategoryLabel(
      this.item.genero,
      this.item.categorias
    );
  }

  get extraCategoryCount(): number {
    return this.metadataService.getExtraCategoryCount(
      this.item.genero,
      this.item.categorias
    );
  }

  get languageLabel(): string {
    return this.metadataService.getLanguageLabel(this.item.idioma);
  }

  get languageFlagUrl(): string {
    return this.metadataService.getLanguageFlagUrl(this.item.idioma);
  }

  get coverUrl(): string {
    return this.metadataService.imageUrl(this.item.portada);
  }

  get description(): string {
    return this.item.descripcionCapitulo || this.item.descripcionObra || '';
  }

  get chapterViews(): number {
    return this.item.numVisitas || 0;
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
}
