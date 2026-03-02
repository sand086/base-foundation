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

// DND Kit
import {
  DndContext,
  DragEndEvent,
  closestCorners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

// DataTable
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
import { Trip, TripStatus } from "@/types/api.types";

//  Componentes de Monitoreo (ya conectados a BD por addTimelineEvent)
import {
  UpdateStatusModal,
  StatusUpdateData,
} from "@/features/monitoreo/UpdateStatusModal";
import { TripSettlementModal } from "@/features/cierre/TripSettlementModal";
import { TripDetailsModal } from "@/features/despacho/TripDetailsModal";
import { TripMapPlaceholder } from "@/features/monitoreo/TripMapPlaceholder";

// =====================
// Helpers
// =====================
type KanbanColumnId = "creado" | "en_transito" | "detenido" | "entregado";

const normalizeStatus = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .split(" ")
    .join("_");

const isColumnId = (id: unknown): id is KanbanColumnId =>
  id === "creado" ||
  id === "en_transito" ||
  id === "detenido" ||
  id === "entregado";

const getTripId = (id: unknown): number | null => {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id)))
    return Number(id);
  return null;
};

const getTrackingUrl = (trip: Trip): string | null => {
  const t = trip as any;
  return (
    t?.tracking_url ||
    t?.trackingUrl ||
    t?.tracking_link ||
    t?.trackingLink ||
    t?.tracking?.url ||
    null
  );
};

const groupKeyFromStatus = (rawStatus: unknown): KanbanColumnId | null => {
  const s = normalizeStatus(rawStatus);
  if (s === "creado") return "creado";
  if (s === "en_transito") return "en_transito";
  if (s === "detenido" || s === "retraso" || s === "accidente")
    return "detenido";
  if (s === "entregado" || s === "cerrado") return "entregado";
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

// =====================
// Kanban columns config
// =====================
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
// Draggable card (UI/UX Ultra Compacta)
// =====================
function KanbanCard({
  trip,
  onClick,
  onEditClick,
  onDeleteClick,
  onSettleClick,
}: {
  trip: Trip;
  onClick: (t: Trip) => void;
  onEditClick: (t: Trip) => void;
  onDeleteClick: (t: Trip) => void;
  onSettleClick: (t: Trip) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: trip.id,
      data: { trip },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;

  const trackingUrl = getTrackingUrl(trip);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing group relative"
    >
      {/* 🚀 ACTION BAR FLOTANTE (Solo aparece al pasar el mouse) */}
      <div className="absolute -top-3 -right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white shadow-md border border-slate-200 rounded-lg p-1 z-10 translate-y-1 group-hover:translate-y-0">
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            className="p-5 hover:bg-slate-100 rounded text-blue-600 transition-colors"
            title="Rastreo GPS"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(trip);
          }}
          className="p-5 hover:bg-amber-50 rounded text-amber-600 transition-colors"
          title="Editar Anticipos"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        {trip.status === "entregado" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSettleClick(trip);
            }}
            className="p-5 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
            title="Liquidar Viaje"
          >
            <Banknote className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClick(trip);
          }}
          className="p-5 hover:bg-blue-50 rounded text-brand-navy transition-colors"
          title="Torre de Control"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(trip);
          }}
          className="p-5 hover:bg-red-50 rounded text-red-600 transition-colors"
          title="Eliminar Viaje"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 💳 TARJETA VISUAL */}
      <Card
        className={`overflow-hidden shadow-sm transition-all border-slate-200 ${
          isDragging
            ? "ring-2 ring-brand-navy shadow-xl scale-[1.02]"
            : "hover:shadow-md hover:border-slate-300"
        }`}
      >
        <CardContent className="p-3">
          {/* Header: Cliente y Ruta */}
          <div className="flex flex-col mb-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase truncate leading-tight">
                {trip.client?.razon_social || "CLIENTE GENERAL"}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-mono px-1 h-4 bg-slate-50 text-slate-500 shrink-0"
              >
                #{trip.public_id || trip.id}
              </Badge>
            </div>
            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter truncate mt-0.5">
              {trip.route_name || "RUTA ESTÁNDAR"}
            </span>
          </div>

          {/* Rutas Compactas (Mini-Itinerario) */}
          <div className="bg-slate-50/80 rounded border border-slate-100 p-5 mb-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[10px] text-slate-600 truncate leading-none">
                {trip.origin || "Origen N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] font-medium text-slate-800 truncate leading-none">
                {trip.destination || "Destino N/A"}
              </span>
            </div>
          </div>

          {/* Recursos Operativos (Camión y Operador en una línea) */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-5 py-0.5 rounded">
              <Truck className="h-5 w-5 text-slate-400" />
              <span className="truncate max-w-[60px]">
                {trip.unit?.numero_economico || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-5 py-0.5 rounded">
              <User className="h-5 w-5 text-slate-400" />
              <span className="truncate max-w-[70px]">
                {trip.operator?.name?.split(" ")[0] || "N/A"}
              </span>
            </div>
          </div>

          {/* Equipo Adicional (Remolques / Dolly) - Oculto si no hay */}
          {(trip.remolque_1_id ||
            (trip as any).dolly_id ||
            trip.remolque_2_id) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {trip.remolque_1_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-slate-200 text-slate-400"
                >
                  R1
                </Badge>
              )}
              {(trip as any).dolly_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-blue-100 bg-blue-50 text-blue-500"
                >
                  D
                </Badge>
              )}
              {trip.remolque_2_id && (
                <Badge
                  variant="outline"
                  className="text-[8px] py-0 h-3.5 border-slate-200 text-slate-400"
                >
                  R2
                </Badge>
              )}
            </div>
          )}

          {/* Footer (Fecha y Saldo) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="h-2.5 w-2.5" />
              {trip.start_date
                ? format(new Date(trip.start_date), "dd/MM HH:mm")
                : "--/--"}
            </span>
            <div className="flex items-center gap-0.5 text-emerald-600 font-bold bg-emerald-50 px-5 py-0.5 rounded text-[9px]">
              <DollarSign className="h-2.5 w-2.5" />
              <span>
                {typeof trip.saldo_operador === "number"
                  ? trip.saldo_operador.toLocaleString()
                  : "0"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================
// Droppable column
// =====================
function KanbanColumn({
  column,
  trips,
  onTripClick,
  onEditClick,
  onDeleteClick,
  onSettleClick,
}: {
  column: any;
  trips: Trip[];
  onTripClick: (t: Trip) => void;
  onEditClick: (t: Trip) => void;
  onDeleteClick: (t: Trip) => void;
  onSettleClick: (t: Trip) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const Icon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[320px] rounded-xl border-2 p-3 flex flex-col h-full transition-colors
        ${column.bg} ${isOver ? "border-brand-navy border-dashed bg-slate-100" : column.border}`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className={`flex items-center gap-2 font-bold ${column.text}`}>
          <Icon className="h-4 w-4" />
          {column.title}
        </div>
        <Badge variant="secondary" className="bg-white/60 text-slate-700">
          {trips.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-1 min-h-[150px]">
        {trips.length === 0 ? (
          <div className="p-4 border-2 border-dashed border-slate-300/50 rounded-lg text-center text-slate-400 text-sm">
            Soltar viaje aquí
          </div>
        ) : (
          trips.map((trip) => (
            <KanbanCard
              key={trip.id}
              trip={trip}
              onClick={onTripClick}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onSettleClick={onSettleClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =====================
// Table view
// =====================
function TripsTable({
  trips,
  onRowClick,
  onEditClick,
}: {
  trips: Trip[];
  onRowClick: (t: Trip) => void;
  onEditClick: (t: Trip) => void;
}) {
  const { updateTripStatus, deleteTrip } = useTrips();
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  if (trips.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-md mt-4 bg-white">
        No hay viajes registrados.
      </div>
    );
  }

  const confirmDelete = async () => {
    if (tripToDelete && deleteTrip) {
      await deleteTrip(String(tripToDelete.id));
      setTripToDelete(null);
    }
  };

  return (
    <div className="mt-4 bg-white">
      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead>ID / Cliente</DataTableHead>
            <DataTableHead>Ruta</DataTableHead>
            <DataTableHead>Unidad & Operador</DataTableHead>
            <DataTableHead>Fecha Inicio</DataTableHead>
            <DataTableHead>Estatus</DataTableHead>
            <DataTableHead className="text-right">Acciones</DataTableHead>
          </DataTableRow>
        </DataTableHeader>

        <DataTableBody>
          {trips.map((trip) => (
            <DataTableRow
              key={trip.id}
              onClick={() => onRowClick(trip)}
              className="cursor-pointer hover:bg-slate-50"
            >
              <DataTableCell>
                <div className="font-bold text-slate-800">
                  {trip.client?.razon_social || "N/A"}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {trip.public_id || `ID: ${trip.id}`}
                </div>
              </DataTableCell>

              <DataTableCell>
                <div className="font-medium text-sm">
                  {trip.origin || "Origen"} → {trip.destination || "Destino"}
                </div>
                <div className="text-[11px] text-primary font-semibold mt-0.5 uppercase tracking-tight">
                  {trip.route_name || "RUTA"}
                </div>
              </DataTableCell>

              <DataTableCell>
                <div className="flex items-center gap-5 text-sm font-medium">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />{" "}
                  {trip.unit?.numero_economico ||
                    `Eco ${trip.unit_id ?? "N/A"}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Op:{" "}
                  {trip.operator?.name?.split?.(" ")?.[0] ||
                    `${trip.operator_id ?? "N/A"}`}
                </div>
              </DataTableCell>

              <DataTableCell className="text-sm">
                {trip.start_date
                  ? format(new Date(trip.start_date), "dd/MM/yyyy HH:mm")
                  : "--"}
              </DataTableCell>

              <DataTableCell onClick={(e) => e.stopPropagation()}>
                <Select
                  value={normalizeStatus(trip.status)}
                  onValueChange={(newStatus) => {
                    updateTripStatus(
                      String(trip.id),
                      newStatus,
                      "Actualizado desde tabla",
                    );
                  }}
                >
                  <SelectTrigger
                    className={`h-8 text-xs font-bold border-0 uppercase ${getStatusColor(trip.status)}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creado">En Patio</SelectItem>
                    <SelectItem value="en_transito">En Tránsito</SelectItem>
                    <SelectItem value="detenido">Detenido</SelectItem>
                    <SelectItem value="retraso">Retraso</SelectItem>
                    <SelectItem value="accidente">Accidente</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </DataTableCell>

              <DataTableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                  onClick={() => onEditClick(trip)}
                >
                  <Edit2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setTripToDelete(trip)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <Dialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Eliminar Viaje
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Estás seguro de eliminar el viaje{" "}
              <span className="font-bold text-slate-800">
                {tripToDelete?.public_id || tripToDelete?.id}
              </span>{" "}
              de{" "}
              <span className="font-bold text-slate-800">
                {tripToDelete?.client?.razon_social}
              </span>
              ?
              <br />
              <br />
              Esta acción no se puede deshacer y borrará todo el historial
              relacionado con este despacho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setTripToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Sí, Eliminar Viaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================
// Main component
// =====================
export const TripPlanner = () => {
  //  Asegúrate que tu hook ya retorna: addTimelineEvent
  const { trips, loading, updateTripStatus, addTimelineEvent } = useTrips();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  //  Drawer Torre de Control + Modal UpdateStatus
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [tripToSettle, setTripToSettle] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const safeTrips = Array.isArray(trips) ? trips : [];

  const groupedTrips = useMemo(() => {
    const groups: Record<KanbanColumnId, Trip[]> = {
      creado: [],
      en_transito: [],
      detenido: [],
      entregado: [],
    };
    for (const trip of safeTrips) {
      const key = groupKeyFromStatus(trip.status);
      if (key) groups[key].push(trip);
    }
    return groups;
  }, [safeTrips]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const tripId = getTripId(active.id);
    if (!tripId) return;

    const columnId = isColumnId(over.id) ? over.id : null;
    if (!columnId) return;

    const trip = safeTrips.find((t) => t.id === tripId);
    if (!trip) return;

    const targetColumn = KANBAN_COLUMNS.find((c) => c.id === columnId);
    if (!targetColumn) return;

    const targetStatus = normalizeStatus(
      targetColumn.statuses[0],
    ) as TripStatus;

    const current = normalizeStatus(trip.status);
    const alreadyInColumn = targetColumn.statuses
      .map(normalizeStatus)
      .includes(current);
    if (alreadyInColumn) return;

    await updateTripStatus(
      String(tripId),
      targetStatus,
      "Actualizado por Drag & Drop",
    );
  };

  //  Guardado real a BD (timeline + status)
  //  Guardado real a BD (timeline + status)
  const handleSaveStatusEvent = async (data: StatusUpdateData) => {
    if (!selectedTrip) return;

    const ok = await addTimelineEvent(String(selectedTrip.id), {
      status: data.status,
      location: data.location,
      comments: data.comments,
      lat: data.lat,
      lng: data.lng,
      notifyClient: data.notifyClient,
    });

    if (ok) {
      setUpdateModalOpen(false);
      // 🔥 TRUCO PRO: Forzamos que selectedTrip tome los datos recién bajados del hook
      // Necesitamos un pequeño timeout para darle tiempo al fetchTrips() del hook de terminar
      setTimeout(() => {
        setSelectedTrip(trips.find((t) => t.id === selectedTrip.id) || null);
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        Cargando tablero de tráfico...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Viajes</p>
              <h3 className="text-2xl font-black text-slate-800">
                {safeTrips.length}
              </h3>
            </div>
            <div className="h-10 w-10 bg-white border rounded-full flex items-center justify-center">
              <Navigation className="h-5 w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">En Tránsito</p>
              <h3 className="text-2xl font-black text-blue-800">
                {groupedTrips.en_transito.length}
              </h3>
            </div>
            <div className="h-10 w-10 bg-white border border-blue-200 rounded-full flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-amber-600">
                Detenidos / Retrasos
              </p>
              <h3 className="text-2xl font-black text-amber-800">
                {groupedTrips.detenido.length}
              </h3>
            </div>
            <div className="h-10 w-10 bg-white border border-amber-200 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-emerald-600">Entregados</p>
              <h3 className="text-2xl font-black text-emerald-800">
                {groupedTrips.entregado.length}
              </h3>
            </div>
            <div className="h-10 w-10 bg-white border border-emerald-200 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View controls */}
      <div className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-2 uppercase tracking-wide">
          Monitor Operativo
        </h2>

        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "kanban" | "table")}
        >
          <TabsList className="grid w-[200px] grid-cols-2 h-9 bg-slate-100">
            <TabsTrigger
              value="kanban"
              className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <List className="h-4 w-4" /> Lista
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conditional render */}
      {viewMode === "kanban" ? (
        <DndContext
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[55vh] items-start mt-2">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                trips={groupedTrips[column.id] || []}
                onTripClick={setSelectedTrip}
                onEditClick={setTripToEdit}
                onDeleteClick={setTripToDelete} //  ASEGÚRATE DE PASAR ESTO
                onSettleClick={(trip: Trip) => setTripToSettle(String(trip.id))} //  ASEGÚRATE DE PASAR ESTO
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <TripsTable
          trips={safeTrips}
          onRowClick={setSelectedTrip}
          onEditClick={setTripToEdit}
        />
      )}

      {/* ========================================= */}
      {/*  SHEET: TORRE DE CONTROL (Monitoreo) */}
      {/* ========================================= */}
      <Sheet
        open={!!selectedTrip}
        onOpenChange={(open) => !open && setSelectedTrip(null)}
      >
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-slate-50/80">
          {/*  HEADER MEJORADO */}
          <SheetHeader className="p-5 border-b bg-white shadow-sm sticky top-0 z-20 flex flex-row items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center shadow-inner shrink-0">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <SheetTitle className="text-lg font-black text-slate-800 leading-tight">
                  {selectedTrip?.client?.razon_social || "Cliente General"}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className="font-mono  px-5 h-4 bg-slate-100 text-slate-500"
                  >
                    {selectedTrip?.public_id || `ID: ${selectedTrip?.id}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {selectedTrip?.route_name || "Ruta Estándar"}
                  </span>
                </div>
              </div>
            </div>

            {/* Controles de la cabecera: Estatus + Botón Cerrar */}
            <div className="flex items-center gap-3">
              <Badge
                className={`${getStatusColor(selectedTrip?.status)} border-0 uppercase text-xs px-3 py-1 shadow-sm`}
              >
                {normalizeStatus(selectedTrip?.status).replace("_", " ")}
              </Badge>
              {/* Botón de cerrar explícito */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                onClick={() => setSelectedTrip(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-x h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>
          </SheetHeader>

          {/*  CUERPO (SCROLL) */}
          {selectedTrip && (
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* 🚀 NUEVO ACOMODO: Tarjetas Arriba, Mapa Abajo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Origen y Destino Flujo */}
                  <div className="bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-navy/80"></div>
                    <div className="space-y-4 pl-1">
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                          <div className="w-4 h-4 rounded-full bg-blue-600" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className=" font-bold text-muted-foreground uppercase tracking-wide">
                            Origen
                          </p>
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {selectedTrip.origin || "Origen N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className=" font-bold text-muted-foreground uppercase tracking-wide">
                            Destino
                          </p>
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {selectedTrip.destination || "Destino N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asignación (Operador/Unidad) */}
                  <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
                    <p className=" font-bold text-muted-foreground uppercase tracking-wide mb-3">
                      Recursos Asignados
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className=" text-slate-400 font-medium leading-none uppercase tracking-wide">
                            Unidad
                          </p>
                          <p className="text-sm font-bold text-slate-800 truncate mt-0.5">
                            {selectedTrip.unit?.numero_economico ||
                              `Eco ${selectedTrip.unit_id}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className=" text-slate-400 font-medium leading-none uppercase tracking-wide">
                            Operador
                          </p>
                          <p className="text-sm font-bold text-slate-700 truncate mt-0.5">
                            {selectedTrip.operator?.name || "No asignado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🚀 MAPA (Ancho Completo) */}
                <div className="w-full h-[220px]">
                  <TripMapPlaceholder
                    lastUpdate={
                      (selectedTrip as any)?.last_update
                        ? format(
                            new Date((selectedTrip as any).last_update),
                            "dd MMM, HH:mm",
                            { locale: es },
                          )
                        : undefined
                    }
                    lastLocation={
                      (selectedTrip as any)?.last_location || undefined
                    }
                    className="h-full bg-white shadow-sm rounded-xl"
                  />
                </div>

                {/*  Timeline Historial (Bitácora) */}
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-5 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-brand-navy" /> Bitácora
                    Operativa
                  </h4>

                  <div className="space-y-1 pl-1">
                    {selectedTrip.timeline_events &&
                    selectedTrip.timeline_events.length > 0 ? (
                      selectedTrip.timeline_events.map((event, idx) => (
                        <div key={event.id || idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-3 h-3 rounded-full mt-1 ring-4 ring-white shadow-sm ${
                                event.event_type === "alert"
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            {idx < selectedTrip.timeline_events!.length - 1 && (
                              <div className="w-[2px] flex-1 bg-slate-100 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-5">
                            <p className="text-sm font-medium text-slate-800 leading-snug">
                              {event.event}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 mt-1">
                              {format(
                                new Date(event.time),
                                "dd MMM yyyy - HH:mm",
                                { locale: es },
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed">
                        <p className="text-sm text-muted-foreground font-medium">
                          Sin eventos registrados aún.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {/*  STICKY FOOTER: Acción principal siempre al alcance de la mano */}
          <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button
              className="w-full h-11 text-sm font-semibold gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white shadow-md transition-transform active:scale-[0.98]"
              onClick={() => setUpdateModalOpen(true)}
            >
              <Edit2 className="h-4 w-4" />
              Actualizar Estatus / Añadir a Bitácora
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ========================================= */}
      {/*  MODAL: UpdateStatus -> guarda en BD */}
      {/* ========================================= */}

      {/* MODAL DE ACTUALIZAR BITÁCORA */}
      {selectedTrip && (
        <UpdateStatusModal
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          serviceId={selectedTrip.public_id || String(selectedTrip.id)}
          onSubmit={handleSaveStatusEvent}
        />
      )}

      {/*  MODAL DE EDITAR DETALLES/ANTICIPOS */}
      <TripDetailsModal
        open={!!tripToEdit}
        onOpenChange={(open) => !open && setTripToEdit(null)}
        trip={tripToEdit}
      />

      <TripSettlementModal
        open={!!tripToSettle}
        onOpenChange={(open) => !open && setTripToSettle(null)}
        tripId={tripToSettle}
      />
    </div>
  );
};
