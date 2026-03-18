import axiosClient from "@/api/axiosClient";
import { SystemConfig } from "@/types/api.types";

export const configService = {
  // Trae TODAS las configuraciones operativas
  getAll: async (): Promise<SystemConfig[]> => {
    const { data } = await axiosClient.get("/catalogs/system-config");
    return data;
  },

  // Hace un Upsert (Actualiza o Crea) de un parámetro específico
  update: async (key: string, value: string): Promise<SystemConfig> => {
    const { data } = await axiosClient.put(`/catalogs/system-config/${key}`, {
      value,
    });
    return data;
  },
};
