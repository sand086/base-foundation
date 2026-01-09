import { useState } from "react";
import { Eye, Edit2, Truck, User, MapPin, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { UpdateStatusModal, StatusUpdateData } from "@/features/monitoreo/UpdateStatusModal";
import { TripMapPlaceholder } from "@/features/monitoreo/TripMapPlaceholder";
import { mockTrips, Trip, TimelineEvent } from "@/data/mockData";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

      {/* Service Detail Drawer with Map */}
      <Sheet open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <SheetContent className="w-[500px] sm:w-[680px] p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-4 border-b bg-muted/30">
              <SheetTitle className="text-brand-dark flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-brand-red flex items-center justify-center">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                Detalle del Servicio - {selectedTrip?.id}
              </SheetTitle>
            </SheetHeader>
            
            {selectedTrip && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Top Section: Split Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Service Data Cards */}
                    <div className="space-y-3">
                      {/* Origin Card */}
                      <div className="p-3 bg-status-success-bg rounded-lg border border-status-success-border">
                        <div className="flex items-center gap-2 mb-1">
                          <Navigation className="h-3.5 w-3.5 text-status-success" />
                          <span className="text-[10px] font-semibold text-status-success uppercase tracking-wide">
                            Origen
                          </span>
                        </div>
                        <p className="text-sm font-medium text-brand-dark">
                          {selectedTrip.origin}
                        </p>
                      </div>

                      {/* Destination Card */}
                      <div className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-brand-dark" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Destino
                          </span>
                        </div>
                        <p className="text-sm font-medium text-brand-dark">
                          {selectedTrip.destination}
                        </p>
                      </div>

                      {/* Driver Card */}
                      <div className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Operador
                          </span>
                        </div>
                        <p className="text-sm font-medium text-brand-dark">
                          {selectedTrip.operator}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Unidad: <span className="font-mono">{selectedTrip.unitNumber}</span>
                        </p>
                      </div>

                      {/* Status Card */}
                      <div className="p-3 bg-card rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                              Estatus Actual
                            </span>
                            {getStatusBadge(selectedTrip.status)}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground block">
                              Última Act.
                            </span>
                            <span className="text-xs font-medium text-brand-dark">
                              {selectedTrip.lastUpdate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Map Container */}
                    <TripMapPlaceholder
                      origin={selectedTrip.origin}
                      destination={selectedTrip.destination}
                      checkpoints={selectedTrip.timeline}
                      lastUpdate={selectedTrip.lastUpdate}
                      lastLocation={
                        selectedTrip.timeline[0]?.event.includes('Estatus actualizado')
                          ? selectedTrip.timeline[0].event.split(' - ')[1]?.split('.')[0]
                          : selectedTrip.timeline[0]?.event
                      }
                      className="h-[280px]"
                    />
                  </div>

                  {/* Client Info */}
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Cliente
                    </span>
                    <p className="text-sm font-medium text-brand-dark mt-0.5">
                      {selectedTrip.clientName}
                    </p>
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
                      Historial de Eventos (Bitácora)
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
              </ScrollArea>
            )}
          </div>
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
