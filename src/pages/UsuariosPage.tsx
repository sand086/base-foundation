import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useUsers, UserDisplay } from "@/hooks/useUsers";
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
} from "lucide-react";
import { AddUserModal, UserFormData } from "@/features/usuarios/AddUserModal";
import { EditUserModal } from "@/features/usuarios/EditUserModal";

import { userService } from "@/services/userService";
import { toast } from "sonner";

const UsuariosPage = () => {
  const { users, isLoading, createUser, toggleStatus, resetPassword } =
    useUsers();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(
    null,
  );
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showToggleStatusDialog, setShowToggleStatusDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const getRoleBadgeColor = (rol: string) => {
    const rolLower = rol?.toLowerCase() || "";
    if (rolLower.includes("admin"))
      return "bg-red-100 text-red-700 border-red-200";
    if (rolLower.includes("operativo"))
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (rolLower.includes("finanzas"))
      return "bg-green-100 text-green-700 border-green-200";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusBadgeColor = (estado: string) => {
    return estado === "activo"
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-gray-100 text-gray-500 border-gray-200";
  };

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
    if (success) setIsAddModalOpen(false);
  };

  // 🚀 EL HANDLER CORREGIDO Y EN EL LUGAR CORRECTO
  const handleEditUser = async (userData: any, avatarFile?: File) => {
    try {
      const updatedUser = await userService.update(userData.id, userData);

      if (avatarFile) {
        await userService.uploadAvatar(updatedUser.id, avatarFile);
        toast.success("Usuario y foto actualizados correctamente");
      } else {
        toast.success("Usuario actualizado correctamente");
      }

      setIsEditModalOpen(false);

      // Forzar una recarga para que React Query o el Hook actualice la tabla y las fotos
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar usuario", {
        description:
          error.response?.data?.detail || "Por favor intente nuevamente.",
      });
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (selectedUserId) {
      await resetPassword(selectedUserId);
      setShowResetPasswordDialog(false);
      setSelectedUserId(null);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (selectedUserId) {
      await toggleStatus(selectedUserId);
      setShowToggleStatusDialog(false);
      setSelectedUserId(null);
    }
  };

  const columns: ColumnDef<UserDisplay>[] = [
    {
      key: "nombre",
      header: "Usuario",
      render: (_, user) => {
        // 🚀 Construimos la URL segura para la tabla
        const avatarUrl = user.avatar?.startsWith("http")
          ? user.avatar
          : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, "") || ""}${user.avatar}`;

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground uppercase">
                {user.nombre.charAt(0)}
                {user.apellidos.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {user.nombre} {user.apellidos}
              </p>
              <p className="text-xs text-muted-foreground">{user.puesto}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Contacto",
      render: (_, user) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            {user.email}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {user.telefono}
          </div>
        </div>
      ),
    },
    {
      key: "rolNombre",
      header: "Rol",
      render: (rolNombre) => (
        <Badge
          variant="outline"
          className={cn(
            "text-xs capitalize",
            getRoleBadgeColor(rolNombre as string),
          )}
        >
          {rolNombre || "Sin Rol"}
        </Badge>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (estado) => (
        <Badge
          variant="outline"
          className={cn(
            "text-xs capitalize",
            getStatusBadgeColor(estado as string),
          )}
        >
          {estado}
        </Badge>
      ),
    },
    {
      key: "ultimoAcceso",
      header: "Último Acceso",
      render: (value) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {value}
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
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
                });
                setIsEditModalOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Editar Usuario
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedUserId(user.id);
                setShowResetPasswordDialog(true);
              }}
            >
              <Key className="mr-2 h-4 w-4" /> Resetear Contraseña
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedUserId(user.id);
                setShowToggleStatusDialog(true);
              }}
              className={
                user.estado === "activo" ? "text-destructive" : "text-green-600"
              }
            >
              {user.estado === "activo" ? (
                <>
                  <UserX className="mr-2 h-4 w-4" /> Desactivar
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" /> Activar
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
      <div className="p-8 text-center text-muted-foreground">
        Cargando usuarios...
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administración de usuarios del sistema"
      />
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios del Sistema
              </CardTitle>
              <CardDescription>
                Gestiona los usuarios y sus accesos
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white gap-2"
            >
              <Plus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            data={users}
            columns={columns}
            exportFileName="usuarios"
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetear Contraseña</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Resetear contraseña para <strong>{selectedUser?.nombre}</strong>?
              <br />
              La nueva contraseña temporal será: <code>Temporal123!</code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPasswordConfirm}>
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showToggleStatusDialog}
        onOpenChange={setShowToggleStatusDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.estado === "activo"
                ? "Desactivar Usuario"
                : "Activar Usuario"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cambiar el estatus de <strong>{selectedUser?.nombre}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatusConfirm}
              className={
                selectedUser?.estado === "activo"
                  ? "bg-destructive"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
