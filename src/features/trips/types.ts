import type { TripResponse, TripLegResponse } from "@/api/generated";
import { SubClient } from "@/features/clients/types";

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
  time: string;
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
// TRIP LEGS
// ==========================================

export interface TripLeg extends TripLegResponse {
  trip?: Trip;
  saldo_operador?: number;
  fuel_logs?: any[];
}

// ==========================================
// MAIN TRIP — extends generated TripResponse
// ==========================================

export interface Trip extends TripResponse {
  sub_client?: SubClient;
  descripcion_mercancia: string;
  peso_toneladas: number;
  es_material_peligroso: boolean;
  clase_imo?: string | null;
  costo_casetas: number;
  legs?: TripLeg[];
  fuel_reconciled?: boolean;
  fuel_reconciliation_data?: {
    litros_vales: number;
    litros_ecm: number;
    diferencia: number;
    km_recorridos: number;
  };
}

// ==========================================
// PAYLOADS
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
// UTILIDADES
// ==========================================

export interface TripLite {
  id: number;
  folio: string;
  origin: string;
  destination: string;
}

// ==========================================
// TRACKING & MONITORING TYPES
// ==========================================

export interface StatusUpdateData {
  status: string;
  location: string;
  lat?: string;
  lng?: string;
  comments: string;
  notifyClient: boolean;
  timestamp: string;
  odometro?: string;
  combustible_porcentaje?: string;
  combustible_litros?: string;
  terminal_entrega_vacio?: string;
  fase_operativa: string;
}

export interface CachedLocation {
  address: string;
  lat: string;
  lng: string;
}

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}
