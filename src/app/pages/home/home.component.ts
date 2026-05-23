import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { RecommendedCarouselComponent } from '../../components/recommended-carousel/recommended-carousel.component';

import {
  ObraCardComponent,
  ObraCardItem
} from '../../components/cards/obra-card/obra-card.component';

import {
  CapituloCardComponent,
  CapituloCardItem
} from '../../components/cards/capitulo-card/capitulo-card.component';

interface Obra extends ObraCardItem {
  tipoEntrega?: string;
  serieConcluida?: boolean;
  fechaCreacion: string;
}

interface ObrasResponse {
  success: boolean;
  error?: string;
  obras: Obra[];
}

interface CapitulosResponse {
  success: boolean;
  error?: string;
  items: CapituloCardItem[];
}

interface HeroBannerImage {
  src: string;
  href: string;
  alt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RecommendedCarouselComponent,
    ObraCardComponent,
    CapituloCardComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  obrasUrl = 'https://minuscreators.com/api/listar_obras.php';
  capitulosUrl = 'https://minuscreators.com/api/capitulos_recientes.php';
  followingUrl = 'https://minuscreators.com/api/following.php';
  populares7DiasUrl = 'https://minuscreators.com/api/populares_7_dias.php';

  currentUser: CurrentUser | null = null;

  obrasNuevas: Obra[] = [];
  capitulosNuevos: CapituloCardItem[] = [];
  followingItems: CapituloCardItem[] = [];
  obrasRecomendadas: ObraCardItem[] = [];
  obrasPopulares7Dias: Obra[] = [];
  heroBannerImages: HeroBannerImage[] = [];

  cargandoObras = false;
  cargandoCapitulos = false;
  cargandoFollowing = false;
  cargandoPopulares7Dias = false;

  errorObras = '';
  errorCapitulos = '';
  errorFollowing = '';
  errorPopulares7Dias = '';

  private languageSubscription?: Subscription;

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
    this.updateHeroBannerImages();

    /*
      Recarga Home cuando cambia el idioma de la interfaz.
      Si no hay sesión, el backend usa este idioma.
      Si hay sesión, el backend usa usuario_idiomas_lectura.
    */
    this.languageSubscription = this.translationService.currentLanguage$.subscribe(() => {
      this.updateHeroBannerImages();
      this.cargarContenidoPrincipal();
    });

    if (this.currentUser) {
      this.cargarFollowing();
    }
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
  }

  cargarContenidoPrincipal(): void {
    this.cargarPopulares7Dias();
    this.cargarObrasNuevas();
    this.cargarCapitulosNuevos();
  }

  cargarPopulares7Dias(): void {
    this.cargandoPopulares7Dias = true;
    this.errorPopulares7Dias = '';

    const params = this.homeParams()
      .set('limite', '10');

    this.http
      .get<ObrasResponse>(
        this.populares7DiasUrl,
        {
          params,
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargandoPopulares7Dias = false;

          if (!res.success) {
            this.errorPopulares7Dias =
              res.error ||
              this.translationService.getTranslation('No se pudieron cargar las obras populares');
            return;
          }

          this.obrasPopulares7Dias = res.obras || [];
        },
        error: (err) => {
          this.cargandoPopulares7Dias = false;
          this.errorPopulares7Dias =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar obras populares');

          console.error(err);
        }
      });
  }

  cargarObrasNuevas(): void {
    this.cargandoObras = true;
    this.errorObras = '';

    const params = this.homeParams()
      .set('orden', 'recientes')
      .set('limite', '10');

    this.http
      .get<ObrasResponse>(
        this.obrasUrl,
        {
          params,
          withCredentials: true
        }
      )
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

    const params = this.homeParams()
      .set('limite', '10');

    this.http
      .get<CapitulosResponse>(
        this.capitulosUrl,
        {
          params,
          withCredentials: true
        }
      )
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
        `${this.followingUrl}?limite=8`,
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

  abrirObra(obra: { id: number; idioma?: string }): void {
    this.router.navigate(
      ['/obra', obra.id],
      {
        queryParams: obra.idioma
          ? { idioma: obra.idioma }
          : {}
      }
    );
  }

  abrirCapitulo(item: CapituloCardItem): void {
    this.router.navigate(
      [
        '/obra',
        item.obraId,
        'capitulo',
        item.numeroCapitulo
      ],
      {
        queryParams: this.chapterQueryParams(item)
      }
    );
  }

  abrirPerfilObra(obra: { usuarioId: number | null }): void {
    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  abrirPerfilCapitulo(item: CapituloCardItem): void {
    if (!item.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', item.usuarioId]);
  }

  discoverRandomStory(): void {
    type RandomItem =
      | { tipo: 'obra'; id: number; idioma?: string }
      | {
          tipo: 'capitulo';
          obraId: number;
          numeroCapitulo: number;
          idioma?: string;
        };

    const disponibles: RandomItem[] = [
      ...this.obrasRecomendadas.map((obra): RandomItem => ({
        tipo: 'obra',
        id: obra.id,
        idioma: obra.idioma
      })),

      ...this.obrasPopulares7Dias.map((obra): RandomItem => ({
        tipo: 'obra',
        id: obra.id,
        idioma: obra.idioma
      })),

      ...this.obrasNuevas.map((obra): RandomItem => ({
        tipo: 'obra',
        id: obra.id,
        idioma: obra.idioma
      })),

      ...this.capitulosNuevos.map((item): RandomItem => ({
        tipo: 'capitulo',
        obraId: item.obraId,
        numeroCapitulo: item.numeroCapitulo,
        idioma: item.idioma
      }))
    ];

    if (disponibles.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * disponibles.length);
    const elegido = disponibles[randomIndex];

    if (elegido.tipo === 'obra') {
      this.router.navigate(
        ['/obra', elegido.id],
        {
          queryParams: elegido.idioma
            ? { idioma: elegido.idioma }
            : {}
        }
      );
      return;
    }

    this.router.navigate(
      [
        '/obra',
        elegido.obraId,
        'capitulo',
        elegido.numeroCapitulo
      ],
      {
        queryParams: elegido.idioma
          ? { idioma: elegido.idioma }
          : {}
      }
    );
  }

  verMasCategoriaRecomendada(): void {
    this.router.navigate(['/categorias'], {
      queryParams: {
        idioma: 'preferidos'
      }
    });
  }

  nextCarousel(id: string): void {
    this.scrollCarousel(id, 1);
  }

  prevCarousel(id: string): void {
    this.scrollCarousel(id, -1);
  }

  trackByObra(index: number, obra: Obra): number {
    return obra.id || index;
  }

  trackByCapitulo(index: number, item: CapituloCardItem): number | string {
    return item.capituloVersionId || item.capituloId || `${item.obraId}-${item.numeroCapitulo}-${item.idioma || 'GLOBAL'}-${index}`;
  }

  trackByHeroBanner(index: number, image: HeroBannerImage): string {
    return image.src || `${index}`;
  }

  get discoverButtonLabel(): string {
    const currentLanguage = this.translationService
      .getCurrentLanguage()
      .trim()
      .toLowerCase();

    return currentLanguage === 'es'
      ? 'Historia Random'
      : 'Random Story';
  }

  onRecommendationsChange(items: ObraCardItem[]): void {
    this.obrasRecomendadas = items || [];
  }

  private chapterQueryParams(item: CapituloCardItem): Record<string, string> {
    return item.idioma
      ? { idioma: item.idioma }
      : {};
  }

  private updateHeroBannerImages(): void {
    const currentLanguage = this.translationService
      .getCurrentLanguage()
      .trim()
      .toLowerCase();

    const imageNames = currentLanguage === 'es'
      ? ['dises', 'yues', 'ines']
      : ['disen', 'yuen', 'inen'];

    const imageLinks = [
      'https://discord.gg/FMSBa3cYE',
      'https://www.youtube.com/@CarlitoxBanana',
      'https://x.com/CBanana26797'
    ];

    this.heroBannerImages = imageNames.map((name, index) => ({
      src: `/obras/paleta/${name}.webp`,
      href: imageLinks[index] || '/',
      alt: `Minus Creators banner ${index + 1}`
    }));
  }

  private homeParams(): HttpParams {
    return new HttpParams()
      .set('contexto', 'home')
      .set('idiomaInterfaz', this.getIdiomaInterfazContenido());
  }

  private getIdiomaInterfazContenido(): string {
    const currentLanguage = this.translationService
      .getCurrentLanguage()
      .trim()
      .toUpperCase();

    const allowedLanguages = [
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

    return allowedLanguages.includes(currentLanguage)
      ? currentLanguage
      : 'EN';
  }

  private scrollCarousel(id: string, direction: 1 | -1): void {
    const carousel = document.getElementById(id);

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * 320,
      behavior: 'smooth'
    });
  }
}
