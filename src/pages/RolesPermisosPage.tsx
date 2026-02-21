import React, { useMemo, useState } from "react";
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
  Copy,
  History,
  Key,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { CreatePermissionModal } from "@/features/permisos/CreatePermissionModal";
import { ManageModulesModal } from "@/features/permisos/ManageModulesModal";
import { AuditLogPanel } from "@/features/auditoria/AuditLogPanel";
import { useRoles } from "@/hooks/useRoles";

type Permiso = {
  ver: boolean;
  editar: boolean;
  eliminar: boolean;
  exportar: boolean;
};

type PermisosMap = Record<string, Permiso>;

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
  } = useRoles();

  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Nombres y descripción editables
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  const [showCreatePermissionModal, setShowCreatePermissionModal] =
    useState(false);
  const [showAuditLogPanel, setShowAuditLogPanel] = useState(false);

  // ✅ NUEVO: Administrar módulos
  const [showManageModules, setShowManageModules] = useState(false);

  const currentRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  // ==========================================
  // NORMALIZADOR BLINDADO DE PERMISOS
  // Convierte lo que sea que mande la BD a un objeto de fácil lectura
  // ==========================================
  const currentPermisos: PermisosMap = useMemo(() => {
    const out: PermisosMap = {};
    const raw = currentRole?.permisos;

    if (!raw) return out;

    try {
      const permsData =
        typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;

      // Si quedó guardado como Array (legacy)
      if (Array.isArray(permsData)) {
        (permsData as any[]).forEach((p) => {
          if (p?.moduloId) out[String(p.moduloId).toLowerCase()] = p as Permiso;
        });
      }
      // Formato correcto nuevo: objeto mapa
      else if (typeof permsData === "object" && permsData !== null) {
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
        if (success) setShowRoleEditor(false);
      } else if (currentRole) {
        const success = await updateRole(currentRole.id, {
          nombre: newRoleName,
          descripcion: newRoleDescription,
          permisos: currentRole.permisos,
        });
        if (success) setShowRoleEditor(false);
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
  };

  const handleDuplicateRole = (roleId: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    toast.info("Función de duplicar próximamente");
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
        description="Gestiona los roles del sistema y sus permisos por módulo"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Roles del Sistema
              </CardTitle>
              <CardDescription>
                Configura los permisos de cada rol para controlar el acceso
              </CardDescription>
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

              {/* ✅ NUEVO: Administrar Módulos */}
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
              // Conteo para la barrita de progreso
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

              const isSystemRole = ["admin", "operativo", "finanzas"].includes(
                rol.name_key?.toLowerCase(),
              );

              return (
                <Card
                  key={rol.id}
                  className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary/50"
                  onClick={() => openRoleEditor(rol.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>

                      <div className="flex items-center gap-2">
                        {isSystemRole && (
                          <Badge variant="outline" className="text-xs bg-muted">
                            <Lock className="h-3 w-3 mr-1" /> Sistema
                          </Badge>
                        )}

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getRoleBadgeColor(rol.name_key),
                          )}
                        >
                          {rol.name_key?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg mb-1">{rol.nombre}</h3>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                      {rol.descripcion || "Sin descripción"}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
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

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleDuplicateRole(rol.id, e)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {!isSystemRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(rol.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                                <p className="text-[10px] text-muted-foreground pl-7">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este rol? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
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

      {/* ✅ NUEVO: modal administrar módulos */}
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
