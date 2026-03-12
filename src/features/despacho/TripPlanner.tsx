// src/features/despacho/TripPlanner.tsx
import React, { useMemo, useState } from "react";
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
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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

type KanbanColumnId = "creado" | "en_transito" | "entregado";

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
  ["creado", "en_transito", "entregado"].includes(id as string);

const groupKeyFromStatus = (rawStatus: unknown): KanbanColumnId | null => {
  const s = normalizeStatus(rawStatus);
  if (s === "creado") return "creado";
  if (["en_transito", "detenido", "retraso", "accidente"].includes(s))
    return "en_transito";
  if (["entregado", "cerrado"].includes(s)) return "entregado";
  return null;
};

// 🚀 Helper: Estatus Operativos Reales (Inteligente por Fase)
const getOperationalStatusBadge = (leg: TripLeg) => {
  const status = normalizeStatus(leg.status);

  // 1. CASOS CUANDO YA LLEGARON (ENTREGADO)
  if (status === "entregado" && leg.leg_type === "carga_muelle") {
    return (
      <Badge className="bg-orange-500 text-white shadow-sm border-0">
        📦 CARGADO EN PATIO
      </Badge>
    );
  }
  if (status === "entregado" && leg.leg_type === "ruta_carretera") {
    return (
      <Badge className="bg-blue-400 text-white shadow-sm border-0">
        ⏳ VACÍO EN PATIO
      </Badge>
    );
  }
  if (status === "entregado" && leg.leg_type === "entrega_vacio") {
    return (
      <Badge className="bg-emerald-600 text-white shadow-sm border-0">
        🏁 FINALIZADO
      </Badge>
    );
  }

  // 2. CASOS CUANDO ESTÁN EN MOVIMIENTO (EN TRÁNSITO)
  if (status === "en_transito") {
    if (leg.leg_type === "carga_muelle") {
      return (
        <Badge className="bg-sky-600 text-white shadow-sm border-0">
          🚜 OPERANDO EN MUELLE
        </Badge>
      );
    }
    if (leg.leg_type === "ruta_carretera") {
      return (
        <Badge className="bg-blue-600 text-white shadow-sm border-0">
          🚚 EN CARRETERA
        </Badge>
      );
    }
    if (leg.leg_type === "entrega_vacio") {
      return (
        <Badge className="bg-indigo-500 text-white shadow-sm border-0">
          🔄 RETORNANDO VACÍO
        </Badge>
      );
    }
  }

  // 3. INCIDENCIAS
  if (["detenido", "retraso", "accidente"].includes(status)) {
    return (
      <Badge className="bg-red-600 text-white shadow-sm border-0 uppercase animate-pulse">
        <AlertCircle className="h-3 w-3 mr-1" /> {status}
      </Badge>
    );
  }

  // 4. OTROS (Creado, Cerrado, etc)
  return (
    <Badge variant="outline" className="uppercase">
      {status.replace("_", " ")}
    </Badge>
  );
};
const isIncidentStatus = (status: unknown) => {
  const s = normalizeStatus(status);
  return ["detenido", "retraso", "accidente"].includes(s);
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
    title: "Nuevos / En Patio",
    statuses: ["creado"],
    icon: Clock,
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-700",
  },
  {
    id: "en_transito",
    title: "En Tránsito (Operando)",
    statuses: ["en_transito", "detenido", "retraso", "accidente"],
    icon: Truck,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  {
    id: "entregado",
    title: "Completados (Liquidar)",
    statuses: ["entregado", "cerrado"],
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
];

const legTypeShort: Record<string, string> = {
  carga_muelle: "F1: CARGA",
  ruta_carretera: "F2: RUTA",
  entrega_vacio: "F3: VACÍO",
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
}: {
  leg: TripLeg;
  tripPadre: Trip;
  onOpenCommandCenter: (t: Trip) => void;
  onDeleteClick: (t: Trip) => void;
  onSettleClick: (l: TripLeg, t: Trip) => void;
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

  const isIncident = isIncidentStatus(leg.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing group relative"
    >
      <div className="absolute -top-3 -right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white shadow-md border border-slate-200 rounded-lg p-1 z-10 translate-y-1 group-hover:translate-y-0">
        {/*         <button
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
        </button> */}

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenCommandCenter(tripPadre);
          }}
          className="p-1.5 hover:bg-brand-navy/10 rounded text-brand-navy"
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
            onDeleteClick(tripPadre);
          }}
          className="p-1.5 hover:bg-red-50 rounded text-red-600"
          title="Eliminar Viaje Completo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Card
        className={`overflow-hidden shadow-sm transition-all ${isDragging ? "ring-2 ring-brand-navy shadow-xl scale-[1.02]" : "hover:shadow-md hover:border-slate-300"} ${isIncident ? "border-red-400 bg-red-50/30" : "border-slate-200"}`}
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
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-bold text-primary uppercase tracking-tighter truncate">
                {legTypeShort[leg.leg_type] || "TRAMO"}
              </span>
              {isIncident && (
                <span className="text-[9px] font-bold text-red-600 flex items-center gap-1 ">
                  <AlertCircle className="h-3 w-3" /> INCIDENCIA
                </span>
              )}
            </div>
          </div>

          <div className="bg-white/80 rounded border border-slate-100 p-1.5 mb-2.5 shadow-sm">
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
                  className="text-[8px] py-0 h-3.5 border-slate-200 text-slate-500"
                >
                  R1
                </Badge>
              )}
              {tripPadre.dolly_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-blue-200 bg-blue-50 text-blue-600"
                >
                  D
                </Badge>
              )}
              {tripPadre.remolque_2_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-slate-200 text-slate-500"
                >
                  R2
                </Badge>
              )}
            </div>
          )}
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
}: {
  column: any;
  items: KanbanItem[];
  onOpenCommandCenter: (t: Trip) => void;
  onDeleteClick: (t: Trip) => void;
  onSettleClick: (l: TripLeg, t: Trip) => void;
  onRelayClick: (l: TripLeg, t: Trip) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[340px] rounded-xl border-2 p-3 flex flex-col h-full transition-colors ${column.bg} ${isOver ? "border-brand-navy border-dashed bg-slate-100/80" : column.border}`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className={`flex items-center gap-2 font-bold ${column.text}`}>
          <Icon className="h-4 w-4" /> {column.title}
        </div>
        <Badge
          variant="secondary"
          className="bg-white/80 text-slate-700 shadow-sm"
        >
          {items.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 min-h-[150px] pb-10">
        {items.length === 0 ? (
          <div className="p-6 border-2 border-dashed border-slate-300/50 rounded-lg text-center text-slate-400 text-sm font-medium">
            Mueve un tramo aquí
          </div>
        ) : (
          items.map((item) => (
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
  const {
    trips,
    loading,
    updateTripStatus,
    addTimelineEvent,
    deleteTrip,
    createNextLeg,
  } = useTrips();

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Modales Principales
  const [tripToView, setTripToView] = useState<Trip | null>(null);

  const { updateLoadStatus } = useUnits();

  // Modal Bitácora
  const [selectedTripPadre, setSelectedTripPadre] = useState<Trip | null>(null);
  const [selectedLegToUpdate, setSelectedLegToUpdate] =
    useState<TripLeg | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Otros Modales

  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [legToSettle, setLegToSettle] = useState<{
    leg: TripLeg;
    tripPadre: Trip;
  } | null>(null);
  const [legToRelay, setLegToRelay] = useState<{
    leg: TripLeg;
    tripPadre: Trip;
  } | null>(null);
  const handleNextLegSubmit = async (tripId: string, payload: any) => {
    const res = await createNextLeg(tripId, payload);
    return !!res;
  };

  React.useEffect(() => {
    if (tripToView) {
      // Cuando trips cambia (porque liquidaste o reabriste), busca la nueva versión
      const updatedTrip = trips.find((t) => t.id === tripToView.id);
      if (updatedTrip) {
        setTripToView(updatedTrip); // Le inyecta los datos nuevos al modal abierto
      }
    }
  }, [trips]);

  const allActiveLegs = useMemo(() => {
    const safeTrips = Array.isArray(trips) ? trips : [];
    const items: KanbanItem[] = [];
    for (const trip of safeTrips) {
      if (trip.status === "cerrado") continue;

      if (trip.legs && trip.legs.length > 0) {
        const activeLeg = trip.legs.find((leg) => leg.status !== "cerrado");
        if (activeLeg) {
          items.push({ leg: activeLeg, tripPadre: trip });
        }
      }
    }
    return items.sort((a, b) => b.leg.id - a.leg.id);
  }, [trips]);

  const groupedLegs = useMemo(() => {
    const groups: Record<KanbanColumnId, KanbanItem[]> = {
      creado: [],
      en_transito: [],
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

    await updateTripStatus(
      String(draggedItem.tripPadre.id),
      targetStatus,
      "Actualizado en Pizarrón",
    );
  };

  // 🚀 FUNCIÓN QUE GUARDA EN LA BITÁCORA DEL TRAMO
  const handleSaveStatusEvent = async (data: StatusUpdateData) => {
    if (!selectedTripPadre) return;

    const activeLeg =
      selectedLegToUpdate ||
      selectedTripPadre.legs?.find((l) => l.status !== "cerrado") ||
      selectedTripPadre.legs?.[selectedTripPadre.legs.length - 1];

    if (!activeLeg) {
      toast.error(
        "Error: No se encontró una fase activa para registrar la novedad.",
      );
      return;
    }

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
        toast.success(
          "Viaje reportado como Entregado. Ya puedes liquidar esta fase.",
        );

        // 🚀 MAGIA AUTOMÁTICA: Si es el fin del viaje (Entrega de vacío), el chasis se vacía automáticamente
        if (activeLeg.leg_type === "entrega_vacio") {
          if (selectedTripPadre.remolque_1_id) {
            await updateLoadStatus(selectedTripPadre.remolque_1_id, false); // False = Vacío
          }
          if (selectedTripPadre.remolque_2_id) {
            await updateLoadStatus(selectedTripPadre.remolque_2_id, false);
          }
          toast.success(
            "El viaje concluyó. Remolques marcados como VACÍOS automáticamente.",
          );
        }
      }
    }
  };

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
          Cargando Planeador de Operaciones...
        </p>
      </div>
    );

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* TOOLBAR SUPERIOR */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border shadow-sm">
        <h2 className="text-sm font-black text-brand-navy flex items-center gap-2 px-3 uppercase tracking-wider">
          <Truck className="h-4 w-4" /> Despacho y Tramos Operativos
        </h2>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "kanban" | "table")}
        >
          <TabsList className="grid w-[240px] grid-cols-2 h-10 bg-slate-100 rounded-lg p-1">
            <TabsTrigger
              value="table"
              className="text-xs font-bold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <List className="h-4 w-4 mr-2" /> Lista
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              className="text-xs font-bold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <LayoutGrid className="h-4 w-4 mr-2" /> Pizarrón
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "kanban" ? (
        <DndContext
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[65vh] items-start mt-2">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                items={groupedLegs[column.id] || []}
                onOpenCommandCenter={setTripToView}
                onDeleteClick={setTripToDelete}
                onRelayClick={(leg, tripPadre) => {
                  setLegToRelay({ leg, tripPadre });
                  // setTripToView(null); 🚀 BORRAMOS ESTO PARA NO CERRAR EL MODAL
                }}
                onSettleClick={(leg, tripPadre) => {
                  setLegToSettle({ leg, tripPadre });
                  // setTripToView(null); 🚀 BORRAMOS ESTO PARA NO CERRAR EL MODAL
                }}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <Card className="border-none shadow-lg rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <DataTable>
              <DataTableHeader className="bg-slate-50 border-b">
                <DataTableRow>
                  <DataTableHead className="font-bold text-slate-700">
                    Folio / Cliente
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700">
                    Fase del Servicio
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700">
                    Origen ➔ Destino
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700">
                    Asignación Física
                  </DataTableHead>
                  <DataTableHead className="font-bold text-slate-700 text-center">
                    Estatus Operativo
                  </DataTableHead>
                  <DataTableHead className="text-right font-bold text-slate-700 pr-6">
                    Acciones
                  </DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {allActiveLegs.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={6}
                      className="text-center py-12 text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Truck className="h-12 w-12 mb-3 opacity-20" />
                        <span className="font-medium">
                          No hay servicios activos en este momento.
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
                        className={`hover:bg-slate-50/80 transition-colors ${isIncident ? "bg-red-50/30" : ""}`}
                      >
                        <DataTableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 uppercase">
                              {tripPadre.client?.razon_social ||
                                "CLIENTE GENERAL"}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              VIAJE #{tripPadre.public_id || tripPadre.id}
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start">
                            <Badge
                              variant="outline"
                              className="w-fit bg-white text-brand-navy border-brand-navy/20 font-black mb-1 text-[10px]"
                            >
                              {legTypeShort[leg.leg_type] || leg.leg_type}
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-bold uppercase">
                              {tripPadre.route_name || "Ruta Estándar"}
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col gap-1.5 max-w-[220px]">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-600 truncate">
                                {tripPadre.origin}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {tripPadre.destination}
                              </span>
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-navy">
                              <Truck className="h-3.5 w-3.5 text-slate-400" />{" "}
                              {leg.unit?.numero_economico || "Sin Unidad"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <User className="h-3.5 w-3.5 text-slate-400" />{" "}
                              {leg.operator?.name || "Sin Operador"}
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {/* 🚀 EL BADGE OPERATIVO (Cargado en Patio, etc) */}
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
                              {/*                               <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                onClick={() =>
                                  setLegToRelay({ leg, tripPadre })
                                }
                                className="rounded-lg cursor-pointer py-2 text-sky-700 focus:bg-sky-50 focus:text-sky-800"
                              >
                                <LinkIcon className="h-4 w-4 mr-3" />{" "}
                                <span className="font-bold">
                                  Desenganchar / Relevo
                                </span>
                              </DropdownMenuItem> */}
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
                                  Eliminar Viaje Completo
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

      {/* ======================================= */}
      {/* MODALES GLOBALES */}
      {/* ======================================= */}

      {selectedTripPadre && (
        <UpdateStatusModal
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          serviceId={
            selectedTripPadre.public_id || String(selectedTripPadre.id)
          }
          activeLeg={selectedLegToUpdate || undefined} // 🚀 Pasamos el tramo activo
          onSubmit={handleSaveStatusEvent}
        />
      )}

      <Dialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-black">
              Eliminar Viaje Completo
            </DialogTitle>
            <DialogDescription>
              Se borrará el viaje raíz y{" "}
              <strong>TODAS sus fases y tramos</strong> permanentemente. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTripToDelete(null)}
              className="rounded-xl"
            >
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
              className="rounded-xl"
            >
              Eliminar Viaje
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

      {/* MODAL MAESTRO */}
      <TripDetailsModal
        open={!!tripToView}
        onOpenChange={(open) => !open && setTripToView(null)}
        trip={tripToView}
        onIncidentClick={(trip) => openUpdateStatusModal(trip)}
        onRelayClick={(leg, tripPadre) => {
          setLegToRelay({ leg, tripPadre });
          // setTripToView(null); 🚀 BORRAMOS ESTO PARA NO CERRAR EL MODAL
        }}
        onSettleClick={(leg, tripPadre) => {
          setLegToSettle({ leg, tripPadre });
          // setTripToView(null); 🚀 BORRAMOS ESTO PARA NO CERRAR EL MODAL
        }}
        onUpdateStatusClick={(trip, leg) => openUpdateStatusModal(trip, leg)}
      />
    </div>
  );
};
