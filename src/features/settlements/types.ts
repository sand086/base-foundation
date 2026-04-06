// src/features/combustible/types.ts

export type FuelType = "diesel" | "urea";

export interface FuelLoad {
  id: number;
  trip_id?: number | null;
  unit_id: number;
  operator_id: number;
  fecha_hora: string;
  estacion: string;
  tipo_combustible: FuelType;
  litros: number;
  precio_por_litro: number;
  total: number;
  odometro: number;
  evidencia_url?: string;
  is_verified: boolean;
}

export interface FuelLog {
  id: number;
  unit_id: number;
  operator_id: number;
  trip_leg_id?: number | null;
  fecha_hora: string;
  estacion: string;
  tipo_combustible: string;
  litros: number;
  precio_por_litro: number;
  total: number;
  odometro: number;
  evidencia_url?: string;
  excede_tanque: boolean;
  capacidad_tanque_snapshot?: number;
}

export interface SettlementReceipt {
  id: number;
  trip_id: number;
  monto_total: number;
  fecha_liquidacion: string;
  estatus: "pendiente" | "liquidado";
}

/** * Traducido de ConceptoPago.
 * Representa los conceptos de ingresos o deducciones (Viáticos, Maniobras, etc.)
 */
export interface SettlementConcept {
  id: number;
  nombre: string;
  tipo: "ingreso" | "deduccion";
  descripcion?: string;
  activo: boolean;
}

export interface TripSettlement {
  id: number;
  trip_id: number;
  operador_nombre: string;
  unidad_numero: string;
  ruta: string;
  fecha_viaje: string;
  fecha_liquidacion: string;
  kms_recorridos: number;
  estatus: "pendiente" | "liquidado";

  // Detalle de conceptos
  conceptos: SettlementItem[];

  // Totales calculados
  total_ingresos: number;
  total_deducciones: number;
  neto_a_pagar: number;
}
/**
 * Representa un concepto ya aplicado a una liquidación específica
 */
export interface SettlementItem {
  id: number;
  descripcion: string; // Ej: "Bono por puntualidad"
  monto: number;
  tipo: "ingreso" | "deduccion";
  referencia?: string;
  categoria?: string;
}

export const FUEL_CONFIG = {
  PRECIOS_PROMEDIO: {
    diesel: 23.85,
    urea: 18.5,
  },
  CAPACIDADES_DEFAULT: {
    diesel: 800,
    urea: 60,
  },
};
