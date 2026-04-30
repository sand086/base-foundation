import { UnitType } from "@/features/settings/types";
import { Currency, RecordStatus } from "@/types/api.types.globals";
import { PayableInvoice } from "@/features/payables/types";

// ==========================================
// ENUMS
// ==========================================
export type SupplierStatus = "activo" | "inactivo" | "suspendido";
export type TariffStatus = "activa" | "vencida" | "por_vencer";

// ==========================================
// TARIFAS DE PROVEEDOR
// ==========================================
export interface SupplierTariff {
  id: number;
  supplier_id: number;
  rate_template_id?: number | null;
  nombre_ruta: string;
  tipo_unidad: UnitType | string;
  tarifa_base: number;
  costo_casetas: number;
  moneda: Currency | string;
  vigencia: string; // ISO Date "YYYY-MM-DD"
  estatus: TariffStatus;
  iva_porcentaje: number;
  retencion_porcentaje: number;

  // Campo computado en el backend
  total_flete?: number;
}

// ==========================================
// DOCUMENTOS
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
// PROVEEDOR PRINCIPAL
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
  tipo_proveedor?: string | null; // Ej: "refacciones", "servicios", "logística"
  zonas_cobertura?: string | null;

  // Datos Bancarios
  banco?: string | null;
  cuenta_bancaria?: string | null;
  clabe?: string | null;
  cost_center_id?: number | null;

  estatus: SupplierStatus | string;

  // Relaciones Anidadas
  tariffs?: SupplierTariff[];
  invoices?: PayableInvoice[];
  cost_center?: {
    id: number;
    codigo?: string;
    nombre: string;
  };

  // AuditMixin
  record_status?: RecordStatus;
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
  | "id"
  | "record_status"
  | "created_at"
  | "updated_at"
  | "tariffs"
  | "invoices"
  | "cost_center"
> {
  tariffs?: Partial<SupplierTariff>[];
}

export type SupplierUpdate = Partial<SupplierCreate>;
