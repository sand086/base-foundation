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

// 🚀 ACTUALIZADO: Posiciones numéricas para mapear directamente con el diagrama SVG y la BD
export const TIRE_POSITIONS = [
  { id: 1, label: "Posición 1 (Direccional Izq)", eje: 1, lado: "izquierda" },
  { id: 2, label: "Posición 2 (Direccional Der)", eje: 1, lado: "derecha" },
  {
    id: 3,
    label: "Posición 3 (Tracción 1 Izq Ext)",
    eje: 2,
    lado: "izquierda",
  },
  {
    id: 4,
    label: "Posición 4 (Tracción 1 Izq Int)",
    eje: 2,
    lado: "izquierda",
  },
  { id: 5, label: "Posición 5 (Tracción 1 Der Int)", eje: 2, lado: "derecha" },
  { id: 6, label: "Posición 6 (Tracción 1 Der Ext)", eje: 2, lado: "derecha" },
  {
    id: 7,
    label: "Posición 7 (Tracción 2 Izq Ext)",
    eje: 3,
    lado: "izquierda",
  },
  {
    id: 8,
    label: "Posición 8 (Tracción 2 Izq Int)",
    eje: 3,
    lado: "izquierda",
  },
  { id: 9, label: "Posición 9 (Tracción 2 Der Int)", eje: 3, lado: "derecha" },
  {
    id: 10,
    label: "Posición 10 (Tracción 2 Der Ext)",
    eje: 3,
    lado: "derecha",
  },
  { id: 0, label: "Repuesto", eje: 0, lado: "repuesto" }, // 0 para llanta de refacción
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
  posicion?: number | null; // 🚀 CAMBIO: Ahora es number
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
  posicion?: number | null; // 🚀 CAMBIO: Ahora es number

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
  unit_id: number | null;
  posicion: number | null; // 🚀 CAMBIO: Ahora es number
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
