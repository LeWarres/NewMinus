import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

interface Capitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
}

interface ObraPreview {
  id: number;
  usuarioId: number | null;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;

  autor: string;
  autorAvatar?: string;
  autorRole?: string;
  autorNacionalidad?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  totalSuscriptores: number;
  estaSuscrito: boolean;

  capitulos: Capitulo[];
}

interface ObraPreviewResponse {
  success: boolean;
  error?: string;
  obra?: ObraPreview;
}

interface SuscripcionResponse {
  success: boolean;
  suscrito?: boolean;
  mensaje?: string;
  error?: string;
}

@Component({
  selector: 'app-manga-preview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './manga-preview.component.html',
  styleUrl: './manga-preview.component.css'
})
export class MangaPreviewComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/obra_preview.php';
  suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';
  registrarVistaUrl = 'https://minuscreators.com/api/registrar_vista.php';

  siteUrl = 'https://minuscreators.com';

  obra: ObraPreview | null = null;
  currentUser: CurrentUser | null = null;

  isMobileView = false;
  isCurrentUser = false;

  cargando = false;
  error = '';
  mensaje = '';

  showDetails = true;

  categoriaLabels: Record<string, string> = {
    'accion': 'Acción',
    'aventura': 'Aventura',
    'comedia': 'Comedia',
    'drama': 'Drama',
    'fantasia': 'Fantasía',
    'romance': 'Romance',
    'terror': 'Terror',
    'ciencia-ficcion': 'Ciencia ficción',
    'misterio': 'Misterio',
    'suspenso': 'Suspenso',
    'sobrenatural': 'Sobrenatural',
    'psicologico': 'Psicológico',
    'slice-of-life': 'Slice of life',
    'vida-escolar': 'Vida escolar',
    'deportes': 'Deportes',
    'artes-marciales': 'Artes marciales',
    'mecha': 'Mecha',
    'isekai': 'Isekai',
    'historico': 'Histórico',
    'musica': 'Música',
    'cocina': 'Cocina',
    'magia': 'Magia',
    'superheroes': 'Superhéroes',
    'crimen': 'Crimen',
    'post-apocaliptico': 'Post-apocalíptico',
    'cyberpunk': 'Cyberpunk',
    'steampunk': 'Steampunk',
    'guerra': 'Guerra',
    'parodia': 'Parodia',
    'tragedia': 'Tragedia',
    'shonen': 'Shonen',
    'shojo': 'Shojo',
    'seinen': 'Seinen',
    'josei': 'Josei',
    'kodomo': 'Kodomo',
    'boys-love': 'Boys Love',
    'girls-love': 'Girls Love'
  };

  idiomaLabels: Record<string, string> = {
    GLOBAL: 'Global',
    ES: 'Español',
    EN: 'English',
    JA: 'Japanese',
    KO: 'Korean',
    ZH: 'Chinese',
    FR: 'French',
    DE: 'German',
    PT: 'Portuguese',
    IT: 'Italian',
    RU: 'Russian',
    AR: 'Arabic',
    HI: 'Hindi',
    ID: 'Indonesian',
    VI: 'Vietnamese',
    TH: 'Thai',
    TR: 'Turkish',
    PL: 'Polish',
    NL: 'Dutch'
  };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.checkScreenSize();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.error = this.translationService.getTranslation('No se encontró la obra');
        return;
      }

      this.cargarPreview(id);
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth <= 1200;
  }

  cargarPreview(id: string): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.http
      .get<ObraPreviewResponse>(
        `${this.apiUrl}?id=${id}`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success || !res.obra) {
            this.error = res.error || this.translationService.getTranslation('No se pudo cargar la obra');
            return;
          }

          this.obra = res.obra;
          this.currentUser = this.authService.getCurrentUser();
          this.isCurrentUser = this.currentUser?.id === this.obra.usuarioId;

          this.registrarVista(this.obra.id);
        },
        error: (err) => {
          this.cargando = false;
          this.error = err.error?.error || this.translationService.getTranslation('Error al cargar la obra');
          console.error(err);
        }
      });
  }

  registrarVista(obraId: number): void {
    this.http.post(
      this.registrarVistaUrl,
      {
        obra_id: obraId
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: () => {},
      error: (err) => {
        console.error('No se pudo registrar vista', err);
      }
    });
  }

  abrirCapitulo(capitulo: Capitulo): void {
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

  leerPrimerCapitulo(): void {
    if (!this.obra || this.obra.capitulos.length === 0) {
      return;
    }

    this.abrirCapitulo(this.obra.capitulos[0]);
  }

  leerUltimoCapitulo(): void {
    if (!this.obra || this.obra.capitulos.length === 0) {
      return;
    }

    this.abrirCapitulo(this.obra.capitulos[this.obra.capitulos.length - 1]);
  }

  subirCapitulo(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id, 'subir-capitulo']);
  }

  abrirPerfilAutor(): void {
    if (!this.obra?.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', this.obra.usuarioId]);
  }

  toggleSubscription(): void {
    if (!this.obra || !this.obra.usuarioId) {
      return;
    }

    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.currentUser.id === this.obra.usuarioId) {
      return;
    }

    const seguidoId = this.obra.usuarioId;

    this.mensaje = '';

    this.ensureCsrfAndRun(() => {
      this.http
        .post<SuscripcionResponse>(
          this.suscripcionUrl,
          {
            seguido_id: seguidoId
          },
          {
            withCredentials: true,
            headers: this.authService.csrfHeaders()
          }
        )
        .subscribe({
          next: (res) => {
            if (!res.success) {
              this.mensaje =
                res.error ||
                this.translationService.getTranslation('No se pudo actualizar la suscripción');
              return;
            }

            if (!this.obra) {
              return;
            }

            this.obra.estaSuscrito = !!res.suscrito;
            this.mensaje = res.mensaje || '';

            const totalActual = this.obra.totalSuscriptores || 0;

            if (res.suscrito) {
              this.obra.totalSuscriptores = totalActual + 1;
            } else {
              this.obra.totalSuscriptores = Math.max(totalActual - 1, 0);
            }
          },
          error: (err) => {
            if (err.status === 401) {
              this.authService.clearSession();
              this.router.navigate(['/login']);
              return;
            }

            this.mensaje =
              err.error?.error ||
              this.translationService.getTranslation('Error al actualizar suscripción');

            console.error(err);
          }
        });
    }, () => {
      this.mensaje = this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
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

  get coverUrl(): string {
    return this.imageUrl(this.obra?.portada, '/obras/paleta/portada.png');
  }

  getCategoriasObra(): string[] {
    if (!this.obra) {
      return [];
    }

    if (this.obra.categorias && this.obra.categorias.length > 0) {
      return this.obra.categorias;
    }

    if (!this.obra.genero) {
      return [];
    }

    return this.obra.genero
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  getCategoriaLabel(value: string): string {
    return this.categoriaLabels[value] || value;
  }

  getCategoriaLabels(max: number = 3): string[] {
    return this.getCategoriasObra()
      .slice(0, max)
      .map(categoria => this.getCategoriaLabel(categoria));
  }

  getIdiomaLabel(value?: string): string {
    if (!value) {
      return 'Global';
    }

    return this.idiomaLabels[value.toUpperCase()] || value;
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