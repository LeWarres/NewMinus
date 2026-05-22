export interface AdminPagina {
  id: number;
  numeroPagina: number;
  imagen: string;
  creadoEn: string;
}

export interface AdminCapituloVersion {
  id: number;
  idioma: string;
  titulo: string;
  descripcion?: string;
  numVisitas?: number;
  publicado?: boolean;
  creadoEn: string;
  actualizadoEn?: string;
  paginas: AdminPagina[];
}

export interface AdminObraIdioma {
  id: number;
  idioma: string;
  titulo?: string;
  descripcion?: string;
  esPrincipal?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface AdminCapitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  idioma?: string;
  versionId?: number | null;
  creadoEn: string;
  paginas: AdminPagina[];
  versiones?: AdminCapituloVersion[];
}

export interface AdminObra {
  id: number;
  usuarioId: number;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
  idiomaPrincipal?: string;
  idiomasDisponibles?: string[];
  idiomas?: AdminObraIdioma[];
  tipoEntrega?: string;
  portada?: string;
  numVisitas: number;
  fechaCreacion: string;
  capitulos: AdminCapitulo[];
}

export interface SelectOption {
  value: string;
  label: string;
}
