import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

import {
  CapituloCardComponent,
  CapituloCardItem
} from '../../components/cards/capitulo-card/capitulo-card.component';

interface FollowingResponse {
  success: boolean;
  error?: string;
  items: CapituloCardItem[];
}

@Component({
  selector: 'app-following',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CapituloCardComponent
  ],
  templateUrl: './following.component.html',
  styleUrl: './following.component.css'
})
export class FollowingComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/following.php';

  currentUser: CurrentUser | null = null;

  items: CapituloCardItem[] = [];

  cargando = false;
  error = '';

  constructor(
    private http: HttpClient,
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

    this.cargarFollowing();
  }

  cargarFollowing(): void {
    this.cargando = true;
    this.error = '';

    this.http
      .get<FollowingResponse>(
        `${this.apiUrl}?limite=50`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.cargando = false;

          if (!res.success) {
            this.error =
              res.error ||
              this.translationService.getTranslation('following.error.load_updates_failed');
            return;
          }

          this.items = res.items || [];
        },
        error: (err) => {
          this.cargando = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.router.navigate(['/login']);
            return;
          }

          this.error =
            err.error?.error ||
            this.translationService.getTranslation('following.error.load_updates_error');

          console.error(err);
        }
      });
  }

  abrirItem(item: CapituloCardItem): void {
    this.router.navigate(
      [
        '/obra',
        item.obraId,
        'capitulo',
        item.numeroCapitulo
      ],
      {
        queryParams: this.chapterQueryParams(item)
      }
    );
  }

  abrirPerfil(item: CapituloCardItem): void {
    if (!item.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', item.usuarioId]);
  }

  trackByCapitulo(index: number, item: CapituloCardItem): number | string {
    return item.capituloVersionId || item.capituloId || `${item.obraId}-${item.numeroCapitulo}-${item.idioma || 'GLOBAL'}-${index}`;
  }

  private chapterQueryParams(item: CapituloCardItem): Record<string, string> {
    return item.idioma
      ? { idioma: item.idioma }
      : {};
  }
}