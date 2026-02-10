import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Wrench,
  ArrowRightLeft,
  RefreshCw,
  Eye,
  Trash2,
  ArrowUp,
  ArrowDown,
  Truck,
  DollarSign,
  Gauge,
} from "lucide-react";
import {
  GlobalTire,
  TireHistoryEvent,
  getTireLifePercentage,
  getTireSemaphoreStatus,
  getEstadoBadge,
} from "./types";

interface TireHistorySheetProps {
  tire: GlobalTire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getEventIcon = (tipo: TireHistoryEvent["tipo"]) => {
  switch (tipo) {
    case "compra":
      return <ShoppingCart className="h-4 w-4 text-emerald-600" />;
    case "montaje":
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    case "desmontaje":
      return <ArrowUp className="h-4 w-4 text-orange-600" />;
    case "reparacion":
      return <Wrench className="h-4 w-4 text-amber-600" />;
    case "renovado":
      return <RefreshCw className="h-4 w-4 text-purple-600" />;
    case "rotacion":
      return <ArrowRightLeft className="h-4 w-4 text-cyan-600" />;
    case "inspeccion":
      return <Eye className="h-4 w-4 text-slate-600" />;
    case "desecho":
      return <Trash2 className="h-4 w-4 text-rose-600" />;
  }
};

const getEventBadgeColor = (tipo: TireHistoryEvent["tipo"]) => {
  switch (tipo) {
    case "compra":
      return "bg-emerald-100 text-emerald-700";
    case "montaje":
      return "bg-blue-100 text-blue-700";
    case "desmontaje":
      return "bg-orange-100 text-orange-700";
    case "reparacion":
      return "bg-amber-100 text-amber-700";
    case "renovado":
      return "bg-purple-100 text-purple-700";
    case "rotacion":
      return "bg-cyan-100 text-cyan-700";
    case "inspeccion":
      return "bg-slate-100 text-slate-700";
    case "desecho":
      return "bg-rose-100 text-rose-700";
  }
};

export function TireHistorySheet({
  tire,
  open,
  onOpenChange,
}: TireHistorySheetProps) {
  if (!tire) return null;

  // Calculamos helpers usando el objeto actualizado
  const lifePercentage = getTireLifePercentage(tire);
  const semaphore = getTireSemaphoreStatus(tire);
  const estadoBadge = getEstadoBadge(tire.estado);

  // Ordenar historial por fecha descendente
  const sortedHistory = [...(tire.historial || [])].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {/* CORRECCIÓN: codigo_interno */}
            <span className="font-mono bg-muted px-2 py-1 rounded">
              {tire.codigo_interno}
            </span>
            <Badge className={estadoBadge.className}>{estadoBadge.label}</Badge>
          </SheetTitle>
          <SheetDescription>
            {tire.marca} {tire.modelo} - {tire.medida}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Truck className="h-3.5 w-3.5" />
                    Ubicación
                  </div>
                  <p className="font-semibold">
                    {/* CORRECCIÓN: unidad_actual_economico */}
                    {tire.unidad_actual_economico
                      ? `${tire.unidad_actual_economico} - ${tire.posicion || ""}`
                      : "En Almacén"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Costo Acumulado
                  </div>
                  {/* CORRECCIÓN: costo_acumulado */}
                  <p className="font-semibold">
                    ${(tire.costo_acumulado || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Gauge className="h-3.5 w-3.5" />
                    Km Recorridos
                  </div>
                  {/* CORRECCIÓN: km_recorridos */}
                  <p className="font-semibold">
                    {(tire.km_recorridos || 0).toLocaleString()} km
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-muted-foreground text-xs mb-1">DOT</div>
                  <p className="font-semibold font-mono">{tire.dot || "--"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Life Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Semáforo de Vida
                  <Badge className={`${semaphore.bgColor} ${semaphore.color}`}>
                    {semaphore.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Profundidad actual
                  </span>
                  {/* CORRECCIÓN: profundidad_actual / profundidad_original */}
                  <span className="font-bold">
                    {tire.profundidad_actual} mm / {tire.profundidad_original}{" "}
                    mm
                  </span>
                </div>
                <Progress value={lifePercentage} className="h-3" />
                <p className="text-xs text-center text-muted-foreground">
                  {lifePercentage}% de vida útil restante
                </p>
              </CardContent>
            </Card>

            {/* Purchase Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha de Compra</span>
                {/* CORRECCIÓN: fecha_compra */}
                <p className="font-medium">
                  {tire.fecha_compra
                    ? format(new Date(tire.fecha_compra), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "--"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Precio de Compra</span>
                {/* CORRECCIÓN: precio_compra */}
                <p className="font-medium">
                  ${(tire.precio_compra || 0).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Proveedor</span>
                <p className="font-medium">{tire.proveedor || "--"}</p>
              </div>
            </div>

            <Separator />

            {/* History Timeline */}
            <div>
              <h4 className="font-semibold mb-4">Historial de Eventos</h4>
              <div className="relative space-y-4">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                {sortedHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-8">
                    No hay historial registrado.
                  </p>
                ) : (
                  sortedHistory.map((event) => (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-border">
                        {getEventIcon(event.tipo)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getEventBadgeColor(event.tipo)}`}
                          >
                            {event.tipo.charAt(0).toUpperCase() +
                              event.tipo.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.fecha), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{event.descripcion}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {event.unidad && <span>Unidad: {event.unidad}</span>}
                          {event.posicion && <span>Pos: {event.posicion}</span>}
                          {event.km !== undefined && event.km !== null && (
                            <span>{event.km.toLocaleString()} km</span>
                          )}
                          {event.costo !== undefined &&
                            event.costo !== null &&
                            event.costo > 0 && (
                              <span className="text-amber-600">
                                ${event.costo.toLocaleString()}
                              </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Por: {event.responsable}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
