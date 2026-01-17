// Tire Inventory Types

export interface TireHistoryEvent {
  id: string;
  fecha: Date;
  tipo: 'compra' | 'montaje' | 'desmontaje' | 'reparacion' | 'renovado' | 'rotacion' | 'inspeccion' | 'desecho';
  descripcion: string;
  unidad?: string;
  posicion?: string;
  km?: number;
  costo?: number;
  responsable: string;
}

export interface GlobalTire {
  id: string;
  codigoInterno: string;
  marca: string;
  modelo: string;
  medida: string;
  dot: string; // Week/Year of manufacture
  
  // Current location
  unidadActual: string | null; // null = stock/almacén
  posicion: string | null;
  
  // Condition
  estado: 'nuevo' | 'usado' | 'renovado' | 'desecho';
  estadoFisico: 'buena' | 'regular' | 'mala';
  profundidadActual: number; // mm
  profundidadOriginal: number; // mm
  kmRecorridos: number;
  
  // Tracking
  fechaCompra: Date;
  precioCompra: number;
  costoAcumulado: number;
  proveedor: string;
  
  // History
  historial: TireHistoryEvent[];
}

export interface TirePosition {
  id: string;
  label: string;
  eje: number;
  lado: 'izquierda' | 'derecha' | 'repuesto';
}

export interface FleetUnit {
  id: string;
  numeroEconomico: string;
  tipo: 'tractocamion' | 'remolque' | 'dolly';
}

// Status helpers
export const getTireLifePercentage = (tire: GlobalTire): number => {
  if (tire.profundidadOriginal === 0) return 0;
  return Math.round((tire.profundidadActual / tire.profundidadOriginal) * 100);
};

export const getTireSemaphoreStatus = (tire: GlobalTire): { color: string; bgColor: string; label: string } => {
  const depth = tire.profundidadActual;
  if (depth < 5) return { color: 'text-white', bgColor: 'bg-status-danger', label: 'Crítico' };
  if (depth <= 10) return { color: 'text-black', bgColor: 'bg-status-warning', label: 'Atención' };
  return { color: 'text-white', bgColor: 'bg-status-success', label: 'Óptimo' };
};

export const getEstadoFisicoBadge = (estado: GlobalTire['estadoFisico']): { variant: 'default' | 'secondary' | 'destructive'; label: string } => {
  switch (estado) {
    case 'buena': return { variant: 'default', label: 'Buena' };
    case 'regular': return { variant: 'secondary', label: 'Regular' };
    case 'mala': return { variant: 'destructive', label: 'Mala' };
  }
};

export const getEstadoBadge = (estado: GlobalTire['estado']): { className: string; label: string } => {
  switch (estado) {
    case 'nuevo': return { className: 'bg-emerald-100 text-emerald-700', label: 'Nuevo' };
    case 'usado': return { className: 'bg-blue-100 text-blue-700', label: 'Usado' };
    case 'renovado': return { className: 'bg-amber-100 text-amber-700', label: 'Renovado' };
    case 'desecho': return { className: 'bg-rose-100 text-rose-700', label: 'Desecho' };
  }
};

// Tire positions for trucks
export const TIRE_POSITIONS: TirePosition[] = [
  { id: 'e1-izq', label: 'Eje 1 Izquierda', eje: 1, lado: 'izquierda' },
  { id: 'e1-der', label: 'Eje 1 Derecha', eje: 1, lado: 'derecha' },
  { id: 'e2-izq', label: 'Eje 2 Izquierda', eje: 2, lado: 'izquierda' },
  { id: 'e2-der', label: 'Eje 2 Derecha', eje: 2, lado: 'derecha' },
  { id: 'e3-izq-ext', label: 'Eje 3 Izquierda Ext', eje: 3, lado: 'izquierda' },
  { id: 'e3-izq-int', label: 'Eje 3 Izquierda Int', eje: 3, lado: 'izquierda' },
  { id: 'e3-der-int', label: 'Eje 3 Derecha Int', eje: 3, lado: 'derecha' },
  { id: 'e3-der-ext', label: 'Eje 3 Derecha Ext', eje: 3, lado: 'derecha' },
  { id: 'repuesto', label: 'Repuesto', eje: 0, lado: 'repuesto' },
];
