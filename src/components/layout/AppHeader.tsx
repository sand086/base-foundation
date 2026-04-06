import { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  Command,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sun,
  Moon,
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

import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import { useAuth } from "@/hooks/useAuth";
import { openGlobalSearch } from "@/components/common/GlobalSearch";
import axiosClient from "@/api/axiosClient";
import { cn } from "@/lib/utils";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);

  // 🌙 ESTADO Y LÓGICA DEL DARK MODE
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Revisa si ya hay un tema guardado o si el sistema de la PC está en oscuro
    const isDark =
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setTheme("light");
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await axiosClient.get("/notifications/me");
      setNotifications(data);
    } catch (e) {
      console.error("Error cargando notificaciones", e);
    }
  };

  useEffect(() => {
    // Solo disparamos si hay un usuario logueado
    if (!user?.id) return;

    fetchNotifications();

    // Polling: sigue buscando notificaciones cada 60 segundos
    const interval = setInterval(fetchNotifications, 60000);

    // Limpieza al desmontar o cuando cambie el usuario
    return () => clearInterval(interval);
  }, [user?.id]);

  const markAllAsRead = async () => {
    try {
      await axiosClient.post("/notifications/mark-all-read");
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
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

  const userRoleName =
    user?.role?.nombre || user?.rol || user?.puesto || "Usuario";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-brand-navy/80 backdrop-blur-2xl px-4 md:px-6 shadow-sm transition-all">
      {/* IZQUIERDA: Búsqueda Spotlight */}
      <div className="flex items-center flex-1">
        <button
          onClick={() => openGlobalSearch()}
          className={cn(
            "relative w-full max-w-[350px] flex items-center gap-3 h-10 px-4 rounded-xl",
            "bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300",
            "text-[12px] font-medium text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white shadow-inner group",
          )}
        >
          <Search className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity group-hover:text-brand-red" />
          <span className="flex-1 text-left truncate tracking-wide">
            Buscar guías, unidades, clientes...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 bg-white dark:bg-white/10 rounded-md border border-slate-200 dark:border-white/10 shadow-sm">
            <Command className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* DERECHA: Interacciones */}
      <div className="flex items-center gap-3">
        {/* 🌙 BOTÓN DE DARK MODE / LIGHT MODE */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative h-10 w-10 rounded-xl bg-transparent border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:shadow-sm transition-all duration-300"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-slate-600 dark:text-white/70 transition-all" />
          ) : (
            <Sun className="h-4 w-4 text-slate-600 dark:text-white/70 transition-all" />
          )}
        </Button>

        {/* DROPDOWN NOTIFICACIONES */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-xl bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:shadow-sm transition-all duration-300"
            >
              <Bell className="h-5 w-5 text-slate-600 dark:text-white/70" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-black bg-brand-red text-white shadow-sm border-2 border-white dark:border-brand-navy animate-in zoom-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            avoidCollisions={false}
            sideOffset={12}
            className="w-[340px] p-0 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-brand-navy shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
          >
            <div className="flex justify-between items-center p-4 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-brand-red cursor-pointer hover:text-red-700 transition-colors uppercase tracking-widest"
                >
                  Marcar Leídas
                </span>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white dark:bg-brand-navy">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/10">
                    <CheckCircle2 className="h-6 w-6 text-slate-300 dark:text-white/20" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-white/40">
                    Todo al día
                  </span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className={cn(
                      "flex flex-col items-start p-4 border-b border-slate-50 dark:border-white/5 cursor-pointer transition-colors rounded-none",
                      !notif.is_read
                        ? "bg-red-50/30 dark:bg-brand-red/10"
                        : "hover:bg-slate-50 dark:hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span
                        className={cn(
                          "text-[12px] font-bold flex items-center gap-1.5",
                          notif.event_type?.includes("trip")
                            ? "text-brand-red"
                            : "text-amber-600",
                        )}
                      >
                        {notif.event_type?.includes("trip") ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                        {notif.title}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-white/40">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-600 dark:text-white/70 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* DROPDOWN PERFIL DE USUARIO */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 h-11 px-2 md:px-3 rounded-xl bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group outline-none"
            >
              <Avatar className="h-8 w-8 border border-slate-200 dark:border-white/20 shadow-sm transition-transform group-hover:scale-105">
                <AvatarImage
                  src={getFullImageUrl(user?.avatar_url)}
                  alt="Avatar"
                  className="object-cover bg-white dark:bg-brand-navy"
                />
                <AvatarFallback className="bg-brand-navy dark:bg-white/10 text-white font-bold text-[11px]">
                  {getInitials(user?.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left justify-center">
                <span className="text-[12px] font-bold leading-none text-slate-800 dark:text-white uppercase tracking-tight truncate max-w-[130px]">
                  {user?.nombre || "Cargando..."}
                </span>
                <span className="text-[9px] font-black text-brand-red mt-1.5 truncate max-w-[130px] leading-none uppercase tracking-[0.15em]">
                  {userRoleName}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-white/40 ml-1 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            avoidCollisions={false}
            sideOffset={12}
            className="w-64 p-0 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-brand-navy shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <DropdownMenuLabel className="p-4 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
              <span className="block text-[14px] font-bold text-slate-800 dark:text-white truncate">
                {user?.nombre} {user?.apellido}
              </span>
              <span className="block text-[11px] font-medium tracking-wide text-slate-500 dark:text-white/50 truncate mt-1">
                {user?.email}
              </span>
            </DropdownMenuLabel>

            <div className="p-2 bg-white dark:bg-brand-navy">
              <DropdownMenuItem
                onClick={() => navigate("/perfil")}
                className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/70 cursor-pointer py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <UserIcon className="h-4 w-4 mr-3 opacity-70" /> Mi Expediente
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/configuracion")}
                className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/70 cursor-pointer py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <Settings className="h-4 w-4 mr-3 opacity-70" /> Preferencias
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-2" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-[12px] font-black uppercase tracking-wider text-brand-red cursor-pointer py-3 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-brand-red/10 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" /> Cerrar Sesión
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
