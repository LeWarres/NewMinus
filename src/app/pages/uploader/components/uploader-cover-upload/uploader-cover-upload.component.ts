import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-uploader-cover-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './uploader-cover-upload.component.html',
  styleUrl: './uploader-cover-upload.component.css'
})
export class UploaderCoverUploadComponent {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  @Input() selectedFile: File | null = null;
  @Input() maxCoverFileSize = 5 * 1024 * 1024;

  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileRemoved = new EventEmitter<void>();

  isDragging = false;

  constructor(public translationService: TranslationService) {}

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.fileSelected.emit(input.files[0]);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    this.fileSelected.emit(event.dataTransfer.files[0]);
  }

  removeFile(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    this.fileRemoved.emit();
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
}
