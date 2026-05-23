import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ObraCardComponent, ObraCardItem } from '../../components/cards/obra-card/obra-card.component';
import { TranslationService } from '../../services/translation.service';

interface ObrasResponse {
  success: boolean;
  error?: string;
  obras: ObraCardItem[];
}

@Component({
  selector: 'app-top',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ObraCardComponent
  ],
  templateUrl: './top.component.html',
  styleUrl: './top.component.css'
})
export class TopComponent implements OnInit, OnDestroy {
  private readonly obrasUrl = 'https://minuscreators.com/api/listar_obras.php';
  private readonly populares7DiasUrl = 'https://minuscreators.com/api/populares_7_dias.php';
  private readonly populares30DiasUrl = 'https://minuscreators.com/api/populares_30_dias.php';

  topHistorico: ObraCardItem[] = [];
  top30Dias: ObraCardItem[] = [];
  top7Dias: ObraCardItem[] = [];

  cargandoHistorico = false;
  cargando30Dias = false;
  cargando7Dias = false;

  errorHistorico = '';
  error30Dias = '';
  error7Dias = '';

  private languageSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.languageSubscription = this.translationService.currentLanguage$.subscribe(() => {
      this.cargarContenido();
    });
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
  }

  cargarContenido(): void {
    this.cargarTopHistorico();
    this.cargarTop30Dias();
    this.cargarTop7Dias();
  }

  cargarTopHistorico(): void {
    this.cargandoHistorico = true;
    this.errorHistorico = '';

    const params = this.homeParams()
      .set('orden', 'populares')
      .set('limite', '5');

    this.http
      .get<ObrasResponse>(this.obrasUrl, {
        params,
        withCredentials: true
      })
      .subscribe({
        next: (res) => {
          this.cargandoHistorico = false;

          if (!res.success) {
            this.errorHistorico =
              res.error ||
              this.translationService.getTranslation('No se pudo cargar el top histórico');
            return;
          }

          this.topHistorico = res.obras || [];
        },
        error: (err) => {
          this.cargandoHistorico = false;
          this.errorHistorico =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar el top histórico');

          console.error(err);
        }
      });
  }

  cargarTop7Dias(): void {
    this.cargando7Dias = true;
    this.error7Dias = '';

    const params = this.homeParams()
      .set('limite', '7');

    this.http
      .get<ObrasResponse>(this.populares7DiasUrl, {
        params,
        withCredentials: true
      })
      .subscribe({
        next: (res) => {
          this.cargando7Dias = false;

          if (!res.success) {
            this.error7Dias =
              res.error ||
              this.translationService.getTranslation('No se pudo cargar el top de 7 días');
            return;
          }

          this.top7Dias = res.obras || [];
        },
        error: (err) => {
          this.cargando7Dias = false;
          this.error7Dias =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar el top de 7 días');

          console.error(err);
        }
      });
  }

  cargarTop30Dias(): void {
    this.cargando30Dias = true;
    this.error30Dias = '';

    const params = this.homeParams()
      .set('limite', '10');

    this.http
      .get<ObrasResponse>(this.populares30DiasUrl, {
        params,
        withCredentials: true
      })
      .subscribe({
        next: (res) => {
          this.cargando30Dias = false;

          if (!res.success) {
            this.error30Dias =
              res.error ||
              this.translationService.getTranslation('No se pudo cargar el top de 30 días');
            return;
          }

          this.top30Dias = res.obras || [];
        },
        error: (err) => {
          this.cargando30Dias = false;
          this.error30Dias =
            err.error?.error ||
            this.translationService.getTranslation('Error al cargar el top de 30 días');

          console.error(err);
        }
      });
  }

  abrirObra(obra: ObraCardItem): void {
    this.router.navigate(
      ['/obra', obra.id],
      {
        queryParams: obra.idioma
          ? { idioma: obra.idioma }
          : {}
      }
    );
  }

  abrirPerfilObra(obra: ObraCardItem): void {
    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  trackByObra(index: number, obra: ObraCardItem): number {
    return obra.id || index;
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
}