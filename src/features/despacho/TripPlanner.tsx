// src/features/despacho/TripPlanner.tsx
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Navigation,
} from "lucide-react";
import { useTrips } from "@/hooks/useTrips";
import { Trip, TripStatus } from "@/types/api.types";
import { format } from "date-fns";

// DND Kit Imports
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";

const KANBAN_COLUMNS = [
  {
    id: "creado", // El ID de la columna es el TripStatus que se asignará al soltar
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
    id: "detenido", // Si sueltan aquí, pasará a "detenido"
    title: "Retrasos / Detenidos",
    statuses: ["detenido", "retraso", "accidente"],
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  {
    id: "entregado", // Si sueltan aquí, pasará a "entregado"
    title: "Entregados",
    statuses: ["entregado", "cerrado"],
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
];

// --- COMPONENTE DRAGGABLE (La Tarjeta del Viaje) ---
function KanbanCard({ trip }: { trip: Trip }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card
        className={`shadow-sm transition-all border-slate-200 ${isDragging ? "ring-2 ring-brand-navy shadow-lg" : "hover:shadow-md"}`}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                {trip.public_id || `TRP-${trip.id}`}
              </span>
              {trip.status === "retraso" && (
                <Badge variant="destructive" className="text-[9px] px-1 h-4">
                  URGENTE
                </Badge>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold leading-tight text-slate-700">
                {trip.origin} <br />
                <span className="text-slate-400 text-xs font-normal">
                  hacia
                </span>{" "}
                {trip.destination}
              </p>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Truck className="h-3 w-3 text-brand-navy" />
                <span className="font-medium text-slate-800">
                  {trip.unit?.numero_economico || `Eco ${trip.unit_id}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <div className="h-3 w-3 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                  O
                </div>
                <span className="truncate">
                  {trip.operator?.name || `Operador ${trip.operator_id}`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{" "}
                {trip.last_location || "Rastreo activo"}
              </span>
              <span>{format(new Date(trip.start_date), "dd/MM HH:mm")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- COMPONENTE DROPPABLE (La Columna) ---
function KanbanColumn({ column, trips }: { column: any; trips: Trip[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

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
          trips.map((trip) => <KanbanCard key={trip.id} trip={trip} />)
        )}
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export const TripPlanner = () => {
  const { trips, isLoading, updateTripStatus } = useTrips();

  // Agrupamos los viajes
  const groupedTrips = useMemo(() => {
    const groups: Record<string, Trip[]> = {
      creado: [],
      en_transito: [],
      detenido: [],
      entregado: [],
    };

    trips.forEach((trip) => {
      if (["creado"].includes(trip.status)) groups.creado.push(trip);
      else if (["en_transito"].includes(trip.status))
        groups.en_transito.push(trip);
      else if (["detenido", "retraso", "accidente"].includes(trip.status))
        groups.detenido.push(trip);
      else if (["entregado", "cerrado"].includes(trip.status))
        groups.entregado.push(trip);
    });

    return groups;
  }, [trips]);

  // Manejador del evento Drag and Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Si lo soltó fuera de una columna, no hacemos nada
    if (!over) return;

    const tripId = active.id as number;
    const newStatus = over.id as TripStatus; // El ID de la columna es el estatus destino

    // Buscamos el viaje para verificar si realmente cambió de columna
    const trip = trips.find((t) => t.id === tripId);

    if (
      trip &&
      !KANBAN_COLUMNS.find((c) => c.id === newStatus)?.statuses.includes(
        trip.status,
      )
    ) {
      // Llamamos a la API para actualizar
      await updateTripStatus(tripId, newStatus, "Actualizado por Drag & Drop");
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        Cargando tablero de tráfico...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-brand-navy" />
          Tablero Operativo de Despacho
        </h2>
        <Badge variant="outline" className="bg-white">
          Total Viajes: {trips.length}
        </Badge>
      </div>

      {/* DndContext Envuelve todo el tablero */}
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[65vh] items-start">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              trips={groupedTrips[column.id] || []}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};
