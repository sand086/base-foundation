// src/features/payables/types.ts

// ==========================================
// TIPOS DE CUENTAS POR PAGAR (EX-CXP)
// ==========================================

export type FinancialClassification =
  | "costo_directo_viaje"
  | "costo_mantenimiento"
  | "gasto_indirecto_fijo"
  | "gasto_indirecto_variable"
  | "ingreso_flete"
  | "maniobras";

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

export interface IndirectCategory {
  id: number;
  nombre: string;
  tipo: "fijo" | "variable";
  estatus?: "activo" | "inactivo" | string;
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

// ==========================================
// TIPOS DE COMPRAS (EX-COMPRAS)
// ==========================================

export interface PurchaseOrder {
  id: string;
  folio: string;
  tipo: "compra" | "servicio" | "gasto_indirecto" | string;
  proveedorNombre: string;
  solicitante: string;
  total: number;
  moneda: string;
  estatus:
    | "borrador"
    | "pendiente_aprobacion"
    | "aprobada"
    | "recibida"
    | "cancelada"
    | string;
  convertidoACxP?: boolean;
  fechaAprobacion?: Date;
  aprobadoPor?: string;
  fechaRecepcion?: Date;
  recepcionCompleta?: boolean;
  notasRecepcion?: string;
}

// Funciones de utilidad que usaba tu tabla de Compras
export function getOrderTypeColor(tipo: string): string {
  switch (tipo) {
    case "compra":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "servicio":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "gasto_indirecto":
      return "bg-slate-100 text-slate-800 border-slate-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getOrderTypeLabel(tipo: string): string {
  switch (tipo) {
    case "compra":
      return "COMPRA DE BIENES";
    case "servicio":
      return "CONTRATACIÓN DE SERVICIO";
    case "gasto_indirecto":
      return "GASTO INDIRECTO";
    default:
      return tipo.toUpperCase();
  }
}

export function getStatusInfo(estatus: string): {
  label: string;
  className: string;
} {
  switch (estatus) {
    case "borrador":
      return {
        label: "Borrador",
        className: "bg-slate-100 text-slate-700 border-slate-300",
      };
    case "pendiente_aprobacion":
      return {
        label: "Pendiente Aprob.",
        className: "bg-amber-100 text-amber-700 border-amber-300",
      };
    case "aprobada":
      return {
        label: "Aprobada",
        className: "bg-emerald-100 text-emerald-700 border-emerald-300",
      };
    case "recibida":
      return {
        label: "Recibida",
        className: "bg-blue-100 text-blue-700 border-blue-300",
      };
    case "cancelada":
      return {
        label: "Cancelada",
        className: "bg-red-100 text-red-700 border-red-300",
      };
    default:
      return { label: estatus, className: "bg-gray-100 text-gray-800" };
  }
}
