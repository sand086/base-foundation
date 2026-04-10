import axiosClient from "@/api/axiosClient";
import { RoleData, ModuleData } from "@/features/users/types";

export const roleService = {
  getAll: async () => {
    const { data } = await axiosClient.get("/api/auth/roles");
    return data;
  },
  create: async (role: Omit<RoleData, "id">) => {
    const { data } = await axiosClient.post("/api/auth/roles", role);
    return data;
  },
  update: async (id: number, role: Partial<RoleData>) => {
    const { data } = await axiosClient.put(`/api/auth/roles/${id}`, role);
    return data;
  },
  delete: async (id: number) => {
    // 🔴 Faltaba diagonal al inicio
    const { data } = await axiosClient.delete(`/api/auth/roles/${id}`);
    return data;
  },
  getModules: async () => {
    const { data } = await axiosClient.get("/api/catalogs/modules");
    return data;
  },
  addModule: async (modulo: ModuleData) => {
    const { data } = await axiosClient.post("/api/catalogs/modules", modulo);
    return data;
  },
  getPermissions: async (id: number) => {
    // 🔴 Faltaba /api al inicio
    const { data } = await axiosClient.get(`/api/auth/roles/${id}/permisos`);
    return data;
  },
  updateModule: async (id: string, modulo: ModuleData) => {
    // 🟢 CORREGIDO: De /api/config a /api/catalogs
    const { data } = await axiosClient.put(
      `/api/catalogs/modules/${id}`,
      modulo,
    );
    return data;
  },
  deleteModule: async (id: string) => {
    // 🟢 CORREGIDO Y CON DIAGONAL: De api/config a /api/catalogs
    const { data } = await axiosClient.delete(`/api/catalogs/modules/${id}`);
    return data;
  },
};
