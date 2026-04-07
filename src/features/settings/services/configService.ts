import axiosClient from "@/api/axiosClient";
import { SystemConfig } from "@/features/settings/types";

export const configService = {
  // Trae TODAS las configuraciones operativas
  getAll: async (): Promise<SystemConfig[]> => {
    const { data } = await axiosClient.get("/api/catalogs/system-config");
    return data;
  },

  // Hace un Upsert (Actualiza o Crea) de un parámetro específico
  update: async (key: string, value: string): Promise<SystemConfig> => {
    const { data } = await axiosClient.put(
      `/api/catalogs/system-config/${key}`,
      {
        value,
      },
    );
    return data;
  },
};
