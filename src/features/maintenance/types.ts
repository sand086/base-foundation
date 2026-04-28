// src/features/maintenance/types.ts
import type { WorkOrderResponse } from "@/api/generated";
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
// MECÁNICOS
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
// DOCUMENTOS DE MECÁNICOS
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
  record_status?: string;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// PARTES/REFACCIONES EN LA ORDEN
// ==========================================

export interface WorkOrderPart {
  id: number;
  work_order_id: number;
  inventory_item_id: number;
  cantidad: number;
  costo_unitario_snapshot: number;
  item_sku?: string | null;
  item_descripcion?: string | null;
  item?: InventoryItem;
}

// ==========================================
// ORDEN DE TRABAJO — extends generated
// ==========================================

export interface WorkOrder extends WorkOrderResponse {
  trip_id?: number | null;
  tipo_mantenimiento?: MaintenanceType;
  unit?: {
    numero_economico: string;
    placas?: string;
    marca?: string;
  };
  mechanic?: Partial<Mechanic>;

  porcentaje_iva?: number;
  subtotal?: number;
  total?: number;
  costo_mano_obra?: number;
}
