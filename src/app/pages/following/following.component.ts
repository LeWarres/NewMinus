import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { ContentMetadataService } from '../../services/content-metadata.service';

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
    private metadataService: ContentMetadataService,
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

  get totalCreators(): number {
    const creators = this.items
      .map((item) => Number(item.usuarioId || 0))
      .filter((id) => id > 0);

    return new Set(creators).size;
  }

  get featuredItems(): CapituloCardItem[] {
    return this.items.slice(0, 3);
  }

  get latestUpdateText(): string {
    const latestDate = this.items
      .map((item) => new Date(item.fechaCreacion || '').getTime())
      .filter((time) => !Number.isNaN(time))
      .sort((a, b) => b - a)[0];

    if (!latestDate) {
      return this.translationService.getTranslation('following.hero.no_updates');
    }

    return new Intl.DateTimeFormat(this.getCurrentLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(latestDate));
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

  irACategorias(): void {
    this.router.navigate(['/categorias']);
  }

  getCoverUrl(path?: string | null): string {
    return this.metadataService.imageUrl(path, '/obras/paleta/portada.png');
  }

  trackByCapitulo(index: number, item: CapituloCardItem): number | string {
    return item.capituloVersionId || item.capituloId || `${item.obraId}-${item.numeroCapitulo}-${item.idioma || 'GLOBAL'}-${index}`;
  }

  private chapterQueryParams(item: CapituloCardItem): Record<string, string> {
    return item.idioma
      ? { idioma: item.idioma }
      : {};
  }

  private getCurrentLocale(): string {
    const currentLanguage = String(this.translationService.getCurrentLanguage() || 'en')
      .trim()
      .toLowerCase();

    const localeMap: Record<string, string> = {
      es: 'es',
      en: 'en',
      ja: 'ja',
      ko: 'ko',
      zh: 'zh',
      fr: 'fr',
      de: 'de',
      pt: 'pt',
      it: 'it',
      ru: 'ru',
      ar: 'ar',
      hi: 'hi',
      id: 'id',
      vi: 'vi',
      th: 'th',
      tr: 'tr',
      pl: 'pl',
      nl: 'nl'
    };

    return localeMap[currentLanguage] || 'en';
  }
}
