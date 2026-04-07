import axiosClient from "@/api/axiosClient";
import { Brand } from "@/features/settings/types";

export const brandService = {
  getAll: async (): Promise<Brand[]> => {
    const response = await axiosClient.get("/api/brands");
    return response.data;
  },

  create: async (nombre: string, tipoActivo: string): Promise<Brand> => {
    const response = await axiosClient.post("/api/brands", {
      nombre,
      tipo_activo: tipoActivo,
    });
    return response.data;
  },
};
