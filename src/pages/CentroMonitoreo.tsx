import { useState } from "react";
import { Eye, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { UpdateStatusModal, StatusUpdateData } from "@/features/monitoreo/UpdateStatusModal";
import { mockTrips, Trip, TimelineEvent } from "@/data/mockData";
import { toast } from "sonner";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    en_ruta: { type: "success", label: "En Ruta" },
    detenido: { type: "warning", label: "Detenido" },
    retraso: { type: "danger", label: "Retraso" },
    accidente: { type: "danger", label: "Accidente" },
    entregado: { type: "success", label: "Entregado" },
  };
  const config = statusMap[status] || { type: "info" as StatusType, label: status };
  return <StatusBadge status={config.type}>{config.label}</StatusBadge>;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_ruta: "En Ruta",
    detenido: "Detenido",
    retraso: "Retraso",
    accidente: "Accidente",
  };
  return labels[status] || status;
};

export default function CentroMonitoreo() {
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [tripToUpdate, setTripToUpdate] = useState<Trip | null>(null);

  const handleOpenUpdateModal = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setTripToUpdate(trip);
    setUpdateModalOpen(true);
  };

  const handleStatusUpdate = (data: StatusUpdateData) => {
    if (!tripToUpdate) return;

    // Create new timeline event
    const newEvent: TimelineEvent = {
      time: data.timestamp,
      event: `Estatus actualizado a "${getStatusLabel(data.status)}" - ${data.location}${data.comments ? `. Nota: ${data.comments}` : ''}`,
      type: data.status === 'accidente' || data.status === 'retraso' ? 'alert' : 'checkpoint',
    };

    // Cast the status to the proper type
    const newStatus = data.status as Trip['status'];

    // Update trips state
    setTrips((prevTrips) =>
      prevTrips.map((trip) => {
        if (trip.id === tripToUpdate.id) {
          return {
            ...trip,
            status: newStatus,
            lastUpdate: data.timestamp,
            timeline: [newEvent, ...trip.timeline],
          };
        }
        return trip;
      })
    );

    // If the drawer is open for this trip, update it too
    if (selectedTrip?.id === tripToUpdate.id) {
      setSelectedTrip((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: newStatus,
          lastUpdate: data.timestamp,
          timeline: [newEvent, ...prev.timeline],
        };
      });
    }

    // Show success toast
    toast.success("Bitácora actualizada", {
      description: `${tripToUpdate.id} - Estatus cambiado a "${getStatusLabel(data.status)}"`,
    });

    // Show notification toast if checkbox was checked
    if (data.notifyClient) {
      toast.info("Notificación enviada", {
        description: `Se ha notificado al cliente sobre la actualización.`,
      });
    }

    setTripToUpdate(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Centro de Monitoreo" description="Control de viajes activos en tiempo real">
        <Badge variant="outline" className="text-sm px-3 py-1.5 font-medium">
          {trips.length} Viajes Activos
        </Badge>
      </PageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Torre de Control
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="bg-table-header text-left border-b">
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Servicio ID</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Cliente</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Unidad</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Operador</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Origen - Destino</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider text-center">Estatus</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Última Actualización</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTrip(trip)}
                  >
                    <td className="py-2.5 px-3 font-medium text-sm text-brand-dark">{trip.id}</td>
                    <td className="py-2.5 px-3 text-sm text-brand-dark">{trip.clientName}</td>
                    <td className="py-2.5 px-3 font-mono text-sm text-brand-dark">{trip.unitNumber}</td>
                    <td className="py-2.5 px-3 text-sm text-brand-dark">{trip.operator}</td>
                    <td className="py-2.5 px-3 text-sm text-muted-foreground">
                      {trip.origin} → {trip.destination}
                    </td>
                    <td className="py-2.5 px-3 text-center">{getStatusBadge(trip.status)}</td>
                    <td className="py-2.5 px-3 text-sm text-muted-foreground">{trip.lastUpdate}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrip(trip);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs px-2 border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white"
                          onClick={(e) => handleOpenUpdateModal(e, trip)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Actualizar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Drawer */}
      <Sheet open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="text-brand-dark">
              Timeline - {selectedTrip?.id}
            </SheetTitle>
          </SheetHeader>
          {selectedTrip && (
            <div className="mt-6 space-y-4">
              {/* Trip Details */}
              <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/50 rounded-lg border">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</span>
                  <p className="font-medium text-brand-dark">{selectedTrip.clientName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Unidad</span>
                  <p className="font-medium text-brand-dark font-mono">{selectedTrip.unitNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Operador</span>
                  <p className="font-medium text-brand-dark">{selectedTrip.operator}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Estatus</span>
                  <div className="mt-1">{getStatusBadge(selectedTrip.status)}</div>
                </div>
              </div>

              {/* Update Status Button */}
              <Button
                className="w-full h-9 gap-2 bg-brand-red hover:bg-brand-red/90 text-white"
                onClick={(e) => handleOpenUpdateModal(e, selectedTrip)}
              >
                <Edit2 className="h-4 w-4" />
                Actualizar Estatus
              </Button>

              {/* Timeline */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Historial de Eventos
                </h4>
                <div className="space-y-1">
                  {selectedTrip.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            event.type === 'alert'
                              ? 'bg-status-danger'
                              : event.type === 'checkpoint'
                              ? 'bg-status-success'
                              : 'bg-status-info'
                          }`}
                        />
                        {idx < selectedTrip.timeline.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-brand-dark leading-tight">
                          {event.event}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Update Status Modal */}
      {tripToUpdate && (
        <UpdateStatusModal
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          serviceId={tripToUpdate.id}
          onSubmit={handleStatusUpdate}
        />
      )}
    </div>
  );
}
