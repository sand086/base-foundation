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
  icon?: React.ElementType;
  iconSrc?: string;
  iconName?: SidebarIconKey;
  path?: string;
  children?: { title: string; path: string }[];
}

// 🚀 RUTAS ACTUALIZADAS PARA HACER MATCH CON APP.TSX
const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Clientes",
    icon: Users,
    iconName: "Clientes",
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
  },
  {
    title: "Flota",
    icon: Truck,
    iconName: "Flota",
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
  },
  {
    title: "Tracking Op",
    icon: Navigation,
    path: "/traffic-control",
  },
  {
    title: "Despacho",
    icon: CalendarPlus,
    path: "/dispatch",
  },
  {
    title: "Combustible",
    icon: Fuel,
    iconName: "Combustible",
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
  },
  {
    title: "Proveedores",
    icon: Briefcase,
    iconName: "Proveedores",
    path: "/payables",
  },
  {
    title: "Cobranza",
    icon: DollarSign,
    iconName: "Cobranza",
    path: "/receivables",
  },
  {
    title: "Tesorería",
    icon: Landmark,
    path: "/treasury",
  },
  {
    title: "Administración",
    icon: Settings,
    iconName: "Administracion",
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
        : "text-slate-500 dark:text-white/50 group-hover:text-slate-900 dark:group-hover:text-white",
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
        "bg-white/95 dark:bg-brand-navy/95 border-r border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[20px_0_40px_rgba(0,0,0,0.2)]",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-100/50 dark:from-white/5 to-transparent pointer-events-none" />

      <div className="flex h-16 items-center justify-center border-b border-slate-200 dark:border-white/5 relative z-10 shrink-0 bg-slate-50/50 dark:bg-black/10">
        <AnimatedLogo
          collapsed={collapsed}
          className={collapsed ? "h-8 w-8" : "h-10"}
        />
      </div>

      <div className="p-3 border-b border-slate-200 dark:border-white/5 shrink-0 bg-white/50 dark:bg-black/5">
        <Button
          variant="ghost"
          onClick={onToggle}
          className={cn(
            "h-9 text-[11px] font-bold uppercase tracking-widest transition-all w-full glass-card border",
            "text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white border-transparent hover:border-slate-200 dark:hover:border-white/10",
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
          {menuItems.map((item) => {
            const active = isActive(item.path, item.children);
            return (
              <div key={item.title} className="mb-1">
                {item.children ? (
                  <>
                    <button
                      onClick={() => !collapsed && toggleExpand(item.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-medium transition-all duration-300 group outline-none",
                        active
                          ? "bg-brand-red text-white shadow-[0_4px_15px_rgba(190,8,17,0.4)]"
                          : "text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RenderIcon item={item} active={active} />
                        {!collapsed && (
                          <span className="tracking-wide">{item.title}</span>
                        )}
                      </div>

                      {!collapsed && (
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300",
                            expandedItems.includes(item.title)
                              ? "rotate-180 text-slate-900 dark:text-white"
                              : "text-slate-400 dark:text-white/40",
                            active && "text-white",
                          )}
                        />
                      )}
                    </button>

                    {!collapsed && expandedItems.includes(item.title) && (
                      <div className="mt-1 mb-2 ml-5 border-l border-slate-200 dark:border-white/10 pl-3 py-1 space-y-1 animate-in slide-in-from-top-2 fade-in duration-300">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive: isChildActive }) =>
                              cn(
                                "block rounded-lg px-3 py-2 text-[11px] transition-all duration-300 relative overflow-hidden",
                                isChildActive
                                  ? "text-brand-red font-black uppercase tracking-widest bg-brand-red/5 dark:bg-brand-red/10 border border-brand-red/10 dark:border-brand-red/20 shadow-inner"
                                  : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium",
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
                          : "text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                      )
                    }
                  >
                    {({ isActive: isItemActive }) => (
                      <>
                        <RenderIcon item={item} active={isItemActive} />
                        {!collapsed && (
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
