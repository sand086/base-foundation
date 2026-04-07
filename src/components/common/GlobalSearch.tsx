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
  Search,
  Command as CommandIcon,
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
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SearchItem {
  title: string;
  path: string;
  icon: React.ElementType;
  category: string;
  keywords?: string[];
}

const searchItems: SearchItem[] = [
  // Navegación principal
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    category: "Navegación",
    keywords: ["inicio", "home", "kpis"],
  },
  {
    title: "Centro de Monitoreo",
    path: "/monitoring",
    icon: Radar,
    category: "Navegación",
    keywords: ["gps", "tracking", "viajes", "historico"],
  },
  {
    title: "Tracking Operativo",
    path: "/traffic-control",
    icon: Radar,
    category: "Navegación",
    keywords: ["seguimiento", "control", "trafico"],
  },
  {
    title: "Despacho",
    path: "/dispatch",
    icon: CalendarPlus,
    category: "Navegación",
    keywords: ["asignar", "viaje", "programar"],
  },
  // Clientes
  {
    title: "Catálogo de Clientes",
    path: "/clients",
    icon: Users,
    category: "Clientes",
    keywords: ["lista", "empresas"],
  },
  {
    title: "Nuevo Cliente",
    path: "/clients/new",
    icon: Users,
    category: "Clientes",
    keywords: ["agregar", "crear", "alta"],
  },
  {
    title: "Gestión de Tarifas",
    path: "/rates",
    icon: Calculator,
    category: "Clientes",
    keywords: ["precios", "costos", "rutas"],
  },
  // Flota
  {
    title: "Unidades",
    path: "/fleet",
    icon: Truck,
    category: "Flota",
    keywords: ["camiones", "tractores", "remolques"],
  },
  {
    title: "Operadores",
    path: "/fleet/operators",
    icon: Users,
    category: "Flota",
    keywords: ["choferes", "conductores"],
  },
  {
    title: "Control de Llantas",
    path: "/fleet/tires",
    icon: Truck,
    category: "Flota",
    keywords: ["neumaticos", "desgaste"],
  },
  {
    title: "Mantenimiento",
    path: "/fleet/maintenance",
    icon: Settings,
    category: "Flota",
    keywords: ["servicio", "reparacion", "preventivo"],
  },
  {
    title: "Mecánicos",
    path: "/fleet/mechanics",
    icon: Settings,
    category: "Flota",
    keywords: ["mecanicos", "reparacion", "taller"],
  },
  // Combustible
  {
    title: "Cargas de Combustible",
    path: "/fuel/loads",
    icon: Fuel,
    category: "Combustible",
    keywords: ["diesel", "gasolina", "cargas"],
  },
  {
    title: "Conciliación",
    path: "/fuel/conciliation",
    icon: Fuel,
    category: "Combustible",
    keywords: ["rendimiento", "ecm", "tarjetas"],
  },
  // Finanzas
  {
    title: "Liquidación de Viajes",
    path: "/settlements",
    icon: FileText,
    category: "Finanzas",
    keywords: ["cierre", "factura", "liquidar"],
  },
  {
    title: "Cuentas por Cobrar",
    path: "/receivables",
    icon: DollarSign,
    category: "Finanzas",
    keywords: ["cobranza", "facturas", "aging"],
  },
  {
    title: "Cuentas por Pagar",
    path: "/payables",
    icon: DollarSign,
    category: "Finanzas",
    keywords: ["proveedores", "gastos"],
  },
  {
    title: "Tesorería",
    path: "/treasury",
    icon: DollarSign,
    category: "Finanzas",
    keywords: ["banco", "pagos", "flujo"],
  },
  // Admin
  {
    title: "Usuarios",
    path: "/users",
    icon: Users,
    category: "Administración",
    keywords: ["cuentas", "accesos"],
  },
  {
    title: "Roles y Permisos",
    path: "/roles-permissions",
    icon: Settings,
    category: "Administración",
    keywords: ["seguridad", "permisos"],
  },
  {
    title: "Mi Perfil",
    path: "/profile",
    icon: Users,
    category: "Administración",
  },
  {
    title: "Configuración",
    path: "/settings",
    icon: Settings,
    category: "Administración",
  },
];

let openSearchFn: (() => void) | null = null;

export function openGlobalSearch() {
  openSearchFn?.();
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  openSearchFn = () => setOpen(true);

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

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const groupedItems = searchItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, SearchItem[]>,
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      // Aplicamos la animación Tahoe y el estilo de panel de cristal
      className="max-w-[650px] p-0 overflow-hidden border-none bg-card/90 dark:bg-brand-navy/95 backdrop-blur-xl animate-modal-show shadow-2xl rounded-2xl"
    >
      {/* 🛠 CORRECCIÓN ACCESIBILIDAD: Título invisible para lectores de pantalla */}
      <DialogTitle className="sr-only">Buscador Global Spotlight</DialogTitle>

      <div className="relative border-b border-border px-2 py-1">
        <CommandInput
          placeholder="Buscar módulos, clientes, unidades..."
          className="h-14 border-none bg-transparent focus:ring-0 text-[14px] font-medium placeholder:text-muted-foreground/60"
        />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40">
          <CommandIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            SPOTLIGHT
          </span>
        </div>
      </div>

      <CommandList className="max-h-[450px] custom-scrollbar p-2">
        <CommandEmpty className="py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Search className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Sin coincidencias encontradas
            </p>
          </div>
        </CommandEmpty>

        {Object.entries(groupedItems).map(([category, items], idx) => (
          <div key={category}>
            <CommandGroup
              heading={
                <span className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-red mb-2 block">
                  {category}
                </span>
              }
            >
              {items.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.title} ${item.keywords?.join(" ") || ""}`}
                  onSelect={() => handleSelect(item.path)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200",
                    "hover:bg-muted",
                    "data-[selected=true]:bg-brand-red data-[selected=true]:text-white data-[selected=true]:shadow-lg",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-muted group-data-[selected=true]:bg-white/20",
                      "transition-colors",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[13px] font-medium tracking-tight">
                    {item.title}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {idx < Object.keys(groupedItems).length - 1 && (
              <CommandSeparator className="my-2 bg-border mx-2" />
            )}
          </div>
        ))}
      </CommandList>

      {/* FOOTER: Safari Style Bar */}
      <div className="bg-muted/50 px-6 py-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[9px] font-black shadow-sm">
              ↑↓
            </kbd>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Navegar
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[9px] font-black shadow-sm">
              ENTER
            </kbd>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Seleccionar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[9px] font-black shadow-sm">
            ESC
          </kbd>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Cerrar
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
