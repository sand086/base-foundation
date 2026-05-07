import * as React from "react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
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
  DialogHeader,
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
  CheckCircle,
  Calculator,
  ShieldAlert,
  RefreshCw,
  History,
  RotateCcw,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Save,
  AlertTriangle,
  ShieldCheck,
  Truck,
  Calendar,
  User,
  FilterX,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import axiosClient from "@/api/axiosClient";

// Importamos el Modal Blindado (Asegúrate de que la ruta sea correcta según tu proyecto)
import { ConciliarViajeModal } from "@/features/settlements/components/FuelConciliationModal"; // Ajusta la ruta si es necesario

// ============================================================================
// INTERFACES
// ============================================================================
interface AuditFormData {
  litrosVales: string;
  kilometrosECM: string;
  litrosECM: string;
  odometroFinal: string;
  maxOdoVales: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL: AUDITORÍA Y CONCILIACIÓN OPERATIVA
// ============================================================================
export default function FuelConciliation() {
  const { trips, fetchTrips } = useTrips();

  const { valueAsNumber: rendimientoConfig, isLoading: loadingRend } =
    useSystemConfig("rendimiento_diesel_esperado");

  // ==========================================================
  // REGLAS DE NEGOCIO ESTRICTAS
  // ==========================================================
  const TOLERANCIA_FIJA = 0.03; // 3%
  const PRECIO_DIESEL_ESTANDAR = 24.0; // Precio para cuantificar el descuento

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedLegId, setSelectedLegId] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingVales, setIsFetchingVales] = useState(false);
  const [valesRawData, setValesRawData] = useState<any[]>([]);

  // Estados de Modales y Edición
  const [legToReset, setLegToReset] = useState<string | null>(null);
  const [legToView, setLegToView] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estado para controlar el nuevo Modal Inteligente
  const [isConciliarModalOpen, setIsConciliarModalOpen] = useState(false);

  // NUEVOS ESTADOS PARA FILTROS (HOY VS HISTÓRICO)
  const [dateFilter, setDateFilter] = useState<"hoy" | "historico">("hoy");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // 1. FILTRADO BASE DE HISTÓRICOS
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

  // 2. FILTRADO DINÁMICO POR FECHAS (HOY VS HISTÓRICO)
  const filteredAuditedLegs = useMemo(() => {
    let filtered = auditedLegs;
    const hoyStr = new Date().toLocaleDateString("es-MX");

    if (dateFilter === "hoy") {
      filtered = filtered.filter(
        (l) =>
          new Date(l.last_update || 0).toLocaleDateString("es-MX") === hoyStr,
      );
    } else {
      filtered = filtered.filter(
        (l) =>
          new Date(l.last_update || 0).toLocaleDateString("es-MX") !== hoyStr,
      );

      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(
          (l) => new Date(l.last_update || 0) >= fromDate,
        );
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(
          (l) => new Date(l.last_update || 0) <= toDate,
        );
      }
    }
    return filtered;
  }, [auditedLegs, dateFilter, dateRange]);

  // Selección Activa
  const activeTrip = useMemo(() => {
    return trips.find((t) => String(t.id) === selectedTripId) || null;
  }, [trips, selectedTripId]);

  // 3. FILTRADO ESTRICTO DE TRAMOS CON EXCEPCIÓN PARA EDICIÓN
  const tripLegs = useMemo(() => {
    if (!activeTrip || !activeTrip.legs) return [];
    return activeTrip.legs.filter((leg) => {
      const legStatus = String(leg.status ?? "").toLowerCase();
      // EXCEPCIÓN: Si estamos editando, forzamos que aparezca el tramo seleccionado
      return (
        ["entregado", "cerrado", "finalizado", "liquidado"].includes(
          legStatus,
        ) || String(leg.id) === selectedLegId
      );
    });
  }, [activeTrip, selectedLegId]);

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

  // =========================================================================
  // EXTRACCIÓN DE DATOS Y PUNTO DE REFERENCIA (INTELIGENCIA DE ODÓMETROS)
  // =========================================================================
  const fetchValesCombustible = async (legIdToFetch: string) => {
    setIsFetchingVales(true);
    try {
      const response = await axiosClient.get("/api/fleet/fuel-logs");

      const valesDiesel = response.data.filter((log: any) => {
        const esValido =
          log.tipo_combustible === "diesel" &&
          String(log.trip_leg_id) === String(legIdToFetch) &&
          log.record_status === "A";

        return esValido;
      });

      setValesRawData(valesDiesel);

      const totalVales = valesDiesel.reduce(
        (sum: number, log: any) => sum + Number(log.litros),
        0,
      );

      if (totalVales > 0) {
        toast.success("Suministro Sincronizado", {
          description: `Se detectaron ${totalVales.toFixed(2)} L en vales para este tramo.`,
        });
      } else {
        toast.info("Sin vales detectados", {
          description: `El tramo no tiene vales físicos registrados.`,
        });
      }

      // Una vez obtenidos los vales, abrimos el modal inteligente
      setIsConciliarModalOpen(true);
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
  };

  const handleLegSelect = async (legId: string) => {
    setSelectedLegId(legId);
    setIsEditing(false);
    await fetchValesCombustible(legId);
  };

  // REPARACIÓN DEL EDITAR
  const handleEditAudit = async (leg: any) => {
    setSelectedTripId(String(leg.trip_id));
    setSelectedLegId(String(leg.id));
    setIsEditing(true);

    await fetchValesCombustible(String(leg.id));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedTripId("");
    setSelectedLegId("");
  };

  // Eliminar (Revertir)
  const handleResetAudit = async () => {
    if (!legToReset) return;
    const toastId = toast.loading("Revirtiendo auditoría...");

    try {
      await axiosClient.post(
        `/api/logistics/trips/legs/${legToReset}/reset-audit`,
      );
      toast.success("Registro de detalles Revertido", {
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

  // =========================================================================
  // GUARDAR Y APLICAR AL BACKEND (Llamado desde el Modal Inteligente)
  // =========================================================================
  const handleAuthorizeFromModal = async (tripId: number, calculos: any) => {
    if (!activeTrip || !selectedLegId) return;

    setIsProcessing(true);

    try {
      const kmECM = calculos.km_recorridos || 0;
      const ltECM = calculos.litros_ecm || 0;
      const vales = calculos.litros_vales || 0;
      const rReal = calculos.rendimiento || 0;
      const odoFinal = calculos.odometro_final || 0;
      const isMoto = calculos.is_motogenerator || false;
      const cobrar = calculos.cobrar_al_operador || false;

      const diferencia = calculos.diferencia || 0;
      const est =
        diferencia > ltECM * TOLERANCIA_FIJA ? "COBRO_OPERADOR" : "CONCILIADO";
      const isRobo = est === "COBRO_OPERADOR";
      const descuentoPesos = isRobo ? diferencia * PRECIO_DIESEL_ESTANDAR : 0;
      const mensajeDeduccion = isRobo
        ? `Cargo por diésel: Excedente de ${diferencia.toFixed(1)}L sobre lo marcado por ECM, generando un descuento de $${descuentoPesos.toFixed(2)}`
        : "";

      const sufijo = isMoto ? "Hrs" : "Km";
      const lblSufijo = isMoto ? "Horómetro" : "Odómetro";

      const comentarioBitacora = `Detalles Fase (${isMoto ? "MG" : "Tracto"}). ${sufijo} ECM: ${kmECM}. Litros ECM: ${ltECM}. Vales: ${vales}. Rend Real: ${rReal} ${isMoto ? "hr/L" : "km/L"}. Ver: ${est}. ${isRobo ? mensajeDeduccion : ""}`;

      const payload = {
        status: "entregado",
        location: "Conciliación de Combustible",
        comments: comentarioBitacora.trim(),
        odometro: Number(odoFinal),
        odometro_final: Number(odoFinal),
        combustible_litros: Number(vales),
        trip_leg_id: Number(selectedLegId),
        penalizacion_monto: cobrar ? descuentoPesos : 0,
        penalizacion_motivo: cobrar
          ? mensajeDeduccion
          : "Excedente perdonado por el auditor.",
      };

      await axiosClient.post(
        `/api/logistics/trips/${selectedTripId}/timeline`,
        payload,
      );

      toast.success(
        isEditing
          ? "Registro de detalles Actualizado"
          : "Registro de detalles Registrado",
        {
          description:
            "La liquidación absorberá automáticamente la penalización si aplica.",
        },
      );

      await fetchTrips();
      setSelectedTripId("");
      setSelectedLegId("");
      setIsEditing(false);
    } catch (error) {
      console.error("Error al conciliar:", error);
      toast.error("Error de Servidor", {
        description: "No se pudo guardar el veredicto.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parsedAuditDetails = useMemo(() => {
    if (!legToView) return null;
    const auditEvent = legToView.timeline_events?.find(
      (e: any) =>
        e.location === "Conciliación de Combustible" ||
        e.comments?.includes("Detalles Fase"),
    );
    const text = auditEvent?.comments || "";

    // Adaptamos el Regex para capturar Km o Hrs
    const kmMatch = text.match(/(?:Km|Hrs) ECM:\s*([\d.]+)/);
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

  const auditedColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        key: "last_update",
        header: "Fecha",
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
            {v?.toLocaleString() || 0}
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
          // BLINDAJE: Detectar si el viaje ya fue pagado
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

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />

                {/* EDITAR (Protegido) */}
                <DropdownMenuItem
                  onClick={() => {
                    if (isLiquidado) {
                      toast.error("Bloqueo de Seguridad", {
                        description:
                          "No se puede editar la conciliación de un viaje liquidado. Primero cancela la liquidación en Tesorería.",
                        duration: 6000,
                      });
                      return;
                    }
                    handleEditAudit(row);
                  }}
                  className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar / Recalcular
                </DropdownMenuItem>

                {/* ELIMINAR (Protegido) */}
                <DropdownMenuItem
                  className="text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-500/10 font-bold uppercase text-[10px] py-2.5 px-3 rounded-lg cursor-pointer"
                  onClick={() => {
                    if (isLiquidado) {
                      toast.error("Bloqueo de Seguridad", {
                        description:
                          "No se puede revertir la conciliación de un viaje liquidado. Primero cancela la liquidación en Tesorería.",
                        duration: 6000,
                      });
                      return;
                    }
                    setLegToReset(String(row.id));
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar Registro
                </DropdownMenuItem>
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
          title="Conciliación Operativa"
          description="Conciliación de combustible físico (Vales) vs Computadora (ECM)."
          className="mb-0"
        />
      </div>

      <div className="space-y-4 max-w-7xl mx-auto pb-12">
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
                className="border-slate-200 dark:border-white/10 bg-emerald-50 text-emerald-700"
              >
                Tolerancia Estricta: {TOLERANCIA_FIJA * 100}%
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
                1. Buscar Viaje (Entregado/Cerrado):
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
                    .filter((t) => {
                      if (String(t.id) === selectedTripId) return true;

                      const tripStatus = String(t.status ?? "").toLowerCase();
                      const estatusValidos = [
                        "entregado",
                        "cerrado",
                        "finalizado",
                        "liquidado",
                      ];

                      if (estatusValidos.includes(tripStatus)) return true;

                      const tieneTramosListos = t.legs?.some((leg) =>
                        estatusValidos.includes(
                          String(leg.status ?? "").toLowerCase(),
                        ),
                      );

                      return tieneTramosListos;
                    })
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

            {/* Si estamos en proceso de pedir los vales, mostrar un indicador visual */}
            {isFetchingVales && (
              <div className="col-span-1 md:col-span-2 flex items-center justify-center p-2 text-blue-500 animate-pulse text-xs font-bold gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Analizando
                suministros de la fase...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <History className="h-4 w-4 text-slate-400" />
            <h3 className="font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-xs">
              Historial de Auditorías
            </h3>
          </div>

          {/* NUEVO: Pestañas de Hoy / Histórico */}
          <div className="flex items-center pb-2">
            <Tabs
              value={dateFilter}
              onValueChange={(v) => setDateFilter(v as "hoy" | "historico")}
              className="w-[300px]"
            >
              <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
                <TabsTrigger
                  value="hoy"
                  className="rounded-lg font-bold text-xs"
                >
                  Hoy
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="rounded-lg font-bold text-xs"
                >
                  Histórico
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card className="border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <EnhancedDataTable
                data={filteredAuditedLegs} // Usamos la tabla filtrada
                columns={auditedColumns as any}
                className="border-none"
                searchPlaceholder="Buscar por folio o operador..."
                customFilters={
                  dateFilter === "historico" && (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                      <DateRangePicker
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        placeholder="Rango de fechas"
                        className="w-[280px]"
                      />
                      {dateRange?.from && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDateRange(undefined)}
                          className="h-11 w-11 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
                          title="Limpiar fechas"
                        >
                          <FilterX size={18} />
                        </Button>
                      )}
                    </div>
                  )
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AQUÍ INYECTAMOS EL NUEVO MODAL INTELIGENTE DE CONCILIACIÓN */}
      <ConciliarViajeModal
        open={isConciliarModalOpen}
        onOpenChange={(open) => {
          setIsConciliarModalOpen(open);
          if (!open) handleCancelEdit();
        }}
        trip={activeTrip}
        fuelLoads={valesRawData}
        onConciliar={handleAuthorizeFromModal}
      />

      {/* DIALOG DE VISTA DE DETALLES HISTÓRICOS */}
      <Dialog
        open={!!legToView}
        onOpenChange={(open) => !open && setLegToView(null)}
      >
        <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="bg-slate-100 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-white/10 flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
                Detalles de Conciliación
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold">
                Folio:{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {legToView?.trip?.public_id || legToView?.trip_id}
                </span>{" "}
                • Fase:{" "}
                <span className="uppercase">
                  {legToView?.leg_type?.replace("_", " ")}
                </span>
              </DialogDescription>
            </div>
            <div className="text-right mt-6">
              <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400">
                Fecha de Cierre
              </span>
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                {parsedAuditDetails?.fechaAudit}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/10">
                  <User className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                    Operador Auditado
                  </p>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase">
                    {legToView?.operator?.name || "N/A"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                  Unidad
                </p>
                <Badge variant="secondary" className="font-mono font-bold">
                  {legToView?.unit?.numero_economico || "S/N"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center shadow-sm">
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                  Km / Hrs ECM
                </p>
                <p className="font-mono font-black text-slate-800 dark:text-white text-lg">
                  {Number(parsedAuditDetails?.km || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center shadow-sm">
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-tighter">
                  Litros ECM
                </p>
                <p className="font-mono font-black text-slate-800 dark:text-white text-lg">
                  {Number(parsedAuditDetails?.ltEcm || 0).toFixed(1)}
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center shadow-sm">
                <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-500 mb-1 tracking-tighter">
                  Litros Vales
                </p>
                <p className="font-mono font-black text-amber-700 dark:text-amber-400 text-lg">
                  {Number(parsedAuditDetails?.vales || 0).toFixed(1)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center">
                <p className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 mb-1 tracking-widest">
                  Rendimiento Real
                </p>
                <p className="font-mono font-black text-blue-700 dark:text-blue-300 text-3xl flex items-baseline gap-1">
                  {parsedAuditDetails?.rend || "0.00"}
                  <span className="text-[10px] font-bold uppercase opacity-60 ml-1">
                    hr/L | km/L
                  </span>
                </p>
              </div>

              <div
                className={cn(
                  "flex-1 p-4 rounded-2xl border flex flex-col justify-center items-center text-center shadow-sm transition-colors",
                  parsedAuditDetails?.veredicto === "COBRO_OPERADOR"
                    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-900/30 dark:text-rose-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400",
                )}
              >
                {parsedAuditDetails?.veredicto === "COBRO_OPERADOR" ? (
                  <ShieldAlert className="h-6 w-6 mb-1 text-rose-500" />
                ) : (
                  <CheckCircle className="h-6 w-6 mb-1 text-emerald-500" />
                )}
                <p className="text-[9px] uppercase font-black tracking-widest mb-0.5 opacity-80">
                  Estatus Final
                </p>
                <p className="font-black text-sm uppercase leading-tight tracking-tight">
                  {parsedAuditDetails?.veredicto?.replace(/_/g, " ") ||
                    "CONCILIADO"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <FileText className="h-3 w-3 text-blue-400" />
                Detalles / Deducción de ruta.
              </p>
              <div className="rounded-lg">
                <p className="text-[11px] font-mono font-medium leading-relaxed italic dark:text-white/80">
                  {parsedAuditDetails?.textOriginal ||
                    "No hay registros adicionales para este tramo."}
                </p>
              </div>
            </div>

            <div className="pt-2 text-center border-t border-slate-100 dark:border-white/5">
              <div className="inline-flex flex-col items-center py-2 px-6 rounded-full bg-slate-50 dark:bg-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-1">
                  <Gauge className="h-3.5 w-3.5" /> Odómetro Cerrado
                </p>
                <p className="font-mono text-xl font-black text-slate-800 dark:text-blue-400">
                  {Number(legToView?.odometro_final || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10">
            <Button
              onClick={() => setLegToView(null)}
              variant="outline"
              className="w-full font-black text-xs uppercase tracking-widest h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación de Reversión */}
      <AlertDialog
        open={!!legToReset}
        onOpenChange={(open) => !open && setLegToReset(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Revertir Conciliación
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Irreversible
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Estás seguro de que deseas eliminar esta conciliación?
              </p>
              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Consecuencia
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Los cálculos se borrarán, el odómetro volverá al estado
                  anterior y la fase{" "}
                  <b className="font-black">volverá a quedar en curso</b>.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  handleResetAudit();
                }}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Revertir Fase
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
