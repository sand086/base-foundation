import axiosClient from "@/api/axiosClient";

// --- TIPOS (Snake Case) ---
export type UpdateInventoryPayload = Partial<CreateInventoryPayload>;

export interface InventoryItem {
  id: number;
  sku: string;
  descripcion: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string;
  precio_unitario: number;
}

export interface Mechanic {
  id: number;
  nombre: string;
  especialidad: string;
  activo: boolean;
}

export interface WorkOrderPart {
  id: number;
  inventory_item_id: number;
  cantidad: number;
  costo_unitario_snapshot: number;
  item_sku?: string; // Para mostrar en tabla
}

export interface WorkOrder {
  id: number;
  folio: string;
  unit_id: number;
  unit_numero?: string; // Viene del backend flatten
  mechanic_id?: number;
  mechanic_nombre?: string; // Viene del backend flatten
  descripcion_problema: string;
  status: "abierta" | "en_progreso" | "cerrada" | "cancelada";
  fecha_apertura: string;
  fecha_cierre?: string;
  parts: WorkOrderPart[];
}

// --- PAYLOADS ---

export interface CreateInventoryPayload {
  sku: string;
  descripcion: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string;
  precio_unitario: number;
}

export interface CreateWorkOrderPayload {
  unit_id: number;
  mechanic_id?: number;
  descripcion_problema: string;
  parts: { inventory_item_id: number; cantidad: number }[];
}

// --- SERVICIO ---

export const maintenanceService = {
  // Inventario
  getInventory: async (): Promise<InventoryItem[]> => {
    const { data } = await axiosClient.get("/maintenance/inventory");
    return data;
  },
  createInventoryItem: async (item: CreateInventoryPayload) => {
    const { data } = await axiosClient.post("/maintenance/inventory", item);
    return data;
  },
  deleteInventoryItem: async (id: number) => {
    await axiosClient.delete(`/maintenance/inventory/${id}`);
  },

  // Mecánicos
  getMechanics: async (): Promise<Mechanic[]> => {
    const { data } = await axiosClient.get("/maintenance/mechanics");
    return data;
  },

  // Órdenes
  getWorkOrders: async (): Promise<WorkOrder[]> => {
    const { data } = await axiosClient.get("/maintenance/work-orders");
    return data;
  },
  createWorkOrder: async (order: CreateWorkOrderPayload) => {
    const { data } = await axiosClient.post("/maintenance/work-orders", order);
    return data;
  },
  updateWorkOrderStatus: async (id: number, status: string) => {
    const { data } = await axiosClient.patch(
      `/maintenance/work-orders/${id}/status?status=${status}`,
    );
    return data;
  },
  updateInventoryItem: async (id: number, item: UpdateInventoryPayload) => {
    // Nota: enviamos item tal cual (snake_case)
    const { data } = await axiosClient.put(
      `/maintenance/inventory/${id}`,
      item,
    );
    return data;
  },
};
