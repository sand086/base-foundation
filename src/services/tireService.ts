import axiosClient from "@/api/axiosClient";

// --- Tipos de Datos (Coinciden con la BD) ---

export interface TireHistoryEvent {
  id: number;
  fecha: string; // ISO String
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
  unidad?: string; // Placas o Económico para display
  posicion?: string;
  km?: number;
  costo?: number;
  responsable: string;
}

export interface GlobalTire {
  id: number;
  codigo_interno: string; // Antes codigoInterno
  marca: string;
  modelo: string;
  medida: string;
  dot: string;

  // Ubicación
  unidad_actual_id?: number | null; // ID de la unidad
  unidad_actual_economico?: string | null; // Nombre de la unidad (para mostrar)
  posicion?: string | null;

  // Estado
  estado: "nuevo" | "usado" | "renovado" | "desecho";
  estado_fisico: "buena" | "regular" | "mala"; // Antes estadoFisico
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

// --- Payloads para acciones ---

export interface AssignTirePayload {
  unidad_id: number | null; // ID real de la unidad
  posicion: string | null;
  notas?: string;
}

export interface MaintenanceTirePayload {
  tipo: string; // reparacion, renovado, desecho
  costo: number;
  descripcion: string;
}

// --- Servicio ---

export const tireService = {
  // Obtener todas las llantas
  getAll: async (): Promise<GlobalTire[]> => {
    const { data } = await axiosClient.get("/tires");
    return data;
  },

  // Obtener una sola (con historial completo)
  getById: async (id: number): Promise<GlobalTire> => {
    const { data } = await axiosClient.get(`/tires/${id}`);
    return data;
  },

  // Crear nueva llanta
  create: async (
    tire: Omit<GlobalTire, "id" | "historial">,
  ): Promise<GlobalTire> => {
    const { data } = await axiosClient.post("/tires", tire);
    return data;
  },

  // Asignar / Montar / Desmontar
  assign: async (id: number, payload: AssignTirePayload): Promise<void> => {
    await axiosClient.post(`/tires/${id}/assign`, payload);
  },

  // Registrar Mantenimiento
  maintenance: async (
    id: number,
    payload: MaintenanceTirePayload,
  ): Promise<void> => {
    await axiosClient.post(`/tires/${id}/maintenance`, payload);
  },

  // Eliminar (solo si no tiene historial crítico, usualmente se usa desecho)
  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/tires/${id}`);
  },
};
