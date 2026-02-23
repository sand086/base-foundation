import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Mientras lee el localStorage (ocurre en milisegundos), mostramos un loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si está autenticado, muestra la ruta solicitada (Outlet). Si no, lo manda al login.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
