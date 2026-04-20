import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
// 1. Importamos todo de tu API generada
import {
  AuthenticationService,
  UserResponse,
  UserCreate,
  UserUpdate,
  ApiError,
} from "@/api/generated";

// Este tipo se queda porque es solo para tu UI de la tabla
export interface UserDisplay {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  puesto: string;
  rol: string;
  rolNombre?: string;
  estado: string;
  avatar?: string;
  twoFactorEnabled: boolean;
  is2FAConfigured: boolean;
  password?: string;
  ultimoAcceso: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Tipamos el parámetro 'user' exactamente como responde el backend
  const mapUserToDisplay = (user: UserResponse): UserDisplay => ({
    id: user.id.toString(),
    nombre: user.nombre,
    apellidos: user.apellido || "",
    email: user.email,
    telefono: user.telefono || "Sin teléfono",
    puesto: user.puesto || "Sin asignar",
    rol: user.role_id?.toString() || "",
    rolNombre: user.role?.nombre || "Sin Rol",
    estado: user.activo ? "activo" : "inactivo",
    avatar: user.avatar_url || undefined,
    twoFactorEnabled: user.is_2fa_enabled || false,
    is2FAConfigured: !!(user as any).two_factor_secret || false,
    ultimoAcceso: user.last_login
      ? new Date(user.last_login).toLocaleDateString()
      : "Nunca",
    password: user.password,
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // 3. Usamos el servicio autogenerado
      const data = await AuthenticationService.readUsersApiAuthGet();
      setUsers(data.map(mapUserToDisplay));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Usamos el tipo "UserCreate" generado por el backend
  const createUser = async (data: UserCreate) => {
    try {
      await AuthenticationService.createUserApiAuthPost(data);
      toast.success("Usuario creado correctamente");
      fetchUsers();
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(error.body?.detail);
      }
      return false;
    }
  };

  // Usamos "UserUpdate" y nos aseguramos de que el id sea 'number'
  const updateUser = async (id: string, data: UserUpdate) => {
    try {
      await AuthenticationService.updateUserApiAuthUserIdPut(Number(id), data);
      toast.success("Usuario actualizado");
      fetchUsers();
      return true;
    } catch (error) {
      console.error("Error al actualizar usuario");
      return false;
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await AuthenticationService.toggleStatusApiAuthUserIdStatusPatch(
        Number(id),
      );
      toast.success("Estatus actualizado");
      fetchUsers();
    } catch (error) {
      console.error("Error al cambiar estatus");
    }
  };

  const resetPassword = async (id: string, customPass?: string) => {
    try {
      const tempPass = customPass || "Temporal123!";
      // El backend exige un modelo PasswordReset, enviamos el objeto
      await AuthenticationService.resetPasswordApiAuthUserIdResetPasswordPost(
        Number(id),
        {
          new_password: tempPass,
        },
      );
      toast.success("Contraseña actualizada con éxito");
    } catch (error) {
      console.error("Error al actualizar contraseña");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await AuthenticationService.deleteUserApiAuthUserIdDelete(Number(id));
      toast.success("Usuario eliminado");
      fetchUsers();
      return true;
    } catch (error) {
      console.error("Error al eliminar usuario");
      return false;
    }
  };

  return {
    users,
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    toggleStatus,
    resetPassword,
    deleteUser,
  };
};
