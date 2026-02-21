import { useState, useEffect, useCallback } from "react";
import { userService, UserData } from "@/services/userService";
import { toast } from "sonner";

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
  ultimoAcceso: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapUserToDisplay = (user: any): UserDisplay => ({
    id: user.id.toString(),
    nombre: user.nombre,
    apellidos: user.apellido || "",
    email: user.email,
    telefono: user.telefono || "Sin teléfono",
    puesto: user.puesto || "Sin asignar",
    rol: user.role_id?.toString() || "",
    rolNombre: user.role?.nombre || "Sin Rol",
    estado: user.activo ? "activo" : "inactivo",
    avatar: user.avatar_url,
    twoFactorEnabled: user.is_2fa_enabled || false,
    ultimoAcceso: user.last_login
      ? new Date(user.last_login).toLocaleDateString()
      : "Nunca",
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data.map(mapUserToDisplay));
    } catch (error) {
      toast.error("Error al cargar usuarios");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: UserData) => {
    try {
      await userService.create(data);
      toast.success("Usuario creado correctamente");
      fetchUsers();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear usuario");
      return false;
    }
  };

  const updateUser = async (id: string, data: Partial<UserData>) => {
    try {
      await userService.update(id, data);
      toast.success("Usuario actualizado");
      fetchUsers();
      return true;
    } catch (error: any) {
      toast.error("Error al actualizar usuario");
      return false;
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await userService.toggleStatus(id);
      toast.success("Estatus actualizado");
      fetchUsers();
    } catch (error) {
      toast.error("Error al cambiar estatus");
    }
  };

  const resetPassword = async (id: string, customPass?: string) => {
    try {
      const tempPass = customPass || "Temporal123!";
      await userService.resetPassword(id, tempPass);
      toast.success(`Contraseña actualizada con éxito`);
    } catch (error) {
      toast.error("Error al actualizar contraseña");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await userService.delete(id);
      toast.success("Usuario eliminado");
      fetchUsers();
      return true;
    } catch (error) {
      toast.error("Error al eliminar usuario");
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
