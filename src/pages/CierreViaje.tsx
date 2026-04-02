import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  FileCheck,
  User,
  MapPin,
  DollarSign,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Loader2,
  CheckCircle,
  Fuel,
  Printer,
  AlertTriangle,
  Clock,
  History,
  CheckSquare,
  Truck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

import { AddTicketModal } from "@/features/combustible/AddTicketModal";
import { fuelService } from "@/services/fuelService";
import { cn } from "@/lib/utils";
import { useTrips } from "@/hooks/useTrips";
import { useClients } from "@/hooks/useClients";
import { useOperators } from "@/hooks/useOperators";
import { useUnits } from "@/hooks/useUnits";
import { useSystemConfig } from "@/hooks/useSystemConfig";

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
}

export default function CierreViaje() {
  const { trips = [], liquidarLote, getSettlementPreview } = useTrips() as any;
  const { clients = [] } = useClients();
  const { operadores = [], operators = [] } = useOperators() as any;
  const { unidades = [], units = [] } = useUnits() as any;

  //  PARÁMETROS GLOBALES DINÁMICOS
  const { valueAsNumber: rendimientoGlobal } = useSystemConfig(
    "rendimiento_diesel_esperado",
  );
  const { valueAsNumber: toleranciaGlobal } = useSystemConfig(
    "tolerancia_diesel_pct",
  );
  const rendimientoEsperado = rendimientoGlobal || 3.2;
  const toleranciaPct = toleranciaGlobal || 0.05;

  const { value: empresaNombre } = useSystemConfig("empresa_nombre");
  const { value: empresaRFC } = useSystemConfig("empresa_rfc");
  const { value: empresaDireccion } = useSystemConfig("empresa_direccion");
  const { value: empresaTelefono } = useSystemConfig("empresa_telefono");
  const { value: empresaLogo } = useSystemConfig("empresa_logo");

  const safeOperators = operadores.length > 0 ? operadores : operators;

  // ==========================================
  // ESTADOS DE SELECCIÓN Y FILTROS
  // ==========================================
  const [activeTab, setActiveTab] = useState<"pendientes" | "historico">(
    "pendientes",
  );
  const [filterOperator, setFilterOperator] = useState("ALL");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedLegIds, setSelectedLegIds] = useState<string[]>([]);

  // ==========================================
  // ESTADOS DE CÁLCULO & PREVIEW API
  // ==========================================
  const [sueldoRutaPactado, setSueldoRutaPactado] = useState<number>(0); // 🚀 FASE 2: Sueldo Fijo
  const [combustibleFaltante, setCombustibleFaltante] = useState<number>(0);
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
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [ticketPrefill, setTicketPrefill] = useState<any>(null);
  const [currentFixingLegId, setCurrentFixingLegId] = useState<number | null>(
    null,
  );

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
  //  CÁLCULOS FINANCIEROS (REGLAS DE GUSTAVO FASE 2 Y 3)
  // ==========================================
  const liquidacion = useMemo(() => {
    if (selectedLegsData.length === 0) return null;

    let pagoBaseBruto = 0;
    let deduccionViaticos = 0;
    let otrosAnticipos = 0;
    let hasRoadMove = false;

    selectedLegsData.forEach((leg) => {
      // 1. REGLA GUSTAVO FASE 2: Rutas vs Movimientos Locales
      if (leg.leg_type === "ruta_carretera") {
        hasRoadMove = true;
        // No sumamos tarifa base del cliente. Arranca en 0.
      } else {
        // Es Muelle, Patio o Vacío
        const isFull = Boolean(leg.trip?.dolly_id || leg.trip?.remolque_2_id);
        const bonoFijo = isFull ? 300 : 200; // $300 Full, $200 Sencillo
        pagoBaseBruto += bonoFijo;
      }

      // 2. REGLA GUSTAVO FASE 3: Eliminar cobro de casetas
      deduccionViaticos += leg.anticipo_viaticos || 0; // 🚀 Adiós anticipo_casetas
      otrosAnticipos +=
        (leg.otros_anticipos || 0) + (leg.anticipo_combustible || 0);
    });

    // 🚀 FASE 2: Añadir el sueldo de ruta fijo que el usuario escribe
    if (hasRoadMove) {
      pagoBaseBruto += sueldoRutaPactado;
    }

    const bonosAdicionales = conceptosExtra
      .filter((c) => c.tipo === "ingreso")
      .reduce((s, c) => s + c.monto, 0);
    const deduccionesManuales = conceptosExtra
      .filter((c) => c.tipo === "deduccion")
      .reduce((s, c) => s + c.monto, 0);

    const total_ingresos = pagoBaseBruto + bonosAdicionales;
    const total_deducciones =
      deduccionViaticos +
      otrosAnticipos +
      deduccionesManuales +
      (combustibleFaltante || 0);

    return {
      hasRoadMove,
      pagoBaseBruto,
      bonosAdicionales,
      total_ingresos,
      deduccionViaticos,
      otrosAnticipos,
      deduccionesManuales,
      combustibleFaltante,
      total_deducciones,
      neto_a_pagar: total_ingresos - total_deducciones,
    };
  }, [
    selectedLegsData,
    sueldoRutaPactado,
    conceptosExtra,
    combustibleFaltante,
  ]);

  // ==========================================
  // EFECTO: SOLICITAR PRE-LIQUIDACIÓN AL BACKEND (DIÉSEL)
  // ==========================================
  useEffect(() => {
    if (selectedLegIds.length > 0 && getSettlementPreview) {
      const hasRoadTrip = selectedLegsData.some(
        (l) => l.leg_type === "ruta_carretera",
      );

      if (hasRoadTrip) {
        setIsLoadingPreview(true);
        getSettlementPreview(selectedLegIds)
          .then((data: any) => {
            setPreviewData(data);
            const totalKms = data?.total_kms || 0;
            const consumoReal = data?.consumo_real || 0;
            const precioPromedio = data?.precio_promedio || 24.5;

            const consumoIdeal =
              totalKms > 0 ? totalKms / rendimientoEsperado : 0;
            const diferencia = consumoReal - consumoIdeal;
            const litrosTolerados = consumoIdeal * toleranciaPct;

            if (diferencia > litrosTolerados) {
              setCombustibleFaltante(diferencia * precioPromedio);
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
    } else {
      setPreviewData(null);
      setCombustibleFaltante(0);
    }
  }, [selectedLegIds, rendimientoEsperado, toleranciaPct]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const formatCurrencyLocal = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
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
        description: `Se registró el pago de ${formatCurrencyLocal(liquidacion.neto_a_pagar)} correctamente.`,
      });
      setShowReceiptModal(true);
    } catch (error) {
      toast.error("Error al guardar la liquidación en el servidor.");
    } finally {
      setIsAnimating(false);
    }
  };

  const applyFilters = (list: any[]) =>
    list.filter((l) => {
      if (filterOperator !== "ALL" && String(l.operator_id) !== filterOperator)
        return false;
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
    [pendingLegs, filterOperator, globalSearch],
  );
  const filteredHistory = useMemo(
    () => applyFilters(historyLegs),
    [historyLegs, filterOperator, globalSearch],
  );
  const currentList =
    activeTab === "pendientes" ? filteredPending : filteredHistory;

  const legTypeLabels: Record<string, string> = {
    carga_muelle: "Muelle / Patio",
    ruta_carretera: "Ruta Carretera",
    entrega_vacio: "Retorno Vacío",
  };

  const handleQuickFixTicket = (legId: number) => {
    const leg = allLegs.find((l) => l.id === legId);
    if (leg) {
      setTicketPrefill({
        trip_id: leg.id,
        unit_id: leg.unit_id,
        operator_id: leg.operator_id,
      });
      setCurrentFixingLegId(legId);
      setShowAddTicket(true);
    }
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
                  setSueldoRutaPactado(0); // Resetear sueldo
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
                  <thead className="text-[10px] text-slate-600 font-bold uppercase tracking-widest bg-slate-50/80 border-b sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      {activeTab === "pendientes" && (
                        <th
                          scope="col"
                          className="px-4 py-3 w-[50px] text-center"
                        ></th>
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
                        Estatus / Bono
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-16 text-center bg-white"
                        >
                          <div className="flex flex-col items-center justify-center text-slate-600">
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
                                : "No hay liquidaciones cerradas."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentList.map((leg) => {
                        const isSelected = selectedLegIds.includes(
                          String(leg.id),
                        );
                        const isFull = Boolean(
                          leg.trip?.dolly_id || leg.trip?.remolque_2_id,
                        );

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
                              if (activeTab === "pendientes")
                                toggleLegSelection(String(leg.id));
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
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                {leg.trip?.clientName}
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">
                                    {leg.trip?.origin}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></div>
                                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">
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
                                <Truck className="h-3 w-3 text-slate-600" />{" "}
                                Eco: {leg.unit?.numero_economico}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              {activeTab === "pendientes" ? (
                                <div className="flex flex-col items-end">
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 text-[10px] uppercase tracking-wider mb-1">
                                    Pendiente
                                  </Badge>
                                  <div className="text-[10px] text-brand-navy font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    {leg.leg_type === "ruta_carretera"
                                      ? "Base Fija"
                                      : isFull
                                        ? "$300"
                                        : "$200"}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="font-mono font-black text-emerald-600 text-sm">
                                    $
                                    {(
                                      leg.monto_neto_pagado || 0
                                    ).toLocaleString("es-MX", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                  <div className="text-[9px] text-slate-600 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />{" "}
                                    Liquidado
                                  </div>
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
        {selectedLegIds.length > 0 && liquidacion && (
          <div className="xl:col-span-5 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* 1. CONCILIACIÓN DIÉSEL (SOLO SI HAY VIAJE DE CARRETERA) */}
            {liquidacion.hasRoadMove && (
              <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-500">
                <CardHeader className="bg-amber-50/30 border-b pb-4">
                  <CardTitle className="text-sm font-bold text-amber-800 uppercase flex items-center gap-2">
                    <Fuel className="h-4 w-4" /> 3. Conciliación Diésel
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {isLoadingPreview ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-600">
                      <Loader2 className="h-8 w-8 animate-spin mb-2 text-amber-500" />
                      <p className="text-sm font-medium">
                        Cruzando vales vs telemetría...
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Alertas del Backend (Faltan Vales) */}
                      {previewData?.legs_sin_ticket?.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl mb-6 overflow-hidden shadow-sm animate-in zoom-in-95">
                          <div className="p-3 bg-rose-100/50 border-b border-rose-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-rose-600" />
                              <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">
                                Pendientes de Comprobación (
                                {previewData.legs_sin_ticket.length})
                              </span>
                            </div>
                          </div>

                          {/* Lista de viajes con problemas */}
                          <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {selectedLegsData
                              .filter((l) =>
                                previewData.legs_sin_ticket.includes(l.id),
                              )
                              .map((leg) => (
                                <div
                                  key={leg.id}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                                    currentFixingLegId === leg.id
                                      ? "bg-rose-100 border-rose-300"
                                      : "bg-white border-rose-100 shadow-sm",
                                  )}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-black text-rose-500 uppercase">
                                      Tramo #{leg.id}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                      {leg.trip?.public_id || "S/F"} •{" "}
                                      {leg.trip?.origin.split(",")[0]} ➔{" "}
                                      {leg.trip?.destination.split(",")[0]}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuickFixTicket(leg.id)}
                                    className="h-8 px-4 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-sm"
                                  >
                                    CARGAR TICKET
                                  </Button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-100 p-4 rounded-xl text-xs space-y-2 font-mono">
                        <div className="mb-3 pb-2 border-b border-slate-200 flex justify-between items-center text-[9px] text-slate-600 font-sans uppercase font-black tracking-widest">
                          <span>Regla Activa: {rendimientoEsperado} km/L</span>
                          <span>Tolerancia: {toleranciaPct * 100}%</span>
                        </div>

                        <div className="flex justify-between text-slate-600">
                          <span className="font-bold font-sans">
                            KMs Totales:
                          </span>
                          <span>{previewData?.total_kms || 0} km</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-bold font-sans">
                            Consumo ECM:
                          </span>
                          <span>
                            {(
                              (previewData?.total_kms || 0) /
                              rendimientoEsperado
                            ).toFixed(2)}{" "}
                            L
                          </span>
                        </div>
                        <div className="flex justify-between text-brand-navy">
                          <span className="font-bold font-sans">
                            Consumo Real:
                          </span>
                          <span className="font-bold">
                            {previewData?.consumo_real || 0} L
                          </span>
                        </div>

                        <Separator className="my-2 bg-slate-200" />

                        {combustibleFaltante > 0 ? (
                          <div className="flex justify-between text-rose-600 font-bold">
                            <span className="font-sans">
                              Exceso a Descontar:
                            </span>
                            <span>
                              {(
                                (previewData?.consumo_real || 0) -
                                (previewData?.total_kms || 0) /
                                  rendimientoEsperado
                              ).toFixed(2)}{" "}
                              L
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-emerald-600 font-bold text-[10px] uppercase tracking-tighter">
                            <span>Rendimiento Óptimo</span>
                            <CheckCircle className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2">
                        <Label className="text-[10px] font-black text-rose-700 uppercase tracking-widest">
                          Penalización Económica
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={combustibleFaltante}
                            onChange={(e) =>
                              setCombustibleFaltante(Number(e.target.value))
                            }
                            className="pl-10 font-bold border-rose-200 bg-rose-50/30 text-rose-700 focus-visible:ring-rose-500"
                          />
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 2. RECIBO DE LIQUIDACIÓN */}
            <Card
              className={cn(
                "border-slate-200 shadow-xl overflow-hidden border-t-4",
                liquidacion.hasRoadMove
                  ? "border-t-brand-navy"
                  : "border-t-emerald-500",
              )}
            >
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <Receipt className="h-4 w-4" />{" "}
                  {liquidacion.hasRoadMove ? "4." : "3."} Recibo de Liquidación
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-6 space-y-6">
                  {/* 🚀 FASE 2: SI HAY CARRETERA, MOSTRAMOS INPUT DE SUELDO FIJO */}
                  {liquidacion.hasRoadMove && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <Label className="text-blue-800 font-bold text-[10px] uppercase tracking-widest">
                          Sueldo Pactado (Ruta)
                        </Label>
                        <p className="text-blue-600/70 text-xs">
                          Pago fijo por el tramo carretero.
                        </p>
                      </div>
                      <div className="relative w-32">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
                        <Input
                          type="number"
                          value={sueldoRutaPactado || ""}
                          onChange={(e) =>
                            setSueldoRutaPactado(Number(e.target.value))
                          }
                          className="pl-8 font-bold text-right font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                  {/* Desglose */}
                  <div className="space-y-4">
                    {/* Ingresos */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-widest border-b pb-1">
                        <span>Ingresos</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-emerald-600 font-black text-[9px] hover:bg-emerald-50"
                          onClick={() => {
                            setNewConceptoType("ingreso");
                            setShowAddConceptoDialog(true);
                          }}
                        >
                          + BONO EXTRA
                        </Button>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">
                          Pago Base (Ruta / Patio)
                        </span>
                        <span className="font-mono font-bold text-emerald-600">
                          +{formatCurrencyLocal(liquidacion.pagoBaseBruto)}
                        </span>
                      </div>
                      {conceptosExtra
                        .filter((c) => c.tipo === "ingreso")
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex justify-between items-center text-sm bg-emerald-50/50 px-2 py-1 rounded"
                          >
                            <span className="text-emerald-700 text-xs font-medium">
                              {c.descripcion}
                            </span>
                            <span className="font-mono font-bold text-emerald-600">
                              +{formatCurrencyLocal(c.monto)}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Deducciones */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-widest border-b pb-1">
                        <span>Deducciones</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-rose-600 font-black text-[9px] hover:bg-rose-50"
                          onClick={() => {
                            setNewConceptoType("deduccion");
                            setShowAddConceptoDialog(true);
                          }}
                        >
                          + CARGO
                        </Button>
                      </div>
                      {/* 🚀 FASE 3: Casetas ya no se muestran como descuento */}
                      {(liquidacion.deduccionViaticos > 0 ||
                        liquidacion.otrosAnticipos > 0) && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">
                            Anticipos Operativos
                          </span>
                          <span className="font-mono font-bold text-rose-600">
                            -
                            {formatCurrencyLocal(
                              liquidacion.deduccionViaticos +
                                liquidacion.otrosAnticipos,
                            )}
                          </span>
                        </div>
                      )}

                      {liquidacion.combustibleFaltante > 0 && (
                        <div className="flex justify-between items-center text-sm bg-rose-50/50 px-2 py-1 rounded">
                          <span className="text-rose-700 text-xs font-medium">
                            Faltante Diésel
                          </span>
                          <span className="font-mono font-bold text-rose-600">
                            -
                            {formatCurrencyLocal(
                              liquidacion.combustibleFaltante,
                            )}
                          </span>
                        </div>
                      )}
                      {conceptosExtra
                        .filter((c) => c.tipo === "deduccion")
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex justify-between items-center text-sm bg-rose-50/50 px-2 py-1 rounded"
                          >
                            <span className="text-rose-700 text-xs font-medium">
                              {c.descripcion}
                            </span>
                            <span className="font-mono font-bold text-rose-600">
                              -{formatCurrencyLocal(c.monto)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Gran Total */}
                <div className="bg-slate-900 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                      Neto a Depositar
                    </span>
                    <span className="text-3xl font-black font-mono text-white tracking-tighter">
                      {formatCurrencyLocal(liquidacion.neto_a_pagar)}
                    </span>
                  </div>
                  <Button
                    className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white font-black h-12 shadow-lg gap-2"
                    disabled={
                      isAnimating ||
                      (liquidacion.hasRoadMove && isLoadingPreview)
                    }
                    onClick={handleLiquidate}
                  >
                    {isAnimating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckSquare className="h-4 w-4" />
                    )}
                    REGISTRAR Y EMITIR RECIBO
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* MODALES SECUNDARIOS */}
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-600">
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

      {/* 🚀 FASE 4: RECIBO DE IMPRESIÓN OFICIAL COMPLETAMENTE DESGLOSADO */}
      <Dialog
        open={showReceiptModal}
        onOpenChange={(open) => {
          setShowReceiptModal(open);
          if (!open) {
            setSelectedOperatorId("");
            setSelectedLegIds([]);
            setConceptosExtra([]);
            setCombustibleFaltante(0);
            setSueldoRutaPactado(0);
            setPreviewData(null);
          }
        }}
      >
        <DialogContent className="max-w-[800px] p-0 overflow-hidden bg-slate-50 sm:rounded-2xl border-slate-200 shadow-2xl print:fixed print:top-0 print:left-0 print:right-0 print:bottom-0 print:w-[100vw] print:h-[100vh] print:max-w-none print:m-0 print:p-8 print:bg-white print:shadow-none print:border-none print:rounded-none print:transform-none print:overflow-hidden print:z-50">
          <div className="print:hidden">
            <div className="h-2 w-full bg-brand-navy"></div>
          </div>
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.02] pointer-events-none print:opacity-5 print:overflow-hidden">
            <Truck className="w-[400px] h-[400px] transform -rotate-12" />
          </div>
          <div className="p-6 sm:p-8 relative z-10 flex flex-col h-full print:p-0 print:h-auto">
            {/* 1. HEADER (Horizontal) */}
            <div className="flex justify-between items-start mb-6 print:mb-8 border-b-2 border-brand-navy pb-4 print:border-black">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center shrink-0 print:border-transparent print:shadow-none overflow-hidden">
                  {empresaLogo ? (
                    <img
                      src={empresaLogo}
                      alt="Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Receipt className="h-8 w-8 text-brand-navy print:text-black" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                    {empresaNombre || "Nombre de Empresa"}
                  </h2>
                  <p className="text-slate-500 text-xs font-mono font-bold print:text-slate-600">
                    RFC: {empresaRFC || "XAXX010101000"}
                  </p>
                  <p className="text-slate-600 text-[10px] max-w-sm mt-0.5 leading-tight print:text-slate-500">
                    {empresaDireccion} • Tel: {empresaTelefono}
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <span className="bg-slate-200/70 text-slate-700 px-4 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wider border border-slate-300/50 shadow-sm print:bg-transparent print:border-slate-400 print:text-black print:shadow-none">
                  FOLIO: LIQ-{String(Date.now()).slice(-6)}
                </span>
                <p className="text-slate-500 text-xs font-mono print:text-slate-600">
                  {new Date().toLocaleString("es-MX", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            {/* 2. CUERPO PRINCIPAL A DOS COLUMNAS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-6 print:grid-cols-12 print:gap-10">
              <div className="md:col-span-7 print:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-3 print:gap-6">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                    <span className="text-[12px] uppercase font-bold tracking-widest text-slate-600 mb-1 block print:text-slate-500">
                      Operador Asignado
                    </span>
                    <span className="font-bold text-brand-navy text-sm truncate block print:text-black">
                      {selectedLegsData[0]?.operator?.name || "N/A"}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                    <span className="text-[12px] uppercase font-bold tracking-widest text-slate-600 mb-1 block print:text-slate-500">
                      Movimientos
                    </span>
                    <span className="font-bold text-slate-700 text-sm block print:text-black">
                      {selectedLegsData.length}{" "}
                      <span className="font-normal text-slate-600 print:text-slate-500">
                        tramos
                      </span>
                    </span>
                  </div>
                </div>

                {liquidacion?.hasRoadMove && (
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
                          <span className="text-slate-600 text-xs">km</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-600/70 font-sans font-bold uppercase mb-1 print:text-slate-500">
                          Esperado
                        </p>
                        <p className="font-bold text-slate-800 text-sm print:text-black">
                          {previewData?.consumo_esperado || 0}{" "}
                          <span className="text-slate-600 text-xs">L</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-600/70 font-sans font-bold uppercase mb-1 print:text-slate-500">
                          Comprobado
                        </p>
                        <p className="font-bold text-slate-800 text-sm print:text-black">
                          {previewData?.consumo_real || 0}{" "}
                          <span className="text-slate-600 text-xs">L</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-5 print:col-span-5 flex flex-col justify-between">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3 flex-1 mb-4 print:shadow-none print:border-slate-300">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-600 border-b border-slate-100 pb-2 mb-3 print:text-slate-600 print:border-slate-300">
                    Desglose Financiero
                  </h4>
                  <div className="space-y-2.5 text-xs font-medium">
                    <div className="flex justify-between items-center text-slate-700 print:text-black">
                      <span>Pago Base (Ruta / Patio)</span>
                      <span className="font-mono font-semibold">
                        {formatCurrencyLocal(liquidacion?.pagoBaseBruto || 0)}
                      </span>
                    </div>
                    {(liquidacion?.bonosAdicionales || 0) > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 print:text-black">
                        <span>Bonos Extra</span>
                        <span className="font-mono font-semibold">
                          +
                          {formatCurrencyLocal(
                            liquidacion?.bonosAdicionales || 0,
                          )}
                        </span>
                      </div>
                    )}
                    {(liquidacion?.deduccionViaticos || 0) +
                      (liquidacion?.otrosAnticipos || 0) >
                      0 && (
                      <div className="flex justify-between items-center text-rose-600 print:text-black">
                        <span>Anticipos Operativos</span>
                        <span className="font-mono font-semibold">
                          -
                          {formatCurrencyLocal(
                            (liquidacion?.deduccionViaticos || 0) +
                              (liquidacion?.otrosAnticipos || 0),
                          )}
                        </span>
                      </div>
                    )}
                    {(liquidacion?.combustibleFaltante || 0) > 0 && (
                      <div className="flex justify-between items-center text-rose-600 print:text-black">
                        <span>Faltante Diésel</span>
                        <span className="font-mono font-semibold">
                          -
                          {formatCurrencyLocal(
                            liquidacion?.combustibleFaltante || 0,
                          )}
                        </span>
                      </div>
                    )}
                    {(liquidacion?.deduccionesManuales || 0) > 0 && (
                      <div className="flex justify-between items-center text-rose-600 print:text-black">
                        <span>Cargos Varios</span>
                        <span className="font-mono font-semibold">
                          -
                          {formatCurrencyLocal(
                            liquidacion?.deduccionesManuales || 0,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative bg-slate-900 p-4 sm:p-5 rounded-xl shadow-lg flex justify-between items-center overflow-hidden shrink-0 print:bg-white print:border-2 print:border-slate-800 print:shadow-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-navy to-slate-900 z-0 print:hidden"></div>
                  <div className="relative z-10">
                    <span className="block text-[10px] sm:text-[12px] text-slate-600 font-bold uppercase tracking-widest mb-1 print:text-slate-600">
                      Total a Depositar
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight print:text-black">
                      {formatCurrencyLocal(liquidacion?.neto_a_pagar || 0)}
                    </span>
                  </div>
                  <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 print:border-none print:bg-transparent">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 print:text-black" />
                  </div>
                </div>
              </div>
            </div>

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
                    <p className="text-[8px] text-slate-600 font-medium mt-0.5 print:text-slate-500">
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
                    <p className="text-[8px] text-slate-600 font-medium mt-0.5 print:text-slate-500">
                      Entrega
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[8px] text-slate-600 text-center leading-relaxed px-4 md:px-12 print:text-slate-500 print:max-w-2xl print:mx-auto">
                Este documento ampara la liquidación de los movimientos
                descritos. Al firmar, el operador acepta de conformidad los
                descuentos y pagos realizados, no reservándose acción ni derecho
                legal en contra de la empresa.
              </p>
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 print:hidden">
            <Button
              className="w-full sm:w-auto min-w-[120px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              variant="ghost"
              onClick={() => setShowReceiptModal(false)}
            >
              Cerrar
            </Button>
            <Button
              className="w-full sm:w-auto min-w-[220px] gap-2 font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-brand-navy shadow-sm transition-all"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-5 w-5 text-slate-600" /> Imprimir Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AddTicketModal
        open={showAddTicket}
        onOpenChange={(isOpen) => {
          setShowAddTicket(isOpen);
          if (!isOpen) setTicketPrefill(null);
        }}
        onSubmit={async (d) => {
          await fuelService.create(d);
          setShowAddTicket(false);
        }}
        initialData={ticketPrefill}
      />
    </div>
  );
}
