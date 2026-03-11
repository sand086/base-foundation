import { useState, useMemo } from "react";
import {
  Fuel,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Gauge,
  TrendingUp,
  FileText,
  Truck,
  User,
  MapPin,
  ShieldAlert,
  Shield,
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
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useTrips } from "@/hooks/useTrips";

const TOLERANCE_PERCENTAGE = 0.003;

interface AuditFormData {
  litrosBomba: string;
  litrosVales: string;
  lecturaInicialECM: string;
  lecturaFinalECM: string;
  litrosConsumidosECM: string;
}

export default function CombustibleConciliacion() {
  const { trips } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [formData, setFormData] = useState<AuditFormData>({
    litrosBomba: "",
    litrosVales: "",
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
      fechaViaje: new Date(activeTrip.start_date).toLocaleDateString(),
    };
  }, [activeTrip]);

  // Al cambiar el viaje, reseteamos la calculadora
  const handleTripSelect = (id: string) => {
    setSelectedTripId(id);
    setFormData({
      litrosBomba: "",
      litrosVales: "",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });
    setAuditCompleted(false);
  };

  const auditResult = useMemo(() => {
    const litrosBomba = parseFloat(formData.litrosBomba) || 0;
    const litrosVales = parseFloat(formData.litrosVales) || 0;
    const litrosConsumidosECM = parseFloat(formData.litrosConsumidosECM) || 0;
    const lecturaInicial = parseFloat(formData.lecturaInicialECM) || 0;
    const lecturaFinal = parseFloat(formData.lecturaFinalECM) || 0;

    if (litrosConsumidosECM <= 0) return null;

    const totalFisicoLitros = litrosBomba + litrosVales;
    const totalDigitalLitros = litrosConsumidosECM;
    const diferenciaLitros = totalFisicoLitros - totalDigitalLitros;

    const kmsRecorridos =
      lecturaFinal > lecturaInicial ? lecturaFinal - lecturaInicial : 0;
    const rendimientoKmL =
      totalFisicoLitros > 0 ? kmsRecorridos / totalFisicoLitros : 0;
    const toleranciaPermitida = totalDigitalLitros * TOLERANCE_PERCENTAGE;

    let estatus: "CONCILIADO" | "COBRO_OPERADOR" | "PENDIENTE" = "PENDIENTE";
    let esRoboSospechado = false;

    if (totalFisicoLitros > 0) {
      if (diferenciaLitros > toleranciaPermitida) {
        estatus = "COBRO_OPERADOR";
        esRoboSospechado = true;
      } else {
        estatus = "CONCILIADO";
        esRoboSospechado = false;
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
  }, [formData]);

  const handleInputChange = (field: keyof AuditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setAuditCompleted(false);
  };

  const handleReset = () => {
    setSelectedTripId("");
    setFormData({
      litrosBomba: "",
      litrosVales: "",
      lecturaInicialECM: "",
      lecturaFinalECM: "",
      litrosConsumidosECM: "",
    });
    setAuditCompleted(false);
  };

  const handleAuthorizeAndClose = () => {
    if (!auditResult || !activeTrip) {
      toast({
        title: "Datos incompletos",
        description:
          "Por favor seleccione un viaje y complete los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setAuditCompleted(true);
      setShowReceiptModal(true);

      toast({
        title:
          auditResult.estatus === "COBRO_OPERADOR"
            ? "⚠️ Vale de Cobro Generado"
            : "✅ Viaje Conciliado",
        description:
          auditResult.estatus === "COBRO_OPERADOR"
            ? `Diferencia de ${auditResult.diferenciaLitros.toFixed(2)} L detectada. Cargo aplicado al operador.`
            : "El viaje ha sido conciliado exitosamente sin diferencias significativas.",
        variant:
          auditResult.estatus === "COBRO_OPERADOR" ? "destructive" : "default",
      });
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-brand-dark">
            <Calculator className="h-6 w-6" /> Conciliación de Combustible
          </h1>
          <p className="text-muted-foreground">
            Herramienta de Auditoría — Tolerancia:{" "}
            <span className="font-semibold text-foreground">±0.3%</span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2 font-bold"
        >
          <RotateCcw className="h-4 w-4" /> Nueva Auditoría
        </Button>
      </div>

      {/* 🚀 BÚSQUEDA DEL VIAJE REAL */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex items-center gap-4 bg-slate-50 rounded-xl">
          <Label className="font-bold text-slate-700 whitespace-nowrap flex items-center gap-2">
            <Search className="h-4 w-4" /> Buscar Viaje a Conciliar:
          </Label>
          <Select value={selectedTripId} onValueChange={handleTripSelect}>
            <SelectTrigger className="bg-white border-slate-300 font-medium text-brand-navy max-w-xl">
              <SelectValue placeholder="Seleccione un viaje del histórico..." />
            </SelectTrigger>
            <SelectContent>
              {trips
                .filter((t) => String(t.status).toLowerCase() !== "liquidado")
                .map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    Folio: {t.public_id || t.id} | {t.origin} → {t.destination}{" "}
                    ({t.status.toUpperCase()})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!tripData ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-600">
            Selecciona un viaje para iniciar la auditoría
          </p>
        </div>
      ) : (
        <>
          {/* Section 1: Trip Information */}
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" /> Información del Viaje (Lectura
                de BD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Folio Sistema
                  </Label>
                  <div className="flex items-center gap-2 font-mono font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground" />{" "}
                    {tripData.cartaPorteId}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Unidad (Tracto)
                  </Label>
                  <div className="flex items-center gap-2 font-mono font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md">
                    <Truck className="h-4 w-4 text-muted-foreground" />{" "}
                    {tripData.unidadId}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ruta</Label>
                  <div
                    className="flex items-center gap-2 font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md truncate"
                    title={tripData.ruta}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />{" "}
                    {tripData.ruta}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Operador
                  </Label>
                  <div
                    className="flex items-center gap-2 font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md truncate"
                    title={tripData.operador}
                  >
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />{" "}
                    {tripData.operador}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: The "Auditor" Form */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-t-4 border-t-amber-500 shadow-sm">
              <CardHeader className="bg-amber-50/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <Fuel className="h-5 w-5" /> 1. Datos Físicos (Vales y Bomba)
                </CardTitle>
                <CardDescription>
                  Combustible entregado o inyectado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="litrosBomba"
                    className="flex items-center gap-2"
                  >
                    Litros Bomba (Patio){" "}
                    <span className="text-xs text-muted-foreground">
                      — Carga inicial en base
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="litrosBomba"
                      type="number"
                      step="0.01"
                      placeholder="Ej: 350.00"
                      value={formData.litrosBomba}
                      onChange={(e) =>
                        handleInputChange("litrosBomba", e.target.value)
                      }
                      className="pr-10 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      L
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="litrosVales"
                    className="flex items-center gap-2"
                  >
                    Litros Vales (En Ruta){" "}
                    <span className="text-xs text-muted-foreground">
                      — Recargas en el viaje
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="litrosVales"
                      type="number"
                      step="0.01"
                      placeholder="Ej: 80.00"
                      value={formData.litrosVales}
                      onChange={(e) =>
                        handleInputChange("litrosVales", e.target.value)
                      }
                      className="pr-10 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      L
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-800">
                      Total Físico Inyectado
                    </span>
                    <span className="text-2xl font-black font-mono text-amber-700">
                      {auditResult
                        ? auditResult.totalFisicoLitros.toFixed(2)
                        : "0.00"}{" "}
                      L
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500 shadow-sm">
              <CardHeader className="bg-blue-50/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <Gauge className="h-5 w-5" /> 2. Datos Digitales (ECM)
                </CardTitle>
                <CardDescription>
                  Lecturas del computador del motor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lecturaInicialECM">Odómetro Inicial</Label>
                    <div className="relative">
                      <Input
                        id="lecturaInicialECM"
                        type="number"
                        step="1"
                        placeholder="Ej: 245000"
                        value={formData.lecturaInicialECM}
                        onChange={(e) =>
                          handleInputChange("lecturaInicialECM", e.target.value)
                        }
                        className="pr-12 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        km
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lecturaFinalECM">Odómetro Final</Label>
                    <div className="relative">
                      <Input
                        id="lecturaFinalECM"
                        type="number"
                        step="1"
                        placeholder="Ej: 245425"
                        value={formData.lecturaFinalECM}
                        onChange={(e) =>
                          handleInputChange("lecturaFinalECM", e.target.value)
                        }
                        className="pr-12 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        km
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="litrosConsumidosECM"
                    className="flex items-center gap-2 font-bold"
                  >
                    Litros Consumidos ECM *
                  </Label>
                  <div className="relative">
                    <Input
                      id="litrosConsumidosECM"
                      type="number"
                      step="0.01"
                      placeholder="Requerido..."
                      value={formData.litrosConsumidosECM}
                      onChange={(e) =>
                        handleInputChange("litrosConsumidosECM", e.target.value)
                      }
                      className="pr-10 font-mono border-blue-300 focus-visible:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      L
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-800">
                      Total Computadora
                    </span>
                    <span className="text-2xl font-black font-mono text-blue-700">
                      {auditResult
                        ? auditResult.totalDigitalLitros.toFixed(2)
                        : "0.00"}{" "}
                      L
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 3: Analysis Results */}
          <Card
            className={`transition-all duration-500 shadow-md ${auditResult?.esRoboSospechado ? "border-2 border-red-500 bg-red-50/30" : auditResult?.estatus === "CONCILIADO" ? "border-2 border-emerald-500 bg-emerald-50/30" : "border border-slate-200"}`}
          >
            <CardHeader className="text-center border-b pb-4 bg-white/50">
              <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5" /> 3. Veredicto del Algoritmo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!auditResult ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calculator className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Llene los datos físicos y del ECM para ver el cálculo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 col-span-1">
                    <p className="text-sm font-bold text-slate-500 uppercase mb-2">
                      Desviación (Físico vs ECM)
                    </p>
                    <p
                      className={`text-4xl font-black font-mono ${auditResult.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {auditResult.diferenciaLitros > 0 ? "+" : ""}
                      {auditResult.diferenciaLitros.toFixed(2)} L
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-3">
                      Tolerancia permitida: ±
                      {auditResult.toleranciaPermitida.toFixed(2)} L
                    </p>
                  </div>

                  <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 col-span-1">
                    <p className="text-sm font-bold text-slate-500 uppercase mb-2">
                      Rendimiento Operativo
                    </p>
                    <p className="text-4xl font-black font-mono text-brand-navy">
                      {auditResult.rendimientoKmL.toFixed(2)}
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-3">
                      Kilómetros por Litro (Km/L)
                    </p>
                  </div>

                  <div className="text-center space-y-4 col-span-1">
                    {auditResult.esRoboSospechado ? (
                      <div className="animate-in zoom-in duration-300">
                        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-2 animate-pulse" />
                        <h3 className="text-lg font-black text-red-700 uppercase tracking-widest">
                          Ordeña Detectada
                        </h3>
                      </div>
                    ) : (
                      <div className="animate-in zoom-in duration-300">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                        <h3 className="text-lg font-black text-emerald-700 uppercase tracking-widest">
                          Consumo Perfecto
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
                        ? "APLICAR CARGO Y CERRAR"
                        : "CONCILIAR Y CERRAR"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt Modal */}
          <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
            <DialogContent className="max-w-md">
              <DialogHeader className="text-center border-b pb-4">
                <DialogTitle
                  className={`text-xl font-black flex justify-center items-center gap-2 ${auditResult?.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                >
                  {auditResult?.esRoboSospechado ? (
                    <ShieldAlert />
                  ) : (
                    <CheckCircle />
                  )}
                  TICKET DE CONCILIACIÓN
                </DialogTitle>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  {new Date().toLocaleString("es-MX")}
                </p>
              </DialogHeader>

              {auditResult && (
                <div className="space-y-3 py-4 text-sm font-medium text-slate-700">
                  <div className="flex justify-between border-b pb-2">
                    <span>Folio Viaje:</span>{" "}
                    <span className="font-mono font-bold text-slate-900">
                      {tripData.cartaPorteId}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Operador:</span>{" "}
                    <span className="font-bold text-slate-900 text-right">
                      {tripData.operador}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Litros Físicos:</span>{" "}
                    <span className="font-mono">
                      {auditResult.totalFisicoLitros.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Litros Computadora:</span>{" "}
                    <span className="font-mono">
                      {auditResult.totalDigitalLitros.toFixed(2)} L
                    </span>
                  </div>
                  <div className="flex justify-between bg-slate-100 p-3 rounded-lg mt-4">
                    <span className="font-black text-slate-800">
                      DIFERENCIA FINAL:
                    </span>
                    <span
                      className={`font-black font-mono text-lg ${auditResult.esRoboSospechado ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {auditResult.diferenciaLitros > 0 ? "+" : ""}
                      {auditResult.diferenciaLitros.toFixed(2)} L
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  className="w-full font-bold bg-slate-800 hover:bg-slate-900 text-white"
                  onClick={() => {
                    setShowReceiptModal(false);
                    toast({ title: "Enviado a impresora" });
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" /> IMPRIMIR RECIBO
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
