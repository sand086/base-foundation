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
