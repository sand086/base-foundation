// src/features/suppliers/types.ts
import { UnitType } from "@/features/settings/types";
import { Currency, RecordStatus } from "@/types/api.types.globals";
// ==========================================
// ENUMS (Alineados a Postgres)
// ==========================================
export type SupplierStatus = "activo" | "inactivo" | "suspendido";
export type TariffStatus = "activa" | "vencida" | "por_vencer";

// ==========================================
// TARIFAS DE PROVEEDOR (Model: SupplierTariff)
// ==========================================
export interface SupplierTariff {
  id: number;
  supplier_id: number;
  rate_template_id?: number | null;
  nombre_ruta: string;
  tipo_unidad: UnitType;
  tarifa_base: number;
  costo_casetas: number;
  moneda: Currency;
  vigencia: string; // ISO Date "YYYY-MM-DD"
  estatus: TariffStatus;
  iva_porcentaje: number;
  retencion_porcentaje: number;

  // Campo computado en el backend
  total_flete?: number;
}

// ==========================================
// DOCUMENTOS (Model: SupplierDocumentHistory)
// ==========================================
export interface SupplierDocument {
  id: number;
  supplier_id: number;
  document_type: string;
  filename: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  version: number;
  is_active: boolean;
  uploaded_at: string; // ISO DateTime
}

// ==========================================
// PROVEEDOR PRINCIPAL (Model: Supplier)
// ==========================================
export interface Supplier {
  id: number;
  razon_social: string;
  rfc: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  codigo_postal?: string | null;

  // Crédito
  dias_credito: number;
  limite_credito: number;

  // Clasificación
  contacto_principal?: string | null;
  categoria?: string | null;
  tipo_proveedor?: string | null; // Ej: "refacciones", "servicios", "logística"
  zonas_cobertura?: string | null;

  // Datos Bancarios
  banco?: string | null;
  cuenta_bancaria?: string | null;
  clabe?: string | null;

  estatus: SupplierStatus;

  // Relaciones (Solo disponibles en SupplierResponse)
  tariffs?: SupplierTariff[];
  invoices?: any[]; // Aquí puedes importar PayableInvoice si ya lo tienes definido

  // AuditMixin
  record_status: RecordStatus;
  created_at?: string;
  updated_at?: string;
  created_by_id?: number | null;
  updated_by_id?: number | null;
}

// ==========================================
// DTOs para Formularios (Create/Update)
// ==========================================

export interface SupplierCreate extends Omit<
  Supplier,
  "id" | "record_status" | "created_at" | "updated_at" | "tariffs" | "invoices"
> {
  tariffs?: Partial<SupplierTariff>[];
}

export type SupplierUpdate = Partial<SupplierCreate>;

// ==========================================
// CATEGORÍAS INDIRECTAS (Model: IndirectExpenseCategory)
// ==========================================
export interface IndirectCategory {
  id: number;
  nombre: string;
  tipo: "fijo" | "variable" | string;

  // AuditMixin
  record_status?: RecordStatus;
  created_at?: string;
  updated_at?: string;
}
