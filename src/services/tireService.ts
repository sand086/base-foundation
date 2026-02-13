import axiosClient from "@/api/axiosClient";

export const getTireLifePercentage = (tire: GlobalTire): number => {
  if (tire.profundidad_original === 0) return 0;
  // Usamos _snake_case
  return Math.round(
    (tire.profundidad_actual / tire.profundidad_original) * 100,
  );
};

export const getTireSemaphoreStatus = (
  tire: GlobalTire,
): { color: string; bgColor: string; label: string } => {
  const depth = tire.profundidad_actual; // Usamos _snake_case

  if (depth < 5)
    return {
      color: "text-white",
      bgColor: "bg-red-600", // Tailwind directo para asegurar color
      label: "Crítico",
    };
  if (depth <= 10)
    return {
      color: "text-black",
      bgColor: "bg-amber-400",
      label: "Atención",
    };
  return { color: "text-white", bgColor: "bg-emerald-600", label: "Óptimo" };
};

export const getEstadoFisicoBadge = (
  estado: string,
): { variant: "default" | "secondary" | "destructive"; label: string } => {
  switch (estado) {
    case "buena":
      return { variant: "default", label: "Buena" };
    case "regular":
      return { variant: "secondary", label: "Regular" };
    case "mala":
      return { variant: "destructive", label: "Mala" };
    default:
      return { variant: "secondary", label: estado };
  }
};

export const getEstadoBadge = (
  estado: string,
): { className: string; label: string } => {
  switch (estado) {
    case "nuevo":
      return { className: "bg-emerald-100 text-emerald-700", label: "Nuevo" };
    case "usado":
      return { className: "bg-blue-100 text-blue-700", label: "Usado" };
    case "renovado":
      return { className: "bg-purple-100 text-purple-700", label: "Renovado" };
    case "desecho":
      return { className: "bg-rose-100 text-rose-700", label: "Desecho" };
    default:
      return { className: "bg-gray-100 text-gray-700", label: estado };
  }
};

// Tire positions for trucks (Esto se mantiene igual)
export const TIRE_POSITIONS = [
  { id: "e1-izq", label: "Eje 1 Izquierda", eje: 1, lado: "izquierda" },
  { id: "e1-der", label: "Eje 1 Derecha", eje: 1, lado: "derecha" },
  { id: "e2-izq", label: "Eje 2 Izquierda", eje: 2, lado: "izquierda" },
  { id: "e2-der", label: "Eje 2 Derecha", eje: 2, lado: "derecha" },
  { id: "e3-izq-ext", label: "Eje 3 Izquierda Ext", eje: 3, lado: "izquierda" },
  { id: "e3-izq-int", label: "Eje 3 Izquierda Int", eje: 3, lado: "izquierda" },
  { id: "e3-der-int", label: "Eje 3 Derecha Int", eje: 3, lado: "derecha" },
  { id: "e3-der-ext", label: "Eje 3 Derecha Ext", eje: 3, lado: "derecha" },
  { id: "repuesto", label: "Repuesto", eje: 0, lado: "repuesto" },
];

export type TireHistoryEventType =
  | "compra"
  | "montaje"
  | "desmontaje"
  | "reparacion"
  | "renovado"
  | "rotacion"
  | "inspeccion"
  | "desecho"
  | "edicion";

export interface TireHistoryEvent {
  id: number;
  fecha: string;
  tipo: TireHistoryEventType;
  descripcion: string;
  unidad?: string;
  unidad_economico?: string;
  posicion?: string;
  km?: number;
  costo?: number;
  responsable?: string;
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
