import axiosClient from "@/api/axiosClient";
import { LoginResponse, TwoFactorVerifyRequest } from "@/types/api.types";

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  verify2FA: async (
    tempToken: string,
    code: string,
  ): Promise<LoginResponse> => {
    const payload: TwoFactorVerifyRequest = {
      temp_token: tempToken,
      code,
    };
    const response = await axiosClient.post<LoginResponse>(
      "/auth/2fa/verify",
      payload,
    );
    return response.data;
  },
};
