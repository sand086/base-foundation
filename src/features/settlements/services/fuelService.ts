import axiosClient from "@/api/axiosClient";
import type { FuelLogResponse, FuelLogCreate } from "@/api/generated";

export const fuelService = {
  getAll: async (): Promise<FuelLogResponse[]> => {
    // Usamos axiosClient, que inyecta el Bearer Token automáticamente.
    // Omitimos '/api' porque axiosClient ya lo tiene en su baseURL.
    const response = await axiosClient.get("/api/fleet/fuel-logs");
    return response.data;
  },

  create: async (formData: FormData): Promise<FuelLogResponse[]> => {
    // Para multipart/form-data, le indicamos el header a axiosClient
    const response = await axiosClient.post("/api/fleet/fuel-logs", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  update: async (
    id: number | string,
    payload: FuelLogCreate,
  ): Promise<FuelLogResponse> => {
    const response = await axiosClient.put(
      `/api/fleet/fuel-logs/${id}`,
      payload,
    );
    return response.data;
  },

  uploadDocument: async (logId: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post(
      `/api/fleet/fuel-logs/${logId}/documents/${docType}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  delete: async (id: string | number) => {
    const response = await axiosClient.delete(`/api/fleet/fuel-logs/${id}`);
    return response.data;
  },
};
