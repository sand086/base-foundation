import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/features/users/types";
import { authService } from "@/features/users/services/authService";

// 👉 1. IMPORTAR EL OBJETO OpenAPI GENERADO
// Asegúrate de que la ruta apunte a donde está tu carpeta 'generated'
import { OpenAPI } from "@/api/generated/core/OpenAPI";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string, refreshToken: string) => void;
  logout: () => void;
  isLoading: boolean;
  verifyOtp: (tempToken: string, code: string) => Promise<void>;
  updateUser: (newData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    // Recuperamos el token de acceso
    const token = localStorage.getItem("access_token");

    if (storedUser && authService.isAuthenticated() && token) {
      setUser(storedUser);

      // 👉 2. INYECTAR EL TOKEN AL RECARGAR LA PÁGINA (F5)
      OpenAPI.TOKEN = token;

      // OPCIONAL: Si tu API necesita saber la URL base globalmente, la defines aquí.
      // Si ya la configuraste en otro lado o en tu generador, puedes ignorar esta línea.
      // OpenAPI.BASE = "http://localhost:8080";
    }
    setIsLoading(false);
  }, []);

  const updateUser = (newData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      const updatedUser = { ...prevUser, ...newData };
      localStorage.setItem("user_data", JSON.stringify(updatedUser));

      return updatedUser;
    });
  };

  const login = (userData: User, token: string, refreshToken: string) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_data", JSON.stringify(userData));
    setUser(userData);

    // 👉 3. INYECTAR EL TOKEN AL INICIAR SESIÓN EXITOSAMENTE
    OpenAPI.TOKEN = token;
  };

  const logout = () => {
    authService.logout();
    setUser(null);

    // 👉 4. LIMPIAR EL TOKEN AL CERRAR SESIÓN POR SEGURIDAD
    OpenAPI.TOKEN = undefined;

    window.location.href = "/login";
  };

  const verifyOtp = async (tempToken: string, code: string) => {
    try {
      const data = await authService.verify2FA({ temp_token: tempToken, code });
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
        updateUser,
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
