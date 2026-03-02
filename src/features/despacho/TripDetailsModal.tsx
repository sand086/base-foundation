// src/features/despacho/TripDetailsModal.tsx
import { useState, useEffect } from "react";
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

  // Estados para los campos editables
  const [anticipoCasetas, setAnticipoCasetas] = useState(0);
  const [anticipoDiesel, setAnticipoDiesel] = useState(0);
  const [anticipoViaticos, setAnticipoViaticos] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado cuando se abre un viaje nuevo
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
    const success = await editTrip(String(trip.id), {
      anticipo_casetas: anticipoCasetas,
      anticipo_combustible: anticipoDiesel,
      anticipo_viaticos: anticipoViaticos,
    });

    setIsSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Detalles del Viaje - {trip.public_id || `ID: ${trip.id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
            <p className="font-semibold">{trip.client?.razon_social}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Ruta</p>
            <p className="font-semibold">
              {trip.origin} → {trip.destination}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Unidad</p>
            <p className="font-semibold">{trip.unit?.numero_economico}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Operador
            </p>
            <p className="font-semibold">{trip.operator?.name}</p>
          </div>

          {/* Campos Editables */}
          <div className="col-span-2 pt-4 border-t mt-2">
            <h4 className="font-semibold mb-3">Modificar Anticipos</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Casetas</Label>
                <Input
                  type="number"
                  value={anticipoCasetas}
                  onChange={(e) => setAnticipoCasetas(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Diésel</Label>
                <Input
                  type="number"
                  value={anticipoDiesel}
                  onChange={(e) => setAnticipoDiesel(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Viáticos</Label>
                <Input
                  type="number"
                  value={anticipoViaticos}
                  onChange={(e) => setAnticipoViaticos(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
