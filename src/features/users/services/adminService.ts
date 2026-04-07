import axiosClient from "@/api/axiosClient";
import { User } from "@/features/users/types";
import { SystemConfig } from "@/features/settings/types";

export const adminService = {
  // --- USUARIOS ---
  getUsers: async () => {
    const { data } = await axiosClient.get<User[]>("/api/auth");
    return data;
  },
  createUser: async (userData: any) => {
    const { data } = await axiosClient.post<User>("/api/auth", userData);
    return data;
  },
  updateUser: async (id: number, userData: any) => {
    const { data } = await axiosClient.put<User>(`/api/auth/${id}`, userData);
    return data;
  },
  toggleUserStatus: async (id: number) => {
    const { data } = await axiosClient.patch(`/api/auth/${id}/status`);
    return data;
  },

  // --- 2FA & PERFIL ---
  setup2FA: async () => {
    // El backend debe devolver el secret y la url del QR
    const { data } = await axiosClient.post("/api/auth/2fa/setup");
    return data;
  },
  confirm2FA: async (code: string, secret: string) => {
    const { data } = await axiosClient.post("/api/auth/2fa/confirm", {
      code,
      secret,
    });
    return data;
  },
  disable2FA: async (password: string) => {
    await axiosClient.post("/api/auth/2fa/disable", { password });
  },

  // --- CONFIGURACIÓN ---
  getConfigs: async () => {
    const { data } = await axiosClient.get<SystemConfig[]>(
      "/catalogs/system-config",
    );
    return data;
  },
  updateConfig: async (key: string, value: string) => {
    await axiosClient.put(`/api/catalogs/system-config/${key}`, { value });
  },
  updateBulkSystemConfig: async (payload: { key: string; value: string }[]) => {
    //  Apuntamos a la nueva ruta única
    const response = await axiosClient.put(
      "/catalogs/system-config-bulk",
      payload,
    );
    return response.data;
  },
};
