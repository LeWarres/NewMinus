import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

interface AdminPagina {
  id: number;
  numeroPagina: number;
  imagen: string;
  creadoEn: string;
}

interface AdminCapitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
  paginas: AdminPagina[];
}

interface AdminObra {
  id: number;
  usuarioId: number;
  titulo: string;
  descripcion?: string;
  genero?: string;
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
  capitulos: AdminCapitulo[];
}

interface ObraAdminResponse {
  success: boolean;
  error?: string;
  obra?: AdminObra;
}

interface GenericResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
}

interface PortadaResponse extends GenericResponse {
  portada?: string;
}

interface PaginasResponse extends GenericResponse {
  paginas?: AdminPagina[];
  insertadas?: number;
  insertIds?: number[];
  capituloId?: number;
}

@Component({
  selector: 'app-obra-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './obra-admin.component.html',
  styleUrl: './obra-admin.component.css'
})
export class ObraAdminComponent implements OnInit {
  adminUrl = 'https://minuscreators.com/api/obra_admin.php';
  actualizarObraUrl = 'https://minuscreators.com/api/actualizar_obra.php';
  actualizarCapituloUrl = 'https://minuscreators.com/api/actualizar_capitulo.php';
  actualizarPortadaUrl = 'https://minuscreators.com/api/actualizar_portada.php';
  agregarPaginasUrl = 'https://minuscreators.com/api/agregar_paginas_capitulo.php';
  eliminarPaginaUrl = 'https://minuscreators.com/api/eliminar_pagina_capitulo.php';

  siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;
  obra: AdminObra | null = null;

  cargando = false;
  guardandoObra = false;
  guardandoPortada = false;

  error = '';
  mensajeObra = '';

  capituloMensajes: Record<number, string> = {};
  guardandoCapitulo: Record<number, boolean> = {};

  coverFile: File | null = null;
  coverPreview = '';

  selectedChapterFiles: Record<number, File[]> = {};
  pageUploadMessages: Record<number, string> = {};
  subiendoPaginas: Record<number, boolean> = {};

  generos = [
    { label: 'Acción', value: 'accion' },
    { label: 'Drama', value: 'drama' },
    { label: 'Comedia', value: 'comedia' },
    { label: 'Romance', value: 'romance' },
    { label: 'Fantasía', value: 'fantasia' },
    { label: 'Terror', value: 'terror' },
    { label: 'Aventura', value: 'aventura' },
    { label: 'Ciencia ficción', value: 'ciencia-ficcion' }
  ];

  idiomas = [
    { label: 'ES', value: 'ES' },
    { label: 'EN', value: 'EN' },
    { label: 'FR', value: 'FR' }
  ];

  tiposEntrega = [
    { label: 'Serie', value: 'serie' },
    { label: 'One Shot', value: 'one-shot' }
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const obraId = Number(this.route.snapshot.paramMap.get('id'));

    if (!obraId) {
      this.router.navigate(['/']);
      return;
    }

    this.cargarObraAdmin(obraId);
  }

  get totalCapitulos(): number {
    return this.obra?.capitulos.length || 0;
  }

  cargarObraAdmin(obraId: number): void {
    this.cargando = true;
    this.error = '';
    this.mensajeObra = '';

    /*
      Ya NO mandamos current_user_id.
      PHP identifica al usuario con la cookie HttpOnly.
    */
    const url = `${this.adminUrl}?obra_id=${obraId}`;

    this.http.get<ObraAdminResponse>(url, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.obra) {
          this.error = res.error || this.translationService.getTranslation('No se pudo cargar la obra');
          return;
        }

        this.obra = res.obra;
      },
      error: (err) => {
        this.cargando = false;

        if (err.status === 401) {
          this.authService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (err.status === 403) {
          this.error = err.error?.error || this.translationService.getTranslation('No tienes permiso para realizar esta acción');
          return;
        }

        this.error = err.error?.error || this.translationService.getTranslation('Error al cargar la obra');
        console.error(err);
      }
    });
  }

  guardarObra(): void {
    if (!this.obra) {
      return;
    }

    if (!this.obra.titulo.trim()) {
      this.mensajeObra = this.translationService.getTranslation('El título es obligatorio');
      return;
    }

    this.guardandoObra = true;
    this.mensajeObra = '';

    const payload = {
      obra_id: this.obra.id,
      titulo: this.obra.titulo.trim(),
      descripcion: this.obra.descripcion || '',
      genero: this.obra.genero || '',
      idioma: this.obra.idioma || 'ES',
      tipoEntrega: this.obra.tipoEntrega || 'serie',
      serieConcluida: this.obra.serieConcluida
    };

    this.ensureCsrfAndRun(() => {
      this.http.post<GenericResponse>(
        this.actualizarObraUrl,
        payload,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardandoObra = false;

          if (!res.success) {
            this.mensajeObra = res.error || this.translationService.getTranslation('No se pudo actualizar la obra');
            return;
          }

          this.mensajeObra = res.mensaje || this.translationService.getTranslation('Obra actualizada correctamente');
        },
        error: (err) => {
          this.guardandoObra = false;
          this.mensajeObra = this.getFriendlyError(err, this.translationService.getTranslation('Error al actualizar la obra'));
          console.error(err);
        }
      });
    }, () => {
      this.guardandoObra = false;
      this.mensajeObra = this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  guardarCapitulo(capitulo: AdminCapitulo): void {
    this.guardandoCapitulo[capitulo.id] = true;
    this.capituloMensajes[capitulo.id] = '';

    const payload = {
      capitulo_id: capitulo.id,
      titulo: capitulo.titulo || '',
      descripcion: capitulo.descripcion || ''
    };

    this.ensureCsrfAndRun(() => {
      this.http.post<GenericResponse>(
        this.actualizarCapituloUrl,
        payload,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardandoCapitulo[capitulo.id] = false;

          if (!res.success) {
            this.capituloMensajes[capitulo.id] =
              res.error || this.translationService.getTranslation('No se pudo actualizar el capítulo');
            return;
          }

          this.capituloMensajes[capitulo.id] =
            res.mensaje || this.translationService.getTranslation('Capítulo actualizado correctamente');
        },
        error: (err) => {
          this.guardandoCapitulo[capitulo.id] = false;
          this.capituloMensajes[capitulo.id] =
            this.getFriendlyError(err, this.translationService.getTranslation('Error al actualizar el capítulo'));
          console.error(err);
        }
      });
    }, () => {
      this.guardandoCapitulo[capitulo.id] = false;
      this.capituloMensajes[capitulo.id] = this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  subirCapitulo(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id, 'subir-capitulo']);
  }

  verPreview(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id]);
  }

  leerCapitulo(capitulo: AdminCapitulo): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate([
      '/obra',
      this.obra.id,
      'capitulo',
      capitulo.numeroCapitulo
    ]);
  }

  volverPerfil(): void {
    const user = this.authService.getCurrentUser();

    if (!user) {
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/perfil', user.id]);
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!this.esImagenValida(file)) {
      this.mensajeObra = this.translationService.getTranslation('La portada debe ser una imagen válida');
      input.value = '';
      return;
    }

    if (this.coverPreview) {
      URL.revokeObjectURL(this.coverPreview);
    }

    this.coverFile = file;
    this.coverPreview = URL.createObjectURL(file);
    this.mensajeObra = '';
    input.value = '';
  }

  guardarPortada(): void {
    if (!this.obra || !this.coverFile) {
      return;
    }

    const formData = new FormData();

    formData.append('obra_id', String(this.obra.id));
    formData.append('portada', this.coverFile);

    this.guardandoPortada = true;
    this.mensajeObra = '';

    this.ensureCsrfAndRun(() => {
      this.http.post<PortadaResponse>(
        this.actualizarPortadaUrl,
        formData,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardandoPortada = false;

          if (!res.success) {
            this.mensajeObra = res.error || this.translationService.getTranslation('No se pudo actualizar la portada');
            return;
          }

          if (res.portada && this.obra) {
            this.obra.portada = res.portada;
          }

          if (this.coverPreview) {
            URL.revokeObjectURL(this.coverPreview);
          }

          this.coverFile = null;
          this.coverPreview = '';
          this.mensajeObra = res.mensaje || this.translationService.getTranslation('Portada actualizada correctamente');
        },
        error: (err) => {
          this.guardandoPortada = false;
          this.mensajeObra = this.getFriendlyError(err, this.translationService.getTranslation('Error al actualizar portada'));
          console.error(err);
        }
      });
    }, () => {
      this.guardandoPortada = false;
      this.mensajeObra = this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  onChapterPagesSelected(event: Event, capitulo: AdminCapitulo): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    const validos = files.filter((file) => this.esImagenValida(file));

    if (validos.length !== files.length) {
      this.pageUploadMessages[capitulo.id] = this.translationService.getTranslation('Algunas páginas no se agregaron');
    } else {
      this.pageUploadMessages[capitulo.id] = '';
    }

    this.selectedChapterFiles[capitulo.id] = [
      ...(this.selectedChapterFiles[capitulo.id] || []),
      ...validos
    ];

    input.value = '';
  }

  removeSelectedChapterFile(capituloId: number, index: number): void {
    const files = this.selectedChapterFiles[capituloId] || [];
    files.splice(index, 1);
    this.selectedChapterFiles[capituloId] = [...files];
  }

  subirPaginasCapitulo(capitulo: AdminCapitulo): void {
  const files = this.selectedChapterFiles[capitulo.id] || [];

  if (files.length === 0) {
    this.pageUploadMessages[capitulo.id] =
      this.translationService.getTranslation('Selecciona al menos una imagen');
    return;
  }

  const formData = new FormData();

  formData.append('capitulo_id', String(capitulo.id));

  files.forEach((file) => {
    formData.append('paginas[]', file);
  });

  this.subiendoPaginas[capitulo.id] = true;
  this.pageUploadMessages[capitulo.id] = '';

  this.ensureCsrfAndRun(() => {
    this.http.post<PaginasResponse>(
      this.agregarPaginasUrl,
      formData,
      {
        withCredentials: true,
        headers: this.authService.csrfHeaders()
      }
    ).subscribe({
      next: (res) => {
        this.subiendoPaginas[capitulo.id] = false;

        console.log('Respuesta agregar páginas:', res);

        if (!res.success) {
          this.pageUploadMessages[capitulo.id] =
            res.error || this.translationService.getTranslation('No se pudieron agregar las páginas');
          return;
        }

        if (!res.insertadas || res.insertadas <= 0) {
          this.pageUploadMessages[capitulo.id] =
            'El servidor respondió éxito, pero no confirmó imágenes insertadas. Revisa agregar_paginas_capitulo.php.';
          return;
        }

        capitulo.paginas = res.paginas || capitulo.paginas;
        this.selectedChapterFiles[capitulo.id] = [];

        this.pageUploadMessages[capitulo.id] =
          `${res.insertadas} ${this.translationService.getTranslation('Páginas agregadas correctamente')}`;

        if (this.obra) {
          this.cargarObraAdmin(this.obra.id);
        }
      },
      error: (err) => {
        this.subiendoPaginas[capitulo.id] = false;

        console.error('Error agregar páginas:', err);

        this.pageUploadMessages[capitulo.id] =
          this.getFriendlyError(
            err,
            this.translationService.getTranslation('Error al agregar páginas')
          );
      }
    });
  }, () => {
    this.subiendoPaginas[capitulo.id] = false;
    this.pageUploadMessages[capitulo.id] =
      this.translationService.getTranslation('No se pudo preparar la acción');
  });
}

  eliminarPagina(capitulo: AdminCapitulo, pagina: AdminPagina): void {
    const confirmar = confirm(
      `${this.translationService.getTranslation('Eliminar')} ${this.translationService.getTranslation('Página')} ${pagina.numeroPagina}?`
    );

    if (!confirmar) {
      return;
    }

    this.pageUploadMessages[capitulo.id] = '';

    const payload = {
      pagina_id: pagina.id
    };

    this.ensureCsrfAndRun(() => {
      this.http.post<PaginasResponse>(
        this.eliminarPaginaUrl,
        payload,
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          if (!res.success) {
            this.pageUploadMessages[capitulo.id] =
              res.error || this.translationService.getTranslation('No se pudo eliminar la página');
            return;
          }

          capitulo.paginas = res.paginas || capitulo.paginas.filter((item) => item.id !== pagina.id);
          this.pageUploadMessages[capitulo.id] =
            res.mensaje || this.translationService.getTranslation('Página eliminada correctamente');
        },
        error: (err) => {
          this.pageUploadMessages[capitulo.id] =
            this.getFriendlyError(err, this.translationService.getTranslation('Error al eliminar página'));
          console.error(err);
        }
      });
    }, () => {
      this.pageUploadMessages[capitulo.id] = this.translationService.getTranslation('No se pudo preparar la acción');
    });
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

  private getFriendlyError(err: any, fallback: string): string {
    if (err.status === 401) {
      this.authService.clearSession();
      this.router.navigate(['/login']);
      return this.translationService.getTranslation('No autenticado');
    }

    if (err.status === 403) {
      return err.error?.error || this.translationService.getTranslation('No tienes permiso para realizar esta acción');
    }

    return err.error?.error || fallback;
  }

  private esImagenValida(file: File): boolean {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    const maxFileSize = 10 * 1024 * 1024;

    return tiposPermitidos.includes(file.type) && file.size <= maxFileSize;
  }
}