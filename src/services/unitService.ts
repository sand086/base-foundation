import axiosClient from "@/api/axiosClient";
import { Unidad } from "@/types/api.types";
// 1. Interfaces Base
export interface UnidadDetalle extends Unidad {
  documents: Array<{
    key: string;
    name: string;
    url?: string;
    estatus: "vigente" | "próximo" | "vencido";
    vencimiento: string;
    obligatorio: boolean;
  }>;
  tires: Array<{
    id?: number;
    position: string;
    marca?: string;
    profundidad: number;
    estado: string;
    renovado: number;
    tire_id?: string;
    marcajeInterno?: string;
  }>;
}
export const unitService = {
  getAll: async () => {
    const response = await axiosClient.get<Unidad[]>("/units");
    return response.data;
  },

  getBynumero_economico: async (term: string) => {
    const response = await axiosClient.get<Unidad>(`/units/${term}`);
    return response.data;
  },

  create: async (unit: Omit<Unidad, "id" | "public_id">) => {
    const response = await axiosClient.post<Unidad>("/units", unit);
    return response.data;
  },

  update: async (id: string | number, unit: Partial<Unidad>) => {
    const response = await axiosClient.put<Unidad>(`/units/${id}`, unit);
    return response.data;
  },

  delete: async (id: string | number) => {
    const response = await axiosClient.delete(`/units/${id}`);
    return response.data;
  },

  importBulk: async (file: File) => {
    console.log("--> SERVICIO: Iniciando carga de archivo", file.name);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axiosClient.post("/units/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("--> SERVICIO ERROR:", error);
      throw error;
    }
  },

  uploadDocument: async (
    numero_economico: string,
    docType: string,
    file: File,
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post(
      `/units/${numero_economico}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  updateTires: async (numero_economico: string, tires: any[]) => {
    const response = await axiosClient.put(
      `/units/${numero_economico}/tires`,
      tires,
    );
    return response.data;
  },
};
