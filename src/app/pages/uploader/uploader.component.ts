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
  versiones_guardadas?: number;
  paginas_guardadas?: number;
}

interface SelectOption {
  value: string;
  label: string;
}

interface IdiomaVersionUpload {
  id: string;
  idioma: string;
  paginas: File[];
  isDragging: boolean;
}

interface VersionPayload {
  key: string;
  idioma: string;
  titulo: string;
  descripcion: string;
  numeroCapitulo: number;
  tituloCapitulo: string;
  descripcionCapitulo: string;
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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  apiUrl = 'https://minuscreators.com/api/upload.php';

  selectedFile: File | null = null;
  versionesIdioma: IdiomaVersionUpload[] = [];

  isDragging = false;

  cargando = false;
  respuesta = '';

  maxCategories = 3;

  maxCoverFileSize = 5 * 1024 * 1024;
  maxPageFileSize = 8 * 1024 * 1024;

  /*
    No hay límite por cantidad de páginas.
    Este límite solo controla el peso total seleccionado antes de optimizar,
    sumando todas las versiones de idioma.
  */
  maxTotalPagesSize = 300 * 1024 * 1024;

  selectedCategories: string[] = [];

  private versionCounter = 0;
  private versionPrincipalId = '';

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
      tipoEntrega: ['manga', Validators.required],
      aceptaAutoria: [false, Validators.requiredTrue]
    });

    this.agregarVersionIdioma('ES');
  }

  get totalVersiones(): number {
    return this.versionesIdioma.length;
  }

  get selectedPagesTotalSize(): number {
    return this.versionesIdioma.reduce(
      (total, version) => total + this.getVersionPagesTotalSize(version),
      0
    );
  }

  get canAddLanguageVersion(): boolean {
    return this.versionesIdioma.length < this.idiomas.length;
  }

  trackByCategoriaValue(index: number, categoria: SelectOption): string {
    return categoria.value;
  }

  trackBySelectedCategoria(index: number, categoria: string): string {
    return categoria;
  }

  trackByIdiomaValue(index: number, idioma: SelectOption): string {
    return idioma.value;
  }

  trackByTipoObraValue(index: number, tipo: SelectOption): string {
    return tipo.value;
  }

  trackByVersionId(index: number, version: IdiomaVersionUpload): string {
    return version.id;
  }

  trackByFileName(index: number, file: File): string {
    return `${file.name}-${file.size}-${index}`;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
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

  getIdiomaLabel(value: string): string {
    return this.idiomas.find(idioma => idioma.value === value)?.label || value;
  }

  getAvailableLanguageOptions(version: IdiomaVersionUpload): SelectOption[] {
    const usados = this.versionesIdioma
      .filter(item => item.id !== version.id)
      .map(item => item.idioma);

    return this.idiomas.filter(idioma => {
      return idioma.value === version.idioma || !usados.includes(idioma.value);
    });
  }

  agregarVersionIdioma(idiomaPreferido?: string): void {
    if (!this.canAddLanguageVersion && this.versionesIdioma.length > 0) {
      this.respuesta = this.translationService.getTranslation('Ya agregaste todos los idiomas disponibles');
      return;
    }

    const idioma = this.getPrimerIdiomaDisponible(idiomaPreferido);

    if (!idioma) {
      this.respuesta = this.translationService.getTranslation('Ya agregaste todos los idiomas disponibles');
      return;
    }

    this.versionCounter++;

    const nuevaVersion: IdiomaVersionUpload = {
      id: `version_${Date.now()}_${this.versionCounter}`,
      idioma,
      paginas: [],
      isDragging: false
    };

    if (!this.versionPrincipalId) {
      this.versionPrincipalId = nuevaVersion.id;
    }

    this.versionesIdioma = [
      nuevaVersion,
      ...this.versionesIdioma
    ];

    this.respuesta = '';
  }

  eliminarVersionIdioma(versionId: string): void {
    if (this.versionesIdioma.length <= 1) {
      this.respuesta = this.translationService.getTranslation('Debe existir al menos una versión de idioma');
      return;
    }

    this.versionesIdioma = this.versionesIdioma.filter(version => version.id !== versionId);

    if (this.versionPrincipalId === versionId) {
      this.versionPrincipalId = this.versionesIdioma[0]?.id || '';
    }

    this.respuesta = '';
  }

  onIdiomaVersionChange(version: IdiomaVersionUpload): void {
    const duplicado = this.versionesIdioma.some(item => {
      return item.id !== version.id && item.idioma === version.idioma;
    });

    if (!duplicado) {
      this.respuesta = '';
      return;
    }

    const idiomaDisponible = this.getPrimerIdiomaDisponible();

    if (idiomaDisponible) {
      version.idioma = idiomaDisponible;
    }

    this.respuesta = this.translationService.getTranslation('No puedes tener dos versiones del mismo idioma');
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

  onFilesSelectedVersion(event: Event, version: IdiomaVersionUpload): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.agregarPaginasAVersion(version, Array.from(input.files));
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

    this.agregarPaginasAVersion(version, Array.from(event.dataTransfer.files));
  }

  agregarPaginasAVersion(version: IdiomaVersionUpload, files: File[]): void {
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

    version.paginas = [
      ...version.paginas,
      ...paginasValidas
    ];

    this.versionesIdioma = [...this.versionesIdioma];

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

  removePageFromVersion(version: IdiomaVersionUpload, index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    version.paginas = version.paginas.filter((_, itemIndex) => itemIndex !== index);
    this.versionesIdioma = [...this.versionesIdioma];
  }

  getVersionPagesTotalSize(version: IdiomaVersionUpload): number {
    return version.paginas.reduce((total, file) => total + file.size, 0);
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
    if (this.formulario.get('titulo')?.invalid) {
      this.respuesta = this.translationService.getTranslation('El título es obligatorio');
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.formulario.get('aceptaAutoria')?.value) {
      this.respuesta = this.translationService.getTranslation('Debes aceptar la autoria antes de enviar');
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

    if (this.versionesIdioma.length === 0) {
      this.respuesta = this.translationService.getTranslation('Debes agregar al menos una versión de idioma');
      return;
    }

    if (this.hasDuplicateLanguages()) {
      this.respuesta = this.translationService.getTranslation('No puedes tener dos versiones del mismo idioma');
      return;
    }

    const versionSinPaginas = this.versionesIdioma.find(version => version.paginas.length === 0);

    if (versionSinPaginas) {
      this.respuesta =
        this.translationService.getTranslation('Debes agregar al menos una página para') +
        ` ${this.getIdiomaLabel(versionSinPaginas.idioma)}`;
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
    const titulo = valores.titulo || '';
    const descripcion = valores.descripcion || '';
    const primeraVersion = this.getVersionPrincipal();
    const formData = new FormData();

    formData.append('titulo', titulo);
    formData.append('descripcion', descripcion);

    formData.append('categorias', JSON.stringify(this.selectedCategories));
    formData.append('genero', this.selectedCategories.join(','));

    formData.append('idioma', primeraVersion.idioma);
    formData.append('idiomaVersion', primeraVersion.idioma);
    formData.append('idiomaPrincipal', primeraVersion.idioma);
    formData.append('tituloVersion', titulo);
    formData.append('descripcionVersion', descripcion);

    formData.append('tipoEntrega', valores.tipoEntrega || 'manga');
    formData.append('portada', this.selectedFile);

    const versionesPayload: VersionPayload[] = this.versionesIdioma.map((version) => ({
      key: version.id,
      idioma: version.idioma,
      titulo,
      descripcion,
      numeroCapitulo: 1,
      tituloCapitulo: `${this.translationService.getTranslation('Capítulo')} 1`,
      descripcionCapitulo: ''
    }));

    formData.append('versiones', JSON.stringify(versionesPayload));

    this.versionesIdioma.forEach((version) => {
      version.paginas.forEach((file) => {
        formData.append(`paginas_${version.id}[]`, file);
      });
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

        this.resetUploader();

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

  private resetUploader(): void {
    this.formulario.reset({
      titulo: '',
      descripcion: '',
      tipoEntrega: 'manga',
      aceptaAutoria: false
    });

    this.selectedCategories = [];
    this.selectedFile = null;
    this.versionCounter = 0;
    this.versionPrincipalId = '';
    this.versionesIdioma = [];
    this.agregarVersionIdioma('ES');

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private getVersionPrincipal(): IdiomaVersionUpload {
    return (
      this.versionesIdioma.find(version => version.id === this.versionPrincipalId) ||
      this.versionesIdioma[0]
    );
  }

  private getPrimerIdiomaDisponible(preferido?: string): string {
    const usados = this.versionesIdioma.map(version => version.idioma);
    const normalizado = String(preferido || '').trim().toUpperCase();

    if (normalizado && !usados.includes(normalizado) && this.idiomas.some(idioma => idioma.value === normalizado)) {
      return normalizado;
    }

    const idioma = this.idiomas.find(option => !usados.includes(option.value));

    return idioma?.value || '';
  }

  private hasDuplicateLanguages(): boolean {
    const idiomas = this.versionesIdioma.map(version => version.idioma);
    return new Set(idiomas).size !== idiomas.length;
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
