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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GlobalTire } from "@/services/tireService";
import { Wrench, RefreshCw, Trash2, DollarSign } from "lucide-react";

type MaintenanceType = "reparacion" | "renovado" | "desecho";

interface MaintenanceTireModalProps {
  tire: GlobalTire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    tireId: string,
    tipo: MaintenanceType,
    costo: number,
    descripcion: string,
  ) => void;
}

export function MaintenanceTireModal({
  tire,
  open,
  onOpenChange,
  onSubmit,
}: MaintenanceTireModalProps) {
  const [tipo, setTipo] = useState<MaintenanceType | "">("");
  const [costo, setCosto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  if (!tire) return null;

  const handleSubmit = () => {
    if (!tipo) {
      toast.error("Selecciona un tipo de mantenimiento");
      return;
    }

    const costoNum = parseFloat(costo) || 0;

    // Enviamos ID como string, el padre lo convierte a number
    onSubmit(tire.id.toString(), tipo, costoNum, descripcion);

    // Reset form
    setTipo("");
    setCosto("");
    setDescripcion("");
    // No cerramos aquí, dejamos que el padre cierre tras el éxito o error
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Mantenimiento de Llanta
          </DialogTitle>
          <DialogDescription>
            {tire.codigo_interno} - {tire.marca} {tire.modelo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumen Estado Actual */}
          <div className="p-3 bg-muted rounded-lg grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Estado:</span>
              <p className="font-medium capitalize">{tire.estado}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ubicación:</span>
              <p className="font-medium">
                {tire.unidad_actual_economico || "Almacén"}
              </p>
            </div>
          </div>

          {/* Tipo Mantenimiento */}
          <div className="space-y-2">
            <Label>Tipo de Acción</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as MaintenanceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reparacion">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" /> Reparación
                  </div>
                </SelectItem>
                <SelectItem value="renovado">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-600" /> Enviar a
                    Renovado
                  </div>
                </SelectItem>
                <SelectItem value="desecho">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-rose-600" /> Enviar a
                    Desecho
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Costo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Costo Estimado (MXN)
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Detalles del daño, proveedor, factura..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>

          {tipo === "desecho" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
              ⚠️ Al confirmar desecho, la llanta se marcará como inactiva
              permanentemente.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant={tipo === "desecho" ? "destructive" : "default"}
          >
            {tipo === "desecho" ? "Confirmar Baja" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
