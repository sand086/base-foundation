import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Truck,
  Radar,
  CalendarPlus,
  Fuel,
  FileCheck,
  Navigation,
  Briefcase,
  DollarSign,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  CreditCard,
  Calculator,
  Landmark,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { SidebarIconKey } from "@/assets/img/icons/sidebar";
import { SidebarSvgIcon } from "@/components/common/SidebarSvgIcon";
import { AnimatedLogo } from "@/components/common/AnimatedLogo";

//  1. IMPORTAMOS LOS HOOKS DE SEGURIDAD
import {
  getPermissionSnapshot,
  usePermissions,
} from "@/hooks/use-permissions";
import { useAuth } from "@/context/AuthContext";

//  2. AGREGAMOS EL MODULE_CODE A LA INTERFAZ
interface MenuItem {
  title: string;
  icon?: React.ElementType;
  iconSrc?: string;
  iconName?: SidebarIconKey;
  path?: string;
  moduleCode?: string; // <--- Clave para vincular con la BD
  children?: { title: string; path: string; moduleCode?: string }[];
}

//  3. MAPEAMOS LOS CÓDIGOS DE MÓDULO EXACTOS
// Nota: Si un item NO tiene moduleCode, todos lo podrán ver (ej: Dashboard).
const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    // Sin moduleCode = Público para cualquier logueado
  },
  {
    title: "Clientes",
    icon: Users,
    iconName: "Clientes",
    moduleCode: "clients",
    children: [
      { title: "Catálogo", path: "/clients" },
      { title: "Nuevo Cliente", path: "/clients/new" },
    ],
  },
  {
    title: "Tarifas",
    icon: Calculator,
    iconName: "Tarifas",
    path: "/rates",
    moduleCode: "rates",
  },
  {
    title: "Flota",
    icon: Truck,
    iconName: "Flota",
    moduleCode: "fleet",
    children: [
      { title: "Unidades", path: "/fleet" },
      { title: "Operadores", path: "/fleet/operators" },
      { title: "Llantas", path: "/fleet/tires" },
      { title: "Mantenimiento", path: "/fleet/maintenance" },
      { title: "Mecánicos", path: "/fleet/mechanics" },
    ],
  },
  {
    title: "Histórico",
    icon: Radar,
    iconName: "Monitoreo",
    path: "/monitoring",
    moduleCode: "monitoring",
  },
  {
    title: "Tracking Op",
    icon: Navigation,
    path: "/traffic-control",
    moduleCode: "traffic",
  },
  {
    title: "Despacho",
    icon: CalendarPlus,
    path: "/dispatch",
    moduleCode: "dispatch",
  },
  {
    title: "Combustible",
    icon: Fuel,
    iconName: "Combustible",
    moduleCode: "fuel",
    children: [
      { title: "Cargas", path: "/fuel/loads" },
      { title: "Conciliación", path: "/fuel/conciliation" },
    ],
  },
  {
    title: "Liquidación",
    icon: FileCheck,
    iconName: "Liquidacion",
    path: "/settlements",
    moduleCode: "settlements",
  },
  {
    title: "Proveedores",
    icon: Briefcase, // Elegimos un icono que tenga sentido (Maletín/Empresa)
    iconName: "Proveedores", // Si tienes un SVG para proveedores
    path: "/suppliers",
    moduleCode: "payables", // <- Se protege con el permiso de payables
  },
  {
    title: "Cuentas por Pagar",
    icon: CreditCard,
    path: "/payables",
    moduleCode: "payables", // <- Se protege con el permiso de payables
  },
  {
    title: "Cuentas por Cobrar",
    icon: DollarSign,
    iconName: "Cobranza",
    path: "/receivables",
    moduleCode: "receivables",
  },
  {
    title: "Tesorería",
    icon: Landmark,
    path: "/treasury",
    moduleCode: "treasury",
  },
  {
    title: "Administración",
    icon: Settings,
    iconName: "Administracion",
    moduleCode: "admin", // Solo roles de administración verán esto
    children: [
      { title: "Usuarios", path: "/users" },
      { title: "Roles y Permisos", path: "/roles-permissions" },
      { title: "Mi Perfil", path: "/profile" },
      { title: "Configuración", path: "/settings" },
      { title: "Notificaciones", path: "/notifications" },
      { title: "Cargas Masivas", path: "/bulk-uploads" },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const location = useLocation();

  //  4. INVOCAMOS LOS HOOKS DE SEGURIDAD
  const { isAdmin } = usePermissions();
  const { user } = useAuth();

  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Clientes",
    "Flota",
    "Combustible",
  ]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const isActive = (path?: string, children?: { path: string }[]) => {
    if (path && location.pathname === path) return true;
    if (children)
      return children.some((child) => location.pathname.startsWith(child.path));
    return false;
  };

  //  5. LÓGICA DE FILTRADO (MAGIA RBAC)
  const filteredMenu = menuItems.filter((item) => {
    // Si es administrador o superadmin, dejamos pasar todo
    if (isAdmin) return true;

    // Si el ítem no tiene código (es público como el Dashboard), lo dejamos pasar
    if (!item.moduleCode) return true;

    return getPermissionSnapshot(user, item.moduleCode).canRead;
  });

  const RenderIcon = ({
    item,
    active,
  }: {
    item: MenuItem;
    active?: boolean;
  }) => {
    const iconClass = cn(
      "h-5 w-5 shrink-0 transition-all duration-300",
      active
        ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
        : "text-muted-foreground group-hover:text-foreground",
    );

    const svgFilters = active
      ? "brightness-0 invert opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
      : "brightness-0 dark:invert opacity-50 group-hover:opacity-100";

    if (item.iconName)
      return (
        <SidebarSvgIcon
          name={item.iconName}
          className={cn(
            "h-5 w-5 shrink-0 transition-all duration-300",
            svgFilters,
          )}
          alt={item.title}
          variant="original"
        />
      );

    if (item.iconSrc)
      return (
        <img
          src={item.iconSrc}
          alt={item.title}
          className={cn(
            "h-5 w-5 shrink-0 transition-all duration-300",
            svgFilters,
          )}
          loading="lazy"
        />
      );

    if (item.icon) {
      const Icon = item.icon;
      return <Icon className={iconClass} />;
    }
    return null;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col overflow-hidden",
        "bg-card/95 dark:bg-brand-navy/95 border-r border-border shadow-sm dark:shadow-[20px_0_40px_rgba(0,0,0,0.2)]",
        "md:translate-x-0",
        mobileOpen
          ? "translate-x-0 w-64"
          : "-translate-x-full md:translate-x-0",
        collapsed ? "md:w-16" : "md:w-64",
      )}
    >
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-muted/50 to-transparent pointer-events-none" />

      {/* Logo + Mobile close */}
      <div className="flex h-16 items-center justify-between border-b border-border relative z-10 shrink-0 bg-muted/30 px-3">
        <AnimatedLogo
          collapsed={collapsed && !mobileOpen}
          className={collapsed && !mobileOpen ? "h-8 w-8" : "h-10"}
        />
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="md:hidden h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="p-3 border-b border-border shrink-0 bg-card/50 hidden md:block">
        <Button
          variant="ghost"
          onClick={onToggle}
          className={cn(
            "h-9 text-[11px] font-bold uppercase tracking-widest transition-all w-full border",
            "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent hover:border-border",
            collapsed ? "justify-center px-0" : "justify-start px-3",
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 drop-shadow-sm" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 mr-3" /> Colapsar Menú
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <nav className="p-3 space-y-1 relative z-10">
          {/*  6. RENDERIZAMOS EL MENÚ FILTRADO */}
          {filteredMenu.map((item) => {
            const active = isActive(item.path, item.children);
            const showLabels = !collapsed || mobileOpen;
            return (
              <div key={item.title} className="mb-1">
                {item.children ? (
                  <>
                    <button
                      onClick={() => showLabels && toggleExpand(item.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-medium transition-all duration-300 group outline-none",
                        active
                          ? "bg-brand-red text-white shadow-[0_4px_15px_rgba(190,8,17,0.4)]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RenderIcon item={item} active={active} />
                        {showLabels && (
                          <span className="tracking-wide">{item.title}</span>
                        )}
                      </div>

                      {showLabels && (
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300",
                            expandedItems.includes(item.title)
                              ? "rotate-180 text-foreground"
                              : "text-muted-foreground",
                            active && "text-white",
                          )}
                        />
                      )}
                    </button>

                    {showLabels && expandedItems.includes(item.title) && (
                      <div className="mt-1 mb-2 ml-5 border-l border-border pl-3 py-1 space-y-1 animate-in slide-in-from-top-2 fade-in duration-300">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            end={
                              child.path === "/fleet" ||
                              child.path === "/clients"
                            }
                            className={({ isActive: isChildActive }) =>
                              cn(
                                "block rounded-lg px-3 py-2 text-[11px] transition-all duration-300 relative overflow-hidden",
                                isChildActive
                                  ? "text-brand-red font-black uppercase tracking-widest bg-brand-red/5 dark:bg-brand-red/10 border border-brand-red/10 dark:border-brand-red/20 shadow-inner"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium",
                              )
                            }
                          >
                            {child.title}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path!}
                    className={({ isActive: isItemActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-medium transition-all duration-300 group",
                        isItemActive
                          ? "bg-brand-red text-white shadow-[0_4px_15px_rgba(190,8,17,0.4)]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    {({ isActive: isItemActive }) => (
                      <>
                        <RenderIcon item={item} active={isItemActive} />
                        {showLabels && (
                          <span className="tracking-wide">{item.title}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
