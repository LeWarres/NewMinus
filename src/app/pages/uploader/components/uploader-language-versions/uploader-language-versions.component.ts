import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';
import { IdiomaVersionUpload, SelectOption, VersionFilesEvent, VersionPageRemoveEvent } from '../../uploader.models';

@Component({
  selector: 'app-uploader-language-versions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './uploader-language-versions.component.html',
  styleUrl: './uploader-language-versions.component.css'
})
export class UploaderLanguageVersionsComponent {
  @Input() versionesIdioma: IdiomaVersionUpload[] = [];
  @Input() idiomas: SelectOption[] = [];
  @Input() selectedFile: File | null = null;
  @Input() artworkFiles: File[] = [];
  @Input() isArtworkSelected = false;
  @Input() canAddLanguageVersion = false;
  @Input() selectedPagesTotalSize = 0;
  @Input() maxPageFileSize = 5 * 1024 * 1024;

  @Output() addLanguageVersion = new EventEmitter<void>();
  @Output() removeLanguageVersion = new EventEmitter<string>();
  @Output() idiomaVersionChange = new EventEmitter<IdiomaVersionUpload>();
  @Output() versionFilesSelected = new EventEmitter<VersionFilesEvent>();
  @Output() versionPageRemoved = new EventEmitter<VersionPageRemoveEvent>();

  constructor(public translationService: TranslationService) {}

  getAvailableLanguageOptions(version: IdiomaVersionUpload): SelectOption[] {
    const usados = this.versionesIdioma
      .filter(item => item.id !== version.id)
      .map(item => item.idioma);

    return this.idiomas.filter(idioma => {
      if (!this.isArtworkSelected && idioma.value === 'GLOBAL') {
        return false;
      }

      return idioma.value === version.idioma || !usados.includes(idioma.value);
    });
  }

  getOptionLabel(option?: SelectOption): string {
    if (!option) {
      return '';
    }

    const translated = this.translationService.getTranslation(option.labelKey);

    if (!translated || translated === option.labelKey) {
      return option.nativeLabel || option.value;
    }

    if (option.nativeLabel && translated === option.nativeLabel) {
      return translated;
    }

    if (option.nativeLabel && option.nativeLabel !== translated) {
      return `${translated} / ${option.nativeLabel}`;
    }

    return translated;
  }

  getIdiomaLabel(value: string): string {
    const option = this.idiomas.find(idioma => idioma.value === value);
    return this.getOptionLabel(option) || value;
  }

  getVersionPagesTotalSize(version: IdiomaVersionUpload): number {
    return version.paginas.reduce((total, file) => total + file.size, 0);
  }

  onFilesSelected(event: Event, version: IdiomaVersionUpload): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.versionFilesSelected.emit({
      version,
      files: Array.from(input.files)
    });

    input.value = '';
  }

  onDragOverVersion(event: DragEvent, version: IdiomaVersionUpload): void {
    event.preventDefault();
    version.isDragging = true;
  }

  onDragLeaveVersion(event: DragEvent, version: IdiomaVersionUpload): void {
    event.preventDefault();
    version.isDragging = false;
  }

  onDropVersion(event: DragEvent, version: IdiomaVersionUpload): void {
    event.preventDefault();
    version.isDragging = false;

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    this.versionFilesSelected.emit({
      version,
      files: Array.from(event.dataTransfer.files)
    });
  }

  onRemovePage(version: IdiomaVersionUpload, index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.versionPageRemoved.emit({ version, index });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
  }

  trackByVersionId(index: number, version: IdiomaVersionUpload): string {
    return version.id;
  }

  trackByIdiomaValue(index: number, idioma: SelectOption): string {
    return idioma.value;
  }

  get totalArtworkFilesSize(): number {
    return this.artworkFiles.reduce((total, file) => total + file.size, 0);
  }

  trackByFileName(index: number, file: File): string {
    return `${file.name}-${file.size}-${index}`;
  }
}
