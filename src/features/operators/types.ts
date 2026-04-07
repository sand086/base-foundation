// src/features/operators/types.ts
import type { OperatorResponse } from "@/api/generated";

// Re-export the generated type as the base, with local extensions
export type OperatorStatus =
  | "activo"
  | "inactivo"
  | "en_ruta"
  | "vacaciones"
  | "incapacidad";

export interface Operator extends OperatorResponse {
  unit_economico?: string;
}

// ==========================================
// DOCUMENTOS (Historial de Expediente)
// ==========================================

export interface OperatorDocument {
  id: number;
  operator_id: number;
  document_type: string;
  filename: string;
  file_url: string;
  file_size?: number;
  version: number;
  is_active: boolean;
  created_at: string;
}
