import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { ObraCoverEditorComponent } from './components/obra-cover-editor/obra-cover-editor.component';
import { ObraCategorySelectorComponent } from './components/obra-category-selector/obra-category-selector.component';
import { ObraChapterItemComponent } from './components/obra-chapter-item/obra-chapter-item.component';
import { AdminCapitulo, AdminCapituloVersion, AdminPagina, AdminObra, SelectOption } from './obra-admin.models';
import { buildObraImageUrl, formatFileSize } from './obra-admin-display.utils';
import { WORK_CATEGORY_OPTIONS } from '../../shared/options/profile-options';

interface ObraAdminResponse {
  success: boolean;
  error?: string;
  obra?: AdminObra;
}

interface GenericResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  tipoEntrega?: string;
}

interface PortadaResponse extends GenericResponse {
  portada?: string;
  portadaThumb?: string;
}

interface PaginasResponse extends GenericResponse {
  paginas?: AdminPagina[];
  insertadas?: number;
  insertIds?: number[];
  capituloId?: number;
  capituloVersionId?: number | null;
}

interface EliminarCapituloIdiomaResponse extends GenericResponse {
  capituloId?: number;
  capituloVersionId?: number;
  capituloEliminado?: boolean;
}

type SaveBarStatus = 'idle' | 'saving' | 'success' | 'error';

@Component({
  selector: 'app-obra-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ObraCoverEditorComponent,
    ObraCategorySelectorComponent,
    ObraChapterItemComponent
  ],
  templateUrl: './obra-admin.component.html',
  styleUrl: './obra-admin.component.css'
})
export class ObraAdminComponent implements OnInit {
  readonly i18nKeys = {
    saveAll: 'obraAdmin.save_all.button',
    saving: 'common.state.saving',
    saveAllDescription: 'obraAdmin.save_all.description'
  };

  adminUrl = 'https://minuscreators.com/api/obra_admin.php';
  actualizarObraUrl = 'https://minuscreators.com/api/actualizar_obra.php';
  actualizarCapituloUrl = 'https://minuscreators.com/api/actualizar_capitulo.php';
  actualizarPortadaUrl = 'https://minuscreators.com/api/actualizar_portada.php';
  agregarPaginasUrl = 'https://minuscreators.com/api/agregar_paginas_capitulo.php';
  eliminarPaginaUrl = 'https://minuscreators.com/api/eliminar_pagina_capitulo.php';
  eliminarCapituloIdiomaUrl = 'https://minuscreators.com/api/eliminar_capitulo.php';
  eliminarObraUrl = 'https://minuscreators.com/api/eliminar_obra.php';

  siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;
  obra: AdminObra | null = null;

  cargando = false;
  guardandoTodo = false;
  eliminandoObra = false;

  error = '';
  mensajeObra = '';

  saveBarStatus: SaveBarStatus = 'idle';
  saveBarMessage = '';

  capituloMensajes: Record<string, string> = {};

  coverFile: File | null = null;
  coverPreview = '';

  maxCategories = 3;
  selectedCategories: string[] = [];

  maxCoverFileSize = 5 * 1024 * 1024;
  maxPageFileSize = 5 * 1024 * 1024;
  maxTotalPagesSize = 300 * 1024 * 1024;

  selectedChapterFiles: Record<string, File[]> = {};
  pageUploadMessages: Record<string, string> = {};
  paginasPendientesEliminar: Record<string, AdminPagina[]> = {};

  categorias: SelectOption[] = WORK_CATEGORY_OPTIONS.map((categoria) => ({
    value: categoria.value,
    label: categoria.labelKey
  }));

  idiomas: SelectOption[] = [
    { value: 'GLOBAL', label: 'common.languages.global' },
    { value: 'ES', label: 'common.languages.es' },
    { value: 'EN', label: 'common.languages.en' },
    { value: 'JA', label: 'common.languages.ja' },
    { value: 'KO', label: 'common.languages.ko' },
    { value: 'ZH', label: 'common.languages.zh' },
    { value: 'FR', label: 'common.languages.fr' },
    { value: 'DE', label: 'common.languages.de' },
    { value: 'PT', label: 'common.languages.pt' },
    { value: 'IT', label: 'common.languages.it' },
    { value: 'RU', label: 'common.languages.ru' },
    { value: 'AR', label: 'common.languages.ar' },
    { value: 'HI', label: 'common.languages.hi' },
    { value: 'ID', label: 'common.languages.id' },
    { value: 'VI', label: 'common.languages.vi' },
    { value: 'TH', label: 'common.languages.th' },
    { value: 'TR', label: 'common.languages.tr' },
    { value: 'PL', label: 'common.languages.pl' },
    { value: 'NL', label: 'common.languages.nl' }
  ];

  tiposEntrega: SelectOption[] = [
    { value: 'comic', label: 'common.work_type.comic' },
    { value: 'manga', label: 'common.work_type.manga' },
    { value: 'libro', label: 'common.work_type.book' },
    { value: 'novela', label: 'common.work_type.novel' },
    { value: 'artwork', label: 'common.work_type.artwork' }
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const obraId = Number(this.route.snapshot.paramMap.get('id'));

    if (!obraId) {
      this.router.navigate(['/']);
      return;
    }

    this.cargarObraAdmin(obraId);
  }

  get totalCapitulos(): number {
    return this.obra?.capitulos.length || 0;
  }

  get saveBarText(): string {
    if (this.saveBarMessage) {
      return this.saveBarMessage;
    }

    return this.translationService.getTranslation(this.i18nKeys.saveAllDescription);
  }

  get saveBarIcon(): string {
    if (this.saveBarStatus === 'saving') {
      return '…';
    }

    if (this.saveBarStatus === 'success') {
      return '✓';
    }

    if (this.saveBarStatus === 'error') {
      return '!';
    }

    return '';
  }

  cargarObraAdmin(obraId: number): void {
    this.cargando = true;
    this.error = '';
    this.mensajeObra = '';

    const url = `${this.adminUrl}?obra_id=${obraId}`;

    this.http.get<ObraAdminResponse>(url, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.obra) {
          this.error = res.error || this.translationService.getTranslation('common.error.load_work_failed');
          return;
        }

        this.obra = {
          ...res.obra,
          idioma: this.normalizeIdioma(res.obra.idioma),
          tipoEntrega: this.normalizeTipoObra(res.obra.tipoEntrega)
        };

        this.obra.capitulos = this.mergeCapitulosPorNumero(this.obra.capitulos || []);

        this.selectedCategories = this.getCategoriasDesdeObra(this.obra);
      },
      error: (err) => {
        this.cargando = false;

        if (err.status === 401) {
          this.authService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (err.status === 403) {
          this.error = err.error?.error || this.translationService.getTranslation('common.error.no_permission');
          return;
        }

        this.error = err.error?.error || this.translationService.getTranslation('common.error.load_work_error');
        console.error(err);
      }
    });
  }

  toggleCategory(value: string): void {
    this.resetSaveBarStatus();

    if (this.selectedCategories.includes(value)) {
      this.selectedCategories = this.selectedCategories.filter(
        categoria => categoria !== value
      );
      this.mensajeObra = '';
      return;
    }

    if (this.selectedCategories.length >= this.maxCategories) {
      this.mensajeObra = this.translationService.getTranslation('common.error.max_categories');
      return;
    }

    this.selectedCategories = [
      ...this.selectedCategories,
      value
    ];

    this.mensajeObra = '';
  }

  getCategoryLabel(value: string): string {
    return this.categorias.find(categoria => categoria.value === value)?.label || value;
  }

  getSelectedCategoriesLabel(): string {
    if (this.selectedCategories.length === 0) {
      return this.translationService.getTranslation('common.labels.no_category');
    }

    return this.selectedCategories
      .map(categoria => this.translationService.getTranslation(this.getCategoryLabel(categoria)))
      .join(', ');
  }

  getTipoObraLabel(value?: string): string {
    const option = this.tiposEntrega.find(tipo => tipo.value === value);
    return this.translationService.getTranslation(option?.label || 'common.work_type.manga');
  }

  getIdiomaLabel(value?: string): string {
    const normalized = this.normalizeIdioma(value);
    const option = this.idiomas.find(idioma => idioma.value === normalized);

    return this.translationService.getTranslation(option?.label || 'common.languages.global');
  }

  guardarTodo(): void {
    void this.guardarTodoAsync();
  }

  private async guardarTodoAsync(): Promise<void> {
    if (!this.obra) {
      return;
    }

    this.mensajeObra = '';

    if (!this.obra.titulo.trim()) {
      this.setSaveBarError(
        this.translationService.getTranslation('common.validation.title_required')
      );
      return;
    }

    if (this.selectedCategories.length > this.maxCategories) {
      this.setSaveBarError(
        this.translationService.getTranslation('common.error.max_categories')
      );
      return;
    }

    this.obra.tipoEntrega = this.normalizeTipoObra(this.obra.tipoEntrega);

    this.guardandoTodo = true;
    this.setSaveBarStatus(
      'saving',
      this.translationService.getTranslation(this.i18nKeys.saving)
    );

    const genero = this.selectedCategories.join(',');

    const payload = {
      obra_id: this.obra.id,
      titulo: this.obra.titulo.trim(),
      descripcion: this.obra.descripcion || '',
      categorias: this.selectedCategories,
      genero,
      idioma: this.normalizeIdioma(this.obra.idioma || this.obra.idiomaPrincipal),
      tipoEntrega: this.obra.tipoEntrega || 'manga'
    };

    const ready = await this.ensureCsrfToken();

    if (!ready) {
      this.guardandoTodo = false;
      this.setSaveBarError(
        this.translationService.getTranslation('common.error.prepare_action_failed')
      );
      return;
    }

    try {
      const res = await firstValueFrom(this.http.post<GenericResponse>(
        this.actualizarObraUrl,
        payload,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ));

      if (!res.success) {
        this.guardandoTodo = false;
        this.setSaveBarError(
          res.error || this.translationService.getTranslation('obraAdmin.error.update_work_failed')
        );
        return;
      }

      if (this.obra) {
        this.obra.genero = res.genero ?? genero;
        this.obra.categorias = res.categorias ?? this.selectedCategories;
        this.obra.idioma = res.idioma ?? this.obra.idioma;
        this.obra.tipoEntrega = res.tipoEntrega ?? this.obra.tipoEntrega;
      }

      if (this.coverFile) {
        const coverRes = await this.subirPortadaPendiente(this.obra.id, this.coverFile);

        if (!coverRes.success) {
          this.guardandoTodo = false;
          this.setSaveBarError(
            coverRes.error || this.translationService.getTranslation('obraAdmin.error.update_cover_failed')
          );
          return;
        }

        if (coverRes.portada && this.obra) {
          this.obra.portada = coverRes.portada;
        }

        if (coverRes.portadaThumb && this.obra) {
          this.obra.portadaThumb = coverRes.portadaThumb;
        }

        if (this.coverPreview) {
          URL.revokeObjectURL(this.coverPreview);
        }

        this.coverFile = null;
        this.coverPreview = '';
      }

      for (const capitulo of this.obra.capitulos) {
        for (const version of this.getVersionesCapitulo(capitulo)) {
          const chapterRes = await firstValueFrom(this.http.post<GenericResponse>(
            this.actualizarCapituloUrl,
            {
              capitulo_id: capitulo.id,
              capitulo_version_id: version.id || null,
              idioma: version.idioma || 'GLOBAL',
              titulo: version.titulo || '',
              descripcion: version.descripcion || ''
            },
            {
              withCredentials: true,
              headers: this.authService.csrfHeaders()
            }
          ));

          if (!chapterRes.success) {
            this.guardandoTodo = false;
            this.setSaveBarError(
              chapterRes.error || this.translationService.getTranslation('obraAdmin.error.update_chapter_failed')
            );
            return;
          }

          const versionKey = this.getVersionKey(capitulo.id, version);
          const paginasAEliminar = this.paginasPendientesEliminar[versionKey] || [];

          for (const pagina of paginasAEliminar) {
            const deleteRes = await firstValueFrom(this.http.post<PaginasResponse>(
              this.eliminarPaginaUrl,
              { pagina_id: pagina.id },
              {
                withCredentials: true,
                headers: this.authService.csrfHeaders()
              }
            ));

            if (!deleteRes.success) {
              this.guardandoTodo = false;
              this.setSaveBarError(
                deleteRes.error || this.translationService.getTranslation('obraAdmin.error.delete_page_failed')
              );
              return;
            }
          }

          const files = this.selectedChapterFiles[versionKey] || [];

          if (files.length > 0) {
            const uploadRes = await this.subirPaginasPendientes(capitulo.id, version.id, files);

            if (!uploadRes.success) {
              this.guardandoTodo = false;
              this.setSaveBarError(
                uploadRes.error || this.translationService.getTranslation('obraAdmin.error.add_pages_failed')
              );
              return;
            }
          }

          this.pageUploadMessages[versionKey] = '';
          this.capituloMensajes[versionKey] = '';
        }
      }

      this.paginasPendientesEliminar = {};
      this.selectedChapterFiles = {};
      this.guardandoTodo = false;

      this.setSaveBarStatus(
        'success',
        this.translationService.getTranslation('obraAdmin.success.all_changes_saved')
      );

      this.cargarObraAdmin(this.obra.id);
    } catch (err: any) {
      this.guardandoTodo = false;

      this.setSaveBarError(
        this.getFriendlyError(
          err,
          this.translationService.getTranslation('obraAdmin.error.save_changes_error')
        )
      );

      console.error(err);
    }
  }

  subirCapitulo(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id, 'subir-capitulo']);
  }

  verPreview(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id]);
  }

  leerCapitulo(capitulo: AdminCapitulo): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate([
      '/obra',
      this.obra.id,
      'capitulo',
      capitulo.numeroCapitulo
    ]);
  }

  volverPerfil(): void {
    const user = this.authService.getCurrentUser();

    if (!user) {
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/perfil', user.id]);
  }

  onCoverFileSelected(file: File): void {

    if (!this.esImagenValida(file, this.maxCoverFileSize)) {
      this.mensajeObra =
        this.translationService.getTranslation('common.error.cover_invalid_max') +
        ` ${this.formatSize(this.maxCoverFileSize)}`;
      return;
    }

    if (this.coverPreview) {
      URL.revokeObjectURL(this.coverPreview);
    }

    this.coverFile = file;
    this.coverPreview = URL.createObjectURL(file);
    this.mensajeObra = '';
    this.resetSaveBarStatus();
  }

  getSelectedChapterFilesTotalSize(versionKey: string): number {
    const files = this.selectedChapterFiles[versionKey] || [];
    return files.reduce((total, file) => total + file.size, 0);
  }

  onChapterPagesSelected(event: { version: AdminCapituloVersion; files: File[] }, capitulo: AdminCapitulo): void {
    this.resetSaveBarStatus();

    const version = event.version;
    const files = event.files;

    if (files.length === 0) {
      return;
    }

    const versionKey = this.getVersionKey(capitulo.id, version);
    const actuales = this.selectedChapterFiles[versionKey] || [];

    let totalActual = this.getSelectedChapterFilesTotalSize(versionKey);
    const validos: File[] = [];
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

      validos.push(file);
      totalActual += file.size;
    }

    this.selectedChapterFiles = {
      ...this.selectedChapterFiles,
      [versionKey]: [
        ...actuales,
        ...validos
      ]
    };

    this.pageUploadMessages[versionKey] = omitidos > 0
      ? this.translationService.getTranslation('common.error.pages_skipped_size_limit')
      : '';
  }

  removeSelectedChapterFile(event: { version: AdminCapituloVersion; index: number }, capituloId: number): void {
    this.resetSaveBarStatus();

    const versionKey = this.getVersionKey(capituloId, event.version);
    const files = this.selectedChapterFiles[versionKey] || [];

    files.splice(event.index, 1);
    this.selectedChapterFiles = {
      ...this.selectedChapterFiles,
      [versionKey]: [...files]
    };
  }

  eliminarPagina(capitulo: AdminCapitulo, event: { version: AdminCapituloVersion; pagina: AdminPagina }): void {
    const version = event.version;
    const pagina = event.pagina;

    const confirmar = confirm(
      `${this.translationService.getTranslation('common.actions.delete')} ${this.translationService.getTranslation('common.labels.page')} ${pagina.numeroPagina}?`
    );

    if (!confirmar) {
      return;
    }

    this.resetSaveBarStatus();

    version.paginas = version.paginas.filter((item) => item.id !== pagina.id);

    const versionKey = this.getVersionKey(capitulo.id, version);
    const pendientes = this.paginasPendientesEliminar[versionKey] || [];
    this.paginasPendientesEliminar[versionKey] = [...pendientes, pagina];

    this.pageUploadMessages[versionKey] = this.translationService.getTranslation('obraAdmin.notice.page_deleted_on_save_all');
  }

  eliminarCapituloIdioma(capitulo: AdminCapitulo, version: AdminCapituloVersion): void {
    if (!this.obra) {
      return;
    }

    if ((version.id || 0) <= 0) {
      this.mensajeObra = this.translationService.getTranslation('obraAdmin.error.cannot_delete_unsaved_version');
      return;
    }

    const idioma = this.normalizeIdioma(version.idioma || 'GLOBAL');
    const confirmacion = confirm(
      `${this.translationService.getTranslation('obraAdmin.confirm.delete_selected_language_version')}: ${idioma}`
    );

    if (!confirmacion) {
      return;
    }

    this.mensajeObra = '';

    this.ensureCsrfAndRun(() => {
      this.http.post<EliminarCapituloIdiomaResponse>(
        this.eliminarCapituloIdiomaUrl,
        {
          capitulo_id: capitulo.id,
          capitulo_version_id: version.id
        },
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          if (!res.success) {
            this.mensajeObra =
              res.error ||
              this.translationService.getTranslation('obraAdmin.error.delete_chapter_language_failed');
            return;
          }

          this.actualizarCapitulosTrasEliminarVersion(capitulo.id, version.id);

          this.mensajeObra =
            res.mensaje ||
            this.translationService.getTranslation('obraAdmin.success.chapter_language_deleted');
        },
        error: (err) => {
          this.mensajeObra = this.getFriendlyError(
            err,
            this.translationService.getTranslation('obraAdmin.error.delete_chapter_language_error')
          );

          console.error(err);
        }
      });
    }, () => {
      this.mensajeObra = this.translationService.getTranslation('common.error.prepare_action_failed');
    });
  }

  eliminarObra(): void {
    if (!this.obra) {
      return;
    }

    const confirmacion = prompt(
      `${this.translationService.getTranslation('obraAdmin.confirm.delete_work_full')}: ${this.obra.titulo}`
    );

    if (confirmacion !== 'ELIMINAR' && confirmacion !== 'DELETE') {
      return;
    }

    this.eliminandoObra = true;
    this.mensajeObra = '';

    const payload = {
      obra_id: this.obra.id
    };

    this.ensureCsrfAndRun(() => {
      this.http.post<GenericResponse>(
        this.eliminarObraUrl,
        payload,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.eliminandoObra = false;

          if (!res.success) {
            this.mensajeObra =
              res.error ||
              this.translationService.getTranslation('obraAdmin.error.delete_work_failed');
            return;
          }

          const user = this.authService.getCurrentUser();

          if (user) {
            this.router.navigate(['/perfil', user.id]);
            return;
          }

          this.router.navigate(['/']);
        },
        error: (err) => {
          this.eliminandoObra = false;

          this.mensajeObra =
            this.getFriendlyError(
              err,
              this.translationService.getTranslation('obraAdmin.error.delete_work_error')
            );

          console.error(err);
        }
      });
    }, () => {
      this.eliminandoObra = false;
      this.mensajeObra = this.translationService.getTranslation('common.error.prepare_action_failed');
    });
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return buildObraImageUrl(this.siteUrl, path, fallback);
  }

  private getCategoriasDesdeObra(obra: AdminObra): string[] {
    const valores: string[] = [];

    if (obra.categorias && obra.categorias.length > 0) {
      valores.push(...obra.categorias);
    } else if (obra.genero) {
      valores.push(...obra.genero.split(','));
    }

    const permitidas = this.categorias.map(categoria => categoria.value);

    return Array.from(
      new Set(
        valores
          .map(categoria => String(categoria || '').trim().toLowerCase())
          .filter(categoria => categoria && permitidas.includes(categoria))
      )
    ).slice(0, this.maxCategories);
  }

  private normalizeIdioma(value?: string): string {
    const normalized = String(value || 'GLOBAL').trim().toUpperCase();
    const exists = this.idiomas.some(idioma => idioma.value === normalized);

    return exists ? normalized : 'GLOBAL';
  }

  private normalizeTipoObra(value?: string): string {
    const normalized = String(value || 'manga').trim().toLowerCase();
    const exists = this.tiposEntrega.some(tipo => tipo.value === normalized);

    return exists ? normalized : 'manga';
  }

  private ensureCsrfAndRun(action: () => void, onFail?: () => void): void {
    if (this.authService.getCsrfToken()) {
      action();
      return;
    }

    this.authService.fetchCsrfToken().subscribe({
      next: (res) => {
        if (!res.success || !res.csrfToken) {
          onFail?.();
          return;
        }

        this.authService.saveCsrfToken(res.csrfToken);
        action();
      },
      error: (err) => {
        onFail?.();
        console.error(err);
      }
    });
  }

  private async ensureCsrfToken(): Promise<boolean> {
    if (this.authService.getCsrfToken()) {
      return true;
    }

    try {
      const res = await firstValueFrom(this.authService.fetchCsrfToken());

      if (!res.success || !res.csrfToken) {
        return false;
      }

      this.authService.saveCsrfToken(res.csrfToken);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  private subirPortadaPendiente(obraId: number, cover: File): Promise<PortadaResponse> {
    const formData = new FormData();

    formData.append('obra_id', String(obraId));
    formData.append('portada', cover);

    return firstValueFrom(this.http.post<PortadaResponse>(
      this.actualizarPortadaUrl,
      formData,
      {
        withCredentials: true,
        headers: this.authService.csrfHeaders()
      }
    ));
  }

  private subirPaginasPendientes(
    capituloId: number,
    capituloVersionId: number,
    files: File[]
  ): Promise<PaginasResponse> {
    const formData = new FormData();

    formData.append('capitulo_id', String(capituloId));

    if (capituloVersionId > 0) {
      formData.append('capitulo_version_id', String(capituloVersionId));
    }

    files.forEach((file) => {
      formData.append('paginas[]', file);
    });

    return firstValueFrom(this.http.post<PaginasResponse>(
      this.agregarPaginasUrl,
      formData,
      {
        withCredentials: true,
        headers: this.authService.csrfHeaders()
      }
    ));
  }

  public resetSaveBarStatus(): void {
    if (this.guardandoTodo) {
      return;
    }

    this.setSaveBarStatus('idle');
  }

  private setSaveBarStatus(status: SaveBarStatus, message = ''): void {
    this.saveBarStatus = status;
    this.saveBarMessage = message;
  }

  private setSaveBarError(message: string): void {
    this.setSaveBarStatus(
      'error',
      message || this.translationService.getTranslation('obraAdmin.error.save_changes_error')
    );
  }

  private getFriendlyError(err: any, fallback: string): string {
    if (err.status === 401) {
      this.authService.clearSession();
      this.router.navigate(['/login']);
      return this.translationService.getTranslation('obraAdmin.error.not_authenticated');
    }

    if (err.status === 403) {
      return err.error?.error || this.translationService.getTranslation('common.error.no_permission');
    }

    return err.error?.error || fallback;
  }

  private esImagenValida(file: File, maxSize: number): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= maxSize;
  }

  private getVersionesCapitulo(capitulo: AdminCapitulo): AdminCapituloVersion[] {
    if (Array.isArray(capitulo.versiones) && capitulo.versiones.length > 0) {
      return capitulo.versiones;
    }

    return [{
      id: capitulo.versionId || 0,
      idioma: capitulo.idioma || 'GLOBAL',
      titulo: capitulo.titulo,
      descripcion: capitulo.descripcion,
      creadoEn: capitulo.creadoEn,
      paginas: capitulo.paginas || []
    }];
  }

  private mergeCapitulosPorNumero(capitulos: AdminCapitulo[]): AdminCapitulo[] {
    const agrupados = new Map<number, AdminCapitulo>();

    for (const capitulo of capitulos) {
      const numero = Number(capitulo.numeroCapitulo || 0);
      const versionesActuales = this.getVersionesCapitulo(capitulo).map((version) => ({
        ...version,
        idioma: this.normalizeIdioma(version.idioma)
      }));

      const existente = agrupados.get(numero);

      if (!existente) {
        agrupados.set(numero, {
          ...capitulo,
          versiones: [...versionesActuales]
        });

        continue;
      }

      const versiones = [...(existente.versiones || [])];

      for (const version of versionesActuales) {
        const index = versiones.findIndex(item => this.normalizeIdioma(item.idioma) === version.idioma);

        if (index === -1) {
          versiones.push(version);
          continue;
        }

        const actual = versiones[index];

        if ((actual.id || 0) <= 0 && (version.id || 0) > 0) {
          versiones[index] = version;
        }
      }

      existente.versiones = versiones;
    }

    return Array.from(agrupados.values())
      .map((capitulo) => {
        const versiones = (capitulo.versiones || []).sort((a, b) => {
          return this.normalizeIdioma(a.idioma).localeCompare(this.normalizeIdioma(b.idioma));
        });

        const idiomaPreferido = this.normalizeIdioma(this.obra?.idiomaPrincipal || this.obra?.idioma || capitulo.idioma || 'GLOBAL');
        const principal = versiones.find(version => this.normalizeIdioma(version.idioma) === idiomaPreferido) || versiones[0];

        if (!principal) {
          return capitulo;
        }

        return {
          ...capitulo,
          idioma: principal.idioma,
          versionId: principal.id,
          titulo: principal.titulo,
          descripcion: principal.descripcion,
          creadoEn: principal.creadoEn || capitulo.creadoEn,
          paginas: principal.paginas,
          versiones
        };
      })
      .sort((a, b) => a.numeroCapitulo - b.numeroCapitulo);
  }

  private getVersionKey(capituloId: number, version: AdminCapituloVersion): string {
    const versionId = Number(version.id || 0);

    if (versionId > 0) {
      return `v_${versionId}`;
    }

    const idioma = String(version.idioma || 'GLOBAL').trim().toUpperCase();
    return `legacy_${capituloId}_${idioma}`;
  }

  private actualizarCapitulosTrasEliminarVersion(capituloId: number, capituloVersionId: number): void {
    if (!this.obra) {
      return;
    }

    const capitulosActualizados: AdminCapitulo[] = [];

    for (const capitulo of this.obra.capitulos) {
      if (capitulo.id !== capituloId) {
        capitulosActualizados.push(capitulo);
        continue;
      }

      const versiones = this.getVersionesCapitulo(capitulo)
        .filter(version => (version.id || 0) !== capituloVersionId);

      const removedVersion = this.getVersionesCapitulo(capitulo)
        .find(version => (version.id || 0) === capituloVersionId);

      if (removedVersion) {
        const removedKey = this.getVersionKey(capitulo.id, removedVersion);
        delete this.selectedChapterFiles[removedKey];
        delete this.pageUploadMessages[removedKey];
        delete this.capituloMensajes[removedKey];
        delete this.paginasPendientesEliminar[removedKey];
      }

      if (versiones.length === 0) {
        continue;
      }

      const principal = versiones[0];

      capitulosActualizados.push({
        ...capitulo,
        versionId: principal.id,
        idioma: principal.idioma,
        titulo: principal.titulo,
        descripcion: principal.descripcion,
        creadoEn: principal.creadoEn,
        paginas: principal.paginas,
        versiones
      });
    }

    this.obra = {
      ...this.obra,
      capitulos: capitulosActualizados
    };
  }
}