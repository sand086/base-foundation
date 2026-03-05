// src/features/cierre/TripSettlementModal.tsx
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  FileCheck,
  User,
  Truck,
  DollarSign,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Award,
  Calculator,
  Percent,
  Loader2,
  Undo,
  CheckCircle,
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
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import type { Trip, TripLeg } from "@/types/api.types";
import axiosClient from "@/api/axiosClient";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
}

interface TripSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leg: TripLeg | null;
  tripPadre: Trip | null;
}

export function TripSettlementModal({
  open,
  onOpenChange,
  leg,
  tripPadre,
}: TripSettlementModalProps) {
  // ==========================================
  // ESTADOS DE CÁLCULO (Opción A y B)
  // ==========================================
  const [calcMode, setCalcMode] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [porcentajeFlete, setPorcentajeFlete] = useState<number>(15); // Default 15%
  const [montoFijo, setMontoFijo] = useState<number>(0);

  // ==========================================
  // ESTADOS DE CONCEPTOS MANUALES
  // ==========================================
  const [conceptosExtra, setConceptosExtra] = useState<ConceptoExtra[]>([]);
  const [showAddConceptoDialog, setShowAddConceptoDialog] = useState(false);
  const [newConceptoType, setNewConceptoType] = useState<
    "ingreso" | "deduccion"
  >("ingreso");
  const [newConceptoDesc, setNewConceptoDesc] = useState("");
  const [newConceptoAmount, setNewConceptoAmount] = useState("");

  const [isAnimating, setIsAnimating] = useState(false);

  // Limpiar el modal cada vez que se abre con un tramo nuevo
  useEffect(() => {
    if (open) {
      setConceptosExtra([]);
      setPorcentajeFlete(15);
      setMontoFijo(0);
      setCalcMode("percentage");
    }
  }, [open, leg]);

  // ==========================================
  // CÁLCULOS FINANCIEROS
  // ==========================================
  const liquidacion = useMemo(() => {
    if (!tripPadre || !leg) return null;

    // a) PAGO BASE
    let pagoBaseBruto = 0;
    if (calcMode === "percentage") {
      pagoBaseBruto = (tripPadre.tarifa_base * porcentajeFlete) / 100;
    } else {
      pagoBaseBruto = montoFijo;
    }

    // b) INGRESOS
    const bonosAdicionales = conceptosExtra
      .filter((c) => c.tipo === "ingreso")
      .reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = pagoBaseBruto + bonosAdicionales;

    // c) DEDUCCIONES (Descuenta Viáticos Automáticamente)
    const deduccionViaticos = leg.anticipo_viaticos || 0;
    const otrosAnticipos = leg.otros_anticipos || 0;
    const deduccionesManuales = conceptosExtra
      .filter((c) => c.tipo === "deduccion")
      .reduce((sum, c) => sum + c.monto, 0);
    const totalDeducciones =
      deduccionViaticos + otrosAnticipos + deduccionesManuales;

    // d) NETO
    const netoAPagar = totalIngresos - totalDeducciones;

    return {
      pagoBaseBruto,
      bonosAdicionales,
      totalIngresos,
      deduccionViaticos,
      otrosAnticipos,
      deduccionesManuales,
      totalDeducciones,
      netoAPagar,
    };
  }, [tripPadre, leg, calcMode, porcentajeFlete, montoFijo, conceptosExtra]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const handleAddConcepto = () => {
    const amount = parseFloat(newConceptoAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingresa un monto válido mayor a 0");
      return;
    }
    const newConcepto: ConceptoExtra = {
      id: `CE-${Date.now()}`,
      tipo: newConceptoType,
      descripcion:
        newConceptoDesc.trim() ||
        (newConceptoType === "ingreso" ? "Bono Extra" : "Descuento Extra"),
      monto: amount,
    };
    setConceptosExtra([...conceptosExtra, newConcepto]);
    setShowAddConceptoDialog(false);
    setNewConceptoDesc("");
    setNewConceptoAmount("");
    toast.success(
      `${newConceptoType === "ingreso" ? "Bono" : "Descuento"} agregado`,
    );
  };

  const handleLiquidate = async () => {
    setIsAnimating(true);

    try {
      // 1. Aquí idealmente llamarías a tu endpoint financiero para guardar los montos:
      await axiosClient.post(`/trips/legs/${leg.id}/settle`, liquidacion);

      // 2. Actualizamos el viaje en la Base de Datos para pasarlo a CERRADO
      // Esto hace que la tarjeta por fin salga del tablero de operaciones.
      await axiosClient.put(`/trips/${tripPadre.id}`, {
        status: "cerrado",
      });

      toast.success("Liquidación Autorizada y Guardada", {
        description: `Se registró un saldo de ${formatCurrency(liquidacion?.netoAPagar || 0)} a favor del operador.`,
      });

      // 3. Cerramos el modal
      onOpenChange(false);

      // 4. Forzamos una recarga rápida para que el Kanban/Tabla se actualice y la tarjeta desaparezca
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error(
        "Hubo un error al intentar guardar la liquidación en la base de datos.",
      );
    } finally {
      setIsAnimating(false);
    }
  };

  const legTypeLabels: Record<string, string> = {
    carga_muelle: "1. Movimiento a Muelle/Carga",
    ruta_carretera: "2. Ruta en Carretera",
    entrega_vacio: "3. Retorno de Vacío",
  };

  if (!leg || !tripPadre || !liquidacion) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 bg-slate-50/80 overflow-hidden">
        <DialogHeader className="p-6 bg-white border-b shadow-sm">
          <DialogTitle className="text-xl font-black text-brand-navy flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-emerald-600" /> Liquidación de
            Tramo
          </DialogTitle>
          <DialogDescription>
            Calcula el pago de <strong>{leg.operator?.name}</strong> por la fase
            de <strong>{legTypeLabels[leg.leg_type] || leg.leg_type}</strong>{" "}
            del viaje <strong>#{tripPadre.public_id || tripPadre.id}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-h-[80vh] overflow-y-auto">
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE TARIFA */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Esquema de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={calcMode}
                  onValueChange={(v) => setCalcMode(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="percentage" className="text-xs">
                      Porcentaje (%)
                    </TabsTrigger>
                    <TabsTrigger value="fixed" className="text-xs">
                      Cuota Fija ($)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="percentage" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Porcentaje sobre Flete Base
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={porcentajeFlete}
                          onChange={(e) =>
                            setPorcentajeFlete(Number(e.target.value))
                          }
                          className="pl-8 text-lg font-bold text-brand-navy"
                        />
                        <Percent className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">
                        {porcentajeFlete}% de{" "}
                        {formatCurrency(tripPadre.tarifa_base)} ={" "}
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(liquidacion.pagoBaseBruto)}
                        </span>
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="fixed" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Monto Fijo Acordado (MXN)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={montoFijo || ""}
                          onChange={(e) => setMontoFijo(Number(e.target.value))}
                          placeholder="Ej: 300"
                          className="pl-8 text-lg font-bold text-brand-navy"
                        />
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">
                        Ideal para movimientos locales o maniobras de patio.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="bg-white border-dashed border-2">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center shadow-sm">
                  <User className="h-5 w-5 text-brand-navy" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Operador
                  </p>
                  <p className="font-black text-brand-navy">
                    {leg.operator?.name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Eco:{" "}
                    {leg.unit?.numero_economico}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: ESTADO DE CUENTA */}
          <div className="lg:col-span-7">
            <Card className="border-slate-200 shadow-lg h-full flex flex-col">
              <CardHeader className="bg-slate-50 border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Resumen de Liquidación
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewConceptoType("ingreso");
                      setShowAddConceptoDialog(true);
                    }}
                    className="border-emerald-200 text-emerald-700"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Bono
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewConceptoType("deduccion");
                      setShowAddConceptoDialog(true);
                    }}
                    className="border-rose-200 text-rose-700"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Cargo
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6 flex-1 flex flex-col space-y-6">
                {/* INGRESOS */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-bold text-emerald-600 text-sm border-b pb-1">
                    <ArrowUpCircle className="h-4 w-4" /> INGRESOS
                  </h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">
                      Pago Base (Flete/Maniobra)
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      +{formatCurrency(liquidacion.pagoBaseBruto)}
                    </span>
                  </div>
                  {conceptosExtra
                    .filter((c) => c.tipo === "ingreso")
                    .map((bono) => (
                      <div
                        key={bono.id}
                        className="flex justify-between items-center text-sm bg-emerald-50/50 p-2 rounded"
                      >
                        <span className="text-slate-600">
                          {bono.descripcion}
                        </span>
                        <span className="font-mono font-bold text-emerald-600">
                          +{formatCurrency(bono.monto)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* DEDUCCIONES */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-bold text-rose-600 text-sm border-b pb-1">
                    <ArrowDownCircle className="h-4 w-4" /> DESCUENTOS
                  </h4>
                  {liquidacion.deduccionViaticos > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-medium">
                        Anticipo Viáticos (Entregados)
                      </span>
                      <span className="font-mono font-bold text-rose-600">
                        -{formatCurrency(liquidacion.deduccionViaticos)}
                      </span>
                    </div>
                  )}
                  {conceptosExtra
                    .filter((c) => c.tipo === "deduccion")
                    .map((desc) => (
                      <div
                        key={desc.id}
                        className="flex justify-between items-center text-sm bg-rose-50/50 p-2 rounded"
                      >
                        <span className="text-slate-600">
                          {desc.descripcion}
                        </span>
                        <span className="font-mono font-bold text-rose-600">
                          -{formatCurrency(desc.monto)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* TOTAL */}
                <div className="mt-auto bg-brand-navy rounded-xl p-5 flex items-center justify-between text-white shadow-xl">
                  <div>
                    <p className="text-xs text-slate-300 font-medium uppercase tracking-widest">
                      Saldo a favor
                    </p>
                    <p className="text-3xl font-black font-mono mt-1">
                      {formatCurrency(liquidacion.netoAPagar)}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-400 text-brand-navy font-bold"
                    disabled={isAnimating}
                    onClick={handleLiquidate}
                  >
                    {isAnimating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isAnimating ? "Guardando..." : "Cerrar Pago"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>

      {/* Sub-modal de Conceptos */}
      <Dialog
        open={showAddConceptoDialog}
        onOpenChange={setShowAddConceptoDialog}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle
              className={
                newConceptoType === "ingreso"
                  ? "text-emerald-600"
                  : "text-rose-600"
              }
            >
              Agregar {newConceptoType === "ingreso" ? "Bono" : "Descuento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto / Motivo</Label>
              <Input
                value={newConceptoDesc}
                onChange={(e) => setNewConceptoDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto (MXN)</Label>
              <Input
                type="number"
                value={newConceptoAmount}
                onChange={(e) => setNewConceptoAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddConceptoDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddConcepto}
              className={
                newConceptoType === "ingreso"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
