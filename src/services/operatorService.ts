import axiosClient from "@/api/axiosClient";
import { Operator } from "@/types/api.types";

export const operatorService = {
  getAll: async (): Promise<Operator[]> => {
    const { data } = await axiosClient.get("/operators");
    return data;
  },

  create: async (Operator: Omit<Operator, "id">): Promise<Operator> => {
    const { data } = await axiosClient.post("/operators", Operator);
    return data;
  },

  update: async (
    id: number,
    Operator: Partial<Operator>,
  ): Promise<Operator> => {
    // <--- number
    const { data } = await axiosClient.put(`/operators/${id}`, Operator);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    // <--- number
    await axiosClient.delete(`/operators/${id}`);
  },

  uploadDocument: async (operatorId: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
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
