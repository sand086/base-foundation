// src/features/settings/types.ts

// ==========================================
// CONFIGURACIÓN DEL SISTEMA
// ==========================================
export interface SystemConfig {
  key: string;
  value: string;
  grupo: string;
  tipo: "string" | "number" | "boolean" | "json";
  is_public: boolean;
}

export interface UpdateConfigPayload {
  value: string;
}

// ==========================================
// CATÁLOGOS MAESTROS (Master Data)
// ==========================================

/** Traducido de TipoUnidad */
export interface UnitType {
  id: string;
  nombre: string;
  icono: string;
  activo: boolean;
  descripcion?: string;
}

/** Marcas de vehículos/llantas */
export interface Brand {
  id: number;
  nombre: string;
  tipo_activo: string; // TRACTO, REMOLQUE, AMBOS
}

/** Traducido de LicenseType */
export interface LicenseType {
  id?: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/** Catálogo de Aseguradoras */
export interface Insurer {
  id?: number;
  nombre: string;
  telefono_siniestros?: string;
  activo: boolean;
}

/** Conceptos de Liquidación (Basado en tu modelo SQLAlchemy) */
export interface SettlementConcept {
  id: number;
  nombre: string;
  tipo: "ingreso" | "deduccion";
  descripcion?: string;
  activo: boolean;
}

// ==========================================
// NOTIFICACIONES Y ALERTAS
// ==========================================

export interface NotificationEvent {
  id: string;
  nombre: string;
  descripcion: string;
  canales: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  prioridad: "baja" | "media" | "alta" | "critica";
}

/** Configuración de umbrales de alerta */
export interface AlertConfig {
  id: number;
  alerta_combustible: boolean;
  umbral_combustible: number;
  alerta_documento_vencido: boolean;
  dias_anticipacion_documento: number;
  alerta_retraso_viaje: boolean;
  minutos_retraso: number;
}
