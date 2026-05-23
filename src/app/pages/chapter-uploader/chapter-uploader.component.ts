import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  idioma?: string;
  versiones_guardadas?: number;
  paginas_guardadas?: number;
}

interface SelectOption {
  value: string;
  labelKey: string;
  nativeLabel: string;
}

interface ChapterLanguageVersion {
  uid: string;
  idioma: string;
  titulo: string;
  descripcion: string;
  pages: File[];
  isDragging: boolean;
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
  apiUrl = 'https://minuscreators.com/api/subir_capitulo.php';

  obraId = 0;

  versiones: ChapterLanguageVersion[] = [];

  cargando = false;
  respuesta = '';

  maxPageFileSize = 8 * 1024 * 1024;

  maxTotalPagesSize = 300 * 1024 * 1024;

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

    this.agregarVersionIdioma();
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
    const idioma = this.getPrimerIdiomaDisponible();

    if (!idioma) {
      this.respuesta = this.translationService.getTranslation('common.error.all_languages_added');
      return;
    }

    const nuevaVersion: ChapterLanguageVersion = {
      uid: this.crearUid(),
      idioma,
      titulo: '',
      descripcion: '',
      pages: [],
      isDragging: false
    };

    this.versiones = [
      nuevaVersion,
      ...this.versiones
    ];

    this.respuesta = '';
  }

  eliminarVersionIdioma(version: ChapterLanguageVersion): void {
    if (this.versiones.length <= 1) {
      this.respuesta = this.translationService.getTranslation('chapterUploader.error.min_one_language_version');
      return;
    }

    this.versiones = this.versiones.filter(item => item.uid !== version.uid);
    this.respuesta = '';
  }

  onIdiomaChange(version: ChapterLanguageVersion): void {
    const idiomaNormalizado = String(version.idioma || '').trim().toUpperCase();

    if (!this.esIdiomaPermitido(idiomaNormalizado)) {
      version.idioma = this.getPrimerIdiomaDisponible(version.uid) || 'GLOBAL';
      return;
    }

    const duplicado = this.versiones.some(item => {
      return item.uid !== version.uid && item.idioma === idiomaNormalizado;
    });

    if (duplicado) {
      this.respuesta = this.translationService.getTranslation('chapterUploader.error.duplicate_language');
      version.idioma = this.getPrimerIdiomaDisponible(version.uid) || 'GLOBAL';
      return;
    }

    version.idioma = idiomaNormalizado;
    this.respuesta = '';
  }

  isIdiomaUsadoPorOtraVersion(idioma: string, version: ChapterLanguageVersion): boolean {
    return this.versiones.some(item => {
      return item.uid !== version.uid && item.idioma === idioma;
    });
  }

  onFilesSelectedVersion(event: Event, version: ChapterLanguageVersion): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    this.agregarPaginas(version, files);

    input.value = '';
  }

  onDragOverVersion(event: DragEvent, version: ChapterLanguageVersion): void {
    event.preventDefault();
    version.isDragging = true;
  }

  onDragLeaveVersion(event: DragEvent, version: ChapterLanguageVersion): void {
    event.preventDefault();
    version.isDragging = false;
  }

  onDropVersion(event: DragEvent, version: ChapterLanguageVersion): void {
    event.preventDefault();
    version.isDragging = false;

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    this.agregarPaginas(version, files);
  }

  agregarPaginas(version: ChapterLanguageVersion, files: File[]): void {
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

    if (omitidos > 0) {
      this.respuesta =
        this.translationService.getTranslation('common.error.pages_skipped_size_limit');
      return;
    }

    this.respuesta = '';
  }

  removePage(version: ChapterLanguageVersion, index: number): void {
    version.pages.splice(index, 1);
    version.pages = [...version.pages];
  }

  getVersionPagesTotalSize(version: ChapterLanguageVersion): number {
    return version.pages.reduce((total, file) => total + file.size, 0);
  }

  getIdiomaOptionLabel(idioma: SelectOption): string {
    const translated = this.translationService.getTranslation(idioma.labelKey);

    if (!translated || translated === idioma.labelKey) {
      return idioma.nativeLabel;
    }

    if (translated === idioma.nativeLabel) {
      return translated;
    }

    return `${translated} / ${idioma.nativeLabel}`;
  }

  getIdiomaLabel(value?: string): string {
    const idioma = this.idiomas.find(item => item.value === value);

    if (!idioma) {
      return value || '';
    }

    return this.getIdiomaOptionLabel(idioma);
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
      this.respuesta = this.translationService.getTranslation('common.error.work_not_found');
      return;
    }

    if (this.versiones.length === 0) {
      this.respuesta = this.translationService.getTranslation('chapterUploader.error.add_at_least_one_language');
      return;
    }

    if (!this.validarVersiones()) {
      return;
    }

    if (this.totalPagesSize > this.maxTotalPagesSize) {
      this.respuesta =
        this.translationService.getTranslation('common.error.total_pages_size_too_large');
      return;
    }

    const formData = new FormData();

    formData.append('obra_id', String(this.obraId));
    const primeraVersion = this.versiones[0];

    formData.append('idioma', primeraVersion.idioma || 'GLOBAL');
    formData.append('titulo', primeraVersion.titulo.trim() || '');
    formData.append('descripcion', primeraVersion.descripcion.trim() || '');

    const versionesPayload = this.versiones.map(version => ({
      uid: version.uid,
      idioma: version.idioma,
      titulo: version.titulo.trim(),
      descripcion: version.descripcion.trim()
    }));

    formData.append('idiomaVersiones', JSON.stringify(versionesPayload));

    this.versiones.forEach(version => {
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

  trackByFileName(index: number, file: File): string {
    return `${file.name}-${file.size}-${index}`;
  }

  trackByIdiomaValue(index: number, idioma: SelectOption): string {
    return idioma.value;
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
              idioma: res.idioma || idiomaFallback || 'GLOBAL'
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

    for (const version of this.versiones) {
      const idioma = String(version.idioma || '').trim().toUpperCase();

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
    const usados = new Set(
      this.versiones
        .filter(version => version.uid !== ignoreUid)
        .map(version => version.idioma)
    );

    return this.idiomas.find(idioma => !usados.has(idioma.value))?.value || '';
  }

  private crearUid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().replace(/-/g, '');
    }

    return `v${Date.now()}${Math.random().toString(16).slice(2)}`.replace(/[^a-zA-Z0-9]/g, '');
  }

  private esIdiomaPermitido(value: string): boolean {
    return this.idiomas.some(idioma => idioma.value === value);
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
