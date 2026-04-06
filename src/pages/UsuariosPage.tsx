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
  Users,
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
} from "lucide-react";
import { useUsers, UserDisplay } from "@/features/users/hooks/useUsers";

import {
  AddUserModal,
  type UserFormData,
} from "@/features/users/components/AddUserModal";
import { EditUserModal } from "@/features/users/components/EditUserModal";
import { userService } from "@/features/users/services/userService";
import { toast } from "sonner";

const UsuariosPage = () => {
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
      : "bg-slate-100 text-slate-400 border-slate-200 font-black";
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
              <span className="font-black text-brand-navy text-sm uppercase tracking-tight leading-none">
                {user.nombre} {user.apellidos}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
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
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 font-bold">
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
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
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
              className="h-9 w-9 hover:bg-slate-100 rounded-xl transition-all"
            >
              <MoreHorizontal className="h-5 w-5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="glass-panel border-white/20 min-w-[180px]"
          >
            <DropdownMenuItem
              className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer"
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
                });
                setIsEditModalOpen(true);
              }}
            >
              <Edit className="h-4 w-4 text-blue-500" /> Editar Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer"
              onClick={() => {
                setSelectedUserId(user.id);
                setShowResetPasswordDialog(true);
              }}
            >
              <Key className="h-4 w-4 text-amber-500" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedUserId(user.id);
                setShowToggleStatusDialog(true);
              }}
              className={cn(
                "gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer",
                user.estado === "activo" ? "text-rose-600" : "text-emerald-600",
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
        <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
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
        icon={<Users className="h-8 w-8 text-brand-red" />}
      >
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary-gradient px-8 h-12 font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-brand-red/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
        </Button>
      </PageHeader>

      {/*  2. KPIs METRICS CARDS: Indicadores visuales rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-navy/5 rounded-xl border border-brand-navy/10">
            <Users className="h-6 w-6 text-brand-navy" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Usuarios
            </p>
            <p className="text-2xl font-black text-brand-navy leading-none mt-1">
              {stats.total}
            </p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Activity className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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

      {/* --- ALERT DIALOGS --- */}
      <AlertDialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seguridad de Acceso</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas el reseteo de contraseña para{" "}
              <strong className="text-brand-navy">
                {selectedUser?.nombre}
              </strong>
              ?
              <br />
              <div className="mt-4 p-3 bg-slate-100 rounded-xl border border-slate-200 text-center">
                Clave Temporal:{" "}
                <code className="font-mono font-black text-brand-red">
                  Temporal123!
                </code>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPasswordConfirm}
              className="btn-primary-gradient h-10 px-6 border-none"
            >
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- MODAL 2: CAMBIAR ESTATUS --- */}
      <AlertDialog
        open={showToggleStatusDialog}
        onOpenChange={setShowToggleStatusDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.estado === "activo"
                ? "Suspender Acceso"
                : "Reactivar Acceso"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de cambiar el estatus operativo de{" "}
              <strong className="text-brand-navy">
                {selectedUser?.nombre}
              </strong>
              . Esto afectará sus permisos de inicio de sesión de manera
              inmediata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Regresar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatusConfirm}
              className={cn(
                "h-10 px-6 border-none text-white",
                selectedUser?.estado === "activo"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-emerald-600 hover:bg-emerald-700",
              )}
            >
              Confirmar Cambio
            </AlertDialogAction>
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

export default UsuariosPage;
