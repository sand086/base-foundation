import { Currency, RecordStatus } from "@/types/api.types.globals";
import { Supplier } from "@/features/suppliers/types";

// ==========================================
// ENUMS & TYPES
// ==========================================
export type FinancialClassification =
  | "costo_directo_viaje"
  | "costo_mantenimiento"
  | "gasto_indirecto_fijo"
  | "gasto_indirecto_variable"
  | "ingreso_flete"
  | "maniobras";

export type InvoiceStatus =
  | "PENDIENTE"
  | "PAGO_PARCIAL"
  | "PAGADO"
  | "CANCELADO"
  | "pendiente"
  | "pago_parcial"
  | "pagado"
  | "cancelado";

// ==========================================
// CATEGORÍAS INDIRECTAS
// ==========================================
export interface IndirectCategory {
  id: number;
  nombre: string;
  tipo: "fijo" | "variable" | string;
  estatus?: "activo" | "inactivo" | string;
  record_status?: RecordStatus;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// PAGOS CXP
// ==========================================
export interface InvoicePayment {
  id?: number;
  invoice_id?: number;
  fecha_pago: string; // ISO Date "YYYY-MM-DD"
  monto: number;
  metodo_pago?: string | null;
  referencia?: string | null;
  cuenta_retiro?: string | null;
  complemento_uuid?: string | null;
  record_status?: RecordStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

// ==========================================
// FACTURAS CXP
// ==========================================
export interface PayableInvoice {
  id: number;
  supplier_id?: number | null;
  supplier_razon_social?: string | null;
  viaje_id?: number | null;
  unit_id?: number | null;
  categoria_indirecto_id?: number | null;
  cost_center_id?: number | null;

  uuid?: string | null;
  folio_interno?: string | null;
  subtotal?: number;
  iva?: number;
  retenciones?: number;
  monto_total: number;
  saldo_pendiente: number;
  dias_credito?: number;
  moneda: Currency | string;

  fecha_emision: string; // ISO Date "YYYY-MM-DD"
  fecha_vencimiento: string; // ISO Date "YYYY-MM-DD"

  concepto?: string | null;
  clasificacion?: FinancialClassification | string | null;
  tipo_comprobante?: string; // Corregido (antes decía 'ipo_comprobante')
  estatus: InvoiceStatus;

  pdf_url?: string | null;
  xml_url?: string | null;
  orden_compra_id?: string | null;
  orden_compra_folio?: string | null;

  // Relaciones Anidadas
  payments?: InvoicePayment[];
  cost_center?: {
    id: number;
    codigo?: string;
    nombre: string;
  };
  supplier?: Supplier;

  // Auditoría
  record_status?: RecordStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

// ==========================================
// PAYLOADS Y PREFILLS (Data Transfer Objects)
// ==========================================
export interface PrefillData {
  proveedor: string;
  proveedorId: string;
  concepto: string;
  montoTotal: number;
  ordenCompraId: string;
  ordenCompraFolio: string;
}

export interface RegisterExpensePayload {
  supplier_id: number | null;
  concepto: string;
  monto_total: number;
  moneda: "MXN" | "USD" | string;
  uuid: string | null;
  fecha_emision: string;
  dias_credito: number;
  fecha_vencimiento: string;
  clasificacion: FinancialClassification | string;
  viaje_id: number | null;
  unidad_id: number | null;
  categoria_indirecto_id: number | null;
  orden_compra_id: string | null;
  orden_compra_folio: string | null;
  pdf_url: string | null;
  xml_url: string | null;
}

export interface RegisterPaymentPayload {
  fecha_pago: string;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
  cuenta_retiro: number;
}
