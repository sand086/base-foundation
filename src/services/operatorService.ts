// src/services/operatorService.ts
import axiosClient from "@/api/axiosClient";
import { Operator } from "@/types/api.types";

export const operatorService = {
  getAll: async (): Promise<Operator[]> => {
    const { data } = await axiosClient.get("/operators");
    return data;
  },

  create: async (operatorData: Omit<Operator, "id">): Promise<Operator> => {
    // 🚀 Tip: Si sospechas que vienen campos en camelCase, límpialos aquí
    const { data } = await axiosClient.post("/operators", operatorData);
    return data;
  },

  update: async (
    id: number,
    operatorData: Partial<Operator>,
  ): Promise<Operator> => {
    const { data } = await axiosClient.put(`/operators/${id}`, operatorData);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/operators/${id}`);
  },

  uploadDocument: async (operatorId: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    // 🚀 El header 'multipart/form-data' es vital para que FastAPI
    // lo reciba como UploadFile
    const { data } = await axiosClient.post(
      `/operators/${operatorId}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  getDocumentHistory: async (operatorId: number, docType: string) => {
    const { data } = await axiosClient.get(
      `/operators/${operatorId}/documents/${docType}/history`,
    );
    return data;
  },
};
