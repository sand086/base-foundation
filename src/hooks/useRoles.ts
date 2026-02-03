import { useState, useEffect, useCallback } from "react";
import { roleService, Rol, ModuloDef } from "@/services/roleService";
import { toast } from "sonner";

export interface PermisoUI {
  moduloId: string;
  ver: boolean;
  editar: boolean;
  eliminar: boolean;
  exportar: boolean;
}

export interface RolPermisosUI {
  rolId: string;
  permisos: PermisoUI[];
}

export const useRoles = () => {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [availableModules, setAvailableModules] = useState<ModuloDef[]>([]);
  const [permisosMatrix, setPermisosMatrix] = useState<RolPermisosUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carga inicial
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Cargamos Roles y Módulos al mismo tiempo
      const [rolesData, modulesData] = await Promise.all([
        roleService.getAll(),
        roleService.getModules(),
      ]);

      setRoles(rolesData);
      setAvailableModules(modulesData);

      // 2. Construimos la matriz visual cruzando Roles vs Módulos
      const matrix = rolesData.map((rol) => {
        const permisosDelRol = rol.permisos || {};

        // Para cada módulo disponible, verificamos qué permisos tiene este rol
        const permisosUI = modulesData.map((mod) => ({
          moduloId: mod.id,
          ver: permisosDelRol[mod.id]?.ver || false,
          editar: permisosDelRol[mod.id]?.editar || false,
          eliminar: permisosDelRol[mod.id]?.eliminar || false,
          exportar: permisosDelRol[mod.id]?.exportar || false,
        }));

        return { rolId: rol.id, permisos: permisosUI };
      });

      setPermisosMatrix(matrix);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos de seguridad");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- ACCIONES ---

  const createRole = async (nombre: string, descripcion: string) => {
    try {
      const id = nombre.toLowerCase().replace(/\s+/g, "_");
      await roleService.create({ id, nombre, descripcion, permisos: {} });
      toast.success("Rol creado");
      fetchData(); // Recargar
      return true;
    } catch (error: any) {
      toast.error("Error al crear rol");
      return false;
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await roleService.delete(id);
      toast.success("Rol eliminado");
      fetchData();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al eliminar");
      return false;
    }
  };

  const savePermissions = async (roleId: string) => {
    const roleMatrix = permisosMatrix.find((m) => m.rolId === roleId);
    if (!roleMatrix) return;

    // Convertir array UI -> Objeto JSON para la BD
    const jsonPermisos: Record<string, any> = {};
    roleMatrix.permisos.forEach((p) => {
      jsonPermisos[p.moduloId] = {
        ver: p.ver,
        editar: p.editar,
        eliminar: p.eliminar,
        exportar: p.exportar,
      };
    });

    try {
      await roleService.updatePermissions(roleId, jsonPermisos);
      toast.success("Permisos guardados");
      fetchData(); // Sincronizar
    } catch (error) {
      toast.error("Error al guardar permisos");
    }
  };

  const addModule = async (nombre: string, id: string, descripcion: string) => {
    try {
      await roleService.addModule({
        id,
        nombre,
        descripcion,
        icono: "Shield",
      });
      toast.success("Nuevo permiso registrado");
      fetchData(); // ¡Importante! Esto hará que aparezca la nueva fila
      return true;
    } catch (error: any) {
      toast.error("Error al crear permiso");
      return false;
    }
  };

  // Actualizador local (para que los checkbox se muevan rápido)
  const updateLocalMatrix = (newMatrix: RolPermisosUI[]) => {
    setPermisosMatrix(newMatrix);
  };

  return {
    roles,
    availableModules,
    permisosMatrix,
    isLoading,
    createRole,
    deleteRole,
    savePermissions,
    addModule,
    updateLocalMatrix,
  };
};
