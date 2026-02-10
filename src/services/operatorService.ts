import axiosClient from "@/api/axiosClient";

export interface Operador {
  id: number;
  name: string;
  license_number: string;
  license_type: string;
  license_expiry: string; // YYYY-MM-DD
  medical_check_expiry: string; // YYYY-MM-DD
  phone?: string;
  status: "activo" | "inactivo" | "vacaciones" | "incapacidad";
  assigned_unit_id?: number; // ID de la unidad (relación)
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

  create: async (operador: Omit<Operador, "id">): Promise<Operador> => {
    const { data } = await axiosClient.post("/operators", operador);
    return data;
  },

  update: async (
    id: number,
    operador: Partial<Operador>,
  ): Promise<Operador> => {
    // <--- number
    const { data } = await axiosClient.put(`/operators/${id}`, operador);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    // <--- number
    await axiosClient.delete(`/operators/${id}`);
  },
};
