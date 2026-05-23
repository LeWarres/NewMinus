import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  CrearReportePayload,
  ReportesService
} from '../../services/reportes.service';

import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

export interface ReporteContenidoPayload {
  url_reportada: string;
  razon: string;
  comentario: string;
}

interface RazonReporte {
  value: string;
}

@Component({
  selector: 'app-reportar-contenido',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './reportar-contenido.component.html',
  styleUrl: './reportar-contenido.component.css'
})
export class ReportarContenidoComponent {
  @Input() textoBoton = 'common.actions.report';
  @Input() urlReportada = '';
  @Input() tituloContenido = '';
  @Input() contextoContenido = '';
  @Input() enviando = false;

  @Output() reporteConfirmado = new EventEmitter<ReporteContenidoPayload>();

  modalAbierto = false;
  enviado = false;

  pasoActual: 1 | 2 | 3 = 1;

  razonSeleccionadaValor = '';
  comentario = '';
  error = '';

  razones: RazonReporte[] = [
    { value: 'contenido_inapropiado' },
    { value: 'spam' },
    { value: 'copyright' },
    { value: 'error_imagen' },
    { value: 'error_texto' },
    { value: 'acoso' },
    { value: 'otro' }
  ];

  constructor(
    private reportesService: ReportesService,
    private authService: AuthService,
    private router: Router,
    public translationService: TranslationService
  ) {}

  get textoBotonTraducido(): string {
    return this.translationService.getTranslation(this.textoBoton);
  }

  get mostrarBotonLogin(): boolean {
    return (
      this.error === this.translationService.getTranslation('reportarContenido.error.login_required') ||
      this.error === this.translationService.getTranslation('reportarContenido.error.session_expired')
    );
  }

  abrirModal(): void {
    this.error = '';

    if (!this.urlReportada.trim()) {
      this.error = this.translationService.getTranslation('reportarContenido.error.no_url');
      return;
    }

    this.modalAbierto = true;
    this.enviado = false;
    this.pasoActual = 1;
  }

  cerrarModal(): void {
    if (this.enviando) {
      return;
    }

    this.modalAbierto = false;
    this.reiniciarFormulario();
  }

  seleccionarRazon(value: string): void {
    this.razonSeleccionadaValor = value;
    this.error = '';
  }

  obtenerTituloRazon(value: string): string {
    if (!value) {
      return '';
    }

    return this.translationService.getTranslation(`reportarContenido.reasons.${value}.title`);
  }

  obtenerDescripcionRazon(value: string): string {
    if (!value) {
      return '';
    }

    return this.translationService.getTranslation(`reportarContenido.reasons.${value}.desc`);
  }

  irAComentarios(): void {
    if (!this.razonSeleccionadaValor) {
      this.error = this.translationService.getTranslation('reportarContenido.error.select_reason_continue');
      return;
    }

    this.error = '';
    this.pasoActual = 2;
  }

  irAConfirmacion(): void {
    if (this.comentario.trim().length > 1000) {
      this.error = this.translationService.getTranslation('reportarContenido.error.comment_too_long');
      return;
    }

    this.error = '';
    this.pasoActual = 3;
  }

  volver(): void {
    this.error = '';

    if (this.pasoActual === 3) {
      this.pasoActual = 2;
      return;
    }

    if (this.pasoActual === 2) {
      this.pasoActual = 1;
    }
  }

  enviarReporte(): void {
    this.error = '';

    const usuario = this.authService.getCurrentUser();

    if (!usuario) {
      this.error = this.translationService.getTranslation('reportarContenido.error.login_required');
      return;
    }

    if (!this.urlReportada.trim()) {
      this.error = this.translationService.getTranslation('reportarContenido.error.no_url');
      return;
    }

    if (!this.razonSeleccionadaValor) {
      this.error = this.translationService.getTranslation('reportarContenido.error.select_reason');
      this.pasoActual = 1;
      return;
    }

    const payload: CrearReportePayload = {
      url_reportada: this.urlReportada.trim(),
      razon: this.razonSeleccionadaValor,
      comentario: this.comentario.trim()
    };

    this.enviando = true;

    this.reportesService.crearReporte(payload).subscribe({
      next: (res) => {
        this.enviando = false;

        if (!res.success) {
          this.error =
            res.error ||
            this.translationService.getTranslation('reportarContenido.error.send_failed');
          return;
        }

        this.enviado = true;

        this.reporteConfirmado.emit({
          url_reportada: payload.url_reportada,
          razon: payload.razon,
          comentario: payload.comentario
        });
      },
      error: (err) => {
        this.enviando = false;

        if (err.status === 401) {
          this.error = this.translationService.getTranslation('reportarContenido.error.session_expired');
          return;
        }

        if (err.status === 409) {
          this.error =
            err.error?.error ||
            this.translationService.getTranslation('reportarContenido.error.already_reported');
          return;
        }

        this.error =
          err.error?.error ||
          this.translationService.getTranslation('reportarContenido.error.send_error');
      }
    });
  }

  irALogin(): void {
    this.cerrarModal();
    this.router.navigate(['/login']);
  }

  cerrarDespuesDeEnviar(): void {
    this.modalAbierto = false;
    this.reiniciarFormulario();
  }

  private reiniciarFormulario(): void {
    this.pasoActual = 1;
    this.razonSeleccionadaValor = '';
    this.comentario = '';
    this.error = '';
    this.enviado = false;
  }
}