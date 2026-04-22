import { useAuth } from "@/context/AuthContext";
import type { User } from "@/features/users/types";
import {
  ROUTE_TO_PERM_KEYS,
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

function flagsFromPermValue(modulePerms: unknown): Omit<
  PermissionSnapshot,
  "isAdmin"
> {
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
      canRead: !!(o.read || o.ver),
      canCreate: !!(o.create || o.update || o.editar),
      canUpdate: !!(o.update || o.editar),
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
  const keys = ROUTE_TO_PERM_KEYS[moduleCode] ?? [moduleCode];
  for (const k of keys) {
    const v = pickPermisosInsensitive(permisos, k);
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Misma lógica que el hook, usable en el filtro del menú sin depender de hooks.
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

  if (moduleCode === "admin") {
    const adminKeys = ROUTE_TO_PERM_KEYS.admin;
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
  return getPermissionSnapshot(user, moduleCode);
};
