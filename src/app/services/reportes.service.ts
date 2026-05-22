import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';

import { AuthService } from './auth.service';

export interface CrearReportePayload {
  url_reportada: string;
  comentario: string;
  razon: string;
}

export interface CrearReporteResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  reporteId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private reportesUrl = 'https://minuscreators.com/api/reportes.php';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  crearReporte(payload: CrearReportePayload): Observable<CrearReporteResponse> {
    if (this.authService.getCsrfToken()) {
      return this.postReporte(payload);
    }

    return this.authService.fetchCsrfToken().pipe(
      tap((res: any) => {
        if (res?.csrfToken) {
          this.authService.saveCsrfToken(res.csrfToken);
        }
      }),
      switchMap(() => this.postReporte(payload))
    );
  }

  private postReporte(payload: CrearReportePayload): Observable<CrearReporteResponse> {
    return this.http.post<CrearReporteResponse>(
      this.reportesUrl,
      payload,
      {
        withCredentials: true,
        headers: this.authService.csrfHeaders()
      }
    );
  }
}