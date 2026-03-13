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
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Truck,
  User,
  Loader2,
  Info,
  CheckCircle2,
  Box,
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

// Interfaz extendida para poder mandar los remolques en el payload
interface ExtendedLegPayload extends TripLegCreatePayload {
  remolque_1_id?: number | null;
  dolly_id?: number | null;
  remolque_2_id?: number | null;
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

  const [formData, setFormData] = useState<Partial<ExtendedLegPayload>>({
    leg_type: "ruta_carretera",
    unit_id: null,
    operator_id: null,
    remolque_1_id: null,
    dolly_id: null,
    remolque_2_id: null,
    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
  });

  // 🚀 Lógica para detectar si es un viaje Full basándose en el tipo de unidad
  const isFullTrip = useMemo(() => {
    if (!tripPadre) return false;
    // Asumimos que si la tarifa o el tipo de unidad dice "9ejes" o "full", es un full.
    // También validamos si el viaje PADRE ya tiene asignado un dolly de alguna fase anterior
    const tu = (tripPadre as any).tipo_unidad?.toLowerCase() || "";
    return (
      tu === "full" ||
      tu === "9ejes" ||
      tu === "9 ejes" ||
      tu === "doble" ||
      Boolean(tripPadre.dolly_id)
    );
  }, [tripPadre]);

  useEffect(() => {
    if (open && tripPadre) {
      setFormData({
        leg_type: "ruta_carretera",
        unit_id: null,
        operator_id: null,
        // Si el viaje ya tiene remolques asignados (de una fase anterior), los precargamos
        remolque_1_id: tripPadre.remolque_1_id || null,
        dolly_id: tripPadre.dolly_id || null,
        remolque_2_id: tripPadre.remolque_2_id || null,
        anticipo_casetas: 0,
        anticipo_viaticos: 0,
        anticipo_combustible: 0,
      });
    }
  }, [open, tripPadre]);

  const isRoadLeg = formData.leg_type === "ruta_carretera";

  // --- FILTROS DE UNIDADES (Los mismos que usas en DespachoWizard) ---
  const arrUnidades = useMemo(
    () => (Array.isArray(unidades) ? unidades : []),
    [unidades],
  );

  const availableTractos = useMemo(() => {
    return arrUnidades.filter(
      (u: any) =>
        (`${u.tipo_1} ${u.tipo} ${u.tipo_unidad}`
          .toLowerCase()
          .includes("tracto") ||
          `${u.tipo_1} ${u.tipo} ${u.tipo_unidad}`
            .toLowerCase()
            .includes("camion")) &&
        ["disponible", "bloqueado"].includes(u.status?.toLowerCase()),
    );
  }, [arrUnidades]);

  const availableRemolques = useMemo(() => {
    return arrUnidades.filter((u: any) => {
      const strTipo1 = (u.tipo_1 || "").toLowerCase();
      const strTipo = (u.tipo || "").toLowerCase();
      const estaDisponible = ["disponible", "bloqueado"].includes(
        u.status?.toLowerCase(),
      );
      return (
        ["remolque", "caja", "plataforma", "chasis", "utilitario"].some(
          (p) => strTipo1.includes(p) || strTipo.includes(p),
        ) && estaDisponible
      );
    });
  }, [arrUnidades]);

  const availableDollies = useMemo(() => {
    const dollies = arrUnidades.filter((u: any) =>
      (u.tipo_1 || "").toLowerCase().includes("dolly"),
    );
    if (dollies.length === 0)
      return [{ id: 9997, numero_economico: "DOLLY-PRUEBA (Sin stock)" }];
    return dollies;
  }, [arrUnidades]);

  const availableOperators = useMemo(() => {
    if (!operadores) return [];
    return operadores.filter(
      (o: any) => o.status === "activo" || o.status === "disponible",
    );
  }, [operadores]);

  const handleSubmit = async () => {
    if (!tripPadre) return;

    if (!formData.unit_id || !formData.operator_id) {
      return toast.error("Debes asignar un Tractocamión y un Operador.");
    }

    if (!formData.remolque_1_id) {
      return toast.error("Debes asignar al menos un Remolque/Chasis.");
    }

    if (isFullTrip && (!formData.dolly_id || !formData.remolque_2_id)) {
      return toast.error(
        "Por ser configuración FULL, debes asignar Dolly y Remolque 2.",
      );
    }

    setLoading(true);

    const payload: ExtendedLegPayload = {
      leg_type: formData.leg_type!,
      unit_id: Number(formData.unit_id),
      operator_id: Number(formData.operator_id),

      // 🚀 Mandamos los equipos de arrastre al backend
      remolque_1_id: formData.remolque_1_id
        ? Number(formData.remolque_1_id)
        : null,
      dolly_id:
        isFullTrip && formData.dolly_id ? Number(formData.dolly_id) : null,
      remolque_2_id:
        isFullTrip && formData.remolque_2_id
          ? Number(formData.remolque_2_id)
          : null,

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

    const success = await onSubmit(String(tripPadre.id), payload as any);

    if (success) {
      if (formData.leg_type === "carga_muelle" && formData.remolque_1_id) {
        await updateLoadStatus(Number(formData.remolque_1_id), true);
        if (formData.remolque_2_id) {
          await updateLoadStatus(Number(formData.remolque_2_id), true);
        }
        toast.success("Remolque(s) marcado(s) como CARGADOS.");
      }
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!tripPadre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-slate-50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-brand-navy">
            <LinkIcon className="h-5 w-5" /> Asignar Siguiente Fase
          </DialogTitle>
          <DialogDescription>
            Viaje <strong>#{tripPadre.public_id || tripPadre.id}</strong> hacia{" "}
            <strong>{tripPadre.destination}</strong>.<br />
            Configura los equipos y el operador para el siguiente tramo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TIPO DE FASE */}
          <div className="space-y-2 bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
            <Label className="font-bold text-indigo-900 uppercase tracking-wider text-xs">
              1. Selecciona la Próxima Fase *
            </Label>
            <Select
              value={formData.leg_type}
              onValueChange={(v: any) =>
                setFormData((p) => ({ ...p, leg_type: v }))
              }
            >
              <SelectTrigger className="bg-white border-indigo-200 h-11">
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

          {/* TRACTO Y OPERADOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-bold text-slate-700">
                <Truck className="h-4 w-4 text-brand-navy" /> Tractocamión
                Asignado *
              </Label>
              <Select
                value={formData.unit_id ? String(formData.unit_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, unit_id: Number(v) }))
                }
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Seleccionar Tracto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTractos.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      ECO-{u.numero_economico} - {u.placas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-bold text-slate-700">
                <User className="h-4 w-4 text-brand-navy" /> Operador *
              </Label>
              <Select
                value={formData.operator_id ? String(formData.operator_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, operator_id: Number(v) }))
                }
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Seleccionar Operador..." />
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

          {/* 🚀 EQUIPOS DE ARRASTRE (CHASIS Y DOLLY) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <Label className="font-bold text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider text-xs">
              <Box className="h-4 w-4 text-emerald-600" /> Equipos de Arrastre
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-slate-500">
                  Remolque / Chasis 1 *
                </Label>
                <Select
                  value={
                    formData.remolque_1_id ? String(formData.remolque_1_id) : ""
                  }
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, remolque_1_id: Number(v) }))
                  }
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="Seleccionar Remolque..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRemolques.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        ECO-{u.numero_economico} |{" "}
                        {u.is_loaded ? "📦 CARGADO" : "➖ VACÍO"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFullTrip && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-rose-600 font-bold">
                      Dolly *
                    </Label>
                    <Select
                      value={formData.dolly_id ? String(formData.dolly_id) : ""}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, dolly_id: Number(v) }))
                      }
                    >
                      <SelectTrigger className="bg-rose-50 border-rose-200 text-rose-700">
                        <SelectValue placeholder="Seleccionar Dolly..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDollies.map((u: any) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            ECO-{u.numero_economico}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-rose-600 font-bold">
                      Remolque / Chasis 2 *
                    </Label>
                    <Select
                      value={
                        formData.remolque_2_id
                          ? String(formData.remolque_2_id)
                          : ""
                      }
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, remolque_2_id: Number(v) }))
                      }
                    >
                      <SelectTrigger className="bg-rose-50 border-rose-200 text-rose-700">
                        <SelectValue placeholder="Seleccionar Remolque 2..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRemolques.map((u: any) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            ECO-{u.numero_economico} |{" "}
                            {u.is_loaded ? "📦 CARGADO" : "➖ VACÍO"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ANTICIPOS CONDICIONALES */}
          {isRoadLeg ? (
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs mb-4 block">
                Anticipos Operativos
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Casetas</Label>
                  <Input
                    type="number"
                    className="font-mono bg-slate-50"
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
                  <Label className="text-xs text-slate-500">Diésel</Label>
                  <Input
                    type="number"
                    className="font-mono bg-slate-50"
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
                  <Label className="text-xs text-slate-500">Viáticos</Label>
                  <Input
                    type="number"
                    className="font-mono bg-slate-50"
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
          ) : (
            <Card className="border-slate-200 bg-transparent flex flex-col justify-center items-center text-center p-4">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <Info className="h-4 w-4" /> Los movimientos de patio no
                requieren registro de anticipos.
              </p>
            </Card>
          )}
        </div>

        <DialogFooter className="bg-white p-4 -m-6 mt-2 rounded-b-lg border-t sticky bottom-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white font-bold gap-2 px-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Iniciar Tramo Operativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
