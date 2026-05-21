import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

interface UploadResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  obra_id?: number;
  capitulo_id?: number;
  usuario_id?: number;
  portada?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent {
    // trackBy para categorías
    trackByCategoriaValue(index: number, categoria: any): string {
      return categoria.value;
    }

    // trackBy para categorías seleccionadas (pueden ser string)
    trackBySelectedCategoria(index: number, categoria: any): any {
      return typeof categoria === 'string' ? categoria : categoria.value;
    }

    // trackBy para idiomas
    trackByIdiomaValue(index: number, idioma: any): string {
      return idioma.value;
    }

    // trackBy para tipo de obra
    trackByTipoObraValue(index: number, tipo: any): string {
      return tipo.value;
    }

    // trackBy para archivos
    trackByFileName(index: number, file: any): string {
      return file.name;
    }
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputPages') fileInputPages!: ElementRef<HTMLInputElement>;

  apiUrl = 'https://minuscreators.com/api/upload.php';

  selectedFile: File | null = null;
  selectedPages: File[] = [];

  isDragging = false;
  isDraggingPages = false;

  cargando = false;
  respuesta = '';

  maxCategories = 3;

  maxCoverFileSize = 5 * 1024 * 1024;
  maxPageFileSize = 8 * 1024 * 1024;

  /*
    No hay límite por cantidad de páginas.
    Este límite solo controla el peso total seleccionado antes de optimizar.
  */
  maxTotalPagesSize = 300 * 1024 * 1024;

  selectedCategories: string[] = [];

  idiomas: SelectOption[] = [
    { value: 'GLOBAL', label: 'Global' },
    { value: 'ES', label: 'Español / Spanish' },
    { value: 'EN', label: 'English' },
    { value: 'JA', label: '日本語 / Japanese' },
    { value: 'KO', label: '한국어 / Korean' },
    { value: 'ZH', label: '中文 / Chinese' },
    { value: 'FR', label: 'Français / French' },
    { value: 'DE', label: 'Deutsch / German' },
    { value: 'PT', label: 'Português / Portuguese' },
    { value: 'IT', label: 'Italiano / Italian' },
    { value: 'RU', label: 'Русский / Russian' },
    { value: 'AR', label: 'العربية / Arabic' },
    { value: 'HI', label: 'हिन्दी / Hindi' },
    { value: 'ID', label: 'Bahasa Indonesia' },
    { value: 'VI', label: 'Tiếng Việt / Vietnamese' },
    { value: 'TH', label: 'ไทย / Thai' },
    { value: 'TR', label: 'Türkçe / Turkish' },
    { value: 'PL', label: 'Polski / Polish' },
    { value: 'NL', label: 'Nederlands / Dutch' }
  ];

  tipoObraOptions: SelectOption[] = [
    { value: 'comic', label: 'Comic' },
    { value: 'manga', label: 'Manga' },
    { value: 'libro', label: 'Libro' },
    { value: 'novela', label: 'Novela' },
    { value: 'artwork', label: 'Artwork' }
  ];

  categorias: SelectOption[] = [
    { value: 'accion', label: 'Acción' },
    { value: 'aventura', label: 'Aventura' },
    { value: 'comedia', label: 'Comedia' },
    { value: 'drama', label: 'Drama' },
    { value: 'fantasia', label: 'Fantasía' },
    { value: 'romance', label: 'Romance' },
    { value: 'terror', label: 'Terror' },
    { value: 'ciencia-ficcion', label: 'Ciencia ficción' },
    { value: 'misterio', label: 'Misterio' },
    { value: 'suspenso', label: 'Suspenso' },
    { value: 'sobrenatural', label: 'Sobrenatural' },
    { value: 'psicologico', label: 'Psicológico' },
    { value: 'slice-of-life', label: 'Slice of life' },
    { value: 'vida-escolar', label: 'Vida escolar' },
    { value: 'deportes', label: 'Deportes' },
    { value: 'artes-marciales', label: 'Artes marciales' },
    { value: 'mecha', label: 'Mecha' },
    { value: 'isekai', label: 'Isekai' },
    { value: 'historico', label: 'Histórico' },
    { value: 'musica', label: 'Música' },
    { value: 'cocina', label: 'Cocina' },
    { value: 'magia', label: 'Magia' },
    { value: 'superheroes', label: 'Superhéroes' },
    { value: 'crimen', label: 'Crimen' },
    { value: 'post-apocaliptico', label: 'Post-apocalíptico' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'guerra', label: 'Guerra' },
    { value: 'parodia', label: 'Parodia' },
    { value: 'tragedia', label: 'Tragedia' },
    { value: 'shonen', label: 'Shonen' },
    { value: 'shojo', label: 'Shojo' },
    { value: 'seinen', label: 'Seinen' },
    { value: 'josei', label: 'Josei' },
    { value: 'kodomo', label: 'Kodomo' },
    { value: 'boys-love', label: 'Boys Love' },
    { value: 'girls-love', label: 'Girls Love' },
    { value: 'nsfw', label: 'NSFW' }
  ];

  formulario!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {
    this.formulario = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: [''],
      idioma: ['GLOBAL'],
      tipoEntrega: ['manga', Validators.required]
    });
  }

  get selectedPagesTotalSize(): number {
    return this.selectedPages.reduce((total, file) => total + file.size, 0);
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  triggerFileInputPages(): void {
    this.fileInputPages.nativeElement.click();
  }

  isCategorySelected(value: string): boolean {
    return this.selectedCategories.includes(value);
  }

  toggleCategory(value: string): void {
    if (this.isCategorySelected(value)) {
      this.selectedCategories = this.selectedCategories.filter(
        categoria => categoria !== value
      );
      this.respuesta = '';
      return;
    }

    if (this.selectedCategories.length >= this.maxCategories) {
      this.respuesta = this.translationService.getTranslation(
        'Solo puedes seleccionar hasta 3 categorías'
      );
      return;
    }

    this.selectedCategories = [
      ...this.selectedCategories,
      value
    ];

    this.respuesta = '';
  }

  getCategoryLabel(value: string): string {
    return this.categorias.find(categoria => categoria.value === value)?.label || value;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file, this.maxCoverFileSize)) {
      this.respuesta =
        this.translationService.getTranslation('La portada debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxCoverFileSize)}`;

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

    if (!this.esImagenValida(file, this.maxCoverFileSize)) {
      this.respuesta =
        this.translationService.getTranslation('La portada debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxCoverFileSize)}`;

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

    if (this.selectedCategories.length > this.maxCategories) {
      this.respuesta = this.translationService.getTranslation(
        'Solo puedes seleccionar hasta 3 categorías'
      );
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

    if (this.selectedPagesTotalSize > this.maxTotalPagesSize) {
      this.respuesta =
        this.translationService.getTranslation('El peso total de las páginas es demasiado grande');
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const valores = this.formulario.value;
    const formData = new FormData();

    formData.append('titulo', valores.titulo || '');
    formData.append('descripcion', valores.descripcion || '');

    formData.append('categorias', JSON.stringify(this.selectedCategories));
    formData.append('genero', this.selectedCategories.join(','));

    formData.append('idioma', valores.idioma || 'GLOBAL');
    formData.append('tipoEntrega', valores.tipoEntrega || 'manga');

    formData.append('portada', this.selectedFile);

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
          this.subirObra(formData);
        },
        error: (err) => {
          this.cargando = false;
          this.respuesta = this.translationService.getTranslation('No se pudo preparar la subida');
          console.error(err);
        }
      });

      return;
    }

    this.subirObra(formData);
  }

  private subirObra(formData: FormData): void {
    this.http.post<UploadResponse>(
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
            this.translationService.getTranslation('No se pudo guardar la obra');
          return;
        }

        this.respuesta =
          res.mensaje ||
          this.translationService.getTranslation('Obra guardada correctamente');

        this.formulario.reset({
          titulo: '',
          descripcion: '',
          idioma: 'GLOBAL',
          tipoEntrega: 'manga'
        });

        this.selectedCategories = [];
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

        this.respuesta =
          err.error?.error ||
          this.translationService.getTranslation('Error al guardar la obra');

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