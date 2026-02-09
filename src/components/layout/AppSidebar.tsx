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
  Briefcase,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Calculator,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { SidebarIconKey } from "@/assets/img/icons/sidebar";
import { SidebarSvgIcon } from "@/components/common/SidebarSvgIcon";
import { AnimatedLogo } from "@/components/common/AnimatedLogo";

interface MenuItem {
  title: string;
  icon?: React.ElementType; // fallback lucide
  iconSrc?: string; // svg en public/img/icons/sidebar/*.svg
  iconName?: SidebarIconKey;
  path?: string;
  children?: { title: string; path: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,

    path: "/",
  },
  {
    title: "Clientes",
    icon: Users, // fallback por si algo falla
    iconName: "Clientes", // ESTE es el que usa tu svg real
    children: [
      { title: "Catálogo", path: "/clients" },
      { title: "Nuevo Client", path: "/clients/nuevo" },
    ],
  },

  {
    title: "Tarifas",
    icon: Calculator,
    iconName: "Tarifas",
    path: "/tarifas",
  },
  {
    title: "Flota",
    icon: Truck,
    iconName: "Flota",
    children: [
      { title: "Unidades", path: "/flota" },
      { title: "Operadores", path: "/flota/operadores" },
      { title: "Llantas", path: "/flota/llantas" },
      { title: "Mantenimiento", path: "/flota/mantenimiento" },
    ],
  },
  {
    title: "Monitoreo",
    icon: Radar,
    iconName: "Monitoreo",
    path: "/monitoreo",
  },
  {
    title: "Despacho",
    icon: CalendarPlus,
    iconName: "Despacho",
    path: "/despacho",
  },
  {
    title: "Combustible",
    icon: Fuel,
    iconName: "Combustible",
    children: [
      { title: "Cargas", path: "/combustible" },
      { title: "Conciliación", path: "/combustible/conciliacion" },
    ],
  },
  {
    title: "Liquidación",
    icon: FileCheck,
    iconName: "Liquidacion",
    path: "/cierre",
  },
  {
    title: "Proveedores",
    icon: Briefcase,
    iconName: "Proveedores",
  },
  {
    title: "Cobranza",
    icon: DollarSign,
    iconName: "Cobranza",
    path: "/cuentas-por-cobrar",
  },
  {
    title: "Tesorería",
    icon: Landmark,
    iconName: "Tesoreria",
    path: "/tesoreria",
  },
  {
    title: "Administración",
    icon: Settings,
    iconName: "Administracion",
    children: [
      { title: "Usuarios", path: "/usuarios" },
      { title: "Roles y Permisos", path: "/roles-permisos" },
      { title: "Mi Perfil", path: "/perfil" },
      { title: "Configuración", path: "/configuracion" },
      { title: "Notificaciones", path: "/notificaciones" },
      { title: "Cargas Masivas", path: "/cargas-masivas" },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
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

  // Render de icono: usa SVG (negro -> blanco) y si no existe, usa lucide
  const RenderIcon = ({ item }: { item: MenuItem }) => {
    // 1) PRIORIDAD: si tiene iconName, usa el SVG importado del registry
    if (item.iconName) {
      return (
        <SidebarSvgIcon
          name={item.iconName}
          className="h-6 w-6 shrink-0"
          alt={item.title}
        />
      );
    }

    // 2) Si tiene iconSrc (ruta en public), usa <img>
    if (item.iconSrc) {
      return (
        <img
          src={item.iconSrc}
          alt={item.title}
          className="h-6 w-6 shrink-0 brightness-0 invert"
          loading="lazy"
        />
      );
    }

    // 3) Fallback lucide
    if (item.icon) {
      const Icon = item.icon;
      return <Icon className="h-6 w-6 shrink-0" />;
    }

    return null;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-brand-black text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border sidebar-elevated",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header with Animated Logo */}
      <div className="flex h-14 items-center justify-center px-3 border-b border-sidebar-border">
        <AnimatedLogo
          collapsed={collapsed}
          className={collapsed ? "h-8 w-8" : "h-10"}
        />
      </div>

      {/* Toggle Button */}
      <div className="px-2 py-1.5 border-b border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white h-8 text-xs",
            collapsed ? "w-full justify-center" : "w-full justify-start",
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 mr-2" /> Colapsar
            </>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 h-[calc(100vh-7rem)]">
        <nav className="px-2 py-2">
          {menuItems.map((item) => (
            <div key={item.title} className="mb-0.5">
              {item.children ? (
                <>
                  <button
                    onClick={() => !collapsed && toggleExpand(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2.5 py-2 text-xs font-medium",
                      "transition-all duration-200 ease-out",
                      "hover:bg-sidebar-accent hover:text-white hover:translate-x-0.5",
                      isActive(undefined, item.children) &&
                        "bg-sidebar-accent text-white border-l-2 border-brand-red",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <RenderIcon item={item} />
                      {!collapsed && <span>{item.title}</span>}
                    </div>

                    {!collapsed &&
                      (expandedItems.includes(item.title) ? (
                        <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground transition-transform duration-200" />
                      ))}
                  </button>

                  {!collapsed && expandedItems.includes(item.title) && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3 animate-in slide-in-from-top-1 fade-in duration-200">
                      {item.children.map((child, idx) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          style={{ animationDelay: `${idx * 30}ms` }}
                          className={({ isActive }) =>
                            cn(
                              "block rounded px-2.5 py-1.5 text-xs",
                              "transition-all duration-200 ease-out",
                              "hover:bg-sidebar-accent hover:text-white hover:translate-x-0.5",
                              "animate-in fade-in slide-in-from-left-1",
                              isActive
                                ? "bg-sidebar-accent text-white font-medium"
                                : "text-sidebar-foreground",
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
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium",
                      "transition-all duration-200 ease-out",
                      "hover:bg-sidebar-accent hover:text-white hover:translate-x-0.5",
                      isActive
                        ? "bg-sidebar-accent text-white border-l-2 border-brand-red"
                        : "text-sidebar-foreground",
                    )
                  }
                >
                  <RenderIcon item={item} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
