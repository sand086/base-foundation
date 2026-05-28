import axiosClient from "@/api/axiosClient";
import { LoginRequest, LoginResponse, User } from "@/features/users/types";

//   NUEVO: Extendemos tu interfaz original para decirle a TypeScript que ahora enviamos el token
export interface LoginWithCaptchaRequest extends LoginRequest {
  recaptcha_token: string;
}

export const authService = {
  // 1. Inicio de sesión primario (Actualizado para recibir el token de reCAPTCHA)
  login: async (
    credentials: LoginWithCaptchaRequest,
  ): Promise<LoginResponse> => {
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
      "/api/auth/verify-2fa",
      payload,
    );
    return data;
  },

  /**
   * 3. Renovación de Token (NUEVO)
   * Este método es llamado por el interceptor de Axios cuando el access_token expira.
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const { data } = await axiosClient.post<LoginResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  // 4. Limpieza de sesión mejorada
  logout: async () => {
    try {
      //  Le avisamos al backend que destruya la sesión en BD (Si falla, no pasa nada)
      await axiosClient.post("/api/auth/logout");
    } catch (e) {
      console.warn("El token ya estaba inactivo en el servidor.");
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
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
