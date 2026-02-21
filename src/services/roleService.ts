import axiosClient from "@/api/axiosClient";

export interface RoleData {
  id: number;
  name_key: string;
  nombre: string;
  descripcion?: string;
  permisos: Record<string, any>;
}

export interface ModuleData {
  id: string;
  nombre: string;
  icono: string;
  descripcion?: string;
}

export const roleService = {
  getAll: async () => {
    const { data } = await axiosClient.get("/roles");
    return data;
  },
  create: async (role: Omit<RoleData, "id">) => {
    const { data } = await axiosClient.post("/roles", role);
    return data;
  },
  update: async (id: number, role: Partial<RoleData>) => {
    const { data } = await axiosClient.put(`/roles/${id}`, role);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await axiosClient.delete(`/roles/${id}`);
    return data;
  },
  getModules: async () => {
    const { data } = await axiosClient.get("/config/modules");
    return data;
  },
  addModule: async (modulo: ModuleData) => {
    const { data } = await axiosClient.post("/config/modules", modulo);
    return data;
  },
  getPermissions: async (id: number) => {
    const { data } = await axiosClient.get(`/roles/${id}/permisos`);
    return data;
  },
  updateModule: async (id: string, modulo: ModuleData) => {
    const { data } = await axiosClient.put(`/config/modules/${id}`, modulo);
    return data;
  },
  deleteModule: async (id: string) => {
    const { data } = await axiosClient.delete(`/config/modules/${id}`);
    return data;
  },
};
