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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Truck,
  User,
  Loader2,
  Info,
  CheckCircle2,
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
  const { unidades, updateLoadStatus } = useUnits();
  const { operadores } = useOperators();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<TripLegCreatePayload>>({
    leg_type: "ruta_carretera",
    unit_id: null,
    operator_id: null,
    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        leg_type: "ruta_carretera",
        unit_id: null,
        operator_id: null,
        anticipo_casetas: 0,
        anticipo_viaticos: 0,
        anticipo_combustible: 0,
      });
    }
  }, [open]);

  const isRoadLeg = formData.leg_type === "ruta_carretera";

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
      return toast.error("Debes asignar una Unidad y un Operador.");
    }

    setLoading(true);

    const payload: TripLegCreatePayload = {
      leg_type: formData.leg_type!,
      unit_id: Number(formData.unit_id),
      operator_id: Number(formData.operator_id),

      // Odómetros removidos, se controlan en el módulo de combustible
      odometro_inicial: null,
      nivel_tanque_inicial: null,

      anticipo_casetas: isRoadLeg ? Number(formData.anticipo_casetas || 0) : 0,
      anticipo_viaticos: isRoadLeg
        ? Number(formData.anticipo_viaticos || 0)
        : 0,
      anticipo_combustible: isRoadLeg
        ? Number(formData.anticipo_combustible || 0)
        : 0,
    };

    const success = await onSubmit(String(tripPadre.id), payload);

    if (success) {
      const lastLeg =
        tripPadre.legs?.find((l) => l.status === "en_transito") ||
        tripPadre.legs?.[tripPadre.legs.length - 1];

      if (
        lastLeg &&
        lastLeg.leg_type === "carga_muelle" &&
        tripPadre.remolque_1_id
      ) {
        await updateLoadStatus(tripPadre.remolque_1_id, true);
        if (tripPadre.remolque_2_id) {
          await updateLoadStatus(tripPadre.remolque_2_id, true);
        }
        toast.success("Remolque(s) marcado(s) como CARGADOS automáticamente.");
      }
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!tripPadre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-50">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-brand-navy">
            <LinkIcon className="h-5 w-5" /> Asignar Siguiente Fase
          </DialogTitle>
          <DialogDescription>
            Viaje <strong>#{tripPadre.public_id || tripPadre.id}</strong> hacia{" "}
            <strong>{tripPadre.destination}</strong>.<br />
            Configura qué sucederá a continuación con el contenedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
            <Label className="font-bold text-indigo-900 uppercase tracking-wider text-xs">
              1. Selecciona la Próxima Fase *
            </Label>
            <Select
              value={formData.leg_type}
              onValueChange={(v: any) =>
                setFormData((p) => ({ ...p, leg_type: v }))
              }
            >
              <SelectTrigger className="bg-white border-indigo-200">
                <SelectValue placeholder="Selecciona la fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carga_muelle">
                  1. Carga Muelle (Patio Base)
                </SelectItem>
                <SelectItem value="ruta_carretera">
                  2. Ruta Directa (Viaje a Destino)
                </SelectItem>
                <SelectItem value="entrega_vacio">
                  3. Retorno de Vacío (Regreso a Puerto/Patio)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Tractocamión Asignado *
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
                <User className="h-4 w-4" /> Operador *
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

          {/* 🚀 ANTICIPOS CONDICIONALES */}
          {isRoadLeg ? (
            <div className="grid grid-cols-3 gap-3 border-t pt-4">
              <div className="col-span-3">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Anticipos Entregados (Operación)
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Casetas</Label>
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
                <Label className="text-xs">Diésel (Vale)</Label>
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
          ) : (
            <Card className="border-slate-200 bg-transparent flex flex-col justify-center items-center text-center p-4">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <Info className="h-4 w-4" /> Los movimientos de patio no
                requieren registro de anticipos.
              </p>
            </Card>
          )}
        </div>

        <DialogFooter className="bg-slate-100 p-4 -m-6 mt-2 rounded-b-lg border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white font-bold gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Guardar Siguiente Fase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
