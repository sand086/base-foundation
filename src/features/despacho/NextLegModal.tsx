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
  Container,
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
      {/* 1. DialogContent: Eliminamos bg-slate-50 y aplicamos glass-panel. 
      Aumentamos a max-w-[1000px] para que los datos respiren.
  */}
      <DialogContent className="sm:max-w-[1000px] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-page-enter">
        {/* HEADER INDUSTRIAL: Ahora con profundidad 3D. 
        Eliminamos mt-5 y usamos bg-brand-navy/95 translúcido.
    */}
        <DialogHeader className="p-8 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden">
          {/* Brillo sutil de fondo exclusivo para el header */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex justify-between items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20 shadow-xl">
                  <Truck className="h-7 w-7 text-brand-primary" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-brand-primary">
                    Despacho de Viaje <span className="opacity-50">#</span>
                    {tripPadre.public_id || tripPadre.id}
                  </DialogTitle>
                  <p className="text-[10px] font-bold text-brand-primary/40 uppercase tracking-[0.3em] mt-1">
                    Logística Operativa Crítica
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-3 font-bold text-brand-primary/70 uppercase text-xs tracking-widest pt-2">
                <span className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                  {tripPadre.origin}
                </span>
                <ArrowRight className="h-4 w-4 text-brand-primary/20" />
                <span className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  {tripPadre.destination}
                </span>

                <Badge className="ml-3 bg-white/10 text-brand-primary border-white/20 tracking-widest">
                  {isFullTrip ? "FULL / 9 EJES" : "SENCILLO / 5 EJES"}
                </Badge>

                {/* REFERENCIA / CONTENEDOR */}
                {(tripPadre as any).referencia && (
                  <Badge className="ml-2 bg-blue-500/20 text-blue-200 border-blue-500/30 tracking-widest shadow-sm flex items-center gap-1.5">
                    <Container className="h-3.5 w-3.5" />
                    CONTENEDOR: {(tripPadre as any).referencia}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <Badge
                className={cn(
                  "px-4 py-1.5 uppercase text-[10px] font-black tracking-widest border-none shadow-lg",
                  cpGenerada
                    ? "bg-status-success text-white"
                    : "bg-status-danger text-white animate-pulse-danger",
                )}
              >
                {cpGenerada ? "CP $1 MXN GENERADA" : "CP $1 MXN PENDIENTE"}
              </Badge>

              <Button
                size="lg"
                onClick={() =>
                  localUuid
                    ? handleDownloadStampedPDF(localUuid)
                    : onTimbrarNominal()
                }
                disabled={isStamping}
                className={cn(
                  "font-black px-8 h-12 text-[11px] uppercase tracking-[0.15em] shadow-2xl transition-all duration-300",
                  localUuid
                    ? "bg-white text-brand-navy hover:bg-white/90"
                    : "btn-action-gradient text-white animate-pulse-glow",
                )}
              >
                {isStamping ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {localUuid ? "DESCARGAR CARTA PORTE" : "TIMBRAR BYPASS ($1)"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* BODY: Grid principal.
        Usamos glass-surface para la izquierda y bg-white/40 para la derecha.
    */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto max-h-[75vh] custom-scrollbar bg-transparent">
          {/* PANEL IZQUIERDO: FINANZAS */}
          <div className="md:col-span-4 glass-surface p-8 border-r border-white/10 space-y-8">
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-brand-navy/60 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Negocio Pactado
              </h4>

              <Card className="glass-card border-none p-0 overflow-hidden shadow-lg">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Flete Base:</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(finanzas.base)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Casetas Pactadas:</span>
                    <span className="font-mono text-blue-600">
                      {formatCurrency(finanzas.casetasPactadas)}
                    </span>
                  </div>

                  <Separator className="bg-slate-200/50" />

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono text-slate-600">
                        {formatCurrency(finanzas.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>IVA (16%):</span>
                      <span className="font-mono">
                        {formatCurrency(finanzas.iva)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Retención (4%):</span>
                      <span className="font-mono text-rose-500">
                        -{formatCurrency(finanzas.retencion)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-brand-navy/5 p-4 rounded-xl border border-brand-navy/10 mt-4">
                    <span className="text-[9px] font-black text-brand-navy/40 uppercase block mb-1">
                      Total Factura
                    </span>
                    <span className="text-2xl font-black text-brand-navy font-mono tracking-tighter">
                      {formatCurrency(finanzas.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" /> Utilidad
                Estimada
              </h4>

              <Card className="glass-card border-rose-100 bg-rose-50/20 p-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-4">
                    <span>Gasto Operativo:</span>
                    <span className="font-mono text-rose-600">
                      -{formatCurrency(gastoOperativoActual)}
                    </span>
                  </div>
                  <Separator className="bg-rose-100/50 mb-4" />
                  <div>
                    <span className="text-[9px] font-black text-emerald-700 uppercase block mb-1">
                      Utilidad Neta Estimada
                    </span>
                    <span className="text-3xl font-black text-emerald-700 font-mono tracking-tighter">
                      {formatCurrency(finanzas.total - gastoOperativoActual)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PROTOCOLO BYPASS */}
            <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
              <CardContent className="p-6 space-y-4 relative z-10">
                <h5 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">
                  Protocolo Bypass
                </h5>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Genera la Carta Porte de $1 para liberar la unidad
                  inmediatamente.
                </p>
                <Button
                  onClick={() =>
                    localUuid
                      ? handleDownloadStampedPDF(localUuid)
                      : onTimbrarNominal()
                  }
                  disabled={isStamping}
                  className={cn(
                    "w-full h-11 font-black text-[10px] uppercase tracking-widest shadow-lg transition-all",
                    localUuid
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40",
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

          {/* PANEL DERECHO: FORMULARIO */}
          <div className="md:col-span-8 p-10 space-y-10 bg-white/40 backdrop-blur-sm relative">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-600 tracking-widest ml-1">
                  Fase Operativa
                </Label>
                <Select
                  value={formData.leg_type}
                  onValueChange={(v: any) =>
                    setFormData((p: any) => ({ ...p, leg_type: v }))
                  }
                >
                  <SelectTrigger className="h-12 glass-card border-slate-200 font-bold text-slate-700 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="carga_muelle" className="font-bold">
                      1. CARGA PATIO / MUELLE
                    </SelectItem>
                    <SelectItem value="ruta_carretera" className="font-bold">
                      2. RUTA CARRETERA
                    </SelectItem>
                    <SelectItem value="entrega_vacio" className="font-bold">
                      3. RETORNO DE VACÍO
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-600 tracking-widest ml-1">
                  Operador
                </Label>
                <Select
                  value={
                    formData.operator_id ? String(formData.operator_id) : ""
                  }
                  onValueChange={(v) =>
                    setFormData((p: any) => ({ ...p, operator_id: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-12 glass-card border-slate-200 font-bold shadow-sm">
                    <SelectValue placeholder="Asignar Operador..." />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    {operadores.map((o: any) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase text-slate-600 tracking-widest ml-1">
                Unidad (Tractocamión)
              </Label>
              <Select
                value={formData.unit_id ? String(formData.unit_id) : ""}
                onValueChange={(v) =>
                  setFormData((p: any) => ({ ...p, unit_id: Number(v) }))
                }
              >
                <SelectTrigger className="h-12 glass-card border-slate-400 text-brand-navy font-black shadow-md">
                  <SelectValue placeholder="Seleccionar unidad de tracción..." />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {availableTractos.map((u: any) => (
                    <SelectItem
                      key={u.id}
                      value={String(u.id)}
                      className="font-bold"
                    >
                      ECO-{u.numero_economico} [{u.placas}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CONFIGURACIÓN DE ARRASTRE */}
            <div className="glass-card p-8 border-white shadow-xl space-y-8 relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h5 className="text-[11px] font-black text-brand-navy uppercase tracking-[0.2em] flex items-center gap-2">
                  <Box className="h-4 w-4 text-brand-red" /> Configuración de
                  Arrastre
                </h5>
                {isFullTrip && (
                  <Badge className="bg-rose-100 text-rose-700 font-black text-[9px] border-none px-3">
                    DOBLE ARTICULADO (FULL)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-2.5">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                    Chasis 1
                  </Label>
                  <Select
                    value={
                      formData.remolque_1_id
                        ? String(formData.remolque_1_id)
                        : ""
                    }
                    onValueChange={(v) =>
                      setFormData((p: any) => ({
                        ...p,
                        remolque_1_id: Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 font-bold border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="R1" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      {availableRemolques.map((u: any) => (
                        <SelectItem
                          key={u.id}
                          value={String(u.id)}
                          className="font-bold"
                        >
                          ECO-{u.numero_economico} {u.is_loaded ? "📦" : "➖"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isFullTrip && (
                  <>
                    <div className="space-y-2.5">
                      <Label className="text-[9px] font-bold text-rose-600 uppercase ml-1">
                        Dolly
                      </Label>
                      <Select
                        value={
                          formData.dolly_id ? String(formData.dolly_id) : ""
                        }
                        onValueChange={(v) =>
                          setFormData((p: any) => ({
                            ...p,
                            dolly_id: Number(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-10 font-bold border-rose-200 bg-rose-50 text-rose-700">
                          <SelectValue placeholder="Dolly" />
                        </SelectTrigger>
                        <SelectContent className="glass-panel">
                          {availableDollies.map((u: any) => (
                            <SelectItem
                              key={u.id}
                              value={String(u.id)}
                              className="font-bold"
                            >
                              ECO-{u.numero_economico}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[9px] font-bold text-rose-600 uppercase ml-1">
                        Chasis 2
                      </Label>
                      <Select
                        value={
                          formData.remolque_2_id
                            ? String(formData.remolque_2_id)
                            : ""
                        }
                        onValueChange={(v) =>
                          setFormData((p: any) => ({
                            ...p,
                            remolque_2_id: Number(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-10 font-bold border-rose-200 bg-rose-50 text-rose-700">
                          <SelectValue placeholder="R2" />
                        </SelectTrigger>
                        <SelectContent className="glass-panel">
                          {availableRemolques.map((u: any) => (
                            <SelectItem
                              key={u.id}
                              value={String(u.id)}
                              className="font-bold"
                            >
                              ECO-{u.numero_economico}{" "}
                              {u.is_loaded ? "📦" : "➖"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ANTICIPOS OPERATIVOS */}
            {isRoadLeg && (
              <div className="bg-amber-500/5 p-8 rounded-3xl border border-amber-500/10 space-y-6 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-amber-400 h-full" />
                <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-[0.2em] flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Registro de
                  Anticipos y Vales
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase ml-1">
                      Casetas
                    </Label>
                    <div className="relative">
                      <DollarSign className="text-slate-600  absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 " />
                      <Input
                        type="number"
                        className="pl-9 h-11 glass-card border-amber-200/50 font-mono text-sm bg-white"
                        value={formData.anticipo_casetas || ""}
                        onChange={(e) =>
                          setFormData((p: any) => ({
                            ...p,
                            anticipo_casetas: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase ml-1">
                      Diesel
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                      <Input
                        type="number"
                        className="pl-9 h-11 glass-card border-amber-200/50 font-mono text-sm bg-white"
                        value={formData.anticipo_combustible || ""}
                        onChange={(e) =>
                          setFormData((p: any) => ({
                            ...p,
                            anticipo_combustible: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[9px] font-bold text-slate-600 uppercase ml-1">
                      Viáticos
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                      <Input
                        type="number"
                        className="pl-9 h-11 glass-card border-amber-200/50 font-mono text-sm bg-white"
                        value={formData.anticipo_viaticos || ""}
                        onChange={(e) =>
                          setFormData((p: any) => ({
                            ...p,
                            anticipo_viaticos: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[9px] font-bold text-brand-navy uppercase flex items-center gap-1 ml-1">
                      <Ticket className="h-3 w-3" /> Vale / Otros
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
                      <Input
                        type="number"
                        className="pl-9 h-11 glass-card border-blue-200 bg-blue-50/50 font-mono text-sm"
                        value={formData.otros_anticipos || ""}
                        onChange={(e) =>
                          setFormData((p: any) => ({
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

        {/* FOOTER: Estilo barra inferior de Safari. 
        Transparente con blur.
    */}
        <DialogFooter className="p-6 bg-white/80 backdrop-blur-xl border-t border-white/20 flex justify-between items-center px-10">
          <div className="flex items-center gap-3 px-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse-slow shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              Validación Física Requerida
            </span>
          </div>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold uppercase text-[11px] tracking-widest text-slate-500 hover:text-slate-700 hover:bg-transparent"
            >
              Cancelar
            </Button>

            <Button
              onClick={handleIniciarTramo}
              disabled={loading || !cpGenerada}
              className="btn-primary-gradient px-12 h-12 font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Iniciar Despacho Real
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
