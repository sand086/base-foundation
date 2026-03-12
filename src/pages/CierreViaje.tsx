// src/pages/CierreViaje.tsx
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  FileCheck,
  User,
  Truck,
  MapPin,
  DollarSign,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Calculator,
  Percent,
  Loader2,
  CheckCircle,
  Fuel,
  Printer,
  AlertTriangle,
  Search,
  FilterX,
  Clock,
  History,
  CheckSquare,
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
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { useTrips } from "@/hooks/useTrips";
import { useClients } from "@/hooks/useClients";
import { useOperators } from "@/hooks/useOperators";
import { useUnits } from "@/hooks/useUnits";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
}

export default function CierreViaje() {
  // 🚀 EXTRAEMOS LA NUEVA FUNCIÓN DEL HOOK
  const { trips = [], liquidarLote, getSettlementPreview } = useTrips() as any;
  const { clients = [] } = useClients();
  const { operadores = [], operators = [] } = useOperators() as any;
  const { unidades = [], units = [] } = useUnits() as any;

  const safeOperators = operadores.length > 0 ? operadores : operators;
  const safeUnits = unidades.length > 0 ? unidades : units;

  // ==========================================
  // ESTADOS DE SELECCIÓN Y FILTROS
  // ==========================================
  const [activeTab, setActiveTab] = useState<"pendientes" | "historico">(
    "pendientes",
  );
  const [filterOperator, setFilterOperator] = useState("ALL");
  const [filterClient, setFilterClient] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedLegIds, setSelectedLegIds] = useState<string[]>([]);

  // ==========================================
  // ESTADOS DE CÁLCULO & PREVIEW API
  // ==========================================
  const [calcMode, setCalcMode] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [porcentajeFlete, setPorcentajeFlete] = useState<number>(15);
  const [montoFijo, setMontoFijo] = useState<number>(300);
  const [combustibleFaltante, setCombustibleFaltante] = useState<number>(0);

  // 🚀 ESTADOS PARA EL RESULTADO DEL BACKEND
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // ==========================================
  // ESTADOS DE UI & MODALES
  // ==========================================
  const [conceptosExtra, setConceptosExtra] = useState<ConceptoExtra[]>([]);
  const [showAddConceptoDialog, setShowAddConceptoDialog] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [newConceptoType, setNewConceptoType] = useState<
    "ingreso" | "deduccion"
  >("ingreso");
  const [newConceptoDesc, setNewConceptoDesc] = useState("");
  const [newConceptoAmount, setNewConceptoAmount] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // ==========================================
  // EFECTO: SOLICITAR PRE-LIQUIDACIÓN AL BACKEND
  // ==========================================
  useEffect(() => {
    if (selectedLegIds.length > 0 && getSettlementPreview) {
      setIsLoadingPreview(true);
      getSettlementPreview(selectedLegIds)
        .then((data: any) => {
          setPreviewData(data);
          // Auto-completar el descuento si hay exceso de consumo
          if (data?.deduccion_combustible > 0) {
            setCombustibleFaltante(data.deduccion_combustible);
          } else {
            setCombustibleFaltante(0);
          }
        })
        .catch(() => {
          toast.error("Error al calcular telemetría de combustible");
          setPreviewData(null);
        })
        .finally(() => setIsLoadingPreview(false));
    } else {
      setPreviewData(null);
      setCombustibleFaltante(0);
    }
  }, [selectedLegIds]); // Se ejecuta cada que seleccionas o deseleccionas un viaje

  // ==========================================
  // DERIVACIONES Y LISTAS
  // ==========================================
  const allLegs = useMemo(() => {
    const legs: any[] = [];
    if (!Array.isArray(trips)) return legs;
    trips.forEach((t) => {
      const clientObj = clients.find(
        (c: any) => String(c.id) === String(t.client_id),
      );
      const clientName =
        clientObj?.razon_social || clientObj?.rfc || "Sin Cliente";
      t.legs?.forEach((l: any) => {
        legs.push({ ...l, trip: { ...t, clientName } });
      });
    });
    return legs.sort(
      (a, b) =>
        new Date(b.start_date || 0).getTime() -
        new Date(a.start_date || 0).getTime(),
    );
  }, [trips, clients]);

  const pendingLegs = useMemo(
    () =>
      allLegs.filter((l) =>
        ["entregado", "cerrado"].includes(String(l.status).toLowerCase()),
      ),
    [allLegs],
  );
  const historyLegs = useMemo(
    () => allLegs.filter((l) => String(l.status).toLowerCase() === "liquidado"),
    [allLegs],
  );

  const operatorsWithPending = useMemo(() => {
    const opsMap = new Map();
    pendingLegs.forEach((l) => {
      if (l.operator) opsMap.set(String(l.operator.id), l.operator);
    });
    return Array.from(opsMap.values());
  }, [pendingLegs]);

  const legsForSelectedOperator = useMemo(() => {
    if (!selectedOperatorId) return [];
    return pendingLegs.filter(
      (l) => String(l.operator_id) === selectedOperatorId,
    );
  }, [pendingLegs, selectedOperatorId]);

  const selectedLegsData = useMemo(() => {
    return legsForSelectedOperator.filter((l) =>
      selectedLegIds.includes(String(l.id)),
    );
  }, [legsForSelectedOperator, selectedLegIds]);

  // ==========================================
  // CÁLCULOS FINANCIEROS (FRONTEND + BACKEND)
  // ==========================================
  const liquidacion = useMemo(() => {
    if (selectedLegsData.length === 0) return null;

    let pagoBaseBruto = 0;
    if (calcMode === "percentage") {
      const sumaTarifas = selectedLegsData.reduce(
        (sum, l) => sum + (l.trip.tarifa_base || 0),
        0,
      );
      pagoBaseBruto = (sumaTarifas * porcentajeFlete) / 100;
    } else {
      pagoBaseBruto = montoFijo * selectedLegsData.length;
    }

    const bonosAdicionales = conceptosExtra
      .filter((c) => c.tipo === "ingreso")
      .reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = pagoBaseBruto + bonosAdicionales;

    let deduccionViaticos = 0;
    let otrosAnticipos = 0;
    selectedLegsData.forEach((l) => {
      deduccionViaticos +=
        (l.anticipo_viaticos || 0) + (l.anticipo_casetas || 0);
      otrosAnticipos += l.otros_anticipos || 0;
    });

    const deduccionesManuales = conceptosExtra
      .filter((c) => c.tipo === "deduccion")
      .reduce((sum, c) => sum + c.monto, 0);

    // 🚀 Sumamos el Faltante de Combustible a las deducciones
    const totalDeducciones =
      deduccionViaticos +
      otrosAnticipos +
      deduccionesManuales +
      (combustibleFaltante || 0);

    const netoAPagar = totalIngresos - totalDeducciones;

    // 🚀 RETORNAMOS TODO, INCLUYENDO combustibleFaltante
    return {
      pagoBaseBruto,
      bonosAdicionales,
      totalIngresos,
      deduccionViaticos,
      otrosAnticipos,
      deduccionesManuales,
      combustibleFaltante,
      totalDeducciones,
      netoAPagar,
    };
  }, [
    selectedLegsData,
    calcMode,
    porcentajeFlete,
    montoFijo,
    conceptosExtra,
    combustibleFaltante,
  ]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);

  const toggleLegSelection = (id: string) =>
    setSelectedLegIds((prev) =>
      prev.includes(id) ? prev.filter((legId) => legId !== id) : [...prev, id],
    );

  const toggleAllLegs = () => {
    if (selectedLegIds.length === legsForSelectedOperator.length)
      setSelectedLegIds([]);
    else setSelectedLegIds(legsForSelectedOperator.map((l) => String(l.id)));
  };

  const handleAddConcepto = () => {
    const amount = parseFloat(newConceptoAmount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Ingresa un monto válido");
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
  };

  const handleLiquidate = async () => {
    setIsAnimating(true);
    try {
      if (!liquidacion) return;
      if (liquidarLote) {
        await liquidarLote(selectedLegIds, liquidacion.netoAPagar);
      }
      toast.success("Liquidación Exitosa", {
        description: `Se registró el pago de ${formatCurrency(liquidacion.netoAPagar)} correctamente.`,
      });
      setShowReceiptModal(true);
    } catch (error) {
      toast.error("Error al guardar la liquidación en el servidor.");
    } finally {
      setIsAnimating(false);
    }
  };

  const clearFilters = () => {
    setFilterOperator("ALL");
    setFilterClient("ALL");
    setFilterType("ALL");
    setGlobalSearch("");
    setSelectedLegIds([]);
  };

  // APLICAR FILTROS A LA TABLA
  const applyFilters = (list: any[]) =>
    list.filter((l) => {
      if (filterOperator !== "ALL" && String(l.operator_id) !== filterOperator)
        return false;
      if (filterClient !== "ALL" && String(l.trip?.client_id) !== filterClient)
        return false;
      if (filterType !== "ALL" && l.leg_type !== filterType) return false;
      if (globalSearch) {
        const term = globalSearch.toLowerCase();
        const folio = (l.trip?.public_id || `TRP-${l.trip_id}`).toLowerCase();
        const route = `${l.trip?.origin} ${l.trip?.destination}`.toLowerCase();
        if (!folio.includes(term) && !route.includes(term)) return false;
      }
      return true;
    });

  const filteredPending = useMemo(
    () => applyFilters(pendingLegs),
    [pendingLegs, filterOperator, filterClient, filterType, globalSearch],
  );
  const filteredHistory = useMemo(
    () => applyFilters(historyLegs),
    [historyLegs, filterOperator, filterClient, filterType, globalSearch],
  );
  const currentList =
    activeTab === "pendientes" ? filteredPending : filteredHistory;

  const legTypeLabels: Record<string, string> = {
    carga_muelle: "Muelle / Patio",
    ruta_carretera: "Ruta Carretera",
    entrega_vacio: "Retorno Vacío",
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy flex items-center gap-2">
            <FileCheck className="h-7 w-7 text-emerald-600" /> Liquidaciones
            (Nómina Operativa)
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Selecciona los movimientos pendientes y genera el recibo de pago del
            operador.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: SELECCIÓN Y VIAJES */}
        <div
          className={cn(
            "transition-all duration-500",
            selectedLegIds.length > 0 ? "xl:col-span-7" : "xl:col-span-12",
          )}
        >
          <Card className="border-slate-200 shadow-sm mb-6">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" /> 1. Seleccionar
                Operador a Liquidar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Select
                value={selectedOperatorId}
                onValueChange={(val) => {
                  setSelectedOperatorId(val);
                  setSelectedLegIds([]);
                  setConceptosExtra([]);
                  setCombustibleFaltante(0);
                  setFilterOperator(val);
                }}
              >
                <SelectTrigger className="h-12 text-base font-medium bg-white">
                  <SelectValue placeholder="Busca al operador con viajes pendientes..." />
                </SelectTrigger>
                <SelectContent>
                  {operatorsWithPending.map((op: any) => (
                    <SelectItem
                      key={op.id}
                      value={String(op.id)}
                      className="font-medium py-3"
                    >
                      {op.name}
                    </SelectItem>
                  ))}
                  {operatorsWithPending.length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No hay operadores con viajes pendientes de pago.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* TABLAS Y TABS */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              setSelectedLegIds([]);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
              <TabsTrigger
                value="pendientes"
                className="font-bold flex items-center gap-2"
              >
                <Clock className="h-4 w-4" /> Por Liquidar
                <Badge
                  variant="secondary"
                  className="ml-1 bg-blue-100 text-blue-700"
                >
                  {pendingLegs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="font-bold flex items-center gap-2"
              >
                <History className="h-4 w-4" /> Histórico
              </TabsTrigger>
            </TabsList>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b px-4 py-3 flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-600 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> 2. Movimientos del Operador
                </h3>
                {activeTab === "pendientes" && selectedOperatorId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllLegs}
                    className="h-8 text-xs font-bold"
                  >
                    {selectedLegIds.length === legsForSelectedOperator.length
                      ? "Deseleccionar Todos"
                      : "Seleccionar Todos"}
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b sticky top-0 z-10 shadow-sm">
                    <tr>
                      {activeTab === "pendientes" && (
                        <th scope="col" className="px-4 py-4 w-[50px]"></th>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-4 font-black tracking-wider"
                      >
                        Viaje / Cliente
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 font-black tracking-wider"
                      >
                        Tipo
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 font-black tracking-wider"
                      >
                        Ruta
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 font-black tracking-wider text-right"
                      >
                        Estatus
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-slate-400 bg-white"
                        >
                          <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p className="text-lg font-medium">
                            No se encontraron movimientos.
                          </p>
                          <p className="text-sm">
                            Selecciona un operador arriba o revisa el estado de
                            los viajes.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      currentList.map((leg) => {
                        const isSelected = selectedLegIds.includes(
                          String(leg.id),
                        );
                        return (
                          <tr
                            key={leg.id}
                            className={cn(
                              "border-b last:border-0 transition-colors hover:bg-slate-50/80",
                              isSelected ? "bg-blue-50/40" : "bg-white",
                            )}
                            onClick={() =>
                              activeTab === "pendientes" &&
                              toggleLegSelection(String(leg.id))
                            }
                          >
                            {activeTab === "pendientes" && (
                              <td
                                className="px-4 py-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleLegSelection(String(leg.id))
                                  }
                                />
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="font-bold text-brand-navy">
                                {leg.trip?.public_id || `TRP-${leg.trip_id}`}
                              </div>
                              <div
                                className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]"
                                title={leg.trip?.clientName}
                              >
                                {leg.trip?.clientName}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 font-semibold text-slate-600"
                              >
                                {legTypeLabels[leg.leg_type] || leg.leg_type}
                              </Badge>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Truck className="h-3 w-3" /> Eco:{" "}
                                {leg.unit?.numero_economico}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-slate-700">
                                {leg.trip?.origin}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                                Hacia
                              </div>
                              <div className="text-xs font-bold text-slate-700">
                                {leg.trip?.destination}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {activeTab === "pendientes" ? (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                                  Pendiente Pago
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 flex items-center justify-end gap-1 ml-auto">
                                  <CheckCircle className="h-3 w-3" /> Liquidado
                                </Badge>
                              )}
                              {(leg.anticipo_viaticos > 0 ||
                                leg.anticipo_casetas > 0) && (
                                <div className="text-[10px] text-rose-500 font-bold mt-2">
                                  Anticipos: $
                                  {(
                                    leg.anticipo_viaticos + leg.anticipo_casetas
                                  ).toLocaleString()}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </Tabs>
        </div>

        {/* COLUMNA DERECHA: CONFIGURACIÓN FINANCIERA */}
        {selectedLegsData.length > 0 && liquidacion && (
          <div className="xl:col-span-5 space-y-6 animate-in slide-in-from-right-8 duration-500">
            {/* 🚀 CANDADO Y PRE-LIQUIDACIÓN DE COMBUSTIBLE */}
            <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-500">
              <CardHeader className="bg-amber-50/30 border-b pb-4">
                <CardTitle className="text-sm font-bold text-amber-800 uppercase flex items-center gap-2">
                  <Fuel className="h-4 w-4" /> 3. Conciliación Diésel
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-amber-500" />
                    <p className="text-sm font-medium">
                      Cruzando vales vs telemetría...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Alertas del Backend (Faltan Vales) */}
                    {previewData?.alertas?.length > 0 && (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg space-y-2 mb-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-rose-700">
                          <AlertTriangle className="h-4 w-4" /> ATENCIÓN: Vales
                          Faltantes
                        </h4>
                        <ul className="text-[11px] text-rose-600 list-disc pl-4 space-y-1">
                          {previewData.alertas.map(
                            (alerta: string, i: number) => (
                              <li key={i}>{alerta}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Resumen de Rendimiento */}
                    <div className="bg-slate-100 p-4 rounded-xl text-xs space-y-2 font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span className="font-bold font-sans">
                          KMs Recorridos (Acumulado):
                        </span>{" "}
                        <span>{previewData?.total_kms || 0} km</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="font-bold font-sans">
                          Consumo Esperado (ECM):
                        </span>{" "}
                        <span>{previewData?.consumo_esperado || 0} L</span>
                      </div>
                      <div className="flex justify-between text-brand-navy">
                        <span className="font-bold font-sans">
                          Consumo Real (Vales):
                        </span>{" "}
                        <span className="font-bold">
                          {previewData?.consumo_real || 0} L
                        </span>
                      </div>
                      <Separator className="my-2 bg-slate-200" />
                      {previewData?.diferencia_litros > 0 ? (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span className="font-sans">Exceso a Descontar:</span>{" "}
                          <span>{previewData.diferencia_litros} L</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-emerald-600 font-bold">
                          <span className="font-sans">Rendimiento Óptimo:</span>{" "}
                          <span>No hay penalización</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-bold text-rose-700 uppercase tracking-widest">
                        Penalización Económica
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={combustibleFaltante || ""}
                          onChange={(e) =>
                            setCombustibleFaltante(Number(e.target.value))
                          }
                          className="pl-10 font-bold border-rose-200 bg-rose-50/30 text-rose-700"
                        />
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ESQUEMA DE PAGO Y RECIBO */}
            <Card className="border-slate-200 shadow-xl overflow-hidden">
              <CardHeader className="bg-brand-navy text-white pb-6">
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> 4. Recibo de Liquidación
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-6 space-y-6">
                  {/* Selector de Esquema Fijo/Porcentaje */}
                  <Tabs
                    value={calcMode}
                    onValueChange={(v) => setCalcMode(v as any)}
                    className="w-full bg-slate-50 p-1 rounded-lg"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="percentage"
                        className="font-bold text-xs"
                      >
                        Pagar % del Flete
                      </TabsTrigger>
                      <TabsTrigger value="fixed" className="font-bold text-xs">
                        Pagar Fijo x Viaje
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* INGRESOS */}
                  <div className="space-y-3">
                    <h4 className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                      <span className="flex items-center gap-1">
                        <ArrowUpCircle className="h-4 w-4 text-emerald-500" />{" "}
                        Ingresos
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewConceptoType("ingreso");
                          setShowAddConceptoDialog(true);
                        }}
                        className="h-6 px-2 text-emerald-600 hover:bg-emerald-50"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Bono
                      </Button>
                    </h4>

                    <div className="flex justify-between items-center text-sm font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        Pago Base ({selectedLegsData.length} movs)
                        {calcMode === "percentage" ? (
                          <Input
                            type="number"
                            className="w-16 h-6 text-xs p-1"
                            value={porcentajeFlete}
                            onChange={(e) =>
                              setPorcentajeFlete(Number(e.target.value))
                            }
                          />
                        ) : (
                          <Input
                            type="number"
                            className="w-20 h-6 text-xs p-1"
                            value={montoFijo}
                            onChange={(e) =>
                              setMontoFijo(Number(e.target.value))
                            }
                          />
                        )}
                      </span>
                      <span className="font-mono text-emerald-600 font-bold">
                        +{formatCurrency(liquidacion.pagoBaseBruto)}
                      </span>
                    </div>

                    {conceptosExtra
                      .filter((c) => c.tipo === "ingreso")
                      .map((bono) => (
                        <div
                          key={bono.id}
                          className="flex justify-between items-center text-sm font-medium text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded"
                        >
                          <span>+ {bono.descripcion}</span>
                          <span className="font-mono">
                            +{formatCurrency(bono.monto)}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* DEDUCCIONES */}
                  <div className="space-y-3">
                    <h4 className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                      <span className="flex items-center gap-1">
                        <ArrowDownCircle className="h-4 w-4 text-rose-500" />{" "}
                        Deducciones
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewConceptoType("deduccion");
                          setShowAddConceptoDialog(true);
                        }}
                        className="h-6 px-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Cargo
                      </Button>
                    </h4>

                    {liquidacion.deduccionViaticos > 0 && (
                      <div className="flex justify-between items-center text-sm font-medium text-rose-600">
                        <span>Anticipos Otorgados (Casetas/Viáticos)</span>
                        <span className="font-mono">
                          -{formatCurrency(liquidacion.deduccionViaticos)}
                        </span>
                      </div>
                    )}

                    {/* 🚀 AQUÍ ESTÁ LA CORRECCIÓN DEL BUG (liquidacion.combustibleFaltante) */}
                    {liquidacion.combustibleFaltante > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                        <span>Faltante de Combustible</span>
                        <span className="font-mono">
                          -{formatCurrency(liquidacion.combustibleFaltante)}
                        </span>
                      </div>
                    )}

                    {conceptosExtra
                      .filter((c) => c.tipo === "deduccion")
                      .map((desc) => (
                        <div
                          key={desc.id}
                          className="flex justify-between items-center text-sm font-medium text-rose-600 bg-rose-50/30 px-2 py-1 rounded"
                        >
                          <span>- {desc.descripcion}</span>
                          <span className="font-mono">
                            -{formatCurrency(desc.monto)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* GRAN TOTAL */}
                <div className="bg-slate-50 p-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-black uppercase tracking-widest text-slate-500">
                      Neto a Depositar
                    </span>
                    <span
                      className={cn(
                        "text-4xl font-black font-mono tracking-tighter",
                        liquidacion.netoAPagar >= 0
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {formatCurrency(liquidacion.netoAPagar)}
                    </span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white font-black gap-2 text-lg h-14 shadow-lg"
                    disabled={isAnimating || isLoadingPreview}
                    onClick={handleLiquidate}
                  >
                    {isAnimating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    {isAnimating
                      ? "Procesando Nómina..."
                      : "Emitir Recibo y Liquidar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 🚀 MODALES SECUNDARIOS */}
      <Dialog
        open={showAddConceptoDialog}
        onOpenChange={setShowAddConceptoDialog}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle
              className={cn(
                "flex items-center gap-2",
                newConceptoType === "ingreso"
                  ? "text-emerald-600"
                  : "text-rose-600",
              )}
            >
              {newConceptoType === "ingreso" ? (
                <ArrowUpCircle className="h-5 w-5" />
              ) : (
                <ArrowDownCircle className="h-5 w-5" />
              )}
              Añadir{" "}
              {newConceptoType === "ingreso"
                ? "Bono (Ingreso)"
                : "Cargo (Descuento)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto / Motivo</Label>
              <Input
                placeholder={
                  newConceptoType === "ingreso"
                    ? "Ej: Bono puntualidad..."
                    : "Ej: Faltante lona..."
                }
                value={newConceptoDesc}
                onChange={(e) => setNewConceptoDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto (MXN) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newConceptoAmount}
                  onChange={(e) => setNewConceptoAmount(e.target.value)}
                  className="pl-8 text-lg font-mono font-bold"
                />
              </div>
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
              Aplicar a Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🚀 RECIBO DE IMPRESIÓN OFICIAL (REGLA 5) */}
      <Dialog
        open={showReceiptModal}
        onOpenChange={(open) => {
          setShowReceiptModal(open);
          if (!open) {
            setSelectedOperatorId("");
            setSelectedLegIds([]);
            setConceptosExtra([]);
            setCombustibleFaltante(0);
            setPreviewData(null);
          }
        }}
      >
        <DialogContent className="max-w-[450px] p-0 overflow-hidden bg-white">
          <div className="p-8 border-b-8 border-brand-navy space-y-6">
            <div className="text-center space-y-1">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-slate-800" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">
                Liquidación
              </h2>
              <p className="text-slate-500 text-sm font-mono">
                {new Date().toLocaleString("es-MX")}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">Operador:</span>
                <span className="font-black text-brand-navy text-right">
                  {selectedLegsData[0]?.operator?.name}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">Movimientos:</span>
                <span className="font-bold">{selectedLegsData.length}</span>
              </div>

              {/* DESGLOSE TELEMÉTRICO */}
              <div className="pt-2 text-[11px] font-mono text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Distancia Total:</span>{" "}
                  <span>{previewData?.total_kms || 0} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Diésel Esperado:</span>{" "}
                  <span>{previewData?.consumo_esperado || 0} L</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Diésel Comprobado:</span>{" "}
                  <span>{previewData?.consumo_real || 0} L</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Pago de Flete</span>{" "}
                <span>{formatCurrency(liquidacion?.pagoBaseBruto || 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Bonos</span>{" "}
                <span>
                  +{formatCurrency(liquidacion?.bonosAdicionales || 0)}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Anticipos</span>{" "}
                <span>
                  -
                  {formatCurrency(
                    (liquidacion?.deduccionViaticos || 0) +
                      (liquidacion?.otrosAnticipos || 0),
                  )}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Penalización Diésel</span>{" "}
                <span>
                  -{formatCurrency(liquidacion?.combustibleFaltante || 0)}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Cargos Varios</span>{" "}
                <span>
                  -{formatCurrency(liquidacion?.deduccionesManuales || 0)}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-inner">
              <span className="font-bold uppercase tracking-widest text-xs">
                Total a Pagar
              </span>
              <span className="text-2xl font-black font-mono">
                {formatCurrency(liquidacion?.netoAPagar || 0)}
              </span>
            </div>

            <div className="pt-4 flex justify-center">
              <div className="border-t border-slate-300 w-48 text-center pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Firma de Conformidad
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 flex justify-center gap-4 sm:justify-center">
            <Button
              variant="outline"
              className="w-full gap-2 font-bold"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Imprimir Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
