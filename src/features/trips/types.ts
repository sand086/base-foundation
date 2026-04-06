// src/features/trips/types.ts

// 🚨 IMPORTANTE: Importamos las piezas que vienen de otros módulos
import { Unit } from "@/features/units/types";
import { Operator } from "@/features/operators/types";
import { Client, SubClient } from "@/features/clients/types";

// ==========================================
// ENUMS & LITERAL TYPES
// ==========================================

export type TripStatus =
  | "creado"
  | "en_transito"
  | "detenido"
  | "retraso"
  | "entregado"
  | "cerrado"
  | "accidente"
  | "bloqueado";

export type TripLegType = "carga_muelle" | "ruta_carretera" | "entrega_vacio";

// ==========================================
// TIMELINE & TRACKING
// ==========================================

export interface TripTimelineEvent {
  id: number;
  trip_leg_id: number;
  time: string; // ISO DateTime
  event: string;
  event_type: string;
  location?: string;
  lat?: string;
  lng?: string;
  comments?: string;
}

export interface TripTimelineEventCreatePayload {
  status: string;
  location: string;
  comments?: string;
  lat?: string;
  lng?: string;
  notifyClient?: boolean;
  odometro?: number | string;
  combustible_porcentaje?: number | string;
  combustible_litros?: number | string;
  terminal_entrega_vacio?: string;
  fase_operativa?: string;
}

// ==========================================
// TRIP LEGS (Tramos del viaje)
// ==========================================

export interface TripLeg {
  id: number;
  trip_id: number;
  leg_type: TripLegType;
  status: TripStatus;

  // Relaciones
  unit_id?: number | null;
  operator_id?: number | null;
  unit?: Unit;
  operator?: Operator;
  trip?: Trip;

  // Finanzas del Tramo
  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;
  otros_anticipos: number;
  saldo_operador: number;

  // Control Operativo
  odometro_inicial: number;
  odometro_final?: number | null;
  rendimiento_real?: number | null;
  nivel_tanque_inicial: number;

  // Tiempos y Ubicación
  start_date?: string | null;
  actual_arrival?: string | null;
  last_location?: string | null;
  last_update?: string | null;

  timeline_events?: TripTimelineEvent[];
}

// ==========================================
// MAIN TRIP (Viaje Maestro)
// ==========================================

export interface Trip {
  id: number;
  public_id?: string;
  uuid_fiscal?: string;

  // Relaciones Comerciales
  client_id: number;
  sub_client_id: number;
  tariff_id?: number | null;
  client?: Client;
  sub_client?: SubClient;

  // Activos Asignados
  remolque_1_id?: number | null;
  dolly_id?: number | null;
  remolque_2_id?: number | null;
  remolque_1?: Unit;
  dolly?: Unit;
  remolque_2?: Unit;

  // Ruta y Estatus
  origin: string;
  destination: string;
  route_name?: string;
  status: TripStatus;

  // Datos de Carga
  descripcion_mercancia: string;
  peso_toneladas: number;
  es_material_peligroso: boolean;
  clase_imo?: string | null;

  // Datos Fiscales (SAT)
  sat_clave_producto?: string;
  sat_clave_unidad?: string;
  mercancia_clave_stcc?: string;

  // Tiempos
  start_date: string;
  closed_at?: string | null;
  fecha_programada?: string | null;

  // Resumen Financiero
  tarifa_base: number;
  costo_casetas: number;

  // Operación Detallada
  legs?: TripLeg[];

  // Conciliación de Combustible
  fuel_reconciled?: boolean;
  fuel_reconciliation_data?: {
    litros_vales: number;
    litros_ecm: number;
    diferencia: number;
    km_recorridos: number;
  };
}

// ==========================================
// PAYLOADS (Para creación y actualización)
// ==========================================

export interface TripLegCreatePayload {
  leg_type: TripLegType;
  unit_id?: number | null;
  operator_id?: number | null;
  odometro_inicial: number;
  nivel_tanque_inicial: number;
  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;
}

export interface TripCreatePayload {
  client_id: number;
  sub_client_id: number;
  tariff_id?: number | null;
  origin: string;
  destination: string;
  route_name?: string | null;
  remolque_1_id?: number | null;
  dolly_id?: number | null;
  remolque_2_id?: number | null;
  tarifa_base: number;
  costo_casetas?: number;
  status: TripStatus;
  start_date: string;
  referencia?: string;
  initial_leg: TripLegCreatePayload;
}

// ==========================================
// UTILIDADES (Lites / Vistas rápidas)
// ==========================================

export interface TripLite {
  id: number;
  folio: string; // public_id o formato interno
  origin: string;
  destination: string;
}
