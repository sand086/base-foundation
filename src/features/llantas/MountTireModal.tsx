import { useEffect, useState, useMemo } from "react";
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
import { toast } from "sonner";
import { ArrowDownToLine, MapPin, Search, Loader2 } from "lucide-react";

import {
  tireService,
  TIRE_POSITIONS,
  GlobalTire,
} from "@/services/tireService";

interface MountTireModalProps {
  unitId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MountTireModal({
  unitId,
  open,
  onOpenChange,
  onSuccess,
}: MountTireModalProps) {
  const [availableTires, setAvailableTires] = useState<GlobalTire[]>([]);
  const [loadingTires, setLoadingTires] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedTireId, setSelectedTireId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");

  // Cargar llantas disponibles (en almacén) cuando se abre el modal
  useEffect(() => {
    if (open) {
      setSelectedTireId("");
      setSelectedPosition("");
      fetchAvailableTires();
    }
  }, [open]);

  const fetchAvailableTires = async () => {
    setLoadingTires(true);
    try {
      const allTires = await tireService.getAll();
      // Filtramos solo las que NO tienen unidad asignada (están en almacén)
      const inStock = allTires.filter(
        (t) => !t.unidad_actual_id && t.estado !== "desecho",
      );
      setAvailableTires(inStock);
    } catch (error) {
      toast.error("Error al cargar las llantas del almacén");
    } finally {
      setLoadingTires(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTireId || !selectedPosition) {
      toast.error("Por favor selecciona una llanta y una posición.");
      return;
    }

    setIsSubmitting(true);
    try {
      await tireService.assign(Number(selectedTireId), {
        unit_id: unitId,
        posicion: Number(selectedPosition),
      });

      toast.success("Llanta montada correctamente en la unidad.");
      onSuccess(); // Recarga la unidad en la vista principal
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al montar la llanta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Montar Llanta desde Almacén
          </DialogTitle>
          <DialogDescription>
            Selecciona una llanta disponible en inventario para montarla en esta
            unidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de Llanta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Llanta en Almacén
            </Label>
            <Select
              value={selectedTireId}
              onValueChange={setSelectedTireId}
              disabled={loadingTires || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingTires
                      ? "Buscando llantas..."
                      : "Selecciona una llanta..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableTires.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No hay llantas disponibles en almacén.
                  </div>
                ) : (
                  availableTires.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      <span className="font-mono font-bold mr-2">
                        {t.codigo_interno}
                      </span>
                      <span className="text-muted-foreground">
                        {t.marca} {t.modelo} ({t.profundidad_actual}mm)
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Posición */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Posición a Montar
            </Label>
            <Select
              value={selectedPosition}
              onValueChange={setSelectedPosition}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la posición (1 al 10)..." />
              </SelectTrigger>
              <SelectContent>
                {TIRE_POSITIONS.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id.toString()}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || availableTires.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Montar Llanta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
