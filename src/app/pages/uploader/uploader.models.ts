export interface UploadResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  obra_id?: number;
  capitulo_id?: number;
  usuario_id?: number;
  portada?: string;
  versiones_guardadas?: number;
  paginas_guardadas?: number;
}

export interface SelectOption {
  value: string;
  labelKey: string;
  nativeLabel?: string;
}

export interface IdiomaVersionUpload {
  id: string;
  idioma: string;
  paginas: File[];
  isDragging: boolean;
}

export interface VersionPayload {
  key: string;
  idioma: string;
  titulo: string;
  descripcion: string;
  numeroCapitulo: number;
  tituloCapitulo: string;
  descripcionCapitulo: string;
}

export interface VersionFilesEvent {
  version: IdiomaVersionUpload;
  files: File[];
}

export interface VersionPageRemoveEvent {
  version: IdiomaVersionUpload;
  index: number;
}
