import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Truck,
  User,
  MapPin,
  Navigation,
  Wallet,
  Clock,
  CheckCircle2,
  History,
  Loader2,
  Activity,
  Box,
  ChevronsUpDown,
  PlusCircle,
  Route as RouteIcon,
  Edit2,
  Save,
  FileText,
  Undo,
  Link2Off,
  Container,
} from "lucide-react";
import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import { useUnits } from "@/hooks/useUnits";
import { useBilling } from "@/hooks/useBilling";
import axiosClient from "@/api/axiosClient";
import { cn } from "@/lib/utils";

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  onRelayClick?: (leg: TripLeg, trip: Trip) => void;
  onSettleClick?: (leg: TripLeg, trip: Trip) => void;
  onIncidentClick?: (trip: Trip) => void;
  onUpdateStatusClick?: (trip: Trip, leg?: TripLeg) => void;
}

interface Terminal {
  id: number;
  nombre: string;
  record_status: string;
}

export function TripDetailsModal({
  open,
  onOpenChange,
  trip,
  onRelayClick,
  onSettleClick,
  onUpdateStatusClick,
}: TripDetailsModalProps) {
  const { editTrip, refreshTrips, addTimelineEvent } = useTrips();
  const { updateLoadStatus } = useUnits();
  const { isStamping, handleStampNominal, handleStampFinal } = useBilling();

  const [activeTab, setActiveTab] = useState("fases");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tarifaBase, setTarifaBase] = useState(0);
  const [costoCasetas, setCostoCasetas] = useState(0);

  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState("");
  const [searchTerminalQuery, setSearchTerminalQuery] = useState("");
  const [terminalComboboxOpen, setTerminalComboboxOpen] = useState(false);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const [finishingLeg, setFinishingLeg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const [localUuid, setLocalUuid] = useState<string | null>(null);
  const [finalUuid, setFinalUuid] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val || 0);

  const isFullTrip = useMemo(() => {
    if (!trip) return false;
    const configTarifa = (trip as any).tipo_unidad?.toLowerCase() || "";
    const configStr = (trip.route_name || "").toLowerCase();
    return (
      configStr.includes("full") ||
      configTarifa.includes("full") ||
      configTarifa.includes("9ejes") ||
      Boolean(trip.dolly_id)
    );
  }, [trip]);

  useEffect(() => {
    if (open) loadTerminals();
  }, [open]);

  useEffect(() => {
    if (trip) {
      if (!isEditing) {
        setTarifaBase(trip.tarifa_base || 0);
        setCostoCasetas(trip.costo_casetas || 0);
      }
      if (trip.uuid_fiscal || !localUuid) {
        setLocalUuid(trip.uuid_fiscal || null);
      }
    }
  }, [trip?.id, trip?.uuid_fiscal, isEditing]);

  const loadTerminals = async () => {
    try {
      const response = await axiosClient.get("/terminals");
      setTerminals(response.data);
    } catch (error) {
      console.error("Error cargando terminales", error);
    }
  };

  const handleCreateTerminal = async (nombre: string) => {
    if (!nombre.trim()) return;
    setIsCreatingTerminal(true);
    try {
      const response = await axiosClient.post("/terminals", { nombre });
      setTerminals((prev) =>
        [...prev, response.data].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        ),
      );
      setSelectedTerminal(response.data.nombre);
      setTerminalComboboxOpen(false);
      toast.success("Terminal añadida");
    } catch {
      toast.error("Error al crear la terminal");
    } finally {
      setIsCreatingTerminal(false);
    }
  };

  const activeLeg = useMemo(() => {
    if (!trip) return undefined;
    const legs = trip.legs || [];
    return (
      legs.find(
        (l) => !["entregado", "cerrado"].includes(l.status.toLowerCase()),
      ) ||
      legs[legs.length - 1] ||
      undefined
    );
  }, [trip]);

  const allEvents = useMemo(() => {
    if (!trip) return [];
    return (
      trip.legs
        ?.flatMap((leg) =>
          (leg.timeline_events || []).map((ev) => ({
            ...ev,
            legName: leg.leg_type.replace("_", " ").toUpperCase(),
            operatorName: leg.operator?.name?.split(" ")[0] || "S/A",
            unitEco: leg.unit?.numero_economico || "S/A",
            unitPlacas: leg.unit?.placas || "S/P",
          })),
        )
        .sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        ) || []
    );
  }, [trip]);

  const finanzasComercial = useMemo(() => {
    const base = isEditing ? tarifaBase : trip?.tarifa_base || 0;
    const casetas = isEditing ? costoCasetas : trip?.costo_casetas || 0;
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
  }, [trip, isEditing, tarifaBase, costoCasetas]);

  const handleSaveFinanzas = async () => {
    setSaving(true);
    const success = await editTrip(String(trip?.id), {
      tarifa_base: Number(tarifaBase),
      costo_casetas: Number(costoCasetas),
    });
    if (success) {
      await refreshTrips();
      setIsEditing(false);
      toast.success("Montos de facturación actualizados.");
    }
    setSaving(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshTrips();
    setIsSyncing(false);
    toast.success("Datos sincronizados.");
  };

  const handleUndoLeg = async () => {
    const isFirstLeg = trip?.legs?.length === 1;
    const msg = isFirstLeg
      ? "¿Deshacer esta fase? Al ser la primera, el viaje completo regresará al Planeador (Stand-by)."
      : "¿Estás seguro de deshacer la última fase? El camión y operador de la fase previa volverán a estar activos en la ruta.";

    const ok = window.confirm(msg);
    if (!ok) return;

    setIsUndoing(true);
    try {
      const response = await axiosClient.post(`/trips/${trip?.id}/undo-leg`);

      if (isFirstLeg) {
        toast.success("Viaje retornado a Planeador exitosamente.");
        onOpenChange(false);
        refreshTrips();
      } else {
        toast.success("Fase revertida exitosamente.");
        if (response.data) {
          await refreshTrips();
        }
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.detail ||
        "Error al deshacer. Es probable que la fase ya esté liquidada.";
      toast.error(errorMsg);
    } finally {
      setIsUndoing(false);
    }
  };

  const submitTerminalArrival = async () => {
    if (!activeLeg || !selectedTerminal) return;
    setFinishingLeg(true);
    try {
      await addTimelineEvent(
        String(trip?.id),
        activeLeg.id,
        {
          status: "entregado",
          location: selectedTerminal,
          comments: `📍 LLEGADA REGISTRADA: El equipo fue entregado en: ${selectedTerminal}.`,
        },
        true,
      );
      if (trip?.remolque_1_id)
        await updateLoadStatus(trip.remolque_1_id, false);
      if (trip?.remolque_2_id)
        await updateLoadStatus(trip.remolque_2_id, false);
      setShowTerminalModal(false);
      await refreshTrips();
      toast.success("Llegada registrada, viaje finalizado.");
    } catch {
      toast.error("Error al registrar llegada.");
    } finally {
      setFinishingLeg(false);
    }
  };

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
      link.setAttribute("download", `Carta_Porte_${uuidToDownload}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Archivo descargado.");
    } catch {
      toast.error("Error al descargar el PDF.");
    }
  };

  if (!trip) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl bg-white h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
          <DialogHeader className="p-6 pb-4 bg-slate-100 border-b border-slate-300 shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-navy flex items-center justify-center shadow-lg">
                  <Navigation className="h-6 w-6 text-black" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-brand-navy uppercase tracking-tighter">
                    #{trip.public_id || trip.id} | {trip.route_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-slate-500 uppercase">
                    Cliente:{" "}
                    <span className="text-slate-900">
                      {trip.client?.razon_social}
                    </span>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex gap-2 mt-10">
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 text-xs font-black shadow-md transition-all uppercase tracking-tight",
                    localUuid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
                  )}
                  onClick={() => {
                    if (localUuid) {
                      handleDownloadStampedPDF(localUuid);
                    } else {
                      handleStampNominal(trip.id, (responseData) => {
                        const generatedUuid = responseData?.data?.uuid;
                        if (generatedUuid) {
                          setLocalUuid(generatedUuid);
                          handleDownloadStampedPDF(generatedUuid);
                          toast.success("¡CARTA PORTE BYPASS GENERADA!");
                        }
                        refreshTrips();
                      });
                    }
                  }}
                  disabled={isStamping}
                >
                  {isStamping ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : localUuid ? (
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  ) : (
                    <Activity className="h-4 w-4 mr-1.5" />
                  )}
                  {localUuid
                    ? "DESCARGAR CARTA PORTE"
                    : "TIMBRAR CARTA PORTE ($1)"}
                </Button>
              </div>
            </div>

            {/* 🚀 AQUÍ AÑADIMOS EL CONTENEDOR EN LA VISTA SUPERIOR */}
            <div className="flex items-center flex-wrap gap-2 font-bold text-slate-600 uppercase text-sm tracking-widest mt-4 pt-4 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-emerald-400" />
                {trip.origin}
              </span>
              <span className="text-slate-300">→</span>
              <span>{trip.destination}</span>
              <Badge className="ml-2 bg-white text-primary border border-slate-300 shadow-sm tracking-widest px-2 py-0.5">
                {isFullTrip ? "FULL / 9 EJES" : "SENCILLO / 5 EJES"}
              </Badge>
              {(trip as any).referencia && (
                <Badge className="ml-2 bg-blue-50 text-blue-700 border border-blue-200 shadow-sm tracking-widest px-2 py-0.5 flex items-center gap-1">
                  <Container className="h-3 w-3" /> CONTENEDOR:{" "}
                  {(trip as any).referencia}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
            <div className="w-full lg:w-[30%] bg-slate-50 border-r border-slate-200 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <RouteIcon className="h-3 w-3" /> Ruta de Servicio
                </h3>
                <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4 text-xs">
                  <div className="relative pl-6">
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100" />
                    <div className="mb-4">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white" />
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                        Origen
                      </p>
                      <p className="font-black text-slate-800 uppercase">
                        {trip.origin}
                      </p>
                    </div>
                    <div>
                      <div className="absolute -left-[27px] top-1 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-white" />
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                        Destino Final
                      </p>
                      <p className="font-black text-slate-800 uppercase">
                        {trip.destination}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <Box className="h-3 w-3" /> Equipos Asignados
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 bg-white rounded-lg border flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-tighter">
                      Tractor:
                    </span>
                    <span className="font-black text-brand-navy">
                      ECO-{activeLeg?.unit?.numero_economico || "S/A"}
                    </span>
                  </div>
                  {trip.remolque_1 && (
                    <div className="p-3 bg-white rounded-lg border flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">
                        Remolque 1:
                      </span>
                      <span className="font-black text-brand-navy uppercase">
                        ECO-{trip.remolque_1.numero_economico}
                      </span>
                    </div>
                  )}
                  {trip.remolque_2 && (
                    <div className="p-3 bg-white rounded-lg border flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">
                        Remolque 2:
                      </span>
                      <span className="font-black text-brand-navy uppercase">
                        ECO-{trip.remolque_2.numero_economico}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[70%] flex flex-col bg-white">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <div className="px-6 pt-4 border-b">
                  <TabsList className="grid grid-cols-3 bg-slate-100 h-11 p-1 rounded-xl">
                    <TabsTrigger value="fases" className="text-xs font-bold">
                      Fases Operativas
                    </TabsTrigger>
                    <TabsTrigger value="finanzas" className="text-xs font-bold">
                      Datos de Facturación
                    </TabsTrigger>
                    <TabsTrigger value="bitacora" className="text-xs font-bold">
                      Diario Bitácora
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <TabsContent value="fases" className="m-0 space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          Secuencia Operativa
                        </p>
                        {trip.legs && trip.legs.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUndoLeg}
                            disabled={isUndoing}
                            className="h-8 text-[10px] font-black text-rose-600 border-rose-200 hover:bg-rose-50 uppercase tracking-widest shadow-sm"
                          >
                            {isUndoing ? (
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                              <Undo className="h-3 w-3 mr-2" />
                            )}
                            Deshacer Último Movimiento
                          </Button>
                        )}
                      </div>

                      {trip.legs?.map((leg, idx) => (
                        <Card
                          key={leg.id}
                          className={cn(
                            "border-l-4 shadow-sm overflow-hidden",
                            leg.id === activeLeg?.id
                              ? "border-l-emerald-500"
                              : "border-l-slate-300 opacity-80",
                          )}
                        >
                          <CardContent className="p-4 flex justify-between items-center bg-white">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                Fase {idx + 1}{" "}
                                {leg.id === activeLeg?.id && "(ACTUAL)"}
                              </p>
                              <h4 className="font-black text-brand-navy uppercase text-sm leading-tight">
                                {leg.leg_type.replace("_", " ")}
                              </h4>
                              <div className="flex items-center gap-3 text-xs font-medium text-slate-600 pt-1">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-600" />{" "}
                                  {leg.operator?.name || "S/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3 text-slate-600" />{" "}
                                  ECO-{leg.unit?.numero_economico || "N/A"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  "uppercase font-bold text-[10px] border-0 px-3 py-1 shadow-sm",
                                  leg.status === "entregado"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : leg.status === "cerrado"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700",
                                )}
                              >
                                {leg.status.replace("_", " ")}
                              </Badge>

                              {["creado", "en_transito"].includes(leg.status) &&
                                onRelayClick && (
                                  <Button
                                    size="sm"
                                    className="h-8 bg-brand-navy font-bold text-[10px] uppercase shadow-lg shadow-brand-navy/20"
                                    onClick={() => onRelayClick(leg, trip)}
                                  >
                                    <Link2Off className="h-3 w-3 mr-1.5" />
                                    Desenganchar (Relevo)
                                  </Button>
                                )}
                              {leg.status === "entregado" && onSettleClick && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 font-bold text-[11px]"
                                  onClick={() => onSettleClick(leg, trip)}
                                >
                                  LIQUIDAR OP.
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {trip.status === "en_transito" &&
                        activeLeg?.leg_type === "ruta_carretera" && (
                          <Button
                            variant="outline"
                            className="w-full border-dashed border-2 h-12 text-slate-500 font-bold hover:bg-slate-50 mt-4"
                            onClick={() => setShowTerminalModal(true)}
                          >
                            <MapPin className="h-4 w-4 mr-2" /> REGISTRAR
                            LLEGADA A TERMINAL (CIERRE OPERATIVO)
                          </Button>
                        )}
                    </TabsContent>

                    <TabsContent value="finanzas" className="m-0 space-y-6">
                      <Card
                        className={cn(
                          "shadow-sm border-2",
                          isEditing
                            ? "border-amber-200 bg-amber-50/5"
                            : "border-emerald-100 bg-emerald-50/5",
                        )}
                      >
                        <CardHeader className="p-5 border-b flex justify-between items-center bg-white rounded-t-xl shadow-sm">
                          <CardTitle className="text-sm font-black uppercase text-emerald-800 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />{" "}
                            Pre-Factura Comercial (Cobro al Cliente)
                          </CardTitle>
                          {!isEditing ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                className="h-8 font-bold"
                              >
                                <History className="h-3 w-3 mr-1" /> Sincronizar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="h-8 font-bold"
                              >
                                <Edit2 className="h-3 w-3 mr-1" /> Editar Montos
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(false)}
                                className="h-8 font-bold text-slate-500"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveFinanzas}
                                disabled={saving}
                                className="h-8 bg-brand-navy font-bold text-white shadow-md"
                              >
                                <Save className="h-3 w-3 mr-1" /> Guardar
                              </Button>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-inner">
                              <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-amber-800">
                                  Flete Base / Adicionales
                                </Label>
                                <Input
                                  type="number"
                                  value={tarifaBase}
                                  onChange={(e) =>
                                    setTarifaBase(Number(e.target.value))
                                  }
                                  className="font-mono text-lg h-12 bg-white"
                                />
                                <p className="text-[10px] text-amber-700 font-medium leading-tight">
                                  Ingreso principal. Suma demoras, custodias o
                                  maniobras adicionales pactadas a facturar.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-amber-800">
                                  Recuperación Casetas
                                </Label>
                                <Input
                                  type="number"
                                  value={costoCasetas}
                                  onChange={(e) =>
                                    setCostoCasetas(Number(e.target.value))
                                  }
                                  className="font-mono text-lg h-12 bg-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 max-w-xl mx-auto">
                              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
                                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                  <span>
                                    Flete Base Acordado (y Adicionales):
                                  </span>
                                  <span className="font-mono text-slate-900">
                                    {formatCurrency(finanzasComercial.base)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                  <span>Recuperación de Casetas:</span>
                                  <span className="font-mono text-slate-900">
                                    {formatCurrency(finanzasComercial.casetas)}
                                  </span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                  <span>Subtotal:</span>
                                  <span className="font-mono text-slate-700">
                                    {formatCurrency(finanzasComercial.subtotal)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                  <span>IVA (16%):</span>
                                  <span className="font-mono text-slate-700">
                                    {formatCurrency(finanzasComercial.iva)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                  <span>Retención (4%):</span>
                                  <span className="font-mono text-rose-600">
                                    -
                                    {formatCurrency(
                                      finanzasComercial.retencion,
                                    )}
                                  </span>
                                </div>
                                <div className="bg-emerald-500 text-white p-4 rounded-xl flex justify-between items-center shadow-lg mt-4">
                                  <span className="font-black text-sm uppercase tracking-widest">
                                    Total a Facturar:
                                  </span>
                                  <span className="text-2xl font-black font-mono tracking-tighter">
                                    {formatCurrency(finanzasComercial.total)}
                                  </span>
                                </div>
                              </div>

                              <div className="bg-slate-900 p-6 rounded-2xl border-t-4 border-emerald-500 flex flex-col sm:flex-row items-center justify-between gap-6 mt-10 shadow-2xl">
                                <div className="text-left">
                                  <h4 className="text-emerald-400 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />{" "}
                                    Emisión Factura 4.0
                                  </h4>
                                  <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed mt-1 italic">
                                    Genera la factura real del servicio
                                    aplicando Sustitución (04) de la Carta Porte
                                    Bypass.
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "font-black px-8 h-12 shadow-xl disabled:opacity-30 uppercase tracking-widest text-[10px] text-white transition-colors",
                                    finalUuid
                                      ? "bg-blue-600 hover:bg-blue-700 hover:text-white"
                                      : "bg-emerald-500 hover:bg-emerald-600",
                                  )}
                                  disabled={
                                    isStamping ||
                                    (!localUuid &&
                                      !finalUuid &&
                                      !trip.uuid_fiscal) // 👈 FIX 1: Evita que el botón se bloquee por error
                                  }
                                  onClick={() => {
                                    if (finalUuid) {
                                      handleDownloadStampedPDF(finalUuid);
                                    } else {
                                      // 🚀 FIX 2: Busca el UUID en localUuid, o si no, directo del trip
                                      const uuidToRelate =
                                        localUuid || trip.uuid_fiscal;

                                      if (!uuidToRelate) {
                                        toast.error(
                                          "Error: No se encontró el UUID de la Carta Porte original.",
                                        );
                                        return;
                                      }

                                      handleStampFinal(
                                        trip.id,
                                        uuidToRelate, // 👈 Se envía el valor seguro
                                        (responseData: any) => {
                                          const generatedFinalUuid =
                                            responseData?.data?.uuid ||
                                            responseData?.uuid;
                                          if (generatedFinalUuid) {
                                            setFinalUuid(generatedFinalUuid);
                                            handleDownloadStampedPDF(
                                              generatedFinalUuid,
                                            );
                                            toast.success(
                                              "¡FACTURA FINAL GENERADA Y DESCARGADA!",
                                            );
                                          }
                                          refreshTrips();
                                        },
                                      );
                                    }
                                  }}
                                >
                                  {isStamping ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  ) : finalUuid ? (
                                    <FileText className="h-5 w-5 mr-2" />
                                  ) : (
                                    <Activity className="h-5 w-5 mr-2" />
                                  )}
                                  {finalUuid
                                    ? "Descargar Factura Final"
                                    : "Timbrar Factura Final"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="bitacora" className="m-0 space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 shadow-inner">
                        <h4 className="text-xs font-black uppercase text-slate-600 tracking-widest">
                          Línea de Tiempo del Servicio
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-brand-navy text-brand-navy font-bold hover:bg-brand-navy hover:text-white"
                          onClick={() => onUpdateStatusClick?.(trip, activeLeg)}
                        >
                          <Edit2 className="h-3 w-3 mr-2" /> Insertar Novedad
                        </Button>
                      </div>
                      {allEvents.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 bg-slate-50 rounded-2xl border border-dashed border-slate-300 italic font-medium tracking-tight">
                          El viaje aún no cuenta con movimientos reportados
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {allEvents.map((ev, idx) => (
                            <div
                              key={idx}
                              className="flex gap-4 border-b border-slate-100 pb-4 last:border-0 items-start group hover:bg-slate-50 p-2 rounded-lg transition-colors"
                            >
                              <div className="p-2 bg-slate-100 rounded-full group-hover:bg-brand-navy transition-colors">
                                <Clock className="h-4 w-4 text-slate-600 group-hover:text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] font-black text-brand-navy uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded">
                                    {format(
                                      new Date(ev.time),
                                      "dd MMM, HH:mm",
                                      { locale: es },
                                    )}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] uppercase font-black bg-white border-slate-300"
                                  >
                                    {ev.legName}
                                  </Badge>
                                </div>
                                <p className="text-sm font-black text-slate-800 mt-1 uppercase tracking-tight leading-tight">
                                  {ev.event}
                                </p>
                                {ev.comments && (
                                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded border border-slate-200 mt-2 italic border-l-4 border-l-brand-navy leading-relaxed shadow-sm">
                                    "{ev.comments}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTerminalModal} onOpenChange={setShowTerminalModal}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-visible shadow-2xl border-none">
          <DialogHeader className="bg-slate-100 p-6 rounded-t-2xl border-b border-slate-300">
            <DialogTitle className="flex items-center gap-2 text-brand-navy font-black uppercase tracking-tighter">
              <MapPin className="h-5 w-5 text-emerald-600" /> Cierre Operativo
              de Ruta
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-bold text-xs uppercase tracking-widest mt-1">
              Registro de entrega de equipo en puerto / patio
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <div className="space-y-2">
              <Label className="font-black text-slate-700 text-[10px] uppercase tracking-widest">
                Seleccionar Patio de Arribo *
              </Label>
              <Popover
                open={terminalComboboxOpen}
                onOpenChange={setTerminalComboboxOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={terminalComboboxOpen}
                    className="w-full justify-between h-12 text-left font-black bg-slate-50 border-slate-200 uppercase text-xs tracking-tight"
                  >
                    {selectedTerminal || "Buscar o escribir terminal..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[380px] p-0 shadow-2xl rounded-xl"
                  align="start"
                >
                  <Command className="rounded-xl overflow-hidden">
                    <CommandInput
                      placeholder="Escribe el nombre de la terminal..."
                      value={searchTerminalQuery}
                      onValueChange={setSearchTerminalQuery}
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty className="p-4 text-sm flex flex-col items-center gap-3">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">
                          No registrado en catálogo
                        </span>
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 font-black h-10 shadow-lg"
                          disabled={isCreatingTerminal || !searchTerminalQuery}
                          onClick={() =>
                            handleCreateTerminal(searchTerminalQuery)
                          }
                        >
                          {isCreatingTerminal ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <PlusCircle className="h-4 w-4 mr-2" />
                          )}
                          AÑADIR "{searchTerminalQuery.toUpperCase()}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup heading="Terminales Registradas">
                        {terminals
                          .filter((t) =>
                            t.nombre
                              .toLowerCase()
                              .includes(searchTerminalQuery.toLowerCase()),
                          )
                          .map((terminal) => (
                            <CommandItem
                              key={terminal.id}
                              value={terminal.nombre}
                              onSelect={(v) => {
                                setSelectedTerminal(v);
                                setTerminalComboboxOpen(false);
                              }}
                              className="py-2.5 px-4 font-bold text-slate-700 uppercase text-xs"
                            >
                              <CheckCircle2
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTerminal === terminal.nombre
                                    ? "opacity-100 text-emerald-600"
                                    : "opacity-0",
                                )}
                              />
                              {terminal.nombre}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-4 rounded-b-2xl flex gap-3 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={() => setShowTerminalModal(false)}
              className="rounded-xl font-bold text-slate-500"
            >
              Cerrar
            </Button>
            <Button
              onClick={submitTerminalArrival}
              disabled={finishingLeg || !selectedTerminal}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white font-black px-10 shadow-lg rounded-xl h-11"
            >
              {finishingLeg ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              CONFIRMAR LLEGADA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
