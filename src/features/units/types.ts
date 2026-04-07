// src/features/units/types.ts
import type { UnitResponse } from "@/api/generated";

export type UnitStatus =
  | "disponible"
  | "en_ruta"
  | "mantenimiento"
  | "bloqueado";

export type UnitAxleConfig = "TRACTO_10" | "RABON_6" | "REMOLQUE_8" | "DOLLY_8";

// ==========================================
// DOCUMENTOS
// ==========================================

export interface UnitDocument {
  id: number;
  unit_id: number;
  document_type: string;
  filename: string;
  file_url: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: number;
}

// ==========================================
// UNIDAD — extends generated UnitResponse
// ==========================================

export interface Unit extends UnitResponse {
  capacidad_tanque_diesel?: string;
  capacidad_tanque_urea?: string;
  configuracion_ejes?: UnitAxleConfig;
  numero_serie_motor?: string;
  marca_motor?: string;
  permiso_sct_tipo?: string;
  config_vehicular_sat?: string;
  aseguradora_resp_civil?: string;
  poliza_resp_civil?: string;
  seguro_vence_status?: "valid" | "warning" | "expired";
}

// ==========================================
// VISTA DETALLADA
// ==========================================

export interface UnitDetail extends Unit {
  operators?: Array<{
    id: number;
    name: string;
    phone?: string;
    foto_url?: string;
  }>;
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
