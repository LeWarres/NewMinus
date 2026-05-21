import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AuthService, CurrentUser } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

interface CalificacionObraResponse {
  success: boolean;
  error?: string;
  mensaje?: string;
  obraId?: number;
  promedio: number;
  totalCalificaciones: number;
  miCalificacion: number;
}

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './rating-stars.component.html',
  styleUrl: './rating-stars.component.css'
})
export class RatingStarsComponent implements OnInit, OnChanges {
    // trackBy para estrellas
    trackByStar(index: number, star: number): number {
      return star;
    }
  @Input({ required: true }) obraId!: number | null;
  @Input() ownerUserId: number | null = null;
  @Input() currentUserId: number | null = null;

  private calificacionUrl = 'https://minuscreators.com/api/calificacion_obra.php';

  currentUser: CurrentUser | null = null;

  promedio = 0;
  totalCalificaciones = 0;
  miCalificacion = 0;
  hoverCalificacion = 0;

  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';

  stars = [1, 2, 3, 4, 5];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.cargarCalificacion();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['obraId'] && !changes['obraId'].firstChange) {
      this.resetState();
      this.currentUser = this.authService.getCurrentUser();
      this.cargarCalificacion();
    }
  }

  get hasRatings(): boolean {
    return this.totalCalificaciones > 0;
  }

  get promedioTexto(): string {
    return this.hasRatings
      ? this.promedio.toFixed(1)
      : '0.0';
  }

  get selectedRating(): number {
    return this.hoverCalificacion || this.miCalificacion;
  }

  get isOwner(): boolean {
    return (
      this.ownerUserId !== null &&
      this.currentUserId !== null &&
      this.ownerUserId === this.currentUserId
    );
  }

  cargarCalificacion(): void {
    if (!this.obraId) {
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.http.get<CalificacionObraResponse>(
      `${this.calificacionUrl}?obra_id=${this.obraId}`,
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.error =
            res.error ||
            this.translationService.getTranslation('No se pudo cargar la calificación');
          return;
        }

        this.promedio = Number(res.promedio || 0);
        this.totalCalificaciones = Number(res.totalCalificaciones || 0);
        this.miCalificacion = Number(res.miCalificacion || 0);
      },
      error: (err) => {
        this.cargando = false;
        this.error =
          err.error?.error ||
          this.translationService.getTranslation('No se pudo cargar la calificación');

        console.error(err);
      }
    });
  }

  guardarCalificacion(calificacion: number): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.isOwner) {
      this.mensaje =
        this.translationService.getTranslation('No puedes calificar tu propia obra.');
      this.error = '';
      return;
    }

    if (!this.currentUser) {
      this.mensaje =
        this.translationService.getTranslation('Para calificar debes iniciar sesión.');
      return;
    }

    if (!this.obraId || calificacion < 1 || calificacion > 5) {
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.ensureCsrfAndRun(() => {
      this.http.post<CalificacionObraResponse>(
        this.calificacionUrl,
        {
          obra_id: this.obraId,
          calificacion
        },
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardando = false;

          if (!res.success) {
            this.error =
              res.error ||
              this.translationService.getTranslation('No se pudo guardar la calificación');
            return;
          }

          this.promedio = Number(res.promedio || 0);
          this.totalCalificaciones = Number(res.totalCalificaciones || 0);
          this.miCalificacion = Number(res.miCalificacion || 0);
          this.hoverCalificacion = 0;

          this.mensaje =
            this.translationService.getTranslation('Calificación guardada');
        },
        error: (err) => {
          this.guardando = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.currentUser = null;
            this.mensaje =
              this.translationService.getTranslation('Para calificar debes iniciar sesión.');
            return;
          }

          this.error =
            err.error?.error ||
            this.translationService.getTranslation('No se pudo guardar la calificación');

          console.error(err);
        }
      });
    }, () => {
      this.guardando = false;
      this.error =
        this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  onStarEnter(star: number): void {
    if (this.guardando) {
      return;
    }

    this.hoverCalificacion = star;
  }

  onStarLeave(): void {
    this.hoverCalificacion = 0;
  }

  isUserStarActive(star: number): boolean {
    return star <= this.selectedRating;
  }

  isAverageStarActive(star: number): boolean {
    return star <= Math.round(this.promedio);
  }

  private resetState(): void {
    this.promedio = 0;
    this.totalCalificaciones = 0;
    this.miCalificacion = 0;
    this.hoverCalificacion = 0;

    this.cargando = false;
    this.guardando = false;
    this.mensaje = '';
    this.error = '';
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
}