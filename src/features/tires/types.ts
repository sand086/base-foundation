// src/features/llantas/types.ts

export type TireHistoryEventType =
  | "compra"
  | "montaje"
  | "desmontaje"
  | "reparacion"
  | "renovado"
  | "rotacion"
  | "inspeccion"
  | "desecho"
  | "edicion";

export interface TireHistoryEvent {
  id: number;
  fecha: string;
  tipo: TireHistoryEventType;
  descripcion: string;
  unidad?: string;
  unidad_economico?: string;
  posicion?: number | null;
  km?: number;
  costo?: number;
  responsable?: string;
}

export interface Tire {
  id: number;
  codigo_interno: string;
  marca: string;
  modelo: string;
  medida: string;
  dot: string;
  unidad_actual_id?: number | null;
  unidad_actual_economico?: string | null;
  posicion?: number | null;
  estado: "nuevo" | "usado" | "renovado" | "desecho";
  estado_fisico: "buena" | "regular" | "mala";
  profundidad_actual: number;
  profundidad_original: number;
  km_recorridos: number;
  fecha_compra?: string;
  precio_compra?: number;
  costo_acumulado?: number;
  proveedor?: string;
  historial?: TireHistoryEvent[];
}

export interface UnitTire extends Tire {
  unit_id?: number | null;
}
