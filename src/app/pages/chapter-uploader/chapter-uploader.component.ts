import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface UploadChapterResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  obra_id?: number;
  capitulo_id?: number;
  numero_capitulo?: number;
}

@Component({
  selector: 'app-chapter-uploader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './chapter-uploader.component.html',
  styleUrl: './chapter-uploader.component.css'
})
export class ChapterUploaderComponent implements OnInit {
  @ViewChild('fileInputPages') fileInputPages!: ElementRef<HTMLInputElement>;

  apiUrl = 'https://minuscreators.com/api/subir_capitulo.php';

  obraId = 0;
  currentUser: any = null;

  tituloCapitulo = '';
  descripcionCapitulo = '';
  numeroCapitulo = '';

  selectedPages: File[] = [];

  cargando = false;
  respuesta = '';

  maxFileSize = 10 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.obraId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.obraId) {
      this.router.navigate(['/']);
    }
  }

  onFilesSelectedPages(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    const validos = files.filter(file => this.esImagenValida(file));

    if (validos.length !== files.length) {
      this.respuesta = 'Algunas imágenes no se agregaron porque no son válidas o pesan más de 10 MB';
    } else {
      this.respuesta = '';
    }

    this.selectedPages = [...this.selectedPages, ...validos];
    input.value = '';
  }

  removePage(index: number): void {
    this.selectedPages.splice(index, 1);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  subirCapitulo(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.selectedPages.length === 0) {
      this.respuesta = 'Debes agregar al menos una página';
      return;
    }

    const formData = new FormData();

    formData.append('obra_id', String(this.obraId));
    formData.append('current_user_id', String(this.currentUser.id));
    formData.append('titulo_capitulo', this.tituloCapitulo || '');
    formData.append('descripcion_capitulo', this.descripcionCapitulo || '');

    if (this.numeroCapitulo.trim()) {
      formData.append('numero_capitulo', this.numeroCapitulo.trim());
    }

    this.selectedPages.forEach(file => {
      formData.append('paginas[]', file);
    });

    this.cargando = true;
    this.respuesta = '';

    this.http.post<UploadChapterResponse>(this.apiUrl, formData).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.respuesta = res.error || 'No se pudo subir el capítulo';
          return;
        }

        this.respuesta = res.mensaje || 'Capítulo subido correctamente';

        this.router.navigate([
          '/obra',
          this.obraId,
          'capitulo',
          res.numero_capitulo || 1
        ]);
      },
      error: (err) => {
        this.cargando = false;
        this.respuesta = err.error?.error || 'Error al subir capítulo';
        console.error(err);
      }
    });
  }

  private esImagenValida(file: File): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    return tiposPermitidos.includes(file.type) && file.size <= this.maxFileSize;
  }
}