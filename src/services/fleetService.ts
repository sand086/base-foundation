import axiosClient from "@/api/axiosClient";
import { Unit, Operator } from "@/types/api.types";

export const fleetService = {
  // Unidades
  getUnits: async (skip = 0, limit = 100, status?: string): Promise<Unit[]> => {
    const params = { skip, limit, status };
    const response = await axiosClient.get("/units", { params });
    return response.data;
  },

  createUnit: async (unitData: Partial<Unit>): Promise<Unit> => {
    const response = await axiosClient.post("/units", unitData);
    return response.data;
  },

  updateUnitStatus: async (id: string, status: string) => {
    const response = await axiosClient.patch(`/units/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  // Operadores
  getOperators: async (skip = 0, limit = 100): Promise<Operator[]> => {
    const response = await axiosClient.get("/operators", {
      params: { skip, limit },
    });
    return response.data;
  },

  createOperator: async (data: any) => {
    const response = await axiosClient.post("/operators", data);
    return response.data;
  },
};
