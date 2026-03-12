// src/features/despacho/TripPlanner.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2,
  Clock,
  LayoutGrid,
  Link as LinkIcon,
  List,
  Trash2,
  Truck,
  User,
  Banknote,
  Loader2,
  MoreVertical,
  AlertCircle,
  Eye,
  CalendarDays,
  PlayCircle,
  MapPin,
  Box,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  DndContext,
  DragEndEvent,
  closestCorners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";

import { useTrips } from "@/hooks/useTrips";
import { useUnits } from "@/hooks/useUnits";
import { Trip, TripLeg, TripStatus } from "@/types/api.types";

import {
  UpdateStatusModal,
  StatusUpdateData,
} from "@/features/monitoreo/UpdateStatusModal";
import TripSettlementModal from "@/features/cierre/TripSettlementModal";
import { NextLegModal } from "@/features/despacho/NextLegModal";
import { TripDetailsModal } from "@/features/despacho/TripDetailsModal";
import { toast } from "sonner";

// =====================
// Interfaces & Helpers
// =====================

type KanbanColumnId =
  | "creado"
  | "en_transito"
  | "desenganchado"
  | "por_liquidar";

interface KanbanItem {
  leg: TripLeg;
  tripPadre: Trip;
}

const normalizeStatus = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .split(" ")
    .join("_");

const isColumnId = (id: unknown): id is KanbanColumnId =>
  ["creado", "en_transito", "desenganchado", "por_liquidar"].includes(
    id as string,
  );

// 🚀 REGLA DE NEGOCIO: Separar Desenganchados de Por Liquidar
const groupKeyFromStatusAndLeg = (
  rawStatus: unknown,
  legType: string,
): KanbanColumnId | null => {
  const s = normalizeStatus(rawStatus);
  if (s === "creado") return "creado";
  if (["en_transito", "detenido", "retraso", "accidente"].includes(s))
    return "en_transito";

  if (["entregado", "cerrado"].includes(s)) {
    return legType === "ruta_carretera" ? "desenganchado" : "por_liquidar";
  }
  return null;
};

// 🚀 Helper: Estatus Operativos Reales
const getOperationalStatusBadge = (leg: TripLeg) => {
  const status = normalizeStatus(leg.status);

  if (status === "entregado" && leg.leg_type === "carga_muelle")
    return (
      <Badge className="bg-orange-500 text-white shadow-sm border-0 w-full justify-center py-1">
        📦 CARGADO EN PATIO
      </Badge>
    );
  if (status === "entregado" && leg.leg_type === "ruta_carretera")
    return (
      <Badge className="bg-purple-600 text-white shadow-sm border-0 w-full justify-center py-1">
        ⏳ DESENGANCHADO / EN PATIO
      </Badge>
    );
  if (status === "entregado" && leg.leg_type === "entrega_vacio")
    return (
      <Badge className="bg-emerald-600 text-white shadow-sm border-0 w-full justify-center py-1">
        🏁 FINALIZADO
      </Badge>
    );

  if (status === "en_transito") {
    if (leg.leg_type === "carga_muelle")
      return (
        <Badge className="bg-sky-600 text-white shadow-sm border-0 w-full justify-center py-1">
          🚜 OPERANDO EN MUELLE
        </Badge>
      );
    if (leg.leg_type === "ruta_carretera")
      return (
        <Badge className="bg-blue-600 text-white shadow-sm border-0 w-full justify-center py-1">
          🚚 EN CARRETERA
        </Badge>
      );
    if (leg.leg_type === "entrega_vacio")
      return (
        <Badge className="bg-indigo-500 text-white shadow-sm border-0 w-full justify-center py-1">
          🔄 RETORNANDO VACÍO
        </Badge>
      );
  }

  if (["detenido", "retraso", "accidente"].includes(status)) {
    return (
      <Badge className="bg-red-600 text-white shadow-sm border-0 uppercase animate-pulse w-full justify-center py-1">
        <ShieldAlert className="h-3 w-3 mr-1.5" /> {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="uppercase w-full justify-center bg-slate-100 text-slate-700 py-1"
    >
      {status.replace("_", " ")}
    </Badge>
  );
};

const isIncidentStatus = (status: unknown) => {
  const s = normalizeStatus(status);
  return ["detenido", "retraso", "accidente"].includes(s);
};

// 🚀 4 COLUMNAS KANBAN EXACTAS
const KANBAN_COLUMNS: Array<{
  id: KanbanColumnId;
  title: string;
  subtitle: string;
  icon: any;
  bg: string;
  border: string;
  text: string;
}> = [
  {
    id: "creado",
    title: "En Carga",
    subtitle: "Movimientos en patio",
    icon: Box,
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-700",
  },
  {
    id: "en_transito",
    title: "En Tránsito",
    subtitle: "Operando en carretera",
    icon: Truck,
    bg: "bg-blue-50/60",
    border: "border-blue-200",
    text: "text-blue-800",
  },
  {
    id: "desenganchado",
    title: "Desenganchado",
    subtitle: "Llegó a destino/patio",
    icon: LinkIcon,
    bg: "bg-purple-50/60",
    border: "border-purple-200",
    text: "text-purple-800",
  },
  {
    id: "por_liquidar",
    title: "Por Liquidar",
    subtitle: "Listo para pago",
    icon: Banknote,
    bg: "bg-emerald-50/60",
    border: "border-emerald-200",
    text: "text-emerald-800",
  },
];

const legTypeShort: Record<string, string> = {
  carga_muelle: "F1: CARGA PATIO",
  ruta_carretera: "F2: RUTA CARRETERA",
  entrega_vacio: "F3: ENTREGA VACÍO",
};

// =====================
// KANBAN CARD
// =====================
function KanbanCard({
  leg,
  tripPadre,
  onOpenCommandCenter,
  onDeleteClick,
  onSettleClick,
  onRelayClick,
}: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `leg-${leg.id}`, data: { leg, tripPadre } });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.9 : 1,
        scale: isDragging ? 1.05 : 1,
      }
    : undefined;
  const isIncident = isIncidentStatus(leg.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing group relative"
    >
      <div className="absolute -top-3 -right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white shadow-lg border border-slate-200 rounded-lg p-1 z-10 translate-y-1 group-hover:translate-y-0">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenCommandCenter(tripPadre);
          }}
          className="p-1.5 hover:bg-brand-navy hover:text-white rounded text-brand-navy transition-colors"
          title="Abrir Centro de Mando"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {leg.status === "entregado" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSettleClick(leg, tripPadre);
            }}
            className="p-1.5 hover:bg-emerald-500 hover:text-white rounded text-emerald-600 transition-colors"
            title="Liquidar Tramo"
          >
            <Banknote className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(tripPadre);
          }}
          className="p-1.5 hover:bg-red-500 hover:text-white rounded text-red-600 transition-colors"
          title="Eliminar Viaje Completo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Card
        className={`overflow-hidden transition-all border-l-4 ${isDragging ? "shadow-2xl ring-2 ring-brand-navy" : "shadow-sm hover:shadow-md"} ${isIncident ? "border-l-red-500 bg-red-50/40" : leg.status === "entregado" ? "border-l-emerald-500" : "border-l-brand-navy"}`}
      >
        <CardContent className="p-3.5">
          <div className="flex justify-between items-start mb-3">
            <div className="pr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                {legTypeShort[leg.leg_type] || "TRAMO"}
              </span>
              <span className="text-xs font-black text-slate-800 uppercase leading-tight line-clamp-2">
                {tripPadre.client?.razon_social || "CLIENTE GENERAL"}
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] font-mono bg-slate-50 text-slate-600 shrink-0 shadow-sm"
            >
              #{tripPadre.public_id || tripPadre.id}
            </Badge>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mb-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate">
                {tripPadre.origin || "Origen N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-800">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">
                {tripPadre.destination || "Destino N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-navy bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm w-1/2">
              <Truck className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">
                ECO-{leg.unit?.numero_economico || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm w-1/2">
              <User className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {leg.operator?.name?.split(" ")[0] || "S/A"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            {getOperationalStatusBadge(leg)}
            {(tripPadre.remolque_1_id ||
              tripPadre.dolly_id ||
              tripPadre.remolque_2_id) && (
              <div className="flex flex-wrap gap-1 justify-center">
                {tripPadre.remolque_1_id && (
                  <Badge
                    variant="outline"
                    className="text-[8px] py-0 h-4 border-slate-200 text-slate-500 bg-white"
                  >
                    R1
                  </Badge>
                )}
                {tripPadre.dolly_id && (
                  <Badge
                    variant="outline"
                    className="text-[8px] py-0 h-4 border-blue-200 bg-blue-50 text-blue-700"
                  >
                    D
                  </Badge>
                )}
                {tripPadre.remolque_2_id && (
                  <Badge
                    variant="outline"
                    className="text-[8px] py-0 h-4 border-slate-200 text-slate-500 bg-white"
                  >
                    R2
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================
// KANBAN COLUMN
// =====================
function KanbanColumn({
  column,
  items,
  onOpenCommandCenter,
  onDeleteClick,
  onSettleClick,
  onRelayClick,
}: any) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[350px] rounded-2xl border-2 p-3 flex flex-col h-full transition-colors shadow-sm ${column.bg} ${isOver ? "border-brand-navy border-dashed ring-4 ring-brand-navy/10" : column.border}`}
    >
      <div className="flex items-start justify-between mb-4 px-2 pt-1">
        <div>
          <div
            className={`flex items-center gap-2 font-black text-[15px] uppercase tracking-tight ${column.text}`}
          >
            <Icon className="h-5 w-5" /> {column.title}
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            {column.subtitle}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-white text-slate-800 shadow-sm font-black border border-slate-200 text-sm px-2.5 py-0.5"
        >
          {items.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 min-h-[200px] pb-10 custom-scrollbar">
        {items.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-300/50 rounded-xl text-center text-slate-400 text-sm font-medium bg-white/50">
            Mueve un servicio aquí
          </div>
        ) : (
          items.map((item: any) => (
            <KanbanCard
              key={`leg-${item.leg.id}`}
              leg={item.leg}
              tripPadre={item.tripPadre}
              onOpenCommandCenter={onOpenCommandCenter}
              onDeleteClick={onDeleteClick}
              onSettleClick={onSettleClick}
              onRelayClick={onRelayClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =====================
// MAIN COMPONENT
// =====================
export const TripPlanner = () => {
  const navigate = useNavigate();
  const {
    trips,
    loading,
    updateTripStatus,
    addTimelineEvent,
    deleteTrip,
    createNextLeg,
  } = useTrips();

  const [viewMode, setViewMode] = useState<"table" | "standby" | "kanban">(
    "table",
  );

  const [tripToView, setTripToView] = useState<Trip | null>(null);
  const { updateLoadStatus } = useUnits();
  const [selectedTripPadre, setSelectedTripPadre] = useState<Trip | null>(null);
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

  // 🚀 ESTADOS PARA EL CALENDARIO TIPO GOOGLE
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleNextLegSubmit = async (tripId: string, payload: any) => {
    const res = await createNextLeg(tripId, payload);
    return !!res;
  };

  React.useEffect(() => {
    if (tripToView) {
      const updatedTrip = trips.find((t) => t.id === tripToView.id);
      if (updatedTrip) setTripToView(updatedTrip);
    }
  }, [trips]);

  const standbyTrips = useMemo(
    () =>
      trips.filter(
        (t) => t.status === "creado" && (!t.legs || t.legs.length === 0),
      ),
    [trips],
  );

  const allActiveLegs = useMemo(() => {
    const safeTrips = Array.isArray(trips) ? trips : [];
    const items: KanbanItem[] = [];
    for (const trip of safeTrips) {
      if (trip.status === "cerrado") continue;
      if (trip.legs && trip.legs.length > 0) {
        const activeLeg = trip.legs.find((leg) => leg.status !== "cerrado");
        if (activeLeg) items.push({ leg: activeLeg, tripPadre: trip });
      }
    }
    return items.sort((a, b) => b.leg.id - a.leg.id);
  }, [trips]);

  const groupedLegs = useMemo(() => {
    const groups: Record<KanbanColumnId, KanbanItem[]> = {
      creado: [],
      en_transito: [],
      desenganchado: [],
      por_liquidar: [],
    };
    for (const item of allActiveLegs) {
      const key = groupKeyFromStatusAndLeg(item.leg.status, item.leg.leg_type);
      if (key) groups[key].push(item);
    }
    return groups;
  }, [allActiveLegs]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragId = String(active.id).replace("leg-", "");
    const legId = parseInt(dragId, 10);
    if (isNaN(legId)) return;

    const columnId = isColumnId(over.id) ? over.id : null;
    if (!columnId) return;

    const draggedItem = allActiveLegs.find((item) => item.leg.id === legId);
    if (!draggedItem) return;

    // 🚀 Ajuste oficial de estatus para BD al arrastrar a Desenganchado/Liquidar
    const targetStatus =
      columnId === "desenganchado" || columnId === "por_liquidar"
        ? "entregado"
        : (columnId as TripStatus);
    if (normalizeStatus(draggedItem.leg.status) === targetStatus) return;

    await updateTripStatus(
      String(draggedItem.tripPadre.id),
      targetStatus,
      "Movimiento en Pizarrón",
    );
  };

  const handleSaveStatusEvent = async (data: StatusUpdateData) => {
    if (!selectedTripPadre) return;
    const activeLeg =
      selectedLegToUpdate ||
      selectedTripPadre.legs?.find((l) => l.status !== "cerrado") ||
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
      if (data.status === "entregado") {
        toast.success("Servicio reportado como Entregado. Ya puedes liquidar.");
        if (activeLeg.leg_type === "entrega_vacio") {
          if (selectedTripPadre.remolque_1_id)
            await updateLoadStatus(selectedTripPadre.remolque_1_id, false);
          if (selectedTripPadre.remolque_2_id)
            await updateLoadStatus(selectedTripPadre.remolque_2_id, false);
        }
      }
    }
  };

  // ==========================================
  // 🚀 LÓGICA DE CALENDARIO MENSUAL TIPO GOOGLE
  // ==========================================
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Empezar en Lunes
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

  if (loading)
    return (
      <div className="p-12 text-center text-brand-navy flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-brand-navy" />
        <p className="font-medium animate-pulse">
          Cargando Tablero de Despacho...
        </p>
      </div>
    );

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR SUPERIOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <h2 className="text-xl font-black text-brand-navy flex items-center gap-3 px-2 uppercase tracking-tighter">
          <Truck className="h-6 w-6 text-blue-600" /> Control de Tráfico
        </h2>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as any)}
          className="w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0"
        >
          <TabsList className="grid w-full min-w-[450px] grid-cols-3 h-12 bg-slate-100 rounded-xl p-1.5 shadow-inner">
            <TabsTrigger
              value="table"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-navy"
            >
              <List className="h-4 w-4 mr-2" /> Lista
            </TabsTrigger>
            <TabsTrigger
              value="standby"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-navy"
            >
              <CalendarDays className="h-4 w-4 mr-2" /> Planeador{" "}
              {standbyTrips.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 bg-blue-100 text-blue-700 h-5 px-1.5 border-0"
                >
                  {standbyTrips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-navy"
            >
              <LayoutGrid className="h-4 w-4 mr-2" /> Pizarrón
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* VISTA 1: TABLA PRINCIPAL */}
      {viewMode === "table" && (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <DataTable>
              <DataTableHeader className="bg-slate-50 border-b border-slate-200">
                <DataTableRow>
                  <DataTableHead className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">
                    Folio / Cliente
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">
                    Fase del Servicio
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">
                    Origen ➔ Destino
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">
                    Asignación Física
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700 text-center uppercase tracking-widest text-[10px]">
                    Estatus Operativo
                  </DataTableHead>
                  <DataTableHead className="text-right font-bold text-slate-700 pr-6 uppercase tracking-widest text-[10px]">
                    Acciones
                  </DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {allActiveLegs.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={6}
                      className="text-center py-16 text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Truck className="h-12 w-12 mb-3 opacity-20" />
                        <span className="font-medium text-lg text-slate-500">
                          No hay servicios en ruta.
                        </span>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  allActiveLegs.map(({ leg, tripPadre }) => {
                    const isIncident = isIncidentStatus(leg.status);
                    return (
                      <DataTableRow
                        key={leg.id}
                        className={`hover:bg-slate-50 transition-colors ${isIncident ? "bg-red-50/40" : ""}`}
                      >
                        <DataTableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-brand-navy uppercase">
                              {tripPadre.client?.razon_social ||
                                "CLIENTE GENERAL"}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500">
                              VIAJE #{tripPadre.public_id || tripPadre.id}
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge
                              variant="outline"
                              className="w-fit bg-slate-100 text-slate-700 font-bold text-[10px]"
                            >
                              {legTypeShort[leg.leg_type] || leg.leg_type}
                            </Badge>
                            <span
                              className="text-[11px] text-slate-500 font-medium uppercase truncate max-w-[150px]"
                              title={tripPadre.route_name}
                            >
                              {tripPadre.route_name || "Ruta Estándar"}
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-600 truncate max-w-[180px]">
                                {tripPadre.origin}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                                {tripPadre.destination}
                              </span>
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-brand-navy">
                              <Truck className="h-3.5 w-3.5 text-slate-400" />{" "}
                              {leg.unit?.numero_economico || "Sin Unidad"}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <User className="h-3.5 w-3.5 text-slate-400" />{" "}
                              {leg.operator?.name || "Sin Operador"}
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {getOperationalStatusBadge(leg)}
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-slate-200 rounded-lg"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 rounded-xl p-1 shadow-xl"
                            >
                              <DropdownMenuItem
                                onClick={() => setTripToView(tripPadre)}
                                className="rounded-lg cursor-pointer py-2"
                              >
                                <Eye className="h-4 w-4 mr-3 text-slate-400" />{" "}
                                <span className="font-medium">
                                  Abrir Centro de Mando
                                </span>
                              </DropdownMenuItem>
                              {leg.status === "entregado" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setLegToSettle({ leg, tripPadre })
                                  }
                                  className="rounded-lg cursor-pointer py-2 text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800"
                                >
                                  <Banknote className="h-4 w-4 mr-3" />{" "}
                                  <span className="font-bold">
                                    Liquidar a Operador
                                  </span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                onClick={() => setTripToDelete(tripPadre)}
                                className="rounded-lg cursor-pointer py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />{" "}
                                <span className="font-bold">
                                  Eliminar Viaje
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })
                )}
              </DataTableBody>
            </DataTable>
          </CardContent>
        </Card>
      )}

      {/* 🚀 VISTA 2: PLANEADOR CALENDARIO MENSUAL TIPO GOOGLE */}
      {viewMode === "standby" && (
        <div className="flex flex-col xl:flex-row gap-6">
          {/* ALERTAS LATERALES (Atrasados y Sin Fecha) */}
          {(delayedTrips.length > 0 || unscheduledTrips.length > 0) && (
            <div className="w-full xl:w-64 flex flex-col gap-4">
              {delayedTrips.length > 0 && (
                <Card className="bg-rose-50 border-rose-200 shadow-sm">
                  <CardHeader className="p-3 border-b border-rose-200 bg-rose-100/50 rounded-t-xl text-center">
                    <CardTitle className="text-sm font-black text-rose-800 uppercase flex items-center justify-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Atrasados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {delayedTrips.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white p-2 rounded-lg border border-rose-100 text-xs shadow-sm"
                      >
                        <p className="font-bold text-slate-800 truncate mb-1">
                          {v.client?.razon_social}
                        </p>
                        <p className="text-slate-500 truncate">
                          {v.origin} ➔ {v.destination}
                        </p>
                        <Button
                          size="sm"
                          className="w-full h-7 mt-2 bg-brand-navy text-white text-[10px]"
                          onClick={() =>
                            setLegToRelay({ leg: {} as TripLeg, tripPadre: v })
                          }
                        >
                          Asignar
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {unscheduledTrips.length > 0 && (
                <Card className="bg-slate-50 border-slate-200 shadow-sm">
                  <CardHeader className="p-3 border-b border-slate-200 bg-slate-100 rounded-t-xl text-center">
                    <CardTitle className="text-sm font-black text-slate-700 uppercase">
                      Sin Fecha Asignada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {unscheduledTrips.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white p-2 rounded-lg border border-slate-200 text-xs shadow-sm"
                      >
                        <p className="font-bold text-slate-800 truncate mb-1">
                          {v.client?.razon_social}
                        </p>
                        <p className="text-slate-500 truncate">
                          {v.origin} ➔ {v.destination}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 mt-2 text-[10px]"
                          onClick={() =>
                            setLegToRelay({ leg: {} as TripLeg, tripPadre: v })
                          }
                        >
                          Asignar
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* CALENDARIO GRID */}
          <Card className="flex-1 shadow-md border-slate-200 bg-white">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-slate-50 rounded-t-xl">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-black text-brand-navy uppercase tracking-widest capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-black text-slate-500 uppercase"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-slate-200 gap-px">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isDiaHoy = isToday(day);
                  const tripsOnDay = getTripsForDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[140px] bg-white flex flex-col transition-colors ${!isCurrentMonth ? "bg-slate-50 opacity-50" : ""} ${isDiaHoy ? "bg-blue-50/20" : ""}`}
                    >
                      {/* Cabecera del Día */}
                      <div
                        className={`p-2 flex justify-between items-center border-b border-slate-100 ${isDiaHoy ? "bg-blue-100 text-blue-800" : "text-slate-500"}`}
                      >
                        <span
                          className={`text-sm font-bold ${isDiaHoy ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm" : ""}`}
                        >
                          {format(day, "d")}
                        </span>
                        <button
                          onClick={() =>
                            navigate(
                              `/despacho/nuevo?date=${format(day, "yyyy-MM-dd")}`,
                            )
                          }
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${!isCurrentMonth ? "hidden" : ""}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* Contenido (Viajes) */}
                      <div className="flex-1 p-1.5 overflow-y-auto max-h-[120px] custom-scrollbar space-y-1.5">
                        {tripsOnDay.map((v) => (
                          <div
                            key={v.id}
                            onClick={() =>
                              setLegToRelay({
                                leg: {} as TripLeg,
                                tripPadre: v,
                              })
                            }
                            className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] p-1.5 rounded cursor-pointer hover:bg-emerald-100 hover:shadow-sm transition-all relative group"
                          >
                            <div className="font-bold truncate pr-4">
                              {v.client?.razon_social}
                            </div>
                            <div className="text-emerald-600 truncate">
                              {v.destination}
                            </div>
                            <PlayCircle className="h-3 w-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VISTA 3: PIZARRON KANBAN OPERATIVO GUSTAVO */}
      {viewMode === "kanban" && (
        <DndContext
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6 min-h-[65vh] items-start mt-2 px-1 custom-scrollbar">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                items={groupedLegs[column.id] || []}
                onOpenCommandCenter={setTripToView}
                onDeleteClick={setTripToDelete}
                onSettleClick={(leg: TripLeg, tripPadre: Trip) => {
                  setLegToSettle({ leg, tripPadre });
                }}
                onRelayClick={(leg: TripLeg, tripPadre: Trip) => {
                  setLegToRelay({ leg, tripPadre });
                }}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* MODALES */}
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

      <Dialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-black text-xl">
              Eliminar Viaje
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTripToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (tripToDelete) {
                  await deleteTrip(String(tripToDelete.id));
                  setTripToDelete(null);
                }
              }}
            >
              Eliminar Viaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <Dialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-black text-xl">
              Eliminar Viaje
            </DialogTitle>
            <DialogDescription>
              Esta acción borrará todas las fases permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTripToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (tripToDelete) {
                  await deleteTrip(String(tripToDelete.id));
                  setTripToDelete(null);
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NextLegModal
        open={!!legToRelay}
        onOpenChange={(open) => !open && setLegToRelay(null)}
        tripPadre={legToRelay?.tripPadre || null}
        onSubmit={handleNextLegSubmit}
      />
      <TripSettlementModal
        open={!!legToSettle}
        onOpenChange={(open) => !open && setLegToSettle(null)}
        leg={legToSettle?.leg || null}
        tripPadre={legToSettle?.tripPadre || null}
      />
      <TripDetailsModal
        open={!!tripToView}
        onOpenChange={(open) => !open && setTripToView(null)}
        trip={tripToView}
        onIncidentClick={(t) => openUpdateStatusModal(t)}
        onRelayClick={(l, t) => setLegToRelay({ leg: l, tripPadre: t })}
        onSettleClick={(l, t) => setLegToSettle({ leg: l, tripPadre: t })}
        onUpdateStatusClick={(t, l) => openUpdateStatusModal(t, l)}
      />
    </div>
  );
};
