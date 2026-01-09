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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  children?: { title: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    title: "Clientes",
    icon: Users,
    children: [
      { title: "Catálogo", path: "/clientes" },
      { title: "Tarifas", path: "/clientes/tarifas" },
      { title: "Nuevo Cliente", path: "/clientes/nuevo" },
    ],
  },
  {
    title: "Flota",
    icon: Truck,
    children: [
      { title: "Unidades", path: "/flota" },
      { title: "Llantas", path: "/flota/llantas" },
      { title: "Mantenimiento", path: "/flota/mantenimiento" },
    ],
  },
  { title: "Monitoreo", icon: Radar, path: "/monitoreo" },
  { title: "Despacho", icon: CalendarPlus, path: "/despacho" },
  {
    title: "Combustible",
    icon: Fuel,
    children: [
      { title: "Cargas", path: "/combustible" },
      { title: "Conciliación", path: "/combustible/conciliacion" },
    ],
  },
  { title: "Cierre", icon: FileCheck, path: "/cierre" },
  { title: "Proveedores", icon: Briefcase, path: "/proveedores" },
  { title: "Cobranza", icon: DollarSign, path: "/cuentas-por-cobrar" },
  { title: "Configuración", icon: Settings, path: "/configuracion" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Clientes", "Flota", "Combustible"]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (path?: string, children?: { path: string }[]) => {
    if (path && location.pathname === path) return true;
    if (children) return children.some((child) => location.pathname.startsWith(child.path));
    return false;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-ring text-white font-bold text-sm">
              3T
            </div>
            <span className="font-bold text-lg tracking-tight">Rápidos 3T</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-ring text-white font-bold text-sm mx-auto">
            3T
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <div className="px-3 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed ? "w-full justify-center" : "w-full justify-start"
          )}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4 mr-2" /> Colapsar</>}
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
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-sidebar-accent",
                      isActive(undefined, item.children) && "bg-sidebar-accent text-sidebar-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </div>
                    {!collapsed && (
                      expandedItems.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-sidebar-foreground/50" />
                      )
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.title) && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-4">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            cn(
                              "block rounded-md px-3 py-1.5 text-sm transition-colors",
                              "hover:bg-sidebar-accent hover:text-sidebar-primary",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                : "text-sidebar-foreground/70"
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
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-primary",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/80"
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
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
