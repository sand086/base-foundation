import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner"; // 🚀 Importación correcta de toast
import {
  Search,
  Loader2,
  AlertTriangle,
  FilterX,
  FileText,
  MapPin,
  FolderOpen,
  Download,
  MoreHorizontal,
  Trash2,
  Printer,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Activity,
  SlidersHorizontal,
  Truck,
  DollarSign,
  Fuel,
  Ticket,
  Navigation,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 🚀 IMPORTACIONES EXACTAS DE TU DATATABLE
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";

// Hooks y Modales
import { useTrips } from "@/hooks/useTrips";
import axiosClient from "@/api/axiosClient";
import { TripDetailsModal } from "@/features/despacho/TripDetailsModal";
import {
  UpdateStatusModal,
  StatusUpdateData,
} from "@/features/monitoreo/UpdateStatusModal";

// ==========================================
// HELPERS (Formateo y Extracción de Datos)
// ==========================================

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "desconocido";
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    creado: { type: "info", label: "Stand-By" },
    borrador: { type: "info", label: "Borrador" },
    en_transito: { type: "success", label: "En Tránsito" },
    en_ruta: { type: "success", label: "En Ruta" },
    detenido: { type: "warning", label: "Detenido" },
    retraso: { type: "danger", label: "Retraso" },
    accidente: { type: "danger", label: "Accidente" },
    entregado: { type: "success", label: "Entregado" },
    cerrado: { type: "info", label: "Cerrado" },
    liquidado: { type: "success", label: "Liquidado" },
  };
  const config = statusMap[s] || {
    type: "info" as StatusType,
    label: s.toUpperCase(),
  };
  return (
    <StatusBadge
      status={config.type}
      className="text-[9px] font-black tracking-widest uppercase px-2 shadow-sm rounded-lg"
    >
      {config.label}
    </StatusBadge>
  );
};

const getClientName = (trip: any) =>
  trip.client?.razon_social ||
  trip.client?.nombre ||
  trip.client_id ||
  "Sin Cliente";

const getUnitEco = (trip: any) => {
  if (!trip.legs || trip.legs.length === 0) return "S/U";
  const activeLeg =
    trip.legs.find(
      (l: any) =>
        !["entregado", "cerrado", "liquidado"].includes(
          l.status?.toLowerCase(),
        ),
    ) || trip.legs[trip.legs.length - 1];
  return activeLeg?.unit?.numero_economico || "Sin Unidad";
};

const getOperatorName = (trip: any) => {
  if (!trip.legs || trip.legs.length === 0) return "S/O";
  const activeLeg =
    trip.legs.find(
      (l: any) =>
        !["entregado", "cerrado", "liquidado"].includes(
          l.status?.toLowerCase(),
        ),
    ) || trip.legs[trip.legs.length - 1];
  return activeLeg?.operator?.name || activeLeg?.operator?.nombre
    ? `${activeLeg.operator.name || activeLeg.operator.nombre}`
    : "Sin Operador";
};

const getTripFinancials = (trip: any) => {
  let diesel = 0;
  let viaticos = 0;
  let casetasOp = 0;
  let pagoOperador = 0;

  if (trip.legs && Array.isArray(trip.legs)) {
    trip.legs.forEach((leg: any) => {
      diesel += leg.anticipo_combustible || 0;
      viaticos += leg.anticipo_viaticos || 0;
      casetasOp += leg.anticipo_casetas || 0;
      pagoOperador += leg.saldo_operador || 0;
    });
  }

  return {
    ingresoFlete: trip.tarifa_base || 0,
    cobroCasetasCliente: trip.costo_casetas || 0,
    diesel,
    viaticos,
    casetasOp,
    pagoOperador,
  };
};

const getTripConfig = (trip: any) => {
  if (
    trip.remolque_2_id ||
    trip.dolly_id ||
    trip.tipo?.toUpperCase() === "FULL"
  )
    return "FULL";
  return "SENCILLO";
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

type SortConfig = { key: string; direction: "asc" | "desc" } | null;

export default function CentroMonitoreo() {
  const { trips, loading, addTimelineEvent, fetchTrips, deleteTrip } =
    useTrips();

  // Estados de UI
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Estados de Filtros
  const [filterFolio, setFilterFolio] = useState("");
  const [filterCliente, setFilterCliente] = useState("ALL");
  const [filterOperador, setFilterOperador] = useState("ALL");
  const [filterConfig, setFilterConfig] = useState("ALL");
  const [filterEstatus, setFilterEstatus] = useState("ALL");
  const [filterRuta, setFilterRuta] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedFullTrip, setSelectedFullTrip] = useState<any | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [tripToUpdate, setTripToUpdate] = useState<any | null>(null);

  // Listas Únicas
  const uniqueClients = useMemo(
    () =>
      Array.from(new Set(trips.map(getClientName)))
        .filter(Boolean)
        .sort(),
    [trips],
  );
  const uniqueOperators = useMemo(
    () =>
      Array.from(new Set(trips.map(getOperatorName)))
        .filter((o) => o !== "Sin Operador")
        .sort(),
    [trips],
  );
  const uniqueStatuses = useMemo(
    () =>
      Array.from(new Set(trips.map((t) => t.status)))
        .filter(Boolean)
        .sort(),
    [trips],
  );
  const uniqueRoutes = useMemo(
    () =>
      Array.from(new Set(trips.map((t) => `${t.origin} - ${t.destination}`)))
        .filter(Boolean)
        .sort(),
    [trips],
  );

  // Motor de Filtrado
  const filteredTrips = useMemo(() => {
    return trips.filter((trip: any) => {
      const folioId = String(trip.public_id || trip.id).toLowerCase();
      const matchFolio = filterFolio
        ? folioId.includes(filterFolio.toLowerCase())
        : true;
      const matchCliente =
        filterCliente !== "ALL" ? getClientName(trip) === filterCliente : true;
      const matchOperador =
        filterOperador !== "ALL"
          ? getOperatorName(trip) === filterOperador
          : true;
      const matchEstatus =
        filterEstatus !== "ALL" ? trip.status === filterEstatus : true;
      const routeStr = `${trip.origin} - ${trip.destination}`;
      const matchRuta = filterRuta !== "ALL" ? routeStr === filterRuta : true;
      const config = getTripConfig(trip);
      const matchConfig =
        filterConfig !== "ALL" ? config === filterConfig : true;

      let matchDate = true;
      const tripDate = new Date(trip.start_date || trip.created_at);
      if (dateFrom) matchDate = matchDate && tripDate >= new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        matchDate = matchDate && tripDate < endDate;
      }
      return (
        matchFolio &&
        matchCliente &&
        matchOperador &&
        matchConfig &&
        matchEstatus &&
        matchRuta &&
        matchDate
      );
    });
  }, [
    trips,
    filterFolio,
    filterCliente,
    filterOperador,
    filterConfig,
    filterEstatus,
    filterRuta,
    dateFrom,
    dateTo,
  ]);

  // Motor de Ordenamiento
  const sortedTrips = useMemo(() => {
    const sortableTrips = [...filteredTrips];
    if (sortConfig !== null) {
      sortableTrips.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sortConfig.key) {
          case "folio":
            aValue = String(a.public_id || a.id);
            bValue = String(b.public_id || b.id);
            break;
          case "cliente":
            aValue = getClientName(a);
            bValue = getClientName(b);
            break;
          case "fecha":
            aValue = new Date(a.start_date).getTime();
            bValue = new Date(b.start_date).getTime();
            break;
          case "flete":
            aValue = a.tarifa_base || 0;
            bValue = b.tarifa_base || 0;
            break;
          case "estatus":
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = "";
            bValue = "";
        }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableTrips;
  }, [filteredTrips, sortConfig]);

  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTrips.slice(start, start + pageSize);
  }, [sortedTrips, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTrips.length / pageSize);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key)
      return <ArrowUpDown className="h-3 w-3 opacity-30 ml-2 inline-block" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3 w-3 text-brand-red ml-2 inline-block" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-red ml-2 inline-block" />
    );
  };

  const clearFilters = () => {
    setFilterFolio("");
    setFilterCliente("ALL");
    setFilterOperador("ALL");
    setFilterConfig("ALL");
    setFilterEstatus("ALL");
    setFilterRuta("ALL");
    setDateFrom("");
    setDateTo("");
    setSortConfig(null);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = [
      "Folio",
      "Cliente",
      "Ruta",
      "Configuracion",
      "Unidad_Actual",
      "Operador_Actual",
      "Estatus",
      "Fecha_Registro",
      "Ingreso_Flete_Base",
      "Ingreso_Casetas",
      "Gasto_Diesel",
      "Gasto_Viaticos",
      "Gasto_Casetas",
      "Pago_Operador",
    ];
    const rows = sortedTrips.map((t: any) => {
      const finanzas = getTripFinancials(t);
      return [
        t.public_id || t.id,
        getClientName(t),
        `${t.origin} - ${t.destination}`,
        getTripConfig(t),
        getUnitEco(t),
        getOperatorName(t),
        t.status.toUpperCase(),
        new Date(t.start_date || t.created_at).toLocaleDateString(),
        finanzas.ingresoFlete,
        finanzas.cobroCasetasCliente,
        finanzas.diesel,
        finanzas.viaticos,
        finanzas.casetasOp,
        finanzas.pagoOperador,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((item) => `"${item}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `historial_servicios_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportación exitosa", {
      description: "Se descargó el reporte industrial.",
    }); // 🚀 Sintaxis Sonner correcta
  };

  const handleDeleteTrip = async (tripId: string | number) => {
    if (
      window.confirm(
        "¿Confirmas la purga total de este viaje y su historial financiero? Esta acción es irreversible.",
      )
    ) {
      await deleteTrip(tripId);
      toast.success("Viaje Purgado", {
        description: "Registro eliminado de la base de datos.",
      });
    }
  };

  const handlePrintPDF = async (trip: any) => {
    try {
      const response = await axiosClient.get(
        `/trips/${trip.id}/carta-porte-ciega`,
        { responseType: "blob" },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      window.open(fileURL, "_blank");
    } catch (error) {
      toast.error("Fallo Operativo", {
        description: "No se pudo compilar la Carta Porte.",
      }); // 🚀 Sintaxis Sonner correcta
    }
  };

  const handleStatusUpdate = async (data: StatusUpdateData) => {
    if (!tripToUpdate) return;
    const activeLeg =
      tripToUpdate.legs?.find(
        (l: any) => !["entregado", "cerrado"].includes(l.status?.toLowerCase()),
      ) || tripToUpdate.legs?.[0];
    const legId = activeLeg?.id;

    if (!legId)
      return toast.error("Excepción", {
        description: "Tramo activo inalcanzable.",
      }); // 🚀 Sintaxis Sonner correcta

    const success = await addTimelineEvent(tripToUpdate.id, legId, {
      status: data.status,
      location: data.location,
      comments: data.comments,
      notifyClient: data.notifyClient,
    });

    if (success) {
      setUpdateModalOpen(false);
      setTripToUpdate(null);
      if (selectedFullTrip?.id === tripToUpdate.id) {
        await fetchTrips();
        setSelectedFullTrip(null);
      }
    }
  };

  // KPIs Dinámicos
  const kpis = useMemo(() => {
    let enRuta = 0,
      alertas = 0,
      completados = 0,
      ingresoTotal = 0;
    filteredTrips.forEach((t) => {
      const s = t.status?.toLowerCase();
      if (["en_transito", "en_ruta"].includes(s)) enRuta++;
      else if (["retraso", "accidente", "detenido"].includes(s)) alertas++;
      else if (["entregado", "cerrado", "liquidado"].includes(s)) completados++;
      ingresoTotal += t.tarifa_base || 0;
    });
    return {
      total: filteredTrips.length,
      enRuta,
      alertas,
      completados,
      ingresoTotal,
    };
  }, [filteredTrips]);

  return (
    // 🚀 CAPA 1: CASCARÓN TAHOE (Altura Completa, Fondo Glassmorphism)
    <div className="flex flex-col h-[calc(100vh-5rem)] p-4 sm:p-6 md:p-8 space-y-6 bg-white/80 dark:bg-brand-navy/95 backdrop-blur-2xl animate-in fade-in duration-700">
      {/* CAPA 2: HEADER TAHOE (TÍTULO Y BOTONERA) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl shadow-inner">
              <Activity className="h-6 w-6 text-brand-navy dark:text-white" />
            </div>
            Historial de Operaciones
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
            Torre de control para despachos, rutas y liquidaciones
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="h-11 px-5 font-black uppercase text-[10px] tracking-widest shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white haptic-press rounded-xl"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-brand-red" />{" "}
            Filtros
          </Button>
          <Button
            size="sm"
            className="h-11 px-6 bg-brand-navy hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-navy/20 haptic-press rounded-xl"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5 mr-2" /> Exportar Data
          </Button>
        </div>
      </div>

      {/* CAPA 3: PANEL DE KPIS (VERDADEROS INDICADORES TAHOE) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 shrink-0">
        {[
          {
            label: "Viajes Totales",
            val: kpis.total,
            icon: FileText,
            color: "text-slate-600 dark:text-slate-300",
            bg: "bg-slate-500/10",
            metric: "Volumen Global",
          },
          {
            label: "En Ruta / Tránsito",
            val: kpis.enRuta,
            icon: Navigation,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            metric: "Activos",
          },
          {
            label: "Alertas / Detenidos",
            val: kpis.alertas,
            icon: AlertTriangle,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            metric: "Atención",
          },
          {
            label: "Ingreso Flete Base",
            val: formatMoney(kpis.ingresoTotal),
            icon: DollarSign,
            color: "text-blue-400",
            bg: "bg-white/10",
            dark: true,
            metric: "Capital Total",
          },
        ].map((kpi, i) => (
          <Card
            key={i}
            className={cn(
              "border-none shadow-xl backdrop-blur-xl rounded-[2rem] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
              kpi.dark
                ? "bg-brand-navy text-white"
                : "bg-white/90 dark:bg-slate-900/95",
            )}
          >
            <div
              className={cn(
                "absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none",
                kpi.bg.replace("/10", ""),
              )}
            />
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-[9px] font-black uppercase tracking-[0.25em] opacity-70",
                      kpi.dark ? "text-slate-300" : "text-slate-500",
                    )}
                  >
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-mono font-black tracking-tighter mt-1">
                    {kpi.val}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                    kpi.bg,
                  )}
                >
                  <kpi.icon className={kpi.color} size={24} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between w-full">
                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mr-3">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      kpi.color.replace("text", "bg"),
                    )}
                    style={{ width: "75%" }}
                  />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">
                  {kpi.metric}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTROS AVANZADOS (SUNKEN AREA) */}
      {showFilters && (
        <div className="shrink-0 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-inner animate-in slide-in-from-top-2 fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5 items-end">
            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                Folio / ID
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="BUSCAR..."
                  className="pl-9 h-11 rounded-xl text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-none shadow-sm"
                  value={filterFolio}
                  onChange={(e) => {
                    setFilterFolio(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                Cliente
              </Label>
              <Select
                value={filterCliente}
                onValueChange={(v) => {
                  setFilterCliente(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-none shadow-sm">
                  <SelectValue placeholder="TODOS" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-white dark:bg-brand-navy border-none shadow-2xl">
                  <SelectItem
                    value="ALL"
                    className="text-[10px] font-black uppercase"
                  >
                    Todos
                  </SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-[10px] font-bold uppercase"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                Operador
              </Label>
              <Select
                value={filterOperador}
                onValueChange={(v) => {
                  setFilterOperador(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-none shadow-sm">
                  <SelectValue placeholder="TODOS" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-white dark:bg-brand-navy border-none shadow-2xl">
                  <SelectItem
                    value="ALL"
                    className="text-[10px] font-black uppercase"
                  >
                    Todos
                  </SelectItem>
                  {uniqueOperators.map((o) => (
                    <SelectItem
                      key={o}
                      value={o}
                      className="text-[10px] font-bold uppercase"
                    >
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                Config
              </Label>
              <Select
                value={filterConfig}
                onValueChange={(v) => {
                  setFilterConfig(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-none shadow-sm">
                  <SelectValue placeholder="TODAS" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-white dark:bg-brand-navy border-none shadow-2xl">
                  <SelectItem
                    value="ALL"
                    className="text-[10px] font-black uppercase"
                  >
                    Todas
                  </SelectItem>
                  <SelectItem
                    value="SENCILLO"
                    className="text-[10px] font-bold uppercase"
                  >
                    Sencillo
                  </SelectItem>
                  <SelectItem
                    value="FULL"
                    className="text-[10px] font-bold uppercase"
                  >
                    Full
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                Estatus
              </Label>
              <Select
                value={filterEstatus}
                onValueChange={(v) => {
                  setFilterEstatus(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-none shadow-sm">
                  <SelectValue placeholder="TODOS" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-white dark:bg-brand-navy border-none shadow-2xl">
                  <SelectItem
                    value="ALL"
                    className="text-[10px] font-black uppercase"
                  >
                    Todos
                  </SelectItem>
                  {uniqueStatuses.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-[10px] font-bold uppercase"
                    >
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2 flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  Desde
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border-none shadow-sm text-[10px] font-bold"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  Hasta
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border-none shadow-sm text-[10px] font-bold"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="lg:col-span-7 flex justify-end mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 haptic-press"
                onClick={clearFilters}
              >
                <FilterX className="h-4 w-4 mr-2" /> Limpiar Filtros
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DATATABLE PRINCIPAL (LIQUID GLASS + HEADER GRIS) */}
      <div className="flex-1 flex flex-col min-h-0 border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-3xl rounded-[2.5rem] overflow-hidden transition-all ring-1 ring-slate-200/50 dark:ring-white/5">
        <div className="flex-1 overflow-auto relative custom-scrollbar bg-transparent [&>div]:!max-h-none [&>div]:!h-full">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-brand-navy/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                Sincronizando Ledger...
              </span>
            </div>
          )}

          <DataTable className="min-w-full text-sm border-collapse">
            {/* REGLA DE ORO: HEADER GRIS EN LIGHT */}
            <DataTableHeader className="bg-slate-100/90 dark:bg-slate-900/95 sticky top-0 z-20 border-b border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm">
              <DataTableRow className="hover:bg-transparent border-none">
                <DataTableHead
                  className="py-4 pl-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap group/head"
                  onClick={() => handleSort("folio")}
                >
                  Folio / Config {renderSortIcon("folio")}
                </DataTableHead>
                <DataTableHead
                  className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap group/head"
                  onClick={() => handleSort("cliente")}
                >
                  Cliente / Ruta {renderSortIcon("cliente")}
                </DataTableHead>
                <DataTableHead
                  className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap group/head"
                  onClick={() => handleSort("fecha")}
                >
                  Fecha {renderSortIcon("fecha")}
                </DataTableHead>
                <DataTableHead
                  className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap group/head"
                  onClick={() => handleSort("flete")}
                >
                  Flete Base {renderSortIcon("flete")}
                </DataTableHead>
                <DataTableHead className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Diésel
                </DataTableHead>
                <DataTableHead className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Vales / Casetas
                </DataTableHead>
                <DataTableHead className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Pago Operadores
                </DataTableHead>
                <DataTableHead
                  className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap group/head"
                  onClick={() => handleSort("estatus")}
                >
                  Estatus {renderSortIcon("estatus")}
                </DataTableHead>
                <DataTableHead className="py-4 pr-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Acciones
                </DataTableHead>
              </DataTableRow>
            </DataTableHeader>

            <DataTableBody className="divide-y divide-slate-200/40 dark:divide-white/5 bg-transparent">
              {paginatedTrips.length === 0 && !loading && (
                <DataTableRow>
                  <DataTableCell colSpan={9} className="h-[400px] text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Search className="h-12 w-12 mx-auto text-slate-500" />
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Cero Coincidencias en el Ledger
                      </p>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              )}

              {paginatedTrips.map((trip: any) => {
                const finanzas = getTripFinancials(trip);
                const fechaObj = new Date(trip.start_date || trip.created_at);

                return (
                  <DataTableRow
                    key={trip.id}
                    className="group interactive-row hover:bg-slate-500/[0.04] dark:hover:bg-white/[0.02] cursor-pointer transition-all duration-300"
                    onClick={() => setSelectedFullTrip(trip)}
                  >
                    <DataTableCell className="pl-6 py-4 align-middle">
                      <p className="font-mono text-sm font-black text-brand-navy dark:text-white">
                        {trip.public_id || trip.id}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Truck className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          {getTripConfig(trip)}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="py-4 align-middle">
                      <p
                        className="font-bold text-[11px] uppercase text-slate-800 dark:text-slate-200 max-w-[200px] truncate"
                        title={getClientName(trip)}
                      >
                        {getClientName(trip)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-black tracking-widest uppercase text-slate-400">
                        <MapPin className="h-3 w-3 text-brand-red shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {trip.origin} → {trip.destination}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="py-4 align-middle">
                      <div className="flex flex-col font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        <span>
                          {fechaObj.toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {fechaObj.toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="py-4 align-middle">
                      <p className="text-sm font-black text-brand-navy dark:text-white font-mono tracking-tighter">
                        {formatMoney(finanzas.ingresoFlete)}
                      </p>
                    </DataTableCell>

                    <DataTableCell className="py-4 align-middle">
                      <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                        <Fuel className="h-4 w-4 text-amber-500" />
                        <span className="font-mono text-[13px] font-black tracking-tighter">
                          {formatMoney(finanzas.diesel)}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="py-4 align-middle">
                      <div
                        className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300"
                        title="Viáticos + Casetas Operador"
                      >
                        <Ticket className="h-4 w-4 text-blue-500" />
                        <span className="font-mono text-[13px] font-black tracking-tighter">
                          {formatMoney(finanzas.casetasOp + finanzas.viaticos)}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="py-4 align-middle">
                      <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                        <Coins className="h-4 w-4" />
                        <span className="font-mono text-[12px] font-black tracking-tighter">
                          {formatMoney(finanzas.pagoOperador)}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="py-4 text-center align-middle">
                      {getStatusBadge(trip.status)}
                    </DataTableCell>

                    <DataTableCell className="pr-6 py-4 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 haptic-press rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 shadow-2xl border-slate-200 dark:border-white/10 bg-white/95 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl p-2"
                        >
                          <DropdownMenuLabel className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] px-3 pb-2">
                            Gestión del Viaje
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFullTrip(trip);
                            }}
                            className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors mt-1"
                          >
                            <FolderOpen className="mr-2 h-3.5 w-3.5 text-blue-500" />{" "}
                            Visualizar Info
                          </DropdownMenuItem>
                          {!["cerrado", "entregado", "liquidado"].includes(
                            trip.status?.toLowerCase(),
                          ) && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setTripToUpdate(trip);
                                setUpdateModalOpen(true);
                              }}
                              className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                              <Edit2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />{" "}
                              Reportar Novedad GPS
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPDF(trip);
                            }}
                            className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <Printer className="mr-2 h-3.5 w-3.5 text-slate-500" />{" "}
                            Imprimir C. Porte
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success("Email enviado", {
                                description: "Notificación enviada al cliente.",
                              });
                            }}
                            className="cursor-pointer font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <Mail className="mr-2 h-3.5 w-3.5 text-slate-500" />{" "}
                            Enviar por Correo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrip(trip.id);
                            }}
                            className="cursor-pointer text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10 font-bold uppercase text-[10px] py-2.5 px-3 rounded-xl mt-1"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                            Viaje
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </div>

        {/* 5. FOOTER CRYSTAL (PAGINACIÓN) - FIJADO AL FONDO */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 border-t border-slate-200/50 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md shrink-0 sticky bottom-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Filas por vista
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-[80px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-mono font-bold text-xs text-slate-700 dark:text-white shadow-sm rounded-xl haptic-press">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white dark:bg-brand-navy border-slate-200 dark:border-white/10 shadow-2xl">
                <SelectItem value="15" className="font-mono text-xs">
                  15
                </SelectItem>
                <SelectItem value="30" className="font-mono text-xs">
                  30
                </SelectItem>
                <SelectItem value="50" className="font-mono text-xs">
                  50
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-white/70">
              Página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-navy hover:bg-slate-50 shadow-sm haptic-press"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-navy hover:bg-slate-50 shadow-sm haptic-press"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALES EXTERNOS */}
      <TripDetailsModal
        open={!!selectedFullTrip}
        onOpenChange={(open) => {
          if (!open) setSelectedFullTrip(null);
        }}
        trip={selectedFullTrip}
        onUpdateStatusClick={(trip, leg) => {
          setTripToUpdate(trip);
          setUpdateModalOpen(true);
        }}
      />
      {tripToUpdate && (
        <UpdateStatusModal
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          serviceId={tripToUpdate.public_id || tripToUpdate.id}
          onSubmit={handleStatusUpdate}
        />
      )}
    </div>
  );
}
