import axiosClient from "@/api/axiosClient";

// Tipos
export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: Record<string, any>;
}

export interface ModuloDef {
  id: string;
  nombre: string;
  icono: string;
  descripcion?: string;
}

export const roleService = {
  // Roles CRUD
  getAll: async (): Promise<Rol[]> => {
    const { data } = await axiosClient.get("/roles");
    return data;
  },

  create: async (rol: Partial<Rol>) => {
    const { data } = await axiosClient.post("/roles", rol);
    return data;
  },

  updatePermissions: async (id: string, permisos: any) => {
    const { data } = await axiosClient.put(`/roles/${id}`, { permisos });
    return data;
  },

  delete: async (id: string) => {
    const { data } = await axiosClient.delete(`/roles/${id}`);
    return data;
  },

  // Módulos (Permisos) CRUD
  getModules: async (): Promise<ModuloDef[]> => {
    const { data } = await axiosClient.get("/config/modules");
    return data;
  },

  addModule: async (modulo: ModuloDef) => {
    const { data } = await axiosClient.post("/config/modules", modulo);
    return data;
  },
};
