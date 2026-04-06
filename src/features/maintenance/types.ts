// src/features/maintenance/types.ts

import { InventoryItem } from "@/features/inventory/types";

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export type WorkOrderStatus =
  | "abierta"
  | "en_progreso"
  | "cerrada"
  | "cancelada";

export type MaintenanceType = "patio" | "ruta";

// ==========================================
// MECÁNICOS (Model: Mechanic)
// ==========================================

export interface Mechanic {
  id: number;
  nombre: string;
  apellido?: string | null;
  especialidad?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  fecha_nacimiento?: string | null;
  fecha_contratacion?: string | null;
  nss?: string | null;
  rfc?: string | null;
  salario_base: number;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
  activo: boolean;
  foto_url?: string | null;
}

// ==========================================
// DOCUMENTOS DE MECÁNICOS (Model: MechanicDocument)
// ==========================================

export interface MechanicDocument {
  id: number;
  mechanic_id: number;
  tipo_documento: string;
  nombre_archivo: string;
  url_archivo: string;
  fecha_vencimiento?: string | null;
  file_size?: number | null;
  subido_en?: string | null;

  // Auditoría
  record_status?: string;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// PARTES/REFACCIONES EN LA ORDEN (Model: WorkOrderPart)
// ==========================================

export interface WorkOrderPart {
  id: number;
  work_order_id: number;
  inventory_item_id: number;
  cantidad: number;
  costo_unitario_snapshot: number;

  item_sku?: string | null;
  item_descripcion?: string | null;

  // Relación cargada (Si tu backend lo anida)
  item?: InventoryItem;
}

// ==========================================
// ORDEN DE TRABAJO (Model: WorkOrder)
// ==========================================

export interface WorkOrder {
  id: number;
  folio: string;
  unit_id: number;
  mechanic_id?: number | null;
  trip_id?: number | null;

  tipo_mantenimiento: MaintenanceType;
  descripcion_problema: string;
  status: WorkOrderStatus;

  fecha_apertura?: string | null;
  fecha_cierre?: string | null;

  unit_numero?: string | null;
  mechanic_nombre?: string | null;

  unit?: {
    numero_economico: string;
    placas?: string;
    marca?: string;
  };
  mechanic?: Partial<Mechanic>;
  parts?: WorkOrderPart[];

  // Auditoría
  created_at?: string;
  updated_at?: string;
}
