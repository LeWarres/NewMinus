import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslationService } from '../../../../services/translation.service';
import { ChapterLanguageOption, ChapterLanguageVersion, VersionFilesEvent, VersionPageRemoveEvent } from '../../chapter-uploader.models';
import { GLOBAL_LANGUAGE } from '../../chapter-uploader.options';

@Component({
  selector: 'app-chapter-version-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chapter-version-card.component.html',
  styleUrl: './chapter-version-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChapterVersionCardComponent {
  @Input({ required: true }) version!: ChapterLanguageVersion;
  @Input() versionIndex = 0;
  @Input() versiones: ChapterLanguageVersion[] = [];
  @Input() idiomas: ChapterLanguageOption[] = [];
  @Input() cargando = false;
  @Input() maxPageFileSize = 5 * 1024 * 1024;
  @Input() isArtworkWork = false;

  @Output() removeVersion = new EventEmitter<ChapterLanguageVersion>();
  @Output() idiomaChange = new EventEmitter<ChapterLanguageVersion>();
  @Output() filesSelected = new EventEmitter<VersionFilesEvent>();
  @Output() pageRemoved = new EventEmitter<VersionPageRemoveEvent>();

  constructor(public translationService: TranslationService) {}

  get globalLanguageLabel(): string {
    return this.getIdiomaLabel(GLOBAL_LANGUAGE) || GLOBAL_LANGUAGE;
  }

  get availableIdiomas(): ChapterLanguageOption[] {
    if (this.isArtworkWork) {
      return this.idiomas.filter(idioma => idioma.value === GLOBAL_LANGUAGE);
    }

    return this.idiomas;
  }

  onIdiomaModelChange(): void {
    if (this.isArtworkWork) {
      this.version.idioma = GLOBAL_LANGUAGE;
    }

    this.idiomaChange.emit(this.version);
  }

  isIdiomaUsadoPorOtraVersion(idioma: string): boolean {
    if (this.isArtworkWork) {
      return idioma !== GLOBAL_LANGUAGE;
    }

    return this.versiones.some(item => {
      return item.uid !== this.version.uid && item.idioma === idioma;
    });
  }

  onFilesSelectedVersion(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.filesSelected.emit({
      version: this.version,
      files: Array.from(input.files)
    });

    input.value = '';
  }

  onDragOverVersion(event: DragEvent): void {
    event.preventDefault();
    this.version.isDragging = true;
  }

  onDragLeaveVersion(event: DragEvent): void {
    event.preventDefault();
    this.version.isDragging = false;
  }

  onDropVersion(event: DragEvent): void {
    event.preventDefault();
    this.version.isDragging = false;

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    this.filesSelected.emit({
      version: this.version,
      files: Array.from(event.dataTransfer.files)
    });
  }

  onRemovePage(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.pageRemoved.emit({ version: this.version, index });
  }

  getVersionPagesTotalSize(): number {
    return this.version.pages.reduce((total, file) => total + file.size, 0);
  }

  getIdiomaOptionLabel(idioma: ChapterLanguageOption): string {
    const translated = this.translationService.getTranslation(idioma.labelKey);

    if (!translated || translated === idioma.labelKey) {
      return idioma.nativeLabel;
    }

    if (translated === idioma.nativeLabel) {
      return translated;
    }

    return `${translated} / ${idioma.nativeLabel}`;
  }

  getIdiomaLabel(value?: string): string {
    const idioma = this.idiomas.find(item => item.value === value);

    if (!idioma) {
      return value || '';
    }

    return this.getIdiomaOptionLabel(idioma);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  trackByFileName(index: number, file: File): string {
    return `${file.name}-${file.size}-${index}`;
  }

  trackByIdiomaValue(index: number, idioma: ChapterLanguageOption): string {
    return idioma.value;
  }
}
