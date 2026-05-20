import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';
import { buildObraImageUrl, formatFileSize } from '../../obra-admin-display.utils';

@Component({
  selector: 'app-obra-cover-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-cover-editor.component.html',
  styleUrl: './obra-cover-editor.component.css'
})
export class ObraCoverEditorComponent {
  @Input() obraTitulo = '';
  @Input() portada = '';
  @Input() coverPreview = '';
  @Input() coverFile: File | null = null;
  @Input() maxCoverFileSize = 0;
  @Input() siteUrl = '';

  @Output() coverSelected = new EventEmitter<File>();

  constructor(public translationService: TranslationService) {}

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.coverSelected.emit(input.files[0]);
    input.value = '';
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return buildObraImageUrl(this.siteUrl, path, fallback);
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }
}
