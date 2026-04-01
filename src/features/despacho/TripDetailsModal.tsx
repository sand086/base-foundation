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
  Hash,
  Activity,
  ChevronsUpDown,
  PlusCircle,
  Edit2,
  Save,
  FileText,
  Undo,
  Link2Off,
  Container,
  CalendarDays,
  Gauge,
  DollarSign,
  ArrowRightCircle,
  Flag,
  Package,
  FileCode2,
} from "lucide-react";
import { Trip, TripLeg, TripStatus } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import { useUnits } from "@/hooks/useUnits";
import { useBilling } from "@/hooks/useBilling";
import axiosClient from "@/api/axiosClient";
import { cn, checkIsFullTrip } from "@/lib/utils";

// Extendemos TripLeg localmente para enseñarle a TypeScript las propiedades
// y estados (como "liquidado") que manda el backend pero que aún no están en api.types.ts
interface ExtendedTripLeg extends Omit<TripLeg, "status"> {
  status: TripStatus | "liquidado" | string;
  total_anticipos?: number;
  monto_neto_pagado?: number;
  monto_sueldo?: number;
  monto_maniobras?: number;
}

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
  const [isGeneratingNom, setIsGeneratingNom] = useState(false);

  const [localUuid, setLocalUuid] = useState<string | null>(null);
  const [finalUuid, setFinalUuid] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val || 0);

  const isFullTrip = useMemo(() => {
    return checkIsFullTrip(trip);
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
        (l) =>
          !["entregado", "cerrado", "liquidado"].includes(
            String(l.status).toLowerCase(),
          ),
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
          comments: `LLEGADA REGISTRADA: El equipo fue entregado en: ${selectedTerminal}.`,
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

  // 🚀 FUNCIÓN MAESTRA PARA DESCARGAS MÚLTIPLES
  const handleDownloadBothFiles = async (
    uuidToDownload: string,
    isFinal: boolean = false,
  ) => {
    const toastId = toast.loading("Preparando archivos para descarga...");

    try {
      // 1. Descargar PDF
      const resPdf = await axiosClient.get(
        `/billing/invoice/${uuidToDownload}/pdf`,
        { responseType: "blob" },
      );
      const pdfURL = window.URL.createObjectURL(
        new Blob([resPdf.data], { type: "application/pdf" }),
      );
      const pdfLink = document.createElement("a");
      pdfLink.href = pdfURL;
      pdfLink.setAttribute(
        "download",
        `${isFinal ? "CFDI_Final" : "Carta_Porte"}_${uuidToDownload}.pdf`,
      );
      document.body.appendChild(pdfLink);
      pdfLink.click();
      document.body.removeChild(pdfLink);

      // 2. Pausa milimétrica para que el navegador no bloquee el popup
      setTimeout(async () => {
        try {
          const resXml = await axiosClient.get(
            `/billing/invoice/${uuidToDownload}/xml`,
            { responseType: "blob" },
          );
          const xmlURL = window.URL.createObjectURL(
            new Blob([resXml.data], { type: "application/xml" }),
          );
          const xmlLink = document.createElement("a");
          xmlLink.href = xmlURL;
          xmlLink.setAttribute(
            "download",
            `${isFinal ? "CFDI_Final" : "Carta_Porte"}_${uuidToDownload}.xml`,
          );
          document.body.appendChild(xmlLink);
          xmlLink.click();
          document.body.removeChild(xmlLink);

          toast.success("PDF y XML descargados exitosamente.", { id: toastId });
        } catch (error) {
          toast.error("El PDF se descargó, pero hubo un error con el XML.", {
            id: toastId,
          });
        }
      }, 800);
    } catch (error) {
      toast.error("Error al descargar el archivo PDF.", { id: toastId });
    }
  };

  // Función Individual para cuando el usuario hace clic manual
  const handleDownloadXML = async (uuidToDownload: string) => {
    const toastId = toast.loading("Descargando XML...");
    try {
      const res = await axiosClient.get(
        `/billing/invoice/${uuidToDownload}/xml`,
        { responseType: "blob" },
      );
      const xmlURL = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/xml" }),
      );
      const link = document.createElement("a");
      link.href = xmlURL;
      link.setAttribute("download", `CFDI_${uuidToDownload}.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("XML descargado exitosamente.", { id: toastId });
    } catch {
      toast.error("Error al descargar el XML.", { id: toastId });
    }
  };

  const handleDownloadPDF = async (uuidToDownload: string) => {
    const toastId = toast.loading("Descargando PDF...");
    try {
      const res = await axiosClient.get(
        `/billing/invoice/${uuidToDownload}/pdf`,
        { responseType: "blob" },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute("download", `CFDI_${uuidToDownload}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF descargado exitosamente.", { id: toastId });
    } catch {
      toast.error("Error al descargar el PDF.", { id: toastId });
    }
  };

  const handlePrintNOM087 = async () => {
    if (!trip) return;
    setIsGeneratingNom(true);
    const toastId = toast.loading("Generando Bitácora NOM-087...");
    try {
      const res = await axiosClient.get(`/trips/${trip.id}/nom-087`, {
        responseType: "blob",
      });
      const fileURL = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute(
        "download",
        `NOM087_Folio_${trip.public_id || trip.id}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Bitácora NOM-087 descargada exitosamente.", {
        id: toastId,
      });
    } catch (error) {
      toast.error("Error al generar la bitácora NOM-087.", { id: toastId });
    } finally {
      setIsGeneratingNom(false);
    }
  };

  const getRelayButtonUI = (legType: string) => {
    switch (legType) {
      case "carga_muelle":
        return {
          text: "Pasar a Ruta (Despacho)",
          icon: <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-blue-600 hover:bg-blue-700",
        };
      case "ruta_carretera":
        return {
          text: "Relevo (Desenganchar)",
          icon: <Link2Off className="h-3.5 w-3.5 mr-1.5" />,
          color:
            "bg-brand-navy hover:bg-slate-800 dark:bg-blue-800 dark:hover:bg-blue-700",
        };
      case "entrega_vacio":
        return {
          text: "Finalizar Movimiento",
          icon: <Flag className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-emerald-600 hover:bg-emerald-700",
        };
      default:
        return {
          text: "Siguiente Fase",
          icon: <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-brand-navy hover:bg-slate-800",
        };
    }
  };

  if (!trip) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
          {/* HEADER PRINCIPAL */}
          <DialogHeader className="p-6 pb-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />

            {/* Fila 1: Título e Info del Cliente (Alejado de la X de cerrar) */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-start gap-6 pr-10">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-blue-200 dark:border-blue-500/20">
                  <Navigation className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                </div>
                <div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter heading-crisp leading-none">
                    #{trip.public_id || trip.id}{" "}
                    <span className="text-slate-300 dark:text-slate-600 mx-1">
                      |
                    </span>{" "}
                    {trip.route_name}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-2">
                    Cliente:{" "}
                    <span className="text-brand-navy dark:text-blue-300 ml-1">
                      {trip.client?.razon_social}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Fila 2: BREADCRUMB DE RUTA Y EQUIPOS */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-5">
              <div className="flex items-center flex-wrap gap-2 font-black text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest">
                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  {trip.origin}
                </span>
                <span className="text-slate-300 dark:text-slate-600">→</span>
                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                  {trip.destination}
                </span>

                <Badge
                  variant="outline"
                  className="bg-white dark:bg-slate-950 text-brand-navy dark:text-white border-slate-300 dark:border-white/20 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 ml-2"
                >
                  {isFullTrip ? "FULL / 9 EJES" : "SENCILLO / 5 EJES"}
                </Badge>

                {/* CONTENEDORES REALES */}
                {(trip as any).contenedor_1 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <Container className="h-3 w-3" /> C1:{" "}
                    {(trip as any).contenedor_1}
                  </Badge>
                )}

                {(trip as any).contenedor_2 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <Container className="h-3 w-3" /> C2:{" "}
                    {(trip as any).contenedor_2}
                  </Badge>
                )}

                {(trip as any).referencia && (
                  <Badge
                    variant="outline"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <Hash className="h-3 w-3" /> REF: {(trip as any).referencia}
                  </Badge>
                )}
              </div>

              {/* Equipos Asignados */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1">
                  Equipos:
                </span>
                <Badge
                  variant="secondary"
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1"
                >
                  <Truck className="h-3 w-3 text-slate-400" />
                  ECO-{activeLeg?.unit?.numero_economico || "N/A"}
                </Badge>
                {trip.remolque_1 && (
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1"
                  >
                    <Package className="h-3 w-3 text-amber-500" />
                    R1: ECO-{trip.remolque_1.numero_economico}
                  </Badge>
                )}
                {trip.remolque_2 && (
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1"
                  >
                    <Package className="h-3 w-3 text-amber-500" />
                    R2: ECO-{trip.remolque_2.numero_economico}
                  </Badge>
                )}
              </div>
            </div>

            {/* 🚀 Fila 3: BOTONERA DE ACCIONES (Reubicada abajo para no encimarse) */}
            <div className="relative z-10 flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-white/5">
              <Button
                variant="outline"
                className="h-10 px-5 text-[10px] font-black shadow-sm transition-all uppercase tracking-widest bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 haptic-press"
                onClick={handlePrintNOM087}
                disabled={isGeneratingNom}
              >
                {isGeneratingNom ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-500" />
                ) : (
                  <FileText className="h-4 w-4 mr-2 text-slate-500" />
                )}
                Imprimir NOM-087
              </Button>

              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 px-5 text-[10px] font-black shadow-sm transition-all uppercase tracking-widest border-none haptic-press",
                    localUuid
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20",
                  )}
                  onClick={() => {
                    if (localUuid) {
                      handleDownloadBothFiles(localUuid, false);
                    } else {
                      handleStampNominal(trip.id, (responseData) => {
                        const generatedUuid = responseData?.data?.uuid;
                        if (generatedUuid) {
                          setLocalUuid(generatedUuid);
                          handleDownloadBothFiles(generatedUuid, false);
                          toast.success("¡CARTA PORTE BYPASS GENERADA!");
                        }
                        refreshTrips();
                      });
                    }
                  }}
                  disabled={isStamping}
                >
                  {isStamping ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : localUuid ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Activity className="h-4 w-4 mr-2" />
                  )}
                  {localUuid
                    ? "DESCARGAR CP BYPASS ($1)"
                    : "TIMBRAR CP BYPASS ($1)"}
                </Button>

                {localUuid && (
                  <Button
                    variant="outline"
                    className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-none shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    onClick={() => handleDownloadXML(localUuid)}
                  >
                    <FileCode2 className="h-4 w-4 mr-2" /> XML
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* CUERPO TABS */}
          <div className="flex flex-1 overflow-hidden w-full bg-slate-50/50 dark:bg-transparent">
            <div className="w-full flex flex-col bg-transparent">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <div className="px-6 pt-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
                  <TabsList className="grid grid-cols-3 bg-slate-200/50 dark:bg-slate-800/80 h-12 p-1 rounded-xl shadow-sm border border-slate-300/50 dark:border-white/5">
                    <TabsTrigger
                      value="fases"
                      className="text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-2 transition-all"
                    >
                      Fases Operativas
                    </TabsTrigger>
                    <TabsTrigger
                      value="finanzas"
                      className="text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-2 transition-all"
                    >
                      Finanzas
                    </TabsTrigger>
                    <TabsTrigger
                      value="bitacora"
                      className="text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-2 transition-all"
                    >
                      Bitácora Eventos
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 custom-scrollbar">
                  <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
                    {/* TAB: FASES OPERATIVAS */}
                    <TabsContent
                      value="fases"
                      className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" />{" "}
                          Histórico de Relevos y Tramos
                        </p>
                        {trip.legs && trip.legs.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUndoLeg}
                            disabled={isUndoing}
                            className="h-9 text-[9px] font-black text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 uppercase tracking-widest shadow-sm haptic-press"
                          >
                            {isUndoing ? (
                              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            ) : (
                              <Undo className="h-3.5 w-3.5 mr-2" />
                            )}
                            Deshacer Último Movimiento
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {(trip.legs as ExtendedTripLeg[])?.map((leg, idx) => {
                          const btnUI = getRelayButtonUI(leg.leg_type);
                          const isEntregaVacio =
                            leg.leg_type === "entrega_vacio";

                          return (
                            <Card
                              key={leg.id}
                              className={cn(
                                "relative border-l-4 shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-t border-r border-b border-slate-200 dark:border-white/10",
                                leg.id === activeLeg?.id
                                  ? "border-l-emerald-500 ring-1 ring-emerald-500/20"
                                  : "border-l-slate-300 dark:border-l-slate-700 opacity-90",
                              )}
                            >
                              <CardContent className="relative p-0 flex flex-col">
                                <div className="absolute top-4 left-4 pointer-events-none select-none z-0">
                                  <span className="text-5xl md:text-6xl font-black tracking-tighter text-slate-200/70 dark:text-white/5 leading-none">
                                    {String(idx + 1).padStart(2, "0")}
                                  </span>
                                </div>
                                {/* Cabecera de la Fase */}
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                  <div className="space-y-1.5 flex-1">
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      Fase Operativa {idx + 1}{" "}
                                      {leg.id === activeLeg?.id && (
                                        <Badge className="h-4 px-1.5 text-[8px] bg-emerald-500 font-black">
                                          ACTUAL
                                        </Badge>
                                      )}
                                    </p>
                                    <h4 className="font-black text-brand-navy dark:text-white uppercase text-lg tracking-tighter leading-tight">
                                      {leg.leg_type.replace("_", " ")}
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 pt-2">
                                      <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-white/5">
                                        <User className="h-3.5 w-3.5" />{" "}
                                        {leg.operator?.name || "S/A"}
                                      </span>
                                      <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-white/5">
                                        <Truck className="h-3.5 w-3.5" /> ECO-
                                        {leg.unit?.numero_economico || "N/A"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                                    <Badge
                                      className={cn(
                                        "uppercase font-black tracking-widest text-[9px] border-0 px-3 py-1 shadow-sm",
                                        leg.status === "entregado"
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                          : leg.status === "cerrado"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            : leg.status === "liquidado"
                                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                      )}
                                    >
                                      {String(leg.status).replace("_", " ")}
                                    </Badge>

                                    <div className="flex gap-2">
                                      {["creado", "en_transito"].includes(
                                        leg.status,
                                      ) && (
                                        <Button
                                          size="sm"
                                          className={cn(
                                            "h-8 font-black text-[9px] uppercase tracking-widest shadow-lg haptic-press text-white",
                                            btnUI.color,
                                          )}
                                          onClick={() => {
                                            // 🚀 FIX: Si es entrega vacío, no pedimos relevo (NextLeg). Pedimos cerrar terminal.
                                            if (isEntregaVacio) {
                                              setShowTerminalModal(true);
                                            } else if (onRelayClick) {
                                              onRelayClick(
                                                leg as unknown as TripLeg,
                                                trip,
                                              );
                                            }
                                          }}
                                        >
                                          {btnUI.icon}
                                          {btnUI.text}
                                        </Button>
                                      )}
                                      {leg.status === "entregado" &&
                                        onSettleClick && (
                                          <Button
                                            size="sm"
                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 haptic-press"
                                            onClick={() =>
                                              onSettleClick(
                                                leg as unknown as TripLeg,
                                                trip,
                                              )
                                            }
                                          >
                                            <Wallet className="h-3.5 w-3.5 mr-1.5" />
                                            LIQUIDAR OP.
                                          </Button>
                                        )}
                                    </div>
                                  </div>
                                </div>

                                {/* Desglose Info Operativa */}
                                <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30 p-4 px-6 relative z-10">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" />{" "}
                                        Inicio
                                      </Label>
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {leg.start_date
                                          ? format(
                                              new Date(leg.start_date),
                                              "dd MMM yy, HH:mm",
                                              { locale: es },
                                            )
                                          : "Pendiente"}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" /> Fin
                                      </Label>
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {leg.actual_arrival
                                          ? format(
                                              new Date(leg.actual_arrival),
                                              "dd MMM yy, HH:mm",
                                              { locale: es },
                                            )
                                          : "Pendiente"}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <Gauge className="h-3 w-3" /> Odo.
                                        Inicial
                                      </Label>
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {leg.odometro_inicial
                                          ? `${leg.odometro_inicial} km`
                                          : "N/A"}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />{" "}
                                        Anticipos / Vales
                                      </Label>
                                      <p
                                        className={cn(
                                          "text-sm font-mono font-black",
                                          (leg.total_anticipos || 0) > 0
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-slate-700 dark:text-slate-300",
                                        )}
                                      >
                                        {formatCurrency(
                                          leg.total_anticipos || 0,
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Sub-bloque de Liquidación si ya se cerró */}
                                  {leg.status === "liquidado" && (
                                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-wrap gap-6 items-center justify-between shadow-sm">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-emerald-600/80 dark:text-emerald-400/80 tracking-widest">
                                          Total Liquidado a Operador
                                        </span>
                                        <p className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-400">
                                          {formatCurrency(
                                            leg.monto_neto_pagado || 0,
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex gap-6 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col">
                                          <span className="uppercase text-[8px] text-slate-400">
                                            Base / Bono
                                          </span>
                                          <span className="font-mono text-slate-600 dark:text-slate-300">
                                            {formatCurrency(
                                              leg.monto_sueldo || 0,
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="uppercase text-[8px] text-slate-400">
                                            Maniobras
                                          </span>
                                          <span className="font-mono text-slate-600 dark:text-slate-300">
                                            {formatCurrency(
                                              leg.monto_maniobras || 0,
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}

                        {/* Botón de Cierre Manual si se quedó atrapado en ruta */}
                        {trip.status === "en_transito" &&
                          activeLeg?.leg_type === "ruta_carretera" && (
                            <Button
                              variant="outline"
                              className="w-full border-dashed border-2 h-14 bg-white dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/80 mt-6 shadow-sm haptic-press"
                              onClick={() => setShowTerminalModal(true)}
                            >
                              <MapPin className="h-4 w-4 mr-2 text-emerald-500" />{" "}
                              REGISTRAR LLEGADA A TERMINAL (CIERRE DE RUTA)
                            </Button>
                          )}
                      </div>
                    </TabsContent>

                    {/* TAB: FINANZAS */}
                    <TabsContent
                      value="finanzas"
                      className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                      <Card
                        className={cn(
                          "shadow-xl border-2 transition-colors max-w-3xl mx-auto",
                          isEditing
                            ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10"
                            : "border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-900",
                        )}
                      >
                        <CardHeader className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-t-xl">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-500" />{" "}
                            Pre-Factura Comercial (Ingresos)
                          </CardTitle>
                          {!isEditing ? (
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                className="h-9 font-black uppercase tracking-widest text-[9px] shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                              >
                                <History className="h-3.5 w-3.5 mr-1.5" /> Sync
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="h-9 font-black uppercase tracking-widest text-[9px] shadow-md bg-brand-navy hover:bg-slate-800 text-white"
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(false)}
                                className="h-9 font-black uppercase tracking-widest text-[9px]"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveFinanzas}
                                disabled={saving}
                                className="h-9 bg-brand-green hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[9px] shadow-md"
                              >
                                {saving ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Guardar
                              </Button>
                            </div>
                          )}
                        </CardHeader>

                        <CardContent className="p-6 md:p-8">
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-amber-50 dark:bg-amber-950/20 p-6 sm:p-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-inner">
                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-500">
                                  Flete Base Acordado
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-amber-600/50">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    value={tarifaBase}
                                    onChange={(e) =>
                                      setTarifaBase(Number(e.target.value))
                                    }
                                    className="font-mono text-lg font-bold h-12 pl-8 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm"
                                  />
                                </div>
                                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium leading-relaxed">
                                  Ingreso principal pactado con el cliente.
                                  Incluye maniobras extra si aplican.
                                </p>
                              </div>
                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-500">
                                  Reembolso Casetas
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-amber-600/50">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    value={costoCasetas}
                                    onChange={(e) =>
                                      setCostoCasetas(Number(e.target.value))
                                    }
                                    className="font-mono text-lg font-bold h-12 pl-8 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-5 max-w-xl mx-auto">
                              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                                <div className="flex justify-between items-center text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                  <span>Flete Base Acordado:</span>
                                  <span className="font-mono text-brand-navy dark:text-white text-base">
                                    {formatCurrency(finanzasComercial.base)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                  <span>Reembolso Casetas:</span>
                                  <span className="font-mono text-brand-navy dark:text-white text-base">
                                    {formatCurrency(finanzasComercial.casetas)}
                                  </span>
                                </div>
                                <Separator className="my-4 dark:bg-white/10" />
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                  <span>Subtotal:</span>
                                  <span className="font-mono">
                                    {formatCurrency(finanzasComercial.subtotal)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                  <span>IVA (16%):</span>
                                  <span className="font-mono">
                                    {formatCurrency(finanzasComercial.iva)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                  <span>Retención (4%):</span>
                                  <span className="font-mono text-rose-600 dark:text-rose-400">
                                    -{" "}
                                    {formatCurrency(
                                      finanzasComercial.retencion,
                                    )}
                                  </span>
                                </div>

                                <div className="bg-emerald-600 dark:bg-emerald-500 text-white p-5 rounded-xl flex justify-between items-center shadow-lg mt-6 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                    <Wallet className="h-20 w-20" />
                                  </div>
                                  <span className="font-black text-sm uppercase tracking-widest relative z-10">
                                    Total a Facturar:
                                  </span>
                                  <span className="text-3xl font-black font-mono tracking-tighter relative z-10 drop-shadow-md">
                                    {formatCurrency(finanzasComercial.total)}
                                  </span>
                                </div>
                              </div>

                              {/* 🚀 CALL TO ACTION FACTURACIÓN 4.0 */}
                              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 mt-8 shadow-sm">
                                <div className="text-left">
                                  <h4 className="text-brand-navy dark:text-blue-400 font-black text-sm uppercase tracking-tight flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Emisión Factura Ingreso (CFDI 4.0)
                                  </h4>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mt-2">
                                    Genera la factura real del servicio
                                    aplicando Sustitución (04) de la Carta Porte
                                    Bypass.
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant="default"
                                    className={cn(
                                      "font-black px-8 h-12 shadow-xl disabled:opacity-50 uppercase tracking-widest text-[10px] text-white transition-all w-full sm:w-auto haptic-press border-none",
                                      finalUuid
                                        ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
                                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
                                    )}
                                    disabled={
                                      isStamping ||
                                      (!localUuid &&
                                        !finalUuid &&
                                        !trip.uuid_fiscal)
                                    }
                                    onClick={() => {
                                      if (finalUuid) {
                                        handleDownloadBothFiles(
                                          finalUuid,
                                          true,
                                        );
                                      } else {
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
                                          uuidToRelate,
                                          (responseData: any) => {
                                            const generatedFinalUuid =
                                              responseData?.data?.uuid ||
                                              responseData?.uuid;
                                            if (generatedFinalUuid) {
                                              setFinalUuid(generatedFinalUuid);
                                              // 🚀 AUTO-DESCARGA DUAL DE LA 4.0
                                              handleDownloadBothFiles(
                                                generatedFinalUuid,
                                                true,
                                              );
                                            }
                                            refreshTrips();
                                          },
                                        );
                                      }
                                    }}
                                  >
                                    {isStamping ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : finalUuid ? (
                                      <FileText className="h-4 w-4 mr-2" />
                                    ) : (
                                      <Activity className="h-4 w-4 mr-2" />
                                    )}
                                    {finalUuid
                                      ? "Descargar CFDI Final"
                                      : "Timbrar Factura Final"}
                                  </Button>

                                  {finalUuid && (
                                    <Button
                                      variant="outline"
                                      className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-none shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                      onClick={() =>
                                        handleDownloadXML(finalUuid)
                                      }
                                    >
                                      <FileCode2 className="h-3.5 w-3.5 mr-2" />{" "}
                                      Descargar XML (4.0)
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: BITÁCORA */}
                    <TabsContent
                      value="bitacora"
                      className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm max-w-4xl mx-auto">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <History className="h-4 w-4 text-blue-500" /> Línea de
                          Tiempo del Servicio
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 border-brand-navy dark:border-blue-500/50 text-brand-navy dark:text-blue-400 font-black uppercase tracking-widest text-[9px] hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm haptic-press"
                          onClick={() => onUpdateStatusClick?.(trip, activeLeg)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-2" /> Insertar
                          Novedad
                        </Button>
                      </div>

                      {allEvents.length === 0 ? (
                        <div className="text-center py-16 px-6 text-slate-500 bg-white/50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 max-w-4xl mx-auto">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p className="font-black uppercase tracking-widest text-xs">
                            El viaje aún no cuenta con movimientos reportados.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                          {allEvents.map((ev, idx) => (
                            <div
                              key={idx}
                              className="flex gap-4 items-start group bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors shrink-0 border border-slate-100 dark:border-white/5 shadow-inner">
                                <Clock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                      {format(
                                        new Date(ev.time),
                                        "dd MMM, HH:mm",
                                        { locale: es },
                                      ).toUpperCase()}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="text-[8px] uppercase font-black tracking-widest bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 shadow-sm"
                                    >
                                      {ev.legName}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm font-black text-brand-navy dark:text-slate-200 uppercase tracking-tight leading-tight">
                                  {ev.event}
                                </p>
                                {ev.comments && (
                                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-100 dark:border-white/5 mt-3 italic border-l-4 border-l-brand-navy dark:border-l-blue-500 shadow-sm leading-relaxed">
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

      {/* MODAL DE LLEGADA A TERMINAL */}
      <Dialog open={showTerminalModal} onOpenChange={setShowTerminalModal}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl overflow-visible p-0 border-none shadow-2xl bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-t-2xl border-b border-slate-200 dark:border-white/10 relative overflow-hidden z-10 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-emerald-200 dark:border-emerald-500/20">
                <MapPin className="h-7 w-7 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-emerald-700 dark:text-emerald-400 heading-crisp leading-none">
                  Cierre Operativo
                </DialogTitle>
                <DialogDescription className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Registro de entrega de equipo en destino
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
            <div className="space-y-3">
              <Label className="font-black text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-brand-navy dark:text-blue-400" />
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
                    className={cn(
                      "w-full justify-between h-12 text-left font-black uppercase text-xs tracking-tight shadow-sm border-2 transition-all",
                      selectedTerminal
                        ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                    )}
                  >
                    <span className="truncate mr-2">
                      {selectedTerminal || "Buscar o escribir terminal..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-3rem)] sm:w-[380px] p-0 shadow-2xl rounded-xl border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden"
                  align="start"
                >
                  <Command className="bg-transparent">
                    <div className="relative border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800">
                      <CommandInput
                        placeholder="Escribe el nombre..."
                        value={searchTerminalQuery}
                        onValueChange={setSearchTerminalQuery}
                        className="h-11 border-0 focus:ring-0 font-bold text-xs uppercase tracking-tight"
                      />
                    </div>
                    <CommandList className="max-h-[30vh] sm:max-h-[300px] custom-scrollbar">
                      <CommandEmpty className="p-6 text-sm flex flex-col items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest text-center">
                          La terminal no existe en el catálogo
                        </span>
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-[10px] h-10 shadow-lg shadow-emerald-500/20 haptic-press border-none text-white"
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
                          AÑADIR COMO NUEVA
                        </Button>
                      </CommandEmpty>
                      <CommandGroup
                        heading={
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-navy dark:text-blue-400 py-1">
                            Terminales Registradas
                          </div>
                        }
                      >
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
                              className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 uppercase text-xs cursor-pointer border-b border-slate-50 dark:border-white/5 last:border-0"
                            >
                              <CheckCircle2
                                className={cn(
                                  "mr-3 h-4 w-4 shrink-0 transition-all",
                                  selectedTerminal === terminal.nombre
                                    ? "opacity-100 text-emerald-600"
                                    : "opacity-0",
                                )}
                              />
                              <span className="truncate">
                                {terminal.nombre}
                              </span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl p-6 border-t border-slate-200 dark:border-white/10 shrink-0 z-10 rounded-b-2xl">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowTerminalModal(false)}
                className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
                size="lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={submitTerminalArrival}
                disabled={finishingLeg || !selectedTerminal}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 shadow-lg shadow-emerald-500/20 rounded-xl haptic-press uppercase tracking-widest text-[10px] border-none"
                size="lg"
              >
                {finishingLeg ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                CONFIRMAR LLEGADA
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
