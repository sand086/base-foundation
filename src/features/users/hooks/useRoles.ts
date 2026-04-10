import { useState, useEffect, useCallback } from "react";
import { roleService } from "@/features/users/services/roleService";
import { RoleData, ModuleData } from "@/features/users/types";
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
      // El interceptor de Axios ya mostrará el error en pantalla
      console.error("Error silencioso en fetchData:", error);
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
      // Los de éxito SÍ se quedan
      toast.success("Rol actualizado correctamente");
      fetchData();
      return true;
    } catch (error) {
      // Solo retornamos false para que el componente sepa que falló
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
    } catch (error) {
      return false;
    }
  };

  // Eliminar un rol
  const deleteRole = async (id: number) => {
    try {
      await roleService.delete(id);
      toast.success("Rol eliminado");
      return true;
    } catch (error) {
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
    } catch (error) {
      return false;
    }
  };

  const getRolePermissions = async (id: number) => {
    try {
      return await roleService.getPermissions(id);
    } catch (error) {
      return {};
    }
  };

  const updateSystemModule = async (id: string, modulo: ModuleData) => {
    try {
      await roleService.updateModule(id, modulo);
      toast.success("Módulo actualizado");
      fetchData(); // Recarga la lista
      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteSystemModule = async (id: string) => {
    try {
      await roleService.deleteModule(id);
      toast.success("Módulo eliminado");
      fetchData(); // Recarga la lista
      return true;
    } catch (error) {
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
