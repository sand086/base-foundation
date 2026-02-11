import { useState, useMemo, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Trip data for the audit (simulated - would come from selected trip)
const mockTripData = {
  cartaPorteId: "CP-2024-001587",
  unidadId: "TR-204",
  ruta: "Veracruz → CDMX (Cedis Norte)",
  operador: "Juan Carlos Mendoza",
  fechaViaje: "2024-01-10",
  kmsRecorridos: 425,
};

// Tolerance constant - 0.3%
const TOLERANCE_PERCENTAGE = 0.003;

interface AuditFormData {
  // Physical Data (Pump/Vouchers)
  litrosBomba: string;
  litrosVales: string;
  // Digital Data (ECM)
  lecturaInicialECM: string;
  lecturaFinalECM: string;
  litrosConsumidosECM: string;
}

interface AuditResult {
  totalFisicoLitros: number;
  totalDigitalLitros: number;
  diferenciaLitros: number;
  rendimientoKmL: number;
  toleranciaPermitida: number;
  estatus: "CONCILIADO" | "COBRO_OPERADOR" | "PENDIENTE";
  esRoboSospechado: boolean;
}

export default function CombustibleConciliacion() {
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

  // Real-time calculation of audit results
  const auditResult = useMemo<AuditResult | null>(() => {
    const litrosBomba = parseFloat(formData.litrosBomba) || 0;
    const litrosVales = parseFloat(formData.litrosVales) || 0;
    const litrosConsumidosECM = parseFloat(formData.litrosConsumidosECM) || 0;
    const lecturaInicial = parseFloat(formData.lecturaInicialECM) || 0;
    const lecturaFinal = parseFloat(formData.lecturaFinalECM) || 0;

    // Need at least the physical and digital liters to calculate
    if (litrosConsumidosECM <= 0) {
      return null;
    }

    // A. The Math
    const totalFisicoLitros = litrosBomba + litrosVales;
    const totalDigitalLitros = litrosConsumidosECM;
    const diferenciaLitros = totalFisicoLitros - totalDigitalLitros;

    // Calculate efficiency (km/L) - only if we have valid readings
    const kmsRecorridos =
      lecturaFinal > lecturaInicial
        ? lecturaFinal - lecturaInicial
        : mockTripData.kmsRecorridos;
    const rendimientoKmL =
      totalFisicoLitros > 0 ? kmsRecorridos / totalFisicoLitros : 0;

    // B. Tolerance Rule (0.3%)
    const toleranciaPermitida = totalDigitalLitros * TOLERANCE_PERCENTAGE;

    // Determine status
    let estatus: "CONCILIADO" | "COBRO_OPERADOR" | "PENDIENTE" = "PENDIENTE";
    let esRoboSospechado = false;

    if (totalFisicoLitros > 0) {
      if (diferenciaLitros > toleranciaPermitida) {
        // Positive deviation beyond tolerance = THEFT SUSPECTED
        estatus = "COBRO_OPERADOR";
        esRoboSospechado = true;
      } else if (Math.abs(diferenciaLitros) <= toleranciaPermitida) {
        // Within tolerance = OK
        estatus = "CONCILIADO";
        esRoboSospechado = false;
      } else {
        // Negative deviation (operator used less than reported) - still OK but flag it
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
    if (!auditResult) {
      toast({
        title: "Datos incompletos",
        description:
          "Por favor complete todos los campos requeridos para la conciliación",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setAuditCompleted(true);
      setShowReceiptModal(true);

      toast({
        title:
          auditResult.estatus === "COBRO_OPERADOR"
            ? "⚠️ Vale de Cobro Generado"
            : " Viaje Conciliado",
        description:
          auditResult.estatus === "COBRO_OPERADOR"
            ? `Diferencia de ${auditResult.diferenciaLitros.toFixed(
                2,
              )} L detectada. Cargo aplicado al operador.`
            : "El viaje ha sido conciliado exitosamente sin diferencias significativas.",
        variant:
          auditResult.estatus === "COBRO_OPERADOR" ? "destructive" : "default",
      });
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
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
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Nueva Auditoría
        </Button>
      </div>

      {/* Section 1: Trip Information (Read-Only Header) */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Información del Viaje
          </CardTitle>
          <CardDescription>
            Datos del viaje a auditar (solo lectura)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Carta Porte ID
              </Label>
              <div className="flex items-center gap-2 font-mono font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {mockTripData.cartaPorteId}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unidad</Label>
              <div className="flex items-center gap-2 font-mono font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md">
                <Truck className="h-4 w-4 text-muted-foreground" />
                {mockTripData.unidadId}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ruta</Label>
              <div className="flex items-center gap-2 font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {mockTripData.ruta}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Operador</Label>
              <div className="flex items-center gap-2 font-semibold text-brand-dark bg-muted/50 px-3 py-2 rounded-md">
                <User className="h-4 w-4 text-muted-foreground" />
                {mockTripData.operador}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: The "Auditor" Form */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Physical Data (Inputs) */}
        <Card className="border-t-4 border-t-status-info">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fuel className="h-5 w-5 text-status-info" /> Datos Físicos
            </CardTitle>
            <CardDescription>
              Combustible entregado (Bomba + Vales en ruta)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="litrosBomba" className="flex items-center gap-2">
                Litros Bomba (Patio)
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
              <Label htmlFor="litrosVales" className="flex items-center gap-2">
                Litros Vales (En Ruta)
                <span className="text-xs text-muted-foreground">
                  — Recargas durante el viaje
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

            <div className="bg-status-info-bg border border-status-info-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-status-info">
                  Total Físico Entregado
                </span>
                <span className="text-2xl font-bold font-mono text-status-info">
                  {auditResult
                    ? auditResult.totalFisicoLitros.toFixed(2)
                    : "0.00"}{" "}
                  L
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digital Data (Inputs) */}
        <Card className="border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" /> Datos Digitales (ECM)
            </CardTitle>
            <CardDescription>
              Lecturas del computador del motor (Scanner)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lecturaInicialECM">Lectura Inicial (km)</Label>
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
                <Label htmlFor="lecturaFinalECM">Lectura Final (km)</Label>
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
                className="flex items-center gap-2"
              >
                Litros Consumidos (ECM)
                <span className="text-xs text-muted-foreground">
                  — Según computadora del motor
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="litrosConsumidosECM"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 420.50"
                  value={formData.litrosConsumidosECM}
                  onChange={(e) =>
                    handleInputChange("litrosConsumidosECM", e.target.value)
                  }
                  className="pr-10 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  L
                </span>
              </div>
            </div>

            <Separator />

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">
                  Total Digital Reportado
                </span>
                <span className="text-2xl font-bold font-mono text-primary">
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

      {/* Section 3: Analysis Results (Auto-Calculated) */}
      <Card
        className={`transition-all duration-500 ${
          auditResult?.esRoboSospechado
            ? "border-2 border-status-danger bg-status-danger-bg/30 shadow-lg shadow-status-danger/10"
            : auditResult?.estatus === "CONCILIADO"
              ? "border-2 border-status-success bg-status-success-bg/30 shadow-lg shadow-status-success/10"
              : "border border-border"
        }`}
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Resultados del Análisis
          </CardTitle>
          <CardDescription>
            Cálculo automático con tolerancia de ±
            {(TOLERANCE_PERCENTAGE * 100).toFixed(1)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Difference Card */}
                <Card
                  className={`${
                    auditResult.esRoboSospechado
                      ? "border-status-danger bg-status-danger-bg"
                      : "border-status-success bg-status-success-bg"
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Diferencia
                      </p>
                      <p
                        className={`text-4xl font-bold font-mono ${
                          auditResult.esRoboSospechado
                            ? "text-status-danger"
                            : "text-status-success"
                        }`}
                      >
                        {auditResult.diferenciaLitros > 0 ? "+" : ""}
                        {auditResult.diferenciaLitros.toFixed(2)} L
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tolerancia permitida: ±
                        {auditResult.toleranciaPermitida.toFixed(2)} L
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Efficiency Card */}
                <Card className="border-muted">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Rendimiento
                      </p>
                      <p className="text-4xl font-bold font-mono text-brand-dark">
                        {auditResult.rendimientoKmL.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Km/L</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Card */}
                <Card
                  className={`${
                    auditResult.esRoboSospechado
                      ? "border-status-danger"
                      : "border-status-success"
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Estatus
                      </p>
                      {auditResult.esRoboSospechado ? (
                        <div className="space-y-2">
                          <div className="flex justify-center">
                            <ShieldAlert className="h-10 w-10 text-status-danger animate-pulse" />
                          </div>
                          <Badge
                            variant="destructive"
                            className="text-lg px-4 py-1 animate-pulse"
                          >
                            COBRO AL OPERADOR
                          </Badge>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-center">
                            <Shield className="h-10 w-10 text-status-success" />
                          </div>
                          <Badge className="text-lg px-4 py-1 bg-status-success text-white hover:bg-status-success/90">
                            CONCILIADO
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alert Message for Theft Detection */}
              {auditResult.esRoboSospechado && (
                <div className="bg-status-danger/10 border-2 border-status-danger rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-status-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-status-danger">
                        ⚠️ ALERTA: Desviación Detectada
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        La diferencia de{" "}
                        <strong className="text-status-danger">
                          {auditResult.diferenciaLitros.toFixed(2)} L
                        </strong>{" "}
                        excede la tolerancia permitida de{" "}
                        <strong>
                          ±{auditResult.toleranciaPermitida.toFixed(2)} L
                        </strong>{" "}
                        (0.3% del consumo ECM).
                      </p>
                      <p className="text-sm text-status-danger font-medium mt-2">
                        Se generará un Vale de Cobro al operador{" "}
                        <strong>{mockTripData.operador}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conciliated Success Message */}
              {auditResult.estatus === "CONCILIADO" && (
                <div className="bg-status-success/10 border-2 border-status-success rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-status-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-status-success">
                        Auditoría Exitosa
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        La diferencia de{" "}
                        <strong className="text-status-success">
                          {Math.abs(auditResult.diferenciaLitros).toFixed(2)} L
                        </strong>{" "}
                        está dentro de la tolerancia permitida de{" "}
                        <strong>
                          ±{auditResult.toleranciaPermitida.toFixed(2)} L
                        </strong>
                        .
                      </p>
                      <p className="text-sm text-status-success font-medium mt-2">
                        El viaje puede ser cerrado sin cargos adicionales.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                <Button
                  size="lg"
                  onClick={handleAuthorizeAndClose}
                  disabled={isProcessing}
                  className={`gap-2 ${
                    auditResult.esRoboSospechado
                      ? "bg-status-danger hover:bg-status-danger/90"
                      : "bg-action hover:bg-action-hover"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      {auditResult.esRoboSospechado
                        ? "Autorizar y Generar Vale de Cobro"
                        : "Autorizar y Cerrar Viaje"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Complete los campos de auditoría</p>
              <p className="text-sm">
                Los resultados se calcularán automáticamente
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {auditResult?.esRoboSospechado ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-status-danger" />
                  Vale de Cobro Generado
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-status-success" />
                  Comprobante de Conciliación
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Viaje {mockTripData.cartaPorteId}
            </DialogDescription>
          </DialogHeader>

          {auditResult && (
            <div className="space-y-4 py-4">
              {/* Receipt Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-bold text-brand-dark">
                  <img
                    src="/logo-white.svg"
                    alt="3T Logistics"
                    className="h-6"
                  />
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sistema de Conciliación de Combustible
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date().toLocaleString("es-MX")}
                </p>
              </div>

              {/* Trip Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carta Porte:</span>
                  <span className="font-mono font-medium">
                    {mockTripData.cartaPorteId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidad:</span>
                  <span className="font-mono font-medium">
                    {mockTripData.unidadId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operador:</span>
                  <span className="font-medium">{mockTripData.operador}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ruta:</span>
                  <span className="font-medium text-right">
                    {mockTripData.ruta}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Fuel Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Combustible Físico:
                  </span>
                  <span className="font-mono">
                    {auditResult.totalFisicoLitros.toFixed(2)} L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Combustible ECM:
                  </span>
                  <span className="font-mono">
                    {auditResult.totalDigitalLitros.toFixed(2)} L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rendimiento:</span>
                  <span className="font-mono">
                    {auditResult.rendimientoKmL.toFixed(2)} Km/L
                  </span>
                </div>
              </div>

              <Separator />

              {/* Result */}
              <div
                className={`p-4 rounded-lg ${
                  auditResult.esRoboSospechado
                    ? "bg-status-danger-bg border border-status-danger"
                    : "bg-status-success-bg border border-status-success"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">Diferencia:</span>
                  <span
                    className={`text-xl font-bold font-mono ${
                      auditResult.esRoboSospechado
                        ? "text-status-danger"
                        : "text-status-success"
                    }`}
                  >
                    {auditResult.diferenciaLitros > 0 ? "+" : ""}
                    {auditResult.diferenciaLitros.toFixed(2)} L
                  </span>
                </div>
                <div className="flex justify-center mt-3">
                  <Badge
                    className={`${
                      auditResult.esRoboSospechado
                        ? "bg-status-danger text-white"
                        : "bg-status-success text-white"
                    }`}
                  >
                    {auditResult.esRoboSospechado
                      ? "COBRO AL OPERADOR"
                      : "CONCILIADO"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptModal(false)}
            >
              Cerrar
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                toast({
                  title: "Imprimiendo...",
                  description: "El comprobante se enviará a la impresora",
                });
              }}
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
