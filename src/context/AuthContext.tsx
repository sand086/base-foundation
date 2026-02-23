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
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const login = (userData: User, token: string) => {
    // Guardamos en localStorage para que resista el F5
    localStorage.setItem("access_token", token);
    localStorage.setItem("user_data", JSON.stringify(userData));

    // Guardamos en el estado de React
    setUser(userData);
  };

  const logout = () => {
    // Limpiamos todo mediante el servicio
    authService.logout();
    setUser(null);

    // Redirigimos al login forzando la recarga para limpiar cualquier estado residual en memoria
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto en cualquier parte de la app
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
