// Types for Cuentas por Cobrar (CxC) module

export interface ReceivableInvoice {
  id: string;
  folio: string;
  clienteId: string;
  cliente: string;
  clienteRfc: string;
  conceptos: InvoiceConcept[];
  montoTotal: number;
  saldoPendiente: number;
  moneda: 'MXN' | 'USD';
  fechaEmision: string;
  fechaVencimiento: string;
  diasCredito: number;
  estatus: 'corriente' | 'vencida' | 'pagada' | 'pago_parcial';
  serviciosRelacionados: string[]; // IDs of trips/services
  cobros: InvoicePayment[];
  requiereREP: boolean;
  comprobantePagoUrl?: string;
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
  estatusREP: 'pendiente' | 'generado' | 'no_aplica';
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

export type AgingCategory = 'corriente' | 'vencido_1_30' | 'vencido_31_60' | 'incobrable';

export function getAgingCategory(invoice: ReceivableInvoice): AgingCategory {
  if (invoice.saldoPendiente === 0) return 'corriente';
  
  const today = new Date();
  const vencimiento = new Date(invoice.fechaVencimiento);
  const diffDays = Math.floor((today.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 'corriente';
  if (diffDays <= 30) return 'vencido_1_30';
  if (diffDays <= 60) return 'vencido_31_60';
  return 'incobrable';
}

export function getInvoiceStatusInfo(invoice: ReceivableInvoice): {
  status: 'success' | 'warning' | 'danger' | 'info';
  label: string;
} {
  if (invoice.saldoPendiente === 0) {
    return { status: 'success', label: 'PAGADA' };
  }
  
  if (invoice.saldoPendiente > 0 && invoice.saldoPendiente < invoice.montoTotal) {
    const agingCategory = getAgingCategory(invoice);
    if (agingCategory === 'incobrable') {
      return { status: 'danger', label: 'PAGO PARCIAL (+90d)' };
    }
    return { status: 'info', label: 'PAGO PARCIAL' };
  }
  
  const agingCategory = getAgingCategory(invoice);
  
  switch (agingCategory) {
    case 'vencido_1_30':
      return { status: 'warning', label: 'VENCIDA 1-30d' };
    case 'vencido_31_60':
      return { status: 'danger', label: 'VENCIDA 31-60d' };
    case 'incobrable':
      return { status: 'danger', label: 'INCOBRABLE +90d' };
    default:
      return { status: 'warning', label: 'POR COBRAR' };
  }
}

export function calculateDaysOverdue(fechaVencimiento: string): number {
  const today = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diffDays = Math.floor((today.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
