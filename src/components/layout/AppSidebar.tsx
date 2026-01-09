import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Truck,
  Map,
  CalendarPlus,
  Fuel,
  FileCheck,
  Briefcase,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    title: "Gestión de Clientes",
    icon: Users,
    children: [
      { title: "Catálogo", path: "/clientes" },
      { title: "Tarifas", path: "/clientes/tarifas" },
      { title: "Nuevo Cliente", path: "/clientes/nuevo" },
    ],
  },
  {
    title: "Gestión de Flota",
    icon: Truck,
    children: [
      { title: "Unidades", path: "/flota" },
      { title: "Llantas", path: "/flota/llantas" },
      { title: "Mantenimiento", path: "/flota/mantenimiento" },
    ],
  },
  { title: "Centro de Monitoreo", icon: Map, path: "/monitoreo" },
  { title: "Despacho/Servicios", icon: CalendarPlus, path: "/despacho" },
  {
    title: "Combustible",
    icon: Fuel,
    children: [
      { title: "Cargas", path: "/combustible" },
      { title: "Conciliación", path: "/combustible/conciliacion" },
    ],
  },
  { title: "Cierre y Liquidación", icon: FileCheck, path: "/cierre" },
  { title: "Proveedores", icon: Briefcase, path: "/proveedores" },
  { title: "Cuentas por Cobrar", icon: DollarSign, path: "/cuentas" },
  { title: "Configuración", icon: Settings, path: "/configuracion" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Gestión de Clientes", "Gestión de Flota", "Combustible"]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (path?: string, children?: { path: string }[]) => {
    if (path && location.pathname === path) return true;
    if (children) return children.some((child) => location.pathname === child.path);
    return false;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
              3T
            </div>
            <span className="font-semibold text-lg">Rápidos 3T</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* User Profile */}
      {!collapsed && (
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                MG
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">María García</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                Administrador
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
        <nav className="p-2">
          {menuItems.map((item) => (
            <div key={item.title} className="mb-1">
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                      isActive(undefined, item.children) && "bg-sidebar-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </div>
                    {!collapsed && (
                      expandedItems.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.title) && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            cn(
                              "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                : "text-sidebar-foreground/80"
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
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
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
