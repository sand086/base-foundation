import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types/api.types";
import { authService } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string, refreshToken: string) => void;
  logout: () => void;
  isLoading: boolean;
  verifyOtp: (tempToken: string, code: string) => Promise<void>;
  //  AGREGAMOS LA DEFINICIÓN AQUÍ
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
    if (storedUser && authService.isAuthenticated()) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  //  IMPLEMENTACIÓN DE UPDATE USER
  const updateUser = (newData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      const updatedUser = { ...prevUser, ...newData };

      // Es vital actualizar localStorage para que el cambio persista al recargar (F5)
      localStorage.setItem("user_data", JSON.stringify(updatedUser));

      return updatedUser;
    });
  };

  const login = (userData: User, token: string, refreshToken: string) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_data", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
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
        //  PASAMOS LA FUNCIÓN AL PROVIDER
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
