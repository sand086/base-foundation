import axiosClient from "@/api/axiosClient";
import { Unit, Operator } from "@/types/api.types";

export const fleetService = {
  // Unidades
  getUnits: async (skip = 0, limit = 100, status?: string): Promise<Unit[]> => {
    const params = { skip, limit, status };
    const response = await axiosClient.get("/flota/unidades", { params });
    return response.data;
  },

  createUnit: async (unitData: Partial<Unit>): Promise<Unit> => {
    const response = await axiosClient.post("/flota/unidades", unitData);
    return response.data;
  },

  updateUnitStatus: async (id: string, status: string) => {
    const response = await axiosClient.patch(
      `/flota/unidades/${id}/status`,
      null,
      {
        params: { status },
      },
    );
    return response.data;
  },

  // Operadores
  getOperators: async (skip = 0, limit = 100): Promise<Operator[]> => {
    const response = await axiosClient.get("/flota/operadores", {
      params: { skip, limit },
    });
    return response.data;
  },

  createOperator: async (data: any) => {
    const response = await axiosClient.post("/flota/operadores", data);
    return response.data;
  },
};
