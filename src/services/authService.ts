// src/services/authService.ts
import axiosClient from "@/api/axiosClient";
import { LoginRequest, LoginResponse, User } from "@/types/api.types";

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await axiosClient.post<LoginResponse>(
      "/auth/login",
      credentials,
    );
    return data;
  },

  verify2fa: async (
    temp_token: string,
    code: string,
  ): Promise<LoginResponse> => {
    // 👇 AQUI: Asegúrate de que diga "/auth/2fa/verify"
    const { data } = await axiosClient.post<LoginResponse>("/auth/2fa/verify", {
      temp_token,
      code,
    });
    return data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_data");
  },

  // Recupera el usuario del F5
  getCurrentUser: (): User | null => {
    const userData = localStorage.getItem("user_data");
    if (!userData) return null;
    try {
      return JSON.parse(userData) as User;
    } catch {
      return null;
    }
  },

  // Valida si el token sigue existiendo
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("access_token");
  },
};
