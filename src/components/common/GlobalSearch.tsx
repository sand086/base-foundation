import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Truck,
  Radar,
  Fuel,
  DollarSign,
  Settings,
  FileText,
  Calculator,
  CalendarPlus,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface SearchItem {
  title: string;
  path: string;
  icon: React.ElementType;
  category: string;
  keywords?: string[];
}

const searchItems: SearchItem[] = [
  // Navegación principal
  { title: "Dashboard", path: "/", icon: LayoutDashboard, category: "Navegación", keywords: ["inicio", "home", "kpis"] },
  { title: "Centro de Monitoreo", path: "/monitoreo", icon: Radar, category: "Navegación", keywords: ["gps", "tracking", "viajes"] },
  { title: "Despacho", path: "/despacho", icon: CalendarPlus, category: "Navegación", keywords: ["asignar", "viaje", "programar"] },
  
  // Clientes
  { title: "Catálogo de Clientes", path: "/clientes", icon: Users, category: "Clientes", keywords: ["lista", "empresas"] },
  { title: "Nuevo Cliente", path: "/clientes/nuevo", icon: Users, category: "Clientes", keywords: ["agregar", "crear", "alta"] },
  { title: "Gestión de Tarifas", path: "/tarifas", icon: Calculator, category: "Clientes", keywords: ["precios", "costos"] },
  
  // Flota
  { title: "Unidades", path: "/flota", icon: Truck, category: "Flota", keywords: ["camiones", "tractores", "remolques"] },
  { title: "Operadores", path: "/flota/operadores", icon: Users, category: "Flota", keywords: ["choferes", "conductores"] },
  { title: "Control de Llantas", path: "/flota/llantas", icon: Truck, category: "Flota", keywords: ["neumaticos", "desgaste"] },
  { title: "Mantenimiento", path: "/flota/mantenimiento", icon: Settings, category: "Flota", keywords: ["servicio", "reparacion"] },
  
  // Combustible
  { title: "Cargas de Combustible", path: "/combustible", icon: Fuel, category: "Combustible", keywords: ["diesel", "gasolina"] },
  { title: "Conciliación", path: "/combustible/conciliacion", icon: Fuel, category: "Combustible", keywords: ["rendimiento", "ecm"] },
  
  // Finanzas
  { title: "Liquidación de Viajes", path: "/cierre", icon: FileText, category: "Finanzas", keywords: ["cierre", "factura"] },
  { title: "Cuentas por Cobrar", path: "/cuentas-por-cobrar", icon: DollarSign, category: "Finanzas", keywords: ["cobranza", "facturas"] },
  { title: "Tesorería", path: "/tesoreria", icon: DollarSign, category: "Finanzas", keywords: ["banco", "pagos"] },
  
  // Admin
  { title: "Usuarios", path: "/usuarios", icon: Users, category: "Administración", keywords: ["cuentas", "accesos"] },
  { title: "Roles y Permisos", path: "/roles-permisos", icon: Settings, category: "Administración", keywords: ["seguridad"] },
  { title: "Mi Perfil", path: "/perfil", icon: Users, category: "Administración" },
  { title: "Configuración", path: "/configuracion", icon: Settings, category: "Administración" },
];

// Export a function to open the search from outside
let openSearchFn: (() => void) | null = null;

export function openGlobalSearch() {
  openSearchFn?.();
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  // Register the open function for external access
  openSearchFn = () => setOpen(true);

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down, true);
    return () => document.removeEventListener("keydown", down, true);
  }, []);

  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  // Group items by category
  const groupedItems = searchItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulos, clientes, unidades..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        
        {Object.entries(groupedItems).map(([category, items], idx) => (
          <div key={category}>
            <CommandGroup heading={category}>
              {items.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.title} ${item.keywords?.join(" ") || ""}`}
                  onSelect={() => handleSelect(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-3 h-4 w-4 opacity-60" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {idx < Object.keys(groupedItems).length - 1 && <CommandSeparator />}
          </div>
        ))}
      </CommandList>
      
      {/* Keyboard hint */}
      <div className="border-t border-white/10 px-4 py-2 text-xs text-white/40 flex items-center justify-between">
        <span>Navega con ↑↓ • Selecciona con Enter</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">ESC</kbd>
          <span>para cerrar</span>
        </span>
      </div>
    </CommandDialog>
  );
}
