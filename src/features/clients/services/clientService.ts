import axiosClient from "@/api/axiosClient";
import { Client } from "@/types/api.types";

export const clientService = {
  // RUTA: /clients (Inglés, coincide con backend)
  getClients: async (): Promise<Client[]> => {
    const { data } = await axiosClient.get<Client[]>("/clients");
    return data;
  },

  // ID: number (Coincide con backend)
  getClient: async (id: number): Promise<Client> => {
    const { data } = await axiosClient.get<Client>(`/clients/${id}`);
    return data;
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    const { data } = await axiosClient.post<Client>("/clients", client);
    return data;
  },

  updateClient: async (
    id: number,
    client: Partial<Client>,
  ): Promise<Client> => {
    const { data } = await axiosClient.put<Client>(`/clients/${id}`, client);
    return data;
  },

  deleteClient: async (id: number): Promise<void> => {
    await axiosClient.delete(`/clients/${id}`);
  },
  uploadDocument: async (clientId: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosClient.post(
      `/clients/${clientId}/documents/${docType}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  getDocumentHistory: async (clientId: number, docType: string) => {
    const response = await axiosClient.get(
      `/clients/${clientId}/documents/${docType}/history`,
    );
    return response.data;
  },
  deleteDocument: async (documentId: number) => {
    const response = await axiosClient.delete(
      `/clients/documents/${documentId}`,
    );
    return response.data;
  },
};
