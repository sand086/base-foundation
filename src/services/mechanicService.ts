import axiosClient from "@/api/axiosClient";
import { Mechanic } from "@/types/api.types";

export const mechanicService = {
  getAll: async () => {
    const { data } = await axiosClient.get<Mechanic[]>("/mechanics");
    return data;
  },

  create: async (mechanic: Partial<Mechanic>) => {
    const { data } = await axiosClient.post<Mechanic>("/mechanics", mechanic);
    return data;
  },

  update: async (id: number, mechanic: Partial<Mechanic>) => {
    const { data } = await axiosClient.put<Mechanic>(
      `/mechanics/${id}`,
      mechanic,
    );
    return data;
  },

  delete: async (id: number) => {
    await axiosClient.delete(`/mechanics/${id}`);
  },

  // Para subir documentos del expediente
  uploadDocument: async (id: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post(
      `/mechanics/${id}/documents/${docType}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },
};
