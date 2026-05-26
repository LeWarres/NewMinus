import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';
import { ContentMetadataService } from '../../../../services/content-metadata.service';
import {
  SubscribeButtonComponent,
  SubscriptionChange
} from '../../../../components/subscribe-button/subscribe-button.component';

interface CategoriaPreviewItem {
  value: string;
  label: string;
}

interface InfoObraPreview {
  id: number;
  usuarioId: number | null;
  titulo: string;
  tipoEntrega?: string;
  numVisitas: number;
  totalSuscriptores: number;
  estaSuscrito: boolean;
  autor: string;
  autorAvatar?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  fechaCreacion: string;
  capitulos: unknown[];
}

@Component({
  selector: 'app-manga-preview-info',
  standalone: true,
  imports: [CommonModule, SubscribeButtonComponent],
  templateUrl: './manga-preview-info.component.html',
  styleUrl: './manga-preview-info.component.css'
})
export class MangaPreviewInfoComponent {
  @Input({ required: true }) obra!: InfoObraPreview;
  @Input() currentUserId: number | null = null;
  @Input() isCurrentUser = false;
  @Input() selectedLanguage = 'GLOBAL';
  @Input() selectedLanguageLabel = '';
  @Input() categoriaItems: CategoriaPreviewItem[] = [];
  @Input() tipoEntregaLabel = '';
  @Input() description = '';
  @Input() showDetails = true;
  @Input() mensaje = '';

  @Output() openIdioma = new EventEmitter<string>();
  @Output() openTipo = new EventEmitter<string | undefined>();
  @Output() openCategoria = new EventEmitter<string>();
  @Output() openAutor = new EventEmitter<void>();
  @Output() subscriptionChange = new EventEmitter<SubscriptionChange>();
  @Output() uploadChapter = new EventEmitter<void>();
  @Output() readFirst = new EventEmitter<void>();
  @Output() readLast = new EventEmitter<void>();
  @Output() toggleDetails = new EventEmitter<void>();

  constructor(
    private metadataService: ContentMetadataService,
    public translationService: TranslationService
  ) {}

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return this.metadataService.imageUrl(path, fallback);
  }

  trackByCategoria(index: number, categoria: CategoriaPreviewItem): string {
    return categoria.value || String(index);
  }
}
