import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

import { UploaderWorkInfoComponent } from './components/uploader-work-info/uploader-work-info.component';
import { UploaderCoverUploadComponent } from './components/uploader-cover-upload/uploader-cover-upload.component';
import { UploaderLanguageVersionsComponent } from './components/uploader-language-versions/uploader-language-versions.component';
import { UploaderAuthorshipComponent } from './components/uploader-authorship/uploader-authorship.component';
import { IDIOMA_OPTIONS, TIPO_OBRA_OPTIONS, WORK_CATEGORY_OPTIONS } from './uploader.options';
import { IdiomaVersionUpload, SelectOption, UploadResponse, VersionFilesEvent, VersionPageRemoveEvent, VersionPayload } from './uploader.models';

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UploaderWorkInfoComponent,
    UploaderCoverUploadComponent,
    UploaderLanguageVersionsComponent,
    UploaderAuthorshipComponent
  ],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent {

  apiUrl = 'https://minuscreators.com/api/upload.php';

  selectedFile: File | null = null;
  artworkFiles: File[] = [];
  versionesIdioma: IdiomaVersionUpload[] = [];


  cargando = false;
  respuesta = '';

  maxCategories = 3;

  maxCoverFileSize = 5 * 1024 * 1024;
  maxPageFileSize = 5 * 1024 * 1024;
  maxTotalPagesSize = 300 * 1024 * 1024;

  selectedCategories: string[] = [];

  private versionCounter = 0;
  private versionPrincipalId = '';

  idiomas: SelectOption[] = IDIOMA_OPTIONS;
  tipoObraOptions: SelectOption[] = TIPO_OBRA_OPTIONS;
  categorias: SelectOption[] = WORK_CATEGORY_OPTIONS;

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

    this.formulario.get('tipoEntrega')?.valueChanges.subscribe((tipoEntrega) => {
      this.onTipoEntregaChange(tipoEntrega);
    });

    this.agregarVersionIdioma('ES');
  }

  get totalVersiones(): number {
    return this.isArtworkSelected ? 1 : this.versionesIdioma.length;
  }

  get selectedPagesTotalSize(): number {
    if (this.isArtworkSelected) {
      return this.artworkFiles.reduce((total, file) => total + file.size, 0);
    }

    return this.versionesIdioma.reduce(
      (total, version) => total + this.getVersionPagesTotalSize(version),
      0
    );
  }

  get canAddLanguageVersion(): boolean {
    if (this.isArtworkSelected) {
      return false;
    }

    return this.versionesIdioma.length < this.idiomas.filter(idioma => idioma.value !== 'GLOBAL').length;
  }

  get isArtworkSelected(): boolean {
    return this.formulario.get('tipoEntrega')?.value === 'artwork';
  }

  get artworkGlobalVersion(): IdiomaVersionUpload {
    let version = this.versionesIdioma[0];

    if (!version) {
      version = this.createLanguageVersion('GLOBAL');
      this.versionesIdioma = [version];
      this.versionPrincipalId = version.id;
    }

    return {
      ...version,
      idioma: 'GLOBAL',
      paginas: this.artworkFiles
    };
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

  onCoverSelected(file: File): void {
    this.onCoverFilesSelected([file]);
  }

  onCoverFilesSelected(files: File[]): void {
    if (files.length === 0) {
      return;
    }

    const file = files[0];

    if (!this.esImagenValida(file, this.maxCoverFileSize)) {
      this.respuesta =
        this.translationService.getTranslation('common.error.cover_invalid_max') +
        ` ${this.formatSize(this.maxCoverFileSize)}`;
      return;
    }

    this.selectedFile = file;

    if (!this.isArtworkSelected) {
      this.artworkFiles = [];
    }

    this.respuesta = '';
  }

  onArtworkFileRemoved(index: number): void {
    if (!this.isArtworkSelected) {
      return;
    }

    this.artworkFiles = this.artworkFiles.filter((_, itemIndex) => itemIndex !== index);
    this.respuesta = '';
  }

  onCoverRemoved(): void {
    this.selectedFile = null;
    this.respuesta = '';
  }

  onVersionFilesSelected(event: VersionFilesEvent): void {
    this.agregarPaginasAVersion(event.version, event.files);
  }

  onVersionPageRemove(event: VersionPageRemoveEvent): void {
    this.removePageFromVersion(event.version, event.index);
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
      if (!this.isArtworkSelected && idioma.value === 'GLOBAL') {
        return false;
      }

      return idioma.value === version.idioma || !usados.includes(idioma.value);
    });
  }

  onTipoEntregaChange(tipoEntrega?: string): void {
    const normalizedType = String(tipoEntrega || '').trim().toLowerCase();

    if (normalizedType === 'artwork') {
      const artworkVersion = this.createLanguageVersion('GLOBAL');
      this.versionesIdioma = [artworkVersion];
      this.versionPrincipalId = artworkVersion.id;
      this.artworkFiles = [];
      this.respuesta = '';
      return;
    }

    if (this.versionesIdioma.length === 0 || this.versionesIdioma.every(version => version.idioma === 'GLOBAL')) {
      this.versionesIdioma = [];
      this.versionPrincipalId = '';
      this.agregarVersionIdioma('ES');
    }

    this.artworkFiles = [];
  }

  private createLanguageVersion(idioma: string): IdiomaVersionUpload {
    this.versionCounter++;

    return {
      id: `version_${Date.now()}_${this.versionCounter}`,
      idioma,
      paginas: [],
      isDragging: false
    };
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

    if (this.isArtworkSelected) {
      this.respuesta = this.translationService.getTranslation('uploader.artwork.global_only');
      return;
    }

    const nuevaVersion = this.createLanguageVersion(idioma);

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
    if (this.isArtworkSelected) {
      this.respuesta = this.translationService.getTranslation('uploader.artwork.global_only');
      return;
    }

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
    if (this.isArtworkSelected) {
      version.idioma = 'GLOBAL';
      return;
    }

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

  agregarPaginasAVersion(version: IdiomaVersionUpload, files: File[]): void {
    if (this.isArtworkSelected) {
      this.setArtworkFiles(files);
      return;
    }

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
  }

  removePageFromVersion(version: IdiomaVersionUpload, index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isArtworkSelected) {
      this.artworkFiles = this.artworkFiles.filter((_, itemIndex) => itemIndex !== index);
      this.respuesta = '';
      return;
    }

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

    if (this.isArtworkSelected && this.artworkFiles.length === 0) {
      this.respuesta = this.translationService.getTranslation('uploader.artwork.error.add_at_least_one_image');
      return;
    }

    if (!this.isArtworkSelected) {
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
    }

    if (this.isArtworkSelected && this.selectedPagesTotalSize > this.maxTotalPagesSize) {
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
    const tipoEntrega = String(valores.tipoEntrega || 'manga').trim().toLowerCase();
    const primeraVersion = this.isArtworkSelected
      ? this.artworkGlobalVersion
      : this.getVersionPrincipal();

    const versionesParaSubir = this.isArtworkSelected
      ? [this.artworkGlobalVersion]
      : this.versionesIdioma;

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

    formData.append('tipoEntrega', tipoEntrega);
    formData.append('portada', this.selectedFile);

    if (this.isArtworkSelected) {
      formData.append('artworkGlobal', '1');
    }

    const versionesPayload: VersionPayload[] = versionesParaSubir.map((version) => ({
      key: version.id,
      idioma: this.isArtworkSelected ? 'GLOBAL' : version.idioma,
      titulo,
      descripcion,
      numeroCapitulo: 1,
      tituloCapitulo: this.isArtworkSelected
        ? titulo
        : `${this.translationService.getTranslation('common.labels.chapter')} 1`,
      descripcionCapitulo: this.isArtworkSelected ? descripcion : ''
    }));

    formData.append('versiones', JSON.stringify(versionesPayload));

    versionesParaSubir.forEach((version) => {
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

  private setArtworkFiles(files: File[]): void {
    const paginasValidas: File[] = [];
    let totalActual = this.artworkFiles.reduce((total, file) => total + file.size, 0);
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

    this.artworkFiles = [
      ...this.artworkFiles,
      ...paginasValidas
    ];

    if (omitidos > 0) {
      this.respuesta = this.translationService.getTranslation('common.error.pages_skipped_size_limit');
      return;
    }

    this.respuesta = '';
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
    this.artworkFiles = [];
    this.versionCounter = 0;
    this.versionPrincipalId = '';
    this.versionesIdioma = [];
    this.agregarVersionIdioma('ES');
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
    const idiomasDisponibles = this.idiomas.filter(option => {
      return this.isArtworkSelected || option.value !== 'GLOBAL';
    });

    if (
      normalizado &&
      !usados.includes(normalizado) &&
      idiomasDisponibles.some(idioma => idioma.value === normalizado)
    ) {
      return normalizado;
    }

    const idioma = idiomasDisponibles.find(option => !usados.includes(option.value));

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
