import axiosClient from "@/api/axiosClient";
import { Brand } from "@/types/api.types";

export const brandService = {
  getAll: async (): Promise<Brand[]> => {
    const response = await axiosClient.get("/brands");
    return response.data;
  },

  create: async (nombre: string, tipoActivo: string): Promise<Brand> => {
    const response = await axiosClient.post("/brands", {
      nombre,
      tipo_activo: tipoActivo,
    });
    return response.data;
  },
};
