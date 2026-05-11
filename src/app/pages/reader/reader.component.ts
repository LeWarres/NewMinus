import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { TranslationService } from '../../services/translation.service';

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
  capitulos: Capitulo[];
  capituloActual: Capitulo;
  paginas: ObraPagina[];
}

interface ObraDetalleResponse {
  success: boolean;
  error?: string;
  obra?: ObraDetalle;
}

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
  siteUrl = 'https://minuscreators.com';

  obra: ObraDetalle | null = null;
  images: string[] = [];

  cargando = false;
  error = '';

  selectedChapter = 1;
  isFavorite = false;

  pageInfo = {
    title: '',
    caption: '1',
    views: 0,
    author: '',
    authorInitial: '',
    subscribers: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
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

  cargarObra(id: string, capitulo?: string): void {
    this.cargando = true;
    this.error = '';

    let url = `${this.apiUrl}?id=${id}`;

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

        this.pageInfo = {
          title: this.obra.titulo,
          caption: String(this.obra.capituloActual.numeroCapitulo),
          views: this.obra.numVisitas,
          author: this.obra.autor,
          authorInitial: this.getInitial(this.obra.autor),
          subscribers: 0
        };

        setTimeout(() => {
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

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  previous(): void {
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

  next(): void {
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
}