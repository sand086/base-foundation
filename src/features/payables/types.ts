// src/features/payables/types.ts

export type FinancialClassification =
  | "costo_directo_viaje"
  | "costo_mantenimiento"
  | "gasto_indirecto_fijo"
  | "gasto_indirecto_variable"
  | "ingreso_flete"
  | "maniobras";

export interface IndirectCategory {
  id: number;
  nombre: string;
  tipo: "fijo" | "variable" | string;
  estatus?: "activo" | "inactivo" | string;
}

export interface Supplier {
  id: number;
  razon_social: string;
  rfc: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigo_postal?: string;
  dias_credito: number;
  limite_credito: number;
  contacto_principal?: string;
  categoria?: string;
  tipo_proveedor?: string;
  zonas_cobertura?: string;
  banco?: string;
  cuenta_bancaria?: string;
  clabe?: string;
  estatus: "activo" | "inactivo" | "suspendido";
  created_at?: string;
  updated_at?: string;
  cost_center?: {
    id: number;
    codigo?: string;
    nombre: string;
  };
}

export interface InvoicePayment {
  id?: number;
  invoice_id?: number;
  fecha_pago: string;
  monto: number;
  metodo_pago?: string;
  referencia?: string;
  cuenta_retiro?: string;
  complemento_uuid?: string;
}

export interface PayableInvoice {
  id: number;
  supplier_id?: number | null;
  supplier_razon_social?: string;
  viaje_id?: number | null;
  unit_id?: number | null;
  categoria_indirecto_id?: number | null;
  uuid?: string | null;
  folio_interno?: string;
  subtotal?: number;
  iva?: number;
  retenciones?: number;
  monto_total: number;
  saldo_pendiente: number;
  dias_credito?: number;
  moneda: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  concepto?: string;
  clasificacion?: string;
  estatus: "pendiente" | "pago_parcial" | "pagado" | "cancelado";
  pdf_url?: string;
  xml_url?: string;
  orden_compra_id?: string;
  orden_compra_folio?: string;
  payments?: InvoicePayment[];
}

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
  moneda: "MXN" | "USD";
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
