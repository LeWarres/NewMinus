import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  role?: string;
  imgPerfil?: string;
}

interface AdminCapitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
  paginas: AdminPagina[];
}

interface AdminPagina {
  id: number;
  numeroPagina: number;
  imagen: string;
  creadoEn: string;
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
  siteUrl = 'https://minuscreators.com';
  actualizarPortadaUrl = 'https://minuscreators.com/api/actualizar_portada.php';
agregarPaginasUrl = 'https://minuscreators.com/api/agregar_paginas_capitulo.php';
eliminarPaginaUrl = 'https://minuscreators.com/api/eliminar_pagina_capitulo.php';

  currentUser: CurrentUser | null = null;
  obra: AdminObra | null = null;

  cargando = false;
  guardandoObra = false;

  error = '';
  mensajeObra = '';

  capituloMensajes: Record<number, string> = {};
  guardandoCapitulo: Record<number, boolean> = {};

coverFile: File | null = null;
coverPreview = '';

selectedChapterFiles: Record<number, File[]> = {};
pageUploadMessages: Record<number, string> = {};
guardandoPortada = false;
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
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.getCurrentUser();

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
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensajeObra = '';

    const url = `${this.adminUrl}?obra_id=${obraId}&current_user_id=${this.currentUser.id}`;

    this.http.get<ObraAdminResponse>(url).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.obra) {
          this.error = res.error || 'No se pudo cargar la obra';
          return;
        }

        this.obra = res.obra;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Error al cargar la obra';
        console.error(err);
      }
    });
  }

  guardarObra(): void {
    if (!this.obra || !this.currentUser) {
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
      current_user_id: this.currentUser.id,
      titulo: this.obra.titulo,
      descripcion: this.obra.descripcion || '',
      genero: this.obra.genero || '',
      idioma: this.obra.idioma || 'ES',
      tipoEntrega: this.obra.tipoEntrega || 'serie',
      serieConcluida: this.obra.serieConcluida
    };

    this.http.post<GenericResponse>(this.actualizarObraUrl, payload).subscribe({
      next: (res) => {
        this.guardandoObra = false;

        if (!res.success) {
          this.mensajeObra = res.error || 'No se pudo actualizar la obra';
          return;
        }

        this.mensajeObra = res.mensaje || this.translationService.getTranslation('Obra actualizada correctamente');
      },
      error: (err) => {
        this.guardandoObra = false;
        this.mensajeObra = err.error?.error || 'Error al actualizar la obra';
        console.error(err);
      }
    });
  }

  guardarCapitulo(capitulo: AdminCapitulo): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.guardandoCapitulo[capitulo.id] = true;
    this.capituloMensajes[capitulo.id] = '';

    const payload = {
      capitulo_id: capitulo.id,
      current_user_id: this.currentUser.id,
      titulo: capitulo.titulo || '',
      descripcion: capitulo.descripcion || ''
    };

    this.http.post<GenericResponse>(this.actualizarCapituloUrl, payload).subscribe({
      next: (res) => {
        this.guardandoCapitulo[capitulo.id] = false;

        if (!res.success) {
          this.capituloMensajes[capitulo.id] = res.error || 'No se pudo actualizar el capítulo';
          return;
        }

        this.capituloMensajes[capitulo.id] =
          res.mensaje || this.translationService.getTranslation('Capítulo actualizado correctamente');
      },
      error: (err) => {
        this.guardandoCapitulo[capitulo.id] = false;
        this.capituloMensajes[capitulo.id] = err.error?.error || 'Error al actualizar el capítulo';
        console.error(err);
      }
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
    if (!this.currentUser) {
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/perfil', this.currentUser.id]);
  }

  onCoverSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    return;
  }

  const file = input.files[0];

  if (!this.esImagenValida(file)) {
    this.mensajeObra = 'La portada debe ser JPG, PNG o WEBP y pesar máximo 10 MB';
    input.value = '';
    return;
  }

  this.coverFile = file;
  this.coverPreview = URL.createObjectURL(file);
  this.mensajeObra = '';
  input.value = '';
}

guardarPortada(): void {
  if (!this.obra || !this.currentUser || !this.coverFile) {
    return;
  }

  const formData = new FormData();

  formData.append('obra_id', String(this.obra.id));
  formData.append('current_user_id', String(this.currentUser.id));
  formData.append('portada', this.coverFile);

  this.guardandoPortada = true;
  this.mensajeObra = '';

  this.http.post<GenericResponse & { portada?: string }>(this.actualizarPortadaUrl, formData).subscribe({
    next: (res) => {
      this.guardandoPortada = false;

      if (!res.success) {
        this.mensajeObra = res.error || 'No se pudo actualizar la portada';
        return;
      }

      if (res.portada && this.obra) {
        this.obra.portada = res.portada;
      }

      this.coverFile = null;
      this.coverPreview = '';
      this.mensajeObra = res.mensaje || 'Portada actualizada correctamente';
    },
    error: (err) => {
      this.guardandoPortada = false;
      this.mensajeObra = err.error?.error || 'Error al actualizar portada';
      console.error(err);
    }
  });
}

onChapterPagesSelected(event: Event, capitulo: AdminCapitulo): void {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    return;
  }

  const files = Array.from(input.files);
  const validos = files.filter(file => this.esImagenValida(file));

  if (validos.length !== files.length) {
    this.pageUploadMessages[capitulo.id] = 'Algunas imágenes no se agregaron porque no son válidas o pesan más de 10 MB';
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
  if (!this.currentUser) {
    this.router.navigate(['/login']);
    return;
  }

  const files = this.selectedChapterFiles[capitulo.id] || [];

  if (files.length === 0) {
    this.pageUploadMessages[capitulo.id] = 'Selecciona al menos una imagen';
    return;
  }

  const formData = new FormData();

  formData.append('capitulo_id', String(capitulo.id));
  formData.append('current_user_id', String(this.currentUser.id));

  files.forEach(file => {
    formData.append('paginas[]', file);
  });

  this.subiendoPaginas[capitulo.id] = true;
  this.pageUploadMessages[capitulo.id] = '';

  this.http.post<GenericResponse & { paginas?: AdminPagina[] }>(this.agregarPaginasUrl, formData).subscribe({
    next: (res) => {
      this.subiendoPaginas[capitulo.id] = false;

      if (!res.success) {
        this.pageUploadMessages[capitulo.id] = res.error || 'No se pudieron agregar las páginas';
        return;
      }

      capitulo.paginas = res.paginas || capitulo.paginas;
      this.selectedChapterFiles[capitulo.id] = [];
      this.pageUploadMessages[capitulo.id] = res.mensaje || 'Páginas agregadas correctamente';
    },
    error: (err) => {
      this.subiendoPaginas[capitulo.id] = false;
      this.pageUploadMessages[capitulo.id] = err.error?.error || 'Error al agregar páginas';
      console.error(err);
    }
  });
}

eliminarPagina(capitulo: AdminCapitulo, pagina: AdminPagina): void {
  if (!this.currentUser) {
    this.router.navigate(['/login']);
    return;
  }

  const confirmar = confirm(`¿Eliminar página ${pagina.numeroPagina}?`);

  if (!confirmar) {
    return;
  }

  this.pageUploadMessages[capitulo.id] = '';

  this.http.post<GenericResponse & { paginas?: AdminPagina[] }>(this.eliminarPaginaUrl, {
    pagina_id: pagina.id,
    current_user_id: this.currentUser.id
  }).subscribe({
    next: (res) => {
      if (!res.success) {
        this.pageUploadMessages[capitulo.id] = res.error || 'No se pudo eliminar la página';
        return;
      }

      capitulo.paginas = res.paginas || capitulo.paginas.filter(item => item.id !== pagina.id);
      this.pageUploadMessages[capitulo.id] = res.mensaje || 'Página eliminada correctamente';
    },
    error: (err) => {
      this.pageUploadMessages[capitulo.id] = err.error?.error || 'Error al eliminar página';
      console.error(err);
    }
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

private esImagenValida(file: File): boolean {
  const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  const maxFileSize = 10 * 1024 * 1024;

  return tiposPermitidos.includes(file.type) && file.size <= maxFileSize;
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

  private getCurrentUser(): CurrentUser | null {
    const userRaw = localStorage.getItem('user');

    if (!userRaw) {
      return null;
    }

    try {
      return JSON.parse(userRaw) as CurrentUser;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }
}