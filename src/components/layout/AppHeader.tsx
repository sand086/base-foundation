import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
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
import { useAuth } from "@/context/AuthContext";
import { openGlobalSearch } from "@/components/common/GlobalSearch";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card px-4">
      {/* Global Search - Clickable to open Command Palette */}
      <button
        onClick={() => openGlobalSearch()}
        className="relative w-72 flex items-center gap-2 h-8 px-3 text-xs bg-muted/50 hover:bg-muted/80 rounded cursor-pointer transition-colors duration-150 group"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors flex-1 text-left">
          Buscar guías, clients, unidades...
        </span>
        {/* Keyboard shortcut hint */}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-background/80 rounded border border-border/50">
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
                <AvatarImage alt="Avatar" />
                <AvatarFallback className="bg-brand-red text-white text-[10px] font-bold">
                  {user?.username?.slice(0, 2).toUpperCase() || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-medium leading-none capitalize">
                  {user?.username || "Administrador"}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer"
              onClick={() => navigate("/perfil")}
            >
              <User className="h-3.5 w-3.5 mr-2" />
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
