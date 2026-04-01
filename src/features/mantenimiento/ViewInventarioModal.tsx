import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Package,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Database,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// IMPORTANTE: Importar el tipo real
import { InventoryItem } from "@/services/maintenanceService";

interface ViewInventarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

export function ViewInventarioModal({
  open,
  onOpenChange,
  item,
}: ViewInventarioModalProps) {
  if (!item) return null;

  // Lógica de Stock
  const isLowStock = item.stock_actual < item.stock_minimo;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getCategoryColor = (categoria: string) => {
    const categoryName = categoria.charAt(0).toUpperCase() + categoria.slice(1);

    // Mapeo semántico de categorías Tahoe UI
    const colorClasses: Record<string, string> = {
      Motor:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
      Frenos:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
      Eléctrico:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
      Suspensión:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-500/30",
      Transmisión:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
      General:
        "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10",
    };

    return colorClasses[categoryName] || colorClasses.General;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/*  HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-white/20">
                <Info className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                  {item.sku}
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                  Catálogo de Inventario
                </p>
              </div>
            </div>
            <div className="hidden sm:block">
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm",
                  getCategoryColor(item.categoria),
                )}
              >
                {item.categoria}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/*  BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="space-y-6">
            {/* Título Principal */}
            <div className="space-y-2">
              <div className="sm:hidden mb-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm",
                    getCategoryColor(item.categoria),
                  )}
                >
                  {item.categoria}
                </Badge>
              </div>
              <h3 className="text-lg font-black text-brand-navy dark:text-white uppercase tracking-tight leading-snug">
                {item.descripcion}
              </h3>
            </div>

            <Separator className="bg-slate-200 dark:bg-white/10" />

            {/* Panel de Stock (Health) */}
            <div
              className={cn(
                "p-5 rounded-2xl border shadow-sm transition-colors",
                isLowStock
                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                  : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50",
              )}
            >
              <div className="flex items-center gap-2 mb-4">
                {isLowStock ? (
                  <div className="p-1.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500/20 text-white">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20 text-white">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
                <span
                  className={cn(
                    "text-[11px] font-black uppercase tracking-widest",
                    isLowStock
                      ? "text-rose-800 dark:text-rose-400"
                      : "text-emerald-800 dark:text-emerald-400",
                  )}
                >
                  {isLowStock
                    ? "Alerta de Reabastecimiento"
                    : "Niveles de Stock Óptimos"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-white/20 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1">
                    Stock Actual
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-black leading-none tracking-tighter",
                      isLowStock
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {item.stock_actual}
                  </p>
                </div>
                <div className="p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-white/20 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1">
                    Mínimo Requerido
                  </p>
                  <p className="text-3xl font-black leading-none tracking-tighter text-slate-400 dark:text-slate-500">
                    {item.stock_minimo}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadatos (Ubicación y Precio) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  Ubicación
                </div>
                <p className="font-black text-brand-navy dark:text-slate-200 text-sm uppercase tracking-tight">
                  {item.ubicacion || "No asignada"}
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  Costo Unitario
                </div>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(item.precio_unitario)}
                </p>
              </div>
            </div>

            {/* Valor Total Inventariado */}
            <div className="p-5 bg-brand-navy dark:bg-slate-900 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                    <Database className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                    Inversión Total
                    <br />
                    en Almacén
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-white tracking-tighter drop-shadow-md">
                  {formatCurrency(item.stock_actual * item.precio_unitario)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/*  FOOTER */}
        <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press"
            >
              Cerrar Detalles
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
