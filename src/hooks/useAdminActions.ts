import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { User, SystemConfig } from "@/types/api.types";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/context/AuthContext";

export function useAdminActions() {
  const [isLoading, setIsLoading] = useState(false);
  const { user: profile } = useAuth(); // Obtenemos el perfil del contexto real
  const [users, setUsers] = useState<User[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);

  // 1. Cargar datos iniciales
  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, configsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getConfigs(),
      ]);
      setUsers(usersData);
      setSystemConfigs(configsData);
    } catch (error) {
      toast.error("Error al cargar datos administrativos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // 2. Acciones de Usuario
  const createUser = useCallback(async (data: any) => {
    setIsLoading(true);
    try {
      const newUser = await adminService.createUser(data);
      setUsers((prev) => [...prev, newUser]);
      toast.success("Usuario creado exitosamente");
      return newUser;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear usuario");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleUserStatus = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      await adminService.toggleUserStatus(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)),
      );
      toast.success("Estado del usuario actualizado");
    } catch (error) {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Acciones de 2FA
  const initiate2FA = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.setup2FA();
      return data; // { secret, qrCodeUrl }
    } catch (error) {
      toast.error("Error al iniciar configuración 2FA");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify2FACode = useCallback(async (code: string, secret: string) => {
    setIsLoading(true);
    try {
      await adminService.confirm2FA(code, secret);
      toast.success("2FA Activado correctamente");
      return true;
    } catch (error) {
      toast.error("Código inválido");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. Configuración del Sistema
  const updateSystemConfig = useCallback(
    async (key: string, valor: string) => {
      setIsLoading(true);
      try {
        await adminService.updateConfig(key, valor);
        toast.success("Configuración actualizada");
        loadAdminData(); // Recargamos para asegurar sincronía
      } catch (error) {
        toast.error("Error al guardar configuración");
      } finally {
        setIsLoading(false);
      }
    },
    [loadAdminData],
  );

  return {
    isLoading,
    profile,
    users,
    systemConfigs,
    // Acciones exportadas
    createUser,
    toggleUserStatus,
    initiate2FA,
    verify2FACode,
    updateSystemConfig,
    refreshData: loadAdminData,
  };
}
