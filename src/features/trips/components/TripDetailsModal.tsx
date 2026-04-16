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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Truck,
  User,
  MapPin,
  Fuel,
  Navigation,
  Wallet,
  Clock,
  CheckCircle2,
  History,
  Loader2,
  Hash,
  Activity,
  Edit2,
  Save,
  FileText,
  Undo,
  Container,
  CalendarDays,
  Gauge,
  DollarSign,
  ArrowRightCircle,
  Flag,
  Package,
  FileCode2,
} from "lucide-react";
import { Trip, TripLeg, TripStatus } from "../types";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useUnits } from "@/features/units/hooks/useUnits";
import { useBilling } from "@/features/receivables/hooks/useBilling";
import axiosClient from "@/api/axiosClient";
import { cn, checkIsFullTrip } from "@/lib/utils";

// Extendemos TripLeg localmente
interface ExtendedTripLeg extends Omit<TripLeg, "status"> {
  status: TripStatus | "liquidado" | string;
}

// Helper Para traducir las fases dinámicamente en el Modal
const getDynamicLegStatus = (leg: ExtendedTripLeg) => {
  const status = String(leg.status).toLowerCase();
  const type = leg.leg_type;

  if (status === "creado")
    return {
      label: "ASIGNADO",
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };

  if (status === "en_transito") {
    if (type === "carga_muelle")
      return {
        label: "OPERANDO EN MUELLE",
        color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
      };
    if (type === "ruta_carretera")
      return {
        label: "EN CARRETERA",
        color:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      };
    if (type === "entrega_vacio")
      return {
        label: "RETORNANDO VACÍO",
        color:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      };
  }

  if (status === "entregado") {
    if (type === "carga_muelle")
      return {
        label: "CARGADO EN PATIO",
        color:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      };
    if (type === "ruta_carretera")
      return {
        label: "DESENGANCHADO EN PATIO",
        color:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      };
    if (type === "entrega_vacio")
      return {
        label: "FINALIZADO",
        color:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      };
  }

  if (status === "cerrado")
    return {
      label: "CERRADO",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };
  if (status === "liquidado")
    return {
      label: "LIQUIDADO",
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };

  if (["detenido", "retraso", "accidente"].includes(status))
    return {
      label: status.toUpperCase(),
      color:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 animate-pulse",
    };

  return {
    label: status.replace("_", " ").toUpperCase(),
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
};

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  onRelayClick?: (leg: TripLeg, trip: Trip) => void;
  onSettleClick?: (leg: TripLeg, trip: Trip) => void;
  onIncidentClick?: (trip: Trip) => void;
  onUpdateStatusClick?: (trip: Trip, leg?: TripLeg) => void;
}

export function TripDetailsModal({
  open,
  onOpenChange,
  trip: initialTrip, //  Renombramos la prop
  onRelayClick,
  onSettleClick,
  onUpdateStatusClick,
}: TripDetailsModalProps) {
  // FIX: Cambiamos refreshTrips por fetchTrips para asegurar la sincronización global
  const { editTrip, fetchTrips, addTimelineEvent, unhookTrip } = useTrips();
  const { updateLoadStatus } = useUnits();
  const { isStamping, handleStampNominal, handleStampFinal } = useBilling();

  //  ESTADO LOCAL (La copia independiente de la verdad)
  const [localTrip, setLocalTrip] = useState<Trip | null>(null);

  const [activeTab, setActiveTab] = useState("fases");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tarifaBase, setTarifaBase] = useState(0);
  const [costoCasetas, setCostoCasetas] = useState(0);

  const [finishingLeg, setFinishingLeg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isGeneratingNom, setIsGeneratingNom] = useState(false);
  const [isUnhooking, setIsUnhooking] = useState(false);

  const [localUuid, setLocalUuid] = useState<string | null>(null);
  const [finalUuid, setFinalUuid] = useState<string | null>(null);

  const [showUndoDialog, setShowUndoDialog] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val || 0);

  //  Sincronizar prop inicial con estado local cuando se abre el modal
  useEffect(() => {
    if (open && initialTrip) {
      if (localTrip?.id !== initialTrip.id) {
        setLocalTrip(initialTrip);
      }
    } else if (!open) {
      setLocalTrip(null);
    }
  }, [initialTrip?.id, open]);

  //  FUNCIÓN MAESTRA DE REFRESCO INTERNO
  const refreshLocalTrip = async () => {
    if (!localTrip?.id) return;
    try {
      // 1. Buscamos el viaje actualizado directo en la base de datos
      const res = await axiosClient.get(`/api/logistics/trips/${localTrip.id}`);
      setLocalTrip(res.data);
      // 2. Avisamos al padre (el tablero) que actualice lo suyo en el fondo (AQUI ES CLAVE)
      await fetchTrips();
    } catch (e) {
      console.error("Error recargando viaje local", e);
    }
  };

  const isFullTrip = useMemo(() => {
    return checkIsFullTrip(localTrip);
  }, [localTrip]);

  useEffect(() => {
    if (localTrip) {
      if (!isEditing) {
        setTarifaBase(localTrip.tarifa_base || 0);
        setCostoCasetas(localTrip.costo_casetas || 0);
      }
      if (localTrip.uuid_fiscal || !localUuid) {
        setLocalUuid(localTrip.uuid_fiscal || null);
      }
    }
  }, [localTrip?.id, localTrip?.uuid_fiscal, isEditing]);

  const activeLeg = useMemo(() => {
    if (!localTrip) return undefined;
    const legs = localTrip.legs || [];
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
  }, [localTrip]);

  const allEvents = useMemo(() => {
    if (!localTrip) return [];
    return (
      localTrip.legs
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
  }, [localTrip]);

  const finanzasComercial = useMemo(() => {
    const base = isEditing ? tarifaBase : localTrip?.tarifa_base || 0;
    const casetas = isEditing ? costoCasetas : localTrip?.costo_casetas || 0;
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
  }, [localTrip, isEditing, tarifaBase, costoCasetas]);

  const handleSaveFinanzas = async () => {
    setSaving(true);
    const success = await editTrip(String(localTrip?.id), {
      tarifa_base: Number(tarifaBase),
      costo_casetas: Number(costoCasetas),
    });
    if (success) {
      await refreshLocalTrip();
      setIsEditing(false);
      toast.success("Montos de facturación actualizados.");
    }
    setSaving(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshLocalTrip();
    setIsSyncing(false);
    toast.success("Datos sincronizados.");
  };

  //  DESHACER INTELIGENTE CON RECARGA LOCAL
  const executeUndoLeg = async () => {
    setIsUndoing(true);
    try {
      const isFirstLeg = localTrip?.legs?.length === 1;
      const legs = localTrip?.legs || [];
      const targetLegToLog =
        legs.length > 1 ? legs[legs.length - 2] : activeLeg;

      if (targetLegToLog) {
        await addTimelineEvent(
          String(localTrip?.id),
          targetLegToLog.id,
          {
            status: "retraso",
            location: "Sistema Logístico",
            comments: `⏪ REVERSO OPERATIVO: Se deshizo la fase [${activeLeg?.leg_type.toUpperCase()}]. El viaje retornó al estado previo.`,
          },
          true,
        );
      }

      await axiosClient.post(`/api/logistics/trips/${localTrip?.id}/undo-leg`);

      toast.success(
        isFirstLeg ? "Viaje retornado a Planeador." : "Fase revertida.",
      );

      setShowUndoDialog(false); // Cerramos el dialog rojo

      //  LÓGICA DE CIERRE CONDICIONAL
      if (isFirstLeg) {
        onOpenChange(false); // Si era la única fase, cerramos todo.
        await fetchTrips(); // FIX: recargar tabla padre
      } else {
        await refreshLocalTrip(); // Si quedan fases, repintamos el modal abierto.
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al deshacer la fase.");
    } finally {
      setIsUndoing(false);
    }
  };

  //  FASE 3: ENTREGA DE VACÍO
  const submitEmptyReturn = async () => {
    if (!activeLeg) return; // Quitamos la validación de emptyTerminal
    setFinishingLeg(true);

    try {
      await addTimelineEvent(
        String(localTrip?.id),
        activeLeg.id,
        {
          status: "entregado",
          location: "Patio de Retorno Asignado", // Ya no dependemos del input
          comments: `VIAJE FINALIZADO: Equipo/Contenedor retornado vacío exitosamente.`,
        },
        true,
      );

      if (localTrip?.remolque_1_id)
        await updateLoadStatus(localTrip.remolque_1_id, false);
      if (localTrip?.remolque_2_id)
        await updateLoadStatus(localTrip.remolque_2_id, false);

      toast.success("Viaje concluido y equipo liberado exitosamente.");

      await refreshLocalTrip();
    } catch {
      toast.error("Error al registrar la entrega del vacío.");
    } finally {
      setFinishingLeg(false);
    }
  };

  const handleDownloadBothFiles = async (
    uuidToDownload: string,
    isFinal: boolean = false,
  ) => {
    const toastId = toast.loading("Preparando archivos para descarga...");
    try {
      const resPdf = await axiosClient.get(
        `/billing/invoice/${uuidToDownload}/pdf`,
        { responseType: "blob" },
      );

      // FIX: Adaptable por si tu axiosClient tiene interceptores
      const blobPdf = resPdf.data ? resPdf.data : resPdf;

      // PREVENCIÓN: Si el server mandó un error (JSON), no lo descargues como PDF
      if (blobPdf.type?.includes("json")) throw new Error("PDF no encontrado");

      const pdfURL = window.URL.createObjectURL(
        new Blob([blobPdf], { type: "application/pdf" }),
      );
      const pdfLink = document.createElement("a");
      pdfLink.href = pdfURL;
      pdfLink.setAttribute(
        "download",
        `${isFinal ? "CFDI_Final" : "Carta_Porte"}_${uuidToDownload}.pdf`,
      );
      document.body.appendChild(pdfLink);
      pdfLink.click();
      pdfLink.remove();
      window.URL.revokeObjectURL(pdfURL); // Libera memoria

      setTimeout(async () => {
        try {
          const resXml = await axiosClient.get(
            `/billing/invoice/${uuidToDownload}/xml`,
            { responseType: "blob" },
          );
          const blobXml = resXml.data ? resXml.data : resXml;

          if (blobXml.type?.includes("json"))
            throw new Error("XML no encontrado");

          const xmlURL = window.URL.createObjectURL(
            new Blob([blobXml], { type: "application/xml" }),
          );
          const xmlLink = document.createElement("a");
          xmlLink.href = xmlURL;
          xmlLink.setAttribute(
            "download",
            `${isFinal ? "CFDI_Final" : "Carta_Porte"}_${uuidToDownload}.xml`,
          );
          document.body.appendChild(xmlLink);
          xmlLink.click();
          xmlLink.remove();
          window.URL.revokeObjectURL(xmlURL);

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

  const handleDownloadXML = async (uuidToDownload: string) => {
    const toastId = toast.loading("Descargando XML...");
    try {
      const res = await axiosClient.get(
        `/billing/invoice/${uuidToDownload}/xml`,
        { responseType: "blob" },
      );
      const blobXml = res.data ? res.data : res;

      if (blobXml.type?.includes("json"))
        throw new Error("Archivo no encontrado");

      const xmlURL = window.URL.createObjectURL(
        new Blob([blobXml], { type: "application/xml" }),
      );
      const link = document.createElement("a");
      link.href = xmlURL;
      link.setAttribute("download", `CFDI_${uuidToDownload}.xml`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(xmlURL);

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
      const blobPdf = res.data ? res.data : res;

      if (blobPdf.type?.includes("json"))
        throw new Error("Archivo no encontrado");

      const fileURL = window.URL.createObjectURL(
        new Blob([blobPdf], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute("download", `CFDI_${uuidToDownload}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileURL);

      toast.success("PDF descargado exitosamente.", { id: toastId });
    } catch {
      toast.error("Error al descargar el PDF.", { id: toastId });
    }
  };

  const handlePrintNOM087 = async () => {
    if (!localTrip) return;
    setIsGeneratingNom(true);
    const toastId = toast.loading("Generando Bitácora NOM-087...");
    try {
      const res = await axiosClient.get(
        `/api/logistics/trips/${localTrip.id}/nom-087`,
        {
          responseType: "blob",
        },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute(
        "download",
        `NOM087_Folio_${localTrip.public_id || localTrip.id}.pdf`,
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
          text: "Pasar a Ruta (Dispatch)",
          icon: <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-blue-600 hover:bg-blue-700",
        };
      case "ruta_carretera":
        return {
          text: "Siguiente Fase (Retorno Vacío)",
          icon: <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-orange-600 hover:bg-orange-700 text-white",
        };
      case "entrega_vacio":
        return {
          text: "Finalizar y Liberar Equipo",
          icon: <Flag className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-emerald-600 hover:bg-emerald-700 text-white",
        };
      default:
        return {
          text: "Siguiente Fase",
          icon: <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />,
          color: "bg-brand-navy hover:bg-slate-800",
        };
    }
  };

  if (!localTrip) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] bg-card/95 backdrop-blur-xl border border-border flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
          {/* HEADER PRINCIPAL */}
          <DialogHeader className="p-4 sm:p-6 pb-4 sm:pb-6 bg-card border-b border-border shrink-0 relative z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-start gap-6 pr-10">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-inner shrink-0">
                  <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter heading-crisp leading-none">
                    TRP-{localTrip.public_id || localTrip.id}{" "}
                    <span className="text-slate-300 dark:text-slate-600 mx-1">
                      |
                    </span>{" "}
                    {localTrip.route_name}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-2">
                    Cliente:{" "}
                    <span className="text-brand-navy dark:text-blue-300 ml-1">
                      {localTrip.client?.razon_social}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-5">
              <div className="flex items-center flex-wrap gap-2 font-black text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest">
                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  {localTrip.origin}
                </span>
                <span className="text-slate-300 dark:text-slate-600">→</span>
                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                  {localTrip.destination}
                </span>

                <Badge
                  variant="outline"
                  className="bg-white dark:bg-slate-950 text-brand-navy dark:text-white border-slate-300 dark:border-white/20 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 ml-2"
                >
                  {isFullTrip ? "FULL / 9 EJES" : "SENCILLO / 5 EJES"}
                </Badge>

                {(localTrip as any).contenedor_1 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <Container className="h-3 w-3" /> C1:{" "}
                    {(localTrip as any).contenedor_1}
                  </Badge>
                )}

                {(localTrip as any).contenedor_2 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <Container className="h-3 w-3" /> C2:{" "}
                    {(localTrip as any).contenedor_2}
                  </Badge>
                )}

                {(localTrip as any).referencia && (
                  <Badge
                    variant="outline"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm font-black tracking-widest text-[9px] px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <Hash className="h-3 w-3" /> REF:{" "}
                    {(localTrip as any).referencia}
                  </Badge>
                )}
              </div>

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
                {localTrip.remolque_1 && (
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1"
                  >
                    <Package className="h-3 w-3 text-amber-500" />
                    R1: ECO-{localTrip.remolque_1.numero_economico}
                  </Badge>
                )}
                {localTrip.remolque_2 && (
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1"
                  >
                    <Package className="h-3 w-3 text-amber-500" />
                    R2: ECO-{localTrip.remolque_2.numero_economico}
                  </Badge>
                )}
              </div>
            </div>

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
                      handleDownloadPDF(localUuid);
                    } else {
                      handleStampNominal(localTrip.id, async (responseData) => {
                        const generatedUuid = responseData?.data?.uuid;
                        if (generatedUuid) {
                          setLocalUuid(generatedUuid);
                          handleDownloadBothFiles(generatedUuid, false);
                          toast.success(
                            "¡CARTA PORTE BYPASS GENERADA Y DESCARGADA!",
                          );
                        }
                        await refreshLocalTrip();
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
                    ? "Descargar Carta Porte (PDF)"
                    : "Timbrar CP Bypass ($1)"}
                </Button>

                {localUuid && (
                  <Button
                    variant="outline"
                    className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-none shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 haptic-press"
                    onClick={() => handleDownloadXML(localUuid)}
                  >
                    <FileCode2 className="h-3.5 w-3.5 mr-2" />
                    Descargar XML
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* CUERPO TABS */}
          <div className="flex flex-1 overflow-hidden w-full bg-muted/30 dark:bg-transparent">
            <div className="w-full flex flex-col bg-transparent">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <div className="px-4 sm:px-6 pt-5 border-b border-border bg-card/50 backdrop-blur-md overflow-x-auto">
                  <TabsList className="grid grid-cols-3 bg-muted/50 h-12 p-1 rounded-xl shadow-sm border border-border">
                    <TabsTrigger
                      value="fases"
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-full px-2 transition-all"
                    >
                      Fases Operativas
                    </TabsTrigger>
                    <TabsTrigger
                      value="finanzas"
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-full px-2 transition-all"
                    >
                      Finanzas
                    </TabsTrigger>
                    <TabsTrigger
                      value="bitacora"
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-full px-2 transition-all"
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
                        {localTrip.legs && localTrip.legs.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowUndoDialog(true)}
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
                        {(localTrip.legs as ExtendedTripLeg[])?.map(
                          (leg, idx) => {
                            const btnUI = getRelayButtonUI(leg.leg_type);
                            const activeFuelLogs =
                              leg.fuel_logs?.filter(
                                (log: any) => log.record_status !== "E",
                              ) || [];

                            return (
                              <Card
                                key={leg.id}
                                className={cn(
                                  "relative border-l-4 shadow-sm overflow-hidden bg-card border-t border-r border-b border-slate-200 dark:border-white/10",
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
                                      {/* INYECCIÓN NUEVA: VALES DE COMBUSTIBLE */}
                                      {activeFuelLogs.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-white/10">
                                          <p className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                                            <Fuel className="h-3 w-3" /> Vales
                                            de Combustible Asociados (
                                            {activeFuelLogs.length})
                                          </p>
                                          <div className="space-y-1.5">
                                            {activeFuelLogs.map(
                                              (log: any, i: number) => (
                                                <div
                                                  key={log.id || i}
                                                  className="flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1.5 rounded border border-amber-100 dark:border-amber-900/30"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[9px] font-bold text-slate-500">
                                                      #{log.id}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                                                      {log.estacion}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className="font-mono font-black text-[10px] text-amber-700 dark:text-amber-400">
                                                      {log.litros?.toFixed(1)} L
                                                    </span>
                                                    <span className="font-mono font-bold text-[10px] text-slate-600 dark:text-slate-400">
                                                      $
                                                      {log.total?.toLocaleString(
                                                        "es-MX",
                                                        {
                                                          minimumFractionDigits: 2,
                                                        },
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col sm:items-end gap-3 shrink-0">
                                      {(() => {
                                        const statusConfig =
                                          getDynamicLegStatus(
                                            leg as ExtendedTripLeg,
                                          );
                                        return (
                                          <Badge
                                            className={cn(
                                              "uppercase font-black tracking-widest text-[9px] border-0 px-3 py-1 shadow-sm",
                                              statusConfig.color,
                                            )}
                                          >
                                            {statusConfig.label}
                                          </Badge>
                                        );
                                      })()}
                                      <div className="flex flex-col gap-3">
                                        {/* SI ES ENTREGA DE VACÍO: Mostramos Input + Botón Finalizar */}
                                        {leg.id === activeLeg?.id &&
                                        leg.leg_type === "entrega_vacio" &&
                                        ![
                                          "entregado",
                                          "liquidado",
                                          "cerrado",
                                        ].includes(leg.status) ? (
                                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                            <Button
                                              size="sm"
                                              disabled={finishingLeg}
                                              onClick={submitEmptyReturn}
                                              className="w-full sm:w-auto h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 haptic-press border-none"
                                            >
                                              {finishingLeg ? (
                                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                              ) : (
                                                <Flag className="h-4 w-4 mr-2" />
                                              )}
                                              Finalizar y Liberar Equipo
                                            </Button>
                                          </div>
                                        ) : (
                                          /* SI ES CUALQUIER OTRA FASE: Botones Dinámicos */
                                          /* SI ES CUALQUIER OTRA FASE: Botones Dinámicos */
                                          <div className="flex flex-wrap gap-2">
                                            {/* 1. BOTÓN DE SIGUIENTE FASE / PASAR A RUTA */}
                                            {/* FIX: Agregamos "entregado" y "detenido" para que NO desaparezca tras desenganchar */}
                                            {[
                                              "creado",
                                              "en_transito",
                                              "entregado",
                                              "detenido",
                                            ].includes(leg.status) &&
                                              leg.leg_type !==
                                                "entrega_vacio" && (
                                                <Button
                                                  size="sm"
                                                  className={cn(
                                                    "h-8 font-black text-[9px] uppercase tracking-widest shadow-lg haptic-press text-white",
                                                    btnUI.color,
                                                  )}
                                                  disabled={
                                                    finishingLeg || isUnhooking
                                                  }
                                                  onClick={() => {
                                                    onOpenChange(false);
                                                    onRelayClick?.(
                                                      leg as any,
                                                      localTrip!,
                                                    );
                                                  }}
                                                >
                                                  {finishingLeg ? (
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                  ) : (
                                                    btnUI.icon
                                                  )}
                                                  {btnUI.text}
                                                </Button>
                                              )}

                                            {/* 2. BOTÓN DE DESENGANCHAR EN PATIO */}
                                            {/* Este SÍ desaparece después de usarse para no duplicar desenganches */}
                                            {leg.leg_type === "carga_muelle" &&
                                              [
                                                "creado",
                                                "en_transito",
                                              ].includes(leg.status) && (
                                                <Button
                                                  size="sm"
                                                  className="h-8 bg-purple-600 hover:bg-purple-700 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-purple-500/20 haptic-press border-none"
                                                  disabled={
                                                    finishingLeg || isUnhooking
                                                  }
                                                  onClick={async () => {
                                                    setIsUnhooking(true);
                                                    const success =
                                                      await unhookTrip(
                                                        String(localTrip.id),
                                                      );
                                                    if (success) {
                                                      await fetchTrips();
                                                      onOpenChange(false);
                                                    }
                                                    setIsUnhooking(false);
                                                  }}
                                                >
                                                  {isUnhooking ? (
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                  ) : (
                                                    <Container className="h-3.5 w-3.5 mr-1.5" />
                                                  )}
                                                  Desenganchar Carga
                                                </Button>
                                              )}

                                            {/* 3. BOTÓN DE LIQUIDAR OP. */}
                                            {leg.status === "entregado" &&
                                              onSettleClick && (
                                                <Button
                                                  size="sm"
                                                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase shadow-lg shadow-emerald-500/20"
                                                  onClick={() => {
                                                    onOpenChange(false);
                                                    onSettleClick(
                                                      leg as any,
                                                      localTrip!,
                                                    );
                                                  }}
                                                >
                                                  <Wallet className="h-3.5 w-3.5 mr-1.5" />{" "}
                                                  LIQUIDAR OP.
                                                </Button>
                                              )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30 p-4 px-6 relative z-10">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                          <CalendarDays className="h-3 w-3" />{" "}
                                          Inicio
                                        </Label>
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                          {leg.start_date
                                            ? format(
                                                new Date(leg.start_date),
                                                "dd MMM yy, HH:mm",
                                                { locale: es },
                                              )
                                            : "Pendiente"}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                          <CalendarDays className="h-3 w-3" />{" "}
                                          Fin
                                        </Label>
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                          {leg.actual_arrival
                                            ? format(
                                                new Date(leg.actual_arrival),
                                                "dd MMM yy, HH:mm",
                                                { locale: es },
                                              )
                                            : "Pendiente"}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                          <Gauge className="h-3 w-3" /> Odo.
                                          Inicial
                                        </Label>
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                          {leg.odometro_inicial
                                            ? `${leg.odometro_inicial} km`
                                            : "N/A"}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />{" "}
                                          Anticipos / Vales
                                        </Label>
                                        {(() => {
                                          // Parche visual
                                          const displayAnticipos =
                                            leg.leg_type === "entrega_vacio"
                                              ? Math.max(
                                                  0,
                                                  (leg.total_anticipos || 0) -
                                                    (leg.anticipo_casetas || 0),
                                                )
                                              : leg.total_anticipos || 0;

                                          return (
                                            <p
                                              className={cn(
                                                "text-sm font-mono font-black",
                                                displayAnticipos > 0
                                                  ? "text-amber-600 dark:text-amber-400"
                                                  : "text-slate-700 dark:text-slate-300",
                                              )}
                                            >
                                              {formatCurrency(displayAnticipos)}
                                            </p>
                                          );
                                        })()}
                                      </div>
                                    </div>
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
                          },
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
                                )}{" "}
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
                                    className="font-mono text-lg font-bold h-12 pl-8 bg-card border-amber-200 dark:border-amber-900/50 shadow-sm text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium leading-relaxed">
                                  Ingreso principal pactado con el cliente.
                                  Incluye maniobras extra si aplican.
                                </div>
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
                                    className="font-mono text-lg font-bold h-12 pl-8 bg-card border-amber-200 dark:border-amber-900/50 shadow-sm text-slate-800 dark:text-slate-100"
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
                              <div className="bg-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 mt-8 shadow-sm">
                                <div className="text-left">
                                  <h4 className="text-brand-navy dark:text-blue-400 font-black text-sm uppercase tracking-tight flex items-center gap-2">
                                    <FileText className="h-5 w-5" /> Emisión
                                    Factura Ingreso (CFDI 4.0)
                                  </h4>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mt-2">
                                    Genera la factura real del servicio
                                    aplicando Sustitución (04) de la Carta Porte
                                    Bypass.
                                  </div>
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
                                        !localTrip.uuid_fiscal)
                                    }
                                    onClick={() => {
                                      if (finalUuid) {
                                        handleDownloadBothFiles(
                                          finalUuid,
                                          true,
                                        );
                                      } else {
                                        const uuidToRelate =
                                          localUuid || localTrip.uuid_fiscal;
                                        if (!uuidToRelate) {
                                          toast.error(
                                            "Error: No se encontró el UUID de la Carta Porte original.",
                                          );
                                          return;
                                        }
                                        handleStampFinal(
                                          localTrip.id,
                                          uuidToRelate,
                                          async (responseData: any) => {
                                            const generatedFinalUuid =
                                              responseData?.data?.uuid ||
                                              responseData?.uuid;
                                            if (generatedFinalUuid) {
                                              setFinalUuid(generatedFinalUuid);
                                              handleDownloadBothFiles(
                                                generatedFinalUuid,
                                                true,
                                              );
                                            }
                                            await refreshLocalTrip();
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
                      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm max-w-4xl mx-auto">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <History className="h-4 w-4 text-blue-500" /> Línea de
                          Tiempo del Servicio
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 border-brand-navy dark:border-blue-500/50 text-brand-navy dark:text-blue-400 font-black uppercase tracking-widest text-[9px] hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm haptic-press"
                          onClick={() =>
                            onUpdateStatusClick?.(localTrip, activeLeg)
                          }
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-2" /> Insertar
                          Novedad
                        </Button>
                      </div>

                      {allEvents.length === 0 ? (
                        <div className="text-center py-16 px-6 text-slate-500 bg-white/50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 max-w-4xl mx-auto">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <div className="font-black uppercase tracking-widest text-xs">
                            El viaje aún no cuenta con movimientos reportados.
                          </div>
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

      {/* ALERT DIALOG PARA DESHACER FASE */}
      <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden shadow-2xl rounded-2xl bg-card/95 backdrop-blur-xl border border-border">
          <AlertDialogHeader className="p-6 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800/30">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-800/50 flex items-center justify-center shadow-inner border border-rose-200 dark:border-rose-700">
                <Undo className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-left">
                <AlertDialogTitle className="text-xl font-black text-rose-800 dark:text-rose-400 uppercase tracking-tighter">
                  Reversión Operativa
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-rose-600/70 dark:text-rose-500 mt-1">
                  Deshacer último movimiento
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-6 space-y-5">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              {localTrip?.legs?.length === 1
                ? "¿Estás seguro de deshacer esta fase? Al ser la primera, el viaje completo regresará a la bandeja de Planeador (Stand-by) y se liberarán los recursos."
                : "¿Estás seguro de deshacer la última fase? El camión y operador de la fase previa volverán a estar activos en la ruta y se borrará este tramo."}
            </p>
          </div>
          <AlertDialogFooter className="p-6 bg-muted/50 border-t border-slate-200 dark:border-white/10">
            <AlertDialogCancel
              onClick={() => setShowUndoDialog(false)}
              disabled={isUndoing}
              className="h-11 font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeUndoLeg();
              }}
              disabled={isUndoing}
              className="h-11 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] shadow-md border-none haptic-press"
            >
              {isUndoing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Undo className="h-4 w-4 mr-2" />
              )}{" "}
              Confirmar Reverso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
