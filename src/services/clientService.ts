import axiosClient from "@/api/axiosClient";
import { Client } from "@/types/api.types";

export const clientService = {
  getClients: async (): Promise<Client[]> => {
    const response = await axiosClient.get("/clientes");
    return response.data;
  },

  createClient: async (data: any): Promise<Client> => {
    const response = await axiosClient.post("/clientes", data);
    return response.data;
  },
};
