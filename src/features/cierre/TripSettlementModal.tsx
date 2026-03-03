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
  ShieldAlert,
  Shield,
  Gauge,
  X,
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

  // Estado principal que viene del Backend
  const [settlement, setSettlement] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Paso actual (0 = Conciliacion Combustible, 1 = Gastos Extra, 2 = Liquidacion)
  const [step, setStep] = useState(0);

  // Formularios manuales para agregar cosas en el momento
  const [showAddBonoDialog, setShowAddBonoDialog] = useState(false);
  const [bonoAmount, setBonoAmount] = useState("");
  const [bonoDescription, setBonoDescription] = useState("");

  const [showFuelForm, setShowFuelForm] = useState(false);
  const [manualFuel, setManualFuel] = useState({
    litros: "",
    precio: "",
    estacion: "",
  });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [manualExpense, setManualExpense] = useState({
    monto: "",
    descripcion: "",
  });

  // Formulario de Auditoría (ECM)
  const [ecmForm, setEcmForm] = useState({
    lecturaInicialECM: "",
    lecturaFinalECM: "",
    litrosConsumidosECM: "",
  });

  useEffect(() => {
    if (open && tripId) {
      setLoading(true);
      setStep(0);
      // Reset forms
      setEcmForm({
        lecturaInicialECM: "",
        lecturaFinalECM: "",
        litrosConsumidosECM: "",
      });
      setShowFuelForm(false);
      setShowExpenseForm(false);

      getTripSettlement(tripId).then((data) => {
        setSettlement(data);
        setLoading(false);
      });
    } else {
      setSettlement(null);
    }
  }, [open, tripId, getTripSettlement]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  // ==========================================
  // LÓGICA DE CÁLCULOS DINÁMICOS
  // ==========================================

  const fuelTickets = useMemo(() => {
    if (!settlement) return [];
    // Filtramos los conceptos que son vales de diesel de la DB
    return settlement.conceptos.filter(
      (c: any) => c.categoria === "combustible_ticket",
    );
  }, [settlement]);

  const totalLitrosFisicos = useMemo(() => {
    return fuelTickets.reduce(
      (sum: number, t: any) => sum + (t.metadata?.litros || 0),
      0,
    );
  }, [fuelTickets]);

  const auditResult = useMemo(() => {
    if (!settlement) return null;

    const litrosConsumidosECM = parseFloat(ecmForm.litrosConsumidosECM) || 0;
    if (litrosConsumidosECM <= 0) return null;

    const diferenciaLitros = totalLitrosFisicos - litrosConsumidosECM;
    const toleranciaPermitida = litrosConsumidosECM * TOLERANCE_PERCENTAGE;
    const esRoboSospechado = diferenciaLitros > toleranciaPermitida;

    // Calculamos el precio promedio pagado por litro para hacer la deducción
    const precioPromedio =
      fuelTickets.length > 0
        ? fuelTickets.reduce(
            (sum: number, t: any) => sum + (t.metadata?.precio_por_litro || 0),
            0,
          ) / fuelTickets.length
        : settlement.precioPorLitro || 24.5;

    const deduccionCalculada = esRoboSospechado
      ? diferenciaLitros * precioPromedio
      : 0;

    return {
      diferenciaLitros,
      toleranciaPermitida,
      esRoboSospechado,
      deduccionCalculada,
      litrosConsumidosECM,
    };
  }, [ecmForm, totalLitrosFisicos, settlement, fuelTickets]);

  // ==========================================
  // HANDLERS PARA AGREGAR DATOS MANUALES
  // ==========================================

  const handleAddManualFuel = () => {
    const lts = parseFloat(manualFuel.litros);
    const prc = parseFloat(manualFuel.precio);
    if (
      isNaN(lts) ||
      isNaN(prc) ||
      lts <= 0 ||
      prc <= 0 ||
      !manualFuel.estacion
    ) {
      return toast.error("Completa todos los campos del ticket");
    }

    const montoTotal = lts * prc;

    const nuevoConcepto = {
      id: `CP-COMB-MANUAL-${Date.now()}`,
      tipo: "deduccion",
      categoria: "combustible_ticket",
      descripcion: `Ticket Manual: ${manualFuel.estacion}`,
      monto: montoTotal,
      esAutomatico: false,
      metadata: { litros: lts, precio_por_litro: prc }, // Guardamos litros extra para el recálculo
    };

    setSettlement((prev: any) => ({
      ...prev,
      conceptos: [...prev.conceptos, nuevoConcepto],
      totalDeducciones: prev.totalDeducciones + montoTotal,
      netoAPagar: prev.totalIngresos - (prev.totalDeducciones + montoTotal),
    }));

    setManualFuel({ litros: "", precio: "", estacion: "" });
    setShowFuelForm(false);
    toast.success("Ticket de combustible agregado");
  };

  const handleAddManualExpense = () => {
    const monto = parseFloat(manualExpense.monto);
    if (isNaN(monto) || monto <= 0 || !manualExpense.descripcion) {
      return toast.error("Completa descripción y monto del gasto");
    }

    const nuevoConcepto = {
      id: `CP-GASTO-${Date.now()}`,
      tipo: "ingreso", // Se asume que la empresa le REEMBOLSA el gasto al chofer (Ingreso a su favor)
      categoria: "gasto_extra",
      descripcion: `Reembolso Gasto: ${manualExpense.descripcion}`,
      monto: monto,
      esAutomatico: false,
    };

    setSettlement((prev: any) => ({
      ...prev,
      conceptos: [...prev.conceptos, nuevoConcepto],
      totalIngresos: prev.totalIngresos + monto,
      netoAPagar: prev.totalIngresos + monto - prev.totalDeducciones,
    }));

    setManualExpense({ monto: "", descripcion: "" });
    setShowExpenseForm(false);
    toast.success("Gasto extra agregado como reembolso");
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

  // ==========================================
  // NAVEGACIÓN Y CIERRE FINAL
  // ==========================================

  const proceedToFinance = () => {
    if (!auditResult && totalLitrosFisicos > 0) {
      return toast.error(
        "Debes ingresar los litros del ECM para validar el rendimiento.",
      );
    }

    // Inyectar el vale de cobro si hubo robo
    if (auditResult && auditResult.esRoboSospechado) {
      setSettlement((prev: any) => {
        // Limpiamos vales de exceso anteriores para no duplicar si el usuario va y viene
        const limpios = prev.conceptos.filter(
          (c: any) => c.categoria !== "cobro_exceso_combustible",
        );

        const valeCastigo = {
          id: `CP-EXCESO-${Date.now()}`,
          tipo: "deduccion",
          categoria: "cobro_exceso_combustible",
          descripcion: `Cobro Exceso Combustible (${auditResult.diferenciaLitros.toFixed(2)} L)`,
          monto: auditResult.deduccionCalculada,
          esAutomatico: true,
        };

        limpios.push(valeCastigo);

        const tIngresos = limpios
          .filter((c: any) => c.tipo === "ingreso")
          .reduce((a: number, b: any) => a + b.monto, 0);
        const tDeducciones = limpios
          .filter((c: any) => c.tipo === "deduccion")
          .reduce((a: number, b: any) => a + b.monto, 0);

        return {
          ...prev,
          conceptos: limpios,
          totalIngresos: tIngresos,
          totalDeducciones: tDeducciones,
          netoAPagar: tIngresos - tDeducciones,
        };
      });
    }

    setStep(1);
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
              ? "Paso 1: Auditoría y Gastos de Ruta"
              : "Paso 2: Resumen y Cierre Financiero"}
          </DialogTitle>
        </DialogHeader>

        {loading || !settlement ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-navy" />
            <p>Cruzando datos de viaje, anticipos y combustible...</p>
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
            {/* PASO 1: CONCILIACIÓN DE COMBUSTIBLE Y GASTOS */}
            {/* ============================================================== */}
            {step === 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* SECCIÓN DE TICKETS Y GASTOS */}
                  <div className="space-y-4">
                    <Card className="border-t-4 border-t-sky-500 shadow-sm h-full">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Fuel className="h-5 w-5 text-sky-500" /> Cargas
                            Físicas de Ruta
                          </CardTitle>
                          <CardDescription>
                            Tickets registrados y vales.
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFuelForm(!showFuelForm)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Ticket
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Formulario Oculto Ticket */}
                        {showFuelForm && (
                          <div className="bg-slate-50 p-3 rounded-lg border border-sky-200 mb-4 grid grid-cols-2 gap-2 relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border"
                              onClick={() => setShowFuelForm(false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">
                                Estación/Referencia
                              </Label>
                              <Input
                                value={manualFuel.estacion}
                                onChange={(e) =>
                                  setManualFuel({
                                    ...manualFuel,
                                    estacion: e.target.value,
                                  })
                                }
                                className="h-8 text-sm"
                                placeholder="Ej: OXXO Gas Celaya"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Litros</Label>
                              <Input
                                type="number"
                                value={manualFuel.litros}
                                onChange={(e) =>
                                  setManualFuel({
                                    ...manualFuel,
                                    litros: e.target.value,
                                  })
                                }
                                className="h-8 text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Precio/L</Label>
                              <Input
                                type="number"
                                value={manualFuel.precio}
                                onChange={(e) =>
                                  setManualFuel({
                                    ...manualFuel,
                                    precio: e.target.value,
                                  })
                                }
                                className="h-8 text-sm"
                                placeholder="24.50"
                              />
                            </div>
                            <Button
                              className="col-span-2 h-8 text-xs mt-1"
                              onClick={handleAddManualFuel}
                            >
                              Guardar Ticket
                            </Button>
                          </div>
                        )}

                        <div className="space-y-2">
                          {fuelTickets.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-4 bg-slate-50 rounded border border-dashed">
                              No hay tickets registrados en este viaje.
                            </p>
                          ) : (
                            fuelTickets.map((t: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-sky-50/50 border border-sky-100 p-2 rounded-md text-sm"
                              >
                                <span className="font-medium text-slate-700">
                                  {t.descripcion}
                                </span>
                                <span className="font-mono text-sky-700 font-bold">
                                  {t.metadata?.litros?.toFixed(2) || 0} L
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex justify-between p-3 bg-slate-100 rounded-lg font-bold border">
                          <span>Total Litros Físicos:</span>
                          <span className="font-mono text-lg">
                            {totalLitrosFisicos.toFixed(2)} L
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* SECCIÓN ECM Y GASTOS ADICIONALES */}
                  <div className="space-y-4">
                    <Card className="border-t-4 border-t-primary shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Gauge className="h-5 w-5 text-primary" /> Datos del
                          Motor (ECM)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="font-bold text-brand-navy">
                              Total Litros Consumidos (Lectura ECM) *
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={ecmForm.litrosConsumidosECM}
                                onChange={(e) =>
                                  setEcmForm({
                                    ...ecmForm,
                                    litrosConsumidosECM: e.target.value,
                                  })
                                }
                                className="pr-10 border-primary h-12 text-lg font-mono"
                                placeholder="0.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                L
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border border-slate-200">
                      <CardHeader className="pb-3 flex flex-row justify-between items-center py-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                          <Receipt className="h-4 w-4" /> Gastos de Ruta /
                          Emergencias
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowExpenseForm(!showExpenseForm)}
                          className="h-7 text-xs border"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Reembolsar Gasto
                        </Button>
                      </CardHeader>
                      {showExpenseForm && (
                        <CardContent className="pt-0">
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 grid gap-3 relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 rounded-full"
                              onClick={() => setShowExpenseForm(false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Motivo (Ej: Talachero, Pensión)
                              </Label>
                              <Input
                                value={manualExpense.descripcion}
                                onChange={(e) =>
                                  setManualExpense({
                                    ...manualExpense,
                                    descripcion: e.target.value,
                                  })
                                }
                                className="h-8 text-sm bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Monto a Reembolsar (MXN)
                              </Label>
                              <Input
                                type="number"
                                value={manualExpense.monto}
                                onChange={(e) =>
                                  setManualExpense({
                                    ...manualExpense,
                                    monto: e.target.value,
                                  })
                                }
                                className="h-8 text-sm bg-white"
                                placeholder="0.00"
                              />
                            </div>
                            <Button
                              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={handleAddManualExpense}
                            >
                              Registrar como Reembolso
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                </div>

                {/* RESULTADO AUDITORIA EN VIVO */}
                {auditResult && (
                  <Card
                    className={`border-2 shadow-md ${auditResult.esRoboSospechado ? "border-status-danger bg-status-danger-bg/20" : "border-status-success bg-status-success-bg/20"}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> Resultado de
                        Auditoría de Combustible
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div
                          className={`p-4 rounded-xl border ${auditResult.esRoboSospechado ? "bg-white border-red-200" : "bg-white border-emerald-200"}`}
                        >
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            Diferencia Físico - ECM
                          </p>
                          <p
                            className={`text-3xl font-bold font-mono mt-1 ${auditResult.esRoboSospechado ? "text-status-danger" : "text-status-success"}`}
                          >
                            {auditResult.diferenciaLitros > 0 ? "+" : ""}
                            {auditResult.diferenciaLitros.toFixed(2)} L
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Tolerancia permitida: ±
                            {auditResult.toleranciaPermitida.toFixed(2)} L
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-white border shadow-sm flex flex-col justify-center items-center text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            Estatus Sistema
                          </p>
                          {auditResult.esRoboSospechado ? (
                            <Badge
                              variant="destructive"
                              className="mt-2 text-sm py-1 px-3 flex items-center gap-1 shadow-sm animate-pulse"
                            >
                              <ShieldAlert className="h-4 w-4" /> EXCESO
                              DETECTADO
                            </Badge>
                          ) : (
                            <Badge className="mt-2 text-sm py-1 px-3 flex items-center gap-1 bg-emerald-500 shadow-sm">
                              <Shield className="h-4 w-4" /> CONCILIADO OK
                            </Badge>
                          )}
                        </div>

                        {auditResult.esRoboSospechado && (
                          <div className="p-4 rounded-xl bg-red-100 border border-red-300 flex flex-col justify-center">
                            <p className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Acción
                            </p>
                            <p className="text-xl font-bold text-red-600 mt-1 font-mono">
                              Deducción de{" "}
                              {formatCurrency(auditResult.deduccionCalculada)}
                            </p>
                            <p className="text-[10px] text-red-700 mt-1 leading-tight">
                              Se creará un Vale de Cobro en la liquidación
                              automáticamente.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    size="lg"
                    onClick={proceedToFinance}
                    className="bg-brand-navy hover:bg-brand-navy/90 text-white shadow-lg text-md h-12 px-8"
                  >
                    Continuar a Liquidación Financiera →
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
                      de Liquidación del Operador
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* COLUMNA INGRESOS */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-600 font-bold">
                            <ArrowUpCircle className="h-5 w-5" /> A FAVOR DEL
                            OPERADOR
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddBonoDialog(true)}
                            disabled={settlement.estatus === "cerrado"}
                            className="h-8"
                          >
                            <Award className="h-3 w-3 mr-2" /> Bono Extra
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {settlement.conceptos
                            .filter((c: any) => c.tipo === "ingreso")
                            .map((c: any, i: number) => (
                              <div
                                key={i}
                                className={`flex justify-between items-center p-3 rounded border ${c.categoria === "bono" ? "bg-amber-50 border-amber-200" : c.categoria === "gasto_extra" ? "bg-sky-50 border-sky-200" : "bg-slate-50"}`}
                              >
                                <span className="text-sm font-medium flex items-center gap-2">
                                  {c.categoria === "bono" && (
                                    <Award className="h-4 w-4 text-amber-600" />
                                  )}
                                  {c.categoria === "gasto_extra" && (
                                    <Receipt className="h-4 w-4 text-sky-600" />
                                  )}
                                  {c.descripcion}
                                </span>
                                <span className="font-mono font-bold text-emerald-600">
                                  +{formatCurrency(c.monto)}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="flex justify-between p-3 bg-emerald-50 rounded-lg font-bold text-emerald-700 border border-emerald-200">
                          <span>Total a Favor</span>
                          <span className="text-lg">
                            {formatCurrency(settlement.totalIngresos)}
                          </span>
                        </div>
                      </div>

                      {/* COLUMNA DEDUCCIONES */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-600 font-bold h-8">
                          <ArrowDownCircle className="h-5 w-5" /> DESCUENTOS /
                          ANTICIPOS
                        </div>
                        <div className="space-y-2">
                          {settlement.conceptos
                            .filter((c: any) => c.tipo === "deduccion")
                            .map((c: any, i: number) => (
                              <div
                                key={i}
                                className={`flex justify-between items-center p-3 rounded border ${c.categoria.includes("combustible") ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50"}`}
                              >
                                <span className="text-sm font-medium flex items-center gap-2">
                                  {c.categoria.includes("combustible") && (
                                    <Fuel className="h-4 w-4 text-red-600" />
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
                        <div className="flex justify-between p-3 bg-red-50 rounded-lg font-bold text-red-700 border border-red-200">
                          <span>Total Descuentos</span>
                          <span className="text-lg">
                            -{formatCurrency(settlement.totalDeducciones)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-8" />

                    {/* GRAN TOTAL FINAL */}
                    <div className="flex items-center justify-between bg-brand-dark text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none"></div>
                      <div className="relative z-10">
                        <p className="text-sm text-white/70 uppercase tracking-widest font-bold mb-1">
                          Cálculo Final
                        </p>
                        <p className="text-xl font-medium">
                          Saldo a Pagar al Operador
                        </p>
                      </div>
                      <span className="text-5xl font-mono font-black relative z-10">
                        {formatCurrency(settlement.netoAPagar)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* BOTONES DE NAVEGACIÓN Y CIERRE */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setStep(0)}
                  >
                    ← Corregir Auditoría
                  </Button>
                  <div className="space-x-3">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => onOpenChange(false)}
                    >
                      Posponer Cierre
                    </Button>
                    <Button
                      size="lg"
                      disabled={isAnimating || settlement.estatus === "cerrado"}
                      onClick={handleAuthorizeAndClose}
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-lg text-md px-8"
                    >
                      {isAnimating ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      Autorizar, Guardar y Generar PDF
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
            <DialogTitle>Agregar Bono / Incentivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={bonoDescription}
                onChange={(e) => setBonoDescription(e.target.value)}
                placeholder="Ej: Bono por rendimiento de Diésel"
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
            <Button onClick={handleAddBono}>Aplicar Bono</Button>
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
