import { InventoryItem } from "@/features/inventory/types";

// ==========================================
// ENUMS & CONSTANTS (Alineados a Python)
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
  apellido: string;
  especialidad: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fecha_nacimiento?: string; // ISO Date
  fecha_contratacion?: string; // ISO Date
  nss?: string;
  rfc?: string;
  salario_base: number;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  activo: boolean;
  foto_url?: string;
}

// ==========================================
// PARTES/REFACCIONES EN LA ORDEN (Model: WorkOrderPart)
// ==========================================

export interface WorkOrderPart {
  id: number;
  work_order_id: number;
  inventory_item_id: number;
  cantidad: number;
  costo_unitario_snapshot: number; // El precio que tenía al momento de usarla
  item?: InventoryItem; // Relación cargada del inventario
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

  fecha_apertura: string; // ISO DateTime
  fecha_cierre?: string | null; // ISO DateTime

  // Relaciones (Si el backend las incluye en el JSON)
  unit?: {
    numero_economico: string;
    placas: string;
    marca: string;
  };
  mechanic?: Partial<Mechanic>;
  parts?: WorkOrderPart[];

  // Auditoría (AuditMixin)
  created_at?: string;
  updated_at?: string;
}
