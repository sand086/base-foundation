import axiosClient from "@/api/axiosClient";

export interface Operador {
  id: string;
  name: string;
  license_number: string;
  license_type: string;
  license_expiry: string; // YYYY-MM-DD
  medical_check_expiry: string; // YYYY-MM-DD
  phone?: string;
  status: "activo" | "inactivo" | "vacaciones" | "incapacidad";
  assigned_unit_id?: string; // ID de la unidad (relación)
  assigned_unit?: string; // Nombre/NumEco para mostrar (opcional si el backend lo popula)
  hire_date?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

export const operatorService = {
  getAll: async (): Promise<Operador[]> => {
    const { data } = await axiosClient.get("/operators");
    return data;
  },

  create: async (operador: Operador): Promise<Operador> => {
    const { data } = await axiosClient.post("/operators", operador);
    return data;
  },

  update: async (
    id: string,
    operador: Partial<Operador>,
  ): Promise<Operador> => {
    const { data } = await axiosClient.put(`/operators/${id}`, operador);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosClient.delete(`/operators/${id}`);
  },
};
