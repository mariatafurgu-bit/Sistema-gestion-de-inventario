// Reporte
export interface Estadisticas {
  total_instrumentos: number;
  instrumentos_disponibles: number;
  instrumentos_prestados: number;
  instrumentos_mantenimiento: number;
  instrumentos_baja: number;
  total_prestamos_activos: number;
  prestamos_vencidos: number;
  total_usuarios: number;
  total_categorias: number;
}

export interface ReporteVencido {
  id: number;
  instrumento_nombre: string;
  instrumento_referencia: string;
  usuario_nombre: string;
  usuario_documento: string;
  usuario_telefono: string;
  usuario_correo: string;
  fecha_prestamo: string;
  fecha_vencimiento: string;
  dias_vencimiento: number;
  estado: string;
}

export interface ReporteEstadoInstrumento {
  id: number;
  nombre: string;
  referencia: string;
  categoria_nombre: string;
  estado: string;
  marca?: string;
  modelo?: string;
  ubicacion_fisica?: string;
  cantidad: number;
  prestamos_activos: number;
  total_prestamos_historicos: number;
  valor_reemplazo?: number;
  fecha_adquisicion?: string;
  ultimo_cambio?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  cantidad?: number;
  prestamos?: T[];
  instrumentos?: T[];
  reportes?: T[];
  usuarios?: T[];
  results?: T[];
}
