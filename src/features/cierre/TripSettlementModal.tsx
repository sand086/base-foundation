// src/features/cierre/TripSettlementModal.tsx
import { useState, useEffect } from "react";
import {
  FileCheck,
  Camera,
  Fuel,
  CreditCard,
  CheckCircle,
  XCircle,
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
  BadgeAlert,
  Droplets,
  Plus,
  Award,
  Loader2,
  Calculator,
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
import { toast } from "sonner";
import { SettlementReceiptModal } from "./SettlementReceiptModal";
import { useTrips } from "@/hooks/useTrips";

interface TripSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
}

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
  const [showAddBonoDialog, setShowAddBonoDialog] = useState(false);
  const [bonoAmount, setBonoAmount] = useState("");
  const [bonoDescription, setBonoDescription] = useState("");

  // Paso actual (0 = Conciliacion Combustible, 1 = Liquidacion)
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open && tripId) {
      setLoading(true);
      setStep(0); // Inicia siempre en conciliacion
      getTripSettlement(tripId).then((data) => {
        setSettlement(data);
        setLoading(false);
      });
    } else {
      setSettlement(null);
    }
  }, [open, tripId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
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
              ? "1. Conciliación y Auditoría"
              : "2. Liquidación del Viaje"}
          </DialogTitle>
        </DialogHeader>

        {loading || !settlement ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-navy" />
            <p>Calculando liquidación y cruzando datos de combustible...</p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {/* Encabezado del Viaje (Común para ambos pasos) */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  ID Viaje
                </p>
                <p className="font-bold text-slate-800">{settlement.viajeId}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  Operador
                </p>
                <p className="font-bold text-slate-800 truncate">
                  {settlement.operadorNombre}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  Ruta
                </p>
                <p className="font-bold text-slate-800 truncate">
                  {settlement.ruta}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  Kms
                </p>
                <p className="font-bold text-slate-800">
                  {settlement.kmsRecorridos.toLocaleString()} km
                </p>
              </div>
            </div>

            {/* PASO 1: CONCILIACIÓN DE COMBUSTIBLE */}
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card
                  className={`border-2 ${settlement.diferenciaLitros > settlement.consumoEsperadoLitros * 0.05 ? "border-status-danger" : "border-status-success"}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Fuel className="h-5 w-5" /> Resultado de Conciliación ECM
                      vs Tickets
                    </CardTitle>
                    <CardDescription>
                      El sistema ha cruzado los tickets registrados en ruta con
                      el rendimiento esperado (3.2 km/L).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="p-4 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Fuel className="h-4 w-4" /> Esperado
                        </div>
                        <p className="text-xl font-bold">
                          {settlement.consumoEsperadoLitros} L
                        </p>
                      </div>
                      <div className="p-4 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Droplets className="h-4 w-4" /> Real (Tickets)
                        </div>
                        <p className="text-xl font-bold">
                          {settlement.consumoRealLitros} L
                        </p>
                      </div>

                      {settlement.diferenciaLitros >
                      settlement.consumoEsperadoLitros * 0.05 ? (
                        <>
                          <div className="p-4 bg-status-danger/10 rounded-lg border border-status-danger">
                            <div className="flex items-center gap-2 text-status-danger text-sm mb-1">
                              <TrendingUp className="h-4 w-4" /> Exceso
                            </div>
                            <p className="text-xl font-bold text-status-danger">
                              +{settlement.diferenciaLitros} L
                            </p>
                          </div>
                          <div className="p-4 bg-status-danger/10 rounded-lg border border-status-danger">
                            <div className="flex items-center gap-2 text-status-danger text-sm mb-1">
                              <DollarSign className="h-4 w-4" /> Vale de Cobro
                            </div>
                            <p className="text-xl font-bold text-status-danger">
                              {formatCurrency(settlement.deduccionCombustible)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-status-success/10 rounded-lg border border-status-success col-span-2 flex items-center justify-center gap-2">
                          <CheckCircle className="h-6 w-6 text-status-success" />
                          <p className="font-bold text-status-success">
                            Consumo dentro del límite tolerado
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                  <Button
                    size="lg"
                    onClick={() => setStep(1)}
                    className="bg-brand-navy hover:bg-brand-navy/90 text-white"
                  >
                    Continuar a Liquidación Financiera
                  </Button>
                </div>
              </div>
            )}

            {/* PASO 2: LIQUIDACIÓN FINANCIERA */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="border-b bg-slate-50/50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5 text-brand-navy" /> Resumen
                      de Ingresos y Deducciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* INGRESOS */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-600 font-bold">
                            <ArrowUpCircle className="h-5 w-5" /> INGRESOS
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddBonoDialog(true)}
                            disabled={settlement.estatus === "cerrado"}
                            className="h-8"
                          >
                            <Award className="h-3 w-3 mr-2" /> Bono
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
                                <span className="text-sm font-medium">
                                  {c.descripcion}
                                </span>
                                <span className="font-mono font-bold text-emerald-600">
                                  +{formatCurrency(c.monto)}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="flex justify-between p-3 bg-emerald-50 rounded-lg font-bold text-emerald-700">
                          <span>Total Ingresos</span>
                          <span>
                            {formatCurrency(settlement.totalIngresos)}
                          </span>
                        </div>
                      </div>

                      {/* DEDUCCIONES */}
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
                                <span className="text-sm font-medium">
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
                            <p className="text-sm text-muted-foreground italic p-3">
                              No hay deducciones.
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between p-3 bg-red-50 rounded-lg font-bold text-red-700">
                          <span>Total Deducciones</span>
                          <span>
                            -{formatCurrency(settlement.totalDeducciones)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* TOTAL FINAL */}
                    <div className="flex items-center justify-between bg-brand-navy text-white p-5 rounded-xl shadow-md">
                      <div>
                        <p className="text-sm opacity-80 uppercase tracking-wide font-bold">
                          SALDO NETO A PAGAR AL OPERADOR
                        </p>
                        {settlement.estatus === "cerrado" && (
                          <p className="text-xs opacity-70 mt-1">
                            Autorizado por el sistema
                          </p>
                        )}
                      </div>
                      <span className="text-3xl font-mono font-black">
                        {formatCurrency(settlement.netoAPagar)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* BOTONES DE CIERRE */}
                <div className="flex justify-between pt-4 gap-3">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Regresar a Conciliación
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
            )}
          </div>
        )}
      </DialogContent>

      {/* Modal Interno de Bonos */}
      <Dialog open={showAddBonoDialog} onOpenChange={setShowAddBonoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Bono</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={bonoDescription}
                onChange={(e) => setBonoDescription(e.target.value)}
                placeholder="Ej: Viaje sin incidencias"
              />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={bonoAmount}
                onChange={(e) => setBonoAmount(e.target.value)}
                placeholder="0.00"
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
            <Button onClick={handleAddBono}>Guardar Bono</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal del Recibo */}
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
