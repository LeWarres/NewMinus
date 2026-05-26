import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { getContentLanguageCode } from '../../shared/options/language-options';
import { RecommendedCarouselComponent } from '../../components/recommended-carousel/recommended-carousel.component';
import { HomeWorkCarouselComponent } from './components/home-work-carousel/home-work-carousel.component';
import { HomeChapterCarouselComponent } from './components/home-chapter-carousel/home-chapter-carousel.component';

import type { ObraCardItem } from '../../components/cards/obra-card/obra-card.component';
import type { CapituloCardItem } from '../../components/cards/capitulo-card/capitulo-card.component';

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
    HomeWorkCarouselComponent,
    HomeChapterCarouselComponent
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
  private readonly homeCarouselLimit = 8;
  private readonly followingHomeLimit = 6;
  private readonly deferredLoadStepMs = 220;
  private deferredLoadTimers: number[] = [];
  private lastLoadedLanguage = '';

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
    this.loadHomeForCurrentLanguage();

    /*
      Recarga Home cuando cambia el idioma de la interfaz.
      Si no hay sesión, el backend usa este idioma.
      Si hay sesión, el backend usa usuario_idiomas_lectura.
    */
    this.languageSubscription = this.translationService.currentLanguage$.subscribe(() => {
      this.loadHomeForCurrentLanguage();
    });
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
    this.clearDeferredLoads();
  }

  cargarContenidoPrincipal(): void {
    this.clearDeferredLoads();
    this.prepareDeferredLoadingStates();

    this.cargarPopulares7Dias();

    this.queueHomeLoad(() => this.cargarObrasNuevas(), this.deferredLoadStepMs);
    this.queueHomeLoad(() => this.cargarCapitulosNuevos(), this.deferredLoadStepMs * 2);
    this.queueHomeLoad(() => this.cargarFollowing(), this.deferredLoadStepMs * 3);
  }

  cargarPopulares7Dias(): void {
    this.cargandoPopulares7Dias = true;
    this.errorPopulares7Dias = '';

    const params = this.homeParams()
      .set('limite', String(this.homeCarouselLimit));

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
              this.translationService.getTranslation('home.error.popular_works_failed');
            return;
          }

          this.obrasPopulares7Dias = res.obras || [];
        },
        error: (err) => {
          this.cargandoPopulares7Dias = false;
          this.errorPopulares7Dias =
            err.error?.error ||
            this.translationService.getTranslation('home.error.popular_works_error');

          console.error(err);
        }
      });
  }

  cargarObrasNuevas(): void {
    this.cargandoObras = true;
    this.errorObras = '';

    const params = this.homeParams()
      .set('orden', 'recientes')
      .set('limite', String(this.homeCarouselLimit));

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
              this.translationService.getTranslation('home.error.works_failed');
            return;
          }

          this.obrasNuevas = res.obras || [];
        },
        error: (err) => {
          this.cargandoObras = false;
          this.errorObras =
            err.error?.error ||
            this.translationService.getTranslation('home.error.works_error');

          console.error(err);
        }
      });
  }

  cargarCapitulosNuevos(): void {
    this.cargandoCapitulos = true;
    this.errorCapitulos = '';

    const params = this.homeParams()
      .set('limite', String(this.homeCarouselLimit));

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
              this.translationService.getTranslation('home.error.chapters_failed');
            return;
          }

          this.capitulosNuevos = res.items || [];
        },
        error: (err) => {
          this.cargandoCapitulos = false;
          this.errorCapitulos =
            err.error?.error ||
            this.translationService.getTranslation('home.error.chapters_error');

          console.error(err);
        }
      });
  }

  cargarFollowing(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.cargandoFollowing = false;
      this.followingItems = [];
      return;
    }

    this.cargandoFollowing = true;
    this.errorFollowing = '';

    this.http
      .get<CapitulosResponse>(
        `${this.followingUrl}?limite=${this.followingHomeLimit}`,
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
              this.translationService.getTranslation('home.error.following_failed');
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
            this.translationService.getTranslation('home.error.following_error');

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

  trackByHeroBanner(index: number, image: HeroBannerImage): string {
    return image.src || `${index}`;
  }

  get discoverButtonLabel(): string {
    return this.translationService.getTranslation('home.hero.random_button');
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
      alt: `${this.translationService.getTranslation('home.hero.banner_alt_prefix')} ${index + 1}`
    }));
  }

  private loadHomeForCurrentLanguage(): void {
    const currentLanguage = this.translationService
      .getCurrentLanguage()
      .trim()
      .toLowerCase();

    if (this.lastLoadedLanguage === currentLanguage) {
      return;
    }

    this.lastLoadedLanguage = currentLanguage;
    this.updateHeroBannerImages();
    this.cargarContenidoPrincipal();
  }

  private prepareDeferredLoadingStates(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.obrasPopulares7Dias = [];
    this.obrasNuevas = [];
    this.capitulosNuevos = [];

    this.cargandoObras = true;
    this.cargandoCapitulos = true;
    this.cargandoPopulares7Dias = true;

    this.errorObras = '';
    this.errorCapitulos = '';
    this.errorPopulares7Dias = '';

    if (this.currentUser) {
      this.followingItems = [];
      this.cargandoFollowing = true;
      this.errorFollowing = '';
      return;
    }

    this.cargandoFollowing = false;
    this.errorFollowing = '';
    this.followingItems = [];
  }

  private queueHomeLoad(callback: () => void, delayMs: number): void {
    const timerId = window.setTimeout(() => {
      this.deferredLoadTimers = this.deferredLoadTimers.filter(id => id !== timerId);
      callback();
    }, delayMs);

    this.deferredLoadTimers.push(timerId);
  }

  private clearDeferredLoads(): void {
    this.deferredLoadTimers.forEach(timerId => window.clearTimeout(timerId));
    this.deferredLoadTimers = [];
  }

  private homeParams(): HttpParams {
    return new HttpParams()
      .set('contexto', 'home')
      .set('idiomaInterfaz', this.getIdiomaInterfazContenido());
  }

  private getIdiomaInterfazContenido(): string {
    return getContentLanguageCode(
      this.translationService.getCurrentLanguage()
    );
  }
}
