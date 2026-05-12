import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { TranslationService } from '../../services/translation.service';

interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  role?: string;
  imgPerfil?: string;
}

interface Capitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
}

interface ObraPagina {
  id: number;
  numeroPagina: number;
  imagen: string;
  creadoEn: string;
}

interface ObraDetalle {
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
  autorAvatar?: string;
  autorRole?: string;
  autorNacionalidad?: string;
  totalSuscriptores?: number;
  estaSuscrito?: boolean;

  capitulos: Capitulo[];
  capituloActual: Capitulo;
  paginas: ObraPagina[];
}

interface ObraDetalleResponse {
  success: boolean;
  error?: string;
  obra?: ObraDetalle;
}

interface SuscripcionResponse {
  success: boolean;
  suscrito?: boolean;
  mensaje?: string;
  error?: string;
}

type ReadingMode = 'strip' | 'single' | 'double';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.css'
})
export class ReaderComponent implements OnInit, OnDestroy {
  apiUrl = 'https://minuscreators.com/api/obra_detalle.php';
  suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';
  siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;
  obra: ObraDetalle | null = null;

  images: string[] = [];
  hiddenPageIndexes: number[] = [];

  cargando = false;
  error = '';
  mensaje = '';

  selectedChapter = 1;
  isFavorite = false;

  readingMode: ReadingMode = 'strip';
  currentPageIndex = 0;
  scrollProgress = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.getCurrentUser();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      const capitulo = params.get('capitulo');

      if (!id) {
        this.error = 'No se encontró la obra';
        return;
      }

      this.cargarObra(id, capitulo || undefined);
    });
  }

  ngOnDestroy(): void {
    this.removerDisqus();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollProgress();
  }

  @HostListener('window:keydown', ['$event'])
onKeyboardNavigation(event: KeyboardEvent): void {
  const target = event.target as HTMLElement;
  const tagName = target?.tagName?.toLowerCase();

  const isTyping =
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target?.isContentEditable;

  if (isTyping || this.cargando || !this.obra) {
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    this.nextPage();
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    this.previousPage();
  }
}

  get isCurrentAuthor(): boolean {
    return !!this.currentUser && !!this.obra && this.currentUser.id === this.obra.usuarioId;
  }

  get hasPreviousChapter(): boolean {
    if (!this.obra) {
      return false;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    return index > 0;
  }

  get hasNextChapter(): boolean {
    if (!this.obra) {
      return false;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    return index >= 0 && index < this.obra.capitulos.length - 1;
  }

  get currentPageNumber(): number {
    return this.currentPageIndex + 1;
  }

  get totalPages(): number {
    return this.images.length;
  }

  get currentSpreadImages(): string[] {
    if (this.readingMode === 'double') {
      return [
        this.images[this.currentPageIndex],
        this.images[this.currentPageIndex + 1]
      ].filter(Boolean);
    }

    return [
      this.images[this.currentPageIndex]
    ].filter(Boolean);
  }

  get readingProgress(): number {
    if (this.readingMode === 'strip') {
      return this.scrollProgress;
    }

    if (this.totalPages <= 1) {
      return 100;
    }

    return Math.min(100, Math.round(((this.currentPageIndex + 1) / this.totalPages) * 100));
  }

  cargarObra(id: string, capitulo?: string): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    this.hiddenPageIndexes = [];
    this.currentPageIndex = 0;
    this.scrollProgress = 0;

    const viewerId = this.currentUser?.id || 0;

    let url = `${this.apiUrl}?id=${id}&viewer_id=${viewerId}`;

    if (capitulo) {
      url += `&capitulo=${capitulo}`;
    }

    this.http.get<ObraDetalleResponse>(url).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.obra) {
          this.error = res.error || 'No se pudo cargar la obra';
          return;
        }

        this.obra = res.obra;
        this.selectedChapter = this.obra.capituloActual.numeroCapitulo;

        this.images = this.obra.paginas.map((pagina) => {
          return this.imageUrl(pagina.imagen);
        });

        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto'
        });

        setTimeout(() => {
          this.updateScrollProgress();
          this.cargarDisqus();
        }, 300);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Error al cargar la obra';
        console.error(err);
      }
    });
  }

  setReadingMode(mode: ReadingMode): void {
    this.readingMode = mode;
    this.currentPageIndex = 0;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });

    setTimeout(() => this.updateScrollProgress(), 100);
  }

  nextPage(): void {
    if (this.readingMode === 'strip') {
      window.scrollBy({
        top: window.innerHeight * 0.85,
        behavior: 'smooth'
      });
      return;
    }

    const step = this.readingMode === 'double' ? 2 : 1;
    this.currentPageIndex = Math.min(this.currentPageIndex + step, this.totalPages - 1);
  }

  previousPage(): void {
    if (this.readingMode === 'strip') {
      window.scrollBy({
        top: -window.innerHeight * 0.85,
        behavior: 'smooth'
      });
      return;
    }

    const step = this.readingMode === 'double' ? 2 : 1;
    this.currentPageIndex = Math.max(this.currentPageIndex - step, 0);
  }

  onChapterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const numeroCapitulo = Number(select.value);

    if (!this.obra) {
      return;
    }

    this.router.navigate([
      '/obra',
      this.obra.id,
      'capitulo',
      numeroCapitulo
    ]);
  }

  previousChapter(): void {
    if (!this.obra) {
      return;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    if (index <= 0) {
      return;
    }

    const previousChapter = this.obra.capitulos[index - 1];

    this.router.navigate([
      '/obra',
      this.obra.id,
      'capitulo',
      previousChapter.numeroCapitulo
    ]);
  }

  nextChapter(): void {
    if (!this.obra) {
      return;
    }

    const index = this.obra.capitulos.findIndex(
      cap => cap.numeroCapitulo === this.selectedChapter
    );

    if (index < 0 || index >= this.obra.capitulos.length - 1) {
      return;
    }

    const nextChapter = this.obra.capitulos[index + 1];

    this.router.navigate([
      '/obra',
      this.obra.id,
      'capitulo',
      nextChapter.numeroCapitulo
    ]);
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  abrirPerfilAutor(): void {
    if (!this.obra?.usuarioId) {
      return;
    }

    this.router.navigate(['/perfil', this.obra.usuarioId]);
  }

  volverDetalleObra(): void {
    if (!this.obra) {
      return;
    }

    this.router.navigate(['/obra', this.obra.id]);
  }

  toggleSubscription(): void {
    if (!this.obra || !this.obra.usuarioId) {
      return;
    }

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.currentUser.id === this.obra.usuarioId) {
      return;
    }

    this.mensaje = '';

    this.http.post<SuscripcionResponse>(this.suscripcionUrl, {
      seguidor_id: this.currentUser.id,
      seguido_id: this.obra.usuarioId
    }).subscribe({
      next: (res) => {
        if (!res.success) {
          this.mensaje = res.error || 'No se pudo actualizar la suscripción';
          return;
        }

        if (!this.obra) {
          return;
        }

        this.obra.estaSuscrito = !!res.suscrito;

        const totalActual = this.obra.totalSuscriptores || 0;

        if (res.suscrito) {
          this.obra.totalSuscriptores = totalActual + 1;
        } else {
          this.obra.totalSuscriptores = Math.max(totalActual - 1, 0);
        }

        this.mensaje = res.mensaje || '';
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

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }

  getInitial(name: string): string {
    if (!name || name.trim() === '') {
      return '?';
    }

    return name.trim().charAt(0).toUpperCase();
  }

  onPageImageError(index: number): void {
    this.hidePage(index);
  }

  onPageImageLoad(event: Event, index: number): void {
    const img = event.target as HTMLImageElement;

    if (img.naturalWidth <= 10) {
      this.hidePage(index);
    }
  }

  isPageHidden(index: number): boolean {
    return this.hiddenPageIndexes.includes(index);
  }

  private hidePage(index: number): void {
    if (!this.hiddenPageIndexes.includes(index)) {
      this.hiddenPageIndexes.push(index);
    }
  }

  private updateScrollProgress(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (docHeight <= 0) {
      this.scrollProgress = 100;
      return;
    }

    this.scrollProgress = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
  }

  cargarDisqus(): void {
    if (!this.obra) {
      return;
    }

    this.removerDisqus();

    const disqusContainer = document.getElementById('disqus_thread');

    if (!disqusContainer) {
      return;
    }

    (window as any).disqus_config = () => {
      (window as any).page.url = window.location.href;
      (window as any).page.identifier =
        `obra-${this.obra?.id}-capitulo-${this.selectedChapter}`;
    };

    const script = document.createElement('script');
    script.src = 'https://minuscreators.disqus.com/embed.js';
    script.setAttribute('data-timestamp', String(+new Date()));
    script.async = true;

    document.body.appendChild(script);
  }

  removerDisqus(): void {
    const scripts = document.querySelectorAll('script[src*="disqus.com/embed.js"]');
    scripts.forEach(script => script.remove());

    const disqusContainer = document.getElementById('disqus_thread');

    if (disqusContainer) {
      disqusContainer.innerHTML = '';
    }

    const disqusThread = document.getElementById('dsq-app');

    if (disqusThread) {
      disqusThread.remove();
    }
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