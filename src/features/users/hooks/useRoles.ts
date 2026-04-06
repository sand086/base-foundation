import { useState, useEffect, useCallback } from "react";
import { roleService, RoleData, ModuleData } from "@/services/roleService";
import { toast } from "sonner";

export const useRoles = () => {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        roleService.getAll(),
        roleService.getModules(),
      ]);
      setRoles(rolesRes);
      setModules(modulesRes);
    } catch (error) {
      toast.error("Error al cargar roles y módulos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actualizar un rol (ej. sus permisos o detalles)
  const updateRole = async (id: number, data: Partial<RoleData>) => {
    try {
      await roleService.update(id, data);
      toast.success("Rol actualizado correctamente");
      fetchData();
      return true;
    } catch (error: any) {
      toast.error("Error al actualizar el rol");
      return false;
    }
  };

  // Crear un nuevo rol
  const createRole = async (nombre: string, descripcion: string) => {
    try {
      const name_key = nombre.toLowerCase().replace(/\s+/g, "_");
      await roleService.create({ name_key, nombre, descripcion, permisos: {} });
      toast.success("Rol creado exitosamente");
      fetchData();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear rol");
      return false;
    }
  };

  // Eliminar un rol
  const deleteRole = async (id: number) => {
    try {
      await roleService.delete(id);
      toast.success("Rol eliminado");
      fetchData();
      return true;
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "No se puede eliminar un rol en uso",
      );
      return false;
    }
  };

  // Agregar un nuevo módulo a la configuración del sistema
  const addModule = async (nombre: string, id: string, descripcion: string) => {
    try {
      await roleService.addModule({ id, nombre, descripcion, icono: "Shield" });
      toast.success("Nuevo permiso registrado");
      fetchData();
      return true;
    } catch (error: any) {
      toast.error("Error al registrar el módulo");
      return false;
    }
  };

  const getRolePermissions = async (id: number) => {
    try {
      return await roleService.getPermissions(id);
    } catch (error) {
      console.error("Error al obtener permisos", error);
      return {};
    }
  };

  const updateSystemModule = async (id: string, modulo: ModuleData) => {
    try {
      await roleService.updateModule(id, modulo);
      toast.success("Módulo actualizado");
      fetchData(); // Recarga la lista
      return true;
    } catch (error: any) {
      toast.error("Error al actualizar módulo");
      return false;
    }
  };

  const deleteSystemModule = async (id: string) => {
    try {
      await roleService.deleteModule(id);
      toast.success("Módulo eliminado");
      fetchData(); // Recarga la lista
      return true;
    } catch (error: any) {
      toast.error("Error al eliminar módulo");
      return false;
    }
  };

  // Exportamos todas las variables y funciones
  return {
    roles,
    setRoles,
    modules,
    isLoading,
    updateRole,
    createRole,
    deleteRole,
    addModule,
    fetchData,
    getRolePermissions,
    updateSystemModule,
    deleteSystemModule,
  };
};
