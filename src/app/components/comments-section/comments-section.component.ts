import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AuthService, CurrentUser } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

type CommentTargetType = 'obra' | 'capitulo';
type ChapterReaction = -1 | 0 | 1;

interface ComentarioItem {
  id: number;
  obraId?: number;
  capituloId?: number;
  usuarioId: number;
  comentario: string;
  creadoEn: string;
  actualizadoEn?: string | null;
  username: string;
  usuarioAvatar?: string | null;
}

interface ComentariosResponse {
  success: boolean;
  error?: string;
  mensaje?: string;
  comentarios: ComentarioItem[];
  miComentario: ComentarioItem | null;
}

interface ReaccionResponse {
  success: boolean;
  error?: string;
  mensaje?: string;
  totalLikes: number;
  totalDislikes: number;
  miReaccion: ChapterReaction;
}

@Component({
  selector: 'app-comments-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './comments-section.component.html',
  styleUrl: './comments-section.component.css'
})
export class CommentsSectionComponent implements OnInit, OnChanges {
  @Input() tipo: CommentTargetType = 'obra';
  @Input() targetId: number | null = null;
  @Input() showReactions = false;
  @Input() maxLength = 1000;
  @Input() autoLoad = true;

  @Output() commentCountChange = new EventEmitter<number>();

  private comentariosObraUrl = 'https://minuscreators.com/api/comentarios_obra.php';
  private comentariosCapituloUrl = 'https://minuscreators.com/api/comentarios_capitulo.php';
  private reaccionCapituloUrl = 'https://minuscreators.com/api/reaccion_capitulo.php';

  private siteUrl = 'https://minuscreators.com';

  currentUser: CurrentUser | null = null;

  comentarios: ComentarioItem[] = [];
  miComentario: ComentarioItem | null = null;
  comentarioTexto = '';

  cargandoComentarios = false;
  guardandoComentario = false;
  mensajeComentarios = '';
  errorComentarios = '';

  totalLikes = 0;
  totalDislikes = 0;
  miReaccion: ChapterReaction = 0;
  guardandoReaccion = false;
  mensajeReaccion = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.autoLoad) {
      this.cargarTodo();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['targetId'] ||
      changes['tipo']
    ) {
      this.resetState();

      if (this.autoLoad && this.targetId) {
        this.cargarTodo();
      }
    }
  }

  get reactionsEnabled(): boolean {
    return this.tipo === 'capitulo' && this.showReactions;
  }

  get totalReacciones(): number {
    return this.totalLikes + this.totalDislikes;
  }

  get likesPercent(): number {
    if (this.totalReacciones <= 0) {
      return 0;
    }

    return Math.round((this.totalLikes / this.totalReacciones) * 100);
  }

  get dislikesPercent(): number {
    if (this.totalReacciones <= 0) {
      return 0;
    }

    return 100 - this.likesPercent;
  }

  get caracteresRestantes(): number {
    return Math.max(this.maxLength - this.comentarioTexto.length, 0);
  }

  get emptyTextKey(): string {
    return this.tipo === 'capitulo'
      ? 'Este capítulo todavía no tiene comentarios.'
      : 'Esta obra todavía no tiene comentarios.';
  }

  cargarTodo(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.cargarComentarios();

    if (this.reactionsEnabled) {
      this.cargarReaccion();
    }
  }

  cargarComentarios(): void {
    if (!this.targetId) {
      return;
    }

    this.cargandoComentarios = true;
    this.errorComentarios = '';
    this.mensajeComentarios = '';

    this.http.get<ComentariosResponse>(
      `${this.getComentariosUrl()}?${this.getTargetParamName()}=${this.targetId}`,
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        this.cargandoComentarios = false;

        if (!res.success) {
          this.errorComentarios =
            res.error ||
            this.translationService.getTranslation('No se pudieron cargar los comentarios');
          return;
        }

        this.comentarios = res.comentarios || [];
        this.miComentario = res.miComentario || null;
        this.comentarioTexto = this.miComentario?.comentario || '';

        this.commentCountChange.emit(this.comentarios.length);
      },
      error: (err) => {
        this.cargandoComentarios = false;
        this.errorComentarios =
          err.error?.error ||
          this.translationService.getTranslation('No se pudieron cargar los comentarios');

        console.error(err);
      }
    });
  }

  guardarComentario(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.mensajeComentarios =
        this.translationService.getTranslation('Para comentar debes iniciar sesión.');
      return;
    }

    if (!this.targetId) {
      return;
    }

    const comentario = this.comentarioTexto.trim();

    if (!comentario) {
      this.errorComentarios =
        this.translationService.getTranslation('El comentario no puede estar vacío');
      return;
    }

    const wasEditing = !!this.miComentario;

    this.guardandoComentario = true;
    this.errorComentarios = '';
    this.mensajeComentarios = '';

    this.ensureCsrfAndRun(() => {
      this.http.post<ComentariosResponse>(
        this.getComentariosUrl(),
        {
          [this.getTargetParamName()]: this.targetId,
          comentario
        },
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardandoComentario = false;

          if (!res.success) {
            this.errorComentarios =
              res.error ||
              this.translationService.getTranslation('No se pudo guardar el comentario');
            return;
          }

          this.comentarios = res.comentarios || [];
          this.miComentario = res.miComentario || null;
          this.comentarioTexto = this.miComentario?.comentario || '';

          this.mensajeComentarios = wasEditing
            ? this.translationService.getTranslation('Comentario actualizado')
            : this.translationService.getTranslation('Comentario publicado');

          this.commentCountChange.emit(this.comentarios.length);
        },
        error: (err) => {
          this.guardandoComentario = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.currentUser = null;
            this.mensajeComentarios =
              this.translationService.getTranslation('Para comentar debes iniciar sesión.');
            return;
          }

          this.errorComentarios =
            err.error?.error ||
            this.translationService.getTranslation('No se pudo guardar el comentario');

          console.error(err);
        }
      });
    }, () => {
      this.guardandoComentario = false;
      this.errorComentarios =
        this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  eliminarComentario(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.mensajeComentarios =
        this.translationService.getTranslation('Para comentar debes iniciar sesión.');
      return;
    }

    if (!this.targetId) {
      return;
    }

    this.guardandoComentario = true;
    this.errorComentarios = '';
    this.mensajeComentarios = '';

    this.ensureCsrfAndRun(() => {
      this.http.request<ComentariosResponse>(
        'DELETE',
        this.getComentariosUrl(),
        {
          body: {
            [this.getTargetParamName()]: this.targetId
          },
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardandoComentario = false;

          if (!res.success) {
            this.errorComentarios =
              res.error ||
              this.translationService.getTranslation('No se pudo eliminar el comentario');
            return;
          }

          this.comentarios = res.comentarios || [];
          this.miComentario = null;
          this.comentarioTexto = '';
          this.mensajeComentarios =
            this.translationService.getTranslation('Comentario eliminado');

          this.commentCountChange.emit(this.comentarios.length);
        },
        error: (err) => {
          this.guardandoComentario = false;

          this.errorComentarios =
            err.error?.error ||
            this.translationService.getTranslation('No se pudo eliminar el comentario');

          console.error(err);
        }
      });
    }, () => {
      this.guardandoComentario = false;
      this.errorComentarios =
        this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  cargarReaccion(): void {
    if (!this.targetId || !this.reactionsEnabled) {
      return;
    }

    this.http.get<ReaccionResponse>(
      `${this.reaccionCapituloUrl}?capitulo_id=${this.targetId}`,
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        if (!res.success) {
          return;
        }

        this.totalLikes = res.totalLikes || 0;
        this.totalDislikes = res.totalDislikes || 0;
        this.miReaccion = res.miReaccion || 0;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  reaccionar(reaccion: 1 | -1): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.mensajeReaccion =
        this.translationService.getTranslation('Para comentar o dejar un like debes iniciar sesión.');
      return;
    }

    if (!this.targetId || !this.reactionsEnabled) {
      return;
    }

    const nuevaReaccion: ChapterReaction = this.miReaccion === reaccion
      ? 0
      : reaccion;

    this.guardandoReaccion = true;
    this.mensajeReaccion = '';

    this.ensureCsrfAndRun(() => {
      this.http.post<ReaccionResponse>(
        this.reaccionCapituloUrl,
        {
          capitulo_id: this.targetId,
          reaccion: nuevaReaccion
        },
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.guardandoReaccion = false;

          if (!res.success) {
            this.mensajeReaccion =
              res.error ||
              this.translationService.getTranslation('No se pudo guardar la reacción');
            return;
          }

          this.totalLikes = res.totalLikes || 0;
          this.totalDislikes = res.totalDislikes || 0;
          this.miReaccion = res.miReaccion || 0;
          this.mensajeReaccion =
            this.translationService.getTranslation('Tu reacción fue guardada');
        },
        error: (err) => {
          this.guardandoReaccion = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.currentUser = null;
            this.mensajeReaccion =
              this.translationService.getTranslation('Para comentar o dejar un like debes iniciar sesión.');
            return;
          }

          this.mensajeReaccion =
            err.error?.error ||
            this.translationService.getTranslation('No se pudo guardar la reacción');

          console.error(err);
        }
      });
    }, () => {
      this.guardandoReaccion = false;
      this.mensajeReaccion =
        this.translationService.getTranslation('No se pudo preparar la acción');
    });
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/tres.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }

  private getComentariosUrl(): string {
    return this.tipo === 'capitulo'
      ? this.comentariosCapituloUrl
      : this.comentariosObraUrl;
  }

  private getTargetParamName(): 'obra_id' | 'capitulo_id' {
    return this.tipo === 'capitulo'
      ? 'capitulo_id'
      : 'obra_id';
  }

  private resetState(): void {
    this.comentarios = [];
    this.miComentario = null;
    this.comentarioTexto = '';

    this.cargandoComentarios = false;
    this.guardandoComentario = false;
    this.mensajeComentarios = '';
    this.errorComentarios = '';

    this.totalLikes = 0;
    this.totalDislikes = 0;
    this.miReaccion = 0;
    this.guardandoReaccion = false;
    this.mensajeReaccion = '';
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