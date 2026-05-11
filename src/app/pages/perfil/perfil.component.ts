import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  totalSuscriptores?: number;
}

interface Obra {
  id: number;
  titulo: string;
  descripcion?: string;
  genero?: string;
  idioma?: string;
  tipoEntrega?: string;
  serieConcluida?: boolean;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
}

interface PerfilResponse {
  success: boolean;
  error?: string;
  user?: User;
  obras?: Obra[];
  estaSuscrito?: boolean;
}

interface SuscripcionResponse {
  success: boolean;
  suscrito?: boolean;
  mensaje?: string;
  error?: string;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/perfil.php';
  suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';
  siteUrl = 'https://minuscreators.com';

  user: User | null = null;
  currentUser: User | null = null;

  obras: Obra[] = [];

  isCurrentUser = false;
  estaSuscrito = false;

  error = '';
  mensaje = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.getCurrentUser();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.error = 'No se encontró el usuario';
        return;
      }

      this.cargarPerfil(id);
    });
  }

  get totalVisitas(): number {
    return this.obras.reduce((total, obra) => total + (obra.numVisitas || 0), 0);
  }

  cargarPerfil(id: string): void {
    this.error = '';
    this.mensaje = '';

    const viewerId = this.currentUser?.id || 0;

    this.http
      .get<PerfilResponse>(`${this.apiUrl}?id=${id}&viewer_id=${viewerId}`)
      .subscribe({
        next: (res) => {
          if (!res.success || !res.user) {
            this.error = res.error || 'No se pudo cargar el perfil';
            return;
          }

          this.user = res.user;
          this.obras = res.obras || [];
          this.estaSuscrito = !!res.estaSuscrito;

          this.isCurrentUser = this.currentUser?.id === this.user.id;
        },
        error: (err) => {
          this.error = err.error?.error || 'Error al cargar el perfil';
          console.error(err);
        }
      });
  }

  navigateToEditProfile(): void {
    if (!this.user) {
      return;
    }

    this.router.navigate(['/perfil', this.user.id, 'editar']);
  }

  toggleSubscription(): void {
    if (!this.user) {
      return;
    }

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.currentUser.id === this.user.id) {
      return;
    }

    this.mensaje = '';
    this.error = '';

    this.http
      .post<SuscripcionResponse>(this.suscripcionUrl, {
        seguidor_id: this.currentUser.id,
        seguido_id: this.user.id
      })
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.mensaje = res.error || 'No se pudo actualizar la suscripción';
            return;
          }

          this.estaSuscrito = !!res.suscrito;
          this.mensaje = res.mensaje || '';

          if (this.user) {
            const totalActual = this.user.totalSuscriptores || 0;

            if (res.suscrito) {
              this.user.totalSuscriptores = totalActual + 1;
            } else {
              this.user.totalSuscriptores = Math.max(totalActual - 1, 0);
            }
          }
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al actualizar suscripción';
          console.error(err);
        }
      });
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/portada.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('blob:')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }

  private getCurrentUser(): User | null {
    const userRaw = localStorage.getItem('user');

    if (!userRaw) {
      return null;
    }

    try {
      return JSON.parse(userRaw) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }
}