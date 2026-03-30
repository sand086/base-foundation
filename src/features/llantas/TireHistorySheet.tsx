// src/features/flota/TireHistorySheet.tsx
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ShoppingCart,
  Wrench,
  ArrowRightLeft,
  RefreshCw,
  Eye,
  Trash2,
  ArrowUp,
  History,
  User,
  ArrowDown,
  Truck,
  DollarSign,
  Gauge,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      return (
        <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      );
    case "montaje":
      return <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "desmontaje":
      return (
        <ArrowUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      );
    case "reparacion":
      return <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case "renovado":
      return (
        <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      );
    case "rotacion":
      return (
        <ArrowRightLeft className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
      );
    case "inspeccion":
      return <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    case "desecho":
      return <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    case "edicion":
      return <Pencil className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
    default:
      return <Pencil className="h-4 w-4 text-slate-400 dark:text-slate-500" />;
  }
};

const getEventBadgeColor = (tipo: string) => {
  const t = tipo.toLowerCase();
  switch (t) {
    case "compra":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30";
    case "montaje":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30";
    case "desmontaje":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-500/30";
    case "reparacion":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30";
    case "renovado":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-500/30";
    case "rotacion":
      return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-500/30";
    case "inspeccion":
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10";
    case "desecho":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30";
    case "edicion":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10";
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
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 border-l border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl">
        {/* 🚀 HEADER TAHOE */}
        <SheetHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-white/20">
                <History className="h-7 w-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <SheetTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                  {tire.codigo_interno}
                </SheetTitle>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                  {tire.marca} {tire.modelo} • {tire.medida}
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-sm",
                estadoBadge.className,
              )}
            >
              {estadoBadge.label}
            </Badge>
          </div>
        </SheetHeader>

        {/* 🚀 Contenido scrolleable */}
        <ScrollArea className="flex-1 p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
          <div className="space-y-8 pb-12">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    <Truck className="h-3.5 w-3.5 text-blue-500" /> Ubicación
                  </div>
                  <p className="font-black text-sm text-brand-navy dark:text-white uppercase tracking-tight">
                    {tire.unidad_actual_economico
                      ? `ECO-${tire.unidad_actual_economico} • Pos. ${tire.posicion}`
                      : "📦 En Almacén"}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />{" "}
                    Inversión
                  </div>
                  <p className="font-black text-sm text-brand-navy dark:text-white uppercase tracking-tight">
                    ${(tire.costo_acumulado || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    <Gauge className="h-3.5 w-3.5 text-amber-500" /> Recorrido
                  </div>
                  <p className="font-black text-sm text-brand-navy dark:text-white uppercase tracking-tight">
                    {(tire.km_recorridos || 0).toLocaleString()} km
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    <RefreshCw className="h-3.5 w-3.5 text-purple-500" />{" "}
                    Identificador DOT
                  </div>
                  <p className="font-mono font-bold text-sm text-brand-navy dark:text-white">
                    {tire.dot || "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Health / Tread Progress */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-brand-navy dark:text-slate-300" />{" "}
                  Semáforo de Vida Útil
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm border",
                    semaphore.bgColor,
                    semaphore.color,
                    semaphore.label === "Crítico"
                      ? "border-rose-200 dark:border-rose-500/30"
                      : semaphore.label === "Atención"
                        ? "border-amber-200 dark:border-amber-500/30"
                        : "border-emerald-200 dark:border-emerald-500/30",
                  )}
                >
                  {semaphore.label}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400 dark:text-slate-500">
                    Desgaste Actual:{" "}
                    <span className="font-mono text-xs text-brand-navy dark:text-white">
                      {tire.profundidad_actual}mm
                    </span>
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    Original:{" "}
                    <span className="font-mono text-xs">
                      {tire.profundidad_original}mm
                    </span>
                  </span>
                </div>
                <Progress
                  value={lifePercentage}
                  className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner"
                  indicatorClassName={
                    semaphore.label === "Crítico"
                      ? "bg-rose-500"
                      : semaphore.label === "Atención"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }
                />
                <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest italic mt-2">
                  Estimado del {lifePercentage}% de remanente operativo
                </p>
              </div>
            </div>

            {/* Compras / Proveedor */}
            <div className="grid grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Fecha Compra
                </span>
                <p className="font-mono font-bold text-sm text-brand-navy dark:text-slate-200 mt-1">
                  {tire.fecha_compra
                    ? format(new Date(tire.fecha_compra), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "--"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Precio Unitario
                </span>
                <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  ${(tire.precio_compra || 0).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Proveedor
                </span>
                <p className="font-bold text-sm text-brand-navy dark:text-slate-200 uppercase mt-1">
                  {tire.proveedor || "No registrado"}
                </p>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-white/10" />

            {/* 🚀 TIMELINE SECTION */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-navy dark:text-slate-300 flex items-center gap-2">
                <Eye className="h-4 w-4" /> Historial de Movimientos
              </h4>

              <div className="relative space-y-0 pl-2">
                {/* Línea vertical de fondo */}
                <div className="absolute left-[19px] top-2 bottom-0 w-px bg-slate-200 dark:bg-white/10" />

                {sortedHistory.length === 0 ? (
                  <div className="pl-12 py-8 text-xs font-bold text-slate-400 uppercase tracking-widest italic text-center">
                    No hay eventos registrados para este activo.
                  </div>
                ) : (
                  sortedHistory.map((event, idx) => {
                    const unidadToShow = event.unidad_economico || event.unidad;

                    return (
                      <div
                        key={event.id || idx}
                        className="relative flex gap-6 pb-8 group animate-in slide-in-from-bottom-2 fade-in"
                      >
                        {/* Icono de círculo en el eje */}
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/20 group-hover:border-brand-navy dark:group-hover:border-blue-400 group-hover:scale-110 transition-all shadow-sm">
                          {getEventIcon(event.tipo)}
                        </div>

                        {/* Tarjeta de evento */}
                        <div className="flex-1 space-y-3 bg-white/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-slate-800/50 transition-colors shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm border w-fit",
                                getEventBadgeColor(event.tipo),
                              )}
                            >
                              {event.tipo}
                            </Badge>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              {format(
                                new Date(event.fecha),
                                "dd MMM yyyy • HH:mm",
                                { locale: es },
                              )}
                            </span>
                          </div>

                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                            {event.descripcion}
                          </p>

                          {/* Chips de datos del evento */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {unidadToShow && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-navy dark:text-blue-400 bg-brand-navy/5 dark:bg-blue-900/30 px-2 py-1 rounded-md border border-brand-navy/10 dark:border-blue-500/30">
                                <Truck className="h-3 w-3" /> ECO-{unidadToShow}
                              </div>
                            )}
                            {event.km !== undefined && event.km !== null && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
                                <Gauge className="h-3 w-3" />{" "}
                                {event.km.toLocaleString()} km
                              </div>
                            )}
                            {event.costo ? (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/30">
                                <DollarSign className="h-3 w-3" />
                                {event.costo.toLocaleString()}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-2">
                            <User className="h-3 w-3" />
                            Responsable:{" "}
                            <span className="text-brand-navy dark:text-slate-300">
                              {event.responsable || "Admin Sistema"}
                            </span>
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
