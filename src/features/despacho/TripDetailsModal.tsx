// src/features/despacho/TripDetailsModal.tsx
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DollarSign,
  MapPin,
  Navigation,
  Undo,
  Wallet,
  CalendarClock,
  Link as LinkIcon,
  AlertCircle,
  Edit2,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Printer,
  History,
  Clock,
  Loader2,
  Activity,
  Box,
  ChevronsUpDown,
  PlusCircle,
  Route as RouteIcon,
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
  onIncidentClick,
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
  const [mantenerPreciosManuales, setMantenerPreciosManuales] = useState(true);
  const [isUndoing, setIsUndoing] = useState(false);

  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState("");
  const [searchTerminalQuery, setSearchTerminalQuery] = useState("");
  const [terminalComboboxOpen, setTerminalComboboxOpen] = useState(false);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const [finishingLeg, setFinishingLeg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 🚀 FASE 4: Utilidad de Formateo de Moneda (Comas y Punto)
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val || 0);

  useEffect(() => {
    if (open) {
      loadTerminals();
    }
  }, [open]);

  useEffect(() => {
    if (trip && !isEditing) {
      setTarifaBase(trip.tarifa_base || 0);
      setCostoCasetas(trip.costo_casetas || 0);
    }
  }, [trip, isEditing]);

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
      legs.find((l) => l.status !== "cerrado") ||
      legs[legs.length - 1] ||
      undefined
    );
  }, [trip]);

  const totalAnticiposGlobales = useMemo(() => {
    if (!trip) return 0;
    return (
      trip.legs?.reduce(
        (acc, leg) =>
          acc +
          (leg.anticipo_casetas || 0) +
          (leg.anticipo_combustible || 0) +
          (leg.anticipo_viaticos || 0) +
          (leg.otros_anticipos || 0),
        0,
      ) || 0
    );
  }, [trip]);

  const utilidadEstimada = useMemo(() => {
    if (!trip) return 0;
    return (
      (isEditing ? tarifaBase : trip.tarifa_base || 0) - totalAnticiposGlobales
    );
  }, [trip, isEditing, tarifaBase, totalAnticiposGlobales]);

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

  const handleSaveFinanzas = async () => {
    setSaving(true);
    const success = await editTrip(String(trip?.id), {
      tarifa_base: Number(tarifaBase),
      costo_casetas: Number(costoCasetas),
    });
    if (success) {
      await refreshTrips();
      setIsEditing(false);
      toast.success("Finanzas actualizadas.");
    }
    setSaving(false);
  };

  const handleUndoLeg = async () => {
    const ok = confirm("¿Estás seguro de deshacer el último movimiento?");
    if (!ok) return;
    setIsUndoing(true);
    try {
      await axiosClient.post(`/trips/${trip?.id}/undo-leg`);
      await refreshTrips();
      toast.success("Movimiento deshecho.");
    } catch {
      toast.error("No se pudo deshacer.");
    } finally {
      setIsUndoing(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshTrips();
    setIsSyncing(false);
    toast.success("Datos sincronizados.");
  };

  const handlePrintPDF = async () => {
    try {
      const response = await axiosClient.get(
        `/trips/${trip?.id}/carta-porte-ciega`,
        { responseType: "blob" },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      window.open(fileURL, "_blank");
    } catch {
      toast.error("Error al generar la Carta Porte");
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
          comments: `📍 LLEGADA REGISTRADA: El esqueleto fue entregado en: ${selectedTerminal}.`,
        },
        true,
      );
      if (trip?.remolque_1_id)
        await updateLoadStatus(trip.remolque_1_id, false);
      if (trip?.remolque_2_id)
        await updateLoadStatus(trip.remolque_2_id, false);
      setShowTerminalModal(false);
      await refreshTrips();
      toast.success("Viaje finalizado.");
    } catch {
      toast.error("Error al registrar llegada.");
    } finally {
      setFinishingLeg(false);
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 border-slate-300 bg-white font-bold"
                  onClick={handlePrintPDF}
                >
                  <Printer className="h-4 w-4 mr-1.5 text-slate-500" /> PDF
                  PROVISIONAL
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 text-xs font-black shadow-md border-indigo-200 transition-all",
                    trip.uuid_fiscal
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-indigo-50 text-indigo-700",
                  )}
                  onClick={() => handleStampNominal(trip.id, refreshTrips)}
                  disabled={isStamping || !!trip.uuid_fiscal}
                >
                  {isStamping ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4 mr-1.5" />
                  )}
                  {trip.uuid_fiscal
                    ? "NOMINAL TIMBRADA"
                    : "TIMBRAR NOMINAL ($1)"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
            {/* Panel Izquierdo */}
            <div className="w-full lg:w-[30%] bg-slate-50 border-r border-slate-200 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <RouteIcon className="h-3 w-3" /> Ruta de Servicio
                </h3>
                <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4 text-xs">
                  <div className="relative pl-6">
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100" />
                    <div className="mb-4">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Origen
                      </p>
                      <p className="font-black text-slate-800 uppercase">
                        {trip.origin}
                      </p>
                    </div>
                    <div>
                      <div className="absolute -left-[27px] top-1 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-white" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
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
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
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

            {/* Panel Derecho */}
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
                      Estado Financiero
                    </TabsTrigger>
                    <TabsTrigger value="bitacora" className="text-xs font-bold">
                      Diario Bitácora
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {/* TABS DE FASES */}
                    <TabsContent value="fases" className="m-0 space-y-4">
                      {trip.legs?.map((leg, idx) => (
                        <Card
                          key={leg.id}
                          className="border-l-4 border-l-brand-navy shadow-sm overflow-hidden"
                        >
                          <CardContent className="p-4 flex justify-between items-center bg-white">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Fase {idx + 1}
                              </p>
                              <h4 className="font-black text-brand-navy uppercase text-sm leading-tight">
                                {leg.leg_type.replace("_", " ")}
                              </h4>
                              <div className="flex items-center gap-3 text-xs font-medium text-slate-600 pt-1">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-400" />{" "}
                                  {leg.operator?.name || "Sin operador"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3 text-slate-400" />{" "}
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
                              {leg.status === "en_transito" && onRelayClick && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-brand-navy font-bold text-[11px]"
                                  onClick={() => onRelayClick(leg, trip)}
                                >
                                  DESENGANCHAR
                                </Button>
                              )}
                              {leg.status === "entregado" && onSettleClick && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 font-bold text-[11px]"
                                  onClick={() => onSettleClick(leg, trip)}
                                >
                                  LIQUIDAR
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
                            className="w-full border-dashed border-2 h-12 text-slate-500 font-bold hover:bg-slate-50"
                            onClick={() => setShowTerminalModal(true)}
                          >
                            <MapPin className="h-4 w-4 mr-2" /> REGISTRAR
                            LLEGADA A TERMINAL (CIERRE OPERATIVO)
                          </Button>
                        )}
                    </TabsContent>

                    {/* TAB FINANZAS */}
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
                            <Wallet className="h-4 w-4" /> Resumen de Cobros y
                            Egresos
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
                                <Edit2 className="h-3 w-3 mr-1" /> Editar
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
                                Cambios
                              </Button>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto bg-white p-6 rounded-xl border border-amber-100 shadow-inner">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-500">
                                  Flete Base Acordado
                                </Label>
                                <Input
                                  type="number"
                                  value={tarifaBase}
                                  onChange={(e) =>
                                    setTarifaBase(Number(e.target.value))
                                  }
                                  className="font-mono text-lg h-12"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-500">
                                  Recuperación Casetas
                                </Label>
                                <Input
                                  type="number"
                                  value={costoCasetas}
                                  onChange={(e) =>
                                    setCostoCasetas(Number(e.target.value))
                                  }
                                  className="font-mono text-lg h-12"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 max-w-2xl mx-auto">
                              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                <div className="flex justify-between items-center font-bold text-slate-600 uppercase tracking-tighter">
                                  <span>Ingreso Flete Base:</span>
                                  <span className="font-mono text-lg text-slate-900">
                                    {formatCurrency(trip.tarifa_base)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-slate-600 uppercase tracking-tighter">
                                  <span>Recuperación de Casetas:</span>
                                  <span className="font-mono text-lg text-slate-900">
                                    {formatCurrency(trip.costo_casetas)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-rose-700 bg-rose-50 p-4 rounded-xl font-black border border-rose-100 shadow-sm uppercase tracking-tighter">
                                <span className="flex items-center gap-2">
                                  <Wallet className="h-4 w-4" /> Egresos Totales
                                  (Anticipos):
                                </span>
                                <span className="font-mono text-xl">
                                  -{formatCurrency(totalAnticiposGlobales)}
                                </span>
                              </div>
                              <div className="bg-emerald-500 text-white p-6 rounded-2xl flex justify-between items-center shadow-lg border-b-4 border-emerald-700">
                                <span className="font-black text-sm uppercase tracking-widest italic">
                                  Utilidad Neta Estimada:
                                </span>
                                <span className="text-3xl font-black font-mono tracking-tighter">
                                  {formatCurrency(utilidadEstimada)}
                                </span>
                              </div>

                              <div className="bg-slate-900 p-6 rounded-2xl border-t-4 border-emerald-500 flex flex-col sm:flex-row items-center justify-between gap-6 mt-10 shadow-2xl">
                                <div className="text-left">
                                  <h4 className="text-emerald-400 font-black text-sm uppercase tracking-tighter flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Cierre
                                    Fiscal de Viaje
                                  </h4>
                                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed mt-1 italic">
                                    Timbra la factura 4.0 real sustituyendo la
                                    nominal. Verifica que los montos sean
                                    finales.
                                  </p>
                                </div>
                                <Button
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 h-12 shadow-xl disabled:opacity-30"
                                  disabled={isStamping || !trip.uuid_fiscal}
                                  onClick={() =>
                                    handleStampFinal(
                                      trip.id,
                                      trip.uuid_fiscal!,
                                      refreshTrips,
                                    )
                                  }
                                >
                                  {isStamping ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  ) : (
                                    <Activity className="h-5 w-5 mr-2" />
                                  )}
                                  TIMBRAR FACTURA FINAL
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB BITÁCORA */}
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
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300 italic font-medium tracking-tight">
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
                                <Clock className="h-4 w-4 text-slate-400 group-hover:text-white" />
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

      {/* MODAL DE TERMINAL DE VACÍOS (COMBOBOX) */}
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
