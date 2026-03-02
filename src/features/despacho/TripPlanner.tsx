// src/features/despacho/TripPlanner.tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MapPin,
  Navigation,
  Trash2,
  Truck,
  Eye, // ✅ IMPORTAMOS EL ÍCONO DEL OJO
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
// DND Kit
import {
  DndContext,
  DragEndEvent,
  closestCorners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
//  DataTable
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useTrips } from "@/hooks/useTrips";
import { Trip, TripStatus } from "@/types/api.types";

import { TripDetailsModal } from "./TripDetailsModal";

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
// Draggable card
// =====================
function KanbanCard({
  trip,
  onClick,
}: {
  trip: Trip;
  onClick: (t: Trip) => void;
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
      // ✅ 1. Quitamos el onClick del div principal
    >
      <Card
        className={`shadow-sm transition-all border-slate-200 ${
          isDragging ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
        }`}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-primary uppercase truncate max-w-[140px]">
                {trip.client?.razon_social || "CLIENTE GENERAL"}
              </span>

              <div className="flex items-center gap-1">
                {trackingUrl ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()} // Evita arrastre
                    title="Abrir tracking"
                  >
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono px-1 h-4 bg-white text-slate-500 hover:bg-slate-50"
                    >
                      <LinkIcon className="h-3 w-3" />
                    </Badge>
                  </a>
                ) : null}

                <Badge
                  variant="outline"
                  className=" font-mono px-1 h-4 bg-slate-50 text-slate-500"
                >
                  {trip.public_id || `ID: ${trip.id}`}
                </Badge>

                {/* ✅ 2. AÑADIMOS EL BOTÓN DE VER DETALLES */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()} // CRÍTICO: Evita que dnd-kit intercepte el clic
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(trip); // Llama a la función para abrir el modal
                  }}
                  className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-brand-navy rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Ver / Editar Detalles"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="border-l-2 border-primary/30 pl-2 py-0.5">
              <div className="flex items-center gap-1 mb-1">
                <Navigation className="h-2.5 w-2.5 text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">
                  {trip.route_name || "RUTA ESTÁNDAR"}
                </span>
              </div>

              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 text-slate-400 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                    {trip.origin || "Origen N/A"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium leading-none my-0.5">
                    hacia
                  </p>
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                    {trip.destination || "Destino N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded text-[10px]">
                <Truck className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-bold text-slate-700 truncate">
                  {trip.unit?.numero_economico ||
                    `Eco ${trip.unit_id ?? "N/A"}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded text-[10px]">
                <div className="h-3.5 w-3.5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[7px] font-black">
                  OP
                </div>
                <span className="truncate font-medium text-slate-700">
                  {trip.operator?.name?.split?.(" ")?.[0] ||
                    `ID: ${trip.operator_id ?? "N/A"}`}
                </span>
              </div>
            </div>

            {(trip.remolque_1_id ||
              (trip as any).dolly_id ||
              trip.remolque_2_id) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {trip.remolque_1_id && (
                  <Badge
                    variant="outline"
                    className="text-[8px] py-0 h-4 border-slate-200 text-slate-400"
                  >
                    R1: {trip.remolque_1_id}
                  </Badge>
                )}

                {(trip as any).dolly_id && (
                  <Badge
                    variant="outline"
                    className="text-[8px] py-0 h-4 border-blue-100 bg-blue-50 text-blue-500"
                  >
                    Dolly
                  </Badge>
                )}

                {trip.remolque_2_id && (
                  <Badge
                    variant="outline"
                    className="text-[8px] py-0 h-4 border-slate-200 text-slate-400"
                  >
                    R2: {trip.remolque_2_id}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-slate-100">
              <div className="flex items-center gap-1 text-emerald-600 font-bold">
                <DollarSign className="h-2.5 w-2.5" />
                <span>
                  Saldo: $
                  {typeof trip.saldo_operador === "number"
                    ? trip.saldo_operador.toLocaleString()
                    : "0"}
                </span>
              </div>
              <span className="text-slate-400 font-medium">
                {trip.start_date
                  ? format(new Date(trip.start_date), "dd/MM HH:mm")
                  : "--/--"}
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
}: {
  column: any;
  trips: Trip[];
  onTripClick: (t: Trip) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
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
            <KanbanCard key={trip.id} trip={trip} onClick={onTripClick} />
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
}: {
  trips: Trip[];
  onRowClick: (t: Trip) => void;
}) {
  //  deleteTrip de tu hook
  const { updateTripStatus, deleteTrip } = useTrips();

  //  Estado para controlar el modal de confirmación de eliminación
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
      setTripToDelete(null); // Cierra el modal después de eliminar
    }
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
                <div className="flex items-center gap-1.5 text-sm font-medium">
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

              {/* ✅ CELDA DE ACCIONES (ELIMINAR) */}
              <DataTableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setTripToDelete(trip)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* ✅ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
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
  const { trips, loading, updateTripStatus } = useTrips();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

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
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <TripsTable trips={safeTrips} onRowClick={setSelectedTrip} />
      )}

      <TripDetailsModal
        open={!!selectedTrip}
        onOpenChange={(open) => !open && setSelectedTrip(null)}
        trip={selectedTrip}
      />
    </div>
  );
};
