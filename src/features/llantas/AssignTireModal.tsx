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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRightLeft, Truck, MapPin, Loader2 } from "lucide-react";

import { GlobalTire, TIRE_POSITIONS } from "@/services/tireService";
import { useUnits } from "@/hooks/useUnits"; // <--- TU HOOK REAL

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
  // 1. Consumir hook de unidades
  const { unidades, isLoading: loadingUnits } = useUnits();

  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtramos unidades (opcional: solo mostrar activas si quisieras)
  const unidadesList = useMemo(() => {
    return unidades || [];
  }, [unidades]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setSelectedUnit("");
      setSelectedPosition("");
      setNotas("");
      setIsSubmitting(false);
    }
  }, [open, tire?.id]);

  if (!tire) return null;

  const isCurrentlyMounted = !!tire.unidad_actual_id;

  const handleSubmit = async () => {
    if (selectedUnit === "almacen") {
      // Enviar a Stock
      setIsSubmitting(true);
      await onAssign(tire.id.toString(), null, null, notas);
      setIsSubmitting(false);
      onOpenChange(false);
    } else if (selectedUnit && selectedPosition) {
      // Montar en Unidad
      const unit = unidadesList.find((u) => u.id.toString() === selectedUnit);
      const position = TIRE_POSITIONS.find((p) => p.id === selectedPosition);

      setIsSubmitting(true);
      await onAssign(
        tire.id.toString(),
        selectedUnit, // Enviamos ID como string, el padre lo parsea
        position?.label || selectedPosition, // Enviamos el Label ("Eje 1 Izq")
        notas,
      );

      toast.success(
        `Llanta asignada a ${unit?.numero_economico} en ${position?.label}`,
      );
      setIsSubmitting(false);
      onOpenChange(false);
    } else {
      toast.error("Selecciona una unidad y una posición válida");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Asignar / Rotar Llanta
          </DialogTitle>
          <DialogDescription>
            {tire.codigo_interno} - {tire.marca} {tire.medida}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ubicación Actual */}
          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Ubicación Actual
              </p>
              <p className="text-sm font-medium mt-1">
                {isCurrentlyMounted
                  ? `${tire.unidad_actual_economico} - ${tire.posicion}`
                  : "📦 En Almacén"}
              </p>
            </div>
            {isCurrentlyMounted && (
              <Badge variant="secondary" className="text-xs">
                Montada
              </Badge>
            )}
          </div>

          {/* Selector de Unidad */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Nueva Ubicación (Unidad)
            </Label>

            <Select
              value={selectedUnit}
              onValueChange={(v) => {
                setSelectedUnit(v);
                if (v === "almacen") setSelectedPosition("");
              }}
              disabled={loadingUnits || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingUnits
                      ? "Cargando unidades..."
                      : "Seleccionar destino..."
                  }
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  value="almacen"
                  className="text-amber-600 font-medium"
                >
                  📦 Desmontar / Enviar a Almacén
                </SelectItem>

                {/* Separador visual */}
                <div className="h-px bg-muted my-1 mx-2" />

                {unidadesList.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.numero_economico}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {u.marca} {u.placas ? `(${u.placas})` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Posición (Solo si se elige unidad) */}
          {selectedUnit && selectedUnit !== "almacen" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Posición en el Vehículo
              </Label>
              <Select
                value={selectedPosition}
                onValueChange={setSelectedPosition}
                disabled={isSubmitting}
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

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas / Observaciones</Label>
            <Textarea
              placeholder="Razón del cambio, condición, etc."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              disabled={isSubmitting}
            />
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Importar Badge localmente si no está global
function Badge({ className, variant, children }: any) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className} ${variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}`}
    >
      {children}
    </span>
  );
}
