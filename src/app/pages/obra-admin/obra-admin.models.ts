export interface AdminPagina {
  id: number;
  numeroPagina: number;
  imagen: string;
  creadoEn: string;
}

export interface AdminCapitulo {
  id: number;
  numeroCapitulo: number;
  titulo: string;
  descripcion?: string;
  creadoEn: string;
  paginas: AdminPagina[];
}

export interface AdminObra {
  id: number;
  usuarioId: number;
  titulo: string;
  descripcion?: string;
  genero?: string;
  categorias?: string[];
  idioma?: string;
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
