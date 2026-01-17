// Types for Cuentas por Pagar (CxP) module

// Financial Classification Types
export type ClasificacionFinanciera = 
  | 'costo_directo_viaje'
  | 'costo_mantenimiento'
  | 'gasto_indirecto_fijo'
  | 'gasto_indirecto_variable';

export interface IndirectCategory {
  id: string;
  nombre: string;
  tipo: 'fijo' | 'variable';
}

// Default indirect expense categories
export const defaultIndirectCategories: IndirectCategory[] = [
  { id: 'cat-001', nombre: 'Renta', tipo: 'fijo' },
  { id: 'cat-002', nombre: 'Sueldos Administrativos', tipo: 'fijo' },
  { id: 'cat-003', nombre: 'Seguros de Oficina', tipo: 'fijo' },
  { id: 'cat-004', nombre: 'Servicios Públicos', tipo: 'fijo' },
  { id: 'cat-005', nombre: 'Papelería', tipo: 'variable' },
  { id: 'cat-006', nombre: 'Reparaciones Locativas', tipo: 'variable' },
  { id: 'cat-007', nombre: 'Insumos Oficina', tipo: 'variable' },
  { id: 'cat-008', nombre: 'Suscripciones Software', tipo: 'fijo' },
];

export function getClasificacionLabel(clasificacion: ClasificacionFinanciera): string {
  switch (clasificacion) {
    case 'costo_directo_viaje': return 'Costo Directo de Viaje';
    case 'costo_mantenimiento': return 'Costo de Mantenimiento';
    case 'gasto_indirecto_fijo': return 'Gasto Indirecto Fijo';
    case 'gasto_indirecto_variable': return 'Gasto Indirecto Variable';
  }
}

export function getClasificacionColor(clasificacion: ClasificacionFinanciera): string {
  switch (clasificacion) {
    case 'costo_directo_viaje': return 'bg-blue-100 text-blue-700';
    case 'costo_mantenimiento': return 'bg-amber-100 text-amber-700';
    case 'gasto_indirecto_fijo': return 'bg-slate-100 text-slate-700';
    case 'gasto_indirecto_variable': return 'bg-purple-100 text-purple-700';
  }
}

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
  
  // Financial Classification
  clasificacion?: ClasificacionFinanciera;
  viajeId?: string; // Required when clasificacion === 'costo_directo_viaje'
  unidadId?: string; // Required when clasificacion === 'costo_mantenimiento'
  categoriaIndirectoId?: string; // For indirect expenses
  
  // Origin from Compras
  ordenCompraId?: string;
  ordenCompraFolio?: string;
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

// Mock data for trips and units (for linking)
export interface MockTrip {
  id: string;
  folio: string;
  origen: string;
  destino: string;
  fecha: string;
}

export interface MockUnit {
  id: string;
  economico: string;
  tipo: string;
  placas: string;
}

export const mockTrips: MockTrip[] = [
  { id: 'VJ-001', folio: 'VJ-2025-0001', origen: 'CDMX', destino: 'Monterrey', fecha: '2025-01-10' },
  { id: 'VJ-002', folio: 'VJ-2025-0002', origen: 'Veracruz', destino: 'Guadalajara', fecha: '2025-01-12' },
  { id: 'VJ-003', folio: 'VJ-2025-0003', origen: 'Querétaro', destino: 'Tijuana', fecha: '2025-01-14' },
  { id: 'VJ-004', folio: 'VJ-2025-0004', origen: 'Mérida', destino: 'CDMX', fecha: '2025-01-15' },
];

export const mockUnits: MockUnit[] = [
  { id: 'U-001', economico: 'T-01', tipo: 'Tractocamión', placas: 'ABC-123' },
  { id: 'U-002', economico: 'T-02', tipo: 'Tractocamión', placas: 'DEF-456' },
  { id: 'U-003', economico: 'R-01', tipo: 'Remolque', placas: 'GHI-789' },
  { id: 'U-004', economico: 'T-03', tipo: 'Tractocamión', placas: 'JKL-012' },
];
