import { useState, useMemo, useEffect } from "react";
import {
  Fuel,
  CheckCircle,
  Calculator,
  Gauge,
  TrendingUp,
  FileText,
  Truck,
  User,
  MapPin,
  ShieldAlert,
  RotateCcw,
  Printer,
  Search,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTrips } from "@/hooks/useTrips";
import { useSystemConfig } from "@/hooks/useSystemConfig"; // 🚀 Nuevo Hook
import axiosClient from "@/api/axiosClient";

interface AuditFormData {
  litrosBomba: string;
  litrosVales: string;
  lecturaInicialECM: string;
  lecturaFinalECM: string;
  litrosConsumidosECM: string;
}

export default function CombustibleConciliacion() {
  const { trips, fetchTrips } = useTrips();

  // 🚀 Obtenemos las configuraciones del sistema (Fallbacks de seguridad incluidos en el hook)
  const { valueAsNumber: tolerancePct, isLoading: loadingTol } =
    useSystemConfig("tolerancia_diesel_pct");
  const { valueAsNumber: rendimientoConfig, isLoading: loadingRend } =
    useSystemConfig("rendimiento_diesel_esperado");
  const { value: empresaRfc } = useSystemConfig("empresa_rfc");

  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [formData, setFormData] = useState<AuditFormData>({
    litrosBomba: "",
    litrosVales: "0",
    lecturaInicialECM: "",
    lecturaFinalECM: "",
    litrosConsumidosECM: "",
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditCompleted, setAuditCompleted] = useState(false);

  // 🚀 OBTENER LOS DATOS REALES DEL VIAJE SELECCIONADO
  const activeTrip = useMemo(() => {
    return trips.find((t) => String(t.id) === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const tripData = useMemo(() => {
    if (!activeTrip) return null;
    const leg = activeTrip.legs?.[0]; // Tomamos el tramo principal
    return {
      cartaPorteId: activeTrip.public_id || `TRP-${activeTrip.id}`,
      unidadId: leg?.unit?.numero_economico || "Sin Unidad",
      ruta: `${activeTrip.origin} → ${activeTrip.destination}`,
      operador: leg?.operator?.name || "Sin Operador",
      fechaViaje: activeTrip.start_date
        ? new Date(activeTrip.start_date).toLocaleDateString()
        : "N/A",
    };
  }, [activeTrip]);

  // 🚀 AL SELECCIONAR EL VIAJE, BUSCAMOS SUS VALES AUTOMÁTICAMENTE
  const handleTripSelect = async (id: string) => {
    setSelectedTripId(id);
    setAuditCompleted(false);

    setFormData({
      litrosBomba: "",
      litrosVales: "...", // Feedback visual de carga
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });

    try {
      const response = await axiosClient.get("/fuel/fuel-logs");

      // Filtramos vales de diésel vinculados a este viaje (ID de viaje o ID de cualquiera de sus tramos)
      const legIds = activeTrip?.legs?.map((l: any) => String(l.id)) || [];
      const valesDiesel = response.data.filter((log: any) => {
        const isDiesel = log.tipo_combustible === "diesel";
        const isMatch =
          String(log.trip_id) === id ||
          String(log.trip_leg_id) === id ||
          legIds.includes(String(log.trip_leg_id));
        return isDiesel && isMatch;
      });

      // Sumamos litros
      const totalVales = valesDiesel.reduce(
        (sum: number, log: any) => sum + Number(log.litros),
        0,
      );

      setFormData((prev) => ({
        ...prev,
        litrosVales: totalVales.toString(),
      }));

      if (totalVales > 0) {
        toast.success("Vales Vinculados", {
          description: `Se detectaron ${totalVales.toFixed(2)} L registrados en este viaje.`,
        });
      }
    } catch (error) {
      console.error("Error sincronizando vales:", error);
      setFormData((prev) => ({ ...prev, litrosVales: "0" }));
      toast.error("Error de Sincronización", {
        description: "No se pudieron obtener los vales de la base de datos.",
      });
    }
  };

  const auditResult = useMemo(() => {
    const litrosBomba = Number(formData.litrosBomba) || 0;
    const litrosVales = Number(formData.litrosVales) || 0;
    const litrosConsumidosECM = Number(formData.litrosConsumidosECM) || 0;
    const lecturaInicial = Number(formData.lecturaInicialECM) || 0;
    const lecturaFinal = Number(formData.lecturaFinalECM) || 0;

    if (litrosConsumidosECM <= 0) return null;

    const totalFisicoLitros = litrosBomba + litrosVales;
    const totalDigitalLitros = litrosConsumidosECM;

    // Diferencia: Lo que entró (Físico) menos lo que el camión dice que quemó (ECM)
    const diferenciaLitros = totalFisicoLitros - totalDigitalLitros;

    const kmsRecorridos =
      lecturaFinal > lecturaInicial ? lecturaFinal - lecturaInicial : 0;
    const rendimientoKmL =
      totalFisicoLitros > 0 ? kmsRecorridos / totalFisicoLitros : 0;

    // 🚀 AHORA USA LA TOLERANCIA DINÁMICA DE LA BD
    const toleranciaPermitida = totalDigitalLitros * tolerancePct;

    let estatus: "CONCILIADO" | "COBRO_OPERADOR" | "PENDIENTE" = "PENDIENTE";
    let esRoboSospechado = false;

    if (totalFisicoLitros > 0) {
      // Si la diferencia (sobrante físico no quemado) es mayor a la tolerancia, es cobro
      if (diferenciaLitros > toleranciaPermitida) {
        estatus = "COBRO_OPERADOR";
        esRoboSospechado = true;
      } else {
        estatus = "CONCILIADO";
      }
    }

    return {
      totalFisicoLitros,
      totalDigitalLitros,
      diferenciaLitros,
      rendimientoKmL,
      toleranciaPermitida,
      estatus,
      esRoboSospechado,
    };
  }, [formData, tolerancePct]); // Agregamos tolerancePct a las dependencias

  const handleInputChange = (field: keyof AuditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setAuditCompleted(false);
  };

  const handleReset = () => {
    setSelectedTripId("");
    setFormData({
      litrosBomba: "",
      litrosVales: "0",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });
    setAuditCompleted(false);
  };

  // 🚀 CIERRE OFICIAL DE AUDITORÍA
  const handleAuthorizeAndClose = async () => {
    if (!auditResult || !activeTrip) return;

    setIsProcessing(true);

    try {
      // Guardamos el resultado en la bitácora del viaje (Timeline) usando los valores de configuración
      await axiosClient.post(`/trips/${selectedTripId}/timeline`, {
        status: auditResult.esRoboSospechado ? "incidencia" : "info",
        location: "Conciliación de Combustible",
        comments: `Auditoría con ${(tolerancePct * 100).toFixed(1)}% tol. Dif: ${auditResult.diferenciaLitros.toFixed(2)}L. Rend: ${auditResult.rendimientoKmL.toFixed(2)} km/L (Esp: ${rendimientoConfig}). Veredicto: ${auditResult.estatus}.`,
        odometro: formData.lecturaFinalECM
          ? Number(formData.lecturaFinalECM)
          : null,
      });

      setAuditCompleted(true);
      setShowReceiptModal(true);

      toast.success("Auditoría Registrada", {
        description: auditResult.esRoboSospechado
          ? "Se ha generado una incidencia por exceso de consumo."
          : "Viaje conciliado exitosamente.",
      });

      await fetchTrips();
    } catch (error) {
      console.error("Error al conciliar:", error);
      toast.error("Error de Servidor", {
        description: "No se pudo guardar el veredicto de la auditoría.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-brand-navy">
            <Calculator className="h-6 w-6" /> Conciliación de Combustible
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Auditoría de Rendimiento — Tolerancia:{" "}
            <span className="font-bold text-slate-900">
              {loadingTol ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `${(tolerancePct * 100).toFixed(1)}%`
              )}
            </span>
            | Rend. Base:{" "}
            <span className="font-bold text-slate-900">
              {loadingRend ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `${rendimientoConfig} km/L`
              )}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2 font-bold border-2"
        >
          <RotateCcw className="h-4 w-4" /> Resetear
        </Button>
      </div>

      {/* Selector de Viaje */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex items-center gap-4 bg-slate-50 rounded-xl">
          <Label className="font-bold text-slate-700 whitespace-nowrap flex items-center gap-2">
            <Search className="h-4 w-4" /> Buscar Viaje:
          </Label>
          <Select value={selectedTripId} onValueChange={handleTripSelect}>
            <SelectTrigger className="bg-white border-slate-300 font-medium text-brand-navy max-w-xl h-11">
              <SelectValue placeholder="Seleccione un viaje activo..." />
            </SelectTrigger>
            <SelectContent>
              {trips
                .filter((t) => String(t.status).toLowerCase() !== "liquidado")
                .map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.public_id || t.id} | {t.origin} ➔ {t.destination} (
                    {t.status.toUpperCase()})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!tripData ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
          <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-500">
            Selecciona un viaje para iniciar la auditoría
          </p>
        </div>
      ) : (
        <>
          {/* Información del Viaje */}
          <Card className="border-l-4 border-l-brand-navy shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" /> Datos del Viaje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Folio Sistema
                  </Label>
                  <div className="font-mono font-bold bg-slate-100 p-2 rounded-md truncate">
                    {tripData.cartaPorteId}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Unidad
                  </Label>
                  <div className="font-bold bg-slate-100 p-2 rounded-md">
                    ECO-{tripData.unidadId}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Operador
                  </Label>
                  <div className="font-bold bg-slate-100 p-2 rounded-md truncate">
                    {tripData.operador}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    RFC Empresa
                  </Label>
                  <div className="font-mono font-bold bg-slate-100 p-2 rounded-md truncate">
                    {empresaRfc}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de Auditoría */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LADO 1: FÍSICO */}
            <Card className="border-t-4 border-t-amber-500 shadow-sm">
              <CardHeader className="bg-amber-50/50 pb-4 border-b border-amber-100">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <Fuel className="h-5 w-5" /> 1. Suministro Físico (Diésel)
                </CardTitle>
                <CardDescription>
                  Combustible inyectado en Base + Vales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="litrosBomba"
                    className="font-bold text-slate-700"
                  >
                    Carga Inicial Bomba (Patio)
                  </Label>
                  <div className="relative">
                    <Input
                      id="litrosBomba"
                      type="number"
                      step="0.01"
                      value={formData.litrosBomba}
                      onChange={(e) =>
                        handleInputChange("litrosBomba", e.target.value)
                      }
                      className="pr-10 h-11 font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      L
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="litrosVales"
                    className="font-bold text-slate-700"
                  >
                    Suma de Vales (Sincronizado)
                  </Label>
                  <div className="relative">
                    <Input
                      id="litrosVales"
                      type="text"
                      disabled
                      value={formData.litrosVales}
                      className="pr-10 font-mono h-11 bg-slate-100 font-bold text-slate-600"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      L
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Dato calculado automáticamente de los vales del viaje.
                  </p>
                </div>
                <Separator />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-inner flex justify-between items-center">
                  <span className="text-xs font-black text-amber-800 uppercase">
                    Total Suministrado
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-700">
                    {auditResult
                      ? auditResult.totalFisicoLitros.toFixed(2)
                      : "0.00"}{" "}
                    L
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* LADO 2: ECM */}
            <Card className="border-t-4 border-t-blue-500 shadow-sm">
              <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <Gauge className="h-5 w-5" /> 2. Lectura ECM (Computadora)
                </CardTitle>
                <CardDescription>Datos reportados por el motor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lecturaInicialECM" className="font-bold">
                      ODO Inicial
                    </Label>
                    <Input
                      id="lecturaInicialECM"
                      type="number"
                      value={formData.lecturaInicialECM}
                      onChange={(e) =>
                        handleInputChange("lecturaInicialECM", e.target.value)
                      }
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lecturaFinalECM" className="font-bold">
                      ODO Final
                    </Label>
                    <Input
                      id="lecturaFinalECM"
                      type="number"
                      value={formData.lecturaFinalECM}
                      onChange={(e) =>
                        handleInputChange("lecturaFinalECM", e.target.value)
                      }
                      className="h-11 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="litrosConsumidosECM"
                    className="font-bold text-blue-800"
                  >
                    Litros Quemados (Lectura ECM) *
                  </Label>
                  <Input
                    id="litrosConsumidosECM"
                    type="number"
                    step="0.01"
                    value={formData.litrosConsumidosECM}
                    onChange={(e) =>
                      handleInputChange("litrosConsumidosECM", e.target.value)
                    }
                    className="h-11 border-blue-300 font-bold text-blue-900 bg-blue-50/20"
                  />
                </div>
                <Separator />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-inner flex justify-between items-center">
                  <span className="text-xs font-black text-blue-800 uppercase">
                    Total Quemado
                  </span>
                  <span className="text-2xl font-black font-mono text-blue-700">
                    {auditResult
                      ? auditResult.totalDigitalLitros.toFixed(2)
                      : "0.00"}{" "}
                    L
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Veredicto del Algoritmo */}
          {auditResult && (
            <Card
              className={`transition-all duration-500 shadow-md ${auditResult.esRoboSospechado ? "border-2 border-red-500 bg-red-50/30" : "border-2 border-emerald-500 bg-emerald-50/30"}`}
            >
              <CardHeader className="text-center border-b pb-4 bg-white/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">
                  Resultado de Auditoría Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                      Desviación Neta
                    </p>
                    <p
                      className={`text-4xl font-black font-mono ${auditResult.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {auditResult.diferenciaLitros > 0 ? "+" : ""}
                      {auditResult.diferenciaLitros.toFixed(2)} L
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">
                      Margen ({(tolerancePct * 100).toFixed(1)}%): ±
                      {auditResult.toleranciaPermitida.toFixed(2)} L
                    </p>
                  </div>

                  <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                      Rendimiento Operativo
                    </p>
                    <p className="text-4xl font-black font-mono text-brand-navy">
                      {auditResult.rendimientoKmL.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">
                      Km/L (Vs Suministro Real)
                    </p>
                  </div>

                  <div className="text-center space-y-4">
                    {auditResult.esRoboSospechado ? (
                      <div className="animate-in zoom-in duration-300">
                        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-1 animate-pulse" />
                        <h3 className="text-sm font-black text-red-700 uppercase tracking-widest">
                          Faltante Excesivo
                        </h3>
                      </div>
                    ) : (
                      <div className="animate-in zoom-in duration-300">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-1" />
                        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest">
                          Consumo Validado
                        </h3>
                      </div>
                    )}
                    <Button
                      size="lg"
                      onClick={handleAuthorizeAndClose}
                      disabled={isProcessing}
                      className={`w-full font-black text-white shadow-xl ${auditResult.esRoboSospechado ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      {auditResult.esRoboSospechado
                        ? "REGISTRAR INCIDENCIA"
                        : "CERRAR AUDITORÍA"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ticket de Recibo */}
          <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
            <DialogContent className="max-w-md bg-white rounded-2xl">
              <DialogHeader className="text-center border-b pb-4">
                <DialogTitle
                  className={`text-xl font-black flex justify-center items-center gap-2 ${auditResult?.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                >
                  {auditResult?.esRoboSospechado ? (
                    <ShieldAlert />
                  ) : (
                    <CheckCircle />
                  )}{" "}
                  TICKET DE CONCILIACIÓN
                </DialogTitle>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  {new Date().toLocaleString("es-MX")}
                </p>
              </DialogHeader>

              {auditResult && (
                <div className="space-y-3 py-4 text-sm font-medium text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Folio Viaje:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {tripData.cartaPorteId}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Operador:</span>
                    <span className="font-bold text-slate-900 text-right">
                      {tripData.operador}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Rendimiento:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {auditResult.rendimientoKmL.toFixed(2)} Km/L
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Total Físico:</span>
                    <span className="font-mono">
                      {auditResult.totalFisicoLitros.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Total ECM:</span>
                    <span className="font-mono">
                      {auditResult.totalDigitalLitros.toFixed(2)} L
                    </span>
                  </div>

                  <div className="flex justify-between bg-slate-100 p-3 rounded-lg mt-4 font-black">
                    <span className="text-slate-800">DIFERENCIA:</span>
                    <span
                      className={
                        auditResult.esRoboSospechado
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    >
                      {auditResult.diferenciaLitros > 0 ? "+" : ""}
                      {auditResult.diferenciaLitros.toFixed(2)} L
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  className="w-full font-bold bg-slate-800 hover:bg-slate-900 text-white h-12"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" /> IMPRIMIR AUDITORÍA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
