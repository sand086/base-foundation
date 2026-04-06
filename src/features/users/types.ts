// src/features/users/types.ts

// ==========================================
// CORE USER INTERFACES
// ==========================================

export interface User {
  id: number;
  nombre: string;
  apellido?: string | null;
  email: string;
  role_id?: number | null;
  puesto?: string | null;
  avatar_url?: string;
  activo?: boolean;
  // Objeto de rol detallado que viene del backend
  role?: {
    id: number;
    nombre: string;
    name_key: string;
  };
  // Propiedad legacy por si algunos componentes aún la usan
  rol?: string;
}

/**
 * Perfil extendido del usuario para la página de "Mi Cuenta"
 */
export interface UserProfile extends User {
  telefono?: string;
  is_2fa_enabled: boolean;
  ultimo_acceso?: string;
  creado_en?: string;
}

// ==========================================
// AUTHENTICATION FLOWS
// ==========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  require_2fa?: boolean;
  temp_token?: string; // Token temporal para verificar 2FA si está activo
}

// ==========================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ==========================================

export interface TwoFactorVerifyRequest {
  temp_token: string;
  code: string;
}

export interface TwoFactorVerifyResponse {
  access_token?: string;
  token_type?: string;
  user?: User;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code_url: string;
}

// ==========================================
// ROLES Y PERMISOS (Basado en el modelo Role de SQLAlchemy)
// ==========================================

export interface Role {
  id: number;
  name_key: string;
  nombre: string;
  descripcion?: string;
  permisos: Record<string, any>; // Diccionario JSONB de permisos
}

export interface CreatePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
