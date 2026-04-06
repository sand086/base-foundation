// src/features/operators/types.ts

// ==========================================
// ENUMS & LITERAL TYPES
// ==========================================

/** * Estado del operador.
 * Sincronizado con OperatorStatus en Python (SQLAlchemy)
 */
export type OperatorStatus =
  | "activo"
  | "inactivo"
  | "en_ruta" // 🚀 Añadido: vital para despacho
  | "vacaciones"
  | "incapacidad";

// ==========================================
// MAIN OPERATOR INTERFACE
// ==========================================

export interface Operator {
  id: number;
  public_id?: string;
  name: string;
  rfc?: string;
  phone?: string;
  status: OperatorStatus;

  // Datos de Licencia y Médicos
  license_number: string;
  license_type: string; // Ej: 'E', 'B', etc.
  license_expiry: string; // ISO Date (YYYY-MM-DD)
  medical_check_expiry: string; // ISO Date (YYYY-MM-DD)

  // Datos Laborales
  hire_date?: string; // ISO Date
  assigned_unit_id?: number | null;
  unit_economico?: string; // Numero económico de la unidad asignada

  // Contacto de Emergencia
  emergency_contact?: string;
  emergency_phone?: string;

  // Expediente Digital (URLs de Cloud Storage)
  foto_url?: string | null;
  licencia_url?: string | null;
  ine_url?: string | null;
  apto_medico_url?: string | null;
  comprobante_domicilio_url?: string | null;

  // Campos de Auditoría (AuditMixin del Backend)
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// DOCUMENTOS (Historial de Expediente)
// ==========================================

export interface OperatorDocument {
  id: number;
  operator_id: number;
  document_type: string; // 'licencia', 'ine', 'apto_medico', etc.
  filename: string;
  file_url: string;
  file_size?: number;
  version: number;
  is_active: boolean;
  created_at: string;
}
