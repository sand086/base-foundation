import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/features/users/types";
import { authService } from "@/features/users/services/authService";
import { BYPASS_AUTH } from "@/lib/utils";

//  1. IMPORTAR EL OBJETO OpenAPI GENERADO
import { OpenAPI } from "@/api/generated/core/OpenAPI";

// Configuración global de la base de la API
OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL || "";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string, refreshToken: string) => void;
  logout: () => void;
  isLoading: boolean;
  verifyOtp: (tempToken: string, code: string) => Promise<void>;
  updateUser: (newData: Partial<User>) => void;
  //  Nueva función para obtener la URL correcta de archivos (PDFs/Imágenes)
  getFileUrl: (path: string | null | undefined) => string;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // <--  USUARIO DE PRUEBA -->
  const mockUser = {
    id: 1,
    nombre: "Modo",
    apellido: "Bypass",
    email: "desarrolloSoft@asicomsystems.com.mx",
    activo: true,
    role: { nombre: "Admin", permisos: {} },
  } as any;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  //  2. LÓGICA PARA CONSTRUIR URLS DE ARCHIVOS BASADO EN EL ENV
  const getFileUrl = (path: string | null | undefined): string => {
    if (!path) return "";

    // Si ya es una URL completa (http...), no hacemos nada
    if (
      path.startsWith("http") ||
      path.startsWith("data:") ||
      path.startsWith("blob:")
    ) {
      return path;
    }

    // Usamos VITE_BACKEND_URL (que debe ser https://3tapp.online sin el /api)
    // Si no existe, usamos el origen actual del navegador como fallback
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || window.location.origin;

    // Nos aseguramos de que el path empiece con una sola barra
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    return `${backendUrl}${cleanPath}`;
  };

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    const token = localStorage.getItem("access_token");

    if (storedUser && authService.isAuthenticated() && token) {
      setUser(storedUser);

      //  INYECTAR EL TOKEN AL RECARGAR LA PÁGINA (F5)
      OpenAPI.TOKEN = token;
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

    //  INYECTAR EL TOKEN AL INICIAR SESIÓN EXITOSAMENTE
    OpenAPI.TOKEN = token;
  };

  const logout = () => {
    authService.logout();
    setUser(null);

    //  LIMPIAR EL TOKEN AL CERRAR SESIÓN
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
        isAuthenticated: BYPASS_AUTH ? true : !!user,
        login,
        logout,
        isLoading,
        verifyOtp,
        updateUser,
        getFileUrl, //  Exportamos la función
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
