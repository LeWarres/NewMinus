import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';
import { ContentMetadataService } from '../../../../services/content-metadata.service';

type ImageLoadingMode = 'eager' | 'lazy';
type FetchPriorityMode = 'high' | 'low' | 'auto';

export interface MangaPreviewChapter {
  id: number;
  versionId?: number;
  idioma?: string;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
  numVisitas?: number;
  portada?: string;
  portadaThumb?: string;
}

@Component({
  selector: 'app-manga-preview-chapters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manga-preview-chapters.component.html',
  styleUrl: './manga-preview-chapters.component.css'
})
export class MangaPreviewChaptersComponent {
  @Input() capitulos: MangaPreviewChapter[] = [];
  @Input() obraDescripcion = '';
  @Input() obraPortada?: string | null;
  @Input() obraPortadaThumb?: string | null;
  @Input() isMobileView = false;

  @Output() openCapitulo = new EventEmitter<MangaPreviewChapter>();

  constructor(
    private metadataService: ContentMetadataService,
    public translationService: TranslationService
  ) {}

  getCapituloTitulo(capitulo: MangaPreviewChapter): string {
    return capitulo.titulo || `${this.translationService.getTranslation('common.labels.chapter')} ${capitulo.numeroCapitulo}`;
  }

  getCapituloDescripcion(capitulo: MangaPreviewChapter): string {
    return capitulo.descripcion || this.obraDescripcion || this.translationService.getTranslation('mangaPreview.chapter.no_description');
  }

  getCapituloImagen(capitulo: MangaPreviewChapter): string {
    return this.metadataService.imageUrl(
      capitulo.portadaThumb || capitulo.portada || this.obraPortadaThumb || this.obraPortada,
      '/obras/paleta/portada.png'
    );
  }

  getCapituloVisitas(capitulo: MangaPreviewChapter): number {
    return Number(capitulo.numVisitas || 0);
  }

  getEpisodeImageLoading(index: number): ImageLoadingMode {
    if (this.isMobileView) {
      return index === 0 ? 'eager' : 'lazy';
    }

    return index < 2 ? 'eager' : 'lazy';
  }

  getEpisodeImageFetchPriority(index: number): FetchPriorityMode {
    return index === 0 ? 'high' : 'auto';
  }

  trackByCapitulo(index: number, capitulo: MangaPreviewChapter): number {
    return capitulo.id || capitulo.numeroCapitulo || index;
  }
}
