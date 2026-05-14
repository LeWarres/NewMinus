import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

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

interface CapituloItem {
  tipo: string;

  obraId: number;
  usuarioId: number | null;

  tituloObra: string;
  descripcionObra?: string;

  genero?: string;
  categorias?: string[];
  idioma?: string;
  portada?: string;
  numVisitas: number;

  capituloId: number;
  numeroCapitulo: number;
  tituloCapitulo?: string;
  descripcionCapitulo?: string;
  fechaCreacion: string;

  autor: string;
  autorAvatar?: string;
}

interface ObrasResponse {
  success: boolean;
  error?: string;
  obras: Obra[];
}

interface CapitulosResponse {
  success: boolean;
  error?: string;
  items: CapituloItem[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  siteUrl = 'https://minuscreators.com';

  obrasUrl = 'https://minuscreators.com/api/listar_obras.php';
  capitulosUrl = 'https://minuscreators.com/api/capitulos_recientes.php';
  followingUrl = 'https://minuscreators.com/api/following.php';

  currentUser: CurrentUser | null = null;

  obrasNuevas: Obra[] = [];
  capitulosNuevos: CapituloItem[] = [];
  followingItems: CapituloItem[] = [];

  isMobile = false;

  cargandoObras = false;
  cargandoCapitulos = false;
  cargandoFollowing = false;

  errorObras = '';
  errorCapitulos = '';
  errorFollowing = '';

  private categoryTranslationKeys: Record<string, string> = {
    'accion': 'categoria_accion',
    'aventura': 'categoria_aventura',
    'comedia': 'categoria_comedia',
    'drama': 'categoria_drama',
    'fantasia': 'categoria_fantasia',
    'romance': 'categoria_romance',
    'terror': 'categoria_terror',
    'ciencia-ficcion': 'categoria_ciencia_ficcion',
    'misterio': 'categoria_misterio',
    'suspenso': 'categoria_suspenso',
    'sobrenatural': 'categoria_sobrenatural',
    'psicologico': 'categoria_psicologico',
    'slice-of-life': 'categoria_slice_of_life',
    'vida-escolar': 'categoria_vida_escolar',
    'deportes': 'categoria_deportes',
    'artes-marciales': 'categoria_artes_marciales',
    'mecha': 'categoria_mecha',
    'isekai': 'categoria_isekai',
    'historico': 'categoria_historico',
    'musica': 'categoria_musica',
    'cocina': 'categoria_cocina',
    'magia': 'categoria_magia',
    'superheroes': 'categoria_superheroes',
    'crimen': 'categoria_crimen',
    'post-apocaliptico': 'categoria_post_apocaliptico',
    'cyberpunk': 'categoria_cyberpunk',
    'steampunk': 'categoria_steampunk',
    'guerra': 'categoria_guerra',
    'parodia': 'categoria_parodia',
    'tragedia': 'categoria_tragedia',
    'shonen': 'categoria_shonen',
    'shojo': 'categoria_shojo',
    'seinen': 'categoria_seinen',
    'josei': 'categoria_josei',
    'kodomo': 'categoria_kodomo',
    'boys-love': 'categoria_boys_love',
    'girls-love': 'categoria_girls_love'
  };

  private categoryFallbacks: Record<string, string> = {
    'accion': 'Acción',
    'aventura': 'Aventura',
    'comedia': 'Comedia',
    'drama': 'Drama',
    'fantasia': 'Fantasía',
    'romance': 'Romance',
    'terror': 'Terror',
    'ciencia-ficcion': 'Ciencia ficción',
    'misterio': 'Misterio',
    'suspenso': 'Suspenso',
    'sobrenatural': 'Sobrenatural',
    'psicologico': 'Psicológico',
    'slice-of-life': 'Slice of life',
    'vida-escolar': 'Vida escolar',
    'deportes': 'Deportes',
    'artes-marciales': 'Artes marciales',
    'mecha': 'Mecha',
    'isekai': 'Isekai',
    'historico': 'Histórico',
    'musica': 'Música',
    'cocina': 'Cocina',
    'magia': 'Magia',
    'superheroes': 'Superhéroes',
    'crimen': 'Crimen',
    'post-apocaliptico': 'Post-apocalíptico',
    'cyberpunk': 'Cyberpunk',
    'steampunk': 'Steampunk',
    'guerra': 'Guerra',
    'parodia': 'Parodia',
    'tragedia': 'Tragedia',
    'shonen': 'Shonen',
    'shojo': 'Shojo',
    'seinen': 'Seinen',
    'josei': 'Josei',
    'kodomo': 'Kodomo',
    'boys-love': 'Boys Love',
    'girls-love': 'Girls Love'
  };

  private languageTranslationKeys: Record<string, string> = {
    GLOBAL: 'idioma_global',
    ES: 'idioma_es',
    EN: 'idioma_en',
    JA: 'idioma_ja',
    KO: 'idioma_ko',
    ZH: 'idioma_zh',
    FR: 'idioma_fr',
    DE: 'idioma_de',
    PT: 'idioma_pt',
    IT: 'idioma_it',
    RU: 'idioma_ru',
    AR: 'idioma_ar',
    HI: 'idioma_hi',
    ID: 'idioma_id',
    VI: 'idioma_vi',
    TH: 'idioma_th',
    TR: 'idioma_tr',
    PL: 'idioma_pl',
    NL: 'idioma_nl'
  };

  

  private languageFallbacks: Record<string, string> = {
    GLOBAL: 'Global',
    ES: 'Español',
    EN: 'English',
    JA: 'Japanese',
    KO: 'Korean',
    ZH: 'Chinese',
    FR: 'French',
    DE: 'German',
    PT: 'Portuguese',
    IT: 'Italian',
    RU: 'Russian',
    AR: 'Arabic',
    HI: 'Hindi',
    ID: 'Indonesian',
    VI: 'Vietnamese',
    TH: 'Thai',
    TR: 'Turkish',
    PL: 'Polish',
    NL: 'Dutch'
  };

  private languageFlags: Record<string, string> = {
    GLOBAL: '🌐',
    ES: '🇪🇸',
    EN: '🇬🇧',
    JA: '🇯🇵',
    KO: '🇰🇷',
    ZH: '🇨🇳',
    FR: '🇫🇷',
    DE: '🇩🇪',
    PT: '🇵🇹',
    IT: '🇮🇹',
    RU: '🇷🇺',
    AR: '🇸🇦',
    HI: '🇮🇳',
    ID: '🇮🇩',
    VI: '🇻🇳',
    TH: '🇹🇭',
    TR: '🇹🇷',
    PL: '🇵🇱',
    NL: '🇳🇱'
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const resetToken = this.route.snapshot.queryParamMap.get('token');

    if (resetToken) {
      this.router.navigate(['/reset-password'], {
        queryParams: {
          token: resetToken
        },
        replaceUrl: true
      });

      return;
    }

    this.currentUser = this.authService.getCurrentUser();

    this.checkScreenSize();
    this.cargarObrasNuevas();
    this.cargarCapitulosNuevos();

    if (this.currentUser) {
      this.cargarFollowing();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  cargarObrasNuevas(): void {
    this.cargandoObras = true;
    this.errorObras = '';

    this.http
      .get<ObrasResponse>(`${this.obrasUrl}?orden=recientes&limite=12`)
      .subscribe({
        next: (res) => {
          this.cargandoObras = false;

          if (!res.success) {
            this.errorObras =
              res.error ||
              this.translationService.getTranslation('No se pudieron cargar las obras');
            return;
          }

          this.obrasNuevas = res.obras || [];
        },
        error: (err) => {
          this.cargandoObras = false;
          this.errorObras =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar obras');
          console.error(err);
        }
      });
  }

  cargarCapitulosNuevos(): void {
    this.cargandoCapitulos = true;
    this.errorCapitulos = '';

    this.http
      .get<CapitulosResponse>(`${this.capitulosUrl}?limite=12`)
      .subscribe({
        next: (res) => {
          this.cargandoCapitulos = false;

          if (!res.success) {
            this.errorCapitulos =
              res.error ||
              this.translationService.getTranslation('No se pudieron cargar los capítulos');
            return;
          }

          this.capitulosNuevos = res.items || [];
        },
        error: (err) => {
          this.cargandoCapitulos = false;
          this.errorCapitulos =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar capítulos');
          console.error(err);
        }
      });
  }

  cargarFollowing(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.followingItems = [];
      return;
    }

    this.cargandoFollowing = true;
    this.errorFollowing = '';

    this.http
      .get<CapitulosResponse>(
        `${this.followingUrl}?limite=12`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargandoFollowing = false;

          if (!res.success) {
            this.errorFollowing =
              res.error ||
              this.translationService.getTranslation('No se pudo cargar lo que sigues');
            return;
          }

          this.followingItems = res.items || [];
        },
        error: (err) => {
          this.cargandoFollowing = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.currentUser = null;
            this.followingItems = [];
            return;
          }

          this.errorFollowing =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar lo que sigues');

          console.error(err);
        }
      });
  }

  abrirObra(obra: Obra): void {
    this.router.navigate(['/obra', obra.id]);
  }

  abrirCapitulo(item: CapituloItem): void {
    this.router.navigate([
      '/obra',
      item.obraId,
      'capitulo',
      item.numeroCapitulo
    ]);
  }

  abrirPerfilObra(event: Event, obra: Obra): void {
    event.stopPropagation();

    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  abrirPerfilCapitulo(event: Event, item: CapituloItem): void {
    event.stopPropagation();

    if (!item.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', item.usuarioId]);
  }

  discoverRandomStory(): void {
    type RandomItem =
      | { tipo: 'obra'; id: number }
      | { tipo: 'capitulo'; obraId: number; numeroCapitulo: number };

    const disponibles: RandomItem[] = [
      ...this.obrasNuevas.map((obra): RandomItem => ({
        tipo: 'obra',
        id: obra.id
      })),

      ...this.capitulosNuevos.map((item): RandomItem => ({
        tipo: 'capitulo',
        obraId: item.obraId,
        numeroCapitulo: item.numeroCapitulo
      }))
    ];

    if (disponibles.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * disponibles.length);
    const elegido = disponibles[randomIndex];

    if (elegido.tipo === 'obra') {
      this.router.navigate(['/obra', elegido.id]);
      return;
    }

    this.router.navigate([
      '/obra',
      elegido.obraId,
      'capitulo',
      elegido.numeroCapitulo
    ]);
  }

  nextCarousel(id: string): void {
    this.scrollCarousel(id, 1);
  }

  prevCarousel(id: string): void {
    this.scrollCarousel(id, -1);
  }

  scrollCarousel(id: string, direction: 1 | -1): void {
    const carousel = document.getElementById(id);

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * 320,
      behavior: 'smooth'
    });
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

  getCategoryValues(genero?: string, categorias?: string[]): string[] {
    const values = categorias && categorias.length > 0
      ? categorias
      : (genero || '').split(',');

    return Array.from(
      new Set(
        values
          .map(item => item.trim())
          .filter(Boolean)
      )
    );
  }

  getMainCategoryLabel(genero?: string, categorias?: string[]): string {
    const values = this.getCategoryValues(genero, categorias);

    if (values.length === 0) {
      return this.translateWithFallback('Sin categoría', 'Sin categoría');
    }

    return this.getCategoryLabel(values[0]);
  }

  getExtraCategoryCount(genero?: string, categorias?: string[]): number {
    const values = this.getCategoryValues(genero, categorias);
    return Math.max(values.length - 1, 0);
  }

  getCategoryLabel(value?: string): string {
    if (!value) {
      return this.translateWithFallback('Sin categoría', 'Sin categoría');
    }

    const key = this.categoryTranslationKeys[value];
    const fallback = this.categoryFallbacks[value] || value;

    return key ? this.translateWithFallback(key, fallback) : fallback;
  }

  getLanguageLabel(value?: string): string {
    const normalized = (value || 'GLOBAL').toUpperCase();
    const key = this.languageTranslationKeys[normalized];
    const fallback = this.languageFallbacks[normalized] || normalized;

    return key ? this.translateWithFallback(key, fallback) : fallback;
  }

  getLanguageFlag(value?: string): string {
    const normalized = (value || 'GLOBAL').toUpperCase();
    return this.languageFlags[normalized] || '🌐';
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translationService.getTranslation(key);
    return translated && translated !== key ? translated : fallback;
  }
}
