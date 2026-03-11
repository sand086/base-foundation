// src/features/despacho/StandByTrips.tsx
import { useState } from "react"; // ✅ Importar useState
import { useTrips } from "@/hooks/useTrips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Play,
  Trash2,
  Calendar,
  MapPin,
  User,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { TripDetailsModal } from "./TripDetailsModal"; // ✅ Importar el Modal
import { Trip } from "@/types/api.types"; // ✅ Importar el Tipo

export const StandByTrips = () => {
  const { trips, updateTripStatus, loading } = useTrips();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null); // ✅ Estado del Modal

  const pendingTrips = trips.filter((t) => t.status === "creado");

  if (loading) return <div className="p-8 text-center">Cargando espera...</div>;

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
            className="border-l-4 border-l-amber-400 hover:shadow-md transition-shadow cursor-pointer" // ✅ Añadir cursor-pointer
            onClick={() => setSelectedTrip(trip)} // ✅ Abrir modal al hacer clic en la tarjeta
          >
            <CardContent className="p-4 space-y-4">
              {/* ... tu contenido original de la tarjeta StandBy ... */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-primary uppercase leading-none">
                    {trip.client?.razon_social || "Cliente General"}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">
                    {trip.origin} <br />{" "}
                    <span className="text-slate-400 font-normal">→</span>{" "}
                    {trip.destination}
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                >
                  STAND-BY
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3 w-3 text-slate-400" />
                  <span className="font-semibold">
                    {trip.remolque_1?.numero_economico || "Sin unidad"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="truncate">
                    {trip.legs[0]?.operator_id
                      ? trip.legs[0].operator_id
                      : "Sin asignar"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                  onClick={(e) => {
                    e.stopPropagation(); // ✅ Evita que el click abra el modal
                    updateTripStatus(
                      String(trip.id),
                      "en_transito",
                      "Inicio de viaje autorizado",
                    );
                  }}
                >
                  <Play className="h-3.5 w-3.5 mr-2 fill-current" /> INICIAR
                  RUTA
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-destructive h-9 w-9"
                  onClick={(e) => e.stopPropagation()} // ✅ Evita que el click abra el modal
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/*  AÑADIR EL COMPONENTE DEL MODAL */}
      <TripDetailsModal
        open={!!selectedTrip}
        onOpenChange={(open) => !open && setSelectedTrip(null)}
        trip={selectedTrip}
      />
    </div>
  );
};
