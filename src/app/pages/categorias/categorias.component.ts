import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface Categoria {
  value: string;
  key: string;
  fallback: string;
}

interface IdiomaOption {
  value: string;
  key: string;
  fallback: string;
  flag: string;
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

interface Obra {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
  autor: string;
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
    RouterModule
  ],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/buscar.php';
  siteUrl = 'https://minuscreators.com';

  idiomaUI: 'es' | 'en' = 'es';

  categoriaSeleccionada = 'todos';
  idiomaObraSeleccionado = 'todos';
  ordenSeleccionado = 'recientes';
  busqueda = '';

  cargando = false;
  error = '';

  usuarios: UsuarioResultado[] = [];
  obras: Obra[] = [];

  categorias: Categoria[] = [
    { value: 'todos', key: 'categoria_todos', fallback: 'Todos' },
    { value: 'accion', key: 'categoria_accion', fallback: 'Acción' },
    { value: 'aventura', key: 'categoria_aventura', fallback: 'Aventura' },
    { value: 'comedia', key: 'categoria_comedia', fallback: 'Comedia' },
    { value: 'drama', key: 'categoria_drama', fallback: 'Drama' },
    { value: 'fantasia', key: 'categoria_fantasia', fallback: 'Fantasía' },
    { value: 'romance', key: 'categoria_romance', fallback: 'Romance' },
    { value: 'terror', key: 'categoria_terror', fallback: 'Terror' },
    { value: 'ciencia-ficcion', key: 'categoria_ciencia_ficcion', fallback: 'Ciencia ficción' },
    { value: 'misterio', key: 'categoria_misterio', fallback: 'Misterio' },
    { value: 'suspenso', key: 'categoria_suspenso', fallback: 'Suspenso' },
    { value: 'sobrenatural', key: 'categoria_sobrenatural', fallback: 'Sobrenatural' },
    { value: 'psicologico', key: 'categoria_psicologico', fallback: 'Psicológico' },
    { value: 'slice-of-life', key: 'categoria_slice_of_life', fallback: 'Slice of life' },
    { value: 'vida-escolar', key: 'categoria_vida_escolar', fallback: 'Vida escolar' },
    { value: 'deportes', key: 'categoria_deportes', fallback: 'Deportes' },
    { value: 'artes-marciales', key: 'categoria_artes_marciales', fallback: 'Artes marciales' },
    { value: 'mecha', key: 'categoria_mecha', fallback: 'Mecha' },
    { value: 'isekai', key: 'categoria_isekai', fallback: 'Isekai' },
    { value: 'historico', key: 'categoria_historico', fallback: 'Histórico' },
    { value: 'musica', key: 'categoria_musica', fallback: 'Música' },
    { value: 'cocina', key: 'categoria_cocina', fallback: 'Cocina' },
    { value: 'magia', key: 'categoria_magia', fallback: 'Magia' },
    { value: 'superheroes', key: 'categoria_superheroes', fallback: 'Superhéroes' },
    { value: 'crimen', key: 'categoria_crimen', fallback: 'Crimen' },
    { value: 'post-apocaliptico', key: 'categoria_post_apocaliptico', fallback: 'Post-apocalíptico' },
    { value: 'cyberpunk', key: 'categoria_cyberpunk', fallback: 'Cyberpunk' },
    { value: 'steampunk', key: 'categoria_steampunk', fallback: 'Steampunk' },
    { value: 'guerra', key: 'categoria_guerra', fallback: 'Guerra' },
    { value: 'parodia', key: 'categoria_parodia', fallback: 'Parodia' },
    { value: 'tragedia', key: 'categoria_tragedia', fallback: 'Tragedia' },
    { value: 'shonen', key: 'categoria_shonen', fallback: 'Shonen' },
    { value: 'shojo', key: 'categoria_shojo', fallback: 'Shojo' },
    { value: 'seinen', key: 'categoria_seinen', fallback: 'Seinen' },
    { value: 'josei', key: 'categoria_josei', fallback: 'Josei' },
    { value: 'kodomo', key: 'categoria_kodomo', fallback: 'Kodomo' },
    { value: 'boys-love', key: 'categoria_boys_love', fallback: 'Boys Love' },
    { value: 'girls-love', key: 'categoria_girls_love', fallback: 'Girls Love' }
  ];

  idiomasObra: IdiomaOption[] = [
    { value: 'todos', key: 'idioma_todos', fallback: 'Todos', flag: '🌐' },
    { value: 'GLOBAL', key: 'idioma_global', fallback: 'Global', flag: '🌐' },
    { value: 'ES', key: 'idioma_es', fallback: 'Español', flag: '🇪🇸' },
    { value: 'EN', key: 'idioma_en', fallback: 'English', flag: '🇬🇧' },
    { value: 'JA', key: 'idioma_ja', fallback: 'Japanese', flag: '🇯🇵' },
    { value: 'KO', key: 'idioma_ko', fallback: 'Korean', flag: '🇰🇷' },
    { value: 'ZH', key: 'idioma_zh', fallback: 'Chinese', flag: '🇨🇳' },
    { value: 'FR', key: 'idioma_fr', fallback: 'French', flag: '🇫🇷' },
    { value: 'DE', key: 'idioma_de', fallback: 'German', flag: '🇩🇪' },
    { value: 'PT', key: 'idioma_pt', fallback: 'Portuguese', flag: '🇵🇹' },
    { value: 'IT', key: 'idioma_it', fallback: 'Italian', flag: '🇮🇹' },
    { value: 'RU', key: 'idioma_ru', fallback: 'Russian', flag: '🇷🇺' },
    { value: 'AR', key: 'idioma_ar', fallback: 'Arabic', flag: '🇸🇦' },
    { value: 'HI', key: 'idioma_hi', fallback: 'Hindi', flag: '🇮🇳' },
    { value: 'ID', key: 'idioma_id', fallback: 'Indonesian', flag: '🇮🇩' },
    { value: 'VI', key: 'idioma_vi', fallback: 'Vietnamese', flag: '🇻🇳' },
    { value: 'TH', key: 'idioma_th', fallback: 'Thai', flag: '🇹🇭' },
    { value: 'TR', key: 'idioma_tr', fallback: 'Turkish', flag: '🇹🇷' },
    { value: 'PL', key: 'idioma_pl', fallback: 'Polish', flag: '🇵🇱' },
    { value: 'NL', key: 'idioma_nl', fallback: 'Dutch', flag: '🇳🇱' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const currentLang = this.translationService.getCurrentLanguage();

    if (currentLang === 'es' || currentLang === 'en') {
      this.idiomaUI = currentLang;
    }

    this.route.queryParamMap.subscribe(params => {
      const buscar = params.get('buscar');

      if (buscar !== null) {
        this.busqueda = buscar;
      }

      this.cargarObras();
    });
  }

  seleccionarCategoria(categoria: Categoria): void {
    this.categoriaSeleccionada = categoria.value;
    this.cargarObras();
  }

  cambiarIdiomaUI(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idioma = select.value as 'es' | 'en';

    this.idiomaUI = idioma;
    this.translationService.setLanguage(idioma);
  }

  buscarDesdeInput(): void {
    this.router.navigate(['/categorias'], {
      queryParams: {
        buscar: this.busqueda.trim() || null
      },
      queryParamsHandling: 'merge'
    });
  }

  cargarObras(): void {
    this.cargando = true;
    this.error = '';

    const params = new URLSearchParams();

    params.set('orden', this.ordenSeleccionado);
    params.set('limite', '50');

    if (this.busqueda.trim()) {
      params.set('buscar', this.busqueda.trim());
    }

    if (this.categoriaSeleccionada !== 'todos') {
      params.set('genero', this.categoriaSeleccionada);
    }

    if (this.idiomaObraSeleccionado !== 'todos') {
      params.set('idioma', this.idiomaObraSeleccionado.toUpperCase());
    }

    this.http.get<BuscarResponse>(`${this.apiUrl}?${params.toString()}`).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.error =
            res.error ||
            this.translationService.getTranslation('No se pudieron cargar los resultados');
          return;
        }

        this.usuarios = res.usuarios || [];
        this.obras = res.obras || [];
      },
      error: (err) => {
        this.cargando = false;
        this.error =
          err.error?.error ||
          this.translationService.getTranslation('Error al cargar los resultados');
        console.error(err);
      }
    });
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = 'todos';
    this.idiomaObraSeleccionado = 'todos';
    this.ordenSeleccionado = 'recientes';
    this.busqueda = '';

    this.router.navigate(['/categorias']);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }

  abrirObra(obra: Obra): void {
    this.router.navigate(['/obra', obra.id]);
  }

  abrirPerfilUsuario(usuario: UsuarioResultado): void {
    this.router.navigate(['/perfil', usuario.id]);
  }

  abrirPerfil(event: Event, obra: Obra): void {
    event.stopPropagation();

    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  getCategoriasObra(obra: Obra): string[] {
    const values = obra.categorias && obra.categorias.length > 0
      ? obra.categorias
      : (obra.genero || '').split(',');

    return Array.from(
      new Set(
        values
          .map(item => item.trim())
          .filter(Boolean)
      )
    );
  }

  getCategoriaLabel(value?: string): string {
    if (!value) {
      return this.translateWithFallback('Sin categoría', 'Sin categoría');
    }

    const categoria = this.categorias.find(item => item.value === value);

    if (!categoria) {
      return value;
    }

    return this.translateWithFallback(categoria.key, categoria.fallback);
  }

  getCategoriaLabels(obra: Obra, max: number = 3): string[] {
    return this.getCategoriasObra(obra)
      .slice(0, max)
      .map(categoria => this.getCategoriaLabel(categoria));
  }

  getCategoriaActual(): string {
    return this.getCategoriaLabel(this.categoriaSeleccionada);
  }

  getMainCategoriaLabel(obra: Obra): string {
    const categorias = this.getCategoriasObra(obra);

    if (categorias.length === 0) {
      return this.translateWithFallback('Sin categoría', 'Sin categoría');
    }

    return this.getCategoriaLabel(categorias[0]);
  }

  getExtraCategoriaCount(obra: Obra): number {
    return Math.max(this.getCategoriasObra(obra).length - 1, 0);
  }

  getIdiomaLabel(value?: string): string {
    const normalized = (value || 'GLOBAL').toUpperCase();
    const idioma = this.idiomasObra.find(item => item.value.toUpperCase() === normalized);

    if (!idioma) {
      return normalized;
    }

    return this.translateWithFallback(idioma.key, idioma.fallback);
  }

  getIdiomaFlag(value?: string): string {
    const normalized = (value || 'GLOBAL').toUpperCase();
    return this.idiomasObra.find(item => item.value.toUpperCase() === normalized)?.flag || '🌐';
  }

  getIdiomaOptionLabel(idioma: IdiomaOption): string {
    return `${idioma.flag} ${this.translateWithFallback(idioma.key, idioma.fallback)}`;
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translationService.getTranslation(key);
    return translated && translated !== key ? translated : fallback;
  }
}
