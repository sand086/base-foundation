import { useState, useMemo } from "react";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
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
  Flag,
  ChevronLeft,
  ChevronRight,
  Activity,
  SlidersHorizontal,
  Truck,
  User,
  DollarSign,
  Fuel,
  Ticket,
  CalendarClock,
  Navigation,
  Wallet,
  Coins,
} from "lucide-react";

// Componentes UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  return <StatusBadge status={config.type}>{config.label}</StatusBadge>;
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

// 🚀 EXTRAE TODA LA INFO FINANCIERA REAL DEL VIAJE Y SUS FASES
const getTripFinancials = (trip: any) => {
  let diesel = 0;
  let viaticos = 0;
  let casetasOp = 0;
  let pagoOperador = 0; // Suma del saldo_operador de cada tramo

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
  const { toast } = useToast();
  const { trips, loading, addTimelineEvent, fetchTrips, deleteTrip } =
    useTrips();

  // Estados de UI
  const [showFilters, setShowFilters] = useState(false);

  // Paginación
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

  // Listas Únicas para los Dropdowns
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

  // Paginación
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
      return (
        <ArrowUpDown className="h-3 w-3 text-slate-400 ml-1 inline-block" />
      );
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3 w-3 text-brand-navy ml-1 inline-block" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-navy ml-1 inline-block" />
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

  // Exportar a CSV incluyendo TODOS los datos financieros
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
      `Finanzas_Operativas_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Exportación exitosa",
      description: "Se descargó el reporte financiero y operativo.",
    });
  };

  const handleDeleteTrip = async (tripId: string | number) => {
    if (
      window.confirm(
        "¿Confirmas la eliminación total de este viaje y su historial financiero? Esta acción es irreversible.",
      )
    ) {
      await deleteTrip(tripId);
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
      toast({
        title: "Error",
        description: "No se pudo generar la Carta Porte.",
        variant: "destructive",
      });
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
      return toast({
        title: "Error",
        description: "Tramo activo no encontrado.",
        variant: "destructive",
      });

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
    // 🚀 CONTENEDOR MAESTRO: Flex-col y Altura Completa
    <div className="flex flex-col h-[calc(100vh-5rem)] p-4 sm:p-6 space-y-4 bg-slate-50 border-t">
      {/* 1. HEADER (TÍTULO Y BOTONERA) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-brand-navy flex items-center gap-2">
            <Activity className="h-6 w-6 text-brand-navy" /> Historial de Viajes
            y Finanzas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Torre de control para despachos, rutas y liquidaciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="h-10  font-bold shadow-sm bg-white"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2 text-slate-500" />{" "}
            Filtros
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-10  bg-slate-800 hover:bg-slate-900 shadow-md font-bold"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-2" /> Exportar Data
          </Button>
        </div>
      </div>

      {/* 2. PANEL DE KPIS SUPERIORES (MÁS GRANDES Y VISIBLES) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className=" font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="h-6 w-6" /> Viajes Totales
            </span>
            <span className="text-3xl font-black text-slate-800">
              {kpis.total}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border border-emerald-200 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className=" font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Navigation className="h-6 w-6" /> En Ruta / Tránsito
            </span>
            <span className="text-3xl font-black text-emerald-700">
              {kpis.enRuta}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border border-red-200 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className=" font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-6 w-6" /> Alertas / Detenidos
            </span>
            <span className="text-3xl font-black text-red-700">
              {kpis.alertas}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-brand-navy border border-brand-navy shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className=" font-bold text-indigo-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <DollarSign className="h-6 w-6" /> Ingreso Flete Base
            </span>
            <span className="text-3xl font-black text-white">
              {formatMoney(kpis.ingresoTotal)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. FILTROS AVANZADOS CON ETIQUETAS (LABELS) */}
      {showFilters && (
        <Card className="shrink-0 border-slate-200 shadow-sm animate-in slide-in-from-top-2">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                Folio / ID
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8 h-9 "
                  value={filterFolio}
                  onChange={(e) => {
                    setFilterFolio(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                Cliente
              </Label>
              <Select
                value={filterCliente}
                onValueChange={(v) => {
                  setFilterCliente(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 ">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                Operador
              </Label>
              <Select
                value={filterOperador}
                onValueChange={(v) => {
                  setFilterOperador(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 ">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {uniqueOperators.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                Configuración
              </Label>
              <Select
                value={filterConfig}
                onValueChange={(v) => {
                  setFilterConfig(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 ">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="SENCILLO">Sencillo</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                Estatus
              </Label>
              <Select
                value={filterEstatus}
                onValueChange={(v) => {
                  setFilterEstatus(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 ">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {uniqueStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2 flex items-center gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                  Desde
                </Label>
                <Input
                  type="date"
                  className="h-9  w-full"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                  Hasta
                </Label>
                <Input
                  type="date"
                  className="h-9  w-full"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="lg:col-span-7 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8  text-slate-500"
                onClick={clearFilters}
              >
                <FilterX className="h-6 w-6 mr-1" /> Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. DATATABLE PRINCIPAL (ALTURA COMPLETA) */}
      <Card className="flex-1 flex flex-col min-h-0 border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {/* 🚀 EL TRUCO PARA QUE LLEGUE HASTA ABAJO */}
        <div className="flex-1 overflow-auto relative bg-white [&>div]:!max-h-none [&>div]:!h-full">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
            </div>
          )}

          <DataTable className="min-w-full text-sm">
            <DataTableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
              <DataTableRow className="hover:bg-transparent">
                <DataTableHead
                  className="py-3 pl-6 text-[12px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("folio")}
                >
                  Folio / Config {renderSortIcon("folio")}
                </DataTableHead>

                <DataTableHead
                  className="py-3 text-[12px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("cliente")}
                >
                  Cliente / Ruta {renderSortIcon("cliente")}
                </DataTableHead>

                <DataTableHead
                  className="py-3 text-[12px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("fecha")}
                >
                  Fecha {renderSortIcon("fecha")}
                </DataTableHead>

                {/* NUEVAS COLUMNAS FINANCIERAS */}
                <DataTableHead
                  className="py-3 text-[12px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("flete")}
                >
                  Flete Base {renderSortIcon("flete")}
                </DataTableHead>
                <DataTableHead className="py-3 text-[12px] font-bold uppercase text-slate-500 whitespace-nowrap">
                  Diésel
                </DataTableHead>
                <DataTableHead className="py-3 text-[12px] font-bold uppercase text-slate-500 whitespace-nowrap">
                  Vales / Casetas
                </DataTableHead>
                <DataTableHead className="py-3 text-[12px] font-bold uppercase text-slate-500 whitespace-nowrap">
                  Pago Operadores
                </DataTableHead>

                <DataTableHead
                  className="py-3 text-center text-[12px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("estatus")}
                >
                  Estatus {renderSortIcon("estatus")}
                </DataTableHead>

                <DataTableHead className="py-3 pr-6 text-right text-[12px] font-bold uppercase text-slate-500 whitespace-nowrap">
                  Acciones
                </DataTableHead>
              </DataTableRow>
            </DataTableHeader>

            <DataTableBody>
              {paginatedTrips.length === 0 && !loading && (
                <DataTableRow>
                  <DataTableCell
                    colSpan={9}
                    className="h-[400px] text-center text-slate-400"
                  >
                    <Search className="h-10 w-10 opacity-20 mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      No se encontraron viajes con la búsqueda actual.
                    </p>
                  </DataTableCell>
                </DataTableRow>
              )}

              {paginatedTrips.map((trip: any) => {
                const finanzas = getTripFinancials(trip);
                const fechaObj = new Date(trip.start_date || trip.created_at);

                return (
                  <DataTableRow
                    key={trip.id}
                    className="group hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100"
                    onClick={() => setSelectedFullTrip(trip)}
                  >
                    {/* COLUMNA 1: FOLIO & CONFIG */}
                    <DataTableCell className="pl-6 py-2">
                      <p className="font-mono text-sm font-bold text-brand-navy">
                        {trip.public_id || trip.id}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Truck className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                          {getTripConfig(trip)}
                        </span>
                      </div>
                    </DataTableCell>

                    {/* COLUMNA 2: CLIENTE Y RUTA */}
                    <DataTableCell className="py-2">
                      <p
                        className=" font-bold text-slate-800 max-w-[200px] truncate"
                        title={getClientName(trip)}
                      >
                        {getClientName(trip)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[12px] font-medium text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {trip.origin} → {trip.destination}
                        </span>
                      </div>
                    </DataTableCell>

                    {/* COLUMNA 3: FECHA Y HORA */}
                    <DataTableCell className="py-2">
                      <div className="flex items-center gap-1.5  font-semibold text-slate-700">
                        {fechaObj.toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <p className="text-[12px] font-medium text-slate-500 ml-5 mt-0.5">
                        {fechaObj.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                      </p>
                    </DataTableCell>

                    {/* COLUMNA 4: FLETE BASE */}
                    <DataTableCell className="py-2">
                      <p className="text-sm font-black text-brand-navy font-mono">
                        {formatMoney(finanzas.ingresoFlete)}
                      </p>
                    </DataTableCell>

                    {/* COLUMNA 5: DIESEL */}
                    <DataTableCell className="py-2">
                      <div className="flex items-center gap-1.5  font-semibold text-slate-600">
                        <Fuel className="h-6 w-6 text-slate-400" />
                        <span className="font-mono">
                          {formatMoney(finanzas.diesel)}
                        </span>
                      </div>
                    </DataTableCell>

                    {/* COLUMNA 6: VALES/CASETAS */}
                    <DataTableCell className="py-2">
                      <div
                        className="flex items-center gap-1.5  font-semibold text-slate-600"
                        title="Suma de Viáticos y Casetas de Operador"
                      >
                        <Ticket className="h-6 w-6 text-slate-400" />
                        <span className="font-mono">
                          {formatMoney(finanzas.casetasOp + finanzas.viaticos)}
                        </span>
                      </div>
                    </DataTableCell>

                    {/* COLUMNA 7: PAGO OPERADOR */}
                    <DataTableCell className="py-2">
                      <div className="flex items-center gap-1.5  font-semibold text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded border border-emerald-100">
                        <Coins className="h-6 w-6 text-emerald-600" />
                        <span className="font-mono">
                          {formatMoney(finanzas.pagoOperador)}
                        </span>
                      </div>
                    </DataTableCell>

                    {/* COLUMNA 8: ESTATUS */}
                    <DataTableCell className="py-2 text-center">
                      {getStatusBadge(trip.status)}
                    </DataTableCell>

                    {/* COLUMNA 9: ACCIONES */}
                    <DataTableCell className="pr-6 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52 shadow-xl border-slate-200"
                        >
                          <DropdownMenuLabel className="text-[12px] uppercase font-bold text-slate-400 tracking-wider">
                            Gestión del Viaje
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFullTrip(trip);
                            }}
                            className="cursor-pointer  font-medium text-slate-700"
                          >
                            <FolderOpen className="mr-2 h-4 w-4 text-slate-400" />{" "}
                            <span>Visualizar / Editar Info</span>
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
                              className="cursor-pointer  font-medium text-slate-700"
                            >
                              <Edit2 className="mr-2 h-4 w-4 text-slate-400" />{" "}
                              <span>Reportar Novedad GPS</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPDF(trip);
                            }}
                            className="cursor-pointer  font-medium text-slate-700"
                          >
                            <Printer className="mr-2 h-4 w-4 text-slate-400" />{" "}
                            <span>Imprimir C. Porte / Recibo</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: "Email enviado",
                                description: "Notificación enviada al cliente.",
                              });
                            }}
                            className="cursor-pointer  font-medium text-slate-700"
                          >
                            <Mail className="mr-2 h-4 w-4 text-slate-400" />{" "}
                            <span>Enviar Información por Correo</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrip(trip.id);
                            }}
                            className="cursor-pointer text-red-600 font-bold focus:bg-red-50 focus:text-red-700 "
                          >
                            <Trash2 className="mr-2 h-4 w-4" />{" "}
                            <span>Eliminar Viaje</span>
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

        {/* 5. FOOTER PAGINACIÓN */}
        <div className="bg-white border-t border-slate-200 p-3 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className=" text-slate-500 font-medium hidden sm:inline">
              Filas por página:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-16  bg-slate-50 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className=" text-slate-500 font-medium">
              Página{" "}
              <span className="font-bold text-slate-800">{currentPage}</span> de{" "}
              <span className="font-bold text-slate-800">
                {totalPages || 1}
              </span>
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-slate-50 shadow-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-slate-50 shadow-sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

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
