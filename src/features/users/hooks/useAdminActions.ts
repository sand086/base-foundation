import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { User } from "@/features/users/types";
import { SystemConfig } from "@/features/settings/types";
import { adminService } from "@/features/users/services/adminService";
import { useAuth } from "@/hooks/useAuth";

// Definimos la interfaz del payload para la actualización masiva
interface ConfigUpdateItem {
  key: string;
  value: string;
}

export function useAdminActions() {
  const queryClient = useQueryClient();

  // Estado para cargas manuales
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  // Datos del perfil actual
  const { user: profile } = useAuth();

  // Estados de datos administrativos
  const [users, setUsers] = useState<User[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);

  // ==========================================
  // 1. CARGA DE DATOS
  // ==========================================
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

  // ==========================================
  // 2. ACCIONES DE USUARIO
  // ==========================================
  const createUser = useCallback(async (data: any) => {
    setIsLocalLoading(true);
    try {
      const newUser = await adminService.createUser(data);
      setUsers((prev) => [...prev, newUser]);
      toast.success("Usuario creado exitosamente");
      return newUser;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al crear usuario");
      throw error;
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

  // ==========================================
  // 3. ACCIONES DE SEGURIDAD (2FA)
  // ==========================================
  const initiate2FA = useCallback(async () => {
    setIsLocalLoading(true);
    try {
      const data = await adminService.setup2FA();
      return data; // Retorna { secret, qrCodeUrl }
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

  // ==========================================
  // 4. CONFIGURACIÓN DEL SISTEMA
  // ==========================================

  // Actualización individual (vía Callback estándar)
  const updateSystemConfig = useCallback(async (key: string, valor: string) => {
    setIsLocalLoading(true);
    try {
      await adminService.updateConfig(key, valor);
      toast.success("Configuración actualizada");
      // Recargamos datos locales para sincronía
      const updatedConfigs = await adminService.getConfigs();
      setSystemConfigs(updatedConfigs);
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setIsLocalLoading(false);
    }
  }, []);

  /**
   * ACTUALIZACIÓN MASIVA (Bulk)
   *  ️ Solución al error ts(2345):
   * Definimos que TVariables es ConfigUpdateItem[]
   */
  const updateBulkConfigMutation = useMutation<any, Error, ConfigUpdateItem[]>({
    mutationFn: (payload: ConfigUpdateItem[]) =>
      adminService.updateBulkSystemConfig(payload),
    onSuccess: () => {
      // Invalidamos caché global de React Query
      queryClient.invalidateQueries({ queryKey: ["systemConfigs"] });
      // Sincronizamos estado local
      loadAdminData();
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.detail || "Error en la actualización masiva";
      toast.error(msg);
    },
  });

  // ==========================================
  // RETORNO DEL HOOK
  // ==========================================
  return {
    // Estado de carga combinado
    isLoading: isLocalLoading || updateBulkConfigMutation.isPending,

    // Datos
    profile,
    users,
    systemConfigs,

    // Funciones de Usuario
    createUser,
    toggleUserStatus,

    // Funciones de Seguridad
    initiate2FA,
    verify2FACode,

    // Funciones de Configuración
    updateSystemConfig,
    updateBulkSystemConfig: updateBulkConfigMutation.mutateAsync,

    // Utilidades
    refreshData: loadAdminData,
  };
}
