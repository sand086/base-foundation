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
  Edit,
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
    return allLegs.filter((l) => selectedLegIds.includes(String(l.id)));
  }, [allLegs, selectedLegIds]);

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
    const total_ingresos = pagoBaseBruto + bonosAdicionales;

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
    const total_deducciones =
      deduccionViaticos +
      otrosAnticipos +
      deduccionesManuales +
      (combustibleFaltante || 0);

    const neto_a_pagar = total_ingresos - total_deducciones;

    // 🚀 RETORNAMOS TODO, INCLUYENDO combustibleFaltante
    return {
      pagoBaseBruto,
      bonosAdicionales,
      total_ingresos,
      deduccionViaticos,
      otrosAnticipos,
      deduccionesManuales,
      combustibleFaltante,
      total_deducciones,
      neto_a_pagar,
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
        await liquidarLote(selectedLegIds, liquidacion.neto_a_pagar);
      }
      toast.success("Liquidación Exitosa", {
        description: `Se registró el pago de ${formatCurrency(liquidacion.neto_a_pagar)} correctamente.`,
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

  const safeLiquidacion = liquidacion || {
    pagoBaseBruto: 0,
    bonosAdicionales: 0,
    deduccionViaticos: 0,
    otrosAnticipos: 0,
    combustibleFaltante: 0,
    deduccionesManuales: 0,
    neto_a_pagar: 0,
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

            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
              <div className="bg-slate-50 border-b px-4 py-3 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-sm text-slate-600 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {activeTab === "pendientes"
                    ? "2. Selecciona Movimientos"
                    : "Historial de Liquidaciones"}
                </h3>
                {activeTab === "pendientes" && selectedOperatorId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllLegs}
                    className="h-8 text-xs font-bold transition-all hover:bg-slate-100"
                  >
                    {selectedLegIds.length === legsForSelectedOperator.length
                      ? "Deseleccionar Todos"
                      : "Seleccionar Todos"}
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/80 border-b sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      {activeTab === "pendientes" && (
                        <th
                          scope="col"
                          className="px-4 py-3 w-[50px] text-center"
                        >
                          {/* Opcional: Checkbox global aquí */}
                        </th>
                      )}
                      <th scope="col" className="px-6 py-3">
                        Referencia
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Ruta
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Unidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-right">
                        Monto / Estatus
                      </th>
                      {activeTab === "historico" && (
                        <th scope="col" className="px-4 py-3 text-center">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab === "historico" ? 5 : 5}
                          className="px-6 py-16 text-center bg-white"
                        >
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            {activeTab === "pendientes" ? (
                              <Calculator className="h-10 w-10 mb-3 opacity-20" />
                            ) : (
                              <History className="h-10 w-10 mb-3 opacity-20" />
                            )}
                            <p className="text-base font-semibold text-slate-600 mb-1">
                              {activeTab === "pendientes"
                                ? "Sin movimientos pendientes"
                                : "Historial vacío"}
                            </p>
                            <p className="text-xs">
                              {activeTab === "pendientes"
                                ? "Selecciona un operador arriba o revisa el estado de los viajes."
                                : "No hay liquidaciones cerradas para los filtros actuales."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentList.map((leg) => {
                        const isSelected = selectedLegIds.includes(
                          String(leg.id),
                        );
                        const totalAnticipos =
                          (leg.anticipo_viaticos || 0) +
                          (leg.anticipo_casetas || 0);

                        return (
                          <tr
                            key={leg.id}
                            className={cn(
                              "border-b last:border-0 transition-colors group cursor-pointer",
                              isSelected
                                ? "bg-blue-50/60 hover:bg-blue-50/80"
                                : "bg-white hover:bg-slate-50/60",
                            )}
                            onClick={() => {
                              if (activeTab === "pendientes") {
                                toggleLegSelection(String(leg.id));
                              } else {
                                // Comportamiento rápido: Al hacer clic en la fila del histórico, mostramos el recibo
                                // (Asumiendo que implementas una función para cargar la liquidación)
                                // handleViewReceipt(leg);
                              }
                            }}
                          >
                            {activeTab === "pendientes" && (
                              <td
                                className="px-4 py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleLegSelection(String(leg.id))
                                  }
                                  className={cn(
                                    "transition-all",
                                    isSelected
                                      ? "border-brand-navy bg-brand-navy"
                                      : "border-slate-300",
                                  )}
                                />
                              </td>
                            )}
                            <td className="px-6 py-3">
                              <div className="font-bold text-brand-navy text-sm">
                                {leg.trip?.public_id || `TRP-${leg.trip_id}`}
                              </div>
                              <div
                                className="text-[10px] text-slate-500 font-medium truncate max-w-[180px] mt-0.5"
                                title={leg.trip?.clientName}
                              >
                                {leg.trip?.clientName}
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                  <span
                                    className="text-xs font-semibold text-slate-700 truncate max-w-[150px]"
                                    title={leg.trip?.origin}
                                  >
                                    {leg.trip?.origin}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></div>
                                  <span
                                    className="text-xs font-semibold text-slate-700 truncate max-w-[150px]"
                                    title={leg.trip?.destination}
                                  >
                                    {leg.trip?.destination}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 font-semibold text-slate-600 mb-1 border-slate-200"
                              >
                                {legTypeLabels[leg.leg_type] || leg.leg_type}
                              </Badge>
                              <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                <Truck className="h-3 w-3 text-slate-400" />{" "}
                                Eco: {leg.unit?.numero_economico}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              {activeTab === "pendientes" ? (
                                <div className="flex flex-col items-end">
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 text-[10px] uppercase tracking-wider mb-1">
                                    Pendiente
                                  </Badge>
                                  {totalAnticipos > 0 && (
                                    <div className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                                      Ant: -${totalAnticipos.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="font-mono font-black text-emerald-600 text-sm">
                                    {/* Aquí deberías mostrar el monto real liquidado si lo tienes en el backend */}
                                    $
                                    {(
                                      leg.monto_neto_pagado || 0
                                    ).toLocaleString("es-MX", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                  <div className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />{" "}
                                    Liquidado
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* COLUMNA DE ACCIONES (Solo en Histórico) */}
                            {activeTab === "historico" && (
                              <td
                                className="px-4 py-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-full"
                                    title="Ver y Reimprimir Recibo"
                                    // onClick={() => handleViewReceipt(leg)}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                    title="Reabrir Liquidación (Editar)"
                                    // onClick={() => handleReopenSettlement(leg)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
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
        <div className="xl:col-span-5 space-y-6">
          {!liquidacion ? (
            // 🚀 ESTADO VACÍO: Se muestra cuando no has seleccionado viajes
            <Card className="border-dashed shadow-none bg-slate-50 flex flex-col items-center justify-center h-[400px] text-slate-400">
              <Calculator className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium text-lg text-slate-500">
                Panel de Liquidación
              </p>
              <p className="text-sm">
                Selecciona al menos un viaje de la tabla para calcular.
              </p>
            </Card>
          ) : (
            // 🚀 PANEL FINANCIERO: Se muestra en cuanto seleccionas un viaje
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
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
                            <AlertTriangle className="h-4 w-4" /> ATENCIÓN:
                            Vales Faltantes
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
                          </span>
                          <span>{previewData?.total_kms || 0} km</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-bold font-sans">
                            Consumo Esperado (ECM):
                          </span>
                          <span>{previewData?.consumo_esperado || 0} L</span>
                        </div>
                        <div className="flex justify-between text-brand-navy">
                          <span className="font-bold font-sans">
                            Consumo Real (Vales):
                          </span>
                          <span className="font-bold">
                            {previewData?.consumo_real || 0} L
                          </span>
                        </div>
                        <Separator className="my-2 bg-slate-200" />
                        {previewData?.diferencia_litros > 0 ? (
                          <div className="flex justify-between text-rose-600 font-bold">
                            <span className="font-sans">
                              Exceso a Descontar:
                            </span>
                            <span>{previewData.diferencia_litros} L</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span className="font-sans">
                              Rendimiento Óptimo:
                            </span>
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
                            value={combustibleFaltante || "0"}
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
                        <TabsTrigger
                          value="fixed"
                          className="font-bold text-xs"
                        >
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
                          liquidacion.neto_a_pagar >= 0
                            ? "text-emerald-600"
                            : "text-rose-600",
                        )}
                      >
                        {formatCurrency(liquidacion.neto_a_pagar)}
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

      {/* 🚀 RECIBO DE IMPRESIÓN OFICIAL (REGLA 5) - FIX PARA 1 SOLA HOJA */}
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
        <DialogContent className="max-w-[800px] p-0 overflow-hidden bg-slate-50 sm:rounded-2xl border-slate-200 shadow-2xl print:fixed print:top-0 print:left-0 print:right-0 print:bottom-0 print:w-[100vw] print:h-[100vh] print:max-w-none print:m-0 print:p-8 print:bg-white print:shadow-none print:border-none print:rounded-none print:transform-none print:overflow-hidden print:z-50">
          {/* Se oculta al imprimir para no gastar tinta azul en la cabecera */}
          <div className="print:hidden">
            <div className="h-2 w-full bg-brand-navy"></div>
          </div>

          {/* WATERMARK LOGO DE FONDO (Ajustado para no desbordar el papel) */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.02] pointer-events-none print:opacity-5 print:overflow-hidden">
            <Truck className="w-[400px] h-[400px] transform -rotate-12" />
          </div>

          <div className="p-6 sm:p-8 relative z-10 flex flex-col h-full print:p-0 print:h-auto">
            {/* 1. HEADER (Horizontal) */}
            <div className="flex justify-between items-start mb-6 print:mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center shrink-0 print:border-slate-300 print:shadow-none">
                  <Receipt className="h-7 w-7 text-brand-navy print:text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                    Liquidación
                  </h2>
                  <p className="text-slate-500 text-xs font-mono print:text-slate-600">
                    {new Date().toLocaleString("es-MX", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-slate-200/70 text-slate-700 px-4 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wider border border-slate-300/50 shadow-sm print:bg-transparent print:border-slate-400 print:text-black print:shadow-none">
                  FOLIO: LIQ-{String(Date.now()).slice(-6)}
                </span>
              </div>
            </div>

            {/* 2. CUERPO PRINCIPAL A DOS COLUMNAS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-6 print:grid-cols-12 print:gap-10">
              {/* COLUMNA IZQUIERDA: Contexto y Operación */}
              <div className="md:col-span-7 print:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-3 print:gap-6">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                    <span className="text-[12px] uppercase font-bold tracking-widest text-slate-400 mb-1 block print:text-slate-500">
                      Operador Asignado
                    </span>
                    <span
                      className="font-bold text-brand-navy text-sm truncate block print:text-black"
                      title={selectedLegsData[0]?.operator?.name}
                    >
                      {selectedLegsData[0]?.operator?.name || "N/A"}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                    <span className="text-[12px] uppercase font-bold tracking-widest text-slate-400 mb-1 block print:text-slate-500">
                      Movimientos
                    </span>
                    <span className="font-bold text-slate-700 text-sm block print:text-black">
                      {selectedLegsData.length}{" "}
                      <span className="font-normal text-slate-400 print:text-slate-500">
                        tramos
                      </span>
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-xl relative overflow-hidden h-full print:bg-white print:border-slate-300">
                  <Fuel className="absolute -right-4 -bottom-4 h-24 w-24 text-blue-200/50 opacity-40 print:hidden" />
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-blue-800 mb-4 relative z-10 print:text-black">
                    Telemetría y Diésel
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-600 relative z-10 print:text-black">
                    <div>
                      <p className="text-[10px] text-blue-600/70 font-sans font-bold uppercase mb-1 print:text-slate-500">
                        Distancia
                      </p>
                      <p className="font-bold text-slate-800 text-sm print:text-black">
                        {previewData?.total_kms || 0}{" "}
                        <span className="text-slate-400 text-xs">km</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-600/70 font-sans font-bold uppercase mb-1 print:text-slate-500">
                        Esperado
                      </p>
                      <p className="font-bold text-slate-800 text-sm print:text-black">
                        {previewData?.consumo_esperado || 0}{" "}
                        <span className="text-slate-400 text-xs">L</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-600/70 font-sans font-bold uppercase mb-1 print:text-slate-500">
                        Comprobado
                      </p>
                      <p className="font-bold text-slate-800 text-sm print:text-black">
                        {previewData?.consumo_real || 0}{" "}
                        <span className="text-slate-400 text-xs">L</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: Dinero y Desglose */}
              <div className="md:col-span-5 print:col-span-5 flex flex-col justify-between">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3 flex-1 mb-4 print:shadow-none print:border-slate-300">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-3 print:text-slate-600 print:border-slate-300">
                    Desglose Financiero
                  </h4>

                  <div className="space-y-2.5 text-xs font-medium">
                    <div className="flex justify-between items-center text-slate-700 print:text-black">
                      <span>Flete Base</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency(safeLiquidacion.pagoBaseBruto)}
                      </span>
                    </div>

                    {safeLiquidacion.bonosAdicionales > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 print:text-black">
                        <span>Bonos Extra</span>
                        <span className="font-mono font-semibold">
                          +{formatCurrency(safeLiquidacion.bonosAdicionales)}
                        </span>
                      </div>
                    )}

                    {safeLiquidacion.deduccionViaticos +
                      safeLiquidacion.otrosAnticipos >
                      0 && (
                      <div className="flex justify-between items-center text-rose-600 print:text-black">
                        <span>Anticipos</span>
                        <span className="font-mono font-semibold">
                          -
                          {formatCurrency(
                            safeLiquidacion.deduccionViaticos +
                              safeLiquidacion.otrosAnticipos,
                          )}
                        </span>
                      </div>
                    )}

                    {safeLiquidacion.combustibleFaltante > 0 && (
                      <div className="flex justify-between items-center text-rose-600 print:text-black">
                        <span>Faltante Diésel</span>
                        <span className="font-mono font-semibold">
                          -{formatCurrency(safeLiquidacion.combustibleFaltante)}
                        </span>
                      </div>
                    )}

                    {safeLiquidacion.deduccionesManuales > 0 && (
                      <div className="flex justify-between items-center text-rose-600 print:text-black">
                        <span>Cargos Varios</span>
                        <span className="font-mono font-semibold">
                          -{formatCurrency(safeLiquidacion.deduccionesManuales)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative bg-slate-900 p-4 sm:p-5 rounded-xl shadow-lg flex justify-between items-center overflow-hidden shrink-0 print:bg-white print:border-2 print:border-slate-800 print:shadow-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-navy to-slate-900 z-0 print:hidden"></div>
                  <div className="relative z-10">
                    <span className="block text-[10px] sm:text-[12px] text-slate-400 font-bold uppercase tracking-widest mb-1 print:text-slate-600">
                      Total a Depositar
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight print:text-black">
                      {formatCurrency(safeLiquidacion.neto_a_pagar)}
                    </span>
                  </div>
                  <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 print:border-none print:bg-transparent">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 print:text-black" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DIVISOR Y ZONA LEGAL */}
            <div className="mt-auto pt-4 print:pt-16">
              <div className="relative flex items-center pb-11 mb-11 print:pb-12 ">
                <div className="absolute -left-10 w-6 h-6 bg-slate-800/20 rounded-full blur-[2px] print:hidden"></div>
                <div className="absolute -right-10 w-6 h-6 bg-slate-800/20 rounded-full blur-[2px] print:hidden"></div>
                <div className="w-full border-t-2 border-dashed border-slate-300 print:border-slate-400"></div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-12 sm:gap-24 px-8 md:px-16 mb-8">
                <div className="flex-1 text-center">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-[10px] text-brand-navy font-black uppercase tracking-widest print:text-slate-800">
                      Conformidad
                    </p>
                    <p className="text-[12px] font-bold text-slate-600 mt-1 truncate print:text-black">
                      {selectedLegsData[0]?.operator?.name ||
                        "Firma del Operador"}
                    </p>
                    <p className="text-[8px] text-slate-400 font-medium mt-0.5 print:text-slate-500">
                      Recibe
                    </p>
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="text-[10px] text-brand-navy font-black uppercase tracking-widest print:text-slate-800">
                      Autorización
                    </p>
                    <p className="text-[12px] font-bold text-slate-600 mt-1 truncate print:text-black">
                      Depto. Finanzas / Despacho
                    </p>
                    <p className="text-[8px] text-slate-400 font-medium mt-0.5 print:text-slate-500">
                      Entrega
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[8px] text-slate-400 text-center leading-relaxed px-4 md:px-12 print:text-slate-500 print:max-w-2xl print:mx-auto">
                Este documento ampara la liquidación de los movimientos
                descritos. Al firmar, el operador acepta de conformidad los
                descuentos y pagos realizados, no reservándose acción ni derecho
                legal en contra de la empresa.
              </p>
            </div>
          </div>

          {/* FOOTER & ACCIONES */}
          <DialogFooter className="p-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 print:hidden">
            {/* Botón de Cerrar */}
            <Button
              className="w-full sm:w-auto min-w-[120px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              variant="ghost"
              onClick={() => setShowReceiptModal(false)}
            >
              Cerrar
            </Button>

            {/* Botón de Imprimir */}
            <Button
              className="w-full sm:w-auto min-w-[220px] gap-2 font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-brand-navy shadow-sm transition-all"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-5 w-5 text-slate-400" /> Imprimir Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
