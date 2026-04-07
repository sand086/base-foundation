import axiosClient from "@/api/axiosClient";
import { RoleData, ModuleData } from "@/features/users/types";

export const roleService = {
  getAll: async () => {
    const { data } = await axiosClient.get("/api/users/roles");
    return data;
  },
  create: async (role: Omit<RoleData, "id">) => {
    const { data } = await axiosClient.post("/api/users/roles", role);
    return data;
  },
  update: async (id: number, role: Partial<RoleData>) => {
    const { data } = await axiosClient.put(`/api/users/roles/${id}`, role);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await axiosClient.delete(`api/users/roles/${id}`);
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
    const { data } = await axiosClient.get(`/users/roles/${id}/permisos`);
    return data;
  },
  updateModule: async (id: string, modulo: ModuleData) => {
    const { data } = await axiosClient.put(`/api/config/modules/${id}`, modulo);
    return data;
  },
  deleteModule: async (id: string) => {
    const { data } = await axiosClient.delete(`api/config/modules/${id}`);
    return data;
  },
};
