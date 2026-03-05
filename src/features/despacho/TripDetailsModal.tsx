// src/features/despacho/TripDetailsModal.tsx
import React, { useState, useEffect } from "react";
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
  Wallet,
  CalendarClock,
  Link as LinkIcon,
  AlertCircle,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Printer,
  History,
  Loader2,
  Activity,
} from "lucide-react";
import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import axiosClient from "@/api/axiosClient";

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  onRelayClick?: (leg: TripLeg, trip: Trip) => void;
  onSettleClick?: (leg: TripLeg, trip: Trip) => void;
  onIncidentClick?: (trip: Trip) => void;
  onUpdateStatusClick?: (trip: Trip) => void;
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
  const { editTrip } = useTrips();

  const [activeTab, setActiveTab] = useState("fases");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tarifaBase, setTarifaBase] = useState(0);
  const [costoCasetas, setCostoCasetas] = useState(0);
  const [mantenerPreciosManuales, setMantenerPreciosManuales] = useState(true);

  useEffect(() => {
    if (trip && open) {
      setTarifaBase(trip.tarifa_base || 0);
      setCostoCasetas(trip.costo_casetas || 0);
      setIsEditing(false);
      setMantenerPreciosManuales(true);
      setActiveTab("fases");
    }
  }, [trip, open]);

  const handlePrintPDF = async () => {
    if (!trip) return;
    try {
      const response = await axiosClient.get(
        `/trips/${trip.id}/carta-porte-ciega`,
        { responseType: "blob" },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      window.open(fileURL, "_blank");
    } catch (error) {
      toast.error("Error al generar la Carta Porte");
    }
  };

  const handleSave = async () => {
    if (!trip) return;
    setSaving(true);
    const payload: Partial<Trip> = {
      tarifa_base: Number(tarifaBase),
      costo_casetas: Number(costoCasetas),
    };
    const success = await editTrip(String(trip.id), payload);
    setSaving(false);
    if (success) {
      setIsEditing(false);
      toast.success("Finanzas actualizadas correctamente.");
    }
  };

  if (!trip) return null;

  const totalAnticiposGlobales =
    trip.legs?.reduce(
      (acc, leg) =>
        acc +
        (leg.anticipo_casetas +
          leg.anticipo_combustible +
          leg.anticipo_viaticos +
          leg.otros_anticipos),
      0,
    ) || 0;
  const utilidadEstimada = isEditing
    ? tarifaBase - totalAnticiposGlobales
    : trip.tarifa_base - totalAnticiposGlobales;

  const allEvents =
    trip.legs
      ?.flatMap((leg) =>
        (leg.timeline_events || []).map((ev) => ({
          ...ev,
          legName: leg.leg_type.replace("_", " ").toUpperCase(),
        })),
      )
      .sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-white h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-navy flex items-center justify-center shadow-inner">
                <Navigation className="h-6 w-6 text-white" />
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
              <Badge
                variant="outline"
                className="uppercase px-4 py-1.5 font-black bg-white text-slate-700 tracking-widest border-slate-300 shadow-sm"
              >
                ESTATUS: {trip.status.replace("_", " ")}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold"
                onClick={handlePrintPDF}
              >
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir C. Porte
                Operativa
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          {/* PANEL IZQUIERDO (Ruta) */}
          <div className="w-full lg:w-[30%] bg-slate-50 border-r border-slate-200 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Ruta Global
                  </h3>
                  <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 pt-4 text-sm space-y-5">
                      <div className="relative pl-6 space-y-5">
                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>
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

                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-brand-navy" /> Equipos
                    Asignados
                  </h3>
                  <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col gap-2">
                      {trip.remolque_1_id ? (
                        <Badge
                          variant="secondary"
                          className="justify-center border shadow-sm py-1.5 text-xs"
                        >
                          R1: Eco {trip.remolque_1_id}
                        </Badge>
                      ) : null}
                      {trip.dolly_id ? (
                        <Badge
                          variant="secondary"
                          className="justify-center border shadow-sm py-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Dolly: Eco {trip.dolly_id}
                        </Badge>
                      ) : null}
                      {trip.remolque_2_id ? (
                        <Badge
                          variant="secondary"
                          className="justify-center border shadow-sm py-1.5 text-xs"
                        >
                          R2: Eco {trip.remolque_2_id}
                        </Badge>
                      ) : null}
                      {!trip.remolque_1_id && (
                        <span className="text-xs text-slate-400 italic text-center">
                          Sin remolques
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* PANEL DERECHO (TABS) */}
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
                    <History className="h-4 w-4 mr-2" /> Bitácora
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* 🚀 TAB 1: FASES OPERATIVAS */}
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
                      // CONTENEDOR DEL TIMELINE (Alineado a la Izquierda)
                      <div className="relative pl-12 space-y-8 before:absolute before:inset-0 before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
                        {trip.legs.map((leg: TripLeg, index: number) => {
                          const isCompleted =
                            leg.status === "entregado" ||
                            leg.status === "cerrado";
                          const isIncident = [
                            "detenido",
                            "retraso",
                            "accidente",
                          ].includes(leg.status);

                          return (
                            <div key={leg.id} className="relative w-full">
                              {/* MARCADOR CIRCULAR (Izquierda) */}
                              <div
                                className={`absolute -left-12 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow-md z-10 
                                ${isCompleted ? "bg-emerald-100 ring-2 ring-emerald-500" : isIncident ? "bg-red-100 ring-2 ring-red-500 animate-pulse" : "bg-slate-50 ring-2 ring-brand-navy"}`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <span
                                    className={`text-base font-black ${isIncident ? "text-red-600" : "text-brand-navy"}`}
                                  >
                                    {index + 1}
                                  </span>
                                )}
                              </div>

                              {/* TARJETA DE LA FASE (Ancha, ocupando el resto del espacio) */}
                              <Card
                                className={`w-full shadow-md transition-all border-t-4 
                                ${isCompleted ? "border-t-emerald-500 bg-slate-50/50" : isIncident ? "border-t-red-500 bg-red-50/30 ring-1 ring-red-200" : "border-t-brand-navy bg-white hover:shadow-lg"}`}
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
                                      className={`${isCompleted ? "bg-emerald-100 text-emerald-700" : isIncident ? "bg-red-500 text-white" : "bg-blue-100 text-blue-700"} border-0 uppercase font-bold shadow-sm px-3 py-1`}
                                    >
                                      {leg.status.replace("_", " ")}
                                    </Badge>
                                  </div>
                                </CardHeader>

                                {/* 🚀 CONTENIDO DE LA TARJETA (Lado a Lado y de la misma altura) */}
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                                    {/* Izquierda: Recursos */}
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

                                    {/* Derecha: Anticipos */}
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
                                              {leg.anticipo_casetas.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm text-slate-700">
                                            <span>Diésel:</span>
                                            <span className="font-bold font-mono text-slate-900">
                                              $
                                              {leg.anticipo_combustible.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm text-slate-700">
                                            <span>Viáticos:</span>
                                            <span className="font-bold font-mono text-slate-900">
                                              $
                                              {leg.anticipo_viaticos.toLocaleString()}
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
                                              leg.anticipo_casetas +
                                              leg.anticipo_combustible +
                                              leg.anticipo_viaticos
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>

                                {/* BOTONES DE ACCIÓN DIRECTOS */}
                                <CardFooter className="p-4 pt-0 flex gap-3 mt-2">
                                  {!isCompleted ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-1/3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white h-10"
                                        onClick={() =>
                                          onIncidentClick &&
                                          onIncidentClick(trip)
                                        }
                                      >
                                        <AlertTriangle className="h-4 w-4 mr-2" />{" "}
                                        Reportar Falla
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="w-2/3 bg-brand-navy hover:bg-brand-navy/90 text-white shadow-md font-bold h-10"
                                        onClick={() =>
                                          onRelayClick &&
                                          onRelayClick(leg, trip)
                                        }
                                      >
                                        <LinkIcon className="h-4 w-4 mr-2" />{" "}
                                        Concluir y Desenganchar
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="lg"
                                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-md tracking-wide h-12 text-base"
                                      onClick={() =>
                                        onSettleClick &&
                                        onSettleClick(leg, trip)
                                      }
                                    >
                                      <Banknote className="h-5 w-5 mr-3" />{" "}
                                      Liquidar a{" "}
                                      {leg.operator?.name?.split(" ")[0]}
                                    </Button>
                                  )}
                                </CardFooter>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* 🚀 TAB 2: FINANZAS */}
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
                              >
                                Cancelar
                              </Button>
                              <Button
                                className="flex-1 h-12 bg-brand-navy hover:bg-brand-navy/90 text-white text-base"
                                onClick={handleSave}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
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
                                  ${trip.tarifa_base.toLocaleString()}
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

                  {/* 🚀 TAB 3: BITÁCORA */}
                  <TabsContent
                    value="bitacora"
                    className="m-0 focus-visible:outline-none space-y-6"
                  >
                    <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <History className="h-5 w-5 text-brand-navy" />{" "}
                        Historial de Movimientos
                      </h4>
                      <Button
                        className="bg-brand-navy hover:bg-brand-navy/90 shadow-md gap-2"
                        onClick={() =>
                          onUpdateStatusClick && onUpdateStatusClick(trip)
                        }
                      >
                        <Edit2 className="h-4 w-4" /> Registrar Novedad
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
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-slate-200">
                          {allEvents.map((event, idx) => (
                            <div
                              key={event.id || idx}
                              className="relative flex gap-6 items-start"
                            >
                              <div
                                className={`w-6 h-6 rounded-full mt-0.5 ring-4 ring-white shadow-sm shrink-0 z-10 flex items-center justify-center ${event.event_type === "alert" ? "bg-red-500" : "bg-blue-500"}`}
                              >
                                {event.event_type === "alert" ? (
                                  <AlertTriangle className="h-3 w-3 text-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center gap-3 mb-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold border"
                                  >
                                    {event.legName}
                                  </Badge>
                                  <p className="text-xs font-mono font-medium text-slate-400">
                                    {format(
                                      new Date(event.time),
                                      "dd MMM yyyy - HH:mm",
                                      { locale: es },
                                    )}
                                  </p>
                                </div>
                                <p
                                  className={`text-base font-medium mt-1 leading-snug ${event.event_type === "alert" ? "text-red-700" : "text-slate-800"}`}
                                >
                                  {event.event}
                                </p>
                              </div>
                            </div>
                          ))}
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
