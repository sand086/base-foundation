import * as React from "react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  EnhancedDataTable,
  type ColumnDef,
} from "@/components/ui/enhanced-data-table";

import {
  Fuel,
  FileText,
  Gauge,
  Loader2,
  Search,
  CheckCircle,
  Calculator,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  History,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  XCircle,
  Save,
  AlertTriangle,
  ShieldCheck,
  Truck,
  MapPin,
  Calendar,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import axiosClient from "@/api/axiosClient";

// ============================================================================
// INTERFACES
// ============================================================================
interface AuditFormData {
  litrosVales: string;
  kilometrosECM: string;
  litrosECM: string;
  odometroFinal: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL: AUDITORÍA Y CONCILIACIÓN OPERATIVA
// ============================================================================
export default function FuelConciliation() {
  const { trips, fetchTrips } = useTrips();

  const { valueAsNumber: tolerancePct, isLoading: loadingTol } =
    useSystemConfig("tolerancia_diesel_pct");
  const { valueAsNumber: rendimientoConfig, isLoading: loadingRend } =
    useSystemConfig("rendimiento_diesel_esperado");

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedLegId, setSelectedLegId] = useState<string>("");

  const [formData, setFormData] = useState<AuditFormData>({
    litrosVales: "0",
    kilometrosECM: "",
    litrosECM: "",
    odometroFinal: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingVales, setIsFetchingVales] = useState(false);

  // Estados de Modales y Edición
  const [legToReset, setLegToReset] = useState<string | null>(null);
  const [legToView, setLegToView] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  //  HISTÓRICO DE AUDITORÍAS: Filtramos los tramos que ya tienen un odómetro final capturado
  const auditedLegs = useMemo(() => {
    return trips
      .flatMap((t) => t.legs?.map((l) => ({ ...l, trip: t })) || [])
      .filter((l) => l.odometro_final != null && l.odometro_final > 0)
      .sort(
        (a, b) =>
          new Date(b.last_update || 0).getTime() -
          new Date(a.last_update || 0).getTime(),
      );
  }, [trips]);

  // Selección Activa
  const activeTrip = useMemo(() => {
    return trips.find((t) => String(t.id) === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const tripLegs = useMemo(() => activeTrip?.legs || [], [activeTrip]);
  const activeLeg = useMemo(
    () => tripLegs.find((l) => String(l.id) === selectedLegId) || null,
    [tripLegs, selectedLegId],
  );

  const tripData = useMemo(() => {
    if (!activeTrip || !activeLeg) return null;
    return {
      cartaPorteId: activeTrip.public_id || `TRP-${activeTrip.id}`,
      unidadId: activeLeg?.unit?.numero_economico || "S/N",
      ruta: `${activeTrip.origin} ➔ ${activeTrip.destination}`,
      operador: activeLeg?.operator?.name || "Sin Operador Asignado",
      configuracion: activeTrip.dolly_id ? "FULL" : "SENC",
      fechaViaje: activeTrip.start_date
        ? new Date(activeTrip.start_date).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A",
      fase: activeLeg.leg_type.replace("_", " ").toUpperCase(),
    };
  }, [activeTrip, activeLeg]);

  //  OBTENER VALES DEL TRAMO DESDE LA BD
  const fetchValesCombustible = async (legIdToFetch: string) => {
    setIsFetchingVales(true);
    try {
      const response = await axiosClient.get("/api/fleet/fuel-logs");

      const valesDiesel = response.data.filter((log: any) => {
        return (
          log.tipo_combustible === "diesel" &&
          String(log.trip_leg_id) === String(legIdToFetch) &&
          log.record_status === "A"
        );
      });

      const totalVales = valesDiesel.reduce(
        (sum: number, log: any) => sum + Number(log.litros),
        0,
      );

      setFormData((prev) => ({
        ...prev,
        litrosVales: totalVales.toString(),
      }));

      if (totalVales > 0) {
        toast.success("Suministro Sincronizado", {
          description: `Se detectaron ${totalVales.toFixed(2)} L en vales.`,
        });
      } else {
        toast.info("Sin vales detectados", {
          description: `El tramo no tiene vales (Probable movimiento de patio).`,
        });
      }
    } catch (error) {
      console.error("Error obteniendo vales:", error);
      toast.error("Error de Sincronización");
    } finally {
      setIsFetchingVales(false);
    }
  };

  const handleTripSelect = (id: string) => {
    setSelectedTripId(id);
    setSelectedLegId("");
    setIsEditing(false);
    setFormData({
      litrosVales: "0",
      kilometrosECM: "",
      litrosECM: "",
      odometroFinal: "",
    });
  };

  const handleLegSelect = async (legId: string) => {
    setSelectedLegId(legId);
    setIsEditing(false);
    setFormData({
      litrosVales: "0",
      kilometrosECM: "",
      litrosECM: "",
      odometroFinal: "",
    });

    await fetchValesCombustible(legId);
  };

  //  CARGAR PARA EDITAR CON EXTRACCIÓN (Regex)
  const handleEditAudit = async (leg: any) => {
    setSelectedTripId(String(leg.trip_id));
    setSelectedLegId(String(leg.id));
    setIsEditing(true);

    const auditEvent = leg.timeline_events?.find(
      (e: any) =>
        e.location === "Conciliación de Combustible" ||
        e.comments?.includes("Auditoría Fase"),
    );

    let kmEcmVal = "";
    let ltEcmVal = "";

    if (auditEvent && auditEvent.comments) {
      const kmMatch = auditEvent.comments.match(/Km ECM:\s*([\d.]+)/);
      const ltMatch = auditEvent.comments.match(/Litros ECM:\s*([\d.]+)/);

      if (kmMatch) kmEcmVal = kmMatch[1];
      if (ltMatch) ltEcmVal = ltMatch[1];
    }

    setFormData({
      litrosVales: "0",
      kilometrosECM: kmEcmVal,
      litrosECM: ltEcmVal,
      odometroFinal: String(leg.odometro_final || ""),
    });

    await fetchValesCombustible(String(leg.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    handleReset();
  };

  //  ELIMINAR / REVERTIR AUDITORÍA
  const handleResetAudit = async () => {
    if (!legToReset) return;
    const toastId = toast.loading("Revirtiendo auditoría...");

    try {
      await axiosClient.post(`/legs/${legToReset}/reset-audit`);
      toast.success("Auditoría Revertida", {
        id: toastId,
        description: "El tramo ha vuelto a estatus pendiente.",
      });
      await fetchTrips();
    } catch (error) {
      toast.error("Error al revertir", {
        id: toastId,
        description: "Hubo un problema comunicándose con el servidor.",
      });
    } finally {
      setLegToReset(null);
    }
  };

  //  LA MATEMÁTICA EXACTA DE GUSTAVO (Blindada contra División por Cero en Patios)
  const auditResult = useMemo(() => {
    const litrosVales = Number(formData.litrosVales) || 0;
    const kmECM = Number(formData.kilometrosECM) || 0;
    const litrosECM = Number(formData.litrosECM) || 0;

    // Evitar Infinity. Si es patio y ponen 0, el rendimiento es 0.
    const rendimientoECM = litrosECM > 0 ? kmECM / litrosECM : 0;
    const rendimientoReal = litrosVales > 0 ? kmECM / litrosVales : 0;

    // Diferencia = Lo que dice el camión - Lo que dice el recibo del despachador
    const diferenciaLitros = litrosECM - litrosVales;
    const toleranciaPermitida = litrosECM * (tolerancePct || 0.05);

    let estatus: "CONCILIADO" | "COBRO_OPERADOR" = "CONCILIADO";
    let esRoboSospechado = false;

    // Si cargó más en bomba de lo que el camión justifica (y excede la tolerancia)
    if (
      diferenciaLitros < 0 &&
      Math.abs(diferenciaLitros) > toleranciaPermitida
    ) {
      estatus = "COBRO_OPERADOR";
      esRoboSospechado = true;
    }

    return {
      litrosVales,
      kmECM,
      litrosECM,
      rendimientoECM,
      rendimientoReal,
      diferenciaLitros,
      toleranciaPermitida,
      estatus,
      esRoboSospechado,
    };
  }, [formData, tolerancePct]);

  const handleInputChange = (field: keyof AuditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setSelectedTripId("");
    setSelectedLegId("");
    setIsEditing(false);
    setFormData({
      litrosVales: "0",
      kilometrosECM: "",
      litrosECM: "",
      odometroFinal: "",
    });
  };

  //  GUARDAR AUDITORÍA Y VOLVER A LA TABLA
  const handleAuthorizeAndClose = async () => {
    if (!activeTrip || !selectedLegId) return;

    if (!formData.odometroFinal) {
      toast.error("Falta Odómetro Final", {
        description:
          "Debe ingresar el Odómetro Final de la unidad para cerrar la auditoría.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const kmECM = auditResult?.kmECM || formData.kilometrosECM || 0;
      const ltECM = auditResult?.litrosECM || formData.litrosECM || 0;
      const vales = auditResult?.litrosVales || formData.litrosVales || 0;
      const rReal = auditResult?.rendimientoReal || 0;
      const est = auditResult?.estatus || "CONCILIADO";
      const isRobo = auditResult?.esRoboSospechado || false;

      await axiosClient.post(
        `/api/logistics/trips/${selectedTripId}/timeline`,
        {
          status: isRobo ? "incidencia" : "info",
          location: "Conciliación de Combustible",
          comments: `Auditoría Fase. Km ECM: ${kmECM}. Litros ECM: ${ltECM}. Vales: ${vales}. Rend Real: ${rReal.toFixed(2)} km/L. Ver: ${est}.`,
          odometro: Number(formData.odometroFinal),
          combustible_litros: vales,
        },
      );

      toast.success(
        isEditing ? "Auditoría Actualizada" : "Auditoría Registrada",
        {
          description:
            "Se aplicará automáticamente en la Liquidación del chofer.",
        },
      );

      await fetchTrips();
      handleReset();
    } catch (error) {
      console.error("Error al conciliar:", error);
      toast.error("Error de Servidor", {
        description: "No se pudo guardar el veredicto.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  //  EXTRACCIÓN DE DATOS PARA EL MODAL DE VISTA (Regex Avanzado)
  const parsedAuditDetails = useMemo(() => {
    if (!legToView) return null;
    const auditEvent = legToView.timeline_events?.find(
      (e: any) =>
        e.location === "Conciliación de Combustible" ||
        e.comments?.includes("Auditoría Fase"),
    );
    const text = auditEvent?.comments || "";

    const kmMatch = text.match(/Km ECM:\s*([\d.]+)/);
    const ltEcmMatch = text.match(/Litros ECM:\s*([\d.]+)/);
    const valesMatch = text.match(/Vales:\s*([\d.]+)/);
    const rendMatch = text.match(/Rend Real:\s*([\d.]+)/);
    const verMatch = text.match(/Ver:\s*([A-Z_]+)/);

    return {
      km: kmMatch ? kmMatch[1] : "0",
      ltEcm: ltEcmMatch ? ltEcmMatch[1] : "0",
      vales: valesMatch ? valesMatch[1] : "0",
      rend: rendMatch ? rendMatch[1] : "0.00",
      veredicto: verMatch ? verMatch[1] : "N/A",
      textOriginal: text,
      fechaAudit: auditEvent?.time
        ? new Date(auditEvent.time).toLocaleString("es-MX")
        : "N/A",
    };
  }, [legToView]);

  // Columnas para la tabla
  const auditedColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        key: "last_update",
        header: "Fecha Auditoría",
        render: (v) => (
          <span className="text-xs font-mono text-slate-500">
            {new Date(String(v)).toLocaleDateString("es-MX")}
          </span>
        ),
      },
      {
        key: "trip",
        header: "Folio",
        render: (trip: any) => (
          <span className="font-bold text-brand-navy dark:text-white">
            {trip?.public_id || `TRP-${trip?.id}`}
          </span>
        ),
      },
      {
        key: "leg_type",
        header: "Fase",
        render: (v: string) => (
          <Badge
            variant="outline"
            className="bg-slate-50 dark:bg-white/5 uppercase text-[9px] tracking-widest text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
          >
            {v?.replace("_", " ")}
          </Badge>
        ),
      },
      {
        key: "operator",
        header: "Operador",
        render: (op: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
            {op?.name || "N/A"}
          </span>
        ),
      },
      {
        key: "odometro_final",
        header: "Odo Final",
        render: (v: number) => (
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
            {v?.toLocaleString() || 0} km
          </span>
        ),
      },
      {
        key: "status",
        header: "Estatus",
        render: (v: string) => {
          const cerrado = ["entregado", "cerrado", "liquidado"].includes(
            String(v).toLowerCase(),
          );
          return (
            <Badge
              className={cn(
                "border-none tracking-widest text-[9px] uppercase",
                cerrado
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
              )}
            >
              {cerrado ? "CERRADO" : "EN CURSO"}
            </Badge>
          );
        },
      },
      {
        key: "acciones",
        header: "",
        sortable: false,
        render: (_, row) => {
          const isLiquidado = row.status === "liquidado";

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <MoreVertical
                    size={16}
                    className="text-slate-500 dark:text-slate-400"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl p-1"
              >
                <DropdownMenuItem
                  onClick={() => setLegToView(row)}
                  className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <Eye className="h-3.5 w-3.5 mr-2 text-slate-400" /> Ver
                  Detalles
                </DropdownMenuItem>

                {!isLiquidado && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
                    <DropdownMenuItem
                      onClick={() => handleEditAudit(row)}
                      className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Editar /
                      Recalcular
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-500/10 font-bold uppercase text-[10px] py-2.5 px-3 rounded-lg cursor-pointer"
                      onClick={() => setLegToReset(String(row.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar Auditoría
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [trips],
  );

  return (
    <div className="p-4 md:p-8 space-y-6 bg-[#F8FAFC] dark:bg-brand-navy min-h-screen animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <PageHeader
          title="Conciliacion Operativa"
          description="Conciliación de combustible físico (Vales) vs Computadora (ECM)."
          className="mb-0"
        />
      </div>

      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        {/* COMPACT LAYOUT: Selectores + Configuración juntos */}
        <Card
          className={cn(
            "shadow-sm border-slate-200 dark:border-white/10 dark:bg-slate-900 transition-all",
            isEditing && "border-blue-500 ring-2 ring-blue-500/20",
          )}
        >
          <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-sm">Panel de Selección</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Badge
                variant="outline"
                className="border-slate-200 dark:border-white/10"
              >
                Tol:{" "}
                {loadingTol ? (
                  <Loader2 className="h-2 w-2 animate-spin" />
                ) : (
                  `${((tolerancePct || 0.05) * 100).toFixed(0)}%`
                )}
              </Badge>
              <Badge
                variant="outline"
                className="border-slate-200 dark:border-white/10"
              >
                Ref:{" "}
                {loadingRend ? (
                  <Loader2 className="h-2 w-2 animate-spin" />
                ) : (
                  `${rendimientoConfig || 3.2} km/L`
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                1. Buscar Viaje:
              </Label>
              <Select
                value={selectedTripId}
                onValueChange={handleTripSelect}
                disabled={isEditing}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 font-bold text-xs h-10 shadow-sm">
                  <SelectValue placeholder="Seleccione viaje..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {trips
                    .filter(
                      (t) => String(t.status).toLowerCase() !== "liquidado",
                    )
                    .map((t) => {
                      const clientName =
                        t.client?.razon_social || "Sin Cliente";
                      const config = t.dolly_id ? "FULL" : "SENC";
                      return (
                        <SelectItem
                          key={t.id}
                          value={String(t.id)}
                          className="text-xs"
                        >
                          {t.public_id || t.id} • {clientName} • {config} •{" "}
                          {t.origin}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                2. Seleccionar Fase / Tramo:
              </Label>
              <Select
                value={selectedLegId}
                onValueChange={handleLegSelect}
                disabled={!selectedTripId || isEditing}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 font-bold text-xs h-10 shadow-sm">
                  <SelectValue placeholder="Seleccione tramo..." />
                </SelectTrigger>
                <SelectContent>
                  {tripLegs.map((leg) => (
                    <SelectItem
                      key={leg.id}
                      value={String(leg.id)}
                      className="text-xs"
                    >
                      {leg.leg_type.replace("_", " ").toUpperCase()} | Op:{" "}
                      {leg.operator?.name || "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/*  INFO DEL VIAJE (VIAJE EN CAPTURA) - Diseño Compacto y Elegante */}
        {tripData && (
          <div className="bg-slate-900 dark:bg-black rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-white shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <Truck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">
                  Viaje en Captura • Fase {tripData.fase}
                </p>
                <p className="text-sm font-bold tracking-tight">
                  {tripData.cartaPorteId} • {tripData.ruta}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-6 text-xs font-medium bg-white/5 py-2.5 px-5 rounded-xl border border-white/10 w-full md:w-auto">
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                  <User className="h-3 w-3" /> Operador
                </span>
                <span className="truncate max-w-[120px]">
                  {tripData.operador}
                </span>
              </div>
              <div className="hidden md:block w-px bg-white/20"></div>
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Unidad
                </span>
                <span>
                  ECO-{tripData.unidadId} ({tripData.configuracion})
                </span>
              </div>
              <div className="hidden md:block w-px bg-white/20"></div>
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Salida
                </span>
                <span>{tripData.fechaViaje}</span>
              </div>
            </div>
          </div>
        )}

        {/* RENDER CONDICIONAL FORMULARIOS / TABLA */}
        {!tripData ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <History className="h-4 w-4 text-slate-400" />
              <h3 className="font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-xs">
                Historial de Auditorías
              </h3>
            </div>
            <Card className="border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <EnhancedDataTable
                  data={auditedLegs}
                  columns={auditedColumns as any}
                  className="border-none"
                  searchPlaceholder="Buscar por folio o operador..."
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            {/* LADO FÍSICO Y DIGITAL JUNTOS */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* LADO FÍSICO */}
              <Card className="border-t-4 border-t-amber-500 shadow-sm dark:bg-slate-900 dark:border-white/10">
                <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 p-4 border-b border-amber-100 dark:border-amber-900/30">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between text-amber-700 dark:text-amber-500">
                    <span className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" /> 1. Suministro Vales
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[9px] hover:bg-amber-100 dark:hover:bg-amber-900/50"
                      onClick={() => fetchValesCombustible(selectedLegId)}
                      disabled={isFetchingVales}
                    >
                      <RefreshCw
                        className={cn(
                          "h-3 w-3 mr-1",
                          isFetchingVales && "animate-spin",
                        )}
                      />{" "}
                      Refrescar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Total Sincronizado
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        disabled
                        value={formData.litrosVales}
                        className="pr-12 font-mono h-12 bg-slate-50 dark:bg-slate-800 text-2xl font-black text-slate-700 dark:text-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                        L
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LADO DIGITAL (ECM) */}
              <Card className="border-t-4 border-t-blue-500 shadow-sm dark:bg-slate-900 dark:border-white/10">
                <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 p-4 border-b border-blue-100 dark:border-blue-900/30">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-blue-700 dark:text-blue-500">
                    <Gauge className="h-4 w-4" /> 2. Computadora (ECM)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        KMs ECM *
                      </Label>
                      <Input
                        type="number"
                        placeholder="Ej. 900"
                        value={formData.kilometrosECM}
                        onChange={(e) =>
                          handleInputChange("kilometrosECM", e.target.value)
                        }
                        className="h-10 font-mono font-bold dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Litros ECM *
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ej. 448"
                        value={formData.litrosECM}
                        onChange={(e) =>
                          handleInputChange("litrosECM", e.target.value)
                        }
                        className="h-10 font-mono font-bold dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Odómetro Final (Siguiente Viaje) *
                    </Label>
                    <Input
                      type="number"
                      value={formData.odometroFinal}
                      onChange={(e) =>
                        handleInputChange("odometroFinal", e.target.value)
                      }
                      className="h-10 font-mono font-bold dark:bg-slate-800 dark:text-white"
                      placeholder="Ej. 145000"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* BARRA INFERIOR COMPACTA: VEREDICTO Y BOTONES */}
            <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <div
                className={cn(
                  "h-1.5 w-full",
                  auditResult?.esRoboSospechado
                    ? "bg-rose-500"
                    : "bg-emerald-500",
                )}
              />
              <CardContent className="p-4 flex flex-col lg:flex-row items-center justify-between gap-6">
                {/* Métricas Calculadas */}
                <div className="flex flex-wrap gap-4 md:gap-8 justify-center lg:justify-start divide-x divide-slate-200 dark:divide-white/10 w-full lg:w-auto">
                  <div className="flex flex-col pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Rend. ECM
                    </span>
                    <span className="text-2xl font-mono font-black text-slate-700 dark:text-white">
                      {auditResult?.rendimientoECM.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex flex-col pl-4 md:pl-8 pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Rend. Real
                    </span>
                    <span className="text-2xl font-mono font-black text-slate-700 dark:text-white">
                      {auditResult?.rendimientoReal.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex flex-col pl-4 md:pl-8">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Diferencia
                    </span>
                    <span
                      className={cn(
                        "text-2xl font-mono font-black",
                        auditResult?.esRoboSospechado
                          ? "text-rose-600 dark:text-rose-500"
                          : "text-emerald-600 dark:text-emerald-500",
                      )}
                    >
                      {auditResult?.diferenciaLitros != null &&
                      auditResult.diferenciaLitros > 0
                        ? "+"
                        : ""}
                      {auditResult?.diferenciaLitros.toFixed(1) || "0.0"}{" "}
                      <span className="text-sm">L</span>
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  {auditResult?.esRoboSospechado && (
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-500 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      <AlertTriangle className="h-4 w-4 animate-pulse" />
                      <span className="font-black uppercase text-[10px] tracking-widest">
                        Excede Tol.
                      </span>
                    </div>
                  )}
                  {isEditing ? (
                    <Button
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="w-full sm:w-auto font-bold uppercase tracking-widest text-[10px] text-slate-500 hover:text-rose-600 h-11 px-6"
                    >
                      Cancelar Edición
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full sm:w-auto font-bold uppercase tracking-widest text-[10px] text-slate-500 hover:text-slate-700 h-11 px-6"
                    >
                      Cancelar y regresar
                    </Button>
                  )}

                  <Button
                    onClick={handleAuthorizeAndClose}
                    disabled={isProcessing || !formData.odometroFinal}
                    className={cn(
                      "w-full sm:w-auto font-black text-white uppercase tracking-widest text-[11px] h-11 px-8 shadow-lg",
                      auditResult?.esRoboSospechado
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isEditing ? "Guardar Cambios" : "Guardar Auditoría"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/*  MODAL VER DETALLES ENRIQUECIDO */}
      <Dialog
        open={!!legToView}
        onOpenChange={(open) => !open && setLegToView(null)}
      >
        <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="bg-slate-100 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-white/10 flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-blue-500" /> Detalles de
                Conciliación
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold">
                Folio: {legToView?.trip?.public_id || legToView?.trip_id} •
                Fase: {legToView?.leg_type?.replace("_", " ").toUpperCase()}
              </DialogDescription>
            </div>
            <div className="text-right">
              <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400">
                Fecha Cierre
              </span>
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                {parsedAuditDetails?.fechaAudit}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-6 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-white/5">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                  Operador Auditado
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-white">
                  {legToView?.operator?.name || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">
                  KMs ECM
                </p>
                <p className="font-mono font-black text-slate-700 dark:text-white text-lg">
                  {parsedAuditDetails?.km}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">
                  Litros ECM
                </p>
                <p className="font-mono font-black text-slate-700 dark:text-white text-lg">
                  {parsedAuditDetails?.ltEcm}
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center">
                <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-500 mb-1">
                  Litros Bomba
                </p>
                <p className="font-mono font-black text-amber-700 dark:text-amber-400 text-lg">
                  {parsedAuditDetails?.vales}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">
                  Rendimiento Real
                </p>
                <p className="font-mono font-black text-blue-700 dark:text-blue-300 text-2xl">
                  {parsedAuditDetails?.rend}{" "}
                  <span className="text-xs text-blue-500/50">km/L</span>
                </p>
              </div>
              <div
                className={cn(
                  "flex-1 p-3 rounded-xl border text-center flex flex-col justify-center",
                  parsedAuditDetails?.veredicto === "COBRO_OPERADOR"
                    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/10 dark:border-rose-900/30 dark:text-rose-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-400",
                )}
              >
                <p className="text-[9px] uppercase font-black tracking-widest mb-1">
                  Estatus Final
                </p>
                <p className="font-black text-sm uppercase">
                  {parsedAuditDetails?.veredicto?.replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Nota de Resolución de Finanzas
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-brand-navy pl-3">
                {parsedAuditDetails?.textOriginal}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Odómetro Final del Vehículo:{" "}
                <span className="font-mono text-blue-500">
                  {legToView?.odometro_final?.toLocaleString()} km
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10">
            <Button
              onClick={() => setLegToView(null)}
              variant="outline"
              className="w-full font-bold text-xs uppercase tracking-widest bg-white dark:bg-slate-800"
            >
              Cerrar Detalles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación de Eliminación */}
      <AlertDialog
        open={!!legToReset}
        onOpenChange={(open) => !open && setLegToReset(null)}
      >
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl bg-white dark:bg-slate-900">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-500 flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-800">
              <Trash2 size={32} />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Revertir Auditoría
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500 dark:text-slate-400">
              ¿Estás seguro de que deseas eliminar esta conciliación? Los
              cálculos se borrarán y la fase volverá a quedar pendiente de
              auditar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl h-11 font-bold uppercase text-[10px] tracking-widest px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAudit}
              className="rounded-xl h-11 font-black uppercase text-[10px] tracking-widest px-6 bg-rose-600 hover:bg-rose-700 text-white"
            >
              Sí, Revertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
