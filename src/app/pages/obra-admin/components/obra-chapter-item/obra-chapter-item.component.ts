import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslationService } from '../../../../services/translation.service';
import { AdminCapitulo, AdminCapituloVersion, AdminPagina } from '../../obra-admin.models';
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
  @Input() selectedFilesByVersion: Record<string, File[]> = {};
  @Input() maxPageFileSize = 0;
  @Input() pageUploadMessagesByVersion: Record<string, string> = {};
  @Input() capituloMensajesByVersion: Record<string, string> = {};
  @Input() siteUrl = '';

  @Output() leerCapitulo = new EventEmitter<void>();
  @Output() eliminarPagina = new EventEmitter<{ version: AdminCapituloVersion; pagina: AdminPagina }>();
  @Output() eliminarCapituloIdioma = new EventEmitter<AdminCapituloVersion>();
  @Output() chapterFilesSelected = new EventEmitter<{ version: AdminCapituloVersion; files: File[] }>();
  @Output() removeSelectedFile = new EventEmitter<{ version: AdminCapituloVersion; index: number }>();

  selectedFilePreviews: string[] = [];
  activeVersionKey = '';

  constructor(public translationService: TranslationService) {}

  get versiones(): AdminCapituloVersion[] {
    if (Array.isArray(this.capitulo.versiones) && this.capitulo.versiones.length > 0) {
      return this.capitulo.versiones;
    }

    return [{
      id: this.capitulo.versionId || 0,
      idioma: this.capitulo.idioma || 'GLOBAL',
      titulo: this.capitulo.titulo,
      descripcion: this.capitulo.descripcion,
      creadoEn: this.capitulo.creadoEn,
      paginas: this.capitulo.paginas || []
    }];
  }

  get activeVersion(): AdminCapituloVersion {
    const byKey = this.versiones.find(version => this.getVersionKey(version) === this.activeVersionKey);

    return byKey || this.versiones[0];
  }

  get selectedFiles(): File[] {
    return this.selectedFilesByVersion[this.getVersionKey(this.activeVersion)] || [];
  }

  get pageUploadMessage(): string {
    return this.pageUploadMessagesByVersion[this.getVersionKey(this.activeVersion)] || '';
  }

  get capituloMensaje(): string {
    return this.capituloMensajesByVersion[this.getVersionKey(this.activeVersion)] || '';
  }

  getIdiomaLabel(idioma: string): string {
    return String(idioma || 'GLOBAL').trim().toUpperCase();
  }

  onVersionChange(): void {
    this.refreshSelectedPreviews();
  }

  onChapterPagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.chapterFilesSelected.emit({
      version: this.activeVersion,
      files: Array.from(input.files)
    });

    input.value = '';
  }

  onRemoveSelectedFile(index: number): void {
    this.removeSelectedFile.emit({
      version: this.activeVersion,
      index
    });
  }

  onEliminarPagina(pagina: AdminPagina): void {
    this.eliminarPagina.emit({
      version: this.activeVersion,
      pagina
    });
  }

  onEliminarCapituloIdioma(): void {
    this.eliminarCapituloIdioma.emit(this.activeVersion);
  }

  get canDeleteActiveVersion(): boolean {
    return Number(this.activeVersion?.id || 0) > 0;
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
    if (changes['capitulo'] && !this.activeVersionKey) {
      this.activeVersionKey = this.getVersionKey(this.versiones[0]);
    }

    if (changes['capitulo']) {
      const activeStillExists = this.versiones.some(version => this.getVersionKey(version) === this.activeVersionKey);

      if (!activeStillExists) {
        this.activeVersionKey = this.getVersionKey(this.versiones[0]);
      }
    }

    if (changes['selectedFilesByVersion'] || changes['capitulo']) {
      this.refreshSelectedPreviews();
    }
  }

  ngOnDestroy(): void {
    this.resetSelectedFilePreviews();
  }

  private resetSelectedFilePreviews(): void {
    this.selectedFilePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    this.selectedFilePreviews = [];
  }

  private refreshSelectedPreviews(): void {
    this.resetSelectedFilePreviews();
    this.selectedFilePreviews = this.selectedFiles.map((file) => URL.createObjectURL(file));
  }

  getVersionKey(version: AdminCapituloVersion): string {
    const versionId = Number(version.id || 0);

    if (versionId > 0) {
      return `v_${versionId}`;
    }

    const idioma = String(version.idioma || 'GLOBAL').trim().toUpperCase();
    return `legacy_${this.capitulo.id}_${idioma}`;
  }
}
