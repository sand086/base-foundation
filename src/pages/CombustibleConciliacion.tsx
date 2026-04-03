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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrips } from "@/hooks/useTrips";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import axiosClient from "@/api/axiosClient";

interface AuditFormData {
  litrosVales: string;
  lecturaInicialECM: string;
  lecturaFinalECM: string;
  litrosConsumidosECM: string;
}

export default function CombustibleConciliacion() {
  const { trips, fetchTrips } = useTrips();

  const { valueAsNumber: tolerancePct, isLoading: loadingTol } =
    useSystemConfig("tolerancia_diesel_pct");
  const { valueAsNumber: rendimientoConfig, isLoading: loadingRend } =
    useSystemConfig("rendimiento_diesel_esperado");
  const { value: empresaRfc } = useSystemConfig("empresa_rfc");

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedLegId, setSelectedLegId] = useState<string>("");

  const [formData, setFormData] = useState<AuditFormData>({
    litrosVales: "0",
    lecturaInicialECM: "",
    lecturaFinalECM: "",
    litrosConsumidosECM: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingVales, setIsFetchingVales] = useState(false);

  // 🚀 HISTÓRICO DE AUDITORÍAS: Filtramos los tramos que ya tienen un odómetro final capturado
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
      unidadId: activeLeg?.unit?.numero_economico || "Sin Unidad",
      ruta: `${activeTrip.origin} → ${activeTrip.destination}`,
      operador: activeLeg?.operator?.name || "Sin Operador",
      fechaViaje: activeTrip.start_date
        ? new Date(activeTrip.start_date).toLocaleDateString()
        : "N/A",
    };
  }, [activeTrip, activeLeg]);

  // 🚀 OBTENER VALES DEL TRAMO DESDE LA BD
  const fetchValesCombustible = async (legIdToFetch: string) => {
    setIsFetchingVales(true);
    try {
      const response = await axiosClient.get("/fuel/fuel-logs");

      // Buscar vales de diésel estrictamente amarrados a este tramo y activos
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
          description: `El sistema detectó ${totalVales.toFixed(2)} L en este tramo.`,
        });
      } else {
        toast.warning("Sin vales detectados", {
          description: `No hay vales de diésel para esta fase operativa.`,
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
    setFormData({
      litrosVales: "0",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });
  };

  const handleLegSelect = async (legId: string) => {
    setSelectedLegId(legId);
    const leg = tripLegs.find((l) => String(l.id) === legId);

    setFormData({
      litrosVales: "0",
      lecturaInicialECM: leg?.odometro_inicial?.toString() || "",
      lecturaFinalECM: leg?.odometro_final?.toString() || "",
      litrosConsumidosECM: "",
    });

    await fetchValesCombustible(legId);
  };

  // 🚀 LA MATEMÁTICA DE GUSTAVO
  const auditResult = useMemo(() => {
    const litrosVales = Number(formData.litrosVales) || 0;
    const litrosConsumidosECM = Number(formData.litrosConsumidosECM) || 0;
    const lecturaInicial = Number(formData.lecturaInicialECM) || 0;
    const lecturaFinal = Number(formData.lecturaFinalECM) || 0;

    if (litrosConsumidosECM <= 0) return null;

    const diferenciaLitros = litrosVales - litrosConsumidosECM;
    const kmsRecorridos =
      lecturaFinal > lecturaInicial ? lecturaFinal - lecturaInicial : 0;

    // Rendimiento Operativo: Kilómetros / Litros PAGADOS (Físicos)
    const rendimientoKmL = litrosVales > 0 ? kmsRecorridos / litrosVales : 0;

    // Tolerancia se calcula sobre lo que dictó la computadora
    const toleranciaPermitida = litrosConsumidosECM * (tolerancePct || 0.05);

    let estatus: "CONCILIADO" | "COBRO_OPERADOR" | "PENDIENTE" = "PENDIENTE";
    let esRoboSospechado = false;

    if (litrosVales > 0) {
      if (diferenciaLitros > toleranciaPermitida) {
        estatus = "COBRO_OPERADOR";
        esRoboSospechado = true;
      } else {
        estatus = "CONCILIADO";
      }
    }

    return {
      totalFisicoLitros: litrosVales,
      totalDigitalLitros: litrosConsumidosECM,
      diferenciaLitros,
      rendimientoKmL,
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
    setFormData({
      litrosVales: "0",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });
  };

  // 🚀 GUARDAR Y REGRESAR AL HISTORIAL
  const handleAuthorizeAndClose = async () => {
    if (!auditResult || !activeTrip || !selectedLegId) return;
    setIsProcessing(true);

    try {
      await axiosClient.post(`/trips/${selectedTripId}/timeline`, {
        status: auditResult.esRoboSospechado ? "incidencia" : "info",
        location: "Conciliación de Combustible",
        comments: `Auditoría Fase. Tol: ${((tolerancePct || 0.05) * 100).toFixed(1)}%. Dif: ${auditResult.diferenciaLitros.toFixed(2)}L. Rend: ${auditResult.rendimientoKmL.toFixed(2)} km/L. Ver: ${auditResult.estatus}.`,
        odometro: formData.lecturaFinalECM
          ? Number(formData.lecturaFinalECM)
          : null,
        combustible_litros: auditResult.totalFisicoLitros,
      });

      toast.success("Auditoría Registrada", {
        description:
          "Los datos se guardaron exitosamente. La deducción se aplicará en la liquidación de nómina.",
      });

      await fetchTrips();
      handleReset(); // Limpia y regresa a la tabla de historial
    } catch (error) {
      console.error("Error al conciliar:", error);
      toast.error("Error de Servidor", {
        description: "No se pudo guardar el veredicto de la auditoría.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Columnas para la tabla del Historial
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
        header: "Viaje / Folio",
        render: (trip: any) => (
          <span className="font-bold text-brand-navy">
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
            className="bg-slate-50 uppercase text-[9px] tracking-widest text-slate-600 border-slate-200"
          >
            {v?.replace("_", " ")}
          </Badge>
        ),
      },
      {
        key: "operator",
        header: "Operador",
        render: (op: any) => (
          <span className="font-semibold text-slate-700 text-sm">
            {op?.name || "N/A"}
          </span>
        ),
      },
      {
        key: "odometro_final",
        header: "Odómetro Final",
        render: (v: number) => (
          <span className="font-mono font-bold text-blue-600">
            {v?.toLocaleString() || 0} km
          </span>
        ),
      },
      {
        key: "status",
        header: "Estatus Fase",
        render: (v: string) => {
          const cerrado = ["entregado", "cerrado", "liquidado"].includes(
            String(v).toLowerCase(),
          );
          return (
            <Badge
              className={cn(
                "border-none tracking-widest text-[9px] uppercase",
                cerrado
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {cerrado ? "CERRADO" : "EN CURSO"}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] dark:bg-brand-navy/30 min-h-screen animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <PageHeader
          title="Auditoría y Conciliación Operativa"
          description="Conciliación Físico (Vales) vs Computadora (ECM) por cada fase del viaje."
          className="heading-crisp"
        />
      </div>

      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header de Configuración */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-brand-navy">
              <Calculator className="h-5 w-5 text-blue-500" /> Matemática de
              Auditoría
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              Tolerancia permitida:{" "}
              <span className="font-bold text-slate-900">
                {loadingTol ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  `${((tolerancePct || 0.05) * 100).toFixed(1)}%`
                )}
              </span>{" "}
              | Rend. Esperado:{" "}
              <span className="font-bold text-slate-900">
                {loadingRend ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  `${rendimientoConfig || 3.2} km/L`
                )}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2 font-bold"
          >
            <RotateCcw className="h-4 w-4" /> Limpiar
          </Button>
        </div>

        {/* Selectores */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 rounded-xl">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" /> 1. Buscar Viaje a
                Auditar:
              </Label>
              <Select value={selectedTripId} onValueChange={handleTripSelect}>
                <SelectTrigger className="bg-white border-slate-300 font-medium text-brand-navy h-11 shadow-sm">
                  <SelectValue placeholder="Seleccione viaje..." />
                </SelectTrigger>
                <SelectContent>
                  {trips
                    .filter(
                      (t) => String(t.status).toLowerCase() !== "liquidado",
                    )
                    .map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.public_id || t.id} | {t.origin} ➔ {t.destination}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                2. Seleccionar Fase / Tramo:
              </Label>
              <Select
                value={selectedLegId}
                onValueChange={handleLegSelect}
                disabled={!selectedTripId}
              >
                <SelectTrigger className="bg-white border-slate-300 font-medium text-brand-navy h-11 shadow-sm">
                  <SelectValue placeholder="Seleccione el tramo..." />
                </SelectTrigger>
                <SelectContent>
                  {tripLegs.map((leg) => (
                    <SelectItem key={leg.id} value={String(leg.id)}>
                      Fase: {leg.leg_type.replace("_", " ").toUpperCase()} | Op:{" "}
                      {leg.operator?.name || "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* RENDER CONDICIONAL: Si no hay fase, muestra Historial. Si hay fase, muestra Formulario */}
        {!tripData ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 pt-4">
            <div className="flex items-center gap-2 px-2">
              <History className="h-5 w-5 text-slate-400" />
              <h3 className="font-black uppercase tracking-widest text-slate-600 text-sm">
                Historial de Auditorías Realizadas
              </h3>
            </div>
            <Card className="border-none shadow-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/20 dark:border-white/5 ring-1 ring-slate-200/50 dark:ring-white/5">
              <CardContent className="p-0">
                <div className="[&_thead_tr]:bg-slate-100/90 [&_thead_tr]:dark:bg-slate-900/95">
                  <EnhancedDataTable
                    data={auditedLegs}
                    columns={auditedColumns as any}
                    className="liquid-glass-standard"
                    searchPlaceholder="BUSCAR FOLIO O OPERADOR..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <Card className="border-l-4 border-l-brand-navy shadow-sm">
              <CardHeader className="pb-3 bg-slate-50/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-600">
                  <FileText className="h-4 w-4" /> Resumen Operativo de la Fase
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">
                      Folio
                    </Label>
                    <div className="font-mono font-bold bg-slate-100 p-2.5 rounded-lg truncate text-slate-700">
                      {tripData.cartaPorteId}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">
                      Unidad
                    </Label>
                    <div className="font-bold bg-slate-100 p-2.5 rounded-lg text-slate-700">
                      ECO-{tripData.unidadId}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">
                      Operador a Cargo
                    </Label>
                    <div className="font-bold bg-blue-50 text-blue-700 border border-blue-100 p-2.5 rounded-lg truncate">
                      {tripData.operador}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">
                      Ruta Asignada
                    </Label>
                    <div className="font-bold bg-slate-100 p-2.5 rounded-lg truncate text-slate-700 text-xs">
                      {tripData.ruta}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 1. Suministro Físico */}
              <Card className="border-t-4 border-t-amber-500 shadow-sm overflow-hidden">
                <CardHeader className="bg-amber-50 pb-4 border-b border-amber-100">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-amber-700">
                    <Fuel className="h-4 w-4" /> 1. Suministro Físico (Vales)
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-600/70">
                    Suma extraída automáticamente del registro de cargas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 bg-white">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-black uppercase tracking-widest text-slate-700 text-[10px]">
                        Total Sincronizado
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-50"
                        onClick={() => fetchValesCombustible(selectedLegId)}
                        disabled={isFetchingVales || !selectedLegId}
                      >
                        <RefreshCw
                          className={cn(
                            "h-3 w-3 mr-2 text-amber-600",
                            isFetchingVales && "animate-spin",
                          )}
                        />
                        Actualizar
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        disabled
                        value={formData.litrosVales}
                        className="pr-12 pl-4 font-mono h-14 bg-amber-50 border-amber-200 text-3xl font-black text-amber-900 shadow-inner"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-700/50 font-black text-xl">
                        L
                      </span>
                    </div>
                  </div>
                  <Separator className="bg-amber-100" />
                  <div className="bg-amber-500 text-white rounded-xl p-5 shadow-inner flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-90">
                      Total Cobrado a Tesorería
                    </span>
                    <span className="text-3xl font-black font-mono">
                      {auditResult
                        ? auditResult.totalFisicoLitros.toFixed(1)
                        : "0.0"}{" "}
                      L
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Lectura ECM */}
              <Card className="border-t-4 border-t-blue-500 shadow-sm overflow-hidden">
                <CardHeader className="bg-blue-50 pb-4 border-b border-blue-100">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-blue-700">
                    <Gauge className="h-4 w-4" /> 2. Lectura ECM (Computadora)
                  </CardTitle>
                  <CardDescription className="text-xs text-blue-600/70">
                    Ingrese los datos reportados por la computadora de la
                    unidad.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="lecturaInicialECM"
                        className="font-bold text-[11px] text-slate-500 uppercase tracking-widest"
                      >
                        Odo Inicial
                      </Label>
                      <Input
                        id="lecturaInicialECM"
                        type="number"
                        value={formData.lecturaInicialECM}
                        onChange={(e) =>
                          handleInputChange("lecturaInicialECM", e.target.value)
                        }
                        className="h-11 font-mono text-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="lecturaFinalECM"
                        className="font-bold text-[11px] text-blue-600 uppercase tracking-widest"
                      >
                        Odo Final *
                      </Label>
                      <Input
                        id="lecturaFinalECM"
                        type="number"
                        value={formData.lecturaFinalECM}
                        onChange={(e) =>
                          handleInputChange("lecturaFinalECM", e.target.value)
                        }
                        className="h-11 font-mono border-blue-300 bg-blue-50/50 text-blue-900 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label
                      htmlFor="litrosConsumidosECM"
                      className="font-bold text-blue-800 uppercase tracking-widest text-[11px]"
                    >
                      Litros Quemados (Según ECM) *
                    </Label>
                    <div className="relative">
                      <Input
                        id="litrosConsumidosECM"
                        type="number"
                        step="0.1"
                        value={formData.litrosConsumidosECM}
                        onChange={(e) =>
                          handleInputChange(
                            "litrosConsumidosECM",
                            e.target.value,
                          )
                        }
                        className="h-14 pr-12 pl-4 border-blue-300 font-black font-mono text-3xl text-blue-900 bg-blue-50 shadow-inner"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-700/50 font-black text-xl">
                        L
                      </span>
                    </div>
                  </div>
                  <Separator className="bg-blue-100" />
                  <div className="bg-blue-600 text-white rounded-xl p-5 shadow-inner flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-90">
                      Total Reportado Motor
                    </span>
                    <span className="text-3xl font-black font-mono">
                      {auditResult
                        ? auditResult.totalDigitalLitros.toFixed(1)
                        : "0.0"}{" "}
                      L
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Veredicto del Algoritmo */}
            {auditResult && (
              <Card
                className={`transition-all duration-500 shadow-xl overflow-hidden border-0 ${auditResult.esRoboSospechado ? "bg-rose-600" : "bg-emerald-600"}`}
              >
                <div className="bg-black/20 p-4 flex justify-center items-center gap-2 text-white">
                  <Calculator className="h-4 w-4 opacity-70" />
                  <span className="text-xs font-black uppercase tracking-widest opacity-90">
                    Motor de Decisión (Algoritmo Gustavo)
                  </span>
                </div>

                <CardContent className="pt-6 p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">
                        Desviación (Físico vs ECM)
                      </p>
                      <p className="text-5xl font-black font-mono text-white drop-shadow-md">
                        {auditResult.diferenciaLitros > 0 ? "+" : ""}
                        {auditResult.diferenciaLitros.toFixed(1)}{" "}
                        <span className="text-2xl">L</span>
                      </p>
                      <p className="text-[10px] font-bold text-white/60 mt-3 bg-black/20 py-1 px-3 rounded-full inline-block">
                        Margen ({(tolerancePct || 0.05) * 100}%): ±
                        {auditResult.toleranciaPermitida.toFixed(1)} L
                      </p>
                    </div>

                    <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">
                        Rendimiento Operativo
                      </p>
                      <p className="text-5xl font-black font-mono text-white drop-shadow-md">
                        {auditResult.rendimientoKmL.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold text-white/60 mt-3 bg-black/20 py-1 px-3 rounded-full inline-block">
                        Km recorridos / Litros Pagados
                      </p>
                    </div>

                    <div className="text-center space-y-5 bg-white p-6 rounded-2xl shadow-xl">
                      {auditResult.esRoboSospechado ? (
                        <div className="animate-in zoom-in duration-300">
                          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-2 animate-pulse" />
                          <h3 className="text-sm font-black text-rose-700 uppercase tracking-widest">
                            Faltante Detectado
                          </h3>
                          <p className="text-[10px] text-rose-500/80 font-bold mt-1">
                            Excede tolerancia operativa.
                          </p>
                        </div>
                      ) : (
                        <div className="animate-in zoom-in duration-300">
                          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                          <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest">
                            Consumo Validado
                          </h3>
                          <p className="text-[10px] text-emerald-500/80 font-bold mt-1">
                            Dentro del margen permitido.
                          </p>
                        </div>
                      )}

                      <Button
                        size="lg"
                        onClick={handleAuthorizeAndClose}
                        disabled={isProcessing}
                        className={`w-full font-black text-white shadow-lg h-12 uppercase tracking-widest text-[10px] ${auditResult.esRoboSospechado ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Registrar y Volver al Historial
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
