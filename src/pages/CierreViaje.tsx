import * as React from "react";
import { useState, useMemo } from "react";
import {
  FileCheck,
  User,
  Truck,
  MapPin,
  DollarSign,
  Receipt,
  TrendingUp,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Award,
  Calculator,
  Percent,
  Loader2,
  CheckCircle,
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
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useTrips } from "@/hooks/useTrips";
import type { Trip, TripLeg } from "@/types/api.types";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
}

export default function CierreViaje() {
  const { trips } = useTrips();

  // ==========================================
  // ESTADOS DE SELECCIÓN
  // ==========================================
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedLegId, setSelectedLegId] = useState<string>("");

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

  // ==========================================
  // DERIVACIONES Y CÁLCULOS MÁGICOS
  // ==========================================

  // 1. Filtrar viajes que tengan tramos (legs)
  const tripsWithLegs = useMemo(() => {
    return trips.filter((t) => t.legs && t.legs.length > 0);
  }, [trips]);

  const selectedTrip = useMemo(() => {
    return tripsWithLegs.find((t) => String(t.id) === selectedTripId) || null;
  }, [tripsWithLegs, selectedTripId]);

  const selectedLeg = useMemo(() => {
    return (
      selectedTrip?.legs?.find((l) => String(l.id) === selectedLegId) || null
    );
  }, [selectedTrip, selectedLegId]);

  // 2. El corazón financiero: Cálculos de Liquidación
  const liquidacion = useMemo(() => {
    if (!selectedTrip || !selectedLeg) return null;

    // a) PAGO BASE (Opción A o B)
    let pagoBaseBruto = 0;
    if (calcMode === "percentage") {
      // El porcentaje se calcula sobre la Tarifa Base del Viaje completo
      pagoBaseBruto = (selectedTrip.tarifa_base * porcentajeFlete) / 100;
    } else {
      pagoBaseBruto = montoFijo;
    }

    // b) INGRESOS TOTALES
    const bonosAdicionales = conceptosExtra
      .filter((c) => c.tipo === "ingreso")
      .reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = pagoBaseBruto + bonosAdicionales;

    // c) DEDUCCIONES (Automáticas + Manuales)
    // Regla de Negocio: Los viáticos dados como anticipo se descuentan del sueldo final del operador.
    const deduccionViaticos = selectedLeg.anticipo_viaticos || 0;
    // Otros anticipos (préstamos personales, etc)
    const otrosAnticipos = selectedLeg.otros_anticipos || 0;

    const deduccionesManuales = conceptosExtra
      .filter((c) => c.tipo === "deduccion")
      .reduce((sum, c) => sum + c.monto, 0);
    const totalDeducciones =
      deduccionViaticos + otrosAnticipos + deduccionesManuales;

    // d) NETO A PAGAR
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
  }, [
    selectedTrip,
    selectedLeg,
    calcMode,
    porcentajeFlete,
    montoFijo,
    conceptosExtra,
  ]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

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
      `${newConceptoType === "ingreso" ? "Bono" : "Descuento"} agregado correctamente`,
    );
  };

  const handleLiquidate = () => {
    setIsAnimating(true);
    // Simulación de guardado en el backend
    setTimeout(() => {
      setIsAnimating(false);
      toast.success("Liquidación Autorizada", {
        description: `Se registró un saldo de ${formatCurrency(liquidacion?.netoAPagar || 0)} a favor del operador.`,
      });
      // Aquí llamarías a tu endpoint: await settleTripLeg(selectedLegId, payloadDeLiquidacion)
      // Resetear para el siguiente
      setSelectedLegId("");
      setConceptosExtra([]);
    }, 1500);
  };

  const legTypeLabels: Record<string, string> = {
    carga_muelle: "1. Movimiento a Muelle/Carga",
    ruta_carretera: "2. Ruta en Carretera",
    entrega_vacio: "3. Retorno de Vacío",
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div>
        <h1 className="text-2xl font-black text-brand-navy flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-emerald-600" /> Liquidación por
          Tramos (Pago a Operadores)
        </h1>
        <p className="text-muted-foreground mt-1">
          Selecciona el viaje y el tramo que deseas liquidar. El sistema
          deducirá los viáticos automáticamente.
        </p>
      </div>

      {/* PASO 1: SELECCIÓN DE VIAJE Y TRAMO */}
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100">
          <CardTitle className="text-sm font-bold text-indigo-900 uppercase flex items-center gap-2">
            <MapPin className="h-4 w-4" /> 1. Seleccionar Operación
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Folio de Viaje Matriz</Label>
            <Select
              value={selectedTripId}
              onValueChange={(val) => {
                setSelectedTripId(val);
                setSelectedLegId("");
                setConceptosExtra([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un viaje..." />
              </SelectTrigger>
              <SelectContent>
                {tripsWithLegs.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    Viaje #{t.id} - {t.origin} a {t.destination} (
                    {formatCurrency(t.tarifa_base)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tramo a Liquidar (Operador)</Label>
            <Select
              value={selectedLegId}
              onValueChange={setSelectedLegId}
              disabled={!selectedTripId}
            >
              <SelectTrigger
                className={
                  selectedLegId ? "border-emerald-400 bg-emerald-50" : ""
                }
              >
                <SelectValue placeholder="Selecciona la fase/tramo..." />
              </SelectTrigger>
              <SelectContent>
                {selectedTrip?.legs?.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {legTypeLabels[l.leg_type] || l.leg_type} -{" "}
                    {l.operator?.name || "Operador Desconocido"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PASO 2 Y 3: CÁLCULOS Y RESUMEN (Solo se muestran si hay tramo seleccionado) */}
      {selectedTrip && selectedLeg && liquidacion && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE TARIFA */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> 2. Esquema de Pago
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
                        {formatCurrency(selectedTrip.tarifa_base)} =
                        <span className="font-bold text-emerald-600 ml-1">
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

            <Card className="bg-slate-50 border-dashed border-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-brand-navy" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Operador a Liquidar
                    </p>
                    <p className="font-black text-brand-navy">
                      {selectedLeg.operator?.name}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Eco:{" "}
                      {selectedLeg.unit?.numero_economico}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: ESTADO DE CUENTA */}
          <div className="lg:col-span-8">
            <Card className="border-slate-200 shadow-lg h-full flex flex-col">
              <CardHeader className="bg-slate-50 border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> 3. Resumen de Liquidación
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Ingresos y Descuentos del Tramo
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewConceptoType("ingreso");
                    setShowAddConceptoDialog(true);
                  }}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir Bono
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewConceptoType("deduccion");
                    setShowAddConceptoDialog(true);
                  }}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 ml-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir Cargo
                </Button>
              </CardHeader>

              <CardContent className="pt-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-8 flex-1">
                  {/* INGRESOS */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-bold text-emerald-600 text-sm border-b pb-2">
                      <ArrowUpCircle className="h-4 w-4" /> INGRESOS A FAVOR
                    </h4>

                    <div className="space-y-3">
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
                            <span className="text-slate-600 flex items-center gap-1">
                              <Award className="h-3 w-3 text-emerald-500" />{" "}
                              {bono.descripcion}
                            </span>
                            <span className="font-mono font-bold text-emerald-600">
                              +{formatCurrency(bono.monto)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* DEDUCCIONES */}
                  <div className="space-y-4 border-l pl-8">
                    <h4 className="flex items-center gap-2 font-bold text-rose-600 text-sm border-b pb-2">
                      <ArrowDownCircle className="h-4 w-4" /> DESCUENTOS
                    </h4>

                    <div className="space-y-3">
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

                      {liquidacion.otrosAnticipos > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-medium">
                            Préstamos / Otros Anticipos
                          </span>
                          <span className="font-mono font-bold text-rose-600">
                            -{formatCurrency(liquidacion.otrosAnticipos)}
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

                      {liquidacion.totalDeducciones === 0 && (
                        <p className="text-xs text-slate-400 italic">
                          No hay descuentos registrados.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* GRAN TOTAL */}
                <div className="mt-8 bg-brand-navy rounded-xl p-6 flex items-center justify-between text-white shadow-xl">
                  <div>
                    <p className="text-sm text-slate-300 font-medium uppercase tracking-widest">
                      Saldo a favor del operador
                    </p>
                    <p className="text-4xl font-black font-mono mt-1">
                      {formatCurrency(liquidacion.netoAPagar)}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-400 text-brand-navy font-bold gap-2 text-lg h-14 px-8"
                    disabled={isAnimating}
                    onClick={handleLiquidate}
                  >
                    {isAnimating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    {isAnimating ? "Procesando..." : "Cerrar y Autorizar Pago"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR CONCEPTOS EXTRA */}
      <Dialog
        open={showAddConceptoDialog}
        onOpenChange={setShowAddConceptoDialog}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 ${newConceptoType === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}
            >
              {newConceptoType === "ingreso" ? (
                <ArrowUpCircle className="h-5 w-5" />
              ) : (
                <ArrowDownCircle className="h-5 w-5" />
              )}
              Agregar {newConceptoType === "ingreso" ? "Bono" : "Descuento"}{" "}
              Extra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto / Motivo</Label>
              <Input
                placeholder={
                  newConceptoType === "ingreso"
                    ? "Ej: Rendimiento de diésel, Maniobra extra..."
                    : "Ej: Faltante de lona, Infracción..."
                }
                value={newConceptoDesc}
                onChange={(e) => setNewConceptoDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto (MXN) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newConceptoAmount}
                onChange={(e) => setNewConceptoAmount(e.target.value)}
                className="text-lg font-mono"
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
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
