import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Clock,
  Search,
  Truck,
  Loader2,
  User,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  FileText,
  Activity,
  CircleDot,
  Compass,
  Phone,
  MoreVertical,
  Trash2,
  CalendarDays,
  Filter,
} from "lucide-react";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { Trip, TripTimelineEvent } from "@/types/api.types";
import {
  UpdateStatusModal,
  StatusUpdateData,
} from "@/features/monitoreo/UpdateStatusModal";
import axiosClient from "@/api/axiosClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterType = "activos" | "completados" | "todos";

export default function ControlDeTrafico() {
  const { trips, loading: isLoading, fetchTrips } = useTrips();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("activos");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<TripTimelineEvent | null>(
    null,
  );
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  //  1. FILTROS PRO: Búsqueda de texto + Pestañas de Estados
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const tripStatus = String(trip.status);
      // Determinamos si el viaje ya terminó su ciclo operativo
      const isClosed =
        tripStatus === "cerrado" ||
        tripStatus === "entregado" ||
        tripStatus === "liquidado";

      // Aplicar filtro de pestañas
      let passesFilter = false;
      if (filterType === "activos") passesFilter = !isClosed;
      if (filterType === "completados") passesFilter = isClosed;
      if (filterType === "todos") passesFilter = true;

      // Aplicar búsqueda de texto (súper flexible)
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        trip.public_id?.toLowerCase().includes(searchLower) ||
        trip.origin.toLowerCase().includes(searchLower) ||
        trip.destination.toLowerCase().includes(searchLower) ||
        trip.client?.razon_social?.toLowerCase().includes(searchLower) ||
        trip.legs?.[0]?.unit?.numero_economico
          ?.toLowerCase()
          .includes(searchLower);

      return passesFilter && matchesSearch;
    });
  }, [trips, search, filterType]);

  //  2. CORRECCIÓN DE TYPESCRIPT: Evita el error TS(2367) al forzar el casteo a string
  const activeLeg = useMemo(() => {
    if (!selectedTrip?.legs) return undefined;
    return (
      selectedTrip.legs.find(
        (leg) =>
          //  CORRECCIÓN AQUÍ: Todo evaluado como string
          String(leg.status) !== "cerrado" &&
          String(leg.status) !== "entregado" &&
          String(leg.status) !== "liquidado",
      ) || selectedTrip.legs[selectedTrip.legs.length - 1]
    );
  }, [selectedTrip]);

  const getUnitStatusColor = (status?: string) => {
    if (status === "bloqueado") {
      return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20";
    }
    if (status === "disponible") {
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
    }
    if (status === "en_ruta") {
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10";
  };

  const getUnitDisplayName = (unit?: any) => {
    if (!unit) return "Sin asignar";

    const brandModel = [unit.marca, unit.modelo, unit.year]
      .filter(Boolean)
      .join(" ");

    return brandModel || `Económico ${unit.numero_economico || "S/N"}`;
  };

  const getUnitSecondaryInfo = (unit?: any) => {
    if (!unit) return "";

    const parts = [
      unit.numero_economico ? `Económico ${unit.numero_economico}` : null,
      unit.placas ? `Placas ${unit.placas}` : null,
      unit.tipo ? unit.tipo : null,
    ].filter(Boolean);

    return parts.join(" · ");
  };

  //  BÚSQUEDA ROBUSTA DE EVENTOS
  const timelineEvents = useMemo(() => {
    if (!selectedTrip?.legs) return [];

    // 🕵️‍♂️ TRUCO DE DEBUG: Imprimimos el viaje para ver las tripas de la respuesta
    console.log("Estructura del viaje seleccionado:", selectedTrip);

    const allEvents: any[] = []; // Usamos any temporalmente para atrapar todo

    selectedTrip.legs.forEach((leg: any) => {
      // 1. Buscamos el arreglo en los nombres más comunes que manda FastAPI
      const events = leg.timeline_events || leg.events || leg.historial || [];
      allEvents.push(...events);
    });

    return allEvents.sort((a, b) => {
      // 2. Buscamos la fecha sea como sea que la haya mandado la BD
      const dateA = new Date(
        a.time || a.timestamp || a.created_at || 0,
      ).getTime();
      const dateB = new Date(
        b.time || b.timestamp || b.created_at || 0,
      ).getTime();
      return dateB - dateA;
    });
  }, [selectedTrip]);

  // Abre el modal guardando el ID del evento
  const handleAskDeleteEvent = (eventId: number) => {
    setEventToDelete(eventId);
  };

  // Ejecuta la eliminación real cuando el usuario confirma en el modal
  const executeDeleteEvent = async () => {
    if (!eventToDelete) return;

    setIsDeletingEvent(true);
    try {
      await axiosClient.delete(`/trips/timeline/${eventToDelete}`);
      toast.success("Evento eliminado de la bitácora");

      // Recargar datos
      await fetchTrips();
      const { data: updatedTrip } = await axiosClient.get(
        `/trips/${selectedTrip?.id}`,
      );
      setSelectedTrip(updatedTrip);

      // Cerrar modal
      setEventToDelete(null);
    } catch (error) {
      toast.error("Error al eliminar el evento");
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleEditEvent = (event: TripTimelineEvent) => {
    setEventToEdit(event);
    setIsModalOpen(true);
  };

  const refreshCurrentTrip = async () => {
    await fetchTrips();
    if (selectedTrip) {
      const { data } = await axiosClient.get(`/trips/${selectedTrip.id}`);
      setSelectedTrip(data);
    }
  };

  // BUSCA handleStatusSubmit en ControlDeTrafico.tsx y actualiza el modo edición:
  const handleStatusSubmit = async (data: StatusUpdateData) => {
    //  IMPORTANTE: Necesitamos asegurar que tenemos el activeLeg
    if (!selectedTrip || !activeLeg) {
      toast.error("No hay un tramo activo para registrar la bitácora.");
      return;
    }

    try {
      //  CONSTRUIMOS EL PAYLOAD EXACTO QUE ESPERA FASTAPI
      const payloadLimpio = {
        ...data,
        // 1. Vinculamos el evento al tramo actual
        trip_leg_id: activeLeg.id,

        // 2. FastAPI espera 'time', pero el modal manda 'timestamp'
        time: data.timestamp || new Date().toISOString(),

        // 3. FastAPI espera un texto descriptivo obligatorio en 'event'
        event: data.comments || `Actualización de estatus en ${data.location}`,

        // 4. Mapeo opcional para los íconos
        event_type: data.status,

        // 5. Sanitización de números (lo que ya habíamos arreglado)
        odometro: data.odometro ? Number(data.odometro) : null,
        combustible_porcentaje: data.combustible_porcentaje
          ? Number(data.combustible_porcentaje)
          : null,
        combustible_litros: data.combustible_litros
          ? Number(data.combustible_litros)
          : null,
      };

      if (eventToEdit) {
        //  MODO EDICIÓN
        await axiosClient.put(`/trips/timeline/${eventToEdit.id}`, {
          location: data.location,
          comments: data.comments,
          lat: data.lat,
          lng: data.lng,
          status: data.status,
        });
        toast.success("Registro corregido con éxito");
      } else {
        //  MODO CREACIÓN
        await axiosClient.post(
          `/trips/${selectedTrip.id}/timeline`,
          payloadLimpio,
        );
        toast.success("Bitácora actualizada");
      }

      setEventToEdit(null);
      setIsModalOpen(false);

      //  Refrescamos los datos para que aparezcan en la pantalla
      await refreshCurrentTrip();
    } catch (error) {
      console.error("Error del backend:", error);
      toast.error("Error al guardar en la bitácora. Revisa la consola.");
    }
  };

  //  ESTILOS SEMÁNTICOS PARA BADGES DE ESTADO (Tahoe Standard)
  const getStatusColor = (status: string) => {
    if (status === "detenido" || status === "retraso")
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30";
    if (status === "accidente" || status === "bloqueado")
      return "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/30";
    if (status === "entregado" || status === "cerrado")
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30";
    return "bg-blue-50 dark:bg-blue-900/30 text-brand-navy dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
  };

  //  3. DISEÑO INTELIGENTE DEL TIMELINE (Detecta palabras clave)
  const getTimelineConfig = (eventText: string, eventType?: string) => {
    const text = (eventText + " " + (eventType || "")).toLowerCase();

    if (
      text.includes("accidente") ||
      text.includes("siniestro") ||
      text.includes("falla")
    ) {
      return {
        icon: (
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        ),
        border: "border-rose-200 dark:border-rose-900/50",
        bg: "bg-rose-50 dark:bg-rose-950/20",
      };
    }
    if (
      text.includes("detenido") ||
      text.includes("retraso") ||
      text.includes("descanso") ||
      text.includes("tráfico")
    ) {
      return {
        icon: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        border: "border-amber-200 dark:border-amber-900/50",
        bg: "bg-amber-50 dark:bg-amber-950/20",
      };
    }
    if (
      text.includes("entregado") ||
      text.includes("llegada") ||
      text.includes("destino")
    ) {
      return {
        icon: (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ),
        border: "border-emerald-200 dark:border-emerald-900/50",
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
      };
    }
    return {
      icon: <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      border: "border-slate-200 dark:border-white/10",
      bg: "bg-white dark:bg-slate-900/50",
    };
  };

  return (
    <div className="p-4 md:p-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col animate-page-enter">
      <PageHeader
        title="Control de Tráfico"
        description="Monitoreo operativo en tiempo real, seguimiento de unidades en ruta y bitácora de novedades."
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* ========================================================================= */}
        {/* COLUMNA IZQUIERDA: LISTA DE VIAJES (FILTROS Y BÚSQUEDA) */}
        {/* ========================================================================= */}
        <Card className="md:col-span-4 flex flex-col h-full shadow-lg border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-4 z-10 shadow-sm">
            {/* BUSCADOR */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por unidad, cliente, ruta..."
                className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl focus-visible:ring-brand-red/20 font-bold text-sm transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/*  FILTROS PRO (Segmented Control Tahoe) */}
            <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
              <button
                onClick={() => setFilterType("activos")}
                className={cn(
                  "flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all duration-300 uppercase tracking-widest",
                  filterType === "activos"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-brand-navy dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                En Curso
              </button>
              <button
                onClick={() => setFilterType("completados")}
                className={cn(
                  "flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all duration-300 uppercase tracking-widest",
                  filterType === "completados"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-brand-navy dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                Completados
              </button>
              <button
                onClick={() => setFilterType("todos")}
                className={cn(
                  "flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all duration-300 uppercase tracking-widest",
                  filterType === "todos"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-brand-navy dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                Todos
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-3 custom-scrollbar">
            <div className="space-y-3 pb-4 pt-2">
              {isLoading ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-600 space-y-4 mt-10">
                  <Activity className="h-8 w-8 animate-pulse text-brand-red" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Localizando flota...
                  </p>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-600 space-y-3 mt-10">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mb-2 shadow-inner border border-slate-200 dark:border-white/5">
                    <Filter className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 text-center leading-tight uppercase tracking-widest">
                    No se encontraron viajes <br />
                    <span className="text-brand-navy dark:text-white">
                      "{filterType}"
                    </span>
                  </p>
                  {search && (
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
                      Coincidencia: "{search}"
                    </p>
                  )}
                </div>
              ) : (
                filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className={cn(
                      "group p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden",
                      selectedTrip?.id === trip.id
                        ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50 shadow-md ring-1 ring-blue-500/20"
                        : "bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md",
                    )}
                  >
                    {/* Indicador lateral para viaje seleccionado */}
                    {selectedTrip?.id === trip.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-2xl" />
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="font-black text-brand-navy dark:text-white text-sm uppercase tracking-tight">
                          {trip.public_id || `TRP-${trip.id}`}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                          {trip.client?.razon_social?.substring(0, 22) ||
                            "Sin Cliente"}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase text-[9px] font-black tracking-widest px-2 py-0.5 shadow-sm",
                          getStatusColor(trip.status),
                        )}
                      >
                        {trip.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="relative pl-1 my-3">
                      <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="bg-white dark:bg-slate-900 rounded-full p-0.5 border border-slate-200 dark:border-slate-700">
                            <CircleDot className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            {trip.origin}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="bg-white dark:bg-slate-900 rounded-full p-0.5 border border-slate-200 dark:border-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                            {trip.destination}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5 max-w-[140px] truncate">
                        <Truck className="h-3 w-3 mr-1.5 text-brand-navy dark:text-slate-300 shrink-0" />
                        {trip.legs?.[0]?.unit
                          ? `${trip.legs[0].unit.numero_economico} · ${trip.legs[0].unit.placas || "S/P"}`
                          : "N/A"}
                      </div>
                      <div className="flex items-center text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                        <User className="h-3 w-3 mr-1.5 text-slate-400" />
                        {trip.legs?.[0]?.operator?.name?.split(" ")[0] || "N/A"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* ========================================================================= */}
        {/* COLUMNA DERECHA: DETALLE, TELEMETRÍA Y TIMELINE */}
        {/* ========================================================================= */}
        <Card className="md:col-span-8 flex flex-col h-full shadow-lg border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-md">
          {!selectedTrip ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-5 bg-slate-50/30 dark:bg-transparent">
              <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/5 icon-plate">
                <Navigation className="h-10 w-10 text-slate-300 dark:text-slate-500" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center max-w-xs leading-relaxed">
                Seleccione un viaje del panel lateral para monitorear su
                bitácora operativa.
              </p>
            </div>
          ) : (
            <>
              {/*  HEADER DEL DETALLE TAHOE */}
              <CardHeader className="p-6 md:p-8 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                    <CardTitle className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-white tracking-tighter heading-crisp uppercase">
                      {selectedTrip.public_id || `TRP-${selectedTrip.id}`}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase text-[10px] font-black tracking-widest px-3 py-1 shadow-sm",
                        getStatusColor(selectedTrip.status),
                      )}
                    >
                      {selectedTrip.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest gap-2">
                    <User className="h-3.5 w-3.5" />
                    Cliente:{" "}
                    <span className="text-slate-700 dark:text-slate-200">
                      {selectedTrip.client?.razon_social || "Ruta Libre"}
                    </span>
                  </div>
                </div>

                {/* Mostrar botón solo si el viaje no está cerrado */}
                {String(selectedTrip.status) !== "cerrado" &&
                  String(selectedTrip.status) !== "liquidado" && (
                    <div className="relative z-10 w-full sm:w-auto mt-4 sm:mt-0">
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-lg shadow-blue-500/20 rounded-xl transition-all active:scale-95 border-none haptic-press"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Actualizar Bitácora
                      </Button>
                    </div>
                  )}
              </CardHeader>

              <ScrollArea className="flex-1 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
                <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
                  {/*  TARJETAS DE INFORMACIÓN (UNIDAD Y OPERADOR) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Tarjeta Unidad */}
                    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
                      <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner icon-plate border border-blue-100 dark:border-blue-500/20">
                        <Truck className="h-7 w-7 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Unidad en turno
                        </p>

                        <p className="text-lg font-black uppercase tracking-tighter text-brand-navy dark:text-white leading-tight mt-0.5 truncate">
                          {getUnitDisplayName(activeLeg?.unit)}
                        </p>

                        <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-2 truncate">
                          {getUnitSecondaryInfo(activeLeg?.unit) ||
                            "Sin datos de unidad"}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeLeg?.unit?.status && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                                getUnitStatusColor(activeLeg.unit.status),
                              )}
                            >
                              {activeLeg.unit.status.replace("_", " ")}
                            </Badge>
                          )}

                          {activeLeg?.unit?.tipo_1 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
                            >
                              {activeLeg.unit.tipo_1}
                            </Badge>
                          )}

                          {activeLeg?.unit?.tipo_carga && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                            >
                              {activeLeg.unit.tipo_carga}
                            </Badge>
                          )}

                          {(activeLeg?.unit as any)?.odometro && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
                            >
                              ODO:{" "}
                              {(
                                activeLeg.unit as any
                              ).odometro.toLocaleString()}{" "}
                              km
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta Operador */}
                    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
                      <div className="h-14 w-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner icon-plate border border-amber-100 dark:border-amber-500/20">
                        <User className="h-7 w-7 text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Operador en Turno
                        </p>
                        <p className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white leading-tight mt-0.5 truncate">
                          {activeLeg?.operator?.name || "Sin Asignar"}
                        </p>
                        {activeLeg?.operator?.phone && (
                          <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 truncate">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {activeLeg.operator.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/*  LÍNEA DE TIEMPO (TIMELINE) */}
                  <div className="bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm p-6 md:p-8">
                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
                      <FileText className="h-4 w-4 text-blue-500" /> Historial
                      de Eventos (Bitácora)
                    </h3>

                    {timelineEvents.length === 0 ? (
                      <div className="text-center p-12 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-600">
                        <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30 text-slate-500 dark:text-slate-400" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Sin historial registrado
                        </p>
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">
                          Las novedades operativas se mostrarán aquí una vez
                          reportadas.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 pb-4">
                        {timelineEvents.map((event, idx) => {
                          const config = getTimelineConfig(
                            event.event,
                            event.event_type,
                          );
                          return (
                            <div key={idx} className="relative pl-8 group">
                              {/* Círculo del Timeline */}
                              <div className="absolute -left-[17px] top-1 h-8 w-8 rounded-full border-[3px] border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform z-10">
                                {config.icon}
                              </div>

                              <div
                                className={cn(
                                  "p-5 rounded-2xl border transition-all relative overflow-hidden",
                                  config.bg,
                                  config.border,
                                  "group-hover:shadow-md",
                                )}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Clock className="h-3 w-3" />
                                      {new Date(
                                        event.time ||
                                          event.timestamp ||
                                          event.created_at,
                                      ).toLocaleString("es-MX", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })}
                                    </span>

                                    {/*  MOSTRAR COORDENADAS SI EXISTEN (Esto quita tu error) */}
                                    {(event.lat || event.lng) && (
                                      <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded shadow-sm flex items-center gap-1.5 w-fit border border-blue-200 dark:border-blue-800/50">
                                        <Compass className="h-3 w-3" />{" "}
                                        {event.lat}, {event.lng}
                                      </span>
                                    )}
                                  </div>

                                  {/*  BOTÓN DE ACCIONES (3 PUNTITOS) */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl transition-all"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="glass-panel border-slate-200 dark:border-white/10 min-w-[160px] dark:bg-slate-900/90 shadow-xl"
                                    >
                                      <DropdownMenuItem
                                        onClick={() => handleEditEvent(event)}
                                        className="text-[10px] font-black uppercase tracking-widest text-brand-green cursor-pointer dark:focus:bg-slate-800"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 mr-2" />{" "}
                                        Corregir Datos
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="dark:bg-white/10" />
                                      <DropdownMenuItem
                                        className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                                        onClick={() =>
                                          handleAskDeleteEvent(event.id!)
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                                        Eliminar item
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <p className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 leading-snug">
                                  {event.event}
                                </p>

                                {/*  COMENTARIOS SEPARADOS */}
                                {event.comments && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white/60 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner mt-3 leading-relaxed">
                                    "{event.comments}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </Card>
      </div>

      {/* MODAL PARA ACTUALIZAR BITÁCORA */}
      {selectedTrip && (
        <UpdateStatusModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEventToEdit(null);
          }}
          serviceId={
            selectedTrip?.public_id || selectedTrip?.id.toString() || ""
          }
          activeLeg={activeLeg}
          onSubmit={handleStatusSubmit}
          eventToEdit={eventToEdit}
        />
      )}

      {/*  ALERTA DE ELIMINACIÓN DE EVENTO (Estructura Tahoe 4 Capas) */}
      <AlertDialog
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingEvent) setEventToDelete(null);
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl transition-all duration-300">
          {/* CAPA 2: HEADER TAHOE (Contraste Blanco/Navy puro) */}
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left min-w-0">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Eliminar Novedad
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Acción Irreversible • Bitácora Operativa
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          {/* CAPA 3: BODY */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea eliminar este evento de la bitácora del
                viaje?
              </p>

              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Historial Operativo
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción purgará la novedad, sus coordenadas GPS, y
                  comentarios asociados.{" "}
                  <b className="font-black underline">
                    No podrá ser recuperado
                  </b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          {/* CAPA 4: FOOTER */}
          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setEventToDelete(null)}
                disabled={isDeletingEvent}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>

              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={(e) => {
                  e.preventDefault(); //  Crucial: Evita que el modal se cierre al instante, permitiendo ver el loader
                  executeDeleteEvent();
                }}
                disabled={isDeletingEvent}
                className="w-full sm:w-auto haptic-press shadow-rose-600/20 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                {isDeletingEvent ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar Registro
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
