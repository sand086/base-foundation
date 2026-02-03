import axiosClient from "@/api/axiosClient";
import { LoginResponse } from "@/types/api.types";

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // El endpoint en fastapi espera json body
    const response = await axiosClient.post("/auth/login", { email, password });
    return response.data;
  },

  verify2FA: async (
    tempToken: string,
    code: string,
  ): Promise<LoginResponse> => {
    const response = await axiosClient.post("/auth/2fa/verify", {
      temp_token: tempToken,
      code,
    });
    return response.data;
  },
};
