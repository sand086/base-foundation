import axiosClient from "@/api/axiosClient";
import { LoginRequest, LoginResponse, User } from "@/features/users/types";

export const authService = {
  // 1. Inicio de sesión primario
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await axiosClient.post<LoginResponse>(
      "/api/auth/login",
      credentials,
    );
    return data;
  },

  /**
   * 2. Verificación de Segundo Factor (2FA)
   */
  verify2FA: async (payload: {
    temp_token: string;
    code: string;
  }): Promise<LoginResponse> => {
    const { data } = await axiosClient.post<LoginResponse>(
      "/auth/verify-2fa",
      payload,
    );
    return data;
  },

  /**
   *  3. Renovación de Token (NUEVO)
   * Este método es llamado por el interceptor de Axios cuando el access_token expira.
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const { data } = await axiosClient.post<LoginResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  // 4. Limpieza de sesión mejorada
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token"); // 🧹 Limpiamos la llave de larga duración
    localStorage.removeItem("user_data");

    // Opcional: Podrías llamar a un endpoint de /auth/logout en el backend
    // para borrar el refresh_token de la base de datos y por seguridad.
  },

  /**
   * Recupera los datos del usuario del localStorage (útil para F5)
   */
  getCurrentUser: (): User | null => {
    const userData = localStorage.getItem("user_data");
    if (!userData) return null;
    try {
      return JSON.parse(userData) as User;
    } catch {
      return null;
    }
  },

  /**
   * Valida de forma rápida si existe un token en el navegador.
   * Ahora chequeamos que al menos exista el access_token.
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("access_token");
  },
};
