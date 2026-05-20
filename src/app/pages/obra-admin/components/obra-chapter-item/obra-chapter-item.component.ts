import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslationService } from '../../../../services/translation.service';
import { AdminCapitulo, AdminPagina } from '../../obra-admin.models';
import { buildObraImageUrl, formatFileSize } from '../../obra-admin-display.utils';

@Component({
  selector: 'app-obra-chapter-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './obra-chapter-item.component.html',
  styleUrl: './obra-chapter-item.component.css'
})
export class ObraChapterItemComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) capitulo!: AdminCapitulo;
  @Input() selectedFiles: File[] = [];
  @Input() maxPageFileSize = 0;
  @Input() pageUploadMessage = '';
  @Input() capituloMensaje = '';
  @Input() siteUrl = '';

  @Output() leerCapitulo = new EventEmitter<void>();
  @Output() eliminarPagina = new EventEmitter<AdminPagina>();
  @Output() chapterFilesSelected = new EventEmitter<File[]>();
  @Output() removeSelectedFile = new EventEmitter<number>();

  selectedFilePreviews: string[] = [];

  constructor(public translationService: TranslationService) {}

  onChapterPagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.chapterFilesSelected.emit(Array.from(input.files));
    input.value = '';
  }

  get selectedTotalSize(): number {
    return this.selectedFiles.reduce((total, file) => total + file.size, 0);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return buildObraImageUrl(this.siteUrl, path, fallback);
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['selectedFiles']) {
      return;
    }

    this.resetSelectedFilePreviews();
    this.selectedFilePreviews = this.selectedFiles.map((file) => URL.createObjectURL(file));
  }

  ngOnDestroy(): void {
    this.resetSelectedFilePreviews();
  }

  private resetSelectedFilePreviews(): void {
    this.selectedFilePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    this.selectedFilePreviews = [];
  }
}
