// src/features/units/types.ts

// ==========================================
// ENUMS (Alineados a UnitStatus y UnitAxleConfig en Python)
// ==========================================

export type UnitStatus =
  | "disponible"
  | "en_ruta"
  | "mantenimiento"
  | "bloqueado";

export type UnitAxleConfig = "TRACTO_10" | "RABON_6" | "REMOLQUE_8" | "DOLLY_8";

// ==========================================
// DOCUMENTOS (Basado en UnitDocumentHistory)
// ==========================================

export interface UnitDocument {
  id: number;
  unit_id: number;
  document_type: string; // seguro, verificacion, sct, etc.
  filename: string;
  file_url: string;
  file_size?: number;
  uploaded_at: string; // ISO DateTime
  uploaded_by?: number;
}

// ==========================================
// UNIDAD (Basado en el Modelo Unit de SQLAlchemy)
// ==========================================

export interface Unit {
  id: number;
  public_id: string;

  // Identificación
  numero_economico: string;
  placas: string;
  vin?: string;
  marca: string;
  modelo: string;
  year?: number;

  // Especificaciones Técnicas
  tipo?: string;
  tipo_1?: string;
  tipo_carga?: string;
  numero_serie_motor?: string;
  marca_motor?: string;
  capacidad_carga?: number;
  capacidad_tanque_diesel?: string;
  capacidad_tanque_urea?: string;
  configuracion_ejes?: UnitAxleConfig;

  // Estatus y Control
  status: UnitStatus;
  razon_bloqueo?: string;
  ignore_blocking: boolean;
  is_loaded: boolean;

  // Contadores de Alerta
  documentos_vencidos: number;
  llantas_criticas: number;

  // Fechas de Vencimiento (Vienen como string ISO date desde Python)
  seguro_vence?: string;
  verificacion_humo_vence?: string;
  verificacion_fisico_mecanica_vence?: string;
  verificacion_vence?: string;
  permiso_sct_vence?: string;
  caat_vence?: string;
  seguro_vence_status?: "valid" | "warning" | "expired"; // Calculado en el front o serializado

  // Folios y Datos Legales
  permiso_sct_folio?: string;
  permiso_sct_tipo?: string;
  caat_folio?: string;
  tarjeta_circulacion_folio?: string;
  config_vehicular_sat?: string;
  aseguradora_resp_civil?: string;
  poliza_resp_civil?: string;

  // URLs de Documentos Actuales
  tarjeta_circulacion_url?: string;
  permiso_doble_articulado_url?: string;
  poliza_seguro_url?: string;
  verificacion_humo_url?: string;
  verificacion_fisico_mecanica_url?: string;
  permiso_sct_url?: string;
  caat_url?: string;

  // Auditoría (AuditMixin)
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// VISTA DETALLADA (Extendida con Relaciones)
// ==========================================

export interface UnitDetail extends Unit {
  // Relaciones cargadas vía 'joined' en SQLAlchemy
  operators?: Array<{
    id: number;
    name: string;
    phone?: string;
    foto_url?: string;
  }>;

  // Resumen de llantas (si el backend lo manda simplificado)
  tires_summary?: {
    total: number;
    estado_bueno: number;
    estado_regular: number;
    estado_malo: number;
  };
}

// Para el catálogo de tipos de unidad
export interface UnitTypeCatalog {
  id: string;
  nombre: string;
  icono: string;
  activo: boolean;
  descripcion?: string;
}
