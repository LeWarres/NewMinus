import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  CrearReportePayload,
  ReportesService
} from '../../services/reportes.service';

import { AuthService } from '../../services/auth.service';

export interface ReporteContenidoPayload {
  url_reportada: string;
  razon: string;
  comentario: string;
}

interface RazonReporte {
  value: string;
  titulo: string;
  descripcion: string;
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
  @Input() textoBoton = 'Reportar';
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
    {
      value: 'contenido_inapropiado',
      titulo: 'Contenido inapropiado',
      descripcion: 'Contenido sexual, violento, ofensivo o que no debería estar publicado.'
    },
    {
      value: 'spam',
      titulo: 'Spam o engaño',
      descripcion: 'Publicidad no deseada, enlaces sospechosos, estafa o contenido repetitivo.'
    },
    {
      value: 'copyright',
      titulo: 'Derechos de autor',
      descripcion: 'Contenido publicado sin permiso del autor o propietario.'
    },
    {
      value: 'error_imagen',
      titulo: 'Error en imagen',
      descripcion: 'Imagen rota, incorrecta, duplicada o que no carga.'
    },
    {
      value: 'error_texto',
      titulo: 'Error en texto o información',
      descripcion: 'Título, capítulo, descripción o datos incorrectos.'
    },
    {
      value: 'acoso',
      titulo: 'Acoso o abuso',
      descripcion: 'Insultos, amenazas, ataques o comportamiento abusivo.'
    },
    {
      value: 'otro',
      titulo: 'Otro motivo',
      descripcion: 'El problema no aparece en esta lista.'
    }
  ];

  constructor(
    private reportesService: ReportesService,
    private authService: AuthService,
    private router: Router
  ) {}

  abrirModal(): void {
    this.error = '';

    if (!this.urlReportada.trim()) {
      this.error = 'No se encontró la URL del contenido que quieres reportar.';
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
    const razon = this.razones.find(item => item.value === value);
    return razon ? razon.titulo : value;
  }

  obtenerDescripcionRazon(value: string): string {
    const razon = this.razones.find(item => item.value === value);
    return razon ? razon.descripcion : '';
  }

  irAComentarios(): void {
    if (!this.razonSeleccionadaValor) {
      this.error = 'Selecciona una razón para continuar.';
      return;
    }

    this.error = '';
    this.pasoActual = 2;
  }

  irAConfirmacion(): void {
    if (this.comentario.trim().length > 1000) {
      this.error = 'El comentario no puede superar los 1000 caracteres.';
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
      this.error = 'Inicia sesión para poder reportar contenido.';
      return;
    }

    if (!this.urlReportada.trim()) {
      this.error = 'No se encontró la URL del contenido que quieres reportar.';
      return;
    }

    if (!this.razonSeleccionadaValor) {
      this.error = 'Selecciona una razón.';
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
          this.error = res.error || 'No se pudo enviar el reporte.';
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
          this.error = 'Tu sesión expiró. Inicia sesión de nuevo.';
          return;
        }

        if (err.status === 409) {
          this.error =
            err.error?.error ||
            'Ya reportaste este contenido. Puedes volver a reportarlo después de 24 horas.';
          return;
        }

        this.error =
          err.error?.error ||
          'Error al enviar el reporte. Inténtalo de nuevo.';
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