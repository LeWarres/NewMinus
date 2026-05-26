import type { ReadingLanguageOption } from '../../shared/options/profile-options';

export interface UploadChapterResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  obra_id?: number;
  capitulo_id?: number;
  numero_capitulo?: number;
  idioma?: string;
  versiones_guardadas?: number;
  paginas_guardadas?: number;
}

export type ChapterLanguageOption = ReadingLanguageOption;

export interface ChapterLanguageVersion {
  uid: string;
  idioma: string;
  titulo: string;
  descripcion: string;
  pages: File[];
  isDragging: boolean;
}

export interface VersionFilesEvent {
  version: ChapterLanguageVersion;
  files: File[];
}

export interface VersionPageRemoveEvent {
  version: ChapterLanguageVersion;
  index: number;
}

export interface ObraPreviewResponse {
  success: boolean;
  error?: string;
  obra?: {
    id: number;
    titulo?: string;
    idioma?: string;
    tipoEntrega?: string;
  };
}
