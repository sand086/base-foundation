import { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  Command,
  AlertTriangle,
  CheckCircle2,
  Info,
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
  )
    return path;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  return `${apiBase.replace(/\/api$/, "")}${path}`;
};

export function AppHeader() {
  const { user: cachedUser, logout } = useAuth();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(cachedUser);
  const [notifications, setNotifications] = useState<any[]>([]);

  const { value: empresaLogo } = useSystemConfig("empresa_logo");
  const { value: empresaNombre } = useSystemConfig("empresa_nombre");

  // 1. Fetch de Usuario Fresco
  useEffect(() => {
    const fetchFreshUserData = async () => {
      if (!cachedUser?.id) return;
      try {
        const { data } = await axiosClient.get("/users/me");
        setCurrentUser(data);
      } catch (error) {
        setCurrentUser(cachedUser);
      }
    };
    fetchFreshUserData();
  }, [cachedUser?.id]);

  // 2. 🚀 FETCH DE NOTIFICACIONES REALES
  const fetchNotifications = async () => {
    try {
      const { data } = await axiosClient.get("/notifications/me");
      setNotifications(data);
    } catch (e) {
      console.error("Error cargando notificaciones");
    }
  };

  useEffect(() => {
    if (cachedUser?.id) fetchNotifications();
    // Poll cada minuto
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [cachedUser?.id]);

  const markAllAsRead = async () => {
    try {
      await axiosClient.post("/notifications/mark-all-read");
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      // 🚀 SOLUCIÓN: Agregamos un console.error en lugar de dejar el bloque vacío
      console.error("Error al marcar notificaciones como leídas", e);
    }
  };
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => logout();

  const getInitials = (nombre?: string) => {
    if (!nombre) return "US";
    const partes = nombre.trim().split(" ");
    return partes.length >= 2
      ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
      : nombre.substring(0, 2).toUpperCase();
  };

  const safeUser = currentUser || cachedUser;
  // Extraemos el Rol
  const userRoleName =
    safeUser?.role?.nombre || safeUser?.rol || safeUser?.puesto || "Usuario";

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        {empresaLogo && (
          <div className="hidden md:flex items-center justify-center h-8 w-8 bg-slate-50 border border-slate-200 rounded-md overflow-hidden shrink-0">
            <img
              src={getFullImageUrl(empresaLogo)}
              alt="Logo"
              className="h-full w-full object-contain p-0.5"
            />
          </div>
        )}

        <button
          onClick={() => openGlobalSearch()}
          className="relative w-full max-w-[280px] flex items-center gap-2 h-8 px-3 text-xs bg-muted/50 hover:bg-muted/80 rounded cursor-pointer border border-transparent hover:border-border/50"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground flex-1 text-left truncate">
            Buscar guías, unidades, clientes...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 font-medium text-muted-foreground bg-background/80 rounded border border-border/50">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* 🚀 DROPDOWN DE NOTIFICACIONES */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 hover:bg-muted/80"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px] bg-red-600 text-white border-2 border-card shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 mt-1 shadow-xl rounded-xl p-0"
          >
            <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <span className="font-bold text-slate-800 text-sm">
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  onClick={markAllAsRead}
                  className="text-[10px] text-primary font-bold cursor-pointer hover:underline"
                >
                  Marcar todas leídas
                </span>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No tienes notificaciones
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className={`flex flex-col items-start p-3 border-b border-slate-50 cursor-pointer ${!notif.is_read ? "bg-primary/5" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className={`text-xs font-bold flex items-center gap-1 ${notif.event_type?.includes("trip") ? "text-rose-600" : "text-amber-600"}`}
                      >
                        {notif.event_type?.includes("trip") ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                        {notif.title}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {notif.message}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 🚀 DROPDOWN DEL PERFIL (Con Rol en Primary) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-10 px-2 hover:bg-muted/80"
            >
              <Avatar className="h-7 w-7 border border-slate-200 shadow-sm">
                <AvatarImage
                  src={getFullImageUrl(safeUser?.avatar_url)}
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
                {/* 🚀 AQUÍ ESTÁ EL ROL DEBAJO DEL NOMBRE EN PRIMARY */}
                <span className="text-[10px] font-black text-primary mt-1 truncate max-w-[100px] leading-none uppercase tracking-wider">
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
                {safeUser?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/perfil")}
              className="text-xs cursor-pointer py-2.5"
            >
              <UserIcon className="h-4 w-4 mr-2 text-slate-400" /> Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/configuracion")}
              className="text-xs cursor-pointer py-2.5"
            >
              <Settings className="h-4 w-4 mr-2 text-slate-400" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-rose-600 cursor-pointer py-2.5"
            >
              <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
