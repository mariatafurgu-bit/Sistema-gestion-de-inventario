// Instrumento
export interface Instrumento {
  id?: string | number;
  nombre: string;
  referencia: string;
  categoria: string | number;
  categoria_nombre?: string;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  fecha_adquisicion?: string | null;
  estado: 'disponible' | 'prestado' | 'mantenimiento' | 'baja';
  valor_reemplazo?: number | null;
  ubicacion_fisica?: string | null;
  cantidad?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  observaciones?: string | null;
  // Para compatibilidad con el JS anterior
  codigo?: string;
  numeroSerie?: string;
  condicion?: string | null;
  responsable?: string;
}

export interface Categoria {
  id?: string | number;
  nombre: string;
  descripcion?: string;
}
