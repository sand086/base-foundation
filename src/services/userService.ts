import axiosClient from "@/api/axiosClient";

// Tipos basados en lo que espera el Backend
export interface UserData {
  id?: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  puesto: string;
  role_id: string;
  activo?: boolean;
  password?: string; // Solo para crear
}

export const userService = {
  getAll: async () => {
    const { data } = await axiosClient.get("/usuarios");
    return data;
  },

  create: async (user: UserData) => {
    // Transformar datos si es necesario para que coincida con UserCreate del backend
    const { data } = await axiosClient.post("/usuarios", user);
    return data;
  },

  update: async (id: string, user: Partial<UserData>) => {
    const { data } = await axiosClient.put(`/usuarios/${id}`, user);
    return data;
  },

  toggleStatus: async (id: string) => {
    const { data } = await axiosClient.patch(`/usuarios/${id}/status`);
    return data;
  },

  resetPassword: async (id: string, newPassword: string) => {
    const { data } = await axiosClient.post(`/usuarios/${id}/reset-password`, {
      new_password: newPassword,
    });
    return data;
  },
};
