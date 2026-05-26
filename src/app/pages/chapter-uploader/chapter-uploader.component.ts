import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

import { ChapterUploaderHeaderComponent } from './components/chapter-uploader-header/chapter-uploader-header.component';
import { ChapterVersionCardComponent } from './components/chapter-version-card/chapter-version-card.component';
import { ChapterUploadSummaryComponent } from './components/chapter-upload-summary/chapter-upload-summary.component';
import { CHAPTER_LANGUAGE_OPTIONS, GLOBAL_LANGUAGE, isChapterLanguageCode } from './chapter-uploader.options';
import {
  ChapterLanguageOption,
  ChapterLanguageVersion,
  ObraPreviewResponse,
  UploadChapterResponse,
  VersionFilesEvent,
  VersionPageRemoveEvent
} from './chapter-uploader.models';

@Component({
  selector: 'app-chapter-uploader',
  standalone: true,
  imports: [
    CommonModule,
    ChapterUploaderHeaderComponent,
    ChapterVersionCardComponent,
    ChapterUploadSummaryComponent
  ],
  templateUrl: './chapter-uploader.component.html',
  styleUrl: './chapter-uploader.component.css'
})
export class ChapterUploaderComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/subir_capitulo.php';
  obraPreviewUrl = 'https://minuscreators.com/api/obra_preview.php';

  obraId = 0;
  obraTipoEntrega = '';

  versiones: ChapterLanguageVersion[] = [];

  cargando = false;
  loadingWorkType = false;
  respuesta = '';

  maxPageFileSize = 5 * 1024 * 1024;
  maxTotalPagesSize = 300 * 1024 * 1024;

  idiomas: ChapterLanguageOption[] = CHAPTER_LANGUAGE_OPTIONS;

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
      return;
    }

    this.aplicarTipoObra(this.obtenerTipoObraDesdeRuta());
    this.inicializarVersiones();
    this.cargarTipoObra();
  }

  get isArtworkWork(): boolean {
    return this.obraTipoEntrega === 'artwork';
  }

  get canAddLanguageVersion(): boolean {
    if (this.isArtworkWork) {
      return false;
    }

    return this.versiones.length < this.idiomas.length;
  }

  get totalPagesSize(): number {
    return this.versiones.reduce(
      (total, version) => total + this.getVersionPagesTotalSize(version),
      0
    );
  }

  get totalPagesCount(): number {
    return this.versiones.reduce(
      (total, version) => total + version.pages.length,
      0
    );
  }

  agregarVersionIdioma(): void {
    if (this.isArtworkWork) {
      this.forzarVersionGlobalArtwork();
      this.respuesta = this.translationService.getTranslation('uploader.artwork.global_only');
      return;
    }

    const idioma = this.getPrimerIdiomaDisponible();

    if (!idioma) {
      this.respuesta = this.translationService.getTranslation('common.error.all_languages_added');
      return;
    }

    const nuevaVersion = this.createLanguageVersion(idioma);

    this.versiones = [
      nuevaVersion,
      ...this.versiones
    ];

    this.respuesta = '';
  }

  eliminarVersionIdioma(version: ChapterLanguageVersion): void {
    if (this.isArtworkWork) {
      this.forzarVersionGlobalArtwork();
      this.respuesta = this.translationService.getTranslation('uploader.artwork.global_only');
      return;
    }

    if (this.versiones.length <= 1) {
      this.respuesta = this.translationService.getTranslation('chapterUploader.error.min_one_language_version');
      return;
    }

    this.versiones = this.versiones.filter(item => item.uid !== version.uid);
    this.respuesta = '';
  }

  onIdiomaChange(version: ChapterLanguageVersion): void {
    if (this.isArtworkWork) {
      version.idioma = GLOBAL_LANGUAGE;
      this.forzarVersionGlobalArtwork();
      this.respuesta = '';
      return;
    }

    const idiomaNormalizado = String(version.idioma || '').trim().toUpperCase();

    if (!this.esIdiomaPermitido(idiomaNormalizado)) {
      version.idioma = this.getPrimerIdiomaDisponible(version.uid) || GLOBAL_LANGUAGE;
      return;
    }

    const duplicado = this.versiones.some(item => {
      return item.uid !== version.uid && item.idioma === idiomaNormalizado;
    });

    if (duplicado) {
      this.respuesta = this.translationService.getTranslation('chapterUploader.error.duplicate_language');
      version.idioma = this.getPrimerIdiomaDisponible(version.uid) || GLOBAL_LANGUAGE;
      return;
    }

    version.idioma = idiomaNormalizado;
    this.respuesta = '';
  }

  onVersionFilesSelected(event: VersionFilesEvent): void {
    this.agregarPaginas(event.version, event.files);
  }

  onVersionPageRemove(event: VersionPageRemoveEvent): void {
    this.removePage(event.version, event.index);
  }

  agregarPaginas(version: ChapterLanguageVersion, files: File[]): void {
    if (this.isArtworkWork) {
      version.idioma = GLOBAL_LANGUAGE;
    }

    let totalActual = this.totalPagesSize;
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

    version.pages = [
      ...version.pages,
      ...paginasValidas
    ];

    this.versiones = [...this.versiones];

    if (omitidos > 0) {
      this.respuesta = this.translationService.getTranslation('common.error.pages_skipped_size_limit');
      return;
    }

    this.respuesta = '';
  }

  removePage(version: ChapterLanguageVersion, index: number): void {
    version.pages = version.pages.filter((_, itemIndex) => itemIndex !== index);
    this.versiones = [...this.versiones];
    this.respuesta = '';
  }

  getVersionPagesTotalSize(version: ChapterLanguageVersion): number {
    return version.pages.reduce((total, file) => total + file.size, 0);
  }

  subirCapitulo(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.obraId) {
      this.respuesta = this.translationService.getTranslation('common.error.work_not_found');
      return;
    }

    if (this.isArtworkWork) {
      this.forzarVersionGlobalArtwork();
    }

    if (this.versiones.length === 0) {
      this.respuesta = this.translationService.getTranslation('chapterUploader.error.add_at_least_one_language');
      return;
    }

    if (!this.validarVersiones()) {
      return;
    }

    if (this.totalPagesSize > this.maxTotalPagesSize) {
      this.respuesta = this.translationService.getTranslation('common.error.total_pages_size_too_large');
      return;
    }

    const versionesParaSubir = this.isArtworkWork
      ? [this.getArtworkGlobalVersion()]
      : this.versiones;

    const primeraVersion = versionesParaSubir[0];
    const formData = new FormData();

    formData.append('obra_id', String(this.obraId));
    formData.append('idioma', primeraVersion.idioma || GLOBAL_LANGUAGE);
    formData.append('titulo', primeraVersion.titulo.trim() || '');
    formData.append('descripcion', primeraVersion.descripcion.trim() || '');

    if (this.isArtworkWork) {
      formData.append('tipoEntrega', 'artwork');
      formData.append('artworkGlobal', '1');
    }

    const versionesPayload = versionesParaSubir.map(version => ({
      uid: version.uid,
      idioma: this.isArtworkWork ? GLOBAL_LANGUAGE : version.idioma,
      titulo: version.titulo.trim(),
      descripcion: version.descripcion.trim()
    }));

    formData.append('idiomaVersiones', JSON.stringify(versionesPayload));

    versionesParaSubir.forEach(version => {
      version.pages.forEach(file => {
        formData.append(`paginas_${version.uid}[]`, file);
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
          this.enviarCapitulo(formData, primeraVersion.idioma);
        },
        error: (err) => {
          this.cargando = false;
          this.respuesta = this.translationService.getTranslation('common.error.prepare_upload_failed');
          console.error(err);
        }
      });

      return;
    }

    this.enviarCapitulo(formData, primeraVersion.idioma);
  }

  trackByVersionUid(index: number, version: ChapterLanguageVersion): string {
    return version.uid || String(index);
  }

  private cargarTipoObra(): void {
    this.loadingWorkType = true;

    this.http.get<ObraPreviewResponse>(
      `${this.obraPreviewUrl}?id=${this.obraId}`,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.loadingWorkType = false;

        if (!res.success || !res.obra) {
          return;
        }

        this.aplicarTipoObra(res.obra.tipoEntrega || '');
      },
      error: (err) => {
        this.loadingWorkType = false;
        console.error(err);
      }
    });
  }

  private aplicarTipoObra(tipoEntrega?: string): void {
    const tipoNormalizado = this.normalizarTipoObra(tipoEntrega);

    if (!tipoNormalizado) {
      return;
    }

    this.obraTipoEntrega = tipoNormalizado;

    if (this.isArtworkWork) {
      this.forzarVersionGlobalArtwork();
      return;
    }

    if (this.versiones.length === 0) {
      this.inicializarVersiones();
    }
  }

  private inicializarVersiones(): void {
    if (this.versiones.length > 0) {
      return;
    }

    this.versiones = [
      this.createLanguageVersion(this.isArtworkWork ? GLOBAL_LANGUAGE : 'ES')
    ];
  }

  private forzarVersionGlobalArtwork(): void {
    const versionesActuales = this.versiones;
    const versionBase =
      versionesActuales.find(version => version.pages.length > 0) ||
      versionesActuales[0] ||
      this.createLanguageVersion(GLOBAL_LANGUAGE);

    const paginasGlobales = versionesActuales.flatMap(version => version.pages);
    const tituloGlobal = versionBase.titulo || versionesActuales.find(version => version.titulo.trim())?.titulo || '';
    const descripcionGlobal =
      versionBase.descripcion ||
      versionesActuales.find(version => version.descripcion.trim())?.descripcion ||
      '';

    this.versiones = [
      {
        ...versionBase,
        idioma: GLOBAL_LANGUAGE,
        titulo: tituloGlobal,
        descripcion: descripcionGlobal,
        pages: paginasGlobales.length > 0 ? paginasGlobales : versionBase.pages,
        isDragging: false
      }
    ];
  }

  private getArtworkGlobalVersion(): ChapterLanguageVersion {
    this.forzarVersionGlobalArtwork();
    return this.versiones[0];
  }

  private obtenerTipoObraDesdeRuta(): string {
    const queryParamType =
      this.route.snapshot.queryParamMap.get('tipoEntrega') ||
      this.route.snapshot.queryParamMap.get('tipoObra') ||
      this.route.snapshot.queryParamMap.get('tipo') ||
      '';

    const dataType = String(this.route.snapshot.data?.['tipoEntrega'] || '');

    return queryParamType || dataType;
  }

  private enviarCapitulo(formData: FormData, idiomaFallback: string): void {
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
            this.translationService.getTranslation('chapterUploader.error.upload_failed');
          return;
        }

        this.respuesta =
          res.mensaje ||
          this.translationService.getTranslation('chapterUploader.success.uploaded');

        this.router.navigate(
          [
            '/obra',
            this.obraId,
            'capitulo',
            res.numero_capitulo || 1
          ],
          {
            queryParams: {
              idioma: this.isArtworkWork ? GLOBAL_LANGUAGE : (res.idioma || idiomaFallback || GLOBAL_LANGUAGE)
            }
          }
        );
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

        if (err.status === 409) {
          this.respuesta =
            err.error?.error ||
            this.translationService.getTranslation('chapterUploader.error.language_version_exists');
          return;
        }

        this.respuesta =
          err.error?.error ||
          this.translationService.getTranslation('chapterUploader.error.upload_error');

        console.error(err);
      }
    });
  }

  private validarVersiones(): boolean {
    const idiomasUsados = new Set<string>();

    if (this.isArtworkWork && this.versiones.length !== 1) {
      this.forzarVersionGlobalArtwork();
    }

    for (const version of this.versiones) {
      const idioma = this.isArtworkWork
        ? GLOBAL_LANGUAGE
        : String(version.idioma || '').trim().toUpperCase();

      if (!this.esIdiomaPermitido(idioma)) {
        this.respuesta = this.translationService.getTranslation('chapterUploader.error.invalid_language');
        return false;
      }

      if (idiomasUsados.has(idioma)) {
        this.respuesta = this.translationService.getTranslation('chapterUploader.error.duplicate_language');
        return false;
      }

      idiomasUsados.add(idioma);
      version.idioma = idioma;

      if (version.titulo.trim().length > 150) {
        this.respuesta = this.translationService.getTranslation('chapterUploader.error.title_too_long');
        return false;
      }

      if (version.descripcion.trim().length > 5000) {
        this.respuesta = this.translationService.getTranslation('chapterUploader.error.description_too_long');
        return false;
      }

      if (version.pages.length === 0) {
        this.respuesta = this.translationService.getTranslation('chapterUploader.error.at_least_one_page_per_language');
        return false;
      }
    }

    return true;
  }

  private getPrimerIdiomaDisponible(ignoreUid?: string): string {
    if (this.isArtworkWork) {
      return GLOBAL_LANGUAGE;
    }

    const usados = new Set(
      this.versiones
        .filter(version => version.uid !== ignoreUid)
        .map(version => version.idioma)
    );

    return this.idiomas.find(idioma => !usados.has(idioma.value))?.value || '';
  }

  private createLanguageVersion(idioma: string): ChapterLanguageVersion {
    return {
      uid: this.crearUid(),
      idioma,
      titulo: '',
      descripcion: '',
      pages: [],
      isDragging: false
    };
  }

  private crearUid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().replace(/-/g, '');
    }

    return `v${Date.now()}${Math.random().toString(16).slice(2)}`.replace(/[^a-zA-Z0-9]/g, '');
  }

  private esIdiomaPermitido(value: string): boolean {
    return isChapterLanguageCode(value);
  }

  private esImagenValida(file: File, maxSize: number): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= maxSize;
  }

  private normalizarTipoObra(tipoEntrega?: string): string {
    const normalized = String(tipoEntrega || '').trim().toLowerCase();

    const allowed = [
      'comic',
      'manga',
      'libro',
      'novela',
      'artwork'
    ];

    return allowed.includes(normalized)
      ? normalized
      : '';
  }
}
