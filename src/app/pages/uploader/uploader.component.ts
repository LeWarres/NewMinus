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
  labelKey: string;
  nativeLabel?: string;
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
  maxTotalPagesSize = 300 * 1024 * 1024;

  selectedCategories: string[] = [];

  private versionCounter = 0;
  private versionPrincipalId = '';

  idiomas: SelectOption[] = [
    { value: 'GLOBAL', labelKey: 'common.languages.global', nativeLabel: 'Global' },
    { value: 'ES', labelKey: 'common.languages.es', nativeLabel: 'Español' },
    { value: 'EN', labelKey: 'common.languages.en', nativeLabel: 'English' },
    { value: 'JA', labelKey: 'common.languages.ja', nativeLabel: '日本語' },
    { value: 'KO', labelKey: 'common.languages.ko', nativeLabel: '한국어' },
    { value: 'ZH', labelKey: 'common.languages.zh', nativeLabel: '中文' },
    { value: 'FR', labelKey: 'common.languages.fr', nativeLabel: 'Français' },
    { value: 'DE', labelKey: 'common.languages.de', nativeLabel: 'Deutsch' },
    { value: 'PT', labelKey: 'common.languages.pt', nativeLabel: 'Português' },
    { value: 'IT', labelKey: 'common.languages.it', nativeLabel: 'Italiano' },
    { value: 'RU', labelKey: 'common.languages.ru', nativeLabel: 'Русский' },
    { value: 'AR', labelKey: 'common.languages.ar', nativeLabel: 'العربية' },
    { value: 'HI', labelKey: 'common.languages.hi', nativeLabel: 'हिन्दी' },
    { value: 'ID', labelKey: 'common.languages.id', nativeLabel: 'Bahasa Indonesia' },
    { value: 'VI', labelKey: 'common.languages.vi', nativeLabel: 'Tiếng Việt' },
    { value: 'TH', labelKey: 'common.languages.th', nativeLabel: 'ไทย' },
    { value: 'TR', labelKey: 'common.languages.tr', nativeLabel: 'Türkçe' },
    { value: 'PL', labelKey: 'common.languages.pl', nativeLabel: 'Polski' },
    { value: 'NL', labelKey: 'common.languages.nl', nativeLabel: 'Nederlands' }
  ];

  tipoObraOptions: SelectOption[] = [
    { value: 'comic', labelKey: 'common.work_type.comic', nativeLabel: 'Comic' },
    { value: 'manga', labelKey: 'common.work_type.manga', nativeLabel: 'Manga' },
    { value: 'libro', labelKey: 'common.work_type.book', nativeLabel: 'Libro' },
    { value: 'novela', labelKey: 'common.work_type.novel', nativeLabel: 'Novela' },
    { value: 'artwork', labelKey: 'common.work_type.artwork', nativeLabel: 'Artwork' }
  ];

  categorias: SelectOption[] = [
    { value: 'accion', labelKey: 'common.categories.accion', nativeLabel: 'Acción' },
    { value: 'aventura', labelKey: 'common.categories.aventura', nativeLabel: 'Aventura' },
    { value: 'comedia', labelKey: 'common.categories.comedia', nativeLabel: 'Comedia' },
    { value: 'drama', labelKey: 'common.categories.drama', nativeLabel: 'Drama' },
    { value: 'fantasia', labelKey: 'common.categories.fantasia', nativeLabel: 'Fantasía' },
    { value: 'romance', labelKey: 'common.categories.romance', nativeLabel: 'Romance' },
    { value: 'terror', labelKey: 'common.categories.terror', nativeLabel: 'Terror' },
    { value: 'ciencia-ficcion', labelKey: 'common.categories.ciencia_ficcion', nativeLabel: 'Ciencia ficción' },
    { value: 'misterio', labelKey: 'common.categories.misterio', nativeLabel: 'Misterio' },
    { value: 'suspenso', labelKey: 'common.categories.suspenso', nativeLabel: 'Suspenso' },
    { value: 'sobrenatural', labelKey: 'common.categories.sobrenatural', nativeLabel: 'Sobrenatural' },
    { value: 'psicologico', labelKey: 'common.categories.psicologico', nativeLabel: 'Psicológico' },
    { value: 'slice-of-life', labelKey: 'common.categories.slice_of_life', nativeLabel: 'Slice of life' },
    { value: 'vida-escolar', labelKey: 'common.categories.vida_escolar', nativeLabel: 'Vida escolar' },
    { value: 'deportes', labelKey: 'common.categories.deportes', nativeLabel: 'Deportes' },
    { value: 'artes-marciales', labelKey: 'common.categories.artes_marciales', nativeLabel: 'Artes marciales' },
    { value: 'mecha', labelKey: 'common.categories.mecha', nativeLabel: 'Mecha' },
    { value: 'isekai', labelKey: 'common.categories.isekai', nativeLabel: 'Isekai' },
    { value: 'historico', labelKey: 'common.categories.historico', nativeLabel: 'Histórico' },
    { value: 'musica', labelKey: 'common.categories.musica', nativeLabel: 'Música' },
    { value: 'cocina', labelKey: 'common.categories.cocina', nativeLabel: 'Cocina' },
    { value: 'magia', labelKey: 'common.categories.magia', nativeLabel: 'Magia' },
    { value: 'superheroes', labelKey: 'common.categories.superheroes', nativeLabel: 'Superhéroes' },
    { value: 'crimen', labelKey: 'common.categories.crimen', nativeLabel: 'Crimen' },
    { value: 'post-apocaliptico', labelKey: 'common.categories.post_apocaliptico', nativeLabel: 'Post-apocalíptico' },
    { value: 'cyberpunk', labelKey: 'common.categories.cyberpunk', nativeLabel: 'Cyberpunk' },
    { value: 'steampunk', labelKey: 'common.categories.steampunk', nativeLabel: 'Steampunk' },
    { value: 'guerra', labelKey: 'common.categories.guerra', nativeLabel: 'Guerra' },
    { value: 'parodia', labelKey: 'common.categories.parodia', nativeLabel: 'Parodia' },
    { value: 'tragedia', labelKey: 'common.categories.tragedia', nativeLabel: 'Tragedia' },
    { value: 'shonen', labelKey: 'common.categories.shonen', nativeLabel: 'Shonen' },
    { value: 'shojo', labelKey: 'common.categories.shojo', nativeLabel: 'Shojo' },
    { value: 'seinen', labelKey: 'common.categories.seinen', nativeLabel: 'Seinen' },
    { value: 'josei', labelKey: 'common.categories.josei', nativeLabel: 'Josei' },
    { value: 'kodomo', labelKey: 'common.categories.kodomo', nativeLabel: 'Kodomo' },
    { value: 'boys-love', labelKey: 'common.categories.boys_love', nativeLabel: 'Boys Love' },
    { value: 'girls-love', labelKey: 'common.categories.girls_love', nativeLabel: 'Girls Love' },
    { value: 'nsfw', labelKey: 'common.categories.nsfw', nativeLabel: 'NSFW' }
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
        'common.error.max_categories'
      );
      return;
    }

    this.selectedCategories = [
      ...this.selectedCategories,
      value
    ];

    this.respuesta = '';
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

  getCategoryLabel(value: string): string {
    const option = this.categorias.find(categoria => categoria.value === value);

    if (!option) {
      return value;
    }

    return this.getOptionLabel(option);
  }

  getSelectOptionLabel(option?: SelectOption): string {
  return this.getOptionLabel(option);
}

  getIdiomaLabel(value: string): string {
    const option = this.idiomas.find(idioma => idioma.value === value);

    if (!option) {
      return value;
    }

    return this.getOptionLabel(option);
  }

  getTipoObraLabel(value: string): string {
    const option = this.tipoObraOptions.find(tipo => tipo.value === value);

    if (!option) {
      return value;
    }

    return this.getOptionLabel(option);
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
      this.respuesta = this.translationService.getTranslation('common.error.all_languages_added');
      return;
    }

    const idioma = this.getPrimerIdiomaDisponible(idiomaPreferido);

    if (!idioma) {
      this.respuesta = this.translationService.getTranslation('common.error.all_languages_added');
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
      this.respuesta = this.translationService.getTranslation('uploader.error.min_one_language_version');
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

    this.respuesta = this.translationService.getTranslation('uploader.error.duplicate_language_versions');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file, this.maxCoverFileSize)) {
      this.respuesta =
        this.translationService.getTranslation('common.error.cover_invalid_max') +
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
        this.translationService.getTranslation('common.error.cover_invalid_max') +
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
        this.translationService.getTranslation('common.error.pages_skipped_size_limit');
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
      this.respuesta = this.translationService.getTranslation('common.validation.title_required');
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.formulario.get('aceptaAutoria')?.value) {
      this.respuesta = this.translationService.getTranslation('uploader.error.accept_authorship_required');
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.selectedCategories.length > this.maxCategories) {
      this.respuesta = this.translationService.getTranslation(
        'common.error.max_categories'
      );
      return;
    }

    if (!this.selectedFile) {
      this.respuesta = this.translationService.getTranslation('uploader.error.cover_required');
      return;
    }

    if (this.versionesIdioma.length === 0) {
      this.respuesta = this.translationService.getTranslation('uploader.error.add_at_least_one_language');
      return;
    }

    if (this.hasDuplicateLanguages()) {
      this.respuesta = this.translationService.getTranslation('uploader.error.duplicate_language_versions');
      return;
    }

    const versionSinPaginas = this.versionesIdioma.find(version => version.paginas.length === 0);

    if (versionSinPaginas) {
      this.respuesta =
        this.translationService.getTranslation('uploader.error.add_at_least_one_page_for') +
        ` ${this.getIdiomaLabel(versionSinPaginas.idioma)}`;
      return;
    }

    if (this.selectedPagesTotalSize > this.maxTotalPagesSize) {
      this.respuesta =
        this.translationService.getTranslation('common.error.total_pages_size_too_large');
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
      tituloCapitulo: `${this.translationService.getTranslation('common.labels.chapter')} 1`,
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
            this.respuesta = this.translationService.getTranslation('common.error.prepare_upload_failed');
            return;
          }

          this.authService.saveCsrfToken(csrfRes.csrfToken);
          this.subirObra(formData);
        },
        error: (err) => {
          this.cargando = false;
          this.respuesta = this.translationService.getTranslation('common.error.prepare_upload_failed');
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
            this.translationService.getTranslation('uploader.error.save_work_failed');
          return;
        }

        this.respuesta =
          res.mensaje ||
          this.translationService.getTranslation('uploader.success.work_saved');

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
            this.translationService.getTranslation('common.error.no_permission');
          return;
        }

        this.respuesta =
          err.error?.error ||
          this.translationService.getTranslation('uploader.error.save_work_error');

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

    if (
      normalizado &&
      !usados.includes(normalizado) &&
      this.idiomas.some(idioma => idioma.value === normalizado)
    ) {
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
