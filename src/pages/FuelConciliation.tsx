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
  Zap,
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

  // ⚡ SELECCIÓN COMBINADA (legId | tipo) Ej: "57|tracto" o "57|mg"
  const [selectedLegOption, setSelectedLegOption] = useState<string>("");

  const [formData, setFormData] = useState<AuditFormData>({
    litrosVales: "0",
    kilometrosECM: "",
    litrosECM: "",
    odometroFinal: "",
    maxOdoVales: 0,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingVales, setIsFetchingVales] = useState(false);

  // Estados de Modales y Edición
  const [legToReset, setLegToReset] = useState<string | null>(null);
  const [legToView, setLegToView] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cobrarOperador, setCobrarOperador] = useState(true);

  // NUEVOS ESTADOS PARA FILTROS (HOY VS HISTÓRICO)
  const [dateFilter, setDateFilter] = useState<"hoy" | "historico">("hoy");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Derivación de la opción seleccionada
  const selectedLegId = selectedLegOption
    ? selectedLegOption.split("|")[0]
    : "";
  const isMotogenerator = selectedLegOption
    ? selectedLegOption.split("|")[1] === "mg"
    : false;

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

  // EXTRACCIÓN INTELIGENTE DE MOTOGENERADOR PARA EL VIAJE ACTIVO
  const activeTripMgName = useMemo(() => {
    if (!activeTrip) return null;
    if ((activeTrip as any).is_refrigerated_1) {
      return (
        (activeTrip as any).motogenerator_1_unit?.numero_economico ||
        (activeTrip as any).motogenerator_1 ||
        "S/N"
      );
    }
    if ((activeTrip as any).is_refrigerated_2) {
      return (
        (activeTrip as any).motogenerator_2_unit?.numero_economico ||
        (activeTrip as any).motogenerator_2 ||
        "S/N"
      );
    }
    return null;
  }, [activeTrip]);

  // 3. SEPARACIÓN EXACTA TRACTO VS MG EN EL DROPDOWN
  const legOptions = useMemo(() => {
    if (!activeTrip || !activeTrip.legs) return [];

    const filteredLegs = activeTrip.legs.filter((leg) => {
      const legStatus = String(leg.status ?? "").toLowerCase();
      return (
        ["entregado", "cerrado", "finalizado", "liquidado"].includes(
          legStatus,
        ) || String(leg.id) === selectedLegId
      );
    });

    return filteredLegs.flatMap((leg) => {
      const options = [];

      // Opción Tractocamión
      options.push({
        value: `${leg.id}|tracto`,
        label: `${leg.leg_type.replace("_", " ").toUpperCase()} | Tracto: ECO-${leg.unit?.numero_economico}`,
      });

      // Opción Termo (solo si aplica)
      if (leg.leg_type === "ruta_carretera" && activeTripMgName) {
        options.push({
          value: `${leg.id}|mg`,
          label: `${leg.leg_type.replace("_", " ").toUpperCase()} | Termo: ${activeTripMgName}`,
        });
      }
      return options;
    });
  }, [activeTrip, activeTripMgName, selectedLegId]);

  const activeLeg = useMemo(
    () => activeTrip?.legs?.find((l) => String(l.id) === selectedLegId) || null,
    [activeTrip, selectedLegId],
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
      motogenerador: activeTripMgName,
    };
  }, [activeTrip, activeLeg, activeTripMgName]);

  // Inteligencia de Odómetros / Orómetros base
  const odometroInicial = useMemo(() => {
    if (isMotogenerator) {
      return formData.maxOdoVales;
    }
    return Number(activeLeg?.odometro_inicial || 0);
  }, [isMotogenerator, formData.maxOdoVales, activeLeg]);

  // =========================================================================
  // EXTRACCIÓN DE DATOS Y PUNTO DE REFERENCIA
  // =========================================================================
  const fetchValesCombustible = async (legIdToFetch: string, isMg: boolean) => {
    setIsFetchingVales(true);
    try {
      const response = await axiosClient.get("/api/fleet/fuel-logs");

      let mayorOdometroEnVales = 0;

      const valesDiesel = response.data.filter((log: any) => {
        const isLogMg =
          log.is_motogenerator === true ||
          String(log.is_motogenerator).toLowerCase() === "true" ||
          log.is_motogenerator === 1;

        const esValido =
          log.tipo_combustible === "diesel" &&
          String(log.trip_leg_id) === String(legIdToFetch) &&
          log.record_status === "A" &&
          isLogMg === isMg; // ⚡ FILTRO ESPECÍFICO POR TRACTO O TERMO

        if (esValido) {
          const odoLog = isMg
            ? Number(log.horometro) || Number(log.odometro) || 0
            : Number(log.odometro) || 0;

          if (odoLog > mayorOdometroEnVales) {
            mayorOdometroEnVales = odoLog;
          }
        }
        return esValido;
      });

      const totalVales = valesDiesel.reduce(
        (sum: number, log: any) => sum + Number(log.litros),
        0,
      );

      setFormData((prev) => ({
        ...prev,
        litrosVales: totalVales.toString(),
        maxOdoVales: mayorOdometroEnVales,
      }));

      if (totalVales > 0) {
        toast.success(`Suministro Sincronizado (${isMg ? "MG" : "Tracto"})`, {
          description: `Se detectaron ${totalVales.toFixed(2)} L en vales. ${isMg ? "Orómetro" : "Odómetro"} Ref: ${mayorOdometroEnVales || "N/A"}`,
        });
      } else {
        toast.info(`Sin vales de ${isMg ? "MG" : "Tracto"} detectados`, {
          description: `El equipo seleccionado no tiene vales físicos registrados.`,
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
    setSelectedLegOption("");
    setIsEditing(false);
    handleResetState();
  };

  const handleLegSelect = async (val: string) => {
    setSelectedLegOption(val);
    setIsEditing(false);
    handleResetState();

    const legId = val.split("|")[0];
    const isMg = val.split("|")[1] === "mg";

    await fetchValesCombustible(legId, isMg);
  };

  // LÓGICA DE AUTO-CÁLCULO DEL ODÓMETRO FINAL (OnBlur)
  const handleAutoCalculateOdometer = () => {
    const kms = Number(formData.kilometrosECM);
    if (kms > 0 && activeLeg) {
      const baseOdo =
        formData.maxOdoVales > 0
          ? formData.maxOdoVales
          : Number(activeLeg.odometro_inicial) || 0;

      const odoFinal = baseOdo + kms;

      setFormData((prev) => ({ ...prev, odometroFinal: String(odoFinal) }));

      toast.info(
        `${isMotogenerator ? "Orómetro" : "Odómetro"} auto-calculado`,
        {
          description: `Base: ${baseOdo.toLocaleString()} + Recorrido ECM: ${kms.toLocaleString()}`,
        },
      );
    }
  };

  // REPARACIÓN DEL EDITAR
  const handleEditAudit = async (leg: any) => {
    setSelectedTripId(String(leg.trip_id));

    // Si viene de la tabla, asumimos tracto porque no guarda el tipo en el grid
    const defaultOption = `${leg.id}|tracto`;
    setSelectedLegOption(defaultOption);
    setIsEditing(true);

    const auditEvent = leg.timeline_events?.find(
      (e: any) =>
        e.location === "Conciliación de Combustible" ||
        e.comments?.includes("Detalles Fase"),
    );

    let kmEcmVal = "";
    let ltEcmVal = "";

    if (auditEvent && auditEvent.comments) {
      const kmMatch = auditEvent.comments.match(/(?:Km|Hrs) ECM:\s*([\d.]+)/);
      const ltMatch = auditEvent.comments.match(/Litros ECM:\s*([\d.]+)/);
      if (kmMatch) kmEcmVal = kmMatch[1];
      if (ltMatch) ltEcmVal = ltMatch[1];
    }

    setFormData({
      litrosVales: "0",
      kilometrosECM: kmEcmVal,
      litrosECM: ltEcmVal,
      odometroFinal: String(leg.odometro_final || ""),
      maxOdoVales: 0,
    });

    await fetchValesCombustible(String(leg.id), false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    handleResetAll();
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
  // LA MATEMÁTICA FINANCIERA Y EL RECIBO DE SANCIÓN
  // =========================================================================
  const auditResult = useMemo(() => {
    const litrosVales = Number(formData.litrosVales) || 0;
    const kmECM = Number(formData.kilometrosECM) || 0;
    const litrosECM = Number(formData.litrosECM) || 0;

    const rendimientoECM = litrosECM > 0 ? kmECM / litrosECM : 0;
    const rendimientoReal = litrosVales > 0 ? kmECM / litrosVales : 0;

    const diferenciaLitros = litrosVales - litrosECM;
    const toleranciaPermitida = litrosECM * TOLERANCIA_FIJA;

    let estatus: "CONCILIADO" | "COBRO_OPERADOR" = "CONCILIADO";
    let esRoboSospechado = false;
    let descuentoPesos = 0;
    let mensajeDeduccion = "";

    if (diferenciaLitros > 0 && diferenciaLitros > toleranciaPermitida) {
      estatus = "COBRO_OPERADOR";
      esRoboSospechado = true;
      descuentoPesos = diferenciaLitros * PRECIO_DIESEL_ESTANDAR;
      mensajeDeduccion = `Cargo por diésel: Excedente de ${diferenciaLitros.toFixed(1)}L sobre lo marcado por ECM, generando un descuento de $${descuentoPesos.toFixed(2)}`;
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
      descuentoPesos,
      mensajeDeduccion,
    };
  }, [formData]);

  const handleInputChange = (field: keyof AuditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetState = () => {
    setFormData({
      litrosVales: "0",
      kilometrosECM: "",
      litrosECM: "",
      odometroFinal: "",
      maxOdoVales: 0,
    });
    setCobrarOperador(true);
  };

  const handleResetAll = () => {
    setSelectedTripId("");
    setSelectedLegOption("");
    setIsEditing(false);
    handleResetState();
  };

  // =========================================================================
  // GUARDAR Y APLICAR SANCIÓN AL BACKEND
  // =========================================================================
  const handleAuthorizeAndClose = async () => {
    if (!activeTrip || !selectedLegId) return;

    if (!formData.odometroFinal) {
      toast.error(`Falta ${isMotogenerator ? "Orómetro" : "Odómetro"} Final`, {
        description: `Debe calcular/ingresar el ${isMotogenerator ? "Orómetro" : "Odómetro"} Final del equipo.`,
      });
      return;
    }

    const odoFinalVal = Number(formData.odometroFinal);
    if (odoFinalVal > 0 && odoFinalVal <= odometroInicial) {
      toast.error("Validación fallida", {
        description: `El ${isMotogenerator ? "Orómetro" : "Odómetro"} Final debe ser mayor al inicial (${odometroInicial}).`,
      });
      return;
    }

    setIsProcessing(true);

    try {
      const kmECM = auditResult?.kmECM || 0;
      const ltECM = auditResult?.litrosECM || 0;
      const vales = auditResult?.litrosVales || 0;
      const rReal = auditResult?.rendimientoReal || 0;
      const est = auditResult?.estatus || "CONCILIADO";
      const isRobo = auditResult?.esRoboSospechado || false;

      const sufijo = isMotogenerator ? "Hrs" : "Km";
      const comentarioBitacora = `Detalles Fase (${isMotogenerator ? "MG" : "Tracto"}). ${sufijo} ECM: ${kmECM}. Litros ECM: ${ltECM}. Vales: ${vales}. Rend Real: ${rReal.toFixed(2)} ${isMotogenerator ? "hr/L" : "km/L"}. Ver: ${est}. ${isRobo ? auditResult.mensajeDeduccion : ""}`;

      const payload: any = {
        status: "entregado",
        location: "Conciliación de Combustible",
        comments: comentarioBitacora.trim(),
        combustible_litros: Number(vales),
        trip_leg_id: Number(selectedLegId),
        penalizacion_monto: cobrarOperador ? auditResult.descuentoPesos : 0,
        penalizacion_motivo: cobrarOperador
          ? auditResult.mensajeDeduccion
          : "Excedente perdonado por el auditor.",
      };

      // BLINDAJE QUIRÚRGICO: NO sobreescribimos el odómetro del camión si estamos auditando el Termo.
      if (!isMotogenerator) {
        payload.odometro = Number(formData.odometroFinal);
        payload.odometro_final = Number(formData.odometroFinal);
      }

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
      handleResetAll();
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

  const odoFinalNum = Number(formData.odometroFinal);
  const hasOdoError = odoFinalNum > 0 && odoFinalNum <= odometroInicial;

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

                      let tMgName = null;
                      if ((t as any).is_refrigerated_1) {
                        tMgName =
                          (t as any).motogenerator_1_unit?.numero_economico ||
                          (t as any).motogenerator_1;
                      } else if ((t as any).is_refrigerated_2) {
                        tMgName =
                          (t as any).motogenerator_2_unit?.numero_economico ||
                          (t as any).motogenerator_2;
                      }

                      return (
                        <SelectItem
                          key={t.id}
                          value={String(t.id)}
                          className="text-xs"
                        >
                          {t.public_id || t.id} • {clientName} • {config} •{" "}
                          {t.origin}
                          {tMgName ? ` • ⚡ ECO-${tMgName}` : ""}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                2. Seleccionar Fase / Equipo a Auditar:
              </Label>
              <Select
                value={selectedLegOption}
                onValueChange={handleLegSelect}
                disabled={!selectedTripId || isEditing}
              >
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 font-bold text-xs h-10 shadow-sm">
                  <SelectValue placeholder="Seleccione equipo..." />
                </SelectTrigger>
                <SelectContent>
                  {legOptions.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs font-medium"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFetchingVales && (
              <div className="col-span-1 md:col-span-2 flex items-center justify-center p-2 text-blue-500 animate-pulse text-xs font-bold gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Analizando
                suministros del equipo...
              </div>
            )}
          </CardContent>
        </Card>

        {tripData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <div className="bg-slate-900 dark:bg-black rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-white shadow-xl">
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

                {tripData.motogenerador && (
                  <>
                    <div className="hidden md:block w-px bg-white/20"></div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Motogenerador
                      </span>
                      <span className="text-amber-400">
                        ECO-{tripData.motogenerador}
                      </span>
                    </div>
                  </>
                )}

                <div className="hidden md:block w-px bg-white/20"></div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Salida
                  </span>
                  <span>{tripData.fechaViaje}</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* LADO FÍSICO */}
              <Card className="border-t-4 border-t-amber-500 shadow-sm dark:bg-slate-900 dark:border-white/10">
                <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 p-4 border-b border-amber-100 dark:border-amber-900/30">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between text-amber-700 dark:text-amber-500">
                    <span className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" /> 1. Suministro Físico (
                      {isMotogenerator ? "MG" : "Tracto"})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[9px] hover:bg-amber-100 dark:hover:bg-amber-900/50"
                      onClick={() =>
                        fetchValesCombustible(selectedLegId, isMotogenerator)
                      }
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
                    <Gauge className="h-4 w-4" /> 2. Computadora (
                    {isMotogenerator ? "MG" : "ECM"})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {isMotogenerator ? "Horas ECM *" : "KMs ECM *"}
                      </Label>
                      <Input
                        type="number"
                        placeholder={isMotogenerator ? "Ej. 45" : "Ej. 900"}
                        value={formData.kilometrosECM}
                        onChange={(e) =>
                          handleInputChange("kilometrosECM", e.target.value)
                        }
                        onBlur={handleAutoCalculateOdometer}
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
                        onBlur={handleAutoCalculateOdometer}
                        className="h-10 font-mono font-bold dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                      <span>
                        {isMotogenerator
                          ? "Orómetro Final Calculado *"
                          : "Odómetro Final Calculado *"}
                      </span>
                      {formData.maxOdoVales > 0 && (
                        <span className="text-amber-500 lowercase opacity-80">
                          (Base vale físico)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={formData.odometroFinal}
                      onChange={(e) =>
                        handleInputChange("odometroFinal", e.target.value)
                      }
                      className={cn(
                        "h-10 font-mono font-bold text-lg dark:text-white transition-colors",
                        formData.odometroFinal
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700",
                        hasOdoError ? "border-rose-300 text-rose-600" : "",
                      )}
                      placeholder="Autocalculado..."
                    />
                    {hasOdoError && (
                      <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tighter flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Error: El{" "}
                        {isMotogenerator ? "orómetro" : "odómetro"} debe ser
                        mayor al inicial ({odometroInicial}).
                      </p>
                    )}
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
                <div className="flex flex-wrap gap-4 md:gap-8 justify-center lg:justify-start divide-x divide-slate-200 dark:divide-white/10 w-full lg:w-auto">
                  <div className="flex flex-col pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Rend. ECM
                    </span>
                    <span className="text-2xl font-mono font-black text-slate-700 dark:text-white flex items-baseline gap-1">
                      {auditResult?.rendimientoECM.toFixed(2) || "0.00"}
                      <span className="text-[10px] opacity-50 uppercase tracking-widest">
                        {isMotogenerator ? "hr/L" : "km/L"}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col pl-4 md:pl-8 pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Rend. Real
                    </span>
                    <span className="text-2xl font-mono font-black text-slate-700 dark:text-white flex items-baseline gap-1">
                      {auditResult?.rendimientoReal.toFixed(2) || "0.00"}
                      <span className="text-[10px] opacity-50 uppercase tracking-widest">
                        {isMotogenerator ? "hr/L" : "km/L"}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col pl-4 md:pl-8">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {auditResult?.diferenciaLitros != null &&
                      auditResult.diferenciaLitros > 0
                        ? "Faltante / Exceso"
                        : "Ahorro Diésel"}
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

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  {auditResult?.esRoboSospechado && (
                    <div className="flex items-center gap-3 text-rose-600 dark:text-rose-500 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      <div className="flex flex-col text-right">
                        <span className="font-black uppercase text-[10px] tracking-widest leading-none">
                          Excede Tol.
                        </span>
                        <span className="text-[9px] font-medium text-rose-800 dark:text-rose-300 mt-0.5">
                          ¿Cobrar ${auditResult.descuentoPesos.toFixed(2)}?
                        </span>
                      </div>
                      <Switch
                        checked={cobrarOperador}
                        onCheckedChange={setCobrarOperador}
                        className="data-[state=checked]:bg-rose-600"
                      />
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
                      onClick={handleResetAll}
                      className="w-full sm:w-auto font-bold uppercase tracking-widest text-[10px] text-slate-500 hover:text-slate-700 h-11 px-6"
                    >
                      Cancelar y Limpiar
                    </Button>
                  )}

                  <Button
                    onClick={handleAuthorizeAndClose}
                    disabled={
                      isProcessing || !formData.odometroFinal || hasOdoError
                    }
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
                    Confirmar y Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!tripData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <History className="h-4 w-4 text-slate-400" />
              <h3 className="font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-xs">
                Historial de Auditorías
              </h3>
            </div>

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
                  data={filteredAuditedLegs}
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
        )}
      </div>

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
