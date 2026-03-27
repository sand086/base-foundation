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
import { DialogTitle } from "@/components/ui/dialog"; // Importación para accesibilidad
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
    path: "/monitoreo",
    icon: Radar,
    category: "Navegación",
    keywords: ["gps", "tracking", "viajes"],
  },
  {
    title: "Despacho",
    path: "/despacho",
    icon: CalendarPlus,
    category: "Navegación",
    keywords: ["asignar", "viaje", "programar"],
  },
  // Clients
  {
    title: "Catálogo de Clients",
    path: "/clients",
    icon: Users,
    category: "Clients",
    keywords: ["lista", "empresas"],
  },
  {
    title: "Nuevo Client",
    path: "/clients/nuevo",
    icon: Users,
    category: "Clients",
    keywords: ["agregar", "crear", "alta"],
  },
  {
    title: "Gestión de Tarifas",
    path: "/tarifas",
    icon: Calculator,
    category: "Clients",
    keywords: ["precios", "costos"],
  },
  // Flota
  {
    title: "Unidades",
    path: "/flota",
    icon: Truck,
    category: "Flota",
    keywords: ["camiones", "tractores", "remolques"],
  },
  {
    title: "Operadores",
    path: "/flota/operadores",
    icon: Users,
    category: "Flota",
    keywords: ["choferes", "conductores"],
  },
  {
    title: "Control de Llantas",
    path: "/flota/llantas",
    icon: Truck,
    category: "Flota",
    keywords: ["neumaticos", "desgaste"],
  },
  {
    title: "Mantenimiento",
    path: "/flota/mantenimiento",
    icon: Settings,
    category: "Flota",
    keywords: ["servicio", "reparacion"],
  },
  {
    title: "Mecánicos",
    path: "/flota/mecanicos",
    icon: Settings,
    category: "Mecanicos",
    keywords: ["mecanicos", "reparacion", "servicio"],
  },
  // Combustible
  {
    title: "Cargas de Combustible",
    path: "/combustible",
    icon: Fuel,
    category: "Combustible",
    keywords: ["diesel", "gasolina"],
  },
  {
    title: "Conciliación",
    path: "/combustible/conciliacion",
    icon: Fuel,
    category: "Combustible",
    keywords: ["rendimiento", "ecm"],
  },
  // Finanzas
  {
    title: "Liquidación de Viajes",
    path: "/cierre",
    icon: FileText,
    category: "Finanzas",
    keywords: ["cierre", "factura"],
  },
  {
    title: "Cuentas por Cobrar",
    path: "/cuentas-por-cobrar",
    icon: DollarSign,
    category: "Finanzas",
    keywords: ["cobranza", "facturas"],
  },
  {
    title: "Tesorería",
    path: "/tesoreria",
    icon: DollarSign,
    category: "Finanzas",
    keywords: ["banco", "pagos"],
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
    path: "/roles-permisos",
    icon: Settings,
    category: "Administración",
    keywords: ["seguridad"],
  },
  {
    title: "Mi Perfil",
    path: "/perfil",
    icon: Users,
    category: "Administración",
  },
  {
    title: "Configuración",
    path: "/configuracion",
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
      className="max-w-[650px] p-0 overflow-hidden border-none bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl animate-modal-show shadow-2xl rounded-2xl"
    >
      {/* 🛠 CORRECCIÓN ACCESIBILIDAD: Título invisible para lectores de pantalla */}
      <DialogTitle className="sr-only">Buscador Global Spotlight</DialogTitle>

      <div className="relative border-b border-slate-200 dark:border-white/10 px-2 py-1">
        <CommandInput
          placeholder="Buscar módulos, clientes, unidades..."
          className="h-14 border-none bg-transparent focus:ring-0 text-[14px] font-medium placeholder:text-slate-400 dark:placeholder:text-white/30"
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
            <Search className="h-8 w-8 text-slate-200 dark:text-white/10" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
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
                    "hover:bg-slate-100 dark:hover:bg-white/5",
                    "data-[selected=true]:bg-brand-red data-[selected=true]:text-white data-[selected=true]:shadow-lg",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-slate-100 dark:bg-white/5 group-data-[selected=true]:bg-white/20",
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
              <CommandSeparator className="my-2 bg-slate-200 dark:bg-white/5 mx-2" />
            )}
          </div>
        ))}
      </CommandList>

      {/* FOOTER: Safari Style Bar */}
      <div className="bg-slate-50 dark:bg-black/20 px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-black shadow-sm">
              ↑↓
            </kbd>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Navegar
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-black shadow-sm">
              ENTER
            </kbd>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Seleccionar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-black shadow-sm">
            ESC
          </kbd>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Cerrar
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
