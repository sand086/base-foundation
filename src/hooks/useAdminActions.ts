// Hook for simulating API calls to the admin backend
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  UserProfile, 
  SystemConfig, 
  NotificationEvent,
  currentUserProfile,
  mockUsers,
  mockSystemConfig,
  mockNotificationEvents,
  generateTOTPSecret,
  generateTOTPQRUrl
} from '@/data/mockAdminData';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
}

export function useAdminActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(currentUserProfile);
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [systemConfig, setSystemConfig] = useState<SystemConfig[]>(mockSystemConfig);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>(mockNotificationEvents);

  // Simulate API delay
  const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 500));

  // Profile actions
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    setIsLoading(true);
    await simulateDelay();
    setProfile(prev => ({ ...prev, ...data }));
    toast.success('Perfil actualizado', {
      description: 'Los cambios han sido guardados correctamente.',
    });
    setIsLoading(false);
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    await simulateDelay();
    
    // Simulate password validation
    if (currentPassword.length < 4) {
      toast.error('Error de validación', {
        description: 'La contraseña actual es incorrecta.',
      });
      setIsLoading(false);
      return false;
    }

    toast.success('Contraseña actualizada', {
      description: 'Tu contraseña ha sido cambiada exitosamente.',
    });
    setIsLoading(false);
    return true;
  }, []);

  // 2FA actions
  const initiate2FA = useCallback(async (): Promise<TwoFactorSetup> => {
    setIsLoading(true);
    await simulateDelay();
    
    const secret = generateTOTPSecret();
    const qrCodeUrl = generateTOTPQRUrl(secret, profile.email);
    
    setIsLoading(false);
    return { secret, qrCodeUrl };
  }, [profile.email]);

  const verify2FACode = useCallback(async (code: string, secret: string): Promise<boolean> => {
    setIsLoading(true);
    await simulateDelay();
    
    // Simulate code verification (in real app, validate TOTP)
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      toast.error('Código inválido', {
        description: 'Ingresa un código de 6 dígitos.',
      });
      setIsLoading(false);
      return false;
    }

    // For demo, accept any 6-digit code
    setProfile(prev => ({
      ...prev,
      twoFactorEnabled: true,
      twoFactorMethod: 'app',
      twoFactorSecret: secret,
    }));

    toast.success('2FA Activado', {
      description: 'La autenticación de dos factores está configurada.',
    });
    setIsLoading(false);
    return true;
  }, []);

  const disable2FA = useCallback(async (password: string): Promise<boolean> => {
    setIsLoading(true);
    await simulateDelay();
    
    if (password.length < 4) {
      toast.error('Error', {
        description: 'Contraseña incorrecta.',
      });
      setIsLoading(false);
      return false;
    }

    setProfile(prev => ({
      ...prev,
      twoFactorEnabled: false,
      twoFactorMethod: undefined,
      twoFactorSecret: undefined,
    }));

    toast.success('2FA Desactivado', {
      description: 'La autenticación de dos factores ha sido deshabilitada.',
    });
    setIsLoading(false);
    return true;
  }, []);

  // User management actions
  const createUser = useCallback(async (data: Omit<UserProfile, 'id' | 'ultimoAcceso' | 'creadoEn' | 'twoFactorEnabled'>) => {
    setIsLoading(true);
    await simulateDelay();
    
    const newUser: UserProfile = {
      ...data,
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      ultimoAcceso: 'Nunca',
      creadoEn: new Date().toISOString().split('T')[0],
      twoFactorEnabled: false,
    };

    setUsers(prev => [...prev, newUser]);
    toast.success('Usuario creado', {
      description: `${data.nombre} ${data.apellidos} ha sido agregado al sistema.`,
    });
    setIsLoading(false);
    return newUser;
  }, [users.length]);

  const updateUser = useCallback(async (id: string, data: Partial<UserProfile>) => {
    setIsLoading(true);
    await simulateDelay();
    
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    toast.success('Usuario actualizado', {
      description: 'Los cambios han sido guardados.',
    });
    setIsLoading(false);
  }, []);

  const resetUserPassword = useCallback(async (id: string) => {
    setIsLoading(true);
    await simulateDelay();
    
    const user = users.find(u => u.id === id);
    toast.success('Contraseña restablecida', {
      description: `Se envió un email a ${user?.email} con la nueva contraseña.`,
    });
    setIsLoading(false);
  }, [users]);

  const toggleUserStatus = useCallback(async (id: string) => {
    setIsLoading(true);
    await simulateDelay();
    
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const newStatus = u.estado === 'activo' ? 'inactivo' : 'activo';
        toast.success(`Usuario ${newStatus}`, {
          description: `${u.nombre} ha sido ${newStatus === 'activo' ? 'activado' : 'desactivado'}.`,
        });
        return { ...u, estado: newStatus };
      }
      return u;
    }));
    setIsLoading(false);
  }, []);

  // System config actions
  const updateSystemConfig = useCallback(async (id: string, valor: string) => {
    setIsLoading(true);
    await simulateDelay();
    
    setSystemConfig(prev => prev.map(c => c.id === id ? { ...c, valor } : c));
    toast.success('Configuración guardada');
    setIsLoading(false);
  }, []);

  const saveAllSystemConfig = useCallback(async (configs: SystemConfig[]) => {
    setIsLoading(true);
    await simulateDelay();
    
    setSystemConfig(configs);
    toast.success('Configuración guardada', {
      description: 'Todos los cambios han sido aplicados.',
    });
    setIsLoading(false);
  }, []);

  // Notification events actions
  const updateNotificationEvent = useCallback(async (id: string, canales: NotificationEvent['canales']) => {
    setIsLoading(true);
    await simulateDelay();
    
    setNotificationEvents(prev => prev.map(e => e.id === id ? { ...e, canales } : e));
    toast.success('Notificación actualizada');
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    profile,
    users,
    systemConfig,
    notificationEvents,
    // Profile
    updateProfile,
    updatePassword,
    // 2FA
    initiate2FA,
    verify2FACode,
    disable2FA,
    // Users
    createUser,
    updateUser,
    resetUserPassword,
    toggleUserStatus,
    // Config
    updateSystemConfig,
    saveAllSystemConfig,
    updateNotificationEvent,
  };
}
