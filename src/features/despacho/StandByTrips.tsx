import { useState } from "react";
import { useTrips } from "@/hooks/useTrips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Play,
  Trash2,
  User,
  Clock,
  Route as RouteIcon,
  AlertTriangle,
  CalendarDays,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TripDetailsModal } from "./TripDetailsModal";
import { Trip } from "@/types/api.types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const StandByTrips = () => {
  const { trips, updateTripStatus, loading, deleteTrip } = useTrips();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // 🚀 Estados para el Dialog de borrado "bonito"
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtramos los viajes que están en estado 'creado' (Stand-By)
  const pendingTrips = trips.filter((t) => t.status === "creado");

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return;

    setIsDeleting(true);
    try {
      await deleteTrip(String(tripToDelete.id));
      toast.success("Viaje eliminado correctamente");
      setTripToDelete(null);
    } catch (error) {
      toast.error("No se pudo eliminar el viaje");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-brand-red mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 animate-pulse">
          Cargando viajes en espera...
        </p>
      </div>
    );
  }

  if (pendingTrips.length === 0) {
    return (
      <div className="text-center py-20 px-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
        <Clock className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          No hay viajes pendientes
        </p>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">
          Todos los servicios programados están actualmente en ruta o
          finalizados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {pendingTrips.map((trip) => {
          const configText =
            trip.dolly_id || trip.remolque_2_id ? "FULL" : "SENCILLO";
          const formattedRouteName = trip.route_name
            ? `${trip.route_name} - ${configText}`
            : `${trip.origin} - ${trip.destination} - ${configText}`;

          return (
            <Card
              key={trip.id}
              className="border-l-4 border-l-amber-500 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10"
              onClick={() => setSelectedTrip(trip)}
            >
              <CardContent className="p-5 space-y-5">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] font-black text-brand-navy dark:text-blue-400 uppercase tracking-widest truncate block">
                      {trip.client?.razon_social || "Cliente General"}
                    </span>
                    {/* 🚀 FASE 2: Título basado en el Nombre de la Ruta armada */}
                    <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm leading-tight uppercase tracking-tight line-clamp-2">
                      {formattedRouteName}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 text-[9px] font-black uppercase tracking-widest shadow-sm shrink-0"
                  >
                    STAND-BY
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-white/5">
                    ID: #{trip.public_id || trip.id}
                  </span>
                  {trip.fecha_programada && (
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3" />{" "}
                      {trip.fecha_programada}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-inner">
                  <div className="flex items-center gap-1.5 truncate">
                    <Truck className="h-3.5 w-3.5 text-brand-navy dark:text-slate-300 shrink-0" />
                    <span className="truncate">
                      {trip.remolque_1?.numero_economico || "S/U"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3.5 w-3.5 text-brand-navy dark:text-slate-300 shrink-0" />
                    <span className="truncate">
                      {trip.legs?.[0]?.operator?.name?.split(" ")[0] || "S/A"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex gap-2">
                  <Button
                    className="flex-1 bg-brand-green hover:bg-brand-green/80 text-white h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 transition-all haptic-press border-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTripStatus(
                        String(trip.id),
                        "en_transito",
                        "Inicio de viaje autorizado desde Stand-By",
                      );
                    }}
                  >
                    <Play className="h-3 w-3 mr-2 fill-current" /> INICIAR RUTA
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-10 w-10 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTripToDelete(trip); // 🚀 Abre el Dialog bonito
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Detalle Completo */}
      <TripDetailsModal
        open={!!selectedTrip}
        onOpenChange={(open) => !open && setSelectedTrip(null)}
        trip={selectedTrip}
      />

      {/* 🚀 DIALOG DE CONFIRMACIÓN DE ELIMINACIÓN (Estructura Tahoe 4 Capas) */}
      <AlertDialog
        open={!!tripToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setTripToDelete(null);
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl transition-all duration-300">
          {/* HEADER TAHOE */}
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Eliminar Viaje
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Acción Irreversible • Purga de Sistema
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea eliminar el viaje programado para{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase">
                  {tripToDelete?.client?.razon_social}
                </b>
                ?
              </p>

              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Configuración
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción desvinculará a los operadores y unidades asignados
                  devolviéndolos al catálogo de disponibles.{" "}
                  <b className="font-black underline">
                    No podrá ser recuperado
                  </b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          {/* FOOTER */}
          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setTripToDelete(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>

              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteConfirm();
                }}
                disabled={isDeleting}
                className="w-full sm:w-auto haptic-press shadow-rose-600/20 flex-shrink-0 border-none bg-brand-red hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar Viaje
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
