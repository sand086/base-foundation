// src/components/layout/AppHeader.tsx
import { useState, useEffect } from "react";
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

import { useSystemConfig } from "@/hooks/useSystemConfig";
import { useAuth } from "@/hooks/useAuth";
import { openGlobalSearch } from "@/components/common/GlobalSearch";
import axiosClient from "@/api/axiosClient";

const getFullImageUrl = (path?: string) => {
  if (!path) return undefined;
  if (
    path.startsWith("blob:") ||
    path.startsWith("http") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  const serverBase = apiBase.replace(/\/api$/, "");
  return `${serverBase}${path}`;
};

export function AppHeader() {
  const { user: cachedUser, logout } = useAuth();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(cachedUser);

  const { value: empresaLogo } = useSystemConfig("empresa_logo");
  const { value: empresaNombre } = useSystemConfig("empresa_nombre");

  // 🚀 FIX: Dependemos solo del ID para evitar renders infinitos
  useEffect(() => {
    const fetchFreshUserData = async () => {
      if (!cachedUser?.id) return;
      try {
        const { data } = await axiosClient.get("/users/me");
        setCurrentUser(data);
      } catch (error) {
        console.error("No se pudieron recargar los datos del usuario actual.");
        setCurrentUser(cachedUser);
      }
    };

    fetchFreshUserData();
  }, [cachedUser?.id]);

  const handleLogout = () => {
    logout();
  };

  const getInitials = (nombre?: string) => {
    if (!nombre) return "US";
    const partes = nombre.trim().split(" ");
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  const safeUser = currentUser || cachedUser;

  // Extraemos el rol (dependiendo de cómo venga de la BD)
  const userRoleName =
    safeUser?.role?.nombre || safeUser?.rol || safeUser?.puesto || "Usuario";

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        {/* BRANDING DINÁMICO */}
        {empresaLogo && (
          <div className="hidden md:flex items-center justify-center h-8 w-8 bg-slate-50 border border-slate-200 rounded-md overflow-hidden shrink-0">
            <img
              src={getFullImageUrl(empresaLogo)}
              alt="Logo"
              className="h-full w-full object-contain p-0.5"
            />
          </div>
        )}

        {/* Global Search */}
        <button
          onClick={() => openGlobalSearch()}
          className="relative w-full max-w-[280px] flex items-center gap-2 h-8 px-3 text-xs bg-muted/50 hover:bg-muted/80 rounded cursor-pointer transition-colors duration-150 group border border-transparent hover:border-border/50"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors flex-1 text-left truncate">
            Buscar guías, unidades,{" "}
            {empresaNombre ? empresaNombre.split(" ")[0] : "clientes"}...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 font-medium text-muted-foreground bg-background/80 rounded border border-border/50">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* 🚀 BOTÓN DE NOTIFICACIONES (Preparado para conectarse) */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 hover:bg-muted/80"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] bg-red-600 text-white border-2 border-card shadow-sm">
            3
          </Badge>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-10 px-2 hover:bg-muted/80"
            >
              <Avatar className="h-7 w-7 border border-slate-200 shadow-sm">
                <AvatarImage
                  src={getFullImageUrl(
                    safeUser?.avatar_url || (safeUser as any)?.avatar,
                  )}
                  alt="Avatar"
                  className="object-cover bg-white"
                />
                <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-[10px]">
                  {getInitials(safeUser?.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left justify-center">
                <span className="text-xs font-medium leading-none capitalize truncate max-w-[100px]">
                  {safeUser?.nombre || "Cargando..."}
                </span>
                {/* 🚀 EL ROL DEBAJO DEL NOMBRE EN COLOR PRIMARY */}
                <span className="text-[10px] font-bold text-primary mt-1 truncate max-w-[100px] leading-none uppercase tracking-wider">
                  {userRoleName}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mt-1 shadow-xl rounded-xl"
          >
            <DropdownMenuLabel className="text-xs font-normal p-3 bg-slate-50/50">
              <span className="block font-bold text-slate-900 truncate">
                {safeUser?.nombre} {safeUser?.apellido}
              </span>
              <span className="block text-muted-foreground truncate mt-0.5">
                {safeUser?.email || "Mi Cuenta"}
              </span>
              <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                {userRoleName}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer py-2.5"
              onClick={() => navigate("/perfil")}
            >
              <UserIcon className="h-4 w-4 mr-2 text-slate-400" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer py-2.5"
              onClick={() => navigate("/configuracion")}
            >
              <Settings className="h-4 w-4 mr-2 text-slate-400" />
              Configuración Global
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-rose-600 cursor-pointer py-2.5 focus:text-rose-700 focus:bg-rose-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
