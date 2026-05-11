import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface Categoria {
  label: string;
  value: string;
}

interface UsuarioResultado {
  id: number;
  username: string;
  role?: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  totalSuscriptores: number;
  totalObras: number;
}

interface Obra {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
  autor: string;
}

interface BuscarResponse {
  success: boolean;
  error?: string;
  usuarios: UsuarioResultado[];
  obras: Obra[];
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/buscar.php';
  siteUrl = 'https://minuscreators.com';

  idiomaUI: 'es' | 'en' = 'es';

  categoriaSeleccionada = 'todos';
  idiomaObraSeleccionado = 'todos';
  ordenSeleccionado = 'recientes';
  busqueda = '';

  cargando = false;
  error = '';

  usuarios: UsuarioResultado[] = [];
  obras: Obra[] = [];

  categorias: Record<'es' | 'en', Categoria[]> = {
    es: [
      { label: 'Todos', value: 'todos' },
      { label: 'Acción', value: 'accion' },
      { label: 'Drama', value: 'drama' },
      { label: 'Comedia', value: 'comedia' },
      { label: 'Romance', value: 'romance' },
      { label: 'Fantasía', value: 'fantasia' },
      { label: 'Terror', value: 'terror' },
      { label: 'Aventura', value: 'aventura' },
      { label: 'Ciencia ficción', value: 'ciencia-ficcion' }
    ],
    en: [
      { label: 'All', value: 'todos' },
      { label: 'Action', value: 'accion' },
      { label: 'Drama', value: 'drama' },
      { label: 'Comedy', value: 'comedia' },
      { label: 'Romance', value: 'romance' },
      { label: 'Fantasy', value: 'fantasia' },
      { label: 'Horror', value: 'terror' },
      { label: 'Adventure', value: 'aventura' },
      { label: 'Sci-Fi', value: 'ciencia-ficcion' }
    ]
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const currentLang = this.translationService.getCurrentLanguage();

    if (currentLang === 'es' || currentLang === 'en') {
      this.idiomaUI = currentLang;
    }

    this.route.queryParamMap.subscribe(params => {
      const buscar = params.get('buscar');

      if (buscar !== null) {
        this.busqueda = buscar;
      }

      this.cargarObras();
    });
  }

  seleccionarCategoria(categoria: Categoria): void {
    this.categoriaSeleccionada = categoria.value;
    this.cargarObras();
  }

  cambiarIdiomaUI(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idioma = select.value as 'es' | 'en';

    this.idiomaUI = idioma;
    this.translationService.setLanguage(idioma);
  }

  buscarDesdeInput(): void {
    this.router.navigate(['/categorias'], {
      queryParams: {
        buscar: this.busqueda.trim() || null
      },
      queryParamsHandling: 'merge'
    });
  }

  cargarObras(): void {
    this.cargando = true;
    this.error = '';

    const params = new URLSearchParams();

    params.set('orden', this.ordenSeleccionado);
    params.set('limite', '50');

    if (this.busqueda.trim()) {
      params.set('buscar', this.busqueda.trim());
    }

    if (this.categoriaSeleccionada !== 'todos') {
      params.set('genero', this.categoriaSeleccionada);
    }

    if (this.idiomaObraSeleccionado !== 'todos') {
      params.set('idioma', this.idiomaObraSeleccionado);
    }

    this.http.get<BuscarResponse>(`${this.apiUrl}?${params.toString()}`).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.error = res.error || 'No se pudieron cargar los resultados';
          return;
        }

        this.usuarios = res.usuarios || [];
        this.obras = res.obras || [];
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Error al cargar los resultados';
        console.error(err);
      }
    });
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = 'todos';
    this.idiomaObraSeleccionado = 'todos';
    this.ordenSeleccionado = 'recientes';
    this.busqueda = '';

    this.router.navigate(['/categorias']);
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

  abrirObra(obra: Obra): void {
    this.router.navigate(['/obra', obra.id]);
  }

  abrirPerfilUsuario(usuario: UsuarioResultado): void {
    this.router.navigate(['/perfil', usuario.id]);
  }

  abrirPerfil(event: Event, obra: Obra): void {
    event.stopPropagation();

    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  getCategoriaLabel(value?: string): string {
    if (!value) {
      return '';
    }

    const categoria = this.categorias[this.idiomaUI].find(item => item.value === value);
    return categoria?.label || value;
  }

  getCategoriaActual(): string {
    return this.getCategoriaLabel(this.categoriaSeleccionada);
  }
}