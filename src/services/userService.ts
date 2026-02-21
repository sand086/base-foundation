import axiosClient from "@/api/axiosClient";

export interface UserData {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  puesto: string;
  role_id: number;
  activo?: boolean;
  password?: string;
  avatar_url?: string;
  is_2fa_enabled?: boolean;
}

export const userService = {
  getAll: async () => {
    const { data } = await axiosClient.get("/usuarios");
    return data;
  },

  create: async (user: UserData) => {
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

  delete: async (id: string) => {
    const { data } = await axiosClient.delete(`/usuarios/${id}`);
    return data;
  },
};
