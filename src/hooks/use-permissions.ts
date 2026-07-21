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
  if (typeof modulePerms === "boolean") {
    return {
      canRead: modulePerms,
      canCreate: modulePerms,
      canUpdate: modulePerms,
      canDelete: modulePerms,
      canExport: modulePerms,
    };
  }
  if (typeof modulePerms === "object" && modulePerms !== null) {
    const o = modulePerms as Record<string, unknown>;
    return {
      canRead: !!(o.view || o.read || o.ver),
      canCreate: !!(o.create || o.crear),
      canUpdate: !!(o.edit || o.update || o.editar),
      canDelete: !!(o.delete || o.eliminar || o.cancel),
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
  return pickPermisosInsensitive(permisos, moduleCode);
}

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

  const hasPermission = (permissionKey: string): boolean => {
    if (snapshot.isAdmin) return true;

    const permisos = (user?.role?.permisos || {}) as Record<string, any>;

    if (permisos[permissionKey] === true) return true;

    const parts = permissionKey.split(":");
    if (parts.length === 2) {
      const [mod, action] = parts;

      const moduleName =
        mod === "finance" ? "receivables" : mod === "sat" ? "receivables" : mod;

      //   FIX CRÍTICO: Traductor exacto Backend -> DB
      const actionName =
        action === "cancel_invoice"
          ? "cancel"
          : action === "create_invoice"
            ? "create"
            : action === "stamp_cfdi"
              ? "create"
              : action === "reopen_invoice"
                ? "update"
                : action === "delete_movement"
                  ? "delete"
                  : action;

      const modulePerms = pickPermisosInsensitive(permisos, moduleName) as any;
      if (modulePerms && typeof modulePerms === "object") {
        // Mapeo inverso de seguridad: Si pide "cancel" y tiene "delete", lo dejamos pasar
        if (modulePerms[actionName] === true) return true;
        if (actionName === "cancel" && modulePerms["delete"] === true)
          return true;
      }
    }

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
