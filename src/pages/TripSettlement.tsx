import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  FileCheck,
  User,
  MapPin,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  CheckCircle,
  Clock,
  History,
  CheckSquare,
  Truck,
  ShieldAlert,
  Eye,
  Undo,
  Trash2,
  Receipt,
  AlertTriangle,
  Lock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useClients } from "@/features/clients/hooks/useClients";
import { useOperators } from "@/features/operators/hooks/useOperators";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import axiosClient from "@/api/axiosClient";

import { OperatorSettlementDetailModal } from "@/features/receivables/components/OperatorSettlementDetailModal";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table"; // <-- IMPORTACIÓN DEL DATATABLE

interface ConceptoExtra {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "deduccion";
  categoria: string;
}

const legTypeLabels: Record<string, string> = {
  carga_muelle: "Muelle / Patio",
  ruta_carretera: "Ruta Carretera",
  entrega_vacio: "Retorno Vacío",
};

export default function TripSettlement() {
  const {
    trips = [],
    liquidarLote,
    getSettlementPreview,
    refresh,
  } = useTrips() as any;
  const { clients = [] } = useClients();
  const { operadores = [], operators = [] } = useOperators() as any;

  const { value: empresaNombre } = useSystemConfig("empresa_nombre");
  const { value: empresaRFC } = useSystemConfig("empresa_rfc");
  const { value: empresaDireccion } = useSystemConfig("empresa_direccion");
  const { value: empresaTelefono } = useSystemConfig("empresa_telefono");
  const { value: empresaLogo } = useSystemConfig("empresa_logo");

  const [activeTab, setActiveTab] = useState<"pendientes" | "historico">(
    "pendientes",
  );

  // ESTADOS DE FILTROS ADICIONALES
  const [filterUnit, setFilterUnit] = useState("");
  const [filterOperatorName, setFilterOperatorName] = useState("");

  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedLegIds, setSelectedLegIds] = useState<string[]>([]);
  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<string[]>([]);

  // ESTADO OPTIMISTA: Para ocultar al instante los liquidados
  const [locallyLiquidatedIds, setLocallyLiquidatedIds] = useState<string[]>(
    [],
  );

  // ESTADOS FINANCIEROS
  const [sueldoBasePactado, setSueldoBasePactado] = useState<number>(0);
  const [auditDetails, setAuditDetails] = useState<any>(null);
  const [combustibleFaltante, setCombustibleFaltante] = useState<number>(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [conceptosExtra, setConceptosExtra] = useState<ConceptoExtra[]>([]);
  const [showAddConceptoDialog, setShowAddConceptoDialog] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [actionModal, setActionModal] = useState<{
    type: "reopen" | "hide";
    leg: any;
  } | null>(null);

  const [newConceptoType, setNewConceptoType] = useState<
    "ingreso" | "deduccion"
  >("ingreso");
  const [newConceptoDesc, setNewConceptoDesc] = useState("");
  const [newConceptoAmount, setNewConceptoAmount] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // 1. CONSOLIDAR TODOS LOS DATOS PARA LA TABLA
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
        legs.push({
          ...l,
          trip: { ...t, clientName },
          // Campos virtuales para el buscador de EnhancedDataTable
          _search_ref: `TRP-${t.public_id || t.id} ${l.operator?.name || ""}`,
          _unit_eco: l.unit?.numero_economico || "",
          _operator_name: l.operator?.name || "",
        });
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
      allLegs.filter(
        (l) =>
          ["entregado", "cerrado"].includes(String(l.status).toLowerCase()) &&
          !locallyLiquidatedIds.includes(String(l.id)),
      ),
    [allLegs, locallyLiquidatedIds],
  );

  const historyLegs = useMemo(
    () =>
      allLegs.filter(
        (l) =>
          (String(l.status).toLowerCase() === "liquidado" ||
            locallyLiquidatedIds.includes(String(l.id))) &&
          !hiddenHistoryIds.includes(String(l.id)),
      ),
    [allLegs, hiddenHistoryIds, locallyLiquidatedIds],
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

  // 2. APLICAR FILTROS ADICIONALES ANTES DE ENVIAR A DATATABLE
  const tableData = useMemo(() => {
    const baseData =
      activeTab === "pendientes" ? legsForSelectedOperator : historyLegs;
    return baseData.filter((leg) => {
      let matches = true;
      if (filterUnit) {
        matches =
          matches &&
          leg._unit_eco.toLowerCase().includes(filterUnit.toLowerCase());
      }
      if (filterOperatorName && activeTab === "historico") {
        matches =
          matches &&
          leg._operator_name
            .toLowerCase()
            .includes(filterOperatorName.toLowerCase());
      }
      return matches;
    });
  }, [
    activeTab,
    legsForSelectedOperator,
    historyLegs,
    filterUnit,
    filterOperatorName,
  ]);

  const selectedLegsData = useMemo(() => {
    return allLegs.filter((l) => selectedLegIds.includes(String(l.id)));
  }, [allLegs, selectedLegIds]);

  // 3. DEFINIR COLUMNAS DEL DATATABLE
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      {
        key: "_search_ref", // Usado para el buscador global por Referencia y Operador
        header: "Referencia",
        render: (value, leg) => (
          <div>
            <div className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <span className="text-slate-400">TRP-</span>
              {leg.trip?.public_id || leg.trip?.id || "N/A"}
            </div>
            <div className="text-[10px] text-brand-navy dark:text-blue-300 font-bold flex items-center gap-1 mt-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px]">
                {leg.operator?.name || "Sin Operador"}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "trip.route_name",
        header: "Ruta",
        render: (value, leg) => (
          <div
            className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[250px] line-clamp-2"
            title={leg.trip?.route_name}
          >
            {leg.trip?.route_name || "Sin ruta asignada"}
          </div>
        ),
      },
      {
        key: "leg_type",
        header: "Fase Operativa",
        type: "status",
        statusOptions: ["Muelle / Patio", "Ruta Carretera", "Retorno Vacío"],
        statusNormalizer: (val) => legTypeLabels[val] || val, // Traduce los id base para el dropdown del datatable
        render: (value, leg) => (
          <div>
            <Badge
              variant="outline"
              className="bg-slate-50 dark:bg-slate-800 font-black text-[9px] uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1 border-slate-200 dark:border-white/10"
            >
              {legTypeLabels[leg.leg_type] || leg.leg_type}
            </Badge>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 mt-1">
              <Truck className="h-3 w-3 text-slate-600 dark:text-slate-400 shrink-0" />
              Eco: {leg.unit?.numero_economico || "S/A"}
            </div>
          </div>
        ),
      },
      {
        key: "monto_neto_pagado",
        header: "Estatus / Base",
        render: (value, leg) => {
          const isFull = !!(leg.trip?.dolly_id || leg.trip?.remolque_2_id);
          if (activeTab === "pendientes") {
            return (
              <div className="flex flex-col items-end">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-0 text-[10px] uppercase tracking-wider mb-1">
                  Pendiente
                </Badge>
                <div className="text-[10px] text-brand-navy dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-500/20">
                  {leg.leg_type === "ruta_carretera"
                    ? "Base Fija"
                    : isFull
                      ? "$300"
                      : "$200"}
                </div>
              </div>
            );
          } else {
            return (
              <div className="flex flex-col items-end">
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(value || 0)}
                </span>
                <div className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                  <CheckCircle className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />{" "}
                  Liquidado
                </div>
              </div>
            );
          }
        },
      },
    ];

    if (activeTab === "historico") {
      cols.push({
        key: "acciones",
        header: "Acciones",
        sortable: false,
        render: (_, leg) => {
          const isPaidOrHasAbonos =
            leg.trip?.cxc_pagada === true ||
            leg.is_paid === true ||
            leg.estatus_pago === "pagado";
          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewReceipt(leg);
                }}
                title="Ver Recibo"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isPaidOrHasAbonos}
                className={cn(
                  "h-8 w-8 transition-all",
                  isPaidOrHasAbonos
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/20",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPaidOrHasAbonos)
                    setActionModal({ type: "reopen", leg });
                }}
                title={
                  isPaidOrHasAbonos
                    ? "BLOQUEADO: CXC Pagada"
                    : "Anular y Reabrir (Opción A)"
                }
              >
                {isPaidOrHasAbonos ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Undo className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionModal({ type: "hide", leg });
                }}
                title="Ocultar de la lista (Opción B)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [activeTab]);

  const isAuditPending = previewData?.legs_sin_ticket?.length > 0;

  const liquidacion = useMemo(() => {
    if (selectedLegsData.length === 0) return null;

    if (activeTab === "historico") {
      const leg = selectedLegsData[0];
      const esRuta = leg.leg_type === "ruta_carretera";
      const isFullConfig = !!(leg.trip?.dolly_id || leg.trip?.remolque_2_id);
      const pagoBase = esRuta
        ? leg.monto_sueldo || 0
        : leg.monto_sueldo || (isFullConfig ? 300 : 200);

      return {
        hasRoadMove: esRuta,
        pagoBaseBruto: pagoBase,
        bonosAdicionales: leg.monto_bonos || 0,
        total_ingresos: pagoBase + (leg.monto_bonos || 0),
        deduccionViaticos: leg.anticipo_viaticos || 0,
        otrosAnticipos:
          (leg.otros_anticipos || 0) + (leg.anticipo_combustible || 0),
        deduccionesManuales: leg.monto_maniobras || 0,
        combustibleFaltante: leg.monto_penalizaciones || 0,
        total_deducciones:
          (leg.anticipo_viaticos || 0) +
          (leg.otros_anticipos || 0) +
          (leg.anticipo_combustible || 0) +
          (leg.monto_penalizaciones || 0) +
          (leg.monto_maniobras || 0),
        neto_a_pagar: leg.monto_neto_pagado || 0,
      };
    }

    let deduccionViaticos = 0;
    let otrosAnticipos = 0;
    let hasRoadMove = false;

    selectedLegsData.forEach((leg) => {
      if (leg.leg_type === "ruta_carretera") {
        hasRoadMove = true;
      }
      deduccionViaticos += leg.anticipo_viaticos || 0;
      otrosAnticipos +=
        (leg.otros_anticipos || 0) + (leg.anticipo_combustible || 0);
    });

    const pagoBaseBruto = sueldoBasePactado;
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
    sueldoBasePactado,
    conceptosExtra,
    combustibleFaltante,
    activeTab,
  ]);

  useEffect(() => {
    if (activeTab === "historico") return;

    if (selectedLegIds.length === 0) {
      setPreviewData(null);
      setCombustibleFaltante(0);
      setSueldoBasePactado(0);
      return;
    }

    let penalizacionLocal = 0;
    let sueldoLocalCalculado = 0;

    selectedLegsData.forEach((leg) => {
      penalizacionLocal += Number(leg.monto_penalizaciones) || 0;

      if (leg.leg_type === "ruta_carretera") {
        let sueldoTarifa = 0;
        const trip = leg.trip;

        if (trip?.client?.sub_clients) {
          const subClient =
            trip.client.sub_clients.find(
              (sc: any) => sc.id === trip.sub_client_id,
            ) || trip.client.sub_clients[0];

          if (subClient?.tariffs) {
            const tariff =
              subClient.tariffs.find((t: any) => t.id === trip.tariff_id) ||
              subClient.tariffs[0];

            if (tariff?.sueldo_operador) {
              sueldoTarifa = tariff.sueldo_operador;
            }
          }
        }

        sueldoLocalCalculado +=
          leg.monto_sueldo ||
          sueldoTarifa ||
          trip?.sueldo_operador ||
          trip?.monto_sueldo ||
          trip?.pago_operador ||
          0;
      } else {
        const isFull = !!(leg.trip?.dolly_id || leg.trip?.remolque_2_id);
        sueldoLocalCalculado += isFull ? 300 : 200;
      }
    });

    const roadLeg = selectedLegsData.find(
      (l) => l.leg_type === "ruta_carretera",
    );

    if (roadLeg && typeof getSettlementPreview === "function") {
      setIsLoadingPreview(true);
      getSettlementPreview(selectedLegIds)
        .then((data: any) => {
          setPreviewData(data);
          setCombustibleFaltante(
            data?.deduccion_combustible ||
              data?.penalizacion_combustible ||
              penalizacionLocal,
          );

          const sueldoAPI =
            data?.sueldo_operador_pactado || data?.monto_sueldo || 0;
          setSueldoBasePactado(
            sueldoAPI > 0 ? sueldoAPI : sueldoLocalCalculado,
          );
        })
        .catch(() => {
          toast.error("Error de conexión al verificar telemetría del viaje.");
          setPreviewData(null);
          setCombustibleFaltante(penalizacionLocal);
          setSueldoBasePactado(sueldoLocalCalculado);
        })
        .finally(() => setIsLoadingPreview(false));
    } else {
      setPreviewData(null);
      setCombustibleFaltante(penalizacionLocal);
      setSueldoBasePactado(sueldoLocalCalculado);
    }
  }, [selectedLegIds, activeTab]);

  const formatCurrencyLocal = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const toggleLegSelection = (id: string) => {
    setSelectedLegIds((prev) =>
      prev.includes(id) ? prev.filter((legId) => legId !== id) : [...prev, id],
    );
  };

  const handleAddConcepto = () => {
    const amount = parseFloat(newConceptoAmount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Ingresa un monto válido");

    const newConcepto: ConceptoExtra = {
      id: `CE-${Date.now()}`,
      tipo: newConceptoType,
      categoria: newConceptoType === "ingreso" ? "bono" : "cargo",
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

  const removeConcepto = (id: string) => {
    setConceptosExtra((prev) => prev.filter((c) => c.id !== id));
    toast.info("Concepto eliminado exitosamente.");
  };

  const removeCombustibleFaltante = () => {
    setCombustibleFaltante(0);
    toast.success("Cargo por combustible anulado para esta liquidación.");
  };

  const handleLiquidate = async () => {
    setIsAnimating(true);
    try {
      if (!liquidacion) return;

      const payload = {
        leg_ids: selectedLegIds.map(Number),
        monto_sueldo: liquidacion.pagoBaseBruto,
        monto_bonos: liquidacion.bonosAdicionales,
        monto_maniobras: liquidacion.deduccionesManuales,
        monto_penalizaciones: liquidacion.combustibleFaltante,
        neto_a_pagar: liquidacion.neto_a_pagar,
        conceptos_extra: conceptosExtra.map((c) => ({
          ...c,
          categoria: c.categoria || (c.tipo === "ingreso" ? "bono" : "cargo"),
        })),
      };

      setLocallyLiquidatedIds((prev) => [...prev, ...selectedLegIds]);

      await axiosClient.post("/api/logistics/trips/legs/settle-batch", payload);

      toast.success("Liquidación Emitida Exitosamente", {
        description: `Se registró el pago de ${formatCurrencyLocal(liquidacion.neto_a_pagar)} con su desglose. Cuenta por cobrar y Factura generadas.`,
      });

      if (refresh) refresh();
      setShowReceiptModal(true);
    } catch (error) {
      setLocallyLiquidatedIds((prev) =>
        prev.filter((id) => !selectedLegIds.includes(id)),
      );

      toast.error("Error al emitir Liquidación y CxC", {
        description:
          "El servidor rechazó la operación (Probable error de timbrado SAT). Revisa la consola.",
      });
    } finally {
      setIsAnimating(false);
    }
  };

  const handleViewReceipt = async (leg: any) => {
    try {
      setIsLoadingPreview(true);
      const response = await axiosClient.get(
        `/api/logistics/trips/leg/${leg.id}/settlement`,
      );

      const auditEvent = leg.timeline_events?.find(
        (e: any) =>
          e.location === "Conciliación de Combustible" ||
          e.comments?.includes("Detalles Fase"),
      );

      let km = Number(response.data?.kmsRecorridos) || 0;
      let ltEcm = Number(response.data?.consumoEsperadoLitros) || 0;
      let vales = Number(response.data?.consumoRealLitros) || 0;
      let rend = vales > 0 ? (km / vales).toFixed(2) : "0.00";
      let veredicto =
        Number(response.data?.deduccionCombustible) > 0
          ? "COBRO_OPERADOR"
          : "CONCILIADO";
      let texto = "Datos recuperados de la liquidación oficial.";

      if (vales === 0 && auditEvent && auditEvent.comments) {
        const text = auditEvent.comments;

        const kmMatch = text.match(/Km ECM:\s*([\d.]+)/);
        const ltEcmMatch = text.match(/Litros ECM:\s*([\d.]+)/);
        const valesMatch = text.match(/Vales:\s*([\d.]+)/);
        const rendMatch = text.match(/Rend Real:\s*([\d.]+)/);
        const verMatch = text.match(/Ver:\s*([A-Z_]+)/);

        km = kmMatch ? Number(kmMatch[1].replace(/,/g, "")) : km;
        ltEcm = ltEcmMatch ? Number(ltEcmMatch[1]) : ltEcm;
        vales = valesMatch ? Number(valesMatch[1]) : vales;
        rend = rendMatch ? rendMatch[1] : rend;
        veredicto = verMatch ? verMatch[1] : veredicto;
        texto = text;
      }

      if (response.data || vales > 0) {
        setAuditDetails({
          km: String(km),
          ltEcm: String(ltEcm),
          vales: String(vales),
          rend: String(rend),
          veredicto: veredicto,
          textOriginal: texto,
          fechaAudit: response.data?.fechaViaje || "N/A",
          hasData: true,
        });
      }

      setSelectedLegIds([String(leg.id)]);
      setShowReceiptModal(true);
    } catch (error) {
      toast.error("Aviso: Se abrirá el recibo básico sin detalle de diésel.");

      setSelectedLegIds([String(leg.id)]);
      setShowReceiptModal(true);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;

    if (actionModal.type === "hide") {
      setHiddenHistoryIds([...hiddenHistoryIds, String(actionModal.leg.id)]);
      toast.success("Viaje ocultado del histórico localmente.");
    } else if (actionModal.type === "reopen") {
      try {
        await axiosClient.post(
          `/api/logistics/trips/legs/${actionModal.leg.id}/reopen`,
        );

        setLocallyLiquidatedIds((prev) =>
          prev.filter((id) => id !== String(actionModal.leg.id)),
        );

        toast.success("Liquidación anulada y reabierta.", {
          description:
            "La CxC ha sido cancelada y el viaje regresó a 'Por Liquidar'.",
        });
        if (refresh) refresh();
      } catch (error) {
        toast.error("Error al reabrir la liquidación.");
      }
    }
    setActionModal(null);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy dark:text-white flex items-center gap-2">
            <FileCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />{" "}
            Liquidaciones Operativas
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Módulo de Tesorería. Selecciona los movimientos y emite el recibo de
            pago del operador.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className={cn(
            "transition-all duration-500",
            selectedLegIds.length > 0 && activeTab === "pendientes"
              ? "xl:col-span-7"
              : "xl:col-span-12",
          )}
        >
          {activeTab === "pendientes" && (
            <Card className="border-slate-200 dark:border-white/10 shadow-sm mb-6 bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5 pb-4">
                <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />{" "}
                  1. Seleccionar Operador a Liquidar
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
                    setSueldoBasePactado(0);
                  }}
                >
                  <SelectTrigger className="h-12 text-base font-medium bg-white dark:bg-slate-950 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Busca al operador con viajes pendientes..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-white/10">
                    {operatorsWithPending.map((op: any) => (
                      <SelectItem
                        key={op.id}
                        value={String(op.id)}
                        className="font-medium py-3 dark:text-slate-200 dark:focus:bg-slate-800"
                      >
                        {op.name}
                      </SelectItem>
                    ))}
                    {operatorsWithPending.length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No hay operadores con viajes pendientes de pago.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              setSelectedLegIds([]);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6 dark:bg-slate-900">
              <TabsTrigger
                value="pendientes"
                className="font-bold flex items-center gap-2 dark:data-[state=active]:bg-slate-800 dark:text-slate-400 dark:data-[state=active]:text-white"
              >
                <Clock className="h-4 w-4" /> Por Liquidar
                <Badge
                  variant="secondary"
                  className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-none"
                >
                  {pendingLegs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="font-bold flex items-center gap-2 dark:data-[state=active]:bg-slate-800 dark:text-slate-400 dark:data-[state=active]:text-white"
              >
                <History className="h-4 w-4" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* TABLA PRINCIPAL */}
            <div className="mb-4 flex justify-between items-center px-2">
              <h3 className="font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {activeTab === "pendientes"
                  ? "2. Selecciona los tramos a pagar"
                  : "Historial de Liquidaciones"}
              </h3>
            </div>

            <EnhancedDataTable
              data={tableData}
              columns={columns}
              rowKey="id"
              enableRowSelection={activeTab === "pendientes"}
              selectedRows={selectedLegsData}
              onSelectedRowsChange={(rows) =>
                setSelectedLegIds(rows.map((r) => String(r.id)))
              }
              onRowClick={(row) => {
                if (activeTab === "pendientes") {
                  toggleLegSelection(String(row.id));
                }
              }}
              searchPlaceholder="BUSCAR TRP O RUTA..."
              customFilters={
                <>
                  <div className="w-[130px]">
                    <Input
                      placeholder="Eco Unidad..."
                      value={filterUnit}
                      onChange={(e) => setFilterUnit(e.target.value)}
                      className="h-11 bg-white dark:bg-slate-900 border-none shadow-sm text-xs font-bold"
                    />
                  </div>
                  {activeTab === "historico" && (
                    <div className="w-[180px]">
                      <Input
                        placeholder="Operador..."
                        value={filterOperatorName}
                        onChange={(e) => setFilterOperatorName(e.target.value)}
                        className="h-11 bg-white dark:bg-slate-900 border-none shadow-sm text-xs font-bold"
                      />
                    </div>
                  )}
                </>
              }
            />
          </Tabs>
        </div>

        {/* ========== PANEL DERECHO DE CÁLCULOS ========== */}
        {selectedLegIds.length > 0 &&
          liquidacion &&
          activeTab === "pendientes" && (
            <div className="xl:col-span-5 space-y-6 animate-in slide-in-from-right-4 duration-500">
              {liquidacion.hasRoadMove && isAuditPending && (
                <Alert
                  variant="destructive"
                  className="bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 shadow-md"
                >
                  <ShieldAlert className="h-5 w-5 !text-rose-600 dark:!text-rose-400" />
                  <AlertTitle className="font-black uppercase tracking-widest text-[11px] ml-2 text-rose-700 dark:text-rose-400">
                    Conciliacion Pendiente
                  </AlertTitle>
                  <AlertDescription className="text-xs font-bold mt-1 ml-2 leading-relaxed">
                    El sistema detecta {previewData?.legs_sin_ticket?.length}{" "}
                    tramo(s) de carretera que{" "}
                    <span className="underline">no han sido conciliados</span>{" "}
                    en Diésel.
                    <br />
                    <br />
                    No puedes liquidar hasta que Finanzas dictamine el
                    rendimiento.
                  </AlertDescription>
                </Alert>
              )}

              <Card
                className={cn(
                  "border-slate-200 dark:border-white/10 shadow-xl overflow-hidden border-t-4 bg-white dark:bg-slate-900",
                  liquidacion.hasRoadMove
                    ? "border-t-brand-navy dark:border-t-blue-500"
                    : "border-t-emerald-500 dark:border-t-emerald-400",
                )}
              >
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-white/10 pb-4">
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Configurar Recibo de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm bg-blue-50/50 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-100 dark:border-blue-500/20 mb-4">
                        <span className="text-blue-800 dark:text-blue-400 font-bold text-[11px] uppercase tracking-widest">
                          Sueldo Base (Ruta/Maniobras)
                        </span>
                        <div className="relative w-36">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400 dark:text-blue-300" />
                          <Input
                            type="number"
                            value={
                              sueldoBasePactado === 0 ? "" : sueldoBasePactado
                            }
                            onChange={(e) =>
                              setSueldoBasePactado(Number(e.target.value))
                            }
                            className="pl-8 font-bold text-right font-mono h-9 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-950 dark:border-white/10"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest border-b dark:border-white/10 pb-1">
                          <span>Ingresos / Abonos</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-emerald-600 dark:text-emerald-400 font-black text-[9px]"
                            onClick={() => {
                              setNewConceptoType("ingreso");
                              setShowAddConceptoDialog(true);
                            }}
                          >
                            + BONO EXTRA
                          </Button>
                        </div>

                        {conceptosExtra
                          .filter((c) => c.tipo === "ingreso")
                          .map((c) => (
                            <div
                              key={c.id}
                              className="flex justify-between items-center text-sm bg-emerald-50/50 dark:bg-emerald-500/10 px-2 py-1 rounded group transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-200/50 dark:hover:bg-emerald-500/20"
                                  onClick={() => removeConcepto(c.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                                </Button>
                                <span className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                  {c.descripcion}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                +{formatCurrencyLocal(c.monto)}
                              </span>
                            </div>
                          ))}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest border-b dark:border-white/10 pb-1">
                          <span>Cargos / Descuentos</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-rose-600 dark:text-rose-400 font-black text-[9px]"
                            onClick={() => {
                              setNewConceptoType("deduccion");
                              setShowAddConceptoDialog(true);
                            }}
                          >
                            + AGREGAR CARGO
                          </Button>
                        </div>
                        {(liquidacion.deduccionViaticos > 0 ||
                          liquidacion.otrosAnticipos > 0) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 dark:text-slate-400">
                              Anticipos Operativos
                            </span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                              -
                              {formatCurrencyLocal(
                                liquidacion.deduccionViaticos +
                                  liquidacion.otrosAnticipos,
                              )}
                            </span>
                          </div>
                        )}

                        {liquidacion.combustibleFaltante > 0 && (
                          <div className="flex justify-between items-center text-sm bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-2 py-1 rounded group transition-colors">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-200/50 dark:hover:bg-rose-500/30"
                                onClick={removeCombustibleFaltante}
                                title="Perdonar Cobro"
                              >
                                <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              </Button>
                              <span className="text-rose-800 dark:text-rose-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" />{" "}
                                Faltante Diésel
                              </span>
                            </div>
                            <span className="font-mono font-black text-rose-600 dark:text-rose-400">
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
                              className="flex justify-between items-center text-sm bg-rose-50/50 dark:bg-rose-500/10 px-2 py-1 rounded group transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-200/50 dark:hover:bg-rose-500/20"
                                  onClick={() => removeConcepto(c.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                </Button>
                                <span className="text-rose-700 dark:text-rose-400 text-xs font-medium">
                                  {c.descripcion}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                -{formatCurrencyLocal(c.monto)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 dark:bg-slate-950 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Neto a Depositar
                      </span>
                      <span className="text-3xl font-black font-mono text-white tracking-tighter">
                        {formatCurrencyLocal(liquidacion.neto_a_pagar)}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 shadow-lg gap-2 uppercase tracking-widest text-xs border-none"
                      disabled={
                        isAnimating || isLoadingPreview || isAuditPending
                      }
                      onClick={handleLiquidate}
                    >
                      {isAnimating || isLoadingPreview ? (
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

      <AlertDialog
        open={!!actionModal}
        onOpenChange={(open) => !open && setActionModal(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 border",
                  actionModal?.type === "reopen"
                    ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                )}
              >
                {actionModal?.type === "reopen" ? (
                  <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(217,119,6,0.4)]" />
                ) : (
                  <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-slate-600 dark:text-slate-400" />
                )}
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle
                  className={cn(
                    "text-2xl font-black uppercase tracking-tighter leading-none",
                    actionModal?.type === "reopen"
                      ? "text-amber-600 dark:text-amber-500"
                      : "text-slate-800 dark:text-white",
                  )}
                >
                  {actionModal?.type === "reopen"
                    ? "¿Anular y Reabrir Viaje?"
                    : "¿Ocultar del Histórico?"}
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción de Tesorería
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              {actionModal?.type === "reopen" ? (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Estás a punto de <strong>revertir esta liquidación</strong>.
                    Esto borrará la liquidación de la cuenta del operador y
                    cancelará la factura autogenerada.
                  </p>
                  <div className="p-5 sm:p-6 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                        Acción Irreversible
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200/80">
                      El viaje regresará a la pestaña de{" "}
                      <strong>Por Liquidar</strong> para ser editado.{" "}
                      <b className="font-black underline">
                        Esta acción no se puede deshacer
                      </b>
                      .
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Estás a punto de ocultar este recibo de tu vista local para
                    mantener tu pantalla limpia.
                  </p>
                  <div className="p-5 sm:p-6 bg-slate-100 dark:bg-slate-800/50 border-l-4 border-slate-500 rounded-r-2xl shadow-sm">
                    <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>
                        El viaje <strong>seguirá existiendo</strong> en el
                        sistema como liquidado.
                      </li>
                      <li>
                        La cuenta por cobrar en Tesorería{" "}
                        <strong>no se borrará</strong>.
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto flex-shrink-0 font-black uppercase tracking-widest text-[10px] dark:border-white/10 dark:bg-slate-900 dark:text-white"
                onClick={() => setActionModal(null)}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                size="lg"
                onClick={handleConfirmAction}
                className={cn(
                  "w-full sm:w-auto shadow-lg flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px]",
                  actionModal?.type === "reopen"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-slate-800 hover:bg-slate-900 dark:bg-brand-navy dark:hover:bg-blue-900",
                )}
              >
                {actionModal?.type === "reopen"
                  ? "Sí, Reabrir Viaje"
                  : "Sí, Ocultar"}
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showAddConceptoDialog}
        onOpenChange={setShowAddConceptoDialog}
      >
        <DialogContent className="w-[95vw] sm:max-w-xl p-0 flex flex-col max-h-[90vh] bg-white dark:bg-brand-navy border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <DialogTitle className="flex items-center gap-4 sm:gap-5 text-slate-800 dark:text-white text-xl font-black relative z-10 text-left">
              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                  newConceptoType === "ingreso"
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-rose-100 dark:bg-rose-900/30",
                )}
              >
                {newConceptoType === "ingreso" ? (
                  <ArrowUpCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xl font-black uppercase tracking-tighter leading-none">
                  Añadir{" "}
                  {newConceptoType === "ingreso"
                    ? "Bono (Ingreso)"
                    : "Cargo (Descuento)"}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 mt-1">
                  Afecta directamente al recibo final
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Concepto / Motivo
              </Label>
              <Input
                className="h-11 font-bold bg-white dark:bg-slate-900 dark:border-white/10 dark:text-white"
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Monto (MXN) *
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newConceptoAmount}
                  onChange={(e) => setNewConceptoAmount(e.target.value)}
                  className="h-12 pl-8 text-lg font-mono font-black bg-white dark:bg-slate-900 dark:border-white/10 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 sm:p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px] dark:border-white/10 dark:bg-slate-900 dark:text-white"
                onClick={() => setShowAddConceptoDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                size="lg"
                onClick={handleAddConcepto}
                className={cn(
                  "w-full sm:w-auto text-white font-black uppercase tracking-widest text-[10px] border-none",
                  newConceptoType === "ingreso"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700",
                )}
              >
                Aplicar a Recibo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OperatorSettlementDetailModal
        open={showReceiptModal}
        onOpenChange={(open) => {
          setShowReceiptModal(open);
          if (!open) {
            setSelectedOperatorId("");
            setSelectedLegIds([]);
            setConceptosExtra([]);
            setCombustibleFaltante(0);
            setSueldoBasePactado(0);
            setPreviewData(null);
            setAuditDetails(null);
          }
        }}
        selectedLegsData={selectedLegsData}
        liquidacion={liquidacion}
        conceptosExtra={conceptosExtra}
        previewData={previewData}
        activeTab={activeTab}
        empresaNombre={empresaNombre}
        empresaRFC={empresaRFC}
        empresaDireccion={empresaDireccion}
        empresaTelefono={empresaTelefono}
        empresaLogo={empresaLogo}
        auditDetails={auditDetails}
      />
    </div>
  );
}
