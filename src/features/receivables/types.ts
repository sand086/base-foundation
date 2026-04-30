// src/features/cxc/types.ts

// Types for Cuentas por Cobrar (CxC) module

export interface ReceivableInvoice {
  id: number;
  folio_interno?: string;
  client_id: number;

  //  CAMPOS FISCALES INYECTADOS PARA EL SPRINT 3
  viaje_id?: number | null;
  uuid?: string | null;
  uuid_relacionado?: string | null;
  status_sat?: string;

  cliente?: string;
  cliente_rfc?: string;
  dias_credito: number;

  // AÑADIDO: El objeto relacional que manda el backend de Python
  client?: {
    id?: number;
    razon_social?: string;
    rfc?: string;
  };

  concepto?: string;
  subtotal?: number;
  iva?: number;
  retenciones?: number;
  monto_total: number;
  saldo_pendiente: number;
  moneda: "MXN" | "USD";
  fecha_emision: string;
  fecha_vencimiento: string;
  estatus: "pendiente" | "pago_parcial" | "pagado" | "cancelado" | string;
  referencia?: string;
  payments?: InvoicePayment[];
  conceptos?: InvoiceConcept[];
  servicios_relacionados?: string[];
  requiere_rep?: boolean;
  comprobante_pago_url?: string;
  pdf_url?: string;
  xml_url?: string;
}

export interface InvoiceConcept {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface InvoicePayment {
  id: string;
  fecha: string;
  monto: number;
  cuentaDestino: string;
  referencia: string;
  comprobanteUrl?: string;
  requiereREP: boolean;
  estatusREP: "pendiente" | "generado" | "no_aplica";
}

export interface FinalizableService {
  id: string;
  cliente: string;
  clienteId: string;
  ruta: string;
  fechaEntrega: string;
  monto: number;
  tipoUnidad: string;
  facturado: boolean;
}

export type AgingCategory =
  | "corriente"
  | "vencido_1_30"
  | "vencido_31_60"
  | "incobrable";

export function getAgingCategory(invoice: ReceivableInvoice): AgingCategory {
  if (invoice.saldo_pendiente === 0) return "corriente";

  const today = new Date();
  const vencimiento = new Date(invoice.fecha_vencimiento);
  const diffDays = Math.floor(
    (today.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "corriente";
  if (diffDays <= 30) return "vencido_1_30";
  if (diffDays <= 60) return "vencido_31_60";
  return "incobrable";
}

export function getInvoiceStatusInfo(invoice: ReceivableInvoice): {
  status: "success" | "warning" | "danger" | "info";
  label: string;
} {
  if (invoice.saldo_pendiente === 0) {
    return { status: "success", label: "PAGADA" };
  }

  if (
    invoice.saldo_pendiente > 0 &&
    invoice.saldo_pendiente < invoice.monto_total
  ) {
    const agingCategory = getAgingCategory(invoice);
    if (agingCategory === "incobrable") {
      return { status: "danger", label: "PAGO PARCIAL (+90d)" };
    }
    return { status: "info", label: "PAGO PARCIAL" };
  }

  const agingCategory = getAgingCategory(invoice);

  switch (agingCategory) {
    case "vencido_1_30":
      return { status: "warning", label: "VENCIDA 1-30d" };
    case "vencido_31_60":
      return { status: "danger", label: "VENCIDA 31-60d" };
    case "incobrable":
      return { status: "danger", label: "ATRASADO +90d" };
    default:
      return { status: "warning", label: "POR COBRAR" };
  }
}

export function calculateDaysOverdue(fechaVencimiento: string): number {
  const today = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diffDays = Math.floor(
    (today.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, diffDays);
}
