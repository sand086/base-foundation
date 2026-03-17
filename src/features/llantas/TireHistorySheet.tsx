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
import { Card, CardContent } from "@/components/ui/card";
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
  Pencil,
} from "lucide-react";

// Importamos los tipos e helpers del servicio
import {
  getTireLifePercentage,
  getTireSemaphoreStatus,
  getEstadoBadge,
} from "@/services/tireService";
import { Tire, TireHistoryEvent } from "@/types/api.types";

interface TireHistorySheetProps {
  tire: Tire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper para iconos de la línea de tiempo
const getEventIcon = (tipo: string) => {
  const t = tipo.toLowerCase();
  switch (t) {
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
    case "edicion":
      return <Pencil className="h-4 w-4 text-blue-500" />;
    default:
      return <Pencil className="h-4 w-4 text-gray-400" />;
  }
};

const getEventBadgeColor = (tipo: string) => {
  const t = tipo.toLowerCase();
  switch (t) {
    case "compra":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "montaje":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "desmontaje":
      return "bg-orange-50 text-orange-700 border-orange-100";
    case "reparacion":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "renovado":
      return "bg-purple-50 text-purple-700 border-purple-100";
    case "rotacion":
      return "bg-cyan-50 text-cyan-700 border-cyan-100";
    case "inspeccion":
      return "bg-slate-50 text-slate-700 border-slate-100";
    case "desecho":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "edicion":
      return "bg-blue-50 text-blue-700 border-blue-100";
    default:
      return "bg-gray-50 text-gray-500";
  }
};

export function TireHistorySheet({
  tire,
  open,
  onOpenChange,
}: TireHistorySheetProps) {
  if (!tire) return null;

  // Calculamos estados visuales usando los helpers del servicio
  const lifePercentage = getTireLifePercentage(tire);
  const semaphore = getTireSemaphoreStatus(tire);
  const estadoBadge = getEstadoBadge(tire.estado);

  // Ordenar historial por fecha descendente (más reciente primero)
  const sortedHistory = [...(tire.historial || [])].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 border-l shadow-2xl">
        {/* Header fijo */}
        <div className="p-6 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black bg-white border px-3 py-1 rounded-xl shadow-sm text-brand-navy">
                  {tire.codigo_interno}
                </span>
                <Badge className={estadoBadge.className}>
                  {estadoBadge.label}
                </Badge>
              </SheetTitle>
            </div>
            <SheetDescription className="text-base font-medium text-slate-600">
              {tire.marca} {tire.modelo} • {tire.medida}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Contenido scrolleable */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-8 py-6 pb-12">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none bg-slate-100/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <Truck className="h-3 w-3" /> Ubicación
                  </div>
                  <p className="font-bold text-slate-700">
                    {tire.unidad_actual_economico
                      ? `ECO-${tire.unidad_actual_economico} • Pos. ${tire.posicion}`
                      : "📦 En Almacén"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none bg-slate-100/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <DollarSign className="h-3 w-3" /> Inversión
                  </div>
                  <p className="font-bold text-slate-700">
                    ${(tire.costo_acumulado || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none bg-slate-100/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <Gauge className="h-3 w-3" /> Recorrido
                  </div>
                  <p className="font-bold text-slate-700">
                    {(tire.km_recorridos || 0).toLocaleString()} km
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none bg-slate-100/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <RefreshCw className="h-3 w-3" /> Identificador DOT
                  </div>
                  <p className="font-bold text-slate-700 font-mono">
                    {tire.dot || "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Health / Tread Progress */}
            <div className="p-5 rounded-2xl border bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                  Semáforo de Vida Útil
                </h4>
                <Badge
                  className={`${semaphore.bgColor} ${semaphore.color} font-bold px-3`}
                >
                  {semaphore.label}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Desgaste Actual:{" "}
                    <span className="font-bold text-slate-800">
                      {tire.profundidad_actual}mm
                    </span>
                  </span>
                  <span className="text-slate-400">
                    Original: {tire.profundidad_original}mm
                  </span>
                </div>
                <Progress value={lifePercentage} className="h-3 rounded-full" />
                <p className="text-[11px] text-center font-bold text-slate-400 italic">
                  Estimado del {lifePercentage}% de remanente operativo
                </p>
              </div>
            </div>

            {/* Compras / Proveedor */}
            <div className="grid grid-cols-2 gap-6 px-2 text-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Fecha Compra
                </span>
                <p className="font-bold text-slate-700">
                  {tire.fecha_compra
                    ? format(new Date(tire.fecha_compra), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "--"}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Precio Unitario
                </span>
                <p className="font-bold text-brand-green">
                  ${(tire.precio_compra || 0).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Proveedor
                </span>
                <p className="font-bold text-slate-700">
                  {tire.proveedor || "No registrado"}
                </p>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Timeline Section */}
            <div className="space-y-6">
              <h4 className="text-sm font-black text-brand-navy uppercase tracking-widest flex items-center gap-2">
                <Eye className="h-4 w-4" /> Historial de Movimientos
              </h4>

              <div className="relative space-y-0">
                {/* Línea vertical de fondo */}
                <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-slate-100" />

                {sortedHistory.length === 0 ? (
                  <div className="pl-10 py-4 text-sm text-slate-400 italic">
                    No hay eventos registrados para este activo.
                  </div>
                ) : (
                  sortedHistory.map((event, idx) => {
                    const unidadToShow = event.unidad_economico || event.unidad;

                    return (
                      <div
                        key={event.id || idx}
                        className="relative flex gap-6 pb-8 group"
                      >
                        {/* Icono de círculo en el eje */}
                        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border-2 border-slate-200 group-hover:border-brand-navy group-hover:scale-110 transition-all">
                          {getEventIcon(event.tipo)}
                        </div>

                        {/* Tarjeta de evento */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-black border uppercase px-2",
                                getEventBadgeColor(event.tipo),
                              )}
                            >
                              {event.tipo}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400">
                              {format(
                                new Date(event.fecha),
                                "dd MMM yyyy • HH:mm",
                                { locale: es },
                              )}
                            </span>
                          </div>

                          <p className="text-sm font-medium text-slate-700 leading-tight">
                            {event.descripcion}
                          </p>

                          {/* Chips de datos del evento */}
                          <div className="flex flex-wrap gap-3">
                            {unidadToShow && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded-md border border-brand-navy/10">
                                <Truck className="h-3 w-3" /> ECO-{unidadToShow}
                              </div>
                            )}
                            {event.km !== undefined && event.km !== null && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Gauge className="h-3 w-3" />{" "}
                                {event.km.toLocaleString()} km
                              </div>
                            )}
                            {event.costo ? (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                <DollarSign className="h-3 w-3" /> $
                                {event.costo.toLocaleString()}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic">
                            <Pencil className="h-2.5 w-2.5" />
                            Operador: {event.responsable || "Admin Sistema"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Utilidad para concatenar clases condicionales
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
