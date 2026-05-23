import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { ContentMetadataService } from '../../services/content-metadata.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

import {
  ObraCardComponent,
  ObraCardItem
} from '../../components/cards/obra-card/obra-card.component';

interface Categoria {
  value: string;
}

interface IdiomaOption {
  value: string;
}

interface TipoObraOption {
  value: string;
}

type FiltroNsfw = 'incluir' | 'ocultar' | 'solo';

interface CurrentUserWithPreferences extends CurrentUser {
  idiomasLectura?: string[];
}

interface UsuarioResultado {
  id: number;
  username: string;
  role?: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  totalSuscriptores: number;
  totalObras: number;
}

interface Obra extends ObraCardItem {
  tipoEntrega?: string;
  serieConcluida?: boolean;
  fechaCreacion: string;
}

interface BuscarResponse {
  success: boolean;
  error?: string;
  usuarios: UsuarioResultado[];
  obras: Obra[];
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ObraCardComponent
  ],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
    // trackBy para usuarios
    trackByUsuarioId(index: number, usuario: UsuarioResultado): number {
      return usuario.id;
    }

    // trackBy para obras
    trackByObraId(index: number, obra: Obra): number {
      return obra.id;
    }
  apiUrl = 'https://minuscreators.com/api/buscar.php';

  currentUser: CurrentUserWithPreferences | null = null;

  categoriaSeleccionada = 'todos';
  idiomaObraSeleccionado = 'todos';
  tipoObraSeleccionado = 'todos';
  ordenSeleccionado = 'recientes';
  filtroNsfw: FiltroNsfw = 'incluir';
  busqueda = '';

  cargando = false;
  error = '';

  usuarios: UsuarioResultado[] = [];
  obras: Obra[] = [];

  categorias: Categoria[] = [
    { value: 'todos' },
    { value: 'accion' },
    { value: 'aventura' },
    { value: 'comedia' },
    { value: 'drama' },
    { value: 'fantasia' },
    { value: 'romance' },
    { value: 'terror' },
    { value: 'ciencia-ficcion' },
    { value: 'misterio' },
    { value: 'suspenso' },
    { value: 'sobrenatural' },
    { value: 'psicologico' },
    { value: 'slice-of-life' },
    { value: 'vida-escolar' },
    { value: 'deportes' },
    { value: 'artes-marciales' },
    { value: 'mecha' },
    { value: 'isekai' },
    { value: 'historico' },
    { value: 'musica' },
    { value: 'cocina' },
    { value: 'magia' },
    { value: 'superheroes' },
    { value: 'crimen' },
    { value: 'post-apocaliptico' },
    { value: 'cyberpunk' },
    { value: 'steampunk' },
    { value: 'guerra' },
    { value: 'parodia' },
    { value: 'tragedia' },
    { value: 'shonen' },
    { value: 'shojo' },
    { value: 'seinen' },
    { value: 'josei' },
    { value: 'kodomo' },
    { value: 'boys-love' },
    { value: 'girls-love' },
    { value: 'nsfw' }
  ];

  idiomasObra: IdiomaOption[] = [
    { value: 'todos' },
    { value: 'preferidos' },
    { value: 'GLOBAL' },
    { value: 'ES' },
    { value: 'EN' },
    { value: 'JA' },
    { value: 'KO' },
    { value: 'ZH' },
    { value: 'FR' },
    { value: 'DE' },
    { value: 'PT' },
    { value: 'IT' },
    { value: 'RU' },
    { value: 'AR' },
    { value: 'HI' },
    { value: 'ID' },
    { value: 'VI' },
    { value: 'TH' },
    { value: 'TR' },
    { value: 'PL' },
    { value: 'NL' }
  ];

  tiposObra: TipoObraOption[] = [
    { value: 'todos' },
    { value: 'comic' },
    { value: 'manga' },
    { value: 'libro' },
    { value: 'novela' },
    { value: 'artwork' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private metadataService: ContentMetadataService,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser() as CurrentUserWithPreferences | null;

    this.route.queryParamMap.subscribe(params => {
      const buscar = params.get('buscar');
      const categoria = params.get('categoria') || params.get('genero');
      const idioma = params.get('idioma');
      const tipoObra = params.get('tipo') || params.get('tipoObra') || params.get('tipoEntrega');
      const orden = params.get('orden');
      const nsfw = params.get('nsfw');

      this.busqueda = buscar !== null ? buscar : '';
      this.categoriaSeleccionada = 'todos';
      this.idiomaObraSeleccionado = 'todos';
      this.tipoObraSeleccionado = 'todos';
      this.ordenSeleccionado = 'recientes';
      this.filtroNsfw = 'incluir';

      if (categoria && this.esCategoriaValida(categoria)) {
        this.categoriaSeleccionada = categoria.toLowerCase();
      }

      if (idioma && this.esIdiomaValido(idioma)) {
        this.idiomaObraSeleccionado = idioma === 'preferidos'
          ? 'preferidos'
          : idioma.toUpperCase();
      }

      if (tipoObra && this.esTipoObraValido(tipoObra)) {
        this.tipoObraSeleccionado = tipoObra.toLowerCase();
      }

      if (orden === 'recientes' || orden === 'populares') {
        this.ordenSeleccionado = orden;
      }

      if (nsfw === 'incluir' || nsfw === 'ocultar' || nsfw === 'solo') {
        this.filtroNsfw = nsfw;
      }

      if (this.categoriaSeleccionada === 'nsfw') {
        this.filtroNsfw = 'solo';
      }

      this.cargarObras();
    });
  }

  seleccionarCategoria(categoria: Categoria): void {
    this.categoriaSeleccionada = categoria.value;

    if (categoria.value === 'nsfw') {
      this.filtroNsfw = 'solo';
    }

    this.actualizarQueryParams();
  }

  buscarDesdeInput(): void {
    this.actualizarQueryParams();
  }

  cambiarFiltros(): void {
    this.actualizarQueryParams();
  }

  cargarObras(): void {
    this.cargando = true;
    this.error = '';

    const params = new URLSearchParams();

    params.set('orden', this.ordenSeleccionado);
    params.set('limite', '100');
    params.set('nsfw', this.filtroNsfw);

    if (this.busqueda.trim()) {
      params.set('buscar', this.busqueda.trim());
    }

    if (
      this.categoriaSeleccionada !== 'todos' &&
      this.categoriaSeleccionada !== 'nsfw'
    ) {
      params.set('genero', this.categoriaSeleccionada);
    }

    if (this.tipoObraSeleccionado !== 'todos') {
      params.set('tipo', this.tipoObraSeleccionado);
    }

    if (this.categoriaSeleccionada === 'nsfw' || this.filtroNsfw === 'solo') {
      params.set('soloNsfw', '1');
    }

    if (this.filtroNsfw === 'ocultar') {
      params.set('incluirNsfw', '0');
    }

    if (this.filtroNsfw === 'incluir') {
      params.set('incluirNsfw', '1');
    }

    if (this.idiomaObraSeleccionado === 'preferidos') {
      params.set('idiomas', this.getIdiomasPreferidos().join(','));
    } else if (this.idiomaObraSeleccionado !== 'todos') {
      params.set('idioma', this.idiomaObraSeleccionado.toUpperCase());
    }

    this.http
      .get<BuscarResponse>(
        `${this.apiUrl}?${params.toString()}`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success) {
            this.error =
              res.error ||
              this.translationService.getTranslation('categorias.error.no_resultados');
            return;
          }

          this.usuarios = res.usuarios || [];
          this.obras = res.obras || [];
        },
        error: (err) => {
          this.cargando = false;
          this.error =
            err.error?.error ||
            this.translationService.getTranslation('categorias.error.error_resultados');

          console.error(err);
        }
      });
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = 'todos';
    this.idiomaObraSeleccionado = 'todos';
    this.tipoObraSeleccionado = 'todos';
    this.ordenSeleccionado = 'recientes';
    this.filtroNsfw = 'incluir';
    this.busqueda = '';

    this.router.navigate(['/categorias']);
  }

  abrirObra(obra: { id: number; idioma?: string }): void {
    const idioma = this.getIdiomaParaAbrirObra(obra);

    if (idioma) {
      this.router.navigate(['/obra', obra.id], {
        queryParams: {
          idioma
        }
      });
      return;
    }

    this.router.navigate(['/obra', obra.id]);
  }

  abrirPerfilUsuario(usuario: UsuarioResultado): void {
    this.router.navigate(['/perfil', usuario.id]);
  }

  abrirPerfilObra(obra: { usuarioId: number | null }): void {
    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return this.metadataService.imageUrl(path, fallback);
  }

  getCategoriaLabel(value?: string): string {
    if (!value || value === 'todos') {
      return this.translationService.getTranslation('categorias.common.todos');
    }

    return this.metadataService.getCategoryLabel(value);
  }

  getCategoriaActual(): string {
    return this.getCategoriaLabel(this.categoriaSeleccionada);
  }

  getIdiomaLabel(value?: string): string {
    if (!value || value.toLowerCase() === 'todos') {
      return this.translationService.getTranslation('categorias.idioma.todos');
    }

    if (value === 'preferidos') {
      return this.translationService.getTranslation('categorias.idioma.preferidos');
    }

    return this.metadataService.getLanguageLabel(value);
  }

  getIdiomaOptionLabel(idioma: IdiomaOption): string {
    return this.getIdiomaLabel(idioma.value);
  }

  getTipoObraLabel(value?: string): string {
    const normalized = String(value || 'todos')
      .trim()
      .toLowerCase();

    const labels: Record<string, string> = {
      todos: 'categorias.tipo_obra.todos',
      comic: 'common.work_type.comic',
      manga: 'common.work_type.manga',
      libro: 'common.work_type.book',
      novela: 'common.work_type.novel',
      artwork: 'common.work_type.artwork'
    };

    return this.translationService.getTranslation(
      labels[normalized] || 'categorias.tipo_obra.todos'
    );
  }

  getTipoObraOptionLabel(tipo: TipoObraOption): string {
    return this.getTipoObraLabel(tipo.value);
  }

  getFiltroNsfwLabel(): string {
    if (this.filtroNsfw === 'ocultar') {
      return this.translationService.getTranslation('common.labels.nsfw_content');
    }

    if (this.filtroNsfw === 'solo') {
      return this.translationService.getTranslation('common.labels.nsfw_content');
    }

    return this.translationService.getTranslation('common.labels.nsfw_content');
  }

  hasActiveFilters(): boolean {
    return (
      this.busqueda.trim() !== '' ||
      this.categoriaSeleccionada !== 'todos' ||
      this.idiomaObraSeleccionado !== 'todos' ||
      this.tipoObraSeleccionado !== 'todos' ||
      this.ordenSeleccionado !== 'recientes' ||
      this.filtroNsfw !== 'incluir'
    );
  }

  private actualizarQueryParams(): void {
    this.router.navigate(['/categorias'], {
      queryParams: {
        buscar: this.busqueda.trim() || null,
        categoria: this.categoriaSeleccionada !== 'todos'
          ? this.categoriaSeleccionada
          : null,
        idioma: this.idiomaObraSeleccionado !== 'todos'
          ? this.idiomaObraSeleccionado
          : null,
        tipo: this.tipoObraSeleccionado !== 'todos'
          ? this.tipoObraSeleccionado
          : null,
        orden: this.ordenSeleccionado !== 'recientes'
          ? this.ordenSeleccionado
          : null,
        nsfw: this.filtroNsfw !== 'incluir'
          ? this.filtroNsfw
          : null
      }
    });
  }


  private getIdiomaParaAbrirObra(obra: { idioma?: string }): string {
    const idiomaObra = String(obra.idioma || '').trim().toUpperCase();

    if (this.idiomaObraSeleccionado !== 'todos' && this.idiomaObraSeleccionado !== 'preferidos') {
      return this.idiomaObraSeleccionado.toUpperCase();
    }

    if (idiomaObra && idiomaObra !== 'TODOS') {
      return idiomaObra;
    }

    return '';
  }

  private getIdiomasPreferidos(): string[] {
    const idiomasUsuario = this.currentUser?.idiomasLectura || [];

    const normalizados = idiomasUsuario
      .map(idioma => String(idioma || '').trim().toUpperCase())
      .filter(Boolean);

    if (normalizados.length === 0) {
      normalizados.push(this.getContentLanguage());
    }

    if (!normalizados.includes('GLOBAL')) {
      normalizados.push('GLOBAL');
    }

    return Array.from(new Set(normalizados));
  }

  private getContentLanguage(): string {
    const savedLanguage = localStorage.getItem('contentLanguage');

    if (savedLanguage) {
      return this.normalizarIdiomaContenido(savedLanguage);
    }

    return this.normalizarIdiomaContenido(
      this.translationService.getCurrentLanguage()
    );
  }

  private normalizarIdiomaContenido(language: string): string {
    const normalized = String(language || '').trim().toUpperCase();

    const allowed = [
      'ES',
      'EN',
      'JA',
      'KO',
      'ZH',
      'FR',
      'DE',
      'PT',
      'IT',
      'RU',
      'AR',
      'HI',
      'ID',
      'VI',
      'TH',
      'TR',
      'PL',
      'NL'
    ];

    return allowed.includes(normalized)
      ? normalized
      : 'EN';
  }

  private esCategoriaValida(value: string): boolean {
    const normalizada = value.toLowerCase();
    return this.categorias.some(categoria => categoria.value === normalizada);
  }

  private esIdiomaValido(value: string): boolean {
    if (value === 'preferidos') {
      return true;
    }

    const normalizado = value.toUpperCase();

    return this.idiomasObra.some(idioma => {
      if (idioma.value === 'preferidos') {
        return false;
      }

      return idioma.value.toUpperCase() === normalizado;
    });
  }

  private esTipoObraValido(value: string): boolean {
    const normalizado = value.toLowerCase();
    return this.tiposObra.some(tipo => tipo.value === normalizado);
  }
}