// src/features/despacho/TripDetailsModal.tsx
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trip } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import { Badge } from "@/components/ui/badge";
import { Truck, User, MapPin, DollarSign } from "lucide-react";

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
}

export function TripDetailsModal({
  open,
  onOpenChange,
  trip,
}: TripDetailsModalProps) {
  const { editTrip } = useTrips();

  const [anticipoCasetas, setAnticipoCasetas] = useState(0);
  const [anticipoDiesel, setAnticipoDiesel] = useState(0);
  const [anticipoViaticos, setAnticipoViaticos] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trip) {
      setAnticipoCasetas(trip.anticipo_casetas || 0);
      setAnticipoDiesel(trip.anticipo_combustible || 0);
      setAnticipoViaticos(trip.anticipo_viaticos || 0);
    }
  }, [trip]);

  if (!trip) return null;

  const handleSave = async () => {
    setIsSaving(true);
    // Llama al hook para guardar en BD
    const success = await editTrip(String(trip.id), {
      anticipo_casetas: anticipoCasetas,
      anticipo_combustible: anticipoDiesel,
      anticipo_viaticos: anticipoViaticos,
    });

    setIsSaving(false);
    if (success) {
      onOpenChange(false); // Cierra el modal solo si fue exitoso
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2 p-3">
              <span className="text-primary">
                {trip.client?.razon_social || "CLIENTE GENERAL"}
              </span>
            </DialogTitle>
            <Badge
              variant="outline"
              className="bg-white mr-4 text-xs font-mono"
            >
              {trip.public_id || `VIAJE-${trip.id}`}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {/* Columna Izquierda: Info de Ruta */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-rose-500 mt-1" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Ruta / {trip.route_name || "ESTÁNDAR"}
                </p>
                <p className="font-bold text-slate-800">{trip.origin}</p>
                <p className="text-xs text-slate-400 my-0.5">hacia</p>
                <p className="font-bold text-slate-800">{trip.destination}</p>
              </div>
            </div>

            <div className="pt-2 border-t text-sm">
              <p className="text-muted-foreground text-xs mb-1">
                Fecha de Inicio
              </p>
              <p className="font-medium">
                {trip.start_date
                  ? format(new Date(trip.start_date), "dd MMM yyyy - HH:mm", {
                      locale: es,
                    })
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Columna Derecha: Info Operativa */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Recursos Asignados
              </p>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded text-sm mb-2 border">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="font-bold">
                  {trip.unit?.numero_economico || "Sin Unidad"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {trip.unit?.placas}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded text-sm border">
                <User className="h-4 w-4 text-emerald-600" />
                <span className="font-bold truncate">
                  {trip.operator?.name || "Sin Operador"}
                </span>
              </div>
            </div>
          </div>

          {/* Fila Inferior Completa: Edición Financiera */}
          <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-lg border mt-2">
            <h4 className="text-sm font-semibold mb-4 text-slate-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Anticipos del Operador
              (Editables)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Casetas</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={anticipoCasetas}
                  onChange={(e) => setAnticipoCasetas(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Diésel</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={anticipoDiesel}
                  onChange={(e) => setAnticipoDiesel(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Viáticos</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={anticipoViaticos}
                  onChange={(e) => setAnticipoViaticos(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
