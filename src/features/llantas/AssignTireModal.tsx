import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GlobalTire, TIRE_POSITIONS } from "./types";
import { fleetUnits } from "./data";
import { ArrowRightLeft, Truck, MapPin } from "lucide-react";

interface AssignTireModalProps {
  tire: GlobalTire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (
    tireId: string,
    unidad: string | null,
    posicion: string | null,
    notas: string,
  ) => void;
}

export function AssignTireModal({
  tire,
  open,
  onOpenChange,
  onAssign,
}: AssignTireModalProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [notas, setNotas] = useState("");

  if (!tire) return null;

  const handleSubmit = () => {
    if (selectedUnit === "almacen") {
      onAssign(tire.id, null, null, notas);
      toast.success(`Llanta ${tire.codigoInterno} enviada a almacén`);
    } else if (selectedUnit && selectedPosition) {
      const unit = fleetUnits.find((u) => u.id === selectedUnit);
      const position = TIRE_POSITIONS.find((p) => p.id === selectedPosition);
      onAssign(
        tire.id,
        selectedUnit,
        position?.label || selectedPosition,
        notas,
      );
      toast.success(
        `Llanta ${tire.codigoInterno} asignada a ${unit?.numero_economico} - ${position?.label}`,
      );
    } else {
      toast.error("Selecciona unidad y posición");
      return;
    }

    // Reset form
    setSelectedUnit("");
    setSelectedPosition("");
    setNotas("");
    onOpenChange(false);
  };

  const isCurrentlyMounted = tire.unidadActual !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Asignar / Rotar Llanta
          </DialogTitle>
          <DialogDescription>
            {tire.codigoInterno} - {tire.marca} {tire.modelo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Location */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Ubicación actual:
            </p>
            <p className="font-medium">
              {isCurrentlyMounted
                ? `${tire.unidadActual} - ${tire.posicion}`
                : "En Almacén / Stock"}
            </p>
          </div>

          {/* New Unit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Nueva Unidad
            </Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar unidad..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="almacen">📦 Enviar a Almacén</SelectItem>
                {fleetUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.numero_economico} ({unit.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position - only show if unit selected and not almacen */}
          {selectedUnit && selectedUnit !== "almacen" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Posición
              </Label>
              <Select
                value={selectedPosition}
                onValueChange={setSelectedPosition}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar posición..." />
                </SelectTrigger>
                <SelectContent>
                  {TIRE_POSITIONS.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Razón de la rotación, observaciones..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Confirmar Asignación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
