import { useState } from "react";
import { Map, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mockTrips, Trip } from "@/data/mockData";

const getStatusBadge = (status: string) => {
  const styles = {
    en_ruta: "bg-status-info-bg text-status-info",
    detenido: "bg-status-warning-bg text-status-warning",
    retraso: "bg-status-danger-bg text-status-danger animate-pulse-danger",
    entregado: "bg-status-success-bg text-status-success",
  };
  const labels = { en_ruta: "En Ruta", detenido: "Detenido", retraso: "Retraso", entregado: "Entregado" };
  return <Badge className={styles[status as keyof typeof styles]}>{labels[status as keyof typeof labels]}</Badge>;
};

export default function CentroMonitoreo() {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="h-6 w-6" /> Centro de Monitoreo</h1>
          <p className="text-muted-foreground">Control de viajes activos en tiempo real</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">{mockTrips.length} Viajes Activos</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Torre de Control</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-3">Servicio ID</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Unidad</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3">Origen - Destino</th>
                  <th className="py-3 px-3">Estatus</th>
                  <th className="py-3 px-3">Última Actualización</th>
                  <th className="py-3 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mockTrips.map((trip) => (
                  <tr key={trip.id} className="border-b hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedTrip(trip)}>
                    <td className="py-3 px-3 font-medium">{trip.id}</td>
                    <td className="py-3 px-3">{trip.clientName}</td>
                    <td className="py-3 px-3 font-mono">{trip.unitNumber}</td>
                    <td className="py-3 px-3">{trip.operator}</td>
                    <td className="py-3 px-3">{trip.origin} → {trip.destination}</td>
                    <td className="py-3 px-3">{getStatusBadge(trip.status)}</td>
                    <td className="py-3 px-3 text-muted-foreground">{trip.lastUpdate}</td>
                    <td className="py-3 px-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTrip(trip)}><Eye className="h-4 w-4" /></Button>
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
            <SheetTitle>Timeline - {selectedTrip?.id}</SheetTitle>
          </SheetHeader>
          {selectedTrip && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{selectedTrip.clientName}</strong></div>
                <div><span className="text-muted-foreground">Unidad:</span> <strong>{selectedTrip.unitNumber}</strong></div>
                <div><span className="text-muted-foreground">Operador:</span> <strong>{selectedTrip.operator}</strong></div>
                <div><span className="text-muted-foreground">Estatus:</span> {getStatusBadge(selectedTrip.status)}</div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Historial de Eventos</h4>
                <div className="space-y-4">
                  {selectedTrip.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${event.type === 'alert' ? 'bg-status-danger' : event.type === 'checkpoint' ? 'bg-status-success' : 'bg-status-info'}`} />
                        {idx < selectedTrip.timeline.length - 1 && <div className="w-0.5 h-full bg-border" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{event.event}</p>
                        <p className="text-xs text-muted-foreground">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
