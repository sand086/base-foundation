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
  TrendingDown,
  Ticket,
} from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useOperators } from "@/hooks/useOperators";
import { useBilling } from "@/hooks/useBilling";
import { Trip, TripLegCreatePayload } from "@/types/api.types";
import { cn } from "@/lib/utils";
// 🚀 IMPORTAMOS AXIOS CLIENT PARA LA DESCARGA
import axiosClient from "@/api/axiosClient";

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
  otros_anticipos: number;
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

  // 🚀 ESTADO LOCAL PARA EL UUID (Nos permite saber si ya se generó para descargar)
  const [localUuid, setLocalUuid] = useState<string | null>(null);

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
    otros_anticipos: 0,
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val || 0);

  const isFullTrip = useMemo(() => {
    if (!tripPadre) return false;
    const configTarifa = (tripPadre as any).tipo_unidad?.toLowerCase() || "";
    const configStr = (tripPadre.route_name || "").toLowerCase();
    return (
      configStr.includes("full") ||
      configTarifa.includes("full") ||
      configTarifa.includes("9ejes") ||
      Boolean(tripPadre.dolly_id)
    );
  }, [tripPadre]);

  const finanzas = useMemo(() => {
    if (!tripPadre)
      return {
        base: 0,
        casetasPactadas: 0,
        subtotal: 0,
        iva: 0,
        retencion: 0,
        total: 0,
      };
    const base = tripPadre.tarifa_base || 0;
    const casetas = tripPadre.costo_casetas || 0;
    const subtotal = base + casetas;
    const iva = subtotal * 0.16;
    const retencion = subtotal * 0.04;
    return {
      base,
      casetasPactadas: casetas,
      subtotal,
      iva,
      retencion,
      total: subtotal + iva - retencion,
    };
  }, [tripPadre]);

  const gastoOperativoActual = useMemo(() => {
    return (
      Number(formData.anticipo_casetas || 0) +
      Number(formData.anticipo_combustible || 0) +
      Number(formData.anticipo_viaticos || 0) +
      Number(formData.otros_anticipos || 0)
    );
  }, [formData]);

  useEffect(() => {
    if (open && tripPadre) {
      setFormData({
        leg_type: "ruta_carretera",
        unit_id: null,
        operator_id: null,
        remolque_1_id: tripPadre.remolque_1_id || null,
        dolly_id: tripPadre.dolly_id || null,
        remolque_2_id: tripPadre.remolque_2_id || null,
        anticipo_casetas: tripPadre.costo_casetas || 0,
        anticipo_viaticos: 0,
        anticipo_combustible: 0,
        otros_anticipos: 0,
      });
      setCpGenerada(Boolean(tripPadre.uuid_fiscal));
      setLocalUuid(tripPadre.uuid_fiscal || null);
    }
  }, [open, tripPadre]);

  const isRoadLeg = formData.leg_type === "ruta_carretera";

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

  const availableOperators = useMemo(() => {
    return (operadores || []).filter(
      (o: any) => o.status === "activo" || o.status === "disponible",
    );
  }, [operadores]);

  // 🚀 FUNCIÓN DE DESCARGA PDF AÑADIDA
  const handleDownloadStampedPDF = async (uuidToDownload: string) => {
    try {
      const response = await axiosClient.get(
        `/billing/invoice/${uuidToDownload}/pdf`,
        { responseType: "blob" },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute(
        "download",
        `Carta_Porte_Provisional_${uuidToDownload}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Archivo descargado.");
    } catch {
      toast.error("Error al descargar el PDF.");
    }
  };

  const onTimbrarNominal = async () => {
    if (!tripPadre) return;
    try {
      await handleStampNominal(tripPadre.id, (responseData) => {
        const generatedUuid = responseData?.data?.uuid;
        if (generatedUuid) {
          setLocalUuid(generatedUuid);
          setCpGenerada(true);
          handleDownloadStampedPDF(generatedUuid); // 🚀 Descarga automática al timbrar
          toast.success("Carta Porte Bypass de $1 generada exitosamente.");
        }
      });
    } catch {
      toast.error("Error al timbrar Carta Porte de $1.");
    }
  };

  const handleSubmit = async () => {
    if (!tripPadre) return;
    if (!formData.unit_id || !formData.operator_id || !formData.remolque_1_id) {
      return toast.error(
        "Asignación incompleta: Tracto, Operador y Chasis son obligatorios.",
      );
    }
    if (isFullTrip && (!formData.dolly_id || !formData.remolque_2_id)) {
      return toast.error(
        "Configuración FULL: Debe asignar Dolly y Remolque 2.",
      );
    }

    setLoading(true);
    const success = await onSubmit(String(tripPadre.id), formData as any);
    if (success) {
      if (formData.leg_type === "carga_muelle") {
        await updateLoadStatus(Number(formData.remolque_1_id), true);
        if (formData.remolque_2_id)
          await updateLoadStatus(Number(formData.remolque_2_id), true);
      }
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleIniciarTramo = async () => {
    if (!tripPadre) return;

    // Validaciones obligatorias
    if (!formData.unit_id || !formData.operator_id || !formData.remolque_1_id) {
      return toast.error(
        "Asignación incompleta: Tracto, Operador y Chasis son obligatorios.",
      );
    }
    if (isFullTrip && (!formData.dolly_id || !formData.remolque_2_id)) {
      return toast.error(
        "Configuración FULL: Debe asignar Dolly y Remolque 2.",
      );
    }

    setLoading(true);
    const success = await onSubmit(String(tripPadre.id), formData as any);

    if (success) {
      // Si la fase es Carga Muelle, marcamos los remolques como cargados
      if (formData.leg_type === "carga_muelle") {
        await updateLoadStatus(Number(formData.remolque_1_id), true);
        if (formData.remolque_2_id) {
          await updateLoadStatus(Number(formData.remolque_2_id), true);
        }
      }
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!tripPadre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] bg-slate-50 p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
        {/* HEADER INDUSTRIAL CON ORIGEN, DESTINO Y CONFIGURACIÓN */}
        <DialogHeader className="p-6 bg-brand-navy shrink-0 mt-5">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-gray-300 p-2 rounded-lg">
                  <Truck className="h-6 w-6 text-brand-navy" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  Despacho de Viaje #{tripPadre.public_id || tripPadre.id}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-600 uppercase text-sm tracking-widest mt-11">
                <MapPin className="h-4 w-4 text-emerald-400" />{" "}
                {tripPadre.origin}
                <ArrowRight className="h-4 w-4 text-emerald-400" />
                {tripPadre.destination}
                <Badge className="ml-3 bg-white/10 text-primary border-white/20 tracking-widest">
                  {isFullTrip ? "FULL / 9 EJES" : "SENCILLO / 5 EJES"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant={cpGenerada ? "success" : "destructive"}
                className="px-4 py-1.5  uppercase text-[11px] tracking-widest"
              >
                {cpGenerada ? "CP $1 MXN GENERADA" : "CP $1 MXN PENDIENTE"}
              </Badge>
              {/* 🚀 BOTÓN MODIFICADO PARA TIMBRAR Y LUEGO DESCARGAR */}
              <Button
                size="sm"
                onClick={() =>
                  localUuid
                    ? handleDownloadStampedPDF(localUuid)
                    : onTimbrarNominal()
                }
                disabled={isStamping}
                className={cn(
                  "font-black h-8 text-[11px] uppercase shadow-lg shadow-emerald-900/20",
                  localUuid
                    ? "bg-blue-600 hover:bg-blue-500 "
                    : "bg-emerald-600 hover:bg-emerald-500 ",
                )}
              >
                {isStamping ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                ) : (
                  <FileText className="h-3 w-3 mr-2" />
                )}
                {localUuid ? "DESCARGAR CARTA PORTE" : "TIMBRAR BYPASS ($1)"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* PANEL IZQUIERDO: FINANZAS (PACTADO VS GASTADO) */}
          <div className="md:col-span-4 bg-white p-6 border-r border-slate-200 space-y-6">
            <div className="space-y-3">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-brand-navy" /> Negocio
                Pactado (Cliente)
              </h4>
              <Card className="border-none bg-slate-50 shadow-none">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-[12px] font-bold text-slate-600">
                    <span>Flete Base:</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(finanzas.base)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-bold text-slate-600">
                    <span>Casetas Pactadas:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(finanzas.casetasPactadas)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-600">
                      {formatCurrency(finanzas.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                    <span>IVA (16%):</span>
                    <span className="font-mono">
                      {formatCurrency(finanzas.iva)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                    <span>Retención (4%):</span>
                    <span className="font-mono text-rose-500">
                      -{formatCurrency(finanzas.retencion)}
                    </span>
                  </div>
                  <div className="bg-brand-navy/5 p-3 rounded-lg flex justify-between items-center mt-2 border border-brand-navy/10">
                    <span className="text-[11px] font-black text-brand-navy uppercase tracking-tighter">
                      Total Factura:
                    </span>
                    <span className="text-base font-black text-brand-navy font-mono">
                      {formatCurrency(finanzas.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-rose-600" /> Utilidad
                Estimada (Tramo)
              </h4>
              <Card className="border border-rose-100 bg-rose-50/30 shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-[12px] font-bold text-slate-500">
                    <span>Gasto Operativo:</span>
                    <span className="font-mono text-rose-600">
                      -{formatCurrency(gastoOperativoActual)}
                    </span>
                  </div>
                  <Separator className="bg-rose-100" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-tight">
                      Utilidad Neta:
                    </span>
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      {formatCurrency(finanzas.total - gastoOperativoActual)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 🚀 BOTÓN PRINCIPAL ACTUALIZADO (Con lógica de descarga) */}
            <Card className="bg-slate-900 text-primary border-none shadow-lg">
              <CardContent className="p-4 space-y-3">
                <h5 className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">
                  Protocolo Bypass
                </h5>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Genera la Carta Porte de $1 para liberar la unidad
                  inmediatamente. El operador real se asigna abajo.
                </p>
                <Button
                  onClick={() =>
                    localUuid
                      ? handleDownloadStampedPDF(localUuid)
                      : onTimbrarNominal()
                  }
                  disabled={isStamping}
                  className={cn(
                    "w-full h-10 font-black text-[11px] uppercase shadow-lg transition-colors",
                    localUuid
                      ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20",
                  )}
                >
                  {isStamping ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-3 w-3 mr-2" />
                  )}
                  {localUuid
                    ? "Descargar Carta Porte $1"
                    : "Timbrar Carta Porte $1"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* PANEL DERECHO: ASIGNACIÓN OPERATIVA (FASE 2) */}
          <div className="md:col-span-8 p-6 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Fase Operativa
                </Label>
                <Select
                  value={formData.leg_type}
                  onValueChange={(v: any) =>
                    setFormData((p) => ({ ...p, leg_type: v }))
                  }
                >
                  <SelectTrigger className="h-11 font-bold border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carga_muelle">
                      1. CARGA PATIO / MUELLE
                    </SelectItem>
                    <SelectItem value="ruta_carretera">
                      2. RUTA CARRETERA
                    </SelectItem>
                    <SelectItem value="entrega_vacio">
                      3. RETORNO DE VACÍO
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Operador
                </Label>
                <Select
                  value={
                    formData.operator_id ? String(formData.operator_id) : ""
                  }
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, operator_id: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-11 font-bold border-slate-300">
                    <SelectValue placeholder="Asignar Operador..." />
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
              <Label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Unidad (Tractocamión)
              </Label>
              <Select
                value={formData.unit_id ? String(formData.unit_id) : ""}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, unit_id: Number(v) }))
                }
              >
                <SelectTrigger className="h-11 font-black text-brand-navy border-slate-400 shadow-sm">
                  <SelectValue placeholder="Seleccionar unidad de tracción..." />
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

            <div className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm">
              <div className="col-span-3 border-b pb-2 flex items-center justify-between">
                <h5 className="text-[11px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-2">
                  <Box className="h-4 w-4" /> Configuración de Arrastre
                </h5>
                {isFullTrip && (
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none font-black text-[9px]">
                    DOBLE ARTICULADO
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5">
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
                  <SelectTrigger className="h-9 text-[12px] font-bold">
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
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-rose-600 uppercase">
                      Dolly
                    </Label>
                    <Select
                      value={formData.dolly_id ? String(formData.dolly_id) : ""}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, dolly_id: Number(v) }))
                      }
                    >
                      <SelectTrigger className="h-9 text-[12px] border-rose-200 bg-rose-50 text-rose-700 font-bold">
                        <SelectValue placeholder="Dolly" />
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
                  <div className="space-y-1.5">
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
                      <SelectTrigger className="h-9 text-[12px] border-rose-200 bg-rose-50 text-rose-700 font-bold">
                        <SelectValue placeholder="R2" />
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

            {/* ANTICIPOS OPERATIVOS */}
            {isRoadLeg && (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 space-y-4 shadow-inner">
                <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Registro de Anticipos y
                  Vales (Opcional)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase">
                      Casetas
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                      <Input
                        type="number"
                        className="pl-7 h-9 font-mono bg-white text-[12px] border-amber-100"
                        value={formData.anticipo_casetas || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            anticipo_casetas: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase">
                      Diesel
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                      <Input
                        type="number"
                        className="pl-7 h-9 font-mono bg-white text-[12px] border-amber-100"
                        value={formData.anticipo_combustible || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            anticipo_combustible: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase">
                      Viáticos
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                      <Input
                        type="number"
                        className="pl-7 h-9 font-mono bg-white text-[12px] border-amber-100"
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
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-brand-navy uppercase flex items-center gap-1">
                      <Ticket className="h-3 w-3" /> Vale / Otros
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-3 w-3 text-blue-400" />
                      <Input
                        type="number"
                        className="pl-7 h-9 font-mono bg-blue-50 border-blue-200 text-sm"
                        value={formData.otros_anticipos || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            otros_anticipos: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between sm:justify-between items-center rounded-b-2xl">
          <div className="flex items-center gap-2 px-2 text-slate-400">
            <Info className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-tight">
              Validación Física Requerida
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold uppercase text-[11px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleIniciarTramo}
              disabled={loading || !cpGenerada}
              className="bg-brand-navy hover:bg-brand-navy/90 text-primary font-black uppercase text-[11px] tracking-widest px-10 h-10 shadow-lg shadow-brand-navy/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Iniciar Despacho Real
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
