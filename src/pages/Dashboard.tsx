import { TrendingUp, TrendingDown, Clock, Truck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { mockTrips } from "@/data/mockData";

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

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Dashboard" 
        description="Resumen operativo en tiempo real" 
      />

      {/* KPI Cards - 3 Top Cards as specified */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* On Time % */}
        <Card className="rounded-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              On Time %
            </CardTitle>
            <Clock className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-status-success">92%</span>
              <div className="flex items-center text-xs text-status-success">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +2.1%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs. mes anterior</p>
          </CardContent>
        </Card>

        {/* Total Servicios */}
        <Card className="rounded-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Servicios
            </CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">1,240</span>
              <div className="flex items-center text-xs text-status-success">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +8%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">este mes</p>
          </CardContent>
        </Card>

        {/* Servicios con Retraso */}
        <Card className="rounded-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Servicios con Retraso
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-danger" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-status-danger">98</span>
              <div className="flex items-center text-xs text-status-danger">
                <TrendingDown className="h-3 w-3 mr-0.5" />
                -12%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Services Table */}
      <Card className="rounded-md">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base font-semibold">Servicios Activos</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="border-b border-t bg-gray-50">
                  <th className="text-left py-2 px-4 text-xs font-semibold uppercase text-slate-600 tracking-wider">ID</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold uppercase text-slate-600 tracking-wider">Cliente</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold uppercase text-slate-600 tracking-wider">Unidad</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold uppercase text-slate-600 tracking-wider">Operador</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold uppercase text-slate-600 tracking-wider">Origen - Destino</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold uppercase text-slate-600 tracking-wider">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {mockTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-medium text-primary">{trip.id}</td>
                    <td className="py-2.5 px-4">{trip.clientName}</td>
                    <td className="py-2.5 px-4 font-mono text-sm">{trip.unitNumber}</td>
                    <td className="py-2.5 px-4">{trip.operator}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-muted-foreground">{trip.origin}</span>
                      <span className="mx-1.5 text-muted-foreground/50">→</span>
                      <span>{trip.destination}</span>
                    </td>
                    <td className="py-2.5 px-4">{getStatusBadge(trip.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
