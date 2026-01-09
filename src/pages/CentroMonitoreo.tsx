import { useState } from "react";
import { Map, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { mockTrips, Trip } from "@/data/mockData";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    en_ruta: { type: "success", label: "En Ruta" },
    detenido: { type: "warning", label: "Detenido" },
    retraso: { type: "danger", label: "Retraso" },
    entregado: { type: "success", label: "Entregado" },
  };
  const config = statusMap[status] || { type: "info" as StatusType, label: status };
  return <StatusBadge status={config.type}>{config.label}</StatusBadge>;
};

export default function CentroMonitoreo() {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Centro de Monitoreo" description="Control de viajes activos en tiempo real">
        <Badge variant="outline" className="text-sm px-3 py-1.5 font-medium">
          {mockTrips.length} Viajes Activos
        </Badge>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle>Torre de Control</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Servicio ID</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Cliente</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Unidad</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Operador</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Origen - Destino</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Estatus</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Última Actualización</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mockTrips.map((trip) => (
                  <tr key={trip.id} className="border-b hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedTrip(trip)}>
                    <td className="py-2 px-3 font-medium text-sm text-slate-700">{trip.id}</td>
                    <td className="py-2 px-3 text-sm text-slate-700">{trip.clientName}</td>
                    <td className="py-2 px-3 font-mono text-sm text-slate-700">{trip.unitNumber}</td>
                    <td className="py-2 px-3 text-sm text-slate-700">{trip.operator}</td>
                    <td className="py-2 px-3 text-sm text-slate-700">{trip.origin} → {trip.destination}</td>
                    <td className="py-2 px-3">{getStatusBadge(trip.status)}</td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">{trip.lastUpdate}</td>
                    <td className="py-2 px-3">
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
