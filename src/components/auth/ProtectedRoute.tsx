import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";
import { BYPASS_AUTH } from "@/lib/utils";

// Agregamos una prop para que la ruta exija un módulo
interface ProtectedRouteProps {
  requiredModule?: string;
}

export const ProtectedRoute = ({ requiredModule }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Usamos el hook para saber si tiene permisos de ver este módulo
  const { canRead } = usePermissions(requiredModule);
  if (BYPASS_AUTH) return <Outlet />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Si se exige un módulo, y NO tiene permisos de lectura, lo mandamos al inicio
  if (requiredModule && !canRead) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
