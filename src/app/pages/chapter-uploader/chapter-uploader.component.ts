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
  label: string;
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

  /*
    Sin límite por cantidad de páginas.
    Este límite solo controla el peso total antes de optimizar.
  */
  maxTotalPagesSize = 300 * 1024 * 1024;

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
      this.respuesta = this.translationService.getTranslation('Ya agregaste todos los idiomas disponibles');
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
      this.respuesta = this.translationService.getTranslation('Debes dejar al menos un idioma para el capítulo');
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
      this.respuesta = this.translationService.getTranslation('No puedes repetir el mismo idioma en este capítulo');
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
        this.translationService.getTranslation('Algunas páginas no se agregaron por límite de tamaño');
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

  getIdiomaLabel(value?: string): string {
    return this.idiomas.find(idioma => idioma.value === value)?.label || value || '';
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

    if (this.versiones.length === 0) {
      this.respuesta = this.translationService.getTranslation('Debes agregar al menos un idioma');
      return;
    }

    if (!this.validarVersiones()) {
      return;
    }

    if (this.totalPagesSize > this.maxTotalPagesSize) {
      this.respuesta =
        this.translationService.getTranslation('El peso total de las páginas es demasiado grande');
      return;
    }

    const formData = new FormData();

    formData.append('obra_id', String(this.obraId));
    const primeraVersion = this.versiones[0];

    /*
      Campos legacy para compatibilidad con PHP anterior.
      El PHP nuevo usa idiomaVersiones + paginas_UID[].
    */
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
            this.respuesta = this.translationService.getTranslation('No se pudo preparar la subida');
            return;
          }

          this.authService.saveCsrfToken(csrfRes.csrfToken);
          this.enviarCapitulo(formData, primeraVersion.idioma);
        },
        error: (err) => {
          this.cargando = false;
          this.respuesta = this.translationService.getTranslation('No se pudo preparar la subida');
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
            this.translationService.getTranslation('No se pudo subir el capítulo');
          return;
        }

        this.respuesta =
          res.mensaje ||
          this.translationService.getTranslation('Capítulo subido correctamente');

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
            this.translationService.getTranslation('No tienes permiso para realizar esta acción');
          return;
        }

        if (err.status === 409) {
          this.respuesta =
            err.error?.error ||
            this.translationService.getTranslation('Ya existe una versión con ese idioma para este capítulo');
          return;
        }

        this.respuesta =
          err.error?.error ||
          this.translationService.getTranslation('Error al subir capítulo');

        console.error(err);
      }
    });
  }

  private validarVersiones(): boolean {
    const idiomasUsados = new Set<string>();

    for (const version of this.versiones) {
      const idioma = String(version.idioma || '').trim().toUpperCase();

      if (!this.esIdiomaPermitido(idioma)) {
        this.respuesta = this.translationService.getTranslation('Selecciona un idioma válido');
        return false;
      }

      if (idiomasUsados.has(idioma)) {
        this.respuesta = this.translationService.getTranslation('No puedes repetir el mismo idioma en este capítulo');
        return false;
      }

      idiomasUsados.add(idioma);
      version.idioma = idioma;

      if (version.titulo.trim().length > 150) {
        this.respuesta = this.translationService.getTranslation('El título del capítulo es demasiado largo');
        return false;
      }

      if (version.descripcion.trim().length > 5000) {
        this.respuesta = this.translationService.getTranslation('La descripción del capítulo es demasiado larga');
        return false;
      }

      if (version.pages.length === 0) {
        this.respuesta = this.translationService.getTranslation('Cada idioma debe tener al menos una página');
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
