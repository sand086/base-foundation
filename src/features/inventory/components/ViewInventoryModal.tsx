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
import { InventoryItem } from "@/features/inventory/types";

interface ViewInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

export function ViewInventoryModal({
  open,
  onOpenChange,
  item,
}: ViewInventoryModalProps) {
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
        "bg-muted text-muted-foreground border-border",
    };

    return colorClasses[categoryName] || colorClasses.General;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-md p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-slate-100 dark:bg-slate-800/50">
                <Info className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  {item.sku}
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
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

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/50 custom-scrollbar space-y-6 mt-4">
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
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight leading-snug">
              {item.descripcion}
            </h3>
          </div>

          <Separator className="bg-border" />

          {/* Panel de Stock */}
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
              <div className="p-3 bg-card/60 rounded-xl border border-border">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
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
              <div className="p-3 bg-card/60 rounded-xl border border-border">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Mínimo Requerido
                </p>
                <p className="text-3xl font-black leading-none tracking-tighter text-muted-foreground">
                  {item.stock_minimo}
                </p>
              </div>
            </div>
          </div>

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-2xl bg-card shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                Ubicación
              </div>
              <p className="font-black text-foreground text-sm uppercase tracking-tight">
                {item.ubicacion || "No asignada"}
              </p>
            </div>
            <div className="p-4 border border-border rounded-2xl bg-card shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                Costo Unitario
              </div>
              <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm tracking-widest">
                {formatCurrency(item.precio_unitario)}
              </p>
            </div>
          </div>

          {/* Valor Total */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-xl border border-border">
                  <Database className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Inversión Total
                  <br />
                  en Almacén
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">
                {formatCurrency(item.stock_actual * item.precio_unitario)}
              </span>
            </div>
          </div>
        </div>

        {/* CAPA 5: FOOTER TAHOE */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cerrar Detalles
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
