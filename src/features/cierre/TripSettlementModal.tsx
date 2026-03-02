// src/features/cierre/TripSettlementModal.tsx
import { useState, useEffect, useMemo } from "react";
import {
  FileCheck,
  Fuel,
  CheckCircle,
  Clock,
  Truck,
  User,
  MapPin,
  AlertTriangle,
  DollarSign,
  Receipt,
  TrendingUp,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Droplets,
  Plus,
  Award,
  Loader2,
  Calculator,
  Gauge,
  ShieldAlert,
  Shield,
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SettlementReceiptModal } from "./SettlementReceiptModal";
import { useTrips } from "@/hooks/useTrips";

interface TripSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
}

const TOLERANCE_PERCENTAGE = 0.003; // 0.3% Tolerancia ECM

export function TripSettlementModal({
  open,
  onOpenChange,
  tripId,
}: TripSettlementModalProps) {
  const { getTripSettlement, closeTripSettlement } = useTrips();
  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Estados para Bono Manual
  const [showAddBonoDialog, setShowAddBonoDialog] = useState(false);
  const [bonoAmount, setBonoAmount] = useState("");
  const [bonoDescription, setBonoDescription] = useState("");

  // Paso actual (0 = Conciliacion Combustible, 1 = Liquidacion Financiera)
  const [step, setStep] = useState(0);

  // Formulario de Auditoría
  const [fuelForm, setFuelForm] = useState({
    litrosBomba: "",
    litrosVales: "",
    lecturaInicialECM: "",
    lecturaFinalECM: "",
    litrosConsumidosECM: "",
  });

  useEffect(() => {
    if (open && tripId) {
      setLoading(true);
      setStep(0);
      getTripSettlement(tripId).then((data) => {
        setSettlement(data);
        // Precargamos los litros de vales que el backend haya encontrado
        setFuelForm({
          litrosBomba: "",
          litrosVales: data?.consumoRealLitros
            ? String(data.consumoRealLitros)
            : "",
          lecturaInicialECM: "",
          lecturaFinalECM: "",
          litrosConsumidosECM: "",
        });
        setLoading(false);
      });
    } else {
      setSettlement(null);
    }
  }, [open, tripId]);

  const handleInputChange = (field: string, value: string) => {
    setFuelForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  // Cálculo en tiempo real de la auditoría
  const auditResult = useMemo(() => {
    if (!settlement) return null;

    const litrosBomba = parseFloat(fuelForm.litrosBomba) || 0;
    const litrosVales = parseFloat(fuelForm.litrosVales) || 0;
    const litrosConsumidosECM = parseFloat(fuelForm.litrosConsumidosECM) || 0;
    const lecturaInicial = parseFloat(fuelForm.lecturaInicialECM) || 0;
    const lecturaFinal = parseFloat(fuelForm.lecturaFinalECM) || 0;

    if (litrosConsumidosECM <= 0) return null;

    const totalFisicoLitros = litrosBomba + litrosVales;
    const totalDigitalLitros = litrosConsumidosECM;
    const diferenciaLitros = totalFisicoLitros - totalDigitalLitros;

    const kmsRecorridos =
      lecturaFinal > lecturaInicial
        ? lecturaFinal - lecturaInicial
        : settlement.kmsRecorridos;
    const rendimientoKmL =
      totalFisicoLitros > 0 ? kmsRecorridos / totalFisicoLitros : 0;

    const toleranciaPermitida = totalDigitalLitros * TOLERANCE_PERCENTAGE;
    const esRoboSospechado = diferenciaLitros > toleranciaPermitida;
    const deduccionCalculada = esRoboSospechado
      ? diferenciaLitros * settlement.precioPorLitro
      : 0;

    return {
      totalFisicoLitros,
      totalDigitalLitros,
      diferenciaLitros,
      rendimientoKmL,
      toleranciaPermitida,
      esRoboSospechado,
      deduccionCalculada,
    };
  }, [fuelForm, settlement]);

  const handleContinueToFinance = () => {
    if (!auditResult) {
      toast.error("Datos Incompletos", {
        description: "Ingresa los litros consumidos (ECM) para continuar.",
      });
      return;
    }

    // Actualizamos los conceptos de liquidación basados en esta auditoría manual
    setSettlement((prev: any) => {
      // Filtramos cualquier deducción de combustible previa del backend
      const conceptosLimpios = prev.conceptos.filter(
        (c: any) => c.categoria !== "combustible",
      );

      // Si la auditoría manual detectó robo, agregamos el vale
      if (auditResult.esRoboSospechado) {
        conceptosLimpios.push({
          id: `CP-COMB-${Date.now()}`,
          tipo: "deduccion",
          categoria: "combustible",
          descripcion: `Vale Exceso Combustible (${auditResult.diferenciaLitros.toFixed(2)} L)`,
          monto: auditResult.deduccionCalculada,
          esAutomatico: true,
        });
      }

      const totalIng = conceptosLimpios
        .filter((c: any) => c.tipo === "ingreso")
        .reduce((sum: number, c: any) => sum + c.monto, 0);
      const totalDed = conceptosLimpios
        .filter((c: any) => c.tipo === "deduccion")
        .reduce((sum: number, c: any) => sum + c.monto, 0);

      return {
        ...prev,
        conceptos: conceptosLimpios,
        totalIngresos: totalIng,
        totalDeducciones: totalDed,
        netoAPagar: totalIng - totalDed,
      };
    });

    setStep(1); // Pasamos al paso 2
  };

  const handleAddBono = () => {
    const amount = parseFloat(bonoAmount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Ingresa un monto válido");

    const newBono = {
      id: `CP-BONO-${Date.now()}`,
      tipo: "ingreso",
      categoria: "bono",
      descripcion: bonoDescription.trim() || "Bono adicional",
      monto: amount,
      esAutomatico: false,
    };

    setSettlement((prev: any) => ({
      ...prev,
      conceptos: [...prev.conceptos, newBono],
      totalIngresos: prev.totalIngresos + amount,
      netoAPagar: prev.totalIngresos + amount - prev.totalDeducciones,
    }));

    setShowAddBonoDialog(false);
    setBonoAmount("");
    setBonoDescription("");
    toast.success(`Se agregó un bono de ${formatCurrency(amount)}`);
  };

  const handleAuthorizeAndClose = async () => {
    if (!tripId || !settlement) return;
    setIsAnimating(true);

    const ok = await closeTripSettlement(tripId, {
      conceptos: settlement.conceptos,
      totalIngresos: settlement.totalIngresos,
      totalDeducciones: settlement.totalDeducciones,
      netoAPagar: settlement.netoAPagar,
    });

    setIsAnimating(false);
    if (ok) {
      setSettlement((prev: any) => ({ ...prev, estatus: "cerrado" }));
      setShowReceipt(true);
    }
  };

  const handleCloseAll = () => {
    setShowReceipt(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-brand-navy">
            {step === 0 ? (
              <Calculator className="h-6 w-6" />
            ) : (
              <FileCheck className="h-6 w-6" />
            )}
            {step === 0
              ? "1. Auditoría de Combustible"
              : "2. Liquidación Financiera"}
          </DialogTitle>
        </DialogHeader>

        {loading || !settlement ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-navy" />
            <p>Cargando información del viaje...</p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {/* ✅ Encabezado Informativo del Viaje */}
            <div className="grid gap-4 md:grid-cols-5">
              <div className="bg-white p-3 rounded-xl border shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  ID Viaje
                </p>
                <p className="font-bold text-slate-800 text-sm">
                  {settlement.viajeId}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Operador
                </p>
                <p className="font-bold text-slate-800 text-sm truncate flex items-center gap-1">
                  <User className="h-3 w-3" /> {settlement.operadorNombre}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Unidad
                </p>
                <p className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1">
                  <Truck className="h-3 w-3" /> {settlement.unidadNumero}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Kms Reales
                </p>
                <p className="font-bold text-slate-800 text-sm">
                  {settlement.kmsRecorridos.toLocaleString()} km
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Estatus
                </p>
                <Badge
                  className={
                    settlement.estatus === "cerrado"
                      ? "bg-emerald-500"
                      : "bg-blue-500"
                  }
                >
                  {settlement.estatus.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* ============================================================== */}
            {/* PASO 1: CONCILIACIÓN DE COMBUSTIBLE */}
            {/* ============================================================== */}
            {step === 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Datos Físicos */}
                  <Card className="border-t-4 border-t-sky-500 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Fuel className="h-5 w-5 text-sky-500" /> Datos Físicos
                      </CardTitle>
                      <CardDescription>
                        Combustible entregado real
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Litros Bomba (Patio)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={fuelForm.litrosBomba}
                            onChange={(e) =>
                              handleInputChange("litrosBomba", e.target.value)
                            }
                            className="pr-10"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            L
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Litros Vales (En Ruta)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={fuelForm.litrosVales}
                            onChange={(e) =>
                              handleInputChange("litrosVales", e.target.value)
                            }
                            className="pr-10"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            L
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Datos Digitales (ECM) */}
                  <Card className="border-t-4 border-t-primary shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-primary" /> Datos
                        Digitales (ECM)
                      </CardTitle>
                      <CardDescription>
                        Lecturas del computador del motor
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lectura Inicial (km)</Label>
                          <Input
                            type="number"
                            value={fuelForm.lecturaInicialECM}
                            onChange={(e) =>
                              handleInputChange(
                                "lecturaInicialECM",
                                e.target.value,
                              )
                            }
                            placeholder="Opcional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lectura Final (km)</Label>
                          <Input
                            type="number"
                            value={fuelForm.lecturaFinalECM}
                            onChange={(e) =>
                              handleInputChange(
                                "lecturaFinalECM",
                                e.target.value,
                              )
                            }
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">
                          Litros Consumidos (ECM) *
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={fuelForm.litrosConsumidosECM}
                            onChange={(e) =>
                              handleInputChange(
                                "litrosConsumidosECM",
                                e.target.value,
                              )
                            }
                            className="pr-10 border-primary"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            L
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Resultados del Análisis */}
                {auditResult && (
                  <Card
                    className={`border-2 ${auditResult.esRoboSospechado ? "border-status-danger bg-status-danger-bg/30" : "border-status-success bg-status-success-bg/30"}`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> Resultados de
                        Auditoría (Tolerancia:{" "}
                        {(TOLERANCE_PERCENTAGE * 100).toFixed(1)}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card
                          className={
                            auditResult.esRoboSospechado
                              ? "border-status-danger"
                              : "border-status-success"
                          }
                        >
                          <CardContent className="pt-6 text-center">
                            <p className="text-sm font-medium text-muted-foreground">
                              Diferencia Físico - ECM
                            </p>
                            <p
                              className={`text-4xl font-bold font-mono ${auditResult.esRoboSospechado ? "text-status-danger" : "text-status-success"}`}
                            >
                              {auditResult.diferenciaLitros > 0 ? "+" : ""}
                              {auditResult.diferenciaLitros.toFixed(2)} L
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tolerancia permitida: ±
                              {auditResult.toleranciaPermitida.toFixed(2)} L
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6 text-center">
                            <p className="text-sm font-medium text-muted-foreground">
                              Rendimiento Calculado
                            </p>
                            <p className="text-4xl font-bold font-mono">
                              {auditResult.rendimientoKmL.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Km/L
                            </p>
                          </CardContent>
                        </Card>

                        <Card
                          className={
                            auditResult.esRoboSospechado
                              ? "border-status-danger"
                              : "border-status-success"
                          }
                        >
                          <CardContent className="pt-6 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-3">
                              Estatus
                            </p>
                            {auditResult.esRoboSospechado ? (
                              <div className="flex flex-col items-center">
                                <ShieldAlert className="h-10 w-10 text-status-danger animate-pulse mb-2" />
                                <Badge
                                  variant="destructive"
                                  className="text-sm"
                                >
                                  COBRO AL OPERADOR
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Shield className="h-10 w-10 text-status-success mb-2" />
                                <Badge className="text-sm bg-status-success text-white hover:bg-status-success/90">
                                  CONCILIADO OK
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    size="lg"
                    onClick={handleContinueToFinance}
                    className="bg-brand-navy hover:bg-brand-navy/90 text-white shadow-md"
                  >
                    Continuar a Liquidación Financiera
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 2: LIQUIDACIÓN FINANCIERA Y CIERRE */}
            {/* ============================================================== */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="border-b bg-slate-50/50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5 text-brand-navy" /> Resumen
                      Final (Ingresos y Deducciones)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* COLUMNA INGRESOS */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-600 font-bold">
                            <ArrowUpCircle className="h-5 w-5" /> INGRESOS AL
                            OPERADOR
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddBonoDialog(true)}
                            disabled={settlement.estatus === "cerrado"}
                            className="h-8"
                          >
                            <Award className="h-3 w-3 mr-2" /> Agregar Bono
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {settlement.conceptos
                            .filter((c: any) => c.tipo === "ingreso")
                            .map((c: any, i: number) => (
                              <div
                                key={i}
                                className={`flex justify-between items-center p-3 rounded border ${c.categoria === "bono" ? "bg-amber-50 border-amber-200" : "bg-slate-50"}`}
                              >
                                <span className="text-sm font-medium flex items-center gap-2">
                                  {c.categoria === "bono" && (
                                    <Award className="h-4 w-4 text-amber-600" />
                                  )}
                                  {c.descripcion}
                                </span>
                                <span className="font-mono font-bold text-emerald-600">
                                  +{formatCurrency(c.monto)}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="flex justify-between p-3 bg-emerald-50 rounded-lg font-bold text-emerald-700">
                          <span>Subtotal Ingresos</span>
                          <span>
                            {formatCurrency(settlement.totalIngresos)}
                          </span>
                        </div>
                      </div>

                      {/* COLUMNA DEDUCCIONES */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-600 font-bold h-8">
                          <ArrowDownCircle className="h-5 w-5" /> DEDUCCIONES /
                          ANTICIPOS
                        </div>
                        <div className="space-y-2">
                          {settlement.conceptos
                            .filter((c: any) => c.tipo === "deduccion")
                            .map((c: any, i: number) => (
                              <div
                                key={i}
                                className={`flex justify-between items-center p-3 rounded border ${c.categoria === "combustible" ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50"}`}
                              >
                                <span className="text-sm font-medium flex items-center gap-2">
                                  {c.categoria === "combustible" && (
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                  )}
                                  {c.descripcion}
                                </span>
                                <span className="font-mono font-bold text-red-600">
                                  -{formatCurrency(c.monto)}
                                </span>
                              </div>
                            ))}
                          {settlement.conceptos.filter(
                            (c: any) => c.tipo === "deduccion",
                          ).length === 0 && (
                            <p className="text-sm text-muted-foreground italic p-3 text-center border border-dashed rounded bg-slate-50">
                              Sin deducciones aplicadas.
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between p-3 bg-red-50 rounded-lg font-bold text-red-700">
                          <span>Subtotal Deducciones</span>
                          <span>
                            -{formatCurrency(settlement.totalDeducciones)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* GRAN TOTAL FINAL */}
                    <div className="flex items-center justify-between bg-brand-navyp-5 rounded-xl shadow-md">
                      <div>
                        <p className="text-sm opacity-80 uppercase tracking-wide font-bold">
                          SALDO NETO A PAGAR
                        </p>
                        {settlement.estatus === "cerrado" && (
                          <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Liquidado y
                            Cerrado
                          </p>
                        )}
                      </div>
                      <span className="text-4xl font-mono font-black">
                        {formatCurrency(settlement.netoAPagar)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* BOTONES DE NAVEGACIÓN Y CIERRE */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    ← Regresar a Conciliación
                  </Button>
                  <div className="space-x-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button
                      size="lg"
                      disabled={isAnimating || settlement.estatus === "cerrado"}
                      onClick={handleAuthorizeAndClose}
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
                    >
                      {isAnimating ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      Autorizar y Cerrar Viaje
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {/* Modal Interno de Bonos */}
      <Dialog open={showAddBonoDialog} onOpenChange={setShowAddBonoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Bono Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={bonoDescription}
                onChange={(e) => setBonoDescription(e.target.value)}
                placeholder="Ej: Bono por rendimiento"
              />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={bonoAmount}
                onChange={(e) => setBonoAmount(e.target.value)}
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddBonoDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddBono} disabled={!bonoAmount}>
              Aplicar Bono
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal del Recibo Final PDF */}
      {settlement && (
        <SettlementReceiptModal
          open={showReceipt}
          onClose={handleCloseAll}
          settlement={settlement}
          authorizationDate={new Date().toLocaleDateString()}
          authorizationUser="Admin"
        />
      )}
    </Dialog>
  );
}
