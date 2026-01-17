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
import { GlobalTire } from "./types";
import { Wrench, RefreshCw, Trash2, DollarSign } from "lucide-react";

type MaintenanceType = 'reparacion' | 'renovado' | 'desecho';

interface MaintenanceTireModalProps {
  tire: GlobalTire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tireId: string, tipo: MaintenanceType, costo: number, descripcion: string) => void;
}

export function MaintenanceTireModal({ tire, open, onOpenChange, onSubmit }: MaintenanceTireModalProps) {
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
    onSubmit(tire.id, tipo, costoNum, descripcion);
    
    const tipoLabels = {
      reparacion: 'Reparación',
      renovado: 'Renovado',
      desecho: 'Desecho'
    };
    
    toast.success(`Llanta ${tire.codigoInterno} enviada a ${tipoLabels[tipo]}`);
    
    // Reset form
    setTipo("");
    setCosto("");
    setDescripcion("");
    onOpenChange(false);
  };

  const getIcon = (t: MaintenanceType) => {
    switch (t) {
      case 'reparacion': return <Wrench className="h-4 w-4" />;
      case 'renovado': return <RefreshCw className="h-4 w-4" />;
      case 'desecho': return <Trash2 className="h-4 w-4" />;
    }
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
            {tire.codigoInterno} - {tire.marca} {tire.modelo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="p-3 bg-muted rounded-lg grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Estado actual:</span>
              <p className="font-medium capitalize">{tire.estado}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Profundidad:</span>
              <p className="font-medium">{tire.profundidadActual} mm</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ubicación:</span>
              <p className="font-medium">
                {tire.unidadActual ? `${tire.unidadActual}` : 'Almacén'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Km recorridos:</span>
              <p className="font-medium">{tire.kmRecorridos.toLocaleString()}</p>
            </div>
          </div>

          {/* Maintenance Type */}
          <div className="space-y-2">
            <Label>Tipo de Mantenimiento</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as MaintenanceType)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reparacion">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    Reparación
                  </div>
                </SelectItem>
                <SelectItem value="renovado">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-600" />
                    Enviar a Renovado
                  </div>
                </SelectItem>
                <SelectItem value="desecho">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-rose-600" />
                    Enviar a Desecho
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Costo Estimado (MXN)
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripción / Observaciones</Label>
            <Textarea
              placeholder="Detalles del mantenimiento, daños observados, proveedor..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for Desecho */}
          {tipo === 'desecho' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
              ⚠️ Al enviar a desecho, la llanta quedará marcada como inutilizable y se descontará del inventario activo.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            variant={tipo === 'desecho' ? 'destructive' : 'default'}
          >
            {tipo === 'desecho' ? 'Confirmar Desecho' : 'Registrar Mantenimiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
