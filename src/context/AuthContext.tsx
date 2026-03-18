// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
// Importamos la interfaz User exacta que me mostraste de tus tipos
import { User } from "@/types/api.types";
import { authService } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string, refreshToken: string) => void;
  logout: () => void;
  isLoading: boolean;
  verifyOtp: (tempToken: string, code: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app (F5), intentamos recuperar la sesión
    const storedUser = authService.getCurrentUser();

    // Validamos que exista tanto el usuario como el token válido
    if (storedUser && authService.isAuthenticated()) {
      setUser(storedUser);
    }

    // Una vez que terminó de comprobar, quitamos el loading
    setIsLoading(false);
  }, []);

  const login = (userData: User, token: string, refreshToken: string) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("refresh_token", refreshToken); // 💾 La llave de 7 días
    localStorage.setItem("user_data", JSON.stringify(userData));

    setUser(userData);
  };

  const logout = () => {
    // 🧹 Limpiamos localStorage (Asegúrate que authService.logout()
    // borre tanto access_token como refresh_token)
    authService.logout();
    setUser(null);
    window.location.href = "/login";
  };
  const verifyOtp = async (tempToken: string, code: string) => {
    try {
      const data = await authService.verify2FA({ temp_token: tempToken, code });

      // 🛡️ Validación de seguridad: Aseguramos que el backend mandó todo
      if (data.user && data.access_token && data.refresh_token) {
        login(data.user, data.access_token, data.refresh_token);
      } else {
        throw new Error("Respuesta de autenticación incompleta");
      }
    } catch (error) {
      console.error("Error al verificar OTP:", error);
      throw error;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
