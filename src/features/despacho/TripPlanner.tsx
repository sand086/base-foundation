// src/features/despacho/TripPlanner.tsx
import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MapPin,
  Navigation,
  Trash2,
  Truck,
  User,
  Banknote,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTrips } from "@/hooks/useTrips";
import { Trip, TripLeg, TripStatus } from "@/types/api.types";

import {
  UpdateStatusModal,
  StatusUpdateData,
} from "@/features/monitoreo/UpdateStatusModal";
import { TripSettlementModal } from "@/features/cierre/TripSettlementModal";
import { NextLegModal } from "@/features/despacho/NextLegModal"; // <--- AGREGAR ESTA LÍNEA
import { TripDetailsModal } from "@/features/despacho/TripDetailsModal";
import { TripMapPlaceholder } from "@/features/monitoreo/TripMapPlaceholder";

// =====================
// Interfaces & Helpers
// =====================
type KanbanColumnId = "creado" | "en_transito" | "detenido" | "entregado";

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
  ["creado", "en_transito", "detenido", "entregado"].includes(id as string);

// ✅ SOLUCIÓN ERROR 3: Se agregó la función faltante
const groupKeyFromStatus = (rawStatus: unknown): KanbanColumnId | null => {
  const s = normalizeStatus(rawStatus);
  if (s === "creado") return "creado";
  if (s === "en_transito") return "en_transito";
  if (["detenido", "retraso", "accidente"].includes(s)) return "detenido";
  if (["entregado", "cerrado"].includes(s)) return "entregado";
  return null;
};

const getStatusColor = (status: unknown) => {
  const s = normalizeStatus(status);
  switch (s) {
    case "creado":
      return "bg-slate-100 text-slate-700";
    case "en_transito":
      return "bg-blue-100 text-blue-700";
    case "detenido":
    case "retraso":
    case "accidente":
      return "bg-amber-100 text-amber-700";
    case "entregado":
    case "cerrado":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getTrackingUrl = (trip: Trip): string | null => {
  const t = trip as any;
  return t?.tracking_url || t?.trackingUrl || null;
};

const KANBAN_COLUMNS: Array<{
  id: KanbanColumnId;
  title: string;
  statuses: string[];
  icon: any;
  bg: string;
  border: string;
  text: string;
}> = [
  {
    id: "creado",
    title: "En Patio / Creados",
    statuses: ["creado"],
    icon: Clock,
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-700",
  },
  {
    id: "en_transito",
    title: "En Tránsito",
    statuses: ["en_transito"],
    icon: Truck,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  {
    id: "detenido",
    title: "Retrasos / Detenidos",
    statuses: ["detenido", "retraso", "accidente"],
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  {
    id: "entregado",
    title: "Entregados",
    statuses: ["entregado", "cerrado"],
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
];

// =====================
// KANBAN CARD
// =====================
function KanbanCard({
  leg,
  tripPadre,
  onClick,
  onEditClick,
  onDeleteClick,
  onSettleClick,
  onRelayClick,
}: {
  leg: TripLeg;
  tripPadre: Trip;
  onClick: (l: TripLeg, t: Trip) => void;
  onEditClick: (t: Trip) => void;
  onDeleteClick: (t: Trip) => void;
  onSettleClick: (l: TripLeg) => void;
  onRelayClick: (l: TripLeg, t: Trip) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `leg-${leg.id}`,
      data: { leg, tripPadre },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;
  const trackingUrl = getTrackingUrl(tripPadre);

  const legTypeLabels: Record<string, string> = {
    carga_muelle: "CARGA (MUELLE)",
    ruta_carretera: "RUTA CARRETERA",
    entrega_vacio: "ENTREGA VACÍO",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing group relative"
    >
      <div className="absolute -top-3 -right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white shadow-md border border-slate-200 rounded-lg p-1 z-10 translate-y-1 group-hover:translate-y-0">
        {/* BOTÓN DE DESENGANCHE / RELEVO */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRelayClick(leg, tripPadre);
          }}
          className="p-1.5 hover:bg-sky-50 rounded text-sky-600"
          title="Desenganchar / Relevo"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            // ¡Pasamos el viaje completo, no solo el tramo!
            onEditClick(tripPadre);
          }}
          className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600"
          title="Ver Expediente Completo"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        {leg.status === "entregado" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSettleClick(leg);
            }}
            className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600"
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
            onClick(leg, tripPadre);
          }}
          className="p-1.5 hover:bg-blue-50 rounded text-brand-navy"
          title="Torre de Control"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(tripPadre);
          }}
          className="p-1.5 hover:bg-red-50 rounded text-red-600"
          title="Eliminar Viaje Completo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Card
        className={`overflow-hidden shadow-sm transition-all border-slate-200 ${isDragging ? "ring-2 ring-brand-navy shadow-xl scale-[1.02]" : "hover:shadow-md hover:border-slate-300"}`}
      >
        <CardContent className="p-3">
          <div className="flex flex-col mb-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase truncate leading-tight">
                {tripPadre.client?.razon_social || "CLIENTE GENERAL"}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-mono px-1 h-4 bg-slate-50 text-slate-500 shrink-0"
              >
                #{tripPadre.public_id || tripPadre.id}
              </Badge>
            </div>
            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter truncate mt-0.5">
              {legTypeLabels[leg.leg_type] || "TRAMO"} -{" "}
              {tripPadre.route_name || "RUTA"}
            </span>
          </div>

          <div className="bg-slate-50/80 rounded border border-slate-100 p-1.5 mb-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[10px] text-slate-600 truncate leading-none">
                {tripPadre.origin || "Origen N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] font-medium text-slate-800 truncate leading-none">
                {tripPadre.destination || "Destino N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              <Truck className="h-3 w-3 text-slate-400" />
              <span className="truncate max-w-[60px]">
                {leg.unit?.numero_economico || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              <User className="h-3 w-3 text-slate-400" />
              <span className="truncate max-w-[70px]">
                {leg.operator?.name?.split(" ")[0] || "N/A"}
              </span>
            </div>
          </div>

          {(tripPadre.remolque_1_id ||
            tripPadre.dolly_id ||
            tripPadre.remolque_2_id) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tripPadre.remolque_1_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-slate-200 text-slate-400"
                >
                  R1
                </Badge>
              )}
              {tripPadre.dolly_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-blue-100 bg-blue-50 text-blue-500"
                >
                  D
                </Badge>
              )}
              {tripPadre.remolque_2_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-slate-200 text-slate-400"
                >
                  R2
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="h-2.5 w-2.5" />
              {leg.start_date
                ? format(new Date(leg.start_date), "dd/MM HH:mm")
                : "--/--"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ SOLUCIÓN ERROR 2: Interfaz tipada para la columna
function KanbanColumn({
  column,
  items,
  onTripClick,
  onEditClick,
  onDeleteClick,
  onSettleClick,
  onRelayClick,
}: {
  column: any;
  items: KanbanItem[];
  onTripClick: (l: TripLeg, t: Trip) => void;
  onEditClick: (t: Trip) => void;
  onDeleteClick: (t: Trip) => void;
  onSettleClick: (l: TripLeg) => void;
  onRelayClick: (l: TripLeg, t: Trip) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[320px] rounded-xl border-2 p-3 flex flex-col h-full transition-colors ${column.bg} ${isOver ? "border-brand-navy border-dashed bg-slate-100" : column.border}`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className={`flex items-center gap-2 font-bold ${column.text}`}>
          <Icon className="h-4 w-4" /> {column.title}
        </div>
        <Badge variant="secondary" className="bg-white/60 text-slate-700">
          {items.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 min-h-[150px]">
        {items.length === 0 ? (
          <div className="p-4 border-2 border-dashed border-slate-300/50 rounded-lg text-center text-slate-400 text-sm">
            Soltar tramo aquí
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={`leg-${item.leg.id}`}
              leg={item.leg}
              tripPadre={item.tripPadre}
              onClick={onTripClick}
              onEditClick={onEditClick}
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
// Main component
// =====================
export const TripPlanner = () => {
  const { trips, loading, updateTripStatus, addTimelineEvent, deleteTrip } =
    useTrips();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  const [selectedLeg, setSelectedLeg] = useState<TripLeg | null>(null);
  const [selectedTripPadre, setSelectedTripPadre] = useState<Trip | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [tripToView, setTripToView] = useState<Trip | null>(null);
  const [legToSettle, setLegToSettle] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  // Estados para el Modal de Relevo (Desenganche)
  const [legToRelay, setLegToRelay] = useState<{
    leg: TripLeg;
    tripPadre: Trip;
  } | null>(null);
  const { createNextLeg } = useTrips();

  const handleNextLegSubmit = async (tripId: string, payload: any) => {
    const res = await createNextLeg(tripId, payload);
    return !!res;
  };

  const safeTrips = Array.isArray(trips) ? trips : [];

  // 🚀 EXTRAEMOS TODOS LOS TRAMOS DE TODOS LOS VIAJES PARA EL KANBAN
  // 🚀 EXTRAEMOS EL TRAMO ACTIVO DE CADA VIAJE
  const allActiveLegs = useMemo(() => {
    const items: KanbanItem[] = [];

    for (const trip of safeTrips) {
      if (trip.legs && trip.legs.length > 0) {
        // 1. Buscamos si hay algún tramo que NO esté entregado o cerrado
        let activeLeg = trip.legs.find(
          (leg) => leg.status !== "entregado" && leg.status !== "cerrado",
        );

        // 2. Si no hay ninguno "en proceso", mostramos el último cronológicamente
        if (!activeLeg) {
          // Ordenamos por ID de mayor a menor para asegurar que agarramos el último creado
          const sortedLegs = [...trip.legs].sort((a, b) => b.id - a.id);
          activeLeg = sortedLegs[0];
        }

        if (activeLeg) {
          items.push({ leg: activeLeg, tripPadre: trip });
        }
      }
    }
    return items;
  }, [safeTrips]);

  const groupedLegs = useMemo(() => {
    const groups: Record<KanbanColumnId, KanbanItem[]> = {
      creado: [],
      en_transito: [],
      detenido: [],
      entregado: [],
    };
    for (const item of allActiveLegs) {
      const key = groupKeyFromStatus(item.leg.status);
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

    const targetColumn = KANBAN_COLUMNS.find((c) => c.id === columnId);
    if (!targetColumn) return;

    const targetStatus = normalizeStatus(
      targetColumn.statuses[0],
    ) as TripStatus;
    if (
      targetColumn.statuses
        .map(normalizeStatus)
        .includes(normalizeStatus(draggedItem.leg.status))
    )
      return;

    // Actualizamos el status en BD
    await updateTripStatus(
      String(draggedItem.tripPadre.id),
      targetStatus,
      "Actualizado en Pizarrón",
    );
  };

  const handleSaveStatusEvent = async (data: StatusUpdateData) => {
    if (!selectedTripPadre) return;
    const ok = await addTimelineEvent(String(selectedTripPadre.id), {
      status: data.status,
      location: data.location,
      comments: data.comments,
      lat: data.lat,
      lng: data.lng,
      notifyClient: data.notifyClient,
    });
    if (ok) setUpdateModalOpen(false);
  };

  if (loading)
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        Cargando tablero de tráfico...
      </div>
    );

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* View controls */}
      <div className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-2 uppercase tracking-wide">
          Monitor de Tramos (Desenganches)
        </h2>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "kanban" | "table")}
        >
          <TabsList className="grid w-[200px] grid-cols-2 h-9 bg-slate-100">
            <TabsTrigger value="kanban" className="text-xs">
              <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="table" className="text-xs" disabled>
              <List className="h-4 w-4 mr-1" /> Lista
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[55vh] items-start mt-2">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={groupedLegs[column.id] || []}
              onTripClick={(leg: TripLeg, trip: Trip) => {
                setSelectedLeg(leg);
                setSelectedTripPadre(trip);
              }}
              onEditClick={setTripToView}
              onDeleteClick={setTripToDelete}
              onSettleClick={(leg: TripLeg) => setLegToSettle(String(leg.id))}
              onRelayClick={(leg: TripLeg, trip: Trip) =>
                setLegToRelay({ leg, tripPadre: trip })
              }
            />
          ))}
        </div>
      </DndContext>

      {/* ========================================= */}
      {/* 🚀 SHEET: TORRE DE CONTROL (Del Tramo Activo) */}
      {/* ========================================= */}
      <Sheet
        open={!!selectedLeg}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLeg(null);
            setSelectedTripPadre(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-slate-50/80">
          {selectedLeg && selectedTripPadre && (
            <>
              <SheetHeader className="p-5 border-b bg-white shadow-sm sticky top-0 z-20 flex flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center shadow-inner shrink-0">
                    <Navigation className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col text-left">
                    <SheetTitle className="text-lg font-black text-slate-800 leading-tight">
                      {selectedTripPadre.client?.razon_social || "Cliente"}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className="font-mono px-2 h-4 bg-slate-100 text-slate-500"
                      >
                        #{selectedTripPadre.public_id || selectedTripPadre.id}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium uppercase">
                        {selectedLeg.leg_type.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={`${getStatusColor(selectedLeg.status)} border-0 uppercase text-xs px-3 py-1 shadow-sm`}
                  >
                    {normalizeStatus(selectedLeg.status).replace("_", " ")}
                  </Badge>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-navy/80"></div>
                      <div className="space-y-4 pl-1">
                        <div className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                              Origen
                            </p>
                            <p className="text-sm font-semibold">
                              {selectedTripPadre.origin}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                              Destino
                            </p>
                            <p className="text-sm font-semibold">
                              {selectedTripPadre.destination}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">
                        Recursos del Tramo
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 font-medium uppercase">
                              Tracto
                            </p>
                            <p className="text-sm font-bold truncate">
                              {selectedLeg.unit?.numero_economico || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 font-medium uppercase">
                              Operador
                            </p>
                            <p className="text-sm font-bold truncate">
                              {selectedLeg.operator?.name || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-5 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-brand-navy" /> Historia
                      Completa del Servicio
                    </h4>
                    <div className="space-y-1 pl-1">
                      {(() => {
                        const allEvents =
                          selectedTripPadre.legs
                            ?.flatMap((leg) =>
                              (leg.timeline_events || []).map((ev) => ({
                                ...ev,
                                // Agregamos una etiqueta visual para saber en qué fase ocurrió
                                legName: leg.leg_type
                                  .replace("_", " ")
                                  .toUpperCase(),
                              })),
                            )
                            .sort(
                              (a, b) =>
                                new Date(a.time).getTime() -
                                new Date(b.time).getTime(),
                            ) || [];

                        if (allEvents.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground italic text-center">
                              Sin eventos registrados en todo el servicio.
                            </p>
                          );
                        }

                        return allEvents.map((event, idx) => (
                          <div key={event.id || idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-3 h-3 rounded-full mt-1 ring-4 ring-white shadow-sm ${event.event_type === "alert" ? "bg-red-500" : "bg-blue-500"}`}
                              />
                              {idx < allEvents.length - 1 && (
                                <div className="w-[2px] flex-1 bg-slate-100 my-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-5">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 h-4 bg-slate-100 text-slate-500"
                                >
                                  {event.legName}
                                </Badge>
                                <p className="text-[11px] font-mono text-slate-400">
                                  {format(
                                    new Date(event.time),
                                    "dd MMM yyyy - HH:mm",
                                  )}
                                </p>
                              </div>
                              <p className="text-sm font-medium leading-snug text-slate-800">
                                {event.event}
                              </p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20">
                <Button
                  className="w-full h-11 text-sm font-semibold gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white"
                  onClick={() => setUpdateModalOpen(true)}
                >
                  <Edit2 className="h-4 w-4" /> Actualizar Estatus / Añadir a
                  Bitácora
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* MODALES FLOTANTES */}
      {selectedTripPadre && (
        <UpdateStatusModal
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          serviceId={
            selectedTripPadre.public_id || String(selectedTripPadre.id)
          }
          onSubmit={handleSaveStatusEvent}
        />
      )}

      {/* Nota: Hemos deshabilitado temporalmente la edición de anticipos viejos ya que esto se movió a los Tramos */}
      {/* Si quieres, TripDetailsModal deberá ser reescrito para editar 'TripLegs' en el futuro */}

      <Dialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Viaje</DialogTitle>
            <DialogDescription>
              Se borrará el viaje y TODOS sus tramos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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

      {/* EL MODAL DE LIQUIDACIÓN RECIBE EL ID DEL TRAMO, NO DEL VIAJE PADRE */}
      <TripSettlementModal
        open={!!legToSettle}
        onOpenChange={(open) => !open && setLegToSettle(null)}
        tripId={legToSettle}
      />

      {/* MODAL DE DESENGANCHE / RELEVO */}
      <NextLegModal
        open={!!legToRelay}
        onOpenChange={(open) => !open && setLegToRelay(null)}
        tripPadre={legToRelay?.tripPadre || null}
        onSubmit={handleNextLegSubmit}
      />
      {/* EXPEDIENTE MAESTRO DEL SERVICIO */}
      <TripDetailsModal
        open={!!tripToView}
        onOpenChange={(open) => !open && setTripToView(null)}
        trip={tripToView}
      />
    </div>
  );
};
