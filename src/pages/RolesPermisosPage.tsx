// src/pages/RolesPermisosPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Shield,
  Plus,
  Trash2,
  Save,
  Loader2,
  LayoutDashboard,
  Radio,
  Users,
  Truck,
  Fuel,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Eye,
  Pencil,
  Download,
  Lock,
  History,
  Key,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { CreatePermissionModal } from "@/features/permisos/CreatePermissionModal";
import { ManageModulesModal } from "@/features/permisos/ManageModulesModal";
import { AuditLogPanel } from "@/features/auditoria/AuditLogPanel";
import { useRoles } from "@/hooks/useRoles";

/**
 * Tipos
 */
type Permiso = {
  ver: boolean;
  editar: boolean;
  eliminar: boolean;
  exportar: boolean;
};

type PermisosMap = Record<string, Permiso>;

type Role = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  name_key?: string | null;
  permisos?: unknown;
};

type Module = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  icono: string;
};

type MeUser = {
  id: number;
  nombre: string;
  email: string;
  role_id: number | null;
  avatar_url?: string | null;
};

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Radio,
  Users,
  Truck,
  Fuel,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Shield,
};

const EMPTY_PERMISO: Permiso = {
  ver: false,
  editar: false,
  eliminar: false,
  exportar: false,
};

// ---- helpers localStorage/fetch ----
function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// Ajusta si tu token se llama diferente
function getAuthToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    null
  );
}

async function fetchMeUser(): Promise<MeUser | null> {
  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL ?? "";
  const token = getAuthToken();

  if (!API_BASE || !token) return null;

  try {
    const res = await fetch(`${API_BASE}/usuarios/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as MeUser;
    return data;
  } catch {
    return null;
  }
}

const RolesPermisosPage: React.FC = () => {
  const {
    roles,
    setRoles,
    modules: availableModules,
    isLoading,
    createRole,
    deleteRole,
    updateRole,
    addModule,
    updateSystemModule,
    deleteSystemModule,
  } = useRoles() as unknown as {
    roles: Role[];
    setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    modules: Module[];
    isLoading: boolean;
    createRole: (nombre: string, descripcion?: string) => Promise<boolean>;
    deleteRole: (roleId: number) => Promise<boolean>;
    updateRole: (
      roleId: number,
      payload: { nombre: string; descripcion?: string; permisos: unknown },
    ) => Promise<boolean>;
    addModule: (
      descripcion: string,
      key: string,
      detalle?: string,
    ) => Promise<boolean>;
    updateSystemModule: (moduleId: string, payload: any) => Promise<boolean>;
    deleteSystemModule: (moduleId: string) => Promise<boolean>;
  };

  // ✅ usuario desde localStorage o /usuarios/me
  const [meUser, setMeUser] = useState<MeUser | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const fromLs = safeJsonParse<MeUser>(localStorage.getItem("user_data"));
      if (alive && fromLs?.id) {
        setMeUser(fromLs);
        setMeLoading(false);
        return;
      }

      const fromApi = await fetchMeUser();
      if (alive && fromApi?.id) {
        setMeUser(fromApi);
        localStorage.setItem("user_data", JSON.stringify(fromApi));
        setMeLoading(false);
        return;
      }

      if (alive) setMeLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ resolver role_key con role_id + roles
  const myRoleResolved = useMemo(() => {
    const roleId = meUser?.role_id ?? null;
    const found = roleId ? roles.find((r) => r.id === roleId) : undefined;

    const key =
      found?.name_key?.toLowerCase().trim() ||
      (found?.nombre ? found.nombre.toLowerCase().trim() : "") ||
      "";

    return {
      roleId,
      roleName: found?.nombre ?? null,
      roleKey: key || null,
    };
  }, [meUser?.role_id, roles]);

  // ✅ admin
  const isAdminUser =
    myRoleResolved.roleKey === "admin" || myRoleResolved.roleId === 1;

  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  const [showCreatePermissionModal, setShowCreatePermissionModal] =
    useState(false);
  const [showAuditLogPanel, setShowAuditLogPanel] = useState(false);
  const [showManageModules, setShowManageModules] = useState(false);

  const currentRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  // ==========================================
  // NORMALIZADOR BLINDADO DE PERMISOS
  // ==========================================
  const currentPermisos: PermisosMap = useMemo(() => {
    const out: PermisosMap = {};
    const raw = currentRole?.permisos;
    if (!raw) return out;

    try {
      const permsData =
        typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;

      if (Array.isArray(permsData)) {
        (permsData as any[]).forEach((p) => {
          if (p?.moduloId) out[String(p.moduloId).toLowerCase()] = p as Permiso;
        });
      } else if (typeof permsData === "object" && permsData !== null) {
        Object.keys(permsData as Record<string, unknown>).forEach((k) => {
          out[String(k).toLowerCase()] = (permsData as any)[k] as Permiso;
        });
      }
    } catch (error) {
      console.error("Error al procesar permisos del rol:", error);
    }

    return out;
  }, [currentRole?.permisos]);

  const getPermiso = (moduloId: string): Permiso => {
    const idStr = String(moduloId).toLowerCase();
    return currentPermisos[idStr] || EMPTY_PERMISO;
  };

  const getRoleBadgeColor = (rolNameKey: string) => {
    switch (rolNameKey?.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-700 border-red-200";
      case "operativo":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "finanzas":
        return "bg-green-100 text-green-700 border-green-200";
      case "supervisor":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // ==========================================
  // MANEJADORES DE LA MATRIZ DE PERMISOS
  // ==========================================
  const handleTogglePermiso = (
    moduloId: string,
    field: keyof Permiso,
  ): void => {
    const idStr = String(moduloId).toLowerCase();

    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoleId) return r;

        const safePerms: PermisosMap =
          typeof r.permisos === "object" &&
          r.permisos !== null &&
          !Array.isArray(r.permisos)
            ? ({ ...(r.permisos as PermisosMap) } as PermisosMap)
            : {};

        const modPerms = safePerms[idStr] || EMPTY_PERMISO;

        return {
          ...r,
          permisos: {
            ...safePerms,
            [idStr]: { ...modPerms, [field]: !modPerms[field] },
          },
        };
      }),
    );
  };

  const handleToggleAllModulePermisos = (moduloId: string): void => {
    const idStr = String(moduloId).toLowerCase();
    const p = getPermiso(idStr);
    const allEnabled = p.ver && p.editar && p.eliminar && p.exportar;

    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoleId) return r;

        const safePerms: PermisosMap =
          typeof r.permisos === "object" &&
          r.permisos !== null &&
          !Array.isArray(r.permisos)
            ? ({ ...(r.permisos as PermisosMap) } as PermisosMap)
            : {};

        return {
          ...r,
          permisos: {
            ...safePerms,
            [idStr]: {
              ver: !allEnabled,
              editar: !allEnabled,
              eliminar: !allEnabled,
              exportar: !allEnabled,
            },
          },
        };
      }),
    );
  };

  const handleToggleColumnPermiso = (field: keyof Permiso): void => {
    const allEnabled = availableModules.every((m) => getPermiso(m.id)[field]);

    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoleId) return r;

        const safePerms: PermisosMap =
          typeof r.permisos === "object" &&
          r.permisos !== null &&
          !Array.isArray(r.permisos)
            ? ({ ...(r.permisos as PermisosMap) } as PermisosMap)
            : {};

        availableModules.forEach((m) => {
          const idStr = String(m.id).toLowerCase();
          const modPerms = safePerms[idStr] || EMPTY_PERMISO;
          safePerms[idStr] = { ...modPerms, [field]: !allEnabled };
        });

        return { ...r, permisos: safePerms };
      }),
    );
  };

  const handleSavePermisos = async (): Promise<void> => {
    setIsSaving(true);

    try {
      if (isCreatingRole) {
        const success = await createRole(newRoleName, newRoleDescription);
        if (success) {
          toast.success("Rol creado exitosamente");
          setShowRoleEditor(false);
        }
      } else if (currentRole) {
        const success = await updateRole(currentRole.id, {
          nombre: newRoleName,
          descripcion: newRoleDescription,
          permisos: currentRole.permisos,
        });
        if (success) {
          toast.success("Rol actualizado exitosamente");
          setShowRoleEditor(false);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openRoleEditor = (roleId: number): void => {
    const role = roles.find((r) => r.id === roleId);

    setSelectedRoleId(roleId);
    setIsCreatingRole(false);

    setNewRoleName(role?.nombre || "");
    setNewRoleDescription(role?.descripcion || "");

    setShowRoleEditor(true);
  };

  const openNewRoleEditor = (): void => {
    setIsCreatingRole(true);
    setNewRoleName("");
    setNewRoleDescription("");
    setSelectedRoleId(null);
    setShowRoleEditor(true);
  };

  const handleDeleteRole = async (): Promise<void> => {
    if (!roleToDelete) return;
    await deleteRole(roleToDelete);
    setShowDeleteDialog(false);
    setRoleToDelete(null);
    toast.success("Rol eliminado exitosamente");
  };

  const promptDeleteRole = (roleId: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setRoleToDelete(roleId);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando roles y permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Roles y Permisos"
        description="Define responsabilidades y controla qué puede ver/editar cada perfil en el sistema."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5" /> Perfiles de Acceso
              </CardTitle>

              <CardDescription>
                Define permisos por acción para cada módulo (lectura, edición,
                eliminación, exportación).
              </CardDescription>

              {/* DEBUG: rol real del usuario */}
              {/*               <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getRoleBadgeColor(myRoleResolved.roleKey || ""),
                  )}
                >
                  Mi rol:{" "}
                  {myRoleResolved.roleKey
                    ? myRoleResolved.roleKey.toUpperCase()
                    : meLoading
                      ? "CARGANDO..."
                      : "NO DEFINIDO"}
                </Badge>

                <Badge variant="outline" className="text-xs">
                  role_id: {myRoleResolved.roleId ?? "NULL"}
                </Badge>

                <Badge variant="outline" className="text-xs">
                  usuario:{" "}
                  {meUser?.email ?? (meLoading ? "cargando..." : "N/A")}
                </Badge>
              </div> */}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAuditLogPanel(true)}
                className="gap-2"
              >
                <History className="h-4 w-4" /> Ver Actividad
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowCreatePermissionModal(true)}
                className="gap-2"
              >
                <Key className="h-4 w-4" /> Crear Permiso
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowManageModules(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" /> Administrar Módulos
              </Button>

              <Button
                onClick={openNewRoleEditor}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Plus className="h-4 w-4" /> Nuevo Rol
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((rol) => {
              let localPermsRaw: unknown = rol.permisos;
              try {
                localPermsRaw =
                  typeof rol.permisos === "string"
                    ? (JSON.parse(rol.permisos) as unknown)
                    : rol.permisos;
              } catch {
                localPermsRaw = {};
              }

              const localPerms: PermisosMap =
                typeof localPermsRaw === "object" &&
                localPermsRaw !== null &&
                !Array.isArray(localPermsRaw)
                  ? (localPermsRaw as PermisosMap)
                  : {};

              const totalPermisos = Object.values(localPerms).reduce(
                (acc: number, p: Permiso) =>
                  acc +
                  (p?.ver ? 1 : 0) +
                  (p?.editar ? 1 : 0) +
                  (p?.eliminar ? 1 : 0) +
                  (p?.exportar ? 1 : 0),
                0,
              );

              const maxPermisos = availableModules.length * 4;

              // ✅ REGLA FINAL: SOLO depende del usuario (admin elimina todo)
              const canDeleteByUser = isAdminUser;
              const deleteDisabled = !canDeleteByUser;

              const deleteDisabledReason = `No cuentas con permisos para eliminar roles. Tu rol actual es ${
                myRoleResolved.roleKey?.toUpperCase() ||
                myRoleResolved.roleId ||
                "N/A"
              }.`;

              const roleKeyNormalized = String(rol.name_key || rol.nombre || "")
                .toLowerCase()
                .trim();

              return (
                <Card
                  key={rol.id}
                  className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary/50 relative overflow-hidden"
                  onClick={() => openRoleEditor(rol.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>

                      <div className="flex items-center gap-2">
                        {["admin", "operativo", "finanzas"].includes(
                          roleKeyNormalized,
                        ) && (
                          <Badge variant="outline" className="text-xs bg-muted">
                            <Lock className="h-3 w-3 mr-1" /> Sistema
                          </Badge>
                        )}

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getRoleBadgeColor(roleKeyNormalized),
                          )}
                        >
                          {roleKeyNormalized
                            ? roleKeyNormalized.toUpperCase()
                            : "ROL"}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg mb-1">{rol.nombre}</h3>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                      {rol.descripcion || "Sin descripción"}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-2 w-full max-w-[120px] bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${(totalPermisos / (maxPermisos || 1)) * 100}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {totalPermisos}/{maxPermisos}
                        </span>
                      </div>

                      {/* ✅ Tooltip + toast cuando esté disabled */}
                      <span
                        className="shrink-0"
                        title={
                          deleteDisabled ? deleteDisabledReason : "Eliminar Rol"
                        }
                        onClick={(e) => {
                          if (deleteDisabled) {
                            e.stopPropagation();
                            toast.error(deleteDisabledReason);
                          }
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deleteDisabled}
                          className={cn(
                            "h-8 w-8",
                            deleteDisabled
                              ? "text-muted-foreground cursor-not-allowed opacity-60"
                              : "text-destructive hover:bg-destructive/10 hover:text-destructive",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            promptDeleteRole(rol.id, e);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3 text-sm">Leyenda de Permisos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Ver: Acceso de lectura</span>
              </div>
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Editar: Modificar datos</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="text-sm">Eliminar: Borrar registros</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-green-500" />
                <span className="text-sm">Exportar: Descargar datos</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sheet para crear/editar rol */}
      <Sheet open={showRoleEditor} onOpenChange={setShowRoleEditor}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="space-y-3">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {isCreatingRole
                ? "Crear Nuevo Rol"
                : `Editar Rol: ${currentRole?.nombre ?? ""}`}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Rol</label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej: Auditor"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe las responsabilidades..."
                />
              </div>
            </div>

            {(!isCreatingRole || newRoleName) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Matriz de Permisos</h4>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Módulo
                        </th>

                        <th className="text-center px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleColumnPermiso("ver")}
                            className="hover:text-primary"
                          >
                            <Eye className="h-4 w-4 text-blue-500 mx-auto" />
                          </button>
                        </th>

                        <th className="text-center px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleColumnPermiso("editar")}
                            className="hover:text-primary"
                          >
                            <Pencil className="h-4 w-4 text-amber-500 mx-auto" />
                          </button>
                        </th>

                        <th className="text-center px-3 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleColumnPermiso("eliminar")
                            }
                            className="hover:text-primary"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 mx-auto" />
                          </button>
                        </th>

                        <th className="text-center px-3 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleColumnPermiso("exportar")
                            }
                            className="hover:text-primary"
                          >
                            <Download className="h-4 w-4 text-green-500 mx-auto" />
                          </button>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {availableModules.map((modulo) => {
                        const permiso = getPermiso(modulo.id);
                        const IconComponent =
                          iconMap[modulo.icono] || LayoutDashboard;

                        const allEnabled =
                          permiso.ver &&
                          permiso.editar &&
                          permiso.eliminar &&
                          permiso.exportar;

                        return (
                          <tr
                            key={modulo.id}
                            className={cn(
                              "hover:bg-muted/50 transition-colors cursor-pointer",
                              allEnabled && "bg-primary/5",
                            )}
                            onClick={() =>
                              handleToggleAllModulePermisos(modulo.id)
                            }
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {modulo.nombre}
                                </span>
                              </div>

                              {modulo.descripcion && (
                                <p className=" text-muted-foreground pl-7">
                                  {modulo.descripcion}
                                </p>
                              )}
                            </td>

                            <td
                              className="text-center px-3 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={permiso.ver}
                                onCheckedChange={() =>
                                  handleTogglePermiso(modulo.id, "ver")
                                }
                                className="data-[state=checked]:bg-blue-500"
                              />
                            </td>

                            <td
                              className="text-center px-3 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={permiso.editar}
                                onCheckedChange={() =>
                                  handleTogglePermiso(modulo.id, "editar")
                                }
                                className="data-[state=checked]:bg-amber-500"
                              />
                            </td>

                            <td
                              className="text-center px-3 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={permiso.eliminar}
                                onCheckedChange={() =>
                                  handleTogglePermiso(modulo.id, "eliminar")
                                }
                                className="data-[state=checked]:bg-red-500"
                              />
                            </td>

                            <td
                              className="text-center px-3 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={permiso.exportar}
                                onCheckedChange={() =>
                                  handleTogglePermiso(modulo.id, "exportar")
                                }
                                className="data-[state=checked]:bg-green-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowRoleEditor(false)}>
              Cancelar
            </Button>

            <Button
              onClick={handleSavePermisos}
              disabled={isSaving || !newRoleName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              Guardar Cambios
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Diálogo de Eliminación con Alerta Crítica */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Eliminar Rol Crítico
            </AlertDialogTitle>

            <AlertDialogDescription className="text-base text-foreground mt-4">
              ¿Estás completamente seguro de que deseas eliminar este rol?
            </AlertDialogDescription>

            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md mt-4">
              <p className="text-sm font-medium text-destructive">
                ⚠️ ATENCIÓN: Esta función es irreversible y afectará el
                funcionamiento de todos los usuarios que tengan asignado este
                perfil.
              </p>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Sí, Eliminar Rol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuditLogPanel
        open={showAuditLogPanel}
        onOpenChange={setShowAuditLogPanel}
      />

      <CreatePermissionModal
        open={showCreatePermissionModal}
        onOpenChange={setShowCreatePermissionModal}
        onSubmit={async (data) => {
          const success = await addModule(
            data.descripcion || `Permiso ${data.key}`,
            data.key.toLowerCase(),
            `Permiso generado para ${data.modulo}`,
          );
          if (success) setShowCreatePermissionModal(false);
        }}
      />

      <ManageModulesModal
        open={showManageModules}
        onOpenChange={setShowManageModules}
        modules={availableModules}
        onUpdate={updateSystemModule}
        onDelete={deleteSystemModule}
      />
    </div>
  );
};

export default RolesPermisosPage;
