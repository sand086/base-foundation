import axiosClient from "@/api/axiosClient";

// --- Tipos de Datos (Coinciden con la BD) ---

export interface TireHistoryEvent {
  id: number;
  fecha: string;
  tipo:
    | "compra"
    | "montaje"
    | "desmontaje"
    | "reparacion"
    | "renovado"
    | "rotacion"
    | "inspeccion"
    | "desecho";
  descripcion: string;
  unidad?: string;
  posicion?: string;
  km?: number;
  costo?: number;
  responsable: string;
}

export interface GlobalTire {
  id: number;
  codigo_interno: string;
  marca: string;
  modelo: string;
  medida: string;
  dot: string;

  // Ubicación
  unidad_actual_id?: number | null;
  unidad_actual_economico?: string | null;
  posicion?: string | null;

  // Estado
  estado: "nuevo" | "usado" | "renovado" | "desecho";
  estado_fisico: "buena" | "regular" | "mala";
  profundidad_actual: number;
  profundidad_original: number;
  km_recorridos: number;

  // Tracking
  fecha_compra: string;
  precio_compra: number;
  costo_acumulado: number;
  proveedor: string;

  historial?: TireHistoryEvent[];
}

export interface AssignTirePayload {
  unidad_id: number | null;
  posicion: string | null;
  notas?: string;
}

export interface MaintenanceTirePayload {
  tipo: string;
  costo: number;
  descripcion: string;
}

// --- SERVICIO ACTUALIZADO ---

export const tireService = {
  // Obtener todas
  getAll: async (): Promise<GlobalTire[]> => {
    const { data } = await axiosClient.get("/tires");
    return data;
  },

  // Obtener una
  getById: async (id: number): Promise<GlobalTire> => {
    const { data } = await axiosClient.get(`/tires/${id}`);
    return data;
  },

  // Crear
  create: async (tire: any): Promise<GlobalTire> => {
    const { data } = await axiosClient.post("/tires", tire);
    return data;
  },

  // Asignar
  assign: async (id: number, payload: AssignTirePayload): Promise<void> => {
    await axiosClient.post(`/tires/${id}/assign`, payload);
  },

  // Mantenimiento
  maintenance: async (
    id: number,
    payload: MaintenanceTirePayload,
  ): Promise<void> => {
    await axiosClient.post(`/tires/${id}/maintenance`, payload);
  },

  // --- NUEVOS MÉTODOS ---

  // Actualizar (Editar)
  update: async (id: number, data: any): Promise<GlobalTire> => {
    const { data: res } = await axiosClient.put(`/tires/${id}`, data);
    return res;
  },

  // Eliminar
  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/tires/${id}`);
  },
};
