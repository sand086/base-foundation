// src/features/despacho/NextLegModal.tsx
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Truck,
  User,
  Gauge,
  Droplets,
  MapPin,
  Loader2,
} from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useOperators } from "@/hooks/useOperators";
import { Trip, TripLegCreatePayload } from "@/types/api.types";

interface NextLegModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripPadre: Trip | null;
  onSubmit: (tripId: string, payload: TripLegCreatePayload) => Promise<boolean>;
}

export function NextLegModal({
  open,
  onOpenChange,
  tripPadre,
  onSubmit,
}: NextLegModalProps) {
  const { unidades } = useUnits();
  const { operadores } = useOperators();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<TripLegCreatePayload>>({
    leg_type: "ruta_carretera",
    unit_id: null,
    operator_id: null,
    odometro_inicial: 0,
    nivel_tanque_inicial: 100,
    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
  });

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setFormData({
        leg_type: "ruta_carretera",
        unit_id: null,
        operator_id: null,
        odometro_inicial: 0,
        nivel_tanque_inicial: 100,
        anticipo_casetas: 0,
        anticipo_viaticos: 0,
        anticipo_combustible: 0,
      });
    }
  }, [open]);

  // Filtramos tractocamiones disponibles
  const availableTractos = useMemo(() => {
    if (!unidades) return [];
    return unidades.filter(
      (u: any) =>
        (`${u.tipo_1} ${u.tipo} ${u.tipo_unidad}`
          .toLowerCase()
          .includes("tracto") ||
          `${u.tipo_1} ${u.tipo} ${u.tipo_unidad}`
            .toLowerCase()
            .includes("camion")) &&
        ["disponible", "bloqueado"].includes(u.status?.toLowerCase()),
    );
  }, [unidades]);

  const availableOperators = useMemo(() => {
    if (!operadores) return [];
    return operadores.filter(
      (o: any) => o.status === "activo" || o.status === "disponible",
    );
  }, [operadores]);

  const handleSubmit = async () => {
    if (!tripPadre) return;

    if (!formData.unit_id || !formData.operator_id) {
      return toast.error("Debes seleccionar una Unidad y un Operador");
    }
    if (!formData.odometro_inicial || formData.odometro_inicial <= 0) {
      return toast.error("El odómetro inicial es obligatorio");
    }

    setLoading(true);
    const success = await onSubmit(
      String(tripPadre.id),
      formData as TripLegCreatePayload,
    );
    setLoading(false);

    if (success) {
      onOpenChange(false);
    }
  };

  if (!tripPadre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-50">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-brand-navy">
            <LinkIcon className="h-5 w-5" /> Desenganche y Relevo
          </DialogTitle>
          <DialogDescription>
            Viaje <strong>#{tripPadre.public_id || tripPadre.id}</strong> hacia{" "}
            <strong>{tripPadre.destination}</strong>.<br />
            Se cerrará el tramo actual y se asignará el remolque a la nueva
            unidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="font-bold text-brand-navy">
              1. Siguiente Fase (Tramo) *
            </Label>
            <Select
              value={formData.leg_type}
              onValueChange={(v: any) =>
                setFormData((p) => ({ ...p, leg_type: v }))
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecciona la fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ruta_carretera">
                  Ruta Carretera (Viaje a Destino)
                </SelectItem>
                <SelectItem value="entrega_vacio">
                  Entrega de Vacío (Regreso al Puerto)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Tractocamión Nuevo *
              </Label>
              <Select
                value={formData.unit_id ? String(formData.unit_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, unit_id: Number(v) }))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTractos.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.numero_economico} - {u.placas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" /> Operador Nuevo *
              </Label>
              <Select
                value={formData.operator_id ? String(formData.operator_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, operator_id: Number(v) }))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-brand-navy">
                <Gauge className="h-4 w-4" /> Odómetro Arranque *
              </Label>
              <Input
                type="number"
                value={formData.odometro_inicial || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    odometro_inicial: Number(e.target.value),
                  }))
                }
                placeholder="Ej: 154000"
                className="font-mono text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-brand-navy">
                <Droplets className="h-4 w-4" /> Tanque Arranque (%) *
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.nivel_tanque_inicial || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    nivel_tanque_inicial: Number(e.target.value),
                  }))
                }
                placeholder="100"
                className="font-mono text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Anticipo Casetas</Label>
              <Input
                type="number"
                value={formData.anticipo_casetas || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    anticipo_casetas: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Anticipo Diésel</Label>
              <Input
                type="number"
                value={formData.anticipo_combustible || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    anticipo_combustible: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Viáticos</Label>
              <Input
                type="number"
                value={formData.anticipo_viaticos || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    anticipo_viaticos: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            Confirmar Relevo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
