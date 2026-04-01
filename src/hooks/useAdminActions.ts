// src/hooks/useAdminActions.ts
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { User, SystemConfig } from "@/types/api.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/hooks/useAuth";

export function useAdminActions() {
  const queryClient = useQueryClient();
  // Renombramos el estado local para no chocar con React Query
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const { user: profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);

  // 1. Cargar datos iniciales
  const loadAdminData = useCallback(async () => {
    setIsLocalLoading(true);
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
      setIsLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // 2. Acciones de Usuario
  const createUser = useCallback(async (data: any) => {
    setIsLocalLoading(true);
    try {
      const newUser = await adminService.createUser(data);
      setUsers((prev) => [...prev, newUser]);
      toast.success("Usuario creado exitosamente");
      return newUser;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear usuario");
    } finally {
      setIsLocalLoading(false);
    }
  }, []);

  const toggleUserStatus = useCallback(async (id: number) => {
    setIsLocalLoading(true);
    try {
      await adminService.toggleUserStatus(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)),
      );
      toast.success("Estado del usuario actualizado");
    } catch (error) {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setIsLocalLoading(false);
    }
  }, []);

  // 3. Acciones de 2FA
  const initiate2FA = useCallback(async () => {
    setIsLocalLoading(true);
    try {
      const data = await adminService.setup2FA();
      return data; // { secret, qrCodeUrl }
    } catch (error) {
      toast.error("Error al iniciar configuración 2FA");
      throw error;
    } finally {
      setIsLocalLoading(false);
    }
  }, []);

  const verify2FACode = useCallback(async (code: string, secret: string) => {
    setIsLocalLoading(true);
    try {
      await adminService.confirm2FA(code, secret);
      toast.success("2FA Activado correctamente");
      return true;
    } catch (error) {
      toast.error("Código inválido");
      return false;
    } finally {
      setIsLocalLoading(false);
    }
  }, []);

  // 4. Configuración del Sistema (Actualización individual)
  const updateSystemConfig = useCallback(
    async (key: string, valor: string) => {
      setIsLocalLoading(true);
      try {
        await adminService.updateConfig(key, valor);
        toast.success("Configuración actualizada");
        loadAdminData(); // Recargamos para asegurar sincronía
      } catch (error) {
        toast.error("Error al guardar configuración");
      } finally {
        setIsLocalLoading(false);
      }
    },
    [loadAdminData],
  );

  // 5. Configuración del Sistema (Actualización en Bloque / Bulk)
  const updateBulkConfigMutation = useMutation({
    mutationFn: adminService.updateBulkSystemConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemConfigs"] });
      loadAdminData(); // Sincronizamos la UI después del guardado masivo
    },
  });

  return {
    //  Combina inteligentemente la carga local con la de React Query
    isLoading: isLocalLoading || updateBulkConfigMutation.isPending,
    profile,
    users,
    systemConfigs,
    //  Funciones correctamente mapeadas
    updateSystemConfig,
    updateBulkSystemConfig: updateBulkConfigMutation.mutateAsync,
    createUser,
    toggleUserStatus,
    initiate2FA,
    verify2FACode,
    refreshData: loadAdminData,
  };
}
