import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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

  currentUser: CurrentUser | null = null;

  obrasNuevas: Obra[] = [];
  capitulosNuevos: CapituloCardItem[] = [];
  followingItems: CapituloCardItem[] = [];

  cargandoObras = false;
  cargandoCapitulos = false;
  cargandoFollowing = false;

  errorObras = '';
  errorCapitulos = '';
  errorFollowing = '';

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

    /*
      Recarga Home cuando cambia el idioma de la interfaz.
      Si no hay sesión, el backend usa este idioma.
      Si hay sesión, el backend usa usuario_idiomas_lectura.
    */
    this.languageSubscription = this.translationService.currentLanguage$.subscribe(() => {
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
    this.cargarObrasNuevas();
    this.cargarCapitulosNuevos();
  }

  cargarObrasNuevas(): void {
    this.cargandoObras = true;
    this.errorObras = '';

    const params = this.homeParams()
      .set('orden', 'recientes')
      .set('limite', '12');

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
      .set('limite', '12');

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

  abrirObra(obra: { id: number }): void {
    this.router.navigate(['/obra', obra.id]);
  }

  abrirCapitulo(item: CapituloCardItem): void {
    this.router.navigate([
      '/obra',
      item.obraId,
      'capitulo',
      item.numeroCapitulo
    ]);
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

  trackByObra(index: number, obra: Obra): number {
    return obra.id || index;
  }

  trackByCapitulo(index: number, item: CapituloCardItem): number {
    return item.capituloId || index;
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