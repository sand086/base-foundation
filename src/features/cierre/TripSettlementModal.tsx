// src/pages/CierreViaje.tsx
import * as React from "react";
import { useState, useMemo } from "react";
import {
  FileCheck,
  User,
  Truck,
  MapPin,
  Search,
  FilterX,
  History,
  Clock,
  Calculator,
  CheckCircle,
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
import { Toast } from "@/components/ui/toast";
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

// HOOKS REALES
import { useTrips } from "@/hooks/useTrips";
import { useClients } from "@/hooks/useClients";
import { useOperators } from "@/hooks/useOperators";
import { useUnits } from "@/hooks/useUnits";

// Importaremos los modales en el siguiente paso (Fase 3.2)
// import { TripSettlementModal } from "@/features/cierre/TripSettlementModal";

export default function CierreViaje() {
  const { trips = [] } = useTrips();
  const { clients = [] } = useClients();
  const { operadores = [], operators = [] } = useOperators() as any;
  const { unidades = [], units = [] } = useUnits() as any;

  // Manejo de compatibilidad de nombres de hooks
  const safeOperators = operadores.length > 0 ? operadores : operators;
  const safeUnits = unidades.length > 0 ? unidades : units;

  // ==========================================
  // ESTADOS DE UI Y FILTROS
  // ==========================================
  const [activeTab, setActiveTab] = useState<"pendientes" | "historico">(
    "pendientes",
  );
  const [filterOperator, setFilterOperator] = useState("ALL");
  const [filterClient, setFilterClient] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [globalSearch, setGlobalSearch] = useState("");

  // Selección por lotes (Para Patieros y Múltiples Tramos)
  const [selectedLegIds, setSelectedLegIds] = useState<string[]>([]);

  // Control del Modal de Liquidación (Próximo paso)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // ==========================================
  // PROCESAMIENTO DE DATOS (Aplanando Tramos)
  // ==========================================
  const allLegs = useMemo(() => {
    const legs: any[] = [];
    if (!Array.isArray(trips)) return legs;

    trips.forEach((t) => {
      // Cruzar el cliente
      const clientObj = clients.find(
        (c: any) => String(c.id) === String(t.client_id),
      );
      const clientName =
        clientObj?.razon_social || clientObj?.rfc || "Sin Cliente";

      t.legs?.forEach((l: any) => {
        legs.push({
          ...l,
          trip: { ...t, clientName },
        });
      });
    });
    return legs.sort(
      (a, b) =>
        new Date(b.start_date || 0).getTime() -
        new Date(a.start_date || 0).getTime(),
    );
  }, [trips, clients]);

  // ==========================================
  // SEPARACIÓN: PENDIENTES VS LIQUIDADOS
  // ==========================================
  const pendingLegs = useMemo(() => {
    return allLegs.filter((l) => {
      const st = String(l.status).toLowerCase();
      return st === "entregado" || st === "cerrado"; // Terminados pero no pagados
    });
  }, [allLegs]);

  const historyLegs = useMemo(() => {
    return allLegs.filter(
      (l) => String(l.status).toLowerCase() === "liquidado",
    );
  }, [allLegs]);

  // ==========================================
  // APLICACIÓN DE FILTROS
  // ==========================================
  const applyFilters = (list: any[]) => {
    return list.filter((l) => {
      // Filtro Operador
      if (filterOperator !== "ALL" && String(l.operator_id) !== filterOperator)
        return false;
      // Filtro Cliente
      if (filterClient !== "ALL" && String(l.trip?.client_id) !== filterClient)
        return false;
      // Filtro Tipo (Ruta vs Patio)
      if (filterType !== "ALL" && l.leg_type !== filterType) return false;
      // Búsqueda Global (Folio, Origen, Destino)
      if (globalSearch) {
        const term = globalSearch.toLowerCase();
        const folio = (l.trip?.public_id || `TRP-${l.trip_id}`).toLowerCase();
        const route = `${l.trip?.origin} ${l.trip?.destination}`.toLowerCase();
        if (!folio.includes(term) && !route.includes(term)) return false;
      }
      return true;
    });
  };

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

  // ==========================================
  // HANDLERS DE SELECCIÓN
  // ==========================================
  const toggleLegSelection = (id: string) => {
    setSelectedLegIds((prev) =>
      prev.includes(id) ? prev.filter((legId) => legId !== id) : [...prev, id],
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedLegIds.length === filteredPending.length) {
      setSelectedLegIds([]);
    } else {
      setSelectedLegIds(filteredPending.map((l) => String(l.id)));
    }
  };

  const clearFilters = () => {
    setFilterOperator("ALL");
    setFilterClient("ALL");
    setFilterType("ALL");
    setGlobalSearch("");
    setSelectedLegIds([]);
  };

  // Etiquetas amigables
  const legTypeLabels: Record<string, string> = {
    carga_muelle: "Muelle / Patio",
    ruta_carretera: "Ruta Carretera",
    entrega_vacio: "Retorno Vacío",
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy flex items-center gap-2">
            <FileCheck className="h-7 w-7 text-emerald-600" /> Tablero de
            Liquidaciones
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Selecciona los movimientos pendientes y genera el recibo de pago del
            operador.
          </p>
        </div>

        {/* ACTION BAR FLOTANTE (Aparece cuando hay items seleccionados) */}
        {selectedLegIds.length > 0 && activeTab === "pendientes" && (
          <div className="bg-brand-navy text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-4 animate-in slide-in-from-right-8">
            <span className="text-sm font-bold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-400" />
              {selectedLegIds.length} movimientos seleccionados
            </span>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-brand-navy font-black shadow-md"
              onClick={() => {
                // Validación de regla de negocio: ¿Son del mismo operador?
                const selectedOps = new Set(
                  filteredPending
                    .filter((l) => selectedLegIds.includes(String(l.id)))
                    .map((l) => l.operator_id),
                );
                if (selectedOps.size > 1) {
                  return Toast({
                    title: "Error de Selección",
                    /*   Description:
                      "Los movimientos seleccionados pertenecen a diferentes operadores. Por favor, selecciona movimientos del mismo operador para generar una liquidación.", */
                    variant: "destructive",
                  });
                }
                setIsSettlementModalOpen(true);
              }}
            >
              <Calculator className="h-4 w-4 mr-2" /> Iniciar Liquidación
            </Button>
          </div>
        )}
      </div>

      {/* PANEL DE FILTROS */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
              {/* Buscador Global */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Buscar Viaje
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Folio, Origen, Destino..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>
              </div>

              {/* Filtro Operador */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Operador
                </Label>
                <Select
                  value={filterOperator}
                  onValueChange={setFilterOperator}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los operadores</SelectItem>
                    {safeOperators.map((o: any) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name || o.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Cliente */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Cliente
                </Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los clientes</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.razon_social || c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Tipo */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Tipo Movimiento
                </Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los tipos</SelectItem>
                    <SelectItem value="carga_muelle">
                      Muelle / Patio (Carga)
                    </SelectItem>
                    <SelectItem value="ruta_carretera">
                      Ruta Carretera
                    </SelectItem>
                    <SelectItem value="entrega_vacio">
                      Retorno de Vacío
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-slate-500 hover:text-brand-navy"
              size="icon"
              title="Limpiar Filtros"
            >
              <FilterX className="h-5 w-5" />
            </Button>
          </div>
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    {activeTab === "pendientes" && (
                      <th scope="col" className="px-4 py-4 w-[50px]">
                        <Checkbox
                          checked={
                            filteredPending.length > 0 &&
                            selectedLegIds.length === filteredPending.length
                          }
                          onCheckedChange={toggleSelectAllFiltered}
                        />
                      </th>
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
                      className="px-6 py-4 font-black tracking-wider"
                    >
                      Operador / Unidad
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
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">
                          No se encontraron movimientos.
                        </p>
                        <p className="text-sm">
                          Ajusta los filtros o revisa el estado de los viajes de
                          despacho.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentList.map((leg) => {
                      const isSelected = selectedLegIds.includes(
                        String(leg.id),
                      );
                      const folio = leg.trip?.public_id || `TRP-${leg.trip_id}`;

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
                              {folio}
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
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3.5 w-3.5 text-blue-600" />
                              <span className="font-bold text-slate-800">
                                {leg.operator?.name || "S/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                              <Truck className="h-3.5 w-3.5" />
                              Eco: {leg.unit?.numero_economico || "S/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {activeTab === "pendientes" ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                                Pendiente Pago
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 flex items-center gap-1 ml-auto">
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
          </CardContent>
        </Card>
      </Tabs>

      {/* 🚀 AQUI IRA EL MODAL (Fase 3.2) */}
      {/* <TripSettlementModal 
        open={isSettlementModalOpen}
        onOpenChange={setIsSettlementModalOpen}
        selectedLegs={filteredPending.filter(l => selectedLegIds.includes(String(l.id)))}
        onSuccess={() => {
           setIsSettlementModalOpen(false);
           setSelectedLegIds([]);
           // Refrescar data
        }}
      /> 
      */}
    </div>
  );
}
