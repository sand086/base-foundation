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
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Clock,
  Search,
  Truck,
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
import { useTrips } from "@/hooks/useTrips";
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

  // 🚀 1. FILTROS PRO: Búsqueda de texto + Pestañas de Estados
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

  // 🚀 2. CORRECCIÓN DE TYPESCRIPT: Evita el error TS(2367) al forzar el casteo a string
  const activeLeg = useMemo(() => {
    if (!selectedTrip?.legs) return undefined;
    return (
      selectedTrip.legs.find(
        (leg) =>
          // 🚀 CORRECCIÓN AQUÍ: Todo evaluado como string
          String(leg.status) !== "cerrado" &&
          String(leg.status) !== "entregado" &&
          String(leg.status) !== "liquidado",
      ) || selectedTrip.legs[selectedTrip.legs.length - 1]
    );
  }, [selectedTrip]);

  // Extraer historial de eventos del viaje y ordenarlo (más reciente arriba)
  const timelineEvents = useMemo(() => {
    if (!selectedTrip?.legs) return [];
    const allEvents: TripTimelineEvent[] = [];
    selectedTrip.legs.forEach((leg) => {
      if (leg.timeline_events) allEvents.push(...leg.timeline_events);
    });
    return allEvents.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
  }, [selectedTrip]);

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("¿Estás seguro de eliminar este evento de la bitácora?"))
      return;
    try {
      await axiosClient.delete(`/trips/timeline/${eventId}`);
      toast.success("Evento eliminado");
      // Recargar datos
      await fetchTrips();
      const { data: updatedTrip } = await axiosClient.get(
        `/trips/${selectedTrip?.id}`,
      );
      setSelectedTrip(updatedTrip);
    } catch (error) {
      toast.error("Error al eliminar el evento");
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
    if (!selectedTrip) return;
    try {
      if (eventToEdit) {
        // 🚀 MODO EDICIÓN
        await axiosClient.put(`/trips/timeline/${eventToEdit.id}`, {
          location: data.location,
          comments: data.comments,
          lat: data.lat,
          lng: data.lng,
          status: data.status, // 👈 Esto enviará el valor correcto al backend
        });
        toast.success("Registro corregido con éxito");
      } else {
        // MODO CREACIÓN
        await axiosClient.post(`/trips/${selectedTrip.id}/timeline`, data);
        toast.success("Bitácora actualizada");
      }

      setEventToEdit(null);
      setIsModalOpen(false);
      await refreshCurrentTrip();
    } catch (error) {
      toast.error("Error al procesar los datos");
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "detenido" || status === "retraso")
      return "bg-amber-100 text-amber-800 border-amber-300";
    if (status === "accidente" || status === "bloqueado")
      return "bg-red-100 text-red-800 border-red-300";
    if (status === "entregado" || status === "cerrado")
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    return "bg-blue-50 text-brand-navy border-blue-200";
  };

  // 🚀 3. DISEÑO INTELIGENTE DEL TIMELINE (Detecta palabras clave)
  const getTimelineConfig = (eventText: string, eventType?: string) => {
    const text = (eventText + " " + (eventType || "")).toLowerCase();

    if (
      text.includes("accidente") ||
      text.includes("siniestro") ||
      text.includes("falla")
    ) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        border: "border-red-200",
        bg: "bg-red-50",
      };
    }
    if (
      text.includes("detenido") ||
      text.includes("retraso") ||
      text.includes("descanso") ||
      text.includes("tráfico")
    ) {
      return {
        icon: <Clock className="h-4 w-4 text-amber-600" />,
        border: "border-amber-200",
        bg: "bg-amber-50",
      };
    }
    if (
      text.includes("entregado") ||
      text.includes("llegada") ||
      text.includes("destino")
    ) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        border: "border-emerald-200",
        bg: "bg-emerald-50",
      };
    }
    return {
      icon: <Navigation className="h-4 w-4 text-blue-600" />,
      border: "border-blue-200",
      bg: "bg-slate-50",
    };
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col bg-slate-50/50">
      <PageHeader
        title="Control de Tráfico"
        description="Tracking operativo en tiempo real, unidades en ruta y bitácora de novedades."
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* ========================================================================= */}
        {/* COLUMNA IZQUIERDA: LISTA DE VIAJES (FILTROS Y BÚSQUEDA) */}
        {/* ========================================================================= */}
        <Card className="md:col-span-4 flex flex-col h-full shadow-sm border-slate-200/60 rounded-2xl overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-white space-y-3 z-10 shadow-sm">
            {/* BUSCADOR */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por unidad, cliente, ruta..."
                className="pl-9 h-11 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-brand-navy/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* 🚀 FILTROS PRO (Segmented Control) */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setFilterType("activos")}
                className={cn(
                  "flex-1 text-[11px] font-black py-2 rounded-lg transition-all duration-200 uppercase tracking-wider",
                  filterType === "activos"
                    ? "bg-white shadow-sm text-brand-navy ring-1 ring-slate-200/50"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                En Curso
              </button>
              <button
                onClick={() => setFilterType("completados")}
                className={cn(
                  "flex-1 text-[11px] font-black py-2 rounded-lg transition-all duration-200 uppercase tracking-wider",
                  filterType === "completados"
                    ? "bg-white shadow-sm text-brand-navy ring-1 ring-slate-200/50"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                Completados
              </button>
              <button
                onClick={() => setFilterType("todos")}
                className={cn(
                  "flex-1 text-[11px] font-black py-2 rounded-lg transition-all duration-200 uppercase tracking-wider",
                  filterType === "todos"
                    ? "bg-white shadow-sm text-brand-navy ring-1 ring-slate-200/50"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                Todos
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-2 bg-slate-50/30">
            <div className="space-y-3 pb-4 pt-2">
              {isLoading ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400 space-y-3 mt-10">
                  <Activity className="h-8 w-8 animate-pulse text-blue-500" />
                  <p className="text-sm font-bold">Localizando flota...</p>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400 space-y-3 mt-10">
                  <div className="bg-slate-100 p-4 rounded-full mb-2">
                    <Filter className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 text-center leading-tight">
                    No se encontraron viajes <br />
                    <span className="text-brand-navy">"{filterType}"</span>
                  </p>
                  {search && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      que coincidan con "{search}"
                    </p>
                  )}
                </div>
              ) : (
                filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className={cn(
                      "group p-4 rounded-2xl border cursor-pointer transition-all duration-200",
                      selectedTrip?.id === trip.id
                        ? "bg-blue-50/60 border-brand-navy/30 shadow-md ring-1 ring-brand-navy/10"
                        : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300",
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="font-black text-brand-navy text-sm tracking-tight">
                          {trip.public_id || `TRP-${trip.id}`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {trip.client?.razon_social?.substring(0, 22) ||
                            "Sin Cliente"}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase text-[9px] font-black tracking-widest px-2 py-0.5",
                          getStatusColor(trip.status),
                        )}
                      >
                        {trip.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="relative pl-1 my-3">
                      <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-slate-200 rounded-full" />
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="bg-white rounded-full p-0.5">
                            <CircleDot className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {trip.origin}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="bg-white rounded-full p-0.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 truncate">
                            {trip.destination}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100/80">
                      <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/80 px-2 py-1 rounded-md">
                        <Truck className="h-3 w-3 mr-1.5 text-brand-navy" />
                        {trip.legs?.[0]?.unit?.numero_economico || "N/A"}
                      </div>
                      <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
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
        <Card className="md:col-span-8 flex flex-col h-full shadow-sm border-slate-200/60 rounded-2xl overflow-hidden bg-white">
          {!selectedTrip ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 bg-slate-50/30">
              <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                <Navigation className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">
                Selecciona un viaje para ver su bitácora operativa
              </p>
            </div>
          ) : (
            <>
              {/* HEADER DEL DETALLE */}
              <CardHeader className="p-6 border-b border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <CardTitle className="text-2xl font-black text-brand-navy tracking-tight">
                      Viaje {selectedTrip.public_id || `TRP-${selectedTrip.id}`}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase text-[10px] tracking-widest px-2.5 py-0.5 shadow-sm",
                        getStatusColor(selectedTrip.status),
                      )}
                    >
                      {selectedTrip.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-slate-500 font-medium gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    Cliente:{" "}
                    <span className="font-bold text-slate-700">
                      {selectedTrip.client?.razon_social || "Ruta Libre"}
                    </span>
                  </div>
                </div>

                {/* Mostrar botón solo si el viaje no está cerrado */}
                {String(selectedTrip.status) !== "cerrado" &&
                  String(selectedTrip.status) !== "liquidado" && (
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-brand-navy hover:bg-brand-navy/90 text-white font-black h-12 px-6 shadow-lg shadow-brand-navy/20 rounded-xl transition-all active:scale-95"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Actualizar Bitácora
                    </Button>
                  )}
              </CardHeader>

              <ScrollArea className="flex-1 bg-slate-50/50">
                <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
                  {/* TARJETAS DE INFORMACIÓN (UNIDAD Y OPERADOR) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                      <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Truck className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Tractocamión Asignado
                        </p>
                        <p className="text-lg font-black text-brand-navy leading-tight mt-0.5">
                          {activeLeg?.unit?.numero_economico || "Sin Asignar"}
                        </p>
                        {(activeLeg?.unit as any)?.odometro && (
                          <div className="mt-2">
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5"
                            >
                              ODO:{" "}
                              {(
                                activeLeg?.unit as any
                              ).odometro.toLocaleString()}{" "}
                              km
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                      <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Operador en Turno
                        </p>
                        <p className="text-lg font-black text-brand-navy leading-tight mt-0.5 truncate">
                          {activeLeg?.operator?.name || "Sin Asignar"}
                        </p>
                        {activeLeg?.operator?.phone && (
                          <p className="text-xs font-bold text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {activeLeg.operator.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LÍNEA DE TIEMPO (TIMELINE) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                    <h3 className="text-sm font-black text-brand-navy uppercase tracking-widest flex items-center gap-2 mb-8 border-b border-slate-100 pb-4">
                      <FileText className="h-4 w-4 text-blue-500" /> Historial
                      de Eventos
                    </h3>

                    {timelineEvents.length === 0 ? (
                      <div className="text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30 text-slate-500" />
                        <p className="text-sm font-bold text-slate-500">
                          Sin historial registrado
                        </p>
                        <p className="text-xs mt-1">
                          Las novedades se mostrarán aquí una vez reportadas.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
                        {timelineEvents.map((event, idx) => {
                          const config = getTimelineConfig(
                            event.event,
                            event.event_type,
                          );
                          return (
                            <div key={idx} className="relative pl-8 group">
                              {/* Círculo del Timeline */}
                              <div className="absolute -left-[17px] top-1 h-8 w-8 rounded-full border-[3px] border-white bg-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                {config.icon}
                              </div>

                              <div
                                className={cn(
                                  "p-4 rounded-xl border transition-all relative",
                                  config.bg,
                                  config.border,
                                  "group-hover:shadow-md",
                                )}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(event.time).toLocaleString()}
                                    </span>

                                    {/* 🚀 MOSTRAR COORDENADAS SI EXISTEN (Esto quita tu error) */}
                                    {(event.lat || event.lng) && (
                                      <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit border border-blue-100">
                                        <Compass className="h-2.5 w-2.5" />{" "}
                                        {event.lat}, {event.lng}
                                      </span>
                                    )}
                                  </div>

                                  {/* 🚀 BOTÓN DE ACCIONES (3 PUNTITOS) */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleEditEvent(event)}
                                        className="text-brand-navy"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 mr-2" />{" "}
                                        Editar detalles
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() =>
                                          handleDeleteEvent(event.id!)
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                                        Eliminar reporte
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <p className="text-sm font-bold text-slate-800">
                                  {event.event}
                                </p>

                                {/* 🚀 COMENTARIOS SEPARADOS */}
                                {event.comments && (
                                  <p className="text-xs text-slate-500 italic bg-white/40 p-2 rounded-lg border border-slate-100 mt-2">
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
    </div>
  );
}
