// src/features/despacho/StandByTrips.tsx
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
      <div className="p-8 text-center flex flex-col items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-slate-500 font-medium">
          Cargando viajes en espera...
        </p>
      </div>
    );
  }

  if (pendingTrips.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <Clock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">
          No hay viajes pendientes de autorización
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingTrips.map((trip) => (
          <Card
            key={trip.id}
            className="border-l-4 border-l-amber-400 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setSelectedTrip(trip)}
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-primary uppercase leading-none">
                    {trip.client?.razon_social || "Cliente General"}
                  </span>
                  {/* 🚀 FASE 2: Título basado en el Nombre de la Ruta armada */}
                  <h3 className="font-black text-slate-800 text-sm leading-tight flex items-center gap-1.5 uppercase tracking-tighter">
                    <RouteIcon className="h-3.5 w-3.5 text-slate-600" />
                    {trip.route_name || `${trip.origin} - ${trip.destination}`}
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-black"
                >
                  STAND-BY
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-mono">
                  ID: #{trip.public_id || trip.id}
                </span>
                {trip.fecha_programada && (
                  <span className="text-blue-600 font-bold">
                    📅 {trip.fecha_programada}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3 w-3 text-slate-600" />
                  <span className="font-semibold truncate">
                    {trip.remolque_1?.numero_economico || "Sin unidad"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-slate-600" />
                  <span className="truncate font-semibold">
                    {trip.legs?.[0]?.operator?.name?.split(" ")[0] ||
                      "Sin asignar"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9 font-black uppercase tracking-tighter text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTripStatus(
                      String(trip.id),
                      "en_transito",
                      "Inicio de viaje autorizado desde Stand-By",
                    );
                  }}
                >
                  <Play className="h-3.5 w-3.5 mr-2 fill-current" /> INICIAR
                  RUTA
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-destructive hover:bg-red-50 h-9 w-9 transition-colors"
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
        ))}
      </div>

      {/* Modal de Detalle Completo */}
      <TripDetailsModal
        open={!!selectedTrip}
        onOpenChange={(open) => !open && setSelectedTrip(null)}
        trip={selectedTrip}
      />

      {/* 🚀 DIALOG DE CONFIRMACIÓN BONITO */}
      <AlertDialog
        open={!!tripToDelete}
        onOpenChange={() => setTripToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 font-black uppercase tracking-tighter">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar viaje en espera?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 pt-2">
              Esta acción eliminará el viaje programado para{" "}
              <span className="font-bold text-slate-900">
                {tripToDelete?.client?.razon_social}
              </span>{" "}
              de forma permanente. No se podrá recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border-slate-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              {isDeleting ? "Eliminando..." : "Sí, eliminar viaje"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
