import axiosClient from "@/api/axiosClient";

// 1. Interfaces Base
export interface Unidad {
  id?: string; // Opcional al crear
  numero_economico: string;
  placas: string;
  vin?: string;
  marca: string;
  modelo: string;
  year?: number;
  tipo: string; // Tipo original
  tipo_1?: string; // NUEVO: Tractocamion, Remolque, etc.
  tipo_carga?: string; // NUEVO: IMO, General
  status: "disponible" | "en_ruta" | "mantenimiento" | "bloqueado";

  // Fechas de vencimiento
  seguro_vence?: string;
  verificacion_humo?: string;
  verificacion_fisico_mecanica?: string;

  // Referencias a archivos (solo strings por ahora)
  tarjeta_circulacion_ref?: string;
}

// 2. Interfaz Extendida para la Vista de Detalles (Incluye Docs y Llantas)
export interface UnidadDetalle extends Unidad {
  documents: Array<{
    name: string;
    estatus: "vigente" | "próximo" | "vencido";
    vencimiento: string;
    obligatorio: boolean;
  }>;
  tires: Array<{
    id: string;
    position: string;
    marca: string;
    profundidad: number;
    estado: "bueno" | "regular" | "malo";
    renovado: number;
    marcajeInterno: string;
  }>;
}

// 3. Servicio Completo
export const unitService = {
  getAll: async () => {
    const response = await axiosClient.get<Unidad[]>("/units");
    return response.data;
  },

  create: async (unit: Omit<Unidad, "id">) => {
    const response = await axiosClient.post<Unidad>("/units", unit);
    return response.data;
  },

  update: async (id: string, unit: Partial<Unidad>) => {
    const response = await axiosClient.put<Unidad>(`/units/${id}`, unit);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axiosClient.delete(`/units/${id}`);
    return response.data;
  },

  // --- NUEVO MÉTODO QUE LLAMA EL HOOK ---
  importBulk: async (file: File) => {
    console.log("--> SERVICIO: Iniciando carga de archivo", file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("--> SERVICIO: Enviando POST a /units/bulk-upload");
      const response = await axiosClient.post("/units/bulk-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("--> SERVICIO: Respuesta recibida", response.data);
      return response.data;
    } catch (error) {
      console.error("--> SERVICIO ERROR:", error);
      throw error;
    }
  },
};
