// Purchase Order Types

export type OrderType = 'compra' | 'servicio' | 'gasto_indirecto';
export type OrderStatus = 'borrador' | 'pendiente_aprobacion' | 'aprobada' | 'recibida' | 'cancelada';
export type CostCenter = 'mantenimiento' | 'operativo' | 'administrativo';
export type IndirectCategory = 'papeleria' | 'renta' | 'limpieza' | 'servicios' | 'otros';

export interface OrderItem {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  folio: string;
  tipo: OrderType;
  proveedorId: string;
  proveedorNombre: string;
  solicitante: string;
  fechaCreacion: Date;
  fechaRequerida: Date;
  centroCostos: CostCenter;
  categoriaIndirecto?: IndirectCategory;
  
  // Items
  items: OrderItem[];
  descripcionServicio?: string;
  
  // Economic
  subtotal: number;
  iva: number;
  total: number;
  moneda: 'MXN' | 'USD';
  
  // Status
  estatus: OrderStatus;
  fechaAprobacion?: Date;
  aprobadoPor?: string;
  fechaRecepcion?: Date;
  recepcionCompleta?: boolean;
  notasRecepcion?: string;
  
  // Conversion to CxP
  convertidoACxP: boolean;
  cxpId?: string;
}

export interface Supplier {
  id: string;
  nombre: string;
  rfc: string;
  tipo: 'refacciones' | 'servicios' | 'general';
}

export interface InventoryItem {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  precioPromedio: number;
  stockActual: number;
  stockMinimo: number;
}

// Helpers
export const getOrderTypeLabel = (tipo: OrderType): string => {
  switch (tipo) {
    case 'compra': return 'Orden de Compra';
    case 'servicio': return 'Orden de Servicio';
    case 'gasto_indirecto': return 'Gasto Indirecto';
  }
};

export const getOrderTypeColor = (tipo: OrderType): string => {
  switch (tipo) {
    case 'compra': return 'bg-blue-100 text-blue-700';
    case 'servicio': return 'bg-purple-100 text-purple-700';
    case 'gasto_indirecto': return 'bg-slate-100 text-slate-700';
  }
};

export const getStatusInfo = (estatus: OrderStatus): { label: string; className: string } => {
  switch (estatus) {
    case 'borrador': 
      return { label: 'Borrador', className: 'bg-slate-100 text-slate-700' };
    case 'pendiente_aprobacion': 
      return { label: 'Pendiente Aprobación', className: 'bg-amber-100 text-amber-700' };
    case 'aprobada': 
      return { label: 'Aprobada', className: 'bg-emerald-100 text-emerald-700' };
    case 'recibida': 
      return { label: 'Recibida', className: 'bg-blue-100 text-blue-700' };
    case 'cancelada': 
      return { label: 'Cancelada', className: 'bg-rose-100 text-rose-700' };
  }
};

export const getCostCenterLabel = (cc: CostCenter): string => {
  switch (cc) {
    case 'mantenimiento': return 'Mantenimiento';
    case 'operativo': return 'Operativo';
    case 'administrativo': return 'Administrativo / Indirecto';
  }
};

export const getIndirectCategoryLabel = (cat: IndirectCategory): string => {
  switch (cat) {
    case 'papeleria': return 'Papelería';
    case 'renta': return 'Renta';
    case 'limpieza': return 'Limpieza';
    case 'servicios': return 'Servicios Públicos';
    case 'otros': return 'Otros';
  }
};
