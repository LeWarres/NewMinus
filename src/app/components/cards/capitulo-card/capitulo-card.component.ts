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
  numVisitas: number;

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
}
