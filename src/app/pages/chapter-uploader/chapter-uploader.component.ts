import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

interface UploadChapterResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  obra_id?: number;
  capitulo_id?: number;
  numero_capitulo?: number;
}

@Component({
  selector: 'app-chapter-uploader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './chapter-uploader.component.html',
  styleUrl: './chapter-uploader.component.css'
})
export class ChapterUploaderComponent implements OnInit {
  @ViewChild('fileInputPages') fileInputPages!: ElementRef<HTMLInputElement>;

  apiUrl = 'https://minuscreators.com/api/subir_capitulo.php';

  obraId = 0;

  tituloCapitulo = '';
  descripcionCapitulo = '';
  numeroCapitulo = '';

  selectedPages: File[] = [];

  cargando = false;
  respuesta = '';

  maxPageFileSize = 8 * 1024 * 1024;

  /*
    Sin límite por cantidad de páginas.
    Este límite solo controla el peso total antes de optimizar.
  */
  maxTotalPagesSize = 300 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.obraId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.obraId) {
      this.router.navigate(['/']);
    }
  }

  get selectedPagesTotalSize(): number {
    return this.selectedPages.reduce((total, file) => total + file.size, 0);
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

  agregarPaginas(files: File[]): void {
    let totalActual = this.selectedPagesTotalSize;
    const paginasValidas: File[] = [];
    let omitidos = 0;

    for (const file of files) {
      if (!this.esImagenValida(file, this.maxPageFileSize)) {
        omitidos++;
        continue;
      }

      if (totalActual + file.size > this.maxTotalPagesSize) {
        omitidos++;
        continue;
      }

      paginasValidas.push(file);
      totalActual += file.size;
    }

    this.selectedPages = [
      ...this.selectedPages,
      ...paginasValidas
    ];

    if (omitidos > 0) {
      this.respuesta =
        this.translationService.getTranslation('Algunas páginas no se agregaron por límite de tamaño');
      return;
    }

    this.respuesta = '';
  }

  removePage(index: number): void {
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

  subirCapitulo(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.obraId) {
      this.respuesta = this.translationService.getTranslation('No se encontró la obra');
      return;
    }

    if (this.selectedPages.length === 0) {
      this.respuesta = this.translationService.getTranslation('Debes agregar al menos una página');
      return;
    }

    if (this.selectedPagesTotalSize > this.maxTotalPagesSize) {
      this.respuesta =
        this.translationService.getTranslation('El peso total de las páginas es demasiado grande');
      return;
    }

    const formData = new FormData();

    formData.append('obra_id', String(this.obraId));
    formData.append('numero_capitulo', this.numeroCapitulo.trim() || '0');
    formData.append('titulo', this.tituloCapitulo.trim() || '');
    formData.append('descripcion', this.descripcionCapitulo.trim() || '');

    this.selectedPages.forEach((file) => {
      formData.append('paginas[]', file);
    });

    this.cargando = true;
    this.respuesta = '';

    if (!this.authService.getCsrfToken()) {
      this.authService.fetchCsrfToken().subscribe({
        next: (csrfRes) => {
          if (!csrfRes.success || !csrfRes.csrfToken) {
            this.cargando = false;
            this.respuesta = this.translationService.getTranslation('No se pudo preparar la subida');
            return;
          }

          this.authService.saveCsrfToken(csrfRes.csrfToken);
          this.enviarCapitulo(formData);
        },
        error: (err) => {
          this.cargando = false;
          this.respuesta = this.translationService.getTranslation('No se pudo preparar la subida');
          console.error(err);
        }
      });

      return;
    }

    this.enviarCapitulo(formData);
  }

  private enviarCapitulo(formData: FormData): void {
    this.http.post<UploadChapterResponse>(
      this.apiUrl,
      formData,
      {
        withCredentials: true,
        headers: this.authService.csrfHeaders()
      }
    ).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.respuesta =
            res.error ||
            this.translationService.getTranslation('No se pudo subir el capítulo');
          return;
        }

        this.respuesta =
          res.mensaje ||
          this.translationService.getTranslation('Capítulo subido correctamente');

        this.selectedPages = [];
        this.tituloCapitulo = '';
        this.descripcionCapitulo = '';
        this.numeroCapitulo = '';

        if (this.fileInputPages) {
          this.fileInputPages.nativeElement.value = '';
        }

        this.router.navigate([
          '/obra',
          this.obraId,
          'capitulo',
          res.numero_capitulo || 1
        ]);
      },
      error: (err) => {
        this.cargando = false;

        if (err.status === 401) {
          this.authService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (err.status === 403) {
          this.respuesta =
            err.error?.error ||
            this.translationService.getTranslation('No tienes permiso para realizar esta acción');
          return;
        }

        if (err.status === 409) {
          this.respuesta =
            err.error?.error ||
            this.translationService.getTranslation('Ya existe un capítulo con ese número');
          return;
        }

        this.respuesta =
          err.error?.error ||
          this.translationService.getTranslation('Error al subir capítulo');

        console.error(err);
      }
    });
  }

  private esImagenValida(file: File, maxSize: number): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= maxSize;
  }
}