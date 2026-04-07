// src/features/tires/types.ts
import type { TireResponse } from "@/api/generated";

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

export interface Tire extends TireResponse {
  /** Alias local — el backend envía `unit_id` */
  unidad_actual_id?: number | null;
  unidad_actual_economico?: string | null;
  historial?: TireHistoryEvent[];
}

export interface UnitTire extends Tire {
  unit_id?: number | null;
}
