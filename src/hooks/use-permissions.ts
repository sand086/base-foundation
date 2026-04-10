import { useAuth } from "@/context/AuthContext";

export const usePermissions = (moduleCode?: string) => {
  const { user } = useAuth();

  const role = user?.role;
  const permisos = role?.permisos || {};

  // 1. Verificamos si es Administrador Total
  const isAdmin =
    role?.name_key === "admin" ||
    role?.name_key === "superadmin" ||
    permisos.all === true;

  if (isAdmin) {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canExport: true,
      isAdmin: true,
    };
  }

  if (!moduleCode) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
      isAdmin: false,
    };
  }

  const modulePerms = permisos[moduleCode];

  // 2. Soporte para Formato Simple (Ej. {"fleet": true})
  if (typeof modulePerms === "boolean") {
    return {
      canRead: modulePerms,
      canCreate: modulePerms,
      canUpdate: modulePerms,
      canDelete: modulePerms,
      canExport: modulePerms,
      isAdmin: false,
    };
  }

  // 3. Soporte para Formato Detallado (Ej. {"monitoring": {"read": true, "update": true}})
  if (typeof modulePerms === "object" && modulePerms !== null) {
    return {
      canRead: !!modulePerms.read,
      // Asumimos que si puede actualizar, también puede crear (si es que no tienes "create" en BD)
      canCreate: !!modulePerms.create || !!modulePerms.update,
      canUpdate: !!modulePerms.update,
      canDelete: !!modulePerms.delete,
      canExport: !!modulePerms.export,
      isAdmin: false,
    };
  }

  // Sin permisos
  return {
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canExport: false,
    isAdmin: false,
  };
};
