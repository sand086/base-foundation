import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  Command,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Importamos el hook que hicimos para la sesión
import { useAuth } from "@/context/AuthContext";
import { openGlobalSearch } from "@/components/common/GlobalSearch";

export function AppHeader() {
  const { user, logout } = useAuth(); // Traemos al usuario del estado global
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Esto limpia el localStorage y manda al login
  };

  // Helper para sacar las iniciales ("Juan Perez" -> "JP", "Admin" -> "AD")
  const getInitials = (nombre?: string) => {
    if (!nombre) return "US";
    const partes = nombre.trim().split(" ");
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card px-4">
      {/* Global Search */}
      <button
        onClick={() => openGlobalSearch()}
        className="relative w-72 flex items-center gap-2 h-8 px-3 text-xs bg-muted/50 hover:bg-muted/80 rounded cursor-pointer transition-colors duration-150 group"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors flex-1 text-left">
          Buscar guías, clientes, unidades...
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5  font-medium text-muted-foreground bg-background/80 rounded border border-border/50">
          <Command className="h-2.5 w-2.5" />
          <span>K</span>
        </kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] bg-brand-red text-white border-2 border-card">
            3
          </Badge>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-8 px-2"
            >
              <Avatar className="h-6 w-6">
                {/* Leemos el avatar_url de la DB si existe */}
                <AvatarImage src={user?.avatar_url || ""} alt="Avatar" />
                <AvatarFallback className="bg-brand-red text-white  font-bold">
                  {getInitials(user?.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                {/* Usamos user.nombre real */}
                <span className="text-xs font-medium leading-none capitalize">
                  {user?.nombre || "Cargando..."}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">
              <span className="block truncate">
                {user?.email || "Mi Cuenta"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer"
              onClick={() => navigate("/perfil")}
            >
              <UserIcon className="h-3.5 w-3.5 mr-2" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer"
              onClick={() => navigate("/configuracion")}
            >
              <Settings className="h-3.5 w-3.5 mr-2" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-brand-red cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
