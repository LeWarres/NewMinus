import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { ContentMetadataService } from '../../services/content-metadata.service';

import {
  ObraCardComponent,
  ObraCardItem
} from '../../components/cards/obra-card/obra-card.component';

interface Categoria {
  value: string;
}

interface IdiomaOption {
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

interface Obra extends ObraCardItem {
  tipoEntrega?: string;
  serieConcluida?: boolean;
  fechaCreacion: string;
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
    RouterModule,
    ObraCardComponent
  ],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/buscar.php';

  idiomaUI: 'es' | 'en' = 'es';

  categoriaSeleccionada = 'todos';
  idiomaObraSeleccionado = 'todos';
  ordenSeleccionado = 'recientes';
  busqueda = '';

  cargando = false;
  error = '';

  usuarios: UsuarioResultado[] = [];
  obras: Obra[] = [];

  categorias: Categoria[] = [
    { value: 'todos' },
    { value: 'accion' },
    { value: 'aventura' },
    { value: 'comedia' },
    { value: 'drama' },
    { value: 'fantasia' },
    { value: 'romance' },
    { value: 'terror' },
    { value: 'ciencia-ficcion' },
    { value: 'misterio' },
    { value: 'suspenso' },
    { value: 'sobrenatural' },
    { value: 'psicologico' },
    { value: 'slice-of-life' },
    { value: 'vida-escolar' },
    { value: 'deportes' },
    { value: 'artes-marciales' },
    { value: 'mecha' },
    { value: 'isekai' },
    { value: 'historico' },
    { value: 'musica' },
    { value: 'cocina' },
    { value: 'magia' },
    { value: 'superheroes' },
    { value: 'crimen' },
    { value: 'post-apocaliptico' },
    { value: 'cyberpunk' },
    { value: 'steampunk' },
    { value: 'guerra' },
    { value: 'parodia' },
    { value: 'tragedia' },
    { value: 'shonen' },
    { value: 'shojo' },
    { value: 'seinen' },
    { value: 'josei' },
    { value: 'kodomo' },
    { value: 'boys-love' },
    { value: 'girls-love' }
  ];

  idiomasObra: IdiomaOption[] = [
    { value: 'todos' },
    { value: 'GLOBAL' },
    { value: 'ES' },
    { value: 'EN' },
    { value: 'JA' },
    { value: 'KO' },
    { value: 'ZH' },
    { value: 'FR' },
    { value: 'DE' },
    { value: 'PT' },
    { value: 'IT' },
    { value: 'RU' },
    { value: 'AR' },
    { value: 'HI' },
    { value: 'ID' },
    { value: 'VI' },
    { value: 'TH' },
    { value: 'TR' },
    { value: 'PL' },
    { value: 'NL' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private metadataService: ContentMetadataService,
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
      params.set('idioma', this.idiomaObraSeleccionado.toUpperCase());
    }

    this.http.get<BuscarResponse>(`${this.apiUrl}?${params.toString()}`).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success) {
          this.error =
            res.error ||
            this.translationService.getTranslation('No se pudieron cargar los resultados');
          return;
        }

        this.usuarios = res.usuarios || [];
        this.obras = res.obras || [];
      },
      error: (err) => {
        this.cargando = false;
        this.error =
          err.error?.error ||
          this.translationService.getTranslation('Error al cargar los resultados');
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

  abrirObra(obra: { id: number }): void {
    this.router.navigate(['/obra', obra.id]);
  }

  abrirPerfilUsuario(usuario: UsuarioResultado): void {
    this.router.navigate(['/perfil', usuario.id]);
  }

  abrirPerfilObra(obra: { usuarioId: number | null }): void {
    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    return this.metadataService.imageUrl(path, fallback);
  }

  getCategoriaLabel(value?: string): string {
    if (!value || value === 'todos') {
      return this.translateWithFallback('Todos', 'Todos');
    }

    return this.metadataService.getCategoryLabel(value);
  }

  getCategoriaActual(): string {
    return this.getCategoriaLabel(this.categoriaSeleccionada);
  }

  getIdiomaLabel(value?: string): string {
    if (!value || value.toLowerCase() === 'todos') {
      return this.translateWithFallback('Todos', 'Todos');
    }

    return this.metadataService.getLanguageLabel(value);
  }

  getIdiomaOptionLabel(idioma: IdiomaOption): string {
    return this.getIdiomaLabel(idioma.value);
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translationService.getTranslation(key);
    return translated && translated !== key ? translated : fallback;
  }
}
