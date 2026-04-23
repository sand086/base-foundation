import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { cn } from "@/lib/utils";
import {
  Users as UsersIcon,
  MoreHorizontal,
  Plus,
  Edit,
  Key,
  UserX,
  UserCheck,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  Loader2,
  Shield,
  Activity,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { useUsers, UserDisplay } from "@/features/users/hooks/useUsers";

import {
  AddUserModal,
  type UserFormData,
} from "@/features/users/components/AddUserModal";
import { EditUserModal } from "@/features/users/components/EditUserModal";
import { userService } from "@/features/users/services/userService";
import { toast } from "sonner";

const Users = () => {
  //  FIX: Agregamos fetchUsers aquí para poder llamarlo después de editar
  const {
    users,
    isLoading,
    createUser,
    toggleStatus,
    resetPassword,
    fetchUsers,
  } = useUsers();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(
    null,
  );
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showToggleStatusDialog, setShowToggleStatusDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // --- CÁLCULO DE MÉTRICAS (KPIs) ---
  const stats = useMemo(() => {
    if (!users) return { total: 0, activos: 0, admins: 0, con2FA: 0 };
    return {
      total: users.length,
      activos: users.filter((u) => u.estado === "activo").length,
      admins: users.filter((u) => u.rol?.toLowerCase().includes("admin"))
        .length,
      con2FA: users.filter((u: any) => u.twoFactorEnabled || u.is_2fa_enabled)
        .length,
    };
  }, [users]);

  // --- COLORES HOMOLOGADOS TAHOE ---
  const getRoleBadgeColor = (rol: string) => {
    const rolLower = rol?.toLowerCase() || "";
    if (rolLower.includes("admin"))
      return "bg-rose-500/10 text-rose-600 border-rose-200 font-black";
    if (rolLower.includes("operativo"))
      return "bg-blue-500/10 text-blue-600 border-blue-200 font-black";
    if (rolLower.includes("finanzas"))
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200 font-black";
    return "bg-slate-500/10 text-slate-600 border-slate-200 font-black";
  };

  const getStatusBadgeColor = (estado: string) => {
    return estado === "activo"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 font-black"
      : "bg-slate-100 text-slate-300 border-slate-200 font-black";
  };

  // --- HANDLERS ---
  const handleAddUser = async (data: UserFormData) => {
    const apiData = {
      nombre: data.nombre,
      apellido: data.apellidos || "",
      email: data.email || data.nombre + ".test@transportes3t.com",
      telefono: data.telefono || "5555555555",
      puesto: data.puesto || "Prueba",
      role_id: data.rol ? Number(data.rol) : null,
      password: data.password,
      activo: true,
    };
    const success = await createUser(apiData);
    if (success) {
      toast.success("Usuario creado exitosamente");
      setIsAddModalOpen(false);
    }
  };

  const handleEditUser = async (userData: any, avatarFile?: File) => {
    try {
      //  TRADUCCIÓN DE CAMPOS: Frontend (React) -> Backend (FastAPI)
      const apiData: any = {
        nombre: userData.nombre,
        apellido: userData.apellidos, // FastAPI espera 'apellido'
        email: userData.email,
        telefono: userData.telefono,
        puesto: userData.puesto,
        role_id: userData.rol ? Number(userData.rol) : null, // FastAPI espera 'role_id' como número
        activo: userData.estado === "activo", // Convierte "activo" a booleano true/false
        is_2fa_enabled: userData.twoFactorEnabled, // FastAPI espera 'is_2fa_enabled'
      };

      // Solo enviamos el password si realmente escribieron uno nuevo
      if (userData.password && userData.password.trim() !== "") {
        apiData.password = userData.password;
      }

      // Enviamos el apiData mapeado en lugar del userData crudo
      await userService.update(userData.id, apiData);

      if (avatarFile) {
        await userService.uploadAvatar(userData.id, avatarFile);
        toast.success("Usuario y foto actualizados");
      } else {
        toast.success("Usuario actualizado correctamente");
      }

      setIsEditModalOpen(false);

      // Refrescar la tabla para ver los cambios de inmediato
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar usuario");
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (selectedUserId) {
      await resetPassword(selectedUserId);
      setShowResetPasswordDialog(false);
      setSelectedUserId(null);
      toast.success("Contraseña reseteada con éxito");
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (selectedUserId) {
      await toggleStatus(selectedUserId);
      setShowToggleStatusDialog(false);
      setSelectedUserId(null);
      toast.success("Estado actualizado");
    }
  };

  // --- COLUMNAS DE TABLA ---
  const columns: ColumnDef<UserDisplay>[] = [
    {
      key: "nombre",
      header: "Usuario / Perfil",
      render: (_, user) => {
        const avatarUrl = user.avatar?.startsWith("http")
          ? user.avatar
          : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, "") || ""}${user.avatar}`;

        return (
          <div className="flex items-center gap-4 py-1">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-brand-navy text-white text-xs font-black">
                  {user.nombre.charAt(0)}
                  {user.apellidos.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                  user.estado === "activo" ? "bg-emerald-500" : "bg-slate-300",
                )}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-brand-navy text-sm uppercase tracking-tight leading-none dark:text-slate-300">
                {user.nombre} {user.apellidos}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1 dark:text-slate-400">
                {user.puesto}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Información de Contacto",
      render: (_, user) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Mail className="h-3 w-3 text-brand-red" />
            {user.email}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 font-bold">
            <Phone className="h-3 w-3 text-slate-300" />
            {user.telefono}
          </div>
        </div>
      ),
    },
    {
      key: "rolNombre",
      header: "Nivel de Acceso",
      render: (rolNombre) => (
        <Badge
          variant="outline"
          className={cn(
            "px-3 py-1 uppercase text-[9px] tracking-widest shadow-sm",
            getRoleBadgeColor(rolNombre as string),
          )}
        >
          <ShieldCheck className="h-2.5 w-2.5 mr-1" />
          {rolNombre || "Sin Rol"}
        </Badge>
      ),
    },
    {
      key: "estado",
      header: "Estatus Sistema",
      render: (estado) => (
        <Badge
          variant="outline"
          className={cn(
            "px-3 py-1 uppercase text-[9px] tracking-widest border-none",
            getStatusBadgeColor(estado as string),
          )}
        >
          {estado}
        </Badge>
      ),
    },
    {
      key: "ultimoAcceso",
      header: "Última Actividad",
      render: (value) => (
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-tight">
          <Clock className="h-3.5 w-3.5" />
          {value || "Sin actividad"}
        </div>
      ),
    },
    {
      key: "id",
      header: "Acciones",
      sortable: false,
      render: (_, user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
            >
              <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-300" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="glass-panel border-white/20 min-w-[180px] z-50 dark:bg-slate-900/90"
          >
            <DropdownMenuItem
              className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              onClick={() => {
                setSelectedUserForEdit({
                  id: user.id,
                  nombre: user.nombre,
                  apellidos: user.apellidos,
                  email: user.email,
                  telefono: user.telefono,
                  puesto: user.puesto,
                  rol: user.rol,
                  estado: user.estado,
                  avatar: user.avatar,
                  twoFactorEnabled:
                    (user as any).twoFactorEnabled ||
                    (user as any).is_2fa_enabled,

                  // 👇 ESTA ES LA LÍNEA QUE TE FALTA AÑADIR 👇
                  password: (user as any).password || "",
                });
                setIsEditModalOpen(true);
              }}
            >
              <Edit className="h-4 w-4 text-brand-green dark:text-[#009740]" />{" "}
              Editar Perfil
            </DropdownMenuItem>

            <DropdownMenuSeparator className="dark:bg-white/10" />
            <DropdownMenuItem
              onClick={() => {
                setSelectedUserId(user.id);
                setShowToggleStatusDialog(true);
              }}
              className={cn(
                "gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer",
                user.estado === "activo"
                  ? "text-rose-600 dark:text-rose-500 dark:focus:bg-rose-950/30"
                  : "text-emerald-600 dark:text-emerald-500 dark:focus:bg-emerald-950/30",
              )}
            >
              {user.estado === "activo" ? (
                <>
                  <UserX className="h-4 w-4" /> Desactivar Cuenta
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" /> Activar Cuenta
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-red/50" />
        <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">
          Sincronizando Directorio...
        </span>
      </div>
    );

  return (
    <div className="p-8 space-y-8 animate-page-enter">
      {/*  1. NUEVO PAGE HEADER: Absorbe el botón principal y elimina redundancia */}
      <PageHeader
        title="Directorio de Usuarios"
        description="Administración central de accesos, perfiles de colaboradores y seguridad del sistema."
        icon={<UsersIcon className="h-8 w-8 text-brand-red" />}
      >
        <Button
          type="button"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-brand-navy hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
        </Button>
      </PageHeader>

      {/*  2. KPIs METRICS CARDS: Indicadores visuales rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-navy/5 dark:bg-slate-600 rounded-xl border border-brand-navy/10">
            <UsersIcon className="h-6 w-6 text-brand-navy dark:text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Total Usuarios
            </p>
            <p className="text-2xl font-black text-brand-navy leading-none mt-1 dark:text-white">
              {stats.total}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Activity className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Cuentas Activas
            </p>
            <p className="text-2xl font-black text-emerald-600 leading-none mt-1">
              {stats.activos}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Administradores
            </p>
            <p className="text-2xl font-black text-rose-600 leading-none mt-1">
              {stats.admins}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Protección 2FA
            </p>
            <p className="text-2xl font-black text-blue-600 leading-none mt-1">
              {stats.con2FA}
            </p>
          </div>
        </Card>
      </div>

      {/*  3. TABLA SIMPLIFICADA: Sin CardHeader redundante */}
      {/* Como EnhancedDataTable ya es Liquid Glass (desde el paso anterior), solo la llamamos directo */}
      <EnhancedDataTable
        data={users}
        columns={columns}
        exportFileName="directorio_usuarios_3t"
        className="mt-2"
      />

      {/* --- MODAL 2: CAMBIAR ESTATUS --- */}
      <AlertDialog
        open={showToggleStatusDialog}
        onOpenChange={setShowToggleStatusDialog}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none",
                selectedUser?.estado === "activo"
                  ? "from-rose-500/5 dark:from-rose-500/10"
                  : "from-emerald-500/5 dark:from-emerald-500/10",
              )}
            />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border",
                  selectedUser?.estado === "activo"
                    ? "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-500/20"
                    : "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20",
                )}
              >
                {selectedUser?.estado === "activo" ? (
                  <UserX className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
                ) : (
                  <UserCheck className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle
                  className={cn(
                    "text-2xl font-black uppercase tracking-tighter heading-crisp leading-none",
                    selectedUser?.estado === "activo"
                      ? "text-rose-600 dark:text-rose-500"
                      : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {selectedUser?.estado === "activo"
                    ? "Suspender Acceso"
                    : "Reactivar Acceso"}
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-500 mt-1">
                  Gestión de Estatus • Usuarios
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás a punto de cambiar el estatus operativo de{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase">
                  {selectedUser?.nombre}
                </b>
                .
              </p>

              <div
                className={cn(
                  "p-5 border-l-4 rounded-r-2xl shadow-sm",
                  selectedUser?.estado === "activo"
                    ? "bg-rose-50 dark:bg-rose-950/20 border-rose-500"
                    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4",
                      selectedUser?.estado === "activo"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  />
                  <h4
                    className={cn(
                      "text-[10px] sm:text-[11px] font-black uppercase tracking-widest",
                      selectedUser?.estado === "activo"
                        ? "text-rose-800 dark:text-rose-400"
                        : "text-emerald-800 dark:text-emerald-400",
                    )}
                  >
                    Efecto Inmediato
                  </h4>
                </div>
                <p
                  className={cn(
                    "text-xs sm:text-sm leading-relaxed",
                    selectedUser?.estado === "activo"
                      ? "text-rose-900 dark:text-rose-200/80"
                      : "text-emerald-900 dark:text-emerald-200/80",
                  )}
                >
                  Esto afectará sus permisos de inicio de sesión de manera
                  inmediata.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Regresar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="default"
                size="lg"
                onClick={handleToggleStatusConfirm}
                className={cn(
                  "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px] shadow-md",
                  selectedUser?.estado === "activo"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                Confirmar Cambio
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- MODALES PRINCIPALES --- */}
      <AddUserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddUser}
      />

      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={selectedUserForEdit}
        onSave={handleEditUser}
      />
    </div>
  );
};

export default Users;
