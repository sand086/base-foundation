import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  format,
  isToday,
  isPast,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  Clock,
  LayoutGrid,
  List,
  Trash2,
  Truck,
  User,
  Banknote,
  Loader2,
  MoreVertical,
  Eye,
  CalendarDays,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldAlert,
  Route as RouteIcon,
  Container,
  RefreshCw,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

// 🚀 IMPORTAMOS EL NUEVO COMPONENTE ENHANCED DATATABLE
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useTrips } from "@/features/trips/hooks/useTrips";
import { useUnits } from "@/features/units/hooks/useUnits";
import { Trip, TripLeg, TripStatus, StatusUpdateData } from "../types";

import { UpdateStatusModal } from "@/features/trips/components/UpdateStatusModal";
import { NextLegModal } from "@/features/trips/components/NextLegModal";
import { TripDetailsModal } from "@/features/trips/components/TripDetailsModal";
import TripSettlementModal from "@/features/settlements/components/TripSettlementModal";

import { toast } from "sonner";
import { cn, checkIsFullTrip } from "@/lib/utils";

const normalizeStatus = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .split(" ")
    .join("_");

const getOperationalStatusBadge = (leg: TripLeg) => {
  const status = normalizeStatus(leg.status);

  if (status === "creado") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30 shadow-sm w-full hover:text-white justify-center py-1">
        <Clock className="h-3 w-3 mr-1.5" /> ASIGNADO / EN RUTA
      </Badge>
    );
  }

  if (status === "entregado" && leg.leg_type === "carga_muelle")
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-500/30 hover:text-white shadow-sm w-full justify-center py-1">
        CARGADO EN PATIO
      </Badge>
    );
  if (status === "entregado" && leg.leg_type === "ruta_carretera")
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-500/30 hover:text-white  shadow-sm w-full justify-center py-1">
        DESENGANCHADO / PATIO
      </Badge>
    );
  if (status === "entregado" && leg.leg_type === "entrega_vacio")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30 hover:text-white  shadow-sm w-full justify-center py-1">
        FINALIZADO
      </Badge>
    );

  if (status === "en_transito") {
    if (leg.leg_type === "carga_muelle")
      return (
        <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-500/30 shadow-sm w-full hover:text-white  justify-center py-1">
          OPERANDO EN MUELLE
        </Badge>
      );
    if (leg.leg_type === "ruta_carretera")
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30 shadow-sm hover:text-white  w-full justify-center py-1">
          EN CARRETERA
        </Badge>
      );
    if (leg.leg_type === "entrega_vacio")
      return (
        <Badge className="bg-indigo-100 text-indigo-800 hover:text-white  border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-500/30 shadow-sm w-full justify-center py-1">
          RETORNANDO VACÍO
        </Badge>
      );
  }

  if (["detenido", "retraso", "accidente"].includes(status)) {
    return (
      <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:text-white  dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30 shadow-sm uppercase animate-pulse w-full justify-center py-1">
        <ShieldAlert className="h-3 w-3 mr-1.5" /> {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="uppercase w-full justify-center bg-slate-100 dark:bg-slate-800 hover:text-white text-slate-700 dark:text-slate-300 py-1 border-slate-200 dark:border-slate-700"
    >
      {status.replace("_", " ")}
    </Badge>
  );
};

const isIncidentStatus = (status: unknown) => {
  const s = normalizeStatus(status);
  return ["detenido", "retraso", "accidente"].includes(s);
};

const legTypeShort: Record<string, string> = {
  carga_muelle: "F1: CARGA PATIO",
  ruta_carretera: "F2: RUTA CARRETERA",
  entrega_vacio: "F3: ENTREGA VACÍO",
};

export const TripPlanner = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode =
    searchParams.get("view") === "calendar" ? "standby" : "table";

  const setViewMode = (v: "table" | "standby") => {
    searchParams.set("view", v === "standby" ? "calendar" : "table");
    setSearchParams(searchParams);
  };

  const {
    trips,
    loading,
    addTimelineEvent,
    deleteTrip,
    createNextLeg,
    fetchTrips,
    unhookTrip,
  } = useTrips();

  const [tripToView, setTripToView] = useState<Trip | null>(null);
  const { updateLoadStatus } = useUnits();
  const [selectedTripPadre, setSelectedTripPadre] = useState<Trip | null>(null);
  const [selectedDayTrips, setSelectedDayTrips] = useState<Trip[] | null>(null);
  const [selectedLegToUpdate, setSelectedLegToUpdate] =
    useState<TripLeg | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [legToSettle, setLegToSettle] = useState<{
    leg: TripLeg;
    tripPadre: Trip;
  } | null>(null);
  const [legToRelay, setLegToRelay] = useState<{
    leg: TripLeg;
    tripPadre: Trip;
  } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  //   ESTADO CLAVE: Al cambiar este número, React destruye y vuelve a crear la tabla
  const [tableKey, setTableKey] = useState(Date.now());

  useEffect(() => {
    fetchTrips();

    const interval = setInterval(() => {
      fetchTrips();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchTrips]);

  const handleNextLegSubmit = async (tripId: string, payload: any) => {
    const res = await createNextLeg(tripId, payload);
    if (res) {
      await fetchTrips();
      setTableKey(Date.now()); // Forzamos a la tabla a dibujarse de nuevo
    }
    return !!res;
  };

  useEffect(() => {
    if (tripToView) {
      const updatedTrip = trips.find((t) => t.id === tripToView.id);
      if (updatedTrip) {
        setTripToView({ ...updatedTrip });
      }
    }
  }, [trips]);

  const standbyTrips = useMemo(
    () =>
      trips.filter((t) => {
        if (t.status !== "creado") return false;

        // Contamos cuántas piernas REALMENTE están activas
        const activeLegsCount =
          t.legs?.filter(
            (l: any) =>
              l.record_status !== "E" && l.record_status !== "ELIMINADO",
          ).length || 0;

        return activeLegsCount === 0;
      }),
    [trips],
  );
  const allActiveLegs = useMemo(() => {
    const safeTrips = Array.isArray(trips) ? trips : [];
    const items: { leg: TripLeg; tripPadre: Trip }[] = [];
    for (const trip of safeTrips) {
      if (trip.status === "cerrado") continue;
      if (trip.legs && trip.legs.length > 0) {
        const activeLeg =
          trip.legs.find(
            (leg) =>
              !["entregado", "cerrado"].includes(leg.status.toLowerCase()),
          ) || trip.legs[trip.legs.length - 1];

        if (activeLeg) items.push({ leg: activeLeg, tripPadre: trip });
      }
    }
    return items.sort((a, b) => b.leg.id - a.leg.id);
  }, [trips]);

  const handleSaveStatusEvent = async (data: StatusUpdateData) => {
    if (!selectedTripPadre) return;

    const activeLeg =
      selectedLegToUpdate ||
      selectedTripPadre.legs?.find(
        (l) => !["entregado", "cerrado"].includes(l.status.toLowerCase()),
      ) ||
      selectedTripPadre.legs?.[selectedTripPadre.legs.length - 1];

    if (!activeLeg)
      return toast.error("Error: No se encontró una fase activa.");

    const ok = await addTimelineEvent(
      String(selectedTripPadre.id),
      activeLeg.id,
      {
        status: data.status,
        location: data.location,
        comments: data.comments,
        lat: data.lat,
        lng: data.lng,
        notifyClient: data.notifyClient,
      },
    );

    if (ok) {
      setUpdateModalOpen(false);
      await fetchTrips();
      setTableKey(Date.now()); //   Destruye y recrea la tabla internamente

      //   CONDICIÓN SOLICITADA: Solo aplicar reload duro si es la última fase (Desenganchar/Liberar)
      if (data.status === "entregado") {
        toast.success("Servicio reportado como Entregado. Ya puedes liquidar.");

        if (activeLeg.leg_type === "entrega_vacio") {
          if (selectedTripPadre.remolque_1_id)
            await updateLoadStatus(selectedTripPadre.remolque_1_id, false);
          if (selectedTripPadre.remolque_2_id)
            await updateLoadStatus(selectedTripPadre.remolque_2_id, false);
        }

        // Ejecutamos el reload brutal de la ventana SOLO al finalizar/liberar
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.success("Novedad registrada correctamente.");
      }
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getTripsForDay = (day: Date) => {
    return standbyTrips.filter(
      (t) => t.fecha_programada && isSameDay(parseISO(t.fecha_programada), day),
    );
  };

  const delayedTrips = useMemo(
    () =>
      standbyTrips.filter(
        (t) =>
          t.fecha_programada &&
          isPast(parseISO(t.fecha_programada)) &&
          !isToday(parseISO(t.fecha_programada)),
      ),
    [standbyTrips],
  );
  const unscheduledTrips = useMemo(
    () => standbyTrips.filter((t) => !t.fecha_programada),
    [standbyTrips],
  );

  const openUpdateStatusModal = (trip: Trip, leg?: TripLeg) => {
    setSelectedTripPadre(trip);
    setSelectedLegToUpdate(leg || null);
    setUpdateModalOpen(true);
  };

  const handleAssignInWizard = (trip: Trip) => {
    navigate(`/dispatch/new?tripId=${trip.id}`, { state: { trip } });
  };

  // 🚀 COLUMNAS DE LA TABLA INTELIGENTE
  const tableColumns: ColumnDef<{ leg: TripLeg; tripPadre: Trip }>[] = useMemo(
    () => [
      {
        key: "tripPadre.created_at",
        header: "Fecha creación",
        type: "date",
        sortable: true,
        render: (value, row) => {
          const dateVal = row.tripPadre.start_date || row.tripPadre.created_at;
          if (!dateVal) return <span className="text-slate-400">N/A</span>;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-black text-brand-navy dark:text-white uppercase">
                {format(new Date(dateVal), "dd MMM yyyy", { locale: es })}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {format(new Date(dateVal), "HH:mm")} HRS
              </span>
            </div>
          );
        },
      },
      {
        key: "tripPadre.client.razon_social",
        header: "Cliente / Folio",
        sortable: true,
        render: (value, row) => (
          <div className="flex flex-col gap-1">
            <span className="font-black text-brand-navy dark:text-slate-200 uppercase tracking-tight ">
              {row.tripPadre.client?.razon_social || "CLIENTE GENERAL"}
            </span>
            <span className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">
              TRP-{row.tripPadre.public_id || row.tripPadre.id}
            </span>
          </div>
        ),
      },
      {
        key: "leg.leg_type",
        header: "Fase del Servicio",
        type: "status",
        statusOptions: ["carga_muelle", "ruta_carretera", "entrega_vacio"],
        statusNormalizer: (val) => val,
        render: (value) => (
          <Badge
            variant="info"
            className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
          >
            {legTypeShort[value as string] || value}
          </Badge>
        ),
      },
      {
        key: "leg.unit.numero_economico",
        header: "Asignación Física",
        render: (value, row) => (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-brand-navy dark:text-blue-400 bg-slate-50 dark:bg-slate-900 w-fit px-2 py-1 rounded border border-slate-200 dark:border-white/10 shadow-sm">
              <Truck className="h-4 w-4 shrink-0 text-red-500" /> ECO-
              {row.leg.unit?.numero_economico || "N/A"}
            </div>
            <div className="flex items-center gap-2 text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight w-fit px-2 py-1">
              <User className="h-4 w-4 shrink-0 text-blue-500" />{" "}
              {(() => {
                const parts = row.leg.operator?.name?.trim().split(" ") || [];
                if (parts.length === 0) return "S/A";
                if (parts.length === 1) return parts[0];
                if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
                if (parts.length === 3) return `${parts[0]} ${parts[1]}`; // Ej: Abiel Quezada Azamar -> Abiel Quezada
                return `${parts[0]} ${parts[2]}`; // Ej: Luis Enrique Garcia Martinez -> Luis Garcia
              })()}
            </div>
          </div>
        ),
      },
      {
        key: "leg.status",
        header: "Estatus Operativo",
        type: "status",
        statusOptions: [
          "creado",
          "en_transito",
          "entregado",
          "detenido",
          "retraso",
          "accidente",
        ],
        statusNormalizer: (val) => normalizeStatus(val),
        render: (value, row) => (
          <div className="flex flex-col items-center justify-center gap-1 w-full max-w-[160px] mx-auto">
            {getOperationalStatusBadge(row.leg)}
          </div>
        ),
      },
      {
        key: "actions",
        header: "Acciones",
        sortable: false,
        render: (value, { tripPadre }) => (
          <div className="flex justify-end pr-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                >
                  <MoreVertical className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-panel border-white/20 min-w-[200px] z-50 dark:bg-slate-900/90 shadow-2xl rounded-xl p-1"
              >
                <DropdownMenuItem
                  onClick={() => setTripToView(tripPadre)}
                  className="rounded-lg cursor-pointer py-2.5 font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:text-blue-500"
                >
                  <Eye className="h-4 w-4 mr-3 text-blue-500" /> Abrir Centro de
                  Mando
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => setTripToDelete(tripPadre)}
                  className="rounded-lg cursor-pointer py-2.5 font-bold uppercase tracking-widest text-rose-600 dark:text-rose-500"
                >
                  <Trash2 className="h-4 w-4 mr-3" /> Eliminar Viaje
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  if (loading && trips.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-red" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
          Sincronizando Tablero de Dispatch...
        </p>
      </div>
    );

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-card/40 p-4 rounded-2xl border border-border shadow-sm backdrop-blur-md gap-4">
        <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-3 px-2 uppercase tracking-tighter heading-crisp">
          <div className="p-2 bg-blue-600 rounded-xl shadow-inner border border-blue-500">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          Asistente de Despacho
        </h2>

        <div className="flex items-center w-full md:w-auto overflow-x-auto hide-scrollbar bg-card p-1.5 rounded-xl border border-border shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              toast.info("Sincronizando datos...");
              await fetchTrips();
              setTableKey(Date.now()); //   Forzar destrucción y recreación de tabla sin recargar página
            }}
            disabled={loading}
            className="h-10 w-10 mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Sincronizar base de datos"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-slate-500",
                loading && "animate-spin text-blue-500",
              )}
            />
          </Button>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as any)}
            className="w-full min-w-max"
          >
            <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50 rounded-lg p-1">
              <TabsTrigger
                value="table"
                className="text-[10px] font-black uppercase tracking-widest rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all h-full"
              >
                <List className="h-3.5 w-3.5 mr-2" /> Tabla
              </TabsTrigger>
              <TabsTrigger
                value="standby"
                className=" font-black uppercase tracking-widest rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all h-full"
              >
                <CalendarDays className="h-3.5 w-3.5 mr-2" /> Planeador{" "}
                {standbyTrips.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 bg-amber-500 text-white h-4 px-1.5 border-none shadow-sm text-[8px] leading-none flex items-center justify-center"
                  >
                    {standbyTrips.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 🚀 AQUI REEMPLAZAMOS LA TABLA MANUAL POR LA ENHANCED DATATABLE */}
      {viewMode === "table" && (
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-transparent">
          <CardContent className="p-0">
            <EnhancedDataTable
              data={allActiveLegs}
              columns={tableColumns}
              searchPlaceholder="BUSCAR OPERADOR, UNIDAD, CLIENTE..."
              exportFileName="Viajes_Operativos"
              initialSort={{ key: "tripPadre.created_at", direction: "desc" }}
            />
          </CardContent>
        </Card>
      )}

      {viewMode === "standby" && (
        <div className="flex flex-col xl:flex-row gap-6 h-full min-h-0">
          {(delayedTrips.length > 0 || unscheduledTrips.length > 0) && (
            <div className="w-full xl:w-72 flex flex-col gap-6 shrink-0 h-full overflow-y-auto hide-scrollbar pb-6">
              {delayedTrips.length > 0 && (
                <Card className="bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-sm rounded-2xl overflow-hidden shrink-0">
                  <CardHeader className="p-4 border-b border-rose-200/50 dark:border-rose-900/50 bg-rose-100/50 dark:bg-rose-900/30 text-center">
                    <CardTitle className="text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest flex items-center justify-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Atrasados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    {delayedTrips.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 text-xs shadow-sm hover:shadow-md transition-shadow"
                      >
                        <p className="font-black text-brand-navy dark:text-white uppercase truncate mb-1 text-[11px]">
                          {v.client?.razon_social}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-widest uppercase">
                          {v.route_name || `${v.origin} - ${v.destination}`}
                        </p>
                        <Button
                          size="sm"
                          className="w-full h-8 mt-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-rose-500/20 haptic-press"
                          onClick={() => handleAssignInWizard(v)}
                        >
                          Asignar Rápido
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {unscheduledTrips.length > 0 && (
                <Card className="bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden shrink-0">
                  <CardHeader className="p-4 border-b border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-slate-800/50 text-center">
                    <CardTitle className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Sin Fecha Programada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    {unscheduledTrips.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs shadow-sm hover:shadow-md transition-shadow"
                      >
                        <p className="font-black text-brand-navy dark:text-white uppercase truncate mb-1 text-[11px]">
                          {v.client?.razon_social}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-widest uppercase">
                          {v.route_name || `${v.origin} - ${v.destination}`}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 mt-3 text-[10px] font-black uppercase tracking-widest border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 haptic-press"
                          onClick={() => handleAssignInWizard(v)}
                        >
                          Despachar Viaje
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card className="flex-1 shadow-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-950 rounded-2xl overflow-hidden flex flex-col h-full min-h-0">
            <CardHeader className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-row items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 haptic-press"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Button>
              <h2 className="text-lg sm:text-xl font-black text-brand-navy dark:text-white uppercase tracking-widest">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 haptic-press"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/50 shrink-0">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div
                    key={d}
                    className="py-3 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-slate-200 dark:bg-white/5 gap-px flex-1 overflow-y-auto custom-scrollbar">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isDiaHoy = isToday(day);
                  const tripsOnDay = getTripsForDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[140px] bg-white dark:bg-slate-950 flex flex-col transition-colors",
                        !isCurrentMonth &&
                          "bg-slate-50/50 dark:bg-slate-950/50 opacity-40",
                        isDiaHoy &&
                          "bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-inset ring-blue-200 dark:ring-blue-900/50 z-10",
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 flex justify-between items-center border-b border-slate-100 dark:border-white/5",
                          isDiaHoy
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400"
                            : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-black w-7 h-7 flex items-center justify-center rounded-full",
                            isDiaHoy &&
                              "bg-blue-600 text-white shadow-md shadow-blue-500/20",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        <button
                          onClick={() =>
                            navigate(
                              `/dispatch/new?date=${format(day, "yyyy-MM-dd")}`,
                            )
                          }
                          className={cn(
                            "p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors haptic-press",
                            !isCurrentMonth && "hidden",
                          )}
                          title="Crear viaje este día"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex-1 p-1.5 overflow-y-auto max-h-[160px] custom-scrollbar space-y-1.5">
                        {tripsOnDay.slice(0, 3).map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleAssignInWizard(v)}
                            className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-2 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:shadow-sm transition-all relative group haptic-press"
                          >
                            <div className="font-black text-[9px] uppercase tracking-widest text-emerald-800 dark:text-emerald-400 truncate pr-4">
                              {v.client?.razon_social}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-500/80 truncate font-bold uppercase tracking-tight mt-0.5">
                              {v.route_name || `${v.origin}-${v.destination}`}
                            </div>
                            <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm" />
                          </div>
                        ))}

                        {tripsOnDay.length > 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayTrips(tripsOnDay);
                            }}
                            className="w-full text-center text-[10px] font-black text-brand-navy dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 py-1.5 rounded-lg transition-colors border border-dashed border-slate-300 dark:border-white/10 uppercase tracking-widest"
                          >
                            + {tripsOnDay.length - 3} VIAJES MÁS
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTripPadre && (
        <UpdateStatusModal
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          serviceId={
            selectedTripPadre.public_id || String(selectedTripPadre.id)
          }
          activeLeg={selectedLegToUpdate || undefined}
          onSubmit={handleSaveStatusEvent}
        />
      )}

      <AlertDialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Eliminar Viaje
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Acción Irreversible • Purga de Sistema
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea eliminar el viaje completo y todas sus
                fases asociadas?
              </p>

              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Historial y Asignaciones
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción desvinculará a los operadores y unidades
                  asignados, liberándolos en el sistema. Todo el historial de
                  rastreo, bitácoras y liquidaciones se perderán.{" "}
                  <b className="font-black underline">
                    No podrá ser recuperado
                  </b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setTripToDelete(null)}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={async () => {
                  if (tripToDelete) {
                    await deleteTrip(String(tripToDelete.id));
                    setTripToDelete(null);
                  }
                }}
                className="w-full sm:w-auto haptic-press shadow-rose-600/20 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar Definitivamente
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NextLegModal
        open={!!legToRelay}
        onOpenChange={(open) => !open && setLegToRelay(null)}
        tripPadre={legToRelay?.tripPadre || null}
        onSubmit={handleNextLegSubmit}
        onSuccessRefresh={fetchTrips}
      />
      <TripSettlementModal
        open={!!legToSettle}
        onOpenChange={(open) => !open && setLegToSettle(null)}
        leg={legToSettle?.leg || null}
        tripPadre={legToSettle?.tripPadre || null}
      />
      <TripDetailsModal
        open={!!tripToView}
        onOpenChange={async (open) => {
          if (!open) {
            // 🔥 1. Destruimos por completo la referencia al viaje actual para matar fantasmas
            setTripToView(null);

            // 🔥 2. Recargamos la info limpia del servidor
            await fetchTrips();

            // 🔥 3. Forzamos a que TODA la pantalla se refresque visualmente
            setTableKey(Date.now());
          }
        }}
        trip={tripToView}
        onIncidentClick={(t) => openUpdateStatusModal(t)}
        onRelayClick={(l, t) => setLegToRelay({ leg: l, tripPadre: t })}
        onSettleClick={(l, t) => setLegToSettle({ leg: l, tripPadre: t })}
        onUpdateStatusClick={(t, l) => openUpdateStatusModal(t, l)}
      />

      <Dialog
        open={!!selectedDayTrips}
        onOpenChange={() => setSelectedDayTrips(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-md flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl transition-all duration-300">
          <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-blue-200 dark:border-blue-500/20">
                <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none">
                  Viajes Programados
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 truncate tracking-normal normal-case">
                  Servicios listos para el{" "}
                  <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">
                    {selectedDayTrips?.[0]?.fecha_programada &&
                      format(
                        parseISO(
                          selectedDayTrips[0].fecha_programada as string,
                        ),
                        "dd 'de' MMM",
                        { locale: es },
                      )}
                  </span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
            <div className="space-y-4">
              {selectedDayTrips?.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900/50 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md transition-all group"
                >
                  <div className="flex-1 min-w-0 pr-4 mb-4 sm:mb-0">
                    <p className="font-black text-sm text-brand-navy dark:text-white uppercase truncate">
                      {v.client?.razon_social}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest truncate mt-1">
                      {v.route_name || `${v.origin}-${v.destination}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 border-none haptic-press"
                    onClick={() => {
                      setSelectedDayTrips(null);
                      handleAssignInWizard(v);
                    }}
                  >
                    Despachar Rápido
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedDayTrips(null)}
              className="w-full haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cerrar Vista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
