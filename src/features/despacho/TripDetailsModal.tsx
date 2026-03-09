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
  Save,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Printer,
  History,
  Loader2,
  Activity,
  Box,
  Eye,
} from "lucide-react";
import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import { useUnits } from "@/hooks/useUnits";
import axiosClient from "@/api/axiosClient";

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;

  onRelayClick?: (leg: TripLeg, trip: Trip) => void;
  onSettleClick?: (leg: TripLeg, trip: Trip) => void;
  onIncidentClick?: (trip: Trip) => void;
  onUpdateStatusClick?: (trip: Trip, leg?: TripLeg) => void; // 🚀 Ahora acepta leg
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

  const [activeTab, setActiveTab] = useState("fases");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tarifaBase, setTarifaBase] = useState(0);
  const [costoCasetas, setCostoCasetas] = useState(0);
  const [mantenerPreciosManuales, setMantenerPreciosManuales] = useState(true);

  // 🚀 Lógica de Tramo Activo
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
      trip.legs?.reduce((acc, leg) => {
        const totalLeg =
          (leg.anticipo_casetas || 0) +
          (leg.anticipo_combustible || 0) +
          (leg.anticipo_viaticos || 0) +
          (leg.otros_anticipos || 0);
        return acc + totalLeg;
      }, 0) || 0
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
          })),
        )
        .sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        ) || []
    );
  }, [trip]);

  // 🚀 TRADUCTOR DE ESTATUS GLOBAL (Gustavo UX)
  const globalOperationalStatus = useMemo(() => {
    if (!trip) return "";
    const baseStatus = (trip.status || "").toLowerCase();

    if (baseStatus === "cerrado") return "🏁 VIAJE FINALIZADO";
    if (baseStatus === "creado") return "⏳ EN STAND-BY / PATIO";

    // Si está activo, leemos qué está haciendo la fase actual
    if (activeLeg) {
      const legStatus = activeLeg.status.toLowerCase();
      const isIncident = ["detenido", "retraso", "accidente"].includes(
        legStatus,
      );

      if (isIncident) return `🚨 INCIDENCIA: ${legStatus.toUpperCase()}`;

      if (legStatus === "entregado") {
        if (activeLeg.leg_type === "carga_muelle") return "📦 CARGADO EN PATIO";
        if (activeLeg.leg_type === "ruta_carretera") return "⏳ VACÍO EN PATIO";
        if (activeLeg.leg_type === "entrega_vacio")
          return "✅ LLEGADA FINAL (POR LIQUIDAR)";
      }

      if (legStatus === "en_transito") {
        if (activeLeg.leg_type === "carga_muelle")
          return "🚜 OPERANDO EN MUELLE";
        if (activeLeg.leg_type === "ruta_carretera") return "🚚 EN CARRETERA";
        if (activeLeg.leg_type === "entrega_vacio")
          return "🔄 RETORNANDO VACÍO";
      }

      return legStatus.replace("_", " ").toUpperCase();
    }

    return baseStatus.replace("_", " ").toUpperCase();
  }, [trip, activeLeg]);

  useEffect(() => {
    if (trip && open) {
      setTarifaBase(trip.tarifa_base || 0);
      setCostoCasetas(trip.costo_casetas || 0);
      setIsEditing(false);
      setMantenerPreciosManuales(true);
      setActiveTab("fases");
    }
  }, [trip, open]);

  if (!trip) return null;

  // ----------------------------------------------------
  // EVENTOS CON REGISTRO AL DIARIO DE FORMA AUTOMÁTICA
  // ----------------------------------------------------

  const handleChassisToggle = async (
    unitId: number,
    eco: string,
    checked: boolean,
  ) => {
    const ok = await updateLoadStatus(unitId, checked);
    if (ok) {
      toast.success(checked ? "Chasis CARGADO" : "Chasis VACÍO");
      if (activeLeg) {
        await addTimelineEvent(
          trip.id,
          activeLeg.id,
          {
            status: trip.status, // 🚀 CORRECCIÓN: Mandamos el estatus actual del viaje
            location: "Patio Base",
            comments: `Operación de Patio: Chasis ECO-${eco} fue marcado físicamente como ${checked ? "CARGADO" : "VACÍO"}.`,
          },
          true,
        );
      } else {
        await refreshTrips();
      }
    }
  };

  const handleSaveFinanzas = async () => {
    setSaving(true);
    const success = await editTrip(String(trip.id), {
      tarifa_base: Number(tarifaBase),
      costo_casetas: Number(costoCasetas),
    });
    setSaving(false);
    if (success) {
      setIsEditing(false);
      toast.success("Finanzas actualizadas.");
      if (activeLeg) {
        await addTimelineEvent(
          trip.id,
          activeLeg.id,
          {
            status: trip.status, // 🚀 CORRECCIÓN: Mandamos el estatus actual del viaje
            location: "Administración",
            comments: `Ajuste comercial manual: Flete Base $${tarifaBase}, Casetas $${costoCasetas}.`,
          },
          true,
        );
      } else {
        await refreshTrips();
      }
    }
  };

  const handleReopenLeg = async (leg: TripLeg) => {
    const ok = confirm(
      "¿Estás seguro de reabrir esta fase? Se anulará la liquidación y la factura del cliente.",
    );
    if (!ok) return;

    try {
      await axiosClient.post(`/trips/legs/${leg.id}/reopen`);
      toast.success("Fase reabierta exitosamente");

      await addTimelineEvent(
        trip.id,
        leg.id,
        {
          status: trip.status, // 🚀 CORRECCIÓN: EVITA EL ERROR 500
          location: "Administración",
          comments: `Fase ${leg.leg_type.replace("_", " ").toUpperCase()} reabierta manualmente. Liquidación anulada.`,
        },
        true,
      );

      // 🚀 FORZAMOS LA ACTUALIZACIÓN AQUÍ PARA QUE LA UI CAMBIE AL INSTANTE
      await refreshTrips();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Error al reabrir la fase");
    }
  };

  const handlePrintPDF = async () => {
    try {
      const response = await axiosClient.get(
        `/trips/${trip.id}/carta-porte-ciega`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-white h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-100 border-b border-slate-300 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-navy flex items-center justify-center shadow-inner">
                <Navigation className="h-6 w-6 text-black" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-brand-navy flex items-center gap-2">
                  Centro de Mando: Viaje #{trip.public_id || trip.id}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1">
                  Cliente:{" "}
                  <span className="text-slate-800 font-bold uppercase">
                    {trip.client?.razon_social}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* <Badge
                className={`uppercase px-4 py-1.5 font-black tracking-widest shadow-sm border-0 ${
                  globalOperationalStatus.includes("INCIDENCIA")
                    ? "bg-red-600 text-white animate-pulse"
                    : globalOperationalStatus.includes("FINALIZADO")
                      ? "bg-slate-800 text-white"
                      : globalOperationalStatus.includes("PATIO")
                        ? "bg-amber-100 text-amber-800"
                        : "bg-brand-navy text-white"
                }`}
              >
                ESTATUS: {globalOperationalStatus}
              </Badge> */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold mt-7"
                onClick={handlePrintPDF}
              >
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir C. Porte
                Operativa
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          {/* PANEL IZQUIERDO: Control de Patio + Ruta */}
          <div className="w-full lg:w-[30%] bg-slate-50 border-r border-slate-200 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* 🚀 CONTROL FÍSICO DE PATIO */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Box className="h-4 w-4 text-emerald-600" /> Control Físico
                    de Patio
                  </h3>
                  {trip.remolque_1 && (
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                      <div
                        className={`h-1.5 ${trip.remolque_1.is_loaded ? "bg-orange-500" : "bg-slate-300"}`}
                      />
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-slate-100 rounded-lg">
                            <LinkIcon className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Remolque 1
                            </p>
                            <p className="font-black text-brand-navy">
                              ECO-{trip.remolque_1.numero_economico}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Switch
                            checked={Boolean(trip.remolque_1.is_loaded)}
                            disabled // 🚀 AHORA ES DE SOLO LECTURA, EL SISTEMA LO HACE SOLO
                          />
                          <Badge
                            variant={
                              trip.remolque_1.is_loaded ? "default" : "outline"
                            }
                            className="text-[9px] h-4 mt-1"
                          >
                            {trip.remolque_1.is_loaded
                              ? "📦 CARGADO"
                              : "➖ VACÍO"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {trip.remolque_2 && (
                    <Card className="border-slate-200 shadow-sm overflow-hidden mt-2">
                      <div
                        className={`h-1.5 ${trip.remolque_2.is_loaded ? "bg-orange-500" : "bg-slate-300"}`}
                      />
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-slate-100 rounded-lg">
                            <LinkIcon className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Remolque 2
                            </p>
                            <p className="font-black text-brand-navy">
                              ECO-{trip.remolque_2.numero_economico}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Switch
                            checked={Boolean(trip.remolque_2.is_loaded)}
                            onCheckedChange={(c) =>
                              handleChassisToggle(
                                trip.remolque_2!.id,
                                trip.remolque_2!.numero_economico,
                                c,
                              )
                            }
                          />
                          <Badge
                            variant={
                              trip.remolque_2.is_loaded ? "default" : "outline"
                            }
                            className="text-[9px] h-4 mt-1"
                          >
                            {trip.remolque_2.is_loaded
                              ? "📦 CARGADO"
                              : "➖ VACÍO"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {trip.dolly_id && (
                    <Badge
                      variant="secondary"
                      className="w-full justify-center bg-blue-50 text-blue-700 border-blue-200 py-1.5 text-xs mt-2"
                    >
                      Dolly: Eco {trip.dolly?.numero_economico || trip.dolly_id}
                    </Badge>
                  )}
                  {!trip.remolque_1_id && (
                    <span className="text-xs text-slate-400 italic block text-center mt-2">
                      Sin remolques asignados
                    </span>
                  )}
                </div>

                <Separator />

                {/* RUTA GLOBAL */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Ruta Global
                  </h3>
                  <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 pt-4 text-sm space-y-5">
                      <div className="relative pl-6 space-y-5">
                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />
                        <div className="relative">
                          <div className="absolute -left-[27px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white shadow-sm" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">
                            Origen
                          </p>
                          <p className="font-semibold text-slate-800 leading-tight mt-1">
                            {trip.origin}
                          </p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[27px] top-1 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-white shadow-sm" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">
                            Destino Final
                          </p>
                          <p className="font-semibold text-slate-800 leading-tight mt-1">
                            {trip.destination}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* PANEL DERECHO: Tabs + Botonera */}
          <div className="w-full lg:w-[70%] flex flex-col bg-white">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col h-full"
            >
              <div className="px-6 pt-4 border-b border-slate-100">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl h-12">
                  <TabsTrigger
                    value="fases"
                    className="text-xs font-bold rounded-lg data-[state=active]:shadow-sm"
                  >
                    <Activity className="h-4 w-4 mr-2" /> Fases Operativas
                  </TabsTrigger>
                  <TabsTrigger
                    value="finanzas"
                    className="text-xs font-bold rounded-lg data-[state=active]:shadow-sm"
                  >
                    <DollarSign className="h-4 w-4 mr-2" /> Estado Financiero
                  </TabsTrigger>
                  <TabsTrigger
                    value="bitacora"
                    className="text-xs font-bold rounded-lg data-[state=active]:shadow-sm"
                  >
                    <History className="h-4 w-4 mr-2" /> Diario / Bitácora
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* TAB 1: FASES OPERATIVAS */}
                  <TabsContent
                    value="fases"
                    className="m-0 focus-visible:outline-none"
                  >
                    {!trip.legs || trip.legs.length === 0 ? (
                      <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">
                          El viaje no tiene tramos registrados.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-12 space-y-8 before:absolute before:inset-0 before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
                        {trip.legs.map((leg: TripLeg, index: number) => {
                          const isClosed = leg.status === "cerrado";
                          const isEntregado = leg.status === "entregado";
                          const isPending = !isClosed && !isEntregado;
                          const isIncident = [
                            "detenido",
                            "retraso",
                            "accidente",
                          ].includes(leg.status);
                          return (
                            <div key={leg.id} className="relative w-full">
                              <div
                                className={`absolute -left-12 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow-md z-10 ${isClosed ? "bg-emerald-100 ring-2 ring-emerald-500" : isEntregado ? "bg-amber-100 ring-2 ring-amber-500" : "bg-slate-50 ring-2 ring-brand-navy"}`}
                              >
                                {isClosed ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <span
                                    className={`text-base font-black ${isEntregado ? "text-amber-600" : "text-brand-navy"}`}
                                  >
                                    {index + 1}
                                  </span>
                                )}
                              </div>

                              <Card
                                className={`w-full shadow-md transition-all border-t-4 ${isClosed ? "border-t-emerald-500 bg-slate-50/50" : isEntregado ? "border-t-amber-500 bg-amber-50/10 hover:shadow-lg" : "border-t-brand-navy bg-white hover:shadow-lg"}`}
                              >
                                <CardHeader className="p-4 pb-3 border-b border-slate-100">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        FASE {index + 1}
                                      </p>
                                      <CardTitle className="text-sm font-black text-brand-navy uppercase mt-1 leading-tight">
                                        {leg.leg_type.replace("_", " ")}
                                      </CardTitle>
                                    </div>
                                    <Badge
                                      className={`${
                                        isClosed
                                          ? "bg-emerald-100 text-emerald-700"
                                          : isEntregado
                                            ? "bg-amber-100 text-amber-700"
                                            : isIncident
                                              ? "bg-red-500 text-white"
                                              : "bg-blue-600 text-white"
                                      } border-0 uppercase font-bold shadow-sm px-3 py-1`}
                                    >
                                      {isClosed
                                        ? "CERRADO Y PAGADO"
                                        : isEntregado
                                          ? "LLEGADA FÍSICA (ESPERANDO PAGO)"
                                          : leg.status === "en_transito" &&
                                              leg.leg_type === "carga_muelle"
                                            ? "🚜 OPERANDO EN MUELLE"
                                            : leg.status === "en_transito" &&
                                                leg.leg_type ===
                                                  "ruta_carretera"
                                              ? "🚚 EN CARRETERA"
                                              : leg.status === "en_transito" &&
                                                  leg.leg_type ===
                                                    "entrega_vacio"
                                                ? "🔄 RETORNANDO VACÍO"
                                                : leg.status.replace("_", " ")}
                                    </Badge>
                                  </div>
                                </CardHeader>

                                <CardContent className="p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                                    <div className="flex flex-col justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm h-full">
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                          <Truck className="h-5 w-5 text-slate-400" />
                                          <div className="flex-1 flex justify-between items-center">
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                              Tractocamión
                                            </p>
                                            <p className="text-sm font-black text-slate-800">
                                              ECO-
                                              {leg.unit?.numero_economico ||
                                                "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <User className="h-5 w-5 text-slate-400" />
                                          <div className="flex-1 flex justify-between items-center">
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                              Operador
                                            </p>
                                            <p className="text-sm font-black text-slate-800 truncate max-w-[150px]">
                                              {leg.operator?.name || "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-2">
                                        <CalendarClock className="h-5 w-5 text-slate-400" />
                                        <div className="flex-1 flex justify-between items-center">
                                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                            Inicio Fase
                                          </p>
                                          <p className="text-xs font-medium text-slate-600">
                                            {leg.start_date
                                              ? format(
                                                  new Date(leg.start_date),
                                                  "dd MMM HH:mm",
                                                  { locale: es },
                                                )
                                              : "N/A"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col justify-between space-y-2 bg-rose-50/60 p-4 rounded-lg border border-rose-100 h-full">
                                      <div>
                                        <p className="text-xs text-rose-600 font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                                          <Wallet className="h-4 w-4" />{" "}
                                          Anticipos Entregados
                                        </p>
                                        <div className="space-y-2.5">
                                          <div className="flex justify-between text-sm text-slate-700">
                                            <span>Casetas:</span>
                                            <span className="font-bold font-mono text-slate-900">
                                              $
                                              {(
                                                leg.anticipo_casetas || 0
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm text-slate-700">
                                            <span>Diésel:</span>
                                            <span className="font-bold font-mono text-slate-900">
                                              $
                                              {(
                                                leg.anticipo_combustible || 0
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm text-slate-700">
                                            <span>Viáticos:</span>
                                            <span className="font-bold font-mono text-slate-900">
                                              $
                                              {(
                                                leg.anticipo_viaticos || 0
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <Separator className="bg-rose-200 my-3" />
                                        <div className="flex justify-between items-center text-sm text-rose-800 font-black">
                                          <span>TOTAL TRAMO:</span>
                                          <span className="font-mono text-lg bg-white px-3 py-1 rounded shadow-sm border border-rose-200">
                                            $
                                            {(
                                              (leg.anticipo_casetas || 0) +
                                              (leg.anticipo_combustible || 0) +
                                              (leg.anticipo_viaticos || 0)
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>

                                {/* 🚀 BOTONES DINÁMICOS POR FASE */}
                                <CardFooter className="p-3 border-t bg-slate-50 flex flex-col gap-2">
                                  {/* CASO 1: AÚN ESTÁN TRABAJANDO (creado/transito) */}
                                  {isPending && (
                                    <div className="flex w-full gap-3">
                                      <Button
                                        variant="outline"
                                        className="flex-1 text-red-600 border-red-200"
                                        onClick={() => onIncidentClick?.(trip)}
                                      >
                                        <AlertTriangle className="h-4 w-4 mr-2" />{" "}
                                        Reportar Falla
                                      </Button>

                                      {leg.leg_type === "entrega_vacio" ? (
                                        <Button
                                          className="flex-[2] bg-brand-navy hover:bg-brand-navy/90 text-white font-black shadow-md"
                                          onClick={async () => {
                                            const confirmacion = confirm(
                                              "¿Confirmar llegada de contenedor vacío al patio/puerto?",
                                            );
                                            if (!confirmacion) return;

                                            // 🚀 Inyección automática a la Bitácora (Se salta el Modal)
                                            await addTimelineEvent(
                                              String(trip.id),
                                              leg.id,
                                              {
                                                status: "entregado",
                                                location: "Patio / Puerto",
                                                comments:
                                                  "📍 LLEGADA REGISTRADA: El esqueleto fue retornado vacío y entregado.",
                                                notifyClient: false,
                                              },
                                              true,
                                            );

                                            // 🚀 Actualizamos el chasis a vacío
                                            if (trip.remolque_1_id)
                                              await updateLoadStatus(
                                                trip.remolque_1_id,
                                                false,
                                              );
                                            if (trip.remolque_2_id)
                                              await updateLoadStatus(
                                                trip.remolque_2_id,
                                                false,
                                              );

                                            toast.success(
                                              "Viaje finalizado exitosamente.",
                                            );
                                            await refreshTrips();
                                          }}
                                        >
                                          📍 REGISTRAR LLEGADA DE VACÍO (FIN)
                                        </Button>
                                      ) : (
                                        <Button
                                          className="flex-[2] bg-brand-navy hover:bg-brand-navy/90 text-white font-black shadow-md"
                                          onClick={() =>
                                            onRelayClick?.(leg, trip)
                                          }
                                        >
                                          <LinkIcon className="h-4 w-4 mr-2" />{" "}
                                          CONCLUIR Y DESENGANCHAR (Drop)
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {/* CASO 2: YA LLEGARON, FALTA PAGAR (entregado) */}
                                  {isEntregado && (
                                    <div className="w-full flex flex-col gap-2 mt-1">
                                      <Button
                                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg text-base"
                                        onClick={() =>
                                          onSettleClick?.(leg, trip)
                                        }
                                      >
                                        {/*  <Banknote className="mr-2 h-5 w-5" /> */}{" "}
                                        PASAR A LIQUIDAR FASE A{" "}
                                        {leg.operator?.name
                                          ?.split(" ")[0]
                                          .toUpperCase()}
                                      </Button>
                                      {/* 🚀 BOTÓN DE RESCATE: Por si se equivocaron al darle concluir */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold"
                                        onClick={() => handleReopenLeg(leg)}
                                      >
                                        <Undo className="h-4 w-4 mr-2" /> Me
                                        equivoqué, Reabrir Fase
                                      </Button>
                                    </div>
                                  )}

                                  {/* CASO 3: YA SE PAGÓ (cerrado) */}
                                  {isClosed && (
                                    <div className="flex w-full gap-2 items-center bg-slate-100/50 p-1.5 rounded-lg border border-slate-200 mt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold text-xs px-2"
                                        onClick={() => handleReopenLeg(leg)}
                                      >
                                        <Undo className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                        <span className="truncate">
                                          Reabrir Fase
                                        </span>
                                      </Button>

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          onSettleClick?.(leg, trip)
                                        }
                                        className="flex-[1.5] font-bold text-slate-700 border-slate-300 bg-white text-xs px-2 shadow-sm"
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                        <span className="truncate">
                                          Ver Liquidación
                                        </span>
                                      </Button>
                                    </div>
                                  )}
                                </CardFooter>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: FINANZAS */}
                  <TabsContent
                    value="finanzas"
                    className="m-0 focus-visible:outline-none"
                  >
                    <Card
                      className={`shadow-sm border-2 transition-colors ${isEditing ? "border-amber-200 bg-amber-50/20" : "border-emerald-100 bg-emerald-50/10"}`}
                    >
                      <CardHeader className="p-5 border-b border-slate-100 bg-white rounded-t-xl">
                        <div className="flex justify-between items-center">
                          <CardTitle
                            className={`text-base font-black flex items-center gap-2 uppercase tracking-wider ${isEditing ? "text-amber-800" : "text-emerald-800"}`}
                          >
                            <DollarSign className="h-5 w-5" />{" "}
                            {isEditing
                              ? "Editando Finanzas"
                              : "Estado de Cuenta del Viaje"}
                          </CardTitle>
                          {!isEditing && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditing(true)}
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2" /> Editar
                              Montos
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 space-y-6">
                        {isEditing ? (
                          <div className="space-y-5 max-w-md mx-auto">
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                              <Label
                                htmlFor="manual-prices"
                                className="flex flex-col cursor-pointer text-sm"
                              >
                                <span className="font-bold text-slate-800">
                                  Fijar Precios Manuales
                                </span>
                                <span className="font-normal text-slate-500 mt-1">
                                  Ignorar cálculo automático.
                                </span>
                              </Label>
                              <Switch
                                id="manual-prices"
                                checked={mantenerPreciosManuales}
                                onCheckedChange={setMantenerPreciosManuales}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase">
                                Ingreso (Flete Base Cliente)
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
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase">
                                Cobro Casetas (Al Cliente)
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
                            <div className="flex gap-3 pt-6 border-t border-slate-200">
                              <Button
                                variant="outline"
                                className="flex-1 h-12"
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                              >
                                Cancelar
                              </Button>
                              <Button
                                className="flex-1 h-12 bg-brand-navy hover:bg-brand-navy/90 text-white text-base"
                                onClick={handleSaveFinanzas}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                  <Save className="h-5 w-5 mr-2" />
                                )}{" "}
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-2xl mx-auto space-y-4">
                            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                              <div className="flex justify-between items-center text-lg">
                                <span className="text-slate-600 font-medium">
                                  Ingreso Flete:
                                </span>
                                <span className="font-black text-slate-800 font-mono">
                                  ${(trip.tarifa_base || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-lg">
                                <span className="text-slate-600 font-medium">
                                  Cobro Casetas:
                                </span>
                                <span className="font-black text-slate-800 font-mono">
                                  ${(trip.costo_casetas || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 flex justify-between items-center text-xl">
                              <span className="text-rose-700 font-bold flex items-center gap-2">
                                <Wallet className="h-5 w-5" /> Egresos
                                (Anticipos):
                              </span>
                              <span className="font-black text-rose-700 font-mono">
                                -${totalAnticiposGlobales.toLocaleString()}
                              </span>
                            </div>
                            <div className="bg-emerald-500 text-white p-6 rounded-xl shadow-lg flex justify-between items-center text-2xl mt-6">
                              <span className="font-black uppercase tracking-widest">
                                Utilidad Estimada:
                              </span>
                              <span className="font-black font-mono">
                                ${utilidadEstimada.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 3: DIARIO / BITÁCORA */}
                  <TabsContent
                    value="bitacora"
                    className="m-0 focus-visible:outline-none space-y-6"
                  >
                    <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <History className="h-5 w-5 text-brand-navy" /> Diario
                        de Movimientos
                      </h4>
                      <Button
                        className="bg-brand-navy hover:bg-brand-navy/90 shadow-md gap-2"
                        onClick={() => onUpdateStatusClick?.(trip, activeLeg)}
                      >
                        <Edit2 className="h-4 w-4" /> Escribir Novedad
                      </Button>
                    </div>

                    {allEvents.length === 0 ? (
                      <div className="p-12 text-center border-2 border-dashed rounded-2xl text-slate-400 mt-4">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium text-lg">
                          Sin historial registrado.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-2xl border shadow-sm mt-4">
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-slate-200">
                          {allEvents.map((event: any, idx: number) => {
                            // Definir estilo según el tipo de evento
                            const isAlert = [
                              "detenido",
                              "retraso",
                              "accidente",
                              "bloqueado",
                            ].includes(event.status);
                            const isSuccess = ["entregado", "cerrado"].includes(
                              event.status,
                            );
                            const isCheckpoint = ["punto_control"].includes(
                              event.status,
                            ); // 🚀 NUEVO ESTADO

                            // Colores de la viñeta
                            const dotColor = isAlert
                              ? "bg-red-500"
                              : isSuccess
                                ? "bg-emerald-500"
                                : isCheckpoint
                                  ? "bg-sky-500"
                                  : "bg-brand-navy";

                            // 🚀 EXTRACCIÓN DE METADATA (TRAFFIC LOG)
                            // Buscar la fase a la que pertenece el evento para sacar al Operador y la Unidad
                            const legOfEvent = trip.legs?.find(
                              (l) => l.id === event.trip_leg_id,
                            );

                            const operatorName =
                              legOfEvent?.operator?.name?.split(" ")[0] ||
                              "Operador N/A";
                            const unitEco =
                              legOfEvent?.unit?.numero_economico ||
                              "Tracto N/A";
                            const unitPlacas =
                              legOfEvent?.unit?.placas || "S/P";

                            // Extraer remolques del viaje (son fijos, pero es vital saber cuáles llevaba)
                            const r1Eco = trip.remolque_1?.numero_economico;
                            const r2Eco = trip.remolque_2?.numero_economico;

                            return (
                              <div
                                key={event.id || idx}
                                className="relative flex gap-3 items-start group"
                              >
                                {/* PUNTO DEL TIMELINE CON ÍCONOS ARREGLADOS */}
                                <div
                                  className={`w-6 h-6 rounded-full mt-1 ring-4 ring-white shadow-sm shrink-0 z-10 flex items-center justify-center ${dotColor}`}
                                >
                                  {isAlert && (
                                    <AlertTriangle className="h-3 w-3 text-white" />
                                  )}
                                  {isSuccess && (
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                  )}
                                  {isCheckpoint && (
                                    <Navigation className="h-3 w-3 text-white" />
                                  )}
                                  {!isAlert && !isSuccess && !isCheckpoint && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  )}
                                </div>

                                {/* TARJETA DEL EVENTO (DISEÑO COMPACTO Y DENSO) */}
                                <div className="flex-1 pb-1">
                                  <div
                                    className={`p-3 rounded-lg border transition-all ${isAlert ? "bg-red-50/50 border-red-200" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
                                  >
                                    {/* Encabezado: Estatus, Fase y Fecha */}
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge
                                          className={`text-[9px] px-1.5 py-0 h-4 font-bold uppercase border-0 ${dotColor} text-white`}
                                        >
                                          {event.status?.replace("_", " ")}
                                        </Badge>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                          | {event.legName}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 border border-slate-200">
                                        {format(
                                          new Date(event.time),
                                          "dd MMM • HH:mm",
                                          { locale: es },
                                        )}
                                      </span>
                                    </div>

                                    {/* Cuerpo: Comentario de Tráfico */}
                                    <p
                                      className={`text-xs font-semibold leading-snug mb-2.5 ${isAlert ? "text-red-800" : "text-slate-800"}`}
                                    >
                                      {event.comments ||
                                        "Reporte sin comentarios adicionales."}
                                    </p>

                                    {/* Pie: Ubicación y Recursos Involucrados */}
                                    <div className="bg-slate-50/80 rounded border border-slate-100 p-2 space-y-1.5">
                                      {/* Ubicación */}
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                        <MapPin className="h-3 w-3 text-brand-navy" />
                                        <span className="truncate uppercase">
                                          {event.location ||
                                            "UBICACIÓN NO ESPECIFICADA"}
                                        </span>
                                      </div>

                                      {/* Fila de Recursos Físicos */}
                                      <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200 mt-1">
                                        <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                                          <User className="h-2.5 w-2.5 text-slate-400" />
                                          <span className="truncate max-w-[80px]">
                                            {operatorName}
                                          </span>
                                        </div>
                                        <div
                                          className="flex items-center gap-1 text-[9px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100"
                                          title={`Placas: ${unitPlacas}`}
                                        >
                                          <Truck className="h-2.5 w-2.5 text-slate-400" />
                                          {unitEco}{" "}
                                          <span className="text-slate-400 font-normal">
                                            ({unitPlacas})
                                          </span>
                                        </div>

                                        {/* Remolques (Si existen) */}
                                        {(r1Eco || r2Eco) && (
                                          <div className="flex items-center gap-1 text-[9px] font-medium text-slate-500 ml-auto">
                                            <LinkIcon className="h-2.5 w-2.5 text-slate-400" />
                                            {r1Eco && (
                                              <span className="bg-slate-200 px-1 rounded text-slate-700 border border-slate-300">
                                                R1: {r1Eco}
                                              </span>
                                            )}
                                            {r2Eco && (
                                              <span className="bg-slate-200 px-1 rounded text-slate-700 border border-slate-300">
                                                R2: {r2Eco}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
  );
}
