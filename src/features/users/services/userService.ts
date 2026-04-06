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
    const { data } = await axiosClient.get("/users");
    return data;
  },

  create: async (user: UserData) => {
    const { data } = await axiosClient.post("/users", user);
    return data;
  },

  // Aseguramos que devuelva el objeto actualizado
  update: async (id: string, user: Partial<UserData>) => {
    const { data } = await axiosClient.put(`/users/${id}`, user);
    return data; // Debe retornar { success: true, user: {...} }
  },

  toggleStatus: async (id: string) => {
    const { data } = await axiosClient.patch(`/users/${id}/status`);
    return data;
  },

  resetPassword: async (id: string, newPassword: string) => {
    const { data } = await axiosClient.post(`/users/${id}/reset-password`, {
      new_password: newPassword,
    });
    return data;
  },
  delete: async (id: string) => {
    const { data } = await axiosClient.delete(`/users/${id}`);
    return data;
  },

  async uploadAvatar(userId: string | number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post(
      `/users/${userId}/avatar`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },
};
