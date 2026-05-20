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
import { AdminCapitulo, AdminPagina, AdminObra, SelectOption } from './obra-admin.models';
import { buildObraImageUrl, formatFileSize } from './obra-admin-display.utils';

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
}

interface PaginasResponse extends GenericResponse {
  paginas?: AdminPagina[];
  insertadas?: number;
  insertIds?: number[];
  capituloId?: number;
}

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
    saveAll: 'Guardar todo',
    saving: 'Guardando',
    saveAllDescription: 'Este botón guardará obra, portada, capítulos y cambios de páginas pendientes'
  };

  adminUrl = 'https://minuscreators.com/api/obra_admin.php';
  actualizarObraUrl = 'https://minuscreators.com/api/actualizar_obra.php';
  actualizarCapituloUrl = 'https://minuscreators.com/api/actualizar_capitulo.php';
  actualizarPortadaUrl = 'https://minuscreators.com/api/actualizar_portada.php';
  agregarPaginasUrl = 'https://minuscreators.com/api/agregar_paginas_capitulo.php';
  eliminarPaginaUrl = 'https://minuscreators.com/api/eliminar_pagina_capitulo.php';
  eliminarObraUrl = 'https://minuscreators.com/api/eliminar_obra.php';

  siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;
  obra: AdminObra | null = null;

  cargando = false;
  guardandoTodo = false;
  eliminandoObra = false;

  error = '';
  mensajeObra = '';

  capituloMensajes: Record<number, string> = {};

  coverFile: File | null = null;
  coverPreview = '';

  maxCategories = 3;
  selectedCategories: string[] = [];

  maxCoverFileSize = 5 * 1024 * 1024;
  maxPageFileSize = 8 * 1024 * 1024;
  maxTotalPagesSize = 300 * 1024 * 1024;

  selectedChapterFiles: Record<number, File[]> = {};
  pageUploadMessages: Record<number, string> = {};
  paginasPendientesEliminar: Record<number, AdminPagina[]> = {};

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

  tiposEntrega: SelectOption[] = [
    { value: 'comic', label: 'Comic' },
    { value: 'manga', label: 'Manga' },
    { value: 'libro', label: 'Libro' },
    { value: 'novela', label: 'Novela' },
    { value: 'artwork', label: 'Artwork' }
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
          this.error = res.error || this.translationService.getTranslation('No se pudo cargar la obra');
          return;
        }

        this.obra = {
          ...res.obra,
          idioma: this.normalizeIdioma(res.obra.idioma),
          tipoEntrega: this.normalizeTipoObra(res.obra.tipoEntrega)
        };

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
          this.error = err.error?.error || this.translationService.getTranslation('No tienes permiso para realizar esta acción');
          return;
        }

        this.error = err.error?.error || this.translationService.getTranslation('Error al cargar la obra');
        console.error(err);
      }
    });
  }

  toggleCategory(value: string): void {
    if (this.selectedCategories.includes(value)) {
      this.selectedCategories = this.selectedCategories.filter(
        categoria => categoria !== value
      );
      this.mensajeObra = '';
      return;
    }

    if (this.selectedCategories.length >= this.maxCategories) {
      this.mensajeObra = this.translationService.getTranslation('Solo puedes seleccionar hasta 3 categorías');
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
      return this.translationService.getTranslation('Sin categoría');
    }

    return this.selectedCategories
      .map(categoria => this.translationService.getTranslation(this.getCategoryLabel(categoria)))
      .join(', ');
  }

  getTipoObraLabel(value?: string): string {
    const option = this.tiposEntrega.find(tipo => tipo.value === value);
    return this.translationService.getTranslation(option?.label || 'Manga');
  }

  guardarTodo(): void {
    void this.guardarTodoAsync();
  }

  private async guardarTodoAsync(): Promise<void> {
    if (!this.obra) {
      return;
    }

    if (!this.obra.titulo.trim()) {
      this.mensajeObra = this.translationService.getTranslation('El título es obligatorio');
      return;
    }

    if (this.selectedCategories.length > this.maxCategories) {
      this.mensajeObra = this.translationService.getTranslation('Solo puedes seleccionar hasta 3 categorías');
      return;
    }

    this.obra.idioma = this.normalizeIdioma(this.obra.idioma);
    this.obra.tipoEntrega = this.normalizeTipoObra(this.obra.tipoEntrega);

    this.guardandoTodo = true;
    this.mensajeObra = '';

    const genero = this.selectedCategories.join(',');

    const payload = {
      obra_id: this.obra.id,
      titulo: this.obra.titulo.trim(),
      descripcion: this.obra.descripcion || '',
      categorias: this.selectedCategories,
      genero,
      idioma: this.obra.idioma || 'GLOBAL',
      tipoEntrega: this.obra.tipoEntrega || 'manga'
    };

    const ready = await this.ensureCsrfToken();

    if (!ready) {
      this.guardandoTodo = false;
      this.mensajeObra = this.translationService.getTranslation('No se pudo preparar la acción');
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
        this.mensajeObra = res.error || this.translationService.getTranslation('No se pudo actualizar la obra');
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
          this.mensajeObra = coverRes.error || this.translationService.getTranslation('No se pudo actualizar la portada');
          return;
        }

        if (coverRes.portada && this.obra) {
          this.obra.portada = coverRes.portada;
        }

        if (this.coverPreview) {
          URL.revokeObjectURL(this.coverPreview);
        }

        this.coverFile = null;
        this.coverPreview = '';
      }

      for (const capitulo of this.obra.capitulos) {
        const chapterRes = await firstValueFrom(this.http.post<GenericResponse>(
          this.actualizarCapituloUrl,
          {
            capitulo_id: capitulo.id,
            titulo: capitulo.titulo || '',
            descripcion: capitulo.descripcion || ''
          },
          {
            withCredentials: true,
            headers: this.authService.csrfHeaders()
          }
        ));

        if (!chapterRes.success) {
          this.guardandoTodo = false;
          this.mensajeObra = chapterRes.error || this.translationService.getTranslation('No se pudo actualizar el capítulo');
          return;
        }

        const paginasAEliminar = this.paginasPendientesEliminar[capitulo.id] || [];

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
            this.mensajeObra = deleteRes.error || this.translationService.getTranslation('No se pudo eliminar la página');
            return;
          }
        }

        const files = this.selectedChapterFiles[capitulo.id] || [];

        if (files.length > 0) {
          const uploadRes = await this.subirPaginasPendientes(capitulo.id, files);

          if (!uploadRes.success) {
            this.guardandoTodo = false;
            this.mensajeObra = uploadRes.error || this.translationService.getTranslation('No se pudieron agregar las páginas');
            return;
          }
        }

        this.pageUploadMessages[capitulo.id] = '';
        this.capituloMensajes[capitulo.id] = '';
      }

      this.paginasPendientesEliminar = {};
      this.selectedChapterFiles = {};
      this.guardandoTodo = false;
      this.mensajeObra = this.translationService.getTranslation('Todos los cambios se guardaron correctamente');
      this.cargarObraAdmin(this.obra.id);
    } catch (err: any) {
      this.guardandoTodo = false;
      this.mensajeObra = this.getFriendlyError(err, this.translationService.getTranslation('Error al guardar cambios'));
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
        this.translationService.getTranslation('La portada debe ser JPG, PNG o WEBP y pesar máximo') +
        ` ${this.formatSize(this.maxCoverFileSize)}`;
      return;
    }

    if (this.coverPreview) {
      URL.revokeObjectURL(this.coverPreview);
    }

    this.coverFile = file;
    this.coverPreview = URL.createObjectURL(file);
    this.mensajeObra = '';
  }

  getSelectedChapterFilesTotalSize(capituloId: number): number {
    const files = this.selectedChapterFiles[capituloId] || [];
    return files.reduce((total, file) => total + file.size, 0);
  }

  onChapterPagesSelected(files: File[], capitulo: AdminCapitulo): void {
    if (files.length === 0) {
      return;
    }

    const actuales = this.selectedChapterFiles[capitulo.id] || [];

    let totalActual = this.getSelectedChapterFilesTotalSize(capitulo.id);
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

    this.selectedChapterFiles[capitulo.id] = [
      ...actuales,
      ...validos
    ];

    this.pageUploadMessages[capitulo.id] = omitidos > 0
      ? this.translationService.getTranslation('Algunas páginas no se agregaron por límite de tamaño')
      : '';
  }

  removeSelectedChapterFile(capituloId: number, index: number): void {
    const files = this.selectedChapterFiles[capituloId] || [];
    files.splice(index, 1);
    this.selectedChapterFiles[capituloId] = [...files];
  }

  eliminarPagina(capitulo: AdminCapitulo, pagina: AdminPagina): void {
    const confirmar = confirm(
      `${this.translationService.getTranslation('Eliminar')} ${this.translationService.getTranslation('Página')} ${pagina.numeroPagina}?`
    );

    if (!confirmar) {
      return;
    }

    capitulo.paginas = capitulo.paginas.filter((item) => item.id !== pagina.id);

    const pendientes = this.paginasPendientesEliminar[capitulo.id] || [];
    this.paginasPendientesEliminar[capitulo.id] = [...pendientes, pagina];

    this.pageUploadMessages[capitulo.id] = this.translationService.getTranslation('La página se eliminará al guardar todo');
  }

  eliminarObra(): void {
    if (!this.obra) {
      return;
    }

    const confirmacion = prompt(
      `${this.translationService.getTranslation('Esta acción eliminará la obra completa, todos sus capítulos y todas sus imágenes. Escribe ELIMINAR para confirmar')}: ${this.obra.titulo}`
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
              this.translationService.getTranslation('No se pudo eliminar la obra');
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
              this.translationService.getTranslation('Error al eliminar la obra')
            );

          console.error(err);
        }
      });
    }, () => {
      this.eliminandoObra = false;
      this.mensajeObra = this.translationService.getTranslation('No se pudo preparar la acción');
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

  private subirPaginasPendientes(capituloId: number, files: File[]): Promise<PaginasResponse> {
    const formData = new FormData();

    formData.append('capitulo_id', String(capituloId));

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

  private getFriendlyError(err: any, fallback: string): string {
    if (err.status === 401) {
      this.authService.clearSession();
      this.router.navigate(['/login']);
      return this.translationService.getTranslation('No autenticado');
    }

    if (err.status === 403) {
      return err.error?.error || this.translationService.getTranslation('No tienes permiso para realizar esta acción');
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
}