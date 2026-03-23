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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Truck,
  User,
  Loader2,
  CheckCircle2,
  MapPin,
  Box,
  FileText,
  DollarSign,
  Info,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useOperators } from "@/hooks/useOperators";
import { useBilling } from "@/hooks/useBilling";
import { Trip, TripLegCreatePayload } from "@/types/api.types";
import { cn } from "@/lib/utils";

interface NextLegModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripPadre: Trip | null;
  onSubmit: (tripId: string, payload: TripLegCreatePayload) => Promise<boolean>;
}

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
  const { isStamping, handleStampNominal } = useBilling();

  const [loading, setLoading] = useState(false);
  const [cpGenerada, setCpGenerada] = useState(false);

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

  // 🚀 FORMATEO DE MONEDA (Gustavo: "Comas en vez de puntos para miles")
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val || 0);

  // 🚀 LÓGICA DE CONFIGURACIÓN (Sencillo vs Full)
  const isFullTrip = useMemo(() => {
    if (!tripPadre) return false;
    const configStr = (tripPadre.route_name || "").toLowerCase();
    const configTarifa = (tripPadre as any).tipo_unidad?.toLowerCase() || "";
    return (
      configStr.includes("full") ||
      configTarifa.includes("full") ||
      configTarifa.includes("9ejes") ||
      Boolean(tripPadre.dolly_id)
    );
  }, [tripPadre]);

  // 🚀 CÁLCULOS FINANCIEROS (Pactado con Cliente)
  const finanzas = useMemo(() => {
    if (!tripPadre) return { subtotal: 0, iva: 0, retencion: 0, total: 0 };
    const base = tripPadre.tarifa_base || 0;
    const casetas = tripPadre.costo_casetas || 0;
    const subtotal = base + casetas;
    const iva = subtotal * 0.16;
    const retencion = subtotal * 0.04;
    return {
      base,
      casetas,
      subtotal,
      iva,
      retencion,
      total: subtotal + iva - retencion,
    };
  }, [tripPadre]);

  useEffect(() => {
    if (open && tripPadre) {
      setFormData({
        leg_type: "ruta_carretera",
        unit_id: null,
        operator_id: null,
        remolque_1_id: tripPadre.remolque_1_id || null,
        dolly_id: tripPadre.dolly_id || null,
        remolque_2_id: tripPadre.remolque_2_id || null,
        anticipo_casetas: 0,
        anticipo_viaticos: 0,
        anticipo_combustible: 0,
      });
      setCpGenerada(Boolean(tripPadre.uuid_fiscal));
    }
  }, [open, tripPadre]);

  const availableTractos = useMemo(() => {
    return unidades.filter(
      (u: any) =>
        (`${u.tipo_1} ${u.tipo}`.toLowerCase().includes("tracto") ||
          `${u.tipo_1} ${u.tipo}`.toLowerCase().includes("camion")) &&
        ["disponible", "bloqueado"].includes(u.status?.toLowerCase()),
    );
  }, [unidades]);

  const availableRemolques = useMemo(() => {
    return unidades.filter((u: any) => {
      const type = `${u.tipo_1} ${u.tipo}`.toLowerCase();
      return (
        ["remolque", "caja", "plataforma", "chasis"].some((p) =>
          type.includes(p),
        ) && ["disponible", "bloqueado"].includes(u.status?.toLowerCase())
      );
    });
  }, [unidades]);

  const availableDollies = useMemo(() => {
    const dollies = unidades.filter((u: any) =>
      (u.tipo_1 || "").toLowerCase().includes("dolly"),
    );
    return dollies.length > 0
      ? dollies
      : [{ id: 9997, numero_economico: "DOLLY-PRUEBA" }];
  }, [unidades]);

  const onTimbrarNominal = async () => {
    if (!tripPadre) return;
    try {
      await handleStampNominal(tripPadre.id, () => {
        setCpGenerada(true);
        toast.success("Carta Porte de $1 generada.");
      });
    } catch {
      toast.error("Error al timbrar bypass.");
    }
  };

  const handleIniciarTramo = async () => {
    if (!tripPadre) return;
    setLoading(true);
    const success = await onSubmit(String(tripPadre.id), formData as any);
    if (success) onOpenChange(false);
    setLoading(false);
  };

  if (!tripPadre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
        <DialogHeader className="p-6 bg-brand-navy mt-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-emerald-600" />
                <DialogTitle className="text-2xl font-black  text-emerald-600 uppercase tracking-tighter">
                  Despacho de Viaje #{tripPadre.public_id || tripPadre.id}
                </DialogTitle>
              </div>
              <p className="font-bold text-emerald-600 uppercase  tracking-widest flex items-center gap-2">
                <MapPin className="h-3 w-3" /> {tripPadre.origin}{" "}
                <ArrowRight className="h-3 w-3" /> {tripPadre.destination}
                <Badge className="bg-white/10 text-emerald-600 border-white/20 ml-2">
                  {isFullTrip ? "FULL" : "SENCILLO"}
                </Badge>
              </p>
            </div>
            <Badge
              className={cn(
                "px-4 py-1 font-black",
                cpGenerada ? "bg-emerald-500" : "bg-amber-500",
              )}
            >
              {cpGenerada ? "C. PORTE $1 LISTA" : "C. PORTE PENDIENTE"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* COLUMNA IZQUIERDA: FINANZAS PACTADAS (Fase 4) */}
          <div className="md:col-span-2 bg-white p-6 border-r border-slate-200 space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-brand-navy" /> Negocio
                Pactado (Cliente)
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>Flete Base:</span>
                  <span className="font-mono text-slate-900">
                    {formatCurrency(finanzas.base)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>Casetas:</span>
                  <span className="font-mono text-slate-900">
                    {formatCurrency(finanzas.casetas)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center  font-bold text-slate-500">
                  <span>IVA (16%):</span>
                  <span className="font-mono">
                    {formatCurrency(finanzas.iva)}
                  </span>
                </div>
                <div className="flex justify-between items-center  font-bold text-slate-500">
                  <span>Retención (4%):</span>
                  <span className="font-mono text-rose-600">
                    -{formatCurrency(finanzas.retencion)}
                  </span>
                </div>
                <div className="bg-brand-navy/5 p-3 rounded-lg flex justify-between items-center mt-4">
                  <span className=" font-black text-brand-navy uppercase">
                    Total Factura:
                  </span>
                  <span className="text-lg font-black text-brand-navy font-mono">
                    {formatCurrency(finanzas.total)}
                  </span>
                </div>
              </div>
            </div>

            <Card className="bg-slate-900 text-white border-none shadow-lg">
              <CardContent className="p-4 space-y-3">
                <h5 className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">
                  Protocolo Bypass
                </h5>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Genera la Carta Porte de $1 para liberar la unidad
                  inmediatamente. El operador real se asigna abajo.
                </p>
                <Button
                  onClick={onTimbrarNominal}
                  disabled={isStamping || cpGenerada}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 font-black text-[10px] uppercase shadow-lg shadow-emerald-900/20"
                >
                  {isStamping ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-3 w-3 mr-2" />
                  )}
                  {cpGenerada ? "Documento Generado" : "Timbrar Carta Porte $1"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: ASIGNACIÓN OPERATIVA (Fase 2) */}
          <div className="md:col-span-3 p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">
                  Fase Operativa
                </Label>
                <Select
                  value={formData.leg_type}
                  onValueChange={(v: any) =>
                    setFormData((p) => ({ ...p, leg_type: v }))
                  }
                >
                  <SelectTrigger className="h-10 font-bold uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carga_muelle">
                      1. Carga Muelle
                    </SelectItem>
                    <SelectItem value="ruta_carretera">
                      2. Ruta Carretera
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">
                  Operador Real
                </Label>
                <Select
                  value={
                    formData.operator_id ? String(formData.operator_id) : ""
                  }
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, operator_id: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-10 font-bold uppercase">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operadores.map((o: any) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500">
                Tractocamión
              </Label>
              <Select
                value={formData.unit_id ? String(formData.unit_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, unit_id: Number(v) }))
                }
              >
                <SelectTrigger className="h-11 font-black text-brand-navy border-slate-300">
                  <SelectValue placeholder="Seleccionar unidad..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTractos.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      ECO-{u.numero_economico} [{u.placas}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
              <div className="sm:col-span-3 border-b pb-2 flex items-center gap-2">
                <Box className="h-4 w-4 text-brand-navy" />
                <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-widest">
                  Configuración de Arrastre
                </h5>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-slate-500 uppercase">
                  Chasis 1
                </Label>
                <Select
                  value={
                    formData.remolque_1_id ? String(formData.remolque_1_id) : ""
                  }
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, remolque_1_id: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-8 text-[10px] font-bold">
                    <SelectValue placeholder="R1" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRemolques.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        ECO-{u.numero_economico} {u.is_loaded ? "📦" : "➖"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isFullTrip && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-rose-600 uppercase">
                      Dolly
                    </Label>
                    <Select
                      value={formData.dolly_id ? String(formData.dolly_id) : ""}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, dolly_id: Number(v) }))
                      }
                    >
                      <SelectTrigger className="h-8 text-[10px] border-rose-200 bg-rose-50 text-rose-700 font-bold">
                        <SelectValue />
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
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-rose-600 uppercase">
                      Chasis 2
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
                      <SelectTrigger className="h-8 text-[10px] border-rose-200 bg-rose-50 text-rose-700 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRemolques.map((u: any) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            ECO-{u.numero_economico} {u.is_loaded ? "📦" : "➖"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between sm:justify-between items-center">
          <div className="flex items-center gap-2 px-2 text-slate-400">
            <Info className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              Verificar sellos antes de despachar
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold uppercase text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleIniciarTramo}
              disabled={loading || !cpGenerada}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white font-black uppercase text-[10px] tracking-widest px-12 h-11 shadow-xl shadow-brand-navy/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Iniciar Viaje Operativo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
