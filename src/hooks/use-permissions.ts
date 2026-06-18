import { useAuth } from "@/context/AuthContext";
import type { User } from "@/features/users/types";
import {
  MODULE_PERMISSIONS,
  pickPermisosInsensitive,
} from "@/lib/module-permission-keys";

export type PermissionSnapshot = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  isAdmin: boolean;
};

function flagsFromPermValue(
  modulePerms: unknown,
): Omit<PermissionSnapshot, "isAdmin"> {
  // Si todo el módulo está en "true"
  if (typeof modulePerms === "boolean") {
    return {
      canRead: modulePerms,
      canCreate: modulePerms,
      canUpdate: modulePerms,
      canDelete: modulePerms,
      canExport: modulePerms,
    };
  }
  // Si el módulo es un objeto (ej: { view: true, edit: false, cancel: true })
  if (typeof modulePerms === "object" && modulePerms !== null) {
    const o = modulePerms as Record<string, unknown>;
    return {
      canRead: !!(o.view || o.read || o.ver),
      canCreate: !!(o.create || o.crear),
      canUpdate: !!(o.edit || o.update || o.editar),
      canDelete: !!(o.delete || o.eliminar),
      canExport: !!(o.export || o.exportar),
    };
  }
  return {
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canExport: false,
  };
}

function resolveModulePermBlock(
  permisos: Record<string, unknown>,
  moduleCode: string,
): unknown {
  // Buscamos el permiso usando tu función insensible a mayúsculas
  return pickPermisosInsensitive(permisos, moduleCode);
}

/**
 * Lógica base para evaluar permisos genéricos de lectura/escritura de un módulo.
 */
export function getPermissionSnapshot(
  user: User | null | undefined,
  moduleCode?: string,
): PermissionSnapshot {
  const role = user?.role;
  const permisos = (role?.permisos || {}) as Record<string, unknown>;

  const nk = role?.name_key?.toLowerCase() ?? "";
  const isAdmin =
    nk === "admin" ||
    nk === "superadmin" ||
    nk === "super_admin" ||
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

  // Agrupación para el dashboard de administración
  if (moduleCode === "admin") {
    const adminKeys = ["users", "roles", "settings"];
    let canRead = false;
    let canCreate = false;
    let canUpdate = false;
    let canDelete = false;
    let canExport = false;

    for (const k of adminKeys) {
      const raw = pickPermisosInsensitive(permisos, k);
      const f = flagsFromPermValue(raw);
      canRead ||= f.canRead;
      canCreate ||= f.canCreate;
      canUpdate ||= f.canUpdate;
      canDelete ||= f.canDelete;
      canExport ||= f.canExport;
    }
    return {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canExport,
      isAdmin: false,
    };
  }

  const block = resolveModulePermBlock(permisos, moduleCode);
  const flags = flagsFromPermValue(block);

  if (
    flags.canRead ||
    flags.canCreate ||
    flags.canUpdate ||
    flags.canDelete ||
    flags.canExport
  ) {
    return { ...flags, isAdmin: false };
  }

  return {
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canExport: false,
    isAdmin: false,
  };
}

export const usePermissions = (moduleCode?: string) => {
  const { user } = useAuth();
  const snapshot = getPermissionSnapshot(user, moduleCode);

  /**
   * Validador Granular:
   * Permite evaluar acciones específicas combinadas, por ejemplo:
   * hasPermission("receivables:cancel") o hasPermission("sat:stamp_cfdi")
   */
  const hasPermission = (permissionKey: string): boolean => {
    // Si es superadmin, tiene pase libre
    if (snapshot.isAdmin) return true;

    const permisos = (user?.role?.permisos || {}) as Record<string, any>;

    // 1. Búsqueda en formato plano: {"finance:cancel_invoice": true}
    if (permisos[permissionKey] === true) return true;

    // 2. Búsqueda en formato de módulo y acción: {"receivables": {"cancel": true}}
    const parts = permissionKey.split(":");
    if (parts.length === 2) {
      const [mod, action] = parts;

      // Mapeos especiales si usaste "finance" en el router pero tu DB dice "receivables"
      const moduleName =
        mod === "finance" ? "receivables" : mod === "sat" ? "receivables" : mod;
      // Normalización de llaves de acción para que hagan match
      const actionName =
        action === "cancel_invoice"
          ? "cancel"
          : action === "stamp_cfdi"
            ? "view"
            : action;

      const modulePerms = pickPermisosInsensitive(permisos, moduleName) as any;
      if (modulePerms && typeof modulePerms === "object") {
        if (modulePerms[actionName] === true) return true;
      }
    }

    // 3. Búsqueda en formato Array de strings: ["receivables:cancel"]
    if (Array.isArray(permisos) && permisos.includes(permissionKey)) {
      return true;
    }

    return false;
  };

  return {
    ...snapshot,
    hasPermission,
  };
};
