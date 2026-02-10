import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
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

  // CORRECCIÓN: snake_case
  const isLowStock = item.stock_actual < item.stock_minimo;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getCategoryColor = (categoria: string) => {
    const colors: Record<string, string> = {
      Motor: "bg-blue-100 text-blue-700 border-blue-200",
      Frenos: "bg-red-100 text-red-700 border-red-200",
      Eléctrico: "bg-yellow-100 text-yellow-700 border-yellow-200",
      Suspensión: "bg-purple-100 text-purple-700 border-purple-200",
      Transmisión: "bg-orange-100 text-orange-700 border-orange-200",
      General: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return colors[categoria] || colors.General;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalle de Refacción
          </DialogTitle>
          <DialogDescription>
            Información completa del artículo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-lg font-bold">{item.sku}</p>
              <p className="text-muted-foreground">{item.descripcion}</p>
            </div>
            <Badge className={getCategoryColor(item.categoria)}>
              {item.categoria}
            </Badge>
          </div>

          <Separator />

          {/* Stock Info */}
          <div
            className={cn(
              "p-4 rounded-lg border-2",
              isLowStock
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLowStock ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">
                  {isLowStock
                    ? "Stock Bajo - Requiere Reorden"
                    : "Stock Normal"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-xs text-muted-foreground">Stock Actual</p>
                {/* CORRECCIÓN: snake_case */}
                <p
                  className={cn(
                    "text-2xl font-bold",
                    isLowStock ? "text-red-600" : "text-green-600",
                  )}
                >
                  {item.stock_actual}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Mínimo</p>
                {/* CORRECCIÓN: snake_case */}
                <p className="text-2xl font-bold text-muted-foreground">
                  {item.stock_minimo}
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Ubicación</p>
                <p className="font-medium">{item.ubicacion}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Precio Unitario</p>
                {/* CORRECCIÓN: snake_case */}
                <p className="font-medium">
                  {formatCurrency(item.precio_unitario)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Valor Total en Inventario
              </span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(item.stock_actual * item.precio_unitario)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
