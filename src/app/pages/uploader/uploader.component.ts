import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface UploadResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  obra_id?: number;
  usuario_id?: number;
  portada?: string;
}

interface CurrentUser {
  id: number;
  username?: string;
  email?: string;
  role?: string;
  imgPerfil?: string;
}

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputPages') fileInputPages!: ElementRef<HTMLInputElement>;

  apiUrl = 'https://minuscreators.com/api/upload.php';

  selectedFile: File | null = null;
  selectedPages: File[] = [];

  isDragging = false;
  isDraggingPages = false;

  cargando = false;
  respuesta = '';

  maxFileSize = 10 * 1024 * 1024;

  formulario!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {
    this.formulario = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: [''],
      genero: [''],
      idioma: ['ES'],
      tipoEntrega: ['serie'],
      serieConcluida: [false]
    });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  triggerFileInputPages(): void {
    this.fileInputPages.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file)) {
      this.respuesta = this.translationService.getTranslation('La portada debe ser una imagen válida');
      input.value = '';
      return;
    }

    this.selectedFile = file;
    this.respuesta = '';
  }

  onFilesSelectedPages(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    this.agregarPaginas(files);

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

    const file = event.dataTransfer.files[0];

    if (!this.esImagenValida(file)) {
      this.respuesta = this.translationService.getTranslation('La portada debe ser una imagen válida');
      return;
    }

    this.selectedFile = file;
    this.respuesta = '';
  }

  onDragOverPages(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingPages = true;
  }

  onDragLeavePages(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingPages = false;
  }

  onDropPages(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingPages = false;

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    this.agregarPaginas(files);
  }

  agregarPaginas(files: File[]): void {
    const archivosValidos = files.filter((file) => this.esImagenValida(file));

    if (archivosValidos.length !== files.length) {
      this.respuesta = this.translationService.getTranslation('Algunas páginas no se agregaron');
    } else {
      this.respuesta = '';
    }

    this.selectedPages = [...this.selectedPages, ...archivosValidos];
  }

  removeFile(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.selectedFile = null;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  removePage(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.selectedPages.splice(index, 1);

    if (this.fileInputPages && this.selectedPages.length === 0) {
      this.fileInputPages.nativeElement.value = '';
    }
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

  enviarFormulario(): void {
    if (this.formulario.invalid) {
      this.respuesta = this.translationService.getTranslation('El título es obligatorio');
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.selectedFile) {
      this.respuesta = this.translationService.getTranslation('Debes seleccionar una portada');
      return;
    }

    if (this.selectedPages.length === 0) {
      this.respuesta = this.translationService.getTranslation('Debes agregar al menos una página');
      return;
    }

    const currentUser = this.obtenerUsuarioActual();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const valores = this.formulario.value;

    const formData = new FormData();

    formData.append('usuario_id', String(currentUser.id));
    formData.append('titulo', valores.titulo || '');
    formData.append('descripcion', valores.descripcion || '');
    formData.append('genero', valores.genero || '');
    formData.append('idioma', valores.idioma || 'ES');
    formData.append('tipoEntrega', valores.tipoEntrega || 'serie');
    formData.append('serieConcluida', valores.serieConcluida ? '1' : '0');

    formData.append('portada', this.selectedFile);

    this.selectedPages.forEach((file) => {
      formData.append('paginas[]', file);
    });

    this.cargando = true;
    this.respuesta = '';

    this.http.post<UploadResponse>(this.apiUrl, formData).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.respuesta = res.error || this.translationService.getTranslation('No se pudo guardar la obra');
          return;
        }

        this.respuesta = res.mensaje || this.translationService.getTranslation('Obra guardada correctamente');

        this.formulario.reset({
          titulo: '',
          descripcion: '',
          genero: '',
          idioma: 'ES',
          tipoEntrega: 'serie',
          serieConcluida: false
        });

        this.selectedFile = null;
        this.selectedPages = [];

        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }

        if (this.fileInputPages) {
          this.fileInputPages.nativeElement.value = '';
        }

        if (res.obra_id) {
          this.router.navigate(['/obra', res.obra_id]);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.respuesta = err.error?.error || this.translationService.getTranslation('Error al guardar la obra');
        console.error(err);
      }
    });
  }

  private obtenerUsuarioActual(): CurrentUser | null {
    const userRaw = localStorage.getItem('user');

    if (!userRaw) {
      return null;
    }

    try {
      const user = JSON.parse(userRaw) as CurrentUser;
      return user?.id ? user : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }

  private esImagenValida(file: File): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= this.maxFileSize;
  }
}
