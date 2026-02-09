import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { authService } from "@/services/authService";
import { User, LoginResponse } from "@/types/api.types";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyOtp: (tempToken: string, code: string) => Promise<void>; // Nueva función
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  // Inicializar sesión desde localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      try {
        setIsAuthenticated(true);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing user from storage", e);
        localStorage.clear();
      }
    }
  }, []);

  const handleSessionSuccess = (data: LoginResponse) => {
    if (data.access_token && data.user) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setIsAuthenticated(true);
      setUser(data.user);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await authService.login(email, password);

      // Si el backend pide 2FA, retornamos la data para que el UI redirija
      if (data.require_2fa) {
        return data;
      }

      // Si es login directo, guardamos sesión
      handleSessionSuccess(data);
      return data;
    } catch (error: any) {
      throw error;
    }
  }, []);

  // Función para el paso 2 del login
  const verifyOtp = useCallback(
    async (tempToken: string, code: string) => {
      try {
        const data = await authService.verify2FA(tempToken, code);
        handleSessionSuccess(data);
        toast({
          title: "Acceso concedido",
          description: "Identidad verificada correctamente.",
        });
      } catch (error: any) {
        throw error;
      }
    },
    [toast],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    toast({ title: "Sesión cerrada" });
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
