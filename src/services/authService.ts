// src/services/authService.ts
import axiosClient from "@/api/axiosClient";
import { LoginRequest, LoginResponse, User } from "@/types/api.types";

export const authService = {
  // 1. Inicio de sesión primario
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await axiosClient.post<LoginResponse>(
      "/auth/login",
      credentials,
    );
    return data;
  },

  /**
   * 2. Verificación de Segundo Factor (2FA)
   * 🚀 Unificado para que coincida con el AuthContext y el backend de Python
   */
  verify2FA: async (payload: {
    temp_token: string;
    code: string;
  }): Promise<LoginResponse> => {
    // Asegúrate de que este endpoint sea el que definiste en FastAPI
    const { data } = await axiosClient.post<LoginResponse>(
      "/auth/verify-2fa",
      payload,
    );
    return data;
  },

  // 3. Limpieza de sesión
  logout: () => {
    localStorage.removeItem("access_token");
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
   * Valida de forma rápida si existe un token en el navegador
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("access_token");
  },
};
