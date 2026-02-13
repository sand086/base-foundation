import axiosClient from "@/api/axiosClient";
// Asegúrate de importar la interfaz base correcta
import { Unidad } from "@/types/api.types";

// --- Interfaces Extendidas ---
// Definimos los tipos para las llantas y documentos aquí para reutilizarlos
export interface UnitDocument {
  key: string;
  name: string;
  url?: string;
  estatus: "vigente" | "próximo" | "vencido";
  vencimiento: string;
  obligatorio: boolean;
}

export interface UnitTire {
  id?: number;
  position: string;
  marca?: string;
  profundidad: number;
  estado: string; // 'nuevo', 'usado', etc.
  renovado: number;
  tire_id?: number; // Corregido a number si el ID de llanta es int
  marcajeInterno?: string;
}

export interface UnidadDetalle extends Unidad {
  documents: UnitDocument[];
  tires: UnitTire[];
}

export const unitService = {
  // 1. Obtener todas
  getAll: async () => {
    const response = await axiosClient.get<Unidad[]>("/units");
    return response.data;
  },

  // 2. Obtener una por ID (Standard REST)
  // NOTA: Si tu backend soporta buscar por "ECO-001" en la URL, cambia esto a string.
  // Pero lo estándar es buscar por ID numérico.
  getById: async (id: number) => {
    const response = await axiosClient.get<UnidadDetalle>(`/units/${id}`);
    return response.data;
  },

  // 3. Crear
  create: async (unit: Omit<Unidad, "id" | "public_id">) => {
    const response = await axiosClient.post<Unidad>("/units", unit);
    return response.data;
  },

  // 4. Actualizar (Usamos number para el ID)
  update: async (id: number, unit: Partial<Unidad>) => {
    const response = await axiosClient.put<Unidad>(`/units/${id}`, unit);
    return response.data;
  },

  // 5. Eliminar (Usamos number para el ID)
  delete: async (id: number) => {
    const response = await axiosClient.delete(`/units/${id}`);
    return response.data;
  },

  // 6. Carga Masiva
  importBulk: async (file: File) => {
    console.log("--> SERVICIO: Iniciando carga de archivo", file.name);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Ajusta la respuesta según lo que devuelva tu backend (ej. { processed: 10 })
      const response = await axiosClient.post<{
        records: number;
        details: string;
      }>("/units/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("--> SERVICIO ERROR:", error);
      throw error;
    }
  },

  // 7. Subir Documentos
  // CAMBIO IMPORTANTE: Usamos 'id' (number) en lugar de 'numero_economico'
  uploadDocument: async (id: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post(
      `/units/${id}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  // 8. Actualizar Llantas
  // CAMBIO: Usamos 'id' y tipamos el array de llantas
  updateTires: async (id: number, tires: UnitTire[]) => {
    const response = await axiosClient.put(`/units/${id}/tires`, tires);
    return response.data;
  },
};
