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
};
