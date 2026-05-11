import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  role?: string;
  imgPerfil?: string;
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

interface CapituloItem {
  tipo: string;

  obraId: number;
  usuarioId: number | null;

  tituloObra: string;
  descripcionObra?: string;

  genero?: string;
  idioma?: string;
  portada?: string;
  numVisitas: number;

  capituloId: number;
  numeroCapitulo: number;
  tituloCapitulo?: string;
  descripcionCapitulo?: string;
  fechaCreacion: string;

  autor: string;
  autorAvatar?: string;
}

interface ObrasResponse {
  success: boolean;
  error?: string;
  obras: Obra[];
}

interface CapitulosResponse {
  success: boolean;
  error?: string;
  items: CapituloItem[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  siteUrl = 'https://minuscreators.com';

  obrasUrl = 'https://minuscreators.com/api/listar_obras.php';
  capitulosUrl = 'https://minuscreators.com/api/capitulos_recientes.php';
  followingUrl = 'https://minuscreators.com/api/following.php';

  currentUser: CurrentUser | null = null;

  obrasNuevas: Obra[] = [];
  capitulosNuevos: CapituloItem[] = [];
  followingItems: CapituloItem[] = [];

  isMobile = false;

  cargandoObras = false;
  cargandoCapitulos = false;
  cargandoFollowing = false;

  errorObras = '';
  errorCapitulos = '';
  errorFollowing = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.getCurrentUser();

    this.checkScreenSize();
    this.cargarObrasNuevas();
    this.cargarCapitulosNuevos();

    if (this.currentUser) {
      this.cargarFollowing();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  cargarObrasNuevas(): void {
    this.cargandoObras = true;
    this.errorObras = '';

    this.http
      .get<ObrasResponse>(`${this.obrasUrl}?orden=recientes&limite=12`)
      .subscribe({
        next: (res) => {
          this.cargandoObras = false;

          if (!res.success) {
            this.errorObras = res.error || 'No se pudieron cargar las obras';
            return;
          }

          this.obrasNuevas = res.obras || [];
        },
        error: (err) => {
          this.cargandoObras = false;
          this.errorObras = err.error?.error || 'Error al cargar obras';
          console.error(err);
        }
      });
  }

  cargarCapitulosNuevos(): void {
    this.cargandoCapitulos = true;
    this.errorCapitulos = '';

    this.http
      .get<CapitulosResponse>(`${this.capitulosUrl}?limite=12`)
      .subscribe({
        next: (res) => {
          this.cargandoCapitulos = false;

          if (!res.success) {
            this.errorCapitulos = res.error || 'No se pudieron cargar los capítulos';
            return;
          }

          this.capitulosNuevos = res.items || [];
        },
        error: (err) => {
          this.cargandoCapitulos = false;
          this.errorCapitulos = err.error?.error || 'Error al cargar capítulos';
          console.error(err);
        }
      });
  }

  cargarFollowing(): void {
    if (!this.currentUser) {
      return;
    }

    this.cargandoFollowing = true;
    this.errorFollowing = '';

    this.http
      .get<CapitulosResponse>(`${this.followingUrl}?user_id=${this.currentUser.id}&limite=12`)
      .subscribe({
        next: (res) => {
          this.cargandoFollowing = false;

          if (!res.success) {
            this.errorFollowing = res.error || 'No se pudo cargar lo que sigues';
            return;
          }

          this.followingItems = res.items || [];
        },
        error: (err) => {
          this.cargandoFollowing = false;
          this.errorFollowing = err.error?.error || 'Error al cargar lo que sigues';
          console.error(err);
        }
      });
  }

  abrirObra(obra: Obra): void {
    this.router.navigate(['/obra', obra.id]);
  }
  

 abrirCapitulo(item: CapituloItem): void {
  this.router.navigate([
    '/obra',
    item.obraId,
    'capitulo',
    item.numeroCapitulo
  ]);
}

  abrirPerfilObra(event: Event, obra: Obra): void {
    event.stopPropagation();

    if (!obra.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', obra.usuarioId]);
  }

  abrirPerfilCapitulo(event: Event, item: CapituloItem): void {
    event.stopPropagation();

    if (!item.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', item.usuarioId]);
  }

  discoverRandomStory(): void {
  type RandomItem =
    | { tipo: 'obra'; id: number }
    | { tipo: 'capitulo'; obraId: number; numeroCapitulo: number };

  const disponibles: RandomItem[] = [
    ...this.obrasNuevas.map((obra): RandomItem => ({
      tipo: 'obra',
      id: obra.id
    })),

    ...this.capitulosNuevos.map((item): RandomItem => ({
      tipo: 'capitulo',
      obraId: item.obraId,
      numeroCapitulo: item.numeroCapitulo
    }))
  ];

  if (disponibles.length === 0) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * disponibles.length);
  const elegido = disponibles[randomIndex];

  if (elegido.tipo === 'obra') {
    this.router.navigate(['/obra', elegido.id]);
    return;
  }

  this.router.navigate([
    '/obra',
    elegido.obraId,
    'capitulo',
    elegido.numeroCapitulo
  ]);
}

  nextCarousel(id: string): void {
    this.scrollCarousel(id, 1);
  }

  prevCarousel(id: string): void {
    this.scrollCarousel(id, -1);
  }

  scrollCarousel(id: string, direction: 1 | -1): void {
    const carousel = document.getElementById(id);

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * 320,
      behavior: 'smooth'
    });
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