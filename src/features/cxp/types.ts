// Types for Cuentas por Pagar (CxP) module

export interface PayableInvoice {
  id: string;
  proveedor: string;
  proveedorId: string;
  concepto: string;
  uuid: string;
  fechaEmision: string;
  diasCredito: number;
  fechaVencimiento: string;
  montoTotal: number;
  saldoPendiente: number;
  moneda: 'MXN' | 'USD';
  estatus: 'pendiente' | 'vencido' | 'pagado' | 'pago_parcial';
  pdfUrl?: string;
  xmlUrl?: string;
  pagos: InvoicePayment[];
}

export interface InvoicePayment {
  id: string;
  fecha: string;
  monto: number;
  cuentaRetiro: string;
  referencia: string;
}

export interface Supplier {
  id: string;
  razonSocial: string;
  rfc: string;
  contacto: string;
  telefono: string;
  giro: string;
  estatus: 'activo' | 'inactivo';
}

export type InvoiceStatus = 'pendiente' | 'vencido' | 'pagado' | 'pago_parcial';

export function getInvoiceStatusInfo(invoice: PayableInvoice): {
  status: 'success' | 'warning' | 'danger' | 'info';
  label: string;
} {
  if (invoice.saldoPendiente === 0) {
    return { status: 'success', label: 'PAGADO' };
  }
  
  if (invoice.saldoPendiente > 0 && invoice.saldoPendiente < invoice.montoTotal) {
    return { status: 'info', label: 'PAGO PARCIAL' };
  }
  
  const today = new Date();
  const vencimiento = new Date(invoice.fechaVencimiento);
  if (vencimiento < today) {
    return { status: 'danger', label: 'VENCIDO' };
  }
  
  return { status: 'warning', label: 'PENDIENTE' };
}

export function calculateDueDate(emissionDate: string, creditDays: number): string {
  const date = new Date(emissionDate);
  date.setDate(date.getDate() + creditDays);
  return date.toISOString().split('T')[0];
}
